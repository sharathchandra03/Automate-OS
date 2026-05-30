// Telegram Bot API
// Docs: https://core.telegram.org/bots/api#sendmessage
// "to" is the chat_id - a number (personal chat) or "@channelname"

export interface TelegramResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

interface TelegramCredentials {
  botToken?: string;
}

export async function sendTelegram(
  chatId: string,
  text: string,
  creds?: TelegramCredentials
): Promise<TelegramResult> {
  const token = creds?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { ok: false, error: "Telegram not configured. Add your bot token in Settings → Channels." };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `Telegram API ${res.status}: ${err}` };
  }

  const data = await res.json();
  if (!data.ok) {
    return { ok: false, error: data.description ?? "Unknown Telegram error" };
  }

  return { ok: true, messageId: data.result?.message_id };
}
