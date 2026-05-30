// WhatsApp Cloud API (Meta)
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages

export interface WAResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

interface WACredentials {
  phoneNumberId?: string;
  accessToken?: string;
}

export async function sendWhatsApp(
  to: string,
  text: string,
  creds?: WACredentials
): Promise<WAResult> {
  // Per-org credentials override global env vars
  const token = creds?.accessToken ?? process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = creds?.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp not configured. Add your credentials in Settings → Channels." };
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `WhatsApp API ${res.status}: ${err}` };
  }

  const data = await res.json();
  return { ok: true, messageId: data.messages?.[0]?.id };
}
