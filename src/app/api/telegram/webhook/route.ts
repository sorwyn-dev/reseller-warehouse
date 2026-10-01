import { NextResponse } from "next/server";
import {
  handleTelegramUpdate,
  type TelegramUpdate,
} from "@/lib/telegram/bot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN missing" },
      { status: 500 },
    );
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telegram webhook error", error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "secretwr-telegram-webhook",
  });
}
