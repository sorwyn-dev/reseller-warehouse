import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { nextBoxNumber } from "@/lib/finance";
import { todayISODate, formatEuro, formatDate } from "@/lib/utils";
import {
  answerCallbackQuery,
  downloadTelegramFile,
  editMessageText,
  sendMessage,
} from "@/lib/telegram/api";
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

interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

type Supabase = ReturnType<typeof createServiceClient>;

const HELP = `Бот склада <b>secretwr</b>

Пришлите <b>фото</b> с подписью:
<code>Название
12.5</code>

или:
<code>Название | 12.5</code>
<code>Название | M | 12.5</code>

Команды:
/boxes — выбрать коробку
/newbox — создать новую коробку
/status — текущая коробка
/help — справка`;

function isAllowedChat(chatId: number): boolean {
  const allow = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.trim();
  if (!allow) return true;
  return allow.split(",").map((id) => id.trim()).includes(String(chatId));
}

async function listBoxes(supabase: Supabase, limit = 20) {
  const { data, error } = await supabase
    .from("boxes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

async function getBoxById(supabase: Supabase, boxId: string) {
  const { data, error } = await supabase
    .from("boxes")
    .select("*")
    .eq("id", boxId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getBoxByNumber(supabase: Supabase, number: string) {
  const { data, error } = await supabase
    .from("boxes")
    .select("*")
    .ilike("number", number.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getActiveBoxId(supabase: Supabase, chatId: number) {
  const { data, error } = await supabase
    .from("bot_sessions")
    .select("active_box_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("bot_sessions")) {
      throw new Error("BOT_SESSIONS_MISSING");
    }
    throw error;
  }

  return data?.active_box_id ?? null;
}

async function setActiveBox(supabase: Supabase, chatId: number, boxId: string) {
  const { error } = await supabase.from("bot_sessions").upsert({
    chat_id: chatId,
    active_box_id: boxId,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("bot_sessions")) {
      throw new Error("BOT_SESSIONS_MISSING");
    }
    throw error;
  }
}

async function createBox(supabase: Supabase) {
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

async function getActiveBox(supabase: Supabase, chatId: number) {
  const activeId = await getActiveBoxId(supabase, chatId);
  if (activeId) {
    const box = await getBoxById(supabase, activeId);
    if (box) return box;
  }

  const boxes = await listBoxes(supabase, 1);
  if (boxes[0]) {
    await setActiveBox(supabase, chatId, boxes[0].id);
    return boxes[0];
  }

  const box = await createBox(supabase);
  await setActiveBox(supabase, chatId, box.id);
  return box;
}

async function countProducts(supabase: Supabase, boxId: string) {
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("box_id", boxId);
  if (error) throw error;
  return count ?? 0;
}

function boxesKeyboard(
  boxes: Array<{ id: string; number: string }>,
  activeBoxId: string | null,
) {
  return {
    inline_keyboard: boxes.map((box) => [
      {
        text: `${box.id === activeBoxId ? "✅ " : ""}${box.number}`,
        callback_data: `box:${box.id}`,
      },
    ]),
  };
}

async function sendBoxesPicker(supabase: Supabase, chatId: number) {
  const boxes = await listBoxes(supabase);
  if (boxes.length === 0) {
    await sendMessage(
      chatId,
      "Коробок пока нет. Создайте новую: /newbox",
    );
    return;
  }

  let activeId: string | null = null;
  try {
    activeId = await getActiveBoxId(supabase, chatId);
  } catch (error) {
    if (error instanceof Error && error.message === "BOT_SESSIONS_MISSING") {
      await sendMessage(
        chatId,
        "Нужно один раз выполнить SQL из файла <code>002_bot_sessions.sql</code> в Supabase SQL Editor.",
      );
      return;
    }
    throw error;
  }

  await sendMessage(chatId, "Выберите коробку для добавления вещей:", {
    reply_markup: boxesKeyboard(boxes, activeId),
  });
}

async function uploadPhoto(
  supabase: Supabase,
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

async function handleSessionsMissing(chatId: number) {
  await sendMessage(
    chatId,
    "Для выбора коробки выполните SQL из <code>supabase/migrations/002_bot_sessions.sql</code> в Supabase SQL Editor, затем снова /boxes",
  );
}

async function handleCommand(message: TelegramMessage, text: string) {
  const supabase = createServiceClient();
  const chatId = message.chat.id;
  const [command, ...args] = text.split(/\s+/);
  const cmd = command.toLowerCase().replace(/@\w+$/, "");

  if (cmd === "/start" || cmd === "/help") {
    await sendMessage(chatId, HELP);
    return;
  }

  if (cmd === "/boxes") {
    await sendBoxesPicker(supabase, chatId);
    return;
  }

  if (cmd === "/newbox") {
    try {
      const box = await createBox(supabase);
      await setActiveBox(supabase, chatId, box.id);
      await sendMessage(
        chatId,
        `Создана коробка <b>${box.number}</b> и выбрана как текущая.\nМожно присылать фото.`,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "BOT_SESSIONS_MISSING") {
        const box = await createBox(supabase);
        await sendMessage(
          chatId,
          `Коробка <b>${box.number}</b> создана, но выбор коробок пока недоступен.\nВыполните SQL <code>002_bot_sessions.sql</code>.`,
        );
        return;
      }
      throw error;
    }
    return;
  }

  if (cmd === "/use" && args[0]) {
    const box = await getBoxByNumber(supabase, args[0]);
    if (!box) {
      await sendMessage(chatId, `Коробка <b>${args[0]}</b> не найдена.`);
      return;
    }
    try {
      await setActiveBox(supabase, chatId, box.id);
      const count = await countProducts(supabase, box.id);
      await sendMessage(
        chatId,
        `Выбрана <b>${box.number}</b>\nВещей: ${count}\nПоступление: ${formatDate(box.received_at)}`,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "BOT_SESSIONS_MISSING") {
        await handleSessionsMissing(chatId);
        return;
      }
      throw error;
    }
    return;
  }

  if (cmd === "/status") {
    try {
      const box = await getActiveBox(supabase, chatId);
      const count = await countProducts(supabase, box.id);
      await sendMessage(
        chatId,
        `Текущая коробка: <b>${box.number}</b>\nВещей: <b>${count}</b>\nДоставка: ${formatEuro(Number(box.shipping_cost))}\n\nСменить: /boxes`,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "BOT_SESSIONS_MISSING") {
        await handleSessionsMissing(chatId);
        return;
      }
      throw error;
    }
    return;
  }

  await sendMessage(chatId, "Неизвестная команда. /help");
}

async function handleCallback(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId || !query.data) return;

  if (!isAllowedChat(chatId)) {
    await answerCallbackQuery(query.id, "Доступ запрещён");
    return;
  }

  if (!query.data.startsWith("box:")) {
    await answerCallbackQuery(query.id);
    return;
  }

  const boxId = query.data.slice(4);
  const supabase = createServiceClient();
  const box = await getBoxById(supabase, boxId);

  if (!box) {
    await answerCallbackQuery(query.id, "Коробка не найдена");
    return;
  }

  try {
    await setActiveBox(supabase, chatId, box.id);
  } catch (error) {
    if (error instanceof Error && error.message === "BOT_SESSIONS_MISSING") {
      await answerCallbackQuery(query.id, "Нужна миграция SQL");
      await handleSessionsMissing(chatId);
      return;
    }
    throw error;
  }

  const count = await countProducts(supabase, box.id);
  await answerCallbackQuery(query.id, `Выбрана ${box.number}`);

  if (query.message) {
    const boxes = await listBoxes(supabase);
    await editMessageText(
      chatId,
      query.message.message_id,
      `Текущая коробка: <b>${box.number}</b>\nВещей: ${count}\nМожно присылать фото.`,
      { reply_markup: boxesKeyboard(boxes, box.id) },
    );
  }
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
      "Не понял подпись.\nПример:\n<code>Nike Air Max\n12.5</code>",
    );
    return;
  }

  const photos = message.photo ?? [];
  const bestPhoto = photos[photos.length - 1];
  if (!bestPhoto) {
    await sendMessage(chatId, "Фото не найдено");
    return;
  }

  let box;
  try {
    box = await getActiveBox(supabase, chatId);
  } catch (error) {
    if (error instanceof Error && error.message === "BOT_SESSIONS_MISSING") {
      await handleSessionsMissing(chatId);
      return;
    }
    throw error;
  }

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
      `\nВещей в коробке: ${count}\n\nСменить коробку: /boxes`,
  );
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message) return;

  if (!isAllowedChat(message.chat.id)) {
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
      "Пришлите фото с подписью или /boxes для выбора коробки",
    );
  }
}
