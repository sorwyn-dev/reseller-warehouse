const TELEGRAM_API = "https://api.telegram.org";

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  return token;
}

export async function telegramCall<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${TELEGRAM_API}/bot${getToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await response.json()) as {
    ok: boolean;
    result: T;
    description?: string;
  };

  if (!json.ok) {
    throw new Error(json.description || `Telegram API error: ${method}`);
  }

  return json.result;
}

export async function sendMessage(
  chatId: number,
  text: string,
  extra?: Record<string, unknown>,
) {
  return telegramCall("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

export async function downloadTelegramFile(fileId: string): Promise<{
  buffer: Buffer;
  filePath: string;
  contentType: string;
}> {
  const file = await telegramCall<{ file_path: string }>("getFile", {
    file_id: fileId,
  });

  const url = `${TELEGRAM_API}/file/bot${getToken()}/${file.file_path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Не удалось скачать фото из Telegram");
  }

  const arrayBuffer = await response.arrayBuffer();
  const extension = file.file_path.split(".").pop()?.toLowerCase() || "jpg";
  const contentType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  return {
    buffer: Buffer.from(arrayBuffer),
    filePath: file.file_path,
    contentType,
  };
}

export async function setTelegramWebhook(url: string, secretToken: string) {
  return telegramCall("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
}
