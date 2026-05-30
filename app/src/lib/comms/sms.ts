// SMS via Twilio
// Docs: https://www.twilio.com/docs/sms/api/message-resource

export interface SMSResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

interface SMSCredentials {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export async function sendSMS(
  to: string,
  text: string,
  creds?: SMSCredentials
): Promise<SMSResult> {
  const accountSid = creds?.accountSid ?? process.env.TWILIO_ACCOUNT_SID;
  const authToken = creds?.authToken ?? process.env.TWILIO_AUTH_TOKEN;
  const from = creds?.fromNumber ?? process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "SMS not configured. Add your Twilio credentials in Settings → Channels." };
  }

  const body = new URLSearchParams({ To: to, From: from, Body: text });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `Twilio ${res.status}: ${err}` };
  }

  const data = await res.json();
  return { ok: true, messageId: data.sid };
}
