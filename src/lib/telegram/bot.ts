import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { nextBoxNumber } from "@/lib/finance";
import { todayISODate, formatEuro } from "@/lib/utils";
import { downloadTelegramFile, sendMessage } from "@/lib/telegram/api";
import { parseProductCaption } from "@/lib/telegram/parse-caption";

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramMessage {
  message_id: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  chat: { id: number; type: string };
  from?: { id: number; username?: string; first_name?: string };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

const HELP = `Бот склада <b>secretwr</b>

Пришлите <b>фото</b> с подписью:
<code>Название
12.5</code>

или в одну строку:
<code>Название | 12.5</code>
<code>Название | M | 12.5</code>

Команды:
/newbox — создать новую коробку
/status — текущая коробка
/help — справка`;

function isAllowed(message: TelegramMessage): boolean {
  const allow = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.trim();
  if (!allow) return true;
  const ids = allow.split(",").map((id) => id.trim());
  return ids.includes(String(message.chat.id));
}

async function getLatestBox(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("boxes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createBox(supabase: ReturnType<typeof createServiceClient>) {
  const { data: existing, error: existingError } = await supabase
    .from("boxes")
    .select("number");
  if (existingError) throw existingError;

  const number = nextBoxNumber((existing ?? []).map((item) => item.number));
  const { data, error } = await supabase
    .from("boxes")
    .insert({
      number,
      received_at: todayISODate(),
      shipping_cost: 0,
      additional_expenses: 0,
      comment: "Создано из Telegram",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function ensureActiveBox(supabase: ReturnType<typeof createServiceClient>) {
  const latest = await getLatestBox(supabase);
  if (latest) return latest;
  return createBox(supabase);
}

async function countProducts(
  supabase: ReturnType<typeof createServiceClient>,
  boxId: string,
) {
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("box_id", boxId);
  if (error) throw error;
  return count ?? 0;
}

async function uploadPhoto(
  supabase: ReturnType<typeof createServiceClient>,
  fileId: string,
): Promise<string | null> {
  try {
    const file = await downloadTelegramFile(fileId);
    const path = `telegram/${randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from("product-photos")
      .upload(path, file.buffer, {
        contentType: file.contentType,
        upsert: false,
      });

    if (error) {
      // fallback: data URL, если storage ещё не настроен
      if (file.buffer.length <= 900_000) {
        return `data:${file.contentType};base64,${file.buffer.toString("base64")}`;
      }
      return null;
    }

    const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

async function handleCommand(message: TelegramMessage, text: string) {
  const supabase = createServiceClient();
  const chatId = message.chat.id;
  const command = text.split(/\s+/)[0].toLowerCase();

  if (command === "/start" || command === "/help") {
    await sendMessage(chatId, HELP);
    return;
  }

  if (command === "/newbox") {
    const box = await createBox(supabase);
    await sendMessage(
      chatId,
      `Создана коробка <b>${box.number}</b>.\nСледующие вещи будут добавлены в неё.`,
    );
    return;
  }

  if (command === "/status") {
    const box = await getLatestBox(supabase);
    if (!box) {
      await sendMessage(chatId, "Коробок пока нет. Создайте /newbox");
      return;
    }
    const count = await countProducts(supabase, box.id);
    await sendMessage(
      chatId,
      `Текущая коробка: <b>${box.number}</b>\nВещей: <b>${count}</b>\nДоставка: ${formatEuro(Number(box.shipping_cost))}`,
    );
    return;
  }

  await sendMessage(chatId, "Неизвестная команда. /help");
}

async function handlePhoto(message: TelegramMessage) {
  const supabase = createServiceClient();
  const chatId = message.chat.id;
  const caption = message.caption?.trim() || "";

  if (!caption) {
    await sendMessage(
      chatId,
      "Добавьте подпись к фото:\n<code>Название\n12.5</code>",
    );
    return;
  }

  const parsed = parseProductCaption(caption);
  if (!parsed) {
    await sendMessage(
      chatId,
      "Не понял подпись.\nПример:\n<code>Nike Air Max\n12.5</code>\nили\n<code>Nike Air Max | 12.5</code>",
    );
    return;
  }

  const photos = message.photo ?? [];
  const bestPhoto = photos[photos.length - 1];
  if (!bestPhoto) {
    await sendMessage(chatId, "Фото не найдено");
    return;
  }

  const box = await ensureActiveBox(supabase);
  const photoUrl = await uploadPhoto(supabase, bestPhoto.file_id);

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      box_id: box.id,
      name: parsed.name,
      category: parsed.category,
      size: parsed.size,
      purchase_price: parsed.purchasePrice,
      photo_url: photoUrl,
      status: "in_stock",
    })
    .select("*")
    .single();

  if (error) throw error;

  const count = await countProducts(supabase, box.id);
  await sendMessage(
    chatId,
    `Добавлено в <b>${box.number}</b>\n` +
      `${product.name}\n` +
      `Закупка: ${formatEuro(Number(product.purchase_price))}` +
      (parsed.size ? `\nРазмер: ${parsed.size}` : "") +
      `\nВещей в коробке: ${count}`,
  );
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message;
  if (!message) return;

  if (!isAllowed(message)) {
    await sendMessage(message.chat.id, "Доступ запрещён.");
    return;
  }

  if (message.text?.startsWith("/")) {
    await handleCommand(message, message.text.trim());
    return;
  }

  if (message.photo?.length) {
    await handlePhoto(message);
    return;
  }

  if (message.text) {
    await sendMessage(
      message.chat.id,
      "Пришлите фото с подписью или команду /help",
    );
  }
}
