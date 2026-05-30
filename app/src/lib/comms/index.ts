// Server-side only - never import from client components
import { sendWhatsApp } from "./whatsapp";
import { sendSMS } from "./sms";
import { sendTelegram } from "./telegram";

export type CommsChannel = "whatsapp" | "sms" | "telegram";

export interface SendParams {
  channel: CommsChannel;
  /** Phone number (E.164 e.g. +919876543210) for WA/SMS, chat_id for Telegram. */
  to: string;
  text: string;
  /**
   * Per-org credentials. If provided, these override the global env vars.
   * Pass credentials from the org_channels table so each client uses their own WABA.
   */
  credentials?: {
    // WhatsApp
    phoneNumberId?: string;
    accessToken?: string;
    // Telegram
    botToken?: string;
    // SMS
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioFromNumber?: string;
  };
}

export interface SendResult {
  ok: boolean;
  provider: CommsChannel;
  messageId?: string | number;
  error?: string;
}

export async function sendMessage({ channel, to, text, credentials }: SendParams): Promise<SendResult> {
  switch (channel) {
    case "whatsapp": {
      const r = await sendWhatsApp(to, text, {
        phoneNumberId: credentials?.phoneNumberId,
        accessToken: credentials?.accessToken,
      });
      return { provider: "whatsapp", ...r };
    }
    case "sms": {
      const r = await sendSMS(to, text, {
        accountSid: credentials?.twilioAccountSid,
        authToken: credentials?.twilioAuthToken,
        fromNumber: credentials?.twilioFromNumber,
      });
      return { provider: "sms", ...r };
    }
    case "telegram": {
      const r = await sendTelegram(to, text, {
        botToken: credentials?.botToken,
      });
      return { provider: "telegram", ...r };
    }
    default:
      return { ok: false, provider: channel, error: `Channel "${channel}" not implemented.` };
  }
}
