import { decrypt } from "./crypto";
import type { OrgChannel } from "./db";

const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v19.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

// ── Error class ──────────────────────────────────────────────────────────────

export class WhatsAppAPIError extends Error {
  code: number;
  subcode?: number;

  constructor(metaError: { code: number; error_subcode?: number; message: string }) {
    super(metaError.message);
    this.name = "WhatsAppAPIError";
    this.code = metaError.code;
    this.subcode = metaError.error_subcode;
  }
}

// ── Core caller ──────────────────────────────────────────────────────────────

async function callMeta(tenant: OrgChannel, payload: object): Promise<string> {
  const token = tenant.access_token_encrypted
    ? decrypt(tenant.access_token_encrypted)
    : tenant.access_token!;

  const res = await fetch(`${BASE}/${tenant.phone_number_id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as {
    messages?: Array<{ id: string }>;
    error?: { code: number; error_subcode?: number; message: string };
  };

  if (!res.ok || data.error) {
    throw new WhatsAppAPIError(
      data.error ?? { code: res.status, message: "Unknown Meta API error" }
    );
  }

  return data.messages?.[0]?.id ?? "";
}

// ── Message senders ──────────────────────────────────────────────────────────

export async function sendTextMessage(
  tenant: OrgChannel,
  toPhone: string,
  text: string
): Promise<string> {
  return callMeta(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "text",
    text: { body: text },
  });
}

export interface TemplateVariables {
  header?: Array<{ type: string; text?: string; image?: { link: string } }>;
  body?: Array<{ type: string; text: string }>;
  buttons?: Array<{
    sub_type: string;
    parameters: Array<{ type: string; payload?: string; text?: string }>;
  }>;
}

export async function sendTemplateMessage(
  tenant: OrgChannel,
  toPhone: string,
  templateName: string,
  language: string,
  variables: TemplateVariables
): Promise<string> {
  const components: object[] = [];

  if (variables.header?.length) {
    components.push({ type: "header", parameters: variables.header });
  }
  if (variables.body?.length) {
    components.push({ type: "body", parameters: variables.body });
  }
  if (variables.buttons?.length) {
    variables.buttons.forEach((btn, idx) => {
      components.push({
        type: "button",
        sub_type: btn.sub_type,
        index: String(idx),
        parameters: btn.parameters,
      });
    });
  }

  return callMeta(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: language || "en" },
      components,
    },
  });
}

export interface ButtonDef {
  id: string;
  title: string;
}

export async function sendButtonMessage(
  tenant: OrgChannel,
  toPhone: string,
  bodyText: string,
  buttons: ButtonDef[],
  headerText?: string,
  footerText?: string
): Promise<string> {
  return callMeta(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "interactive",
    interactive: {
      type: "button",
      ...(headerText && { header: { type: "text", text: headerText } }),
      body: { text: bodyText },
      ...(footerText && { footer: { text: footerText } }),
      action: {
        buttons: buttons.map((btn) => ({
          type: "reply",
          reply: { id: btn.id, title: btn.title },
        })),
      },
    },
  });
}

export interface ListSection {
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

export async function sendListMessage(
  tenant: OrgChannel,
  toPhone: string,
  bodyText: string,
  buttonText: string,
  sections: ListSection[]
): Promise<string> {
  return callMeta(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: { button: buttonText, sections },
    },
  });
}

export async function sendMediaMessage(
  tenant: OrgChannel,
  toPhone: string,
  type: "image" | "document" | "audio" | "video",
  mediaUrl: string,
  caption?: string
): Promise<string> {
  return callMeta(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type,
    [type]: { link: mediaUrl, ...(caption && { caption }) },
  });
}

// ── Token validation ─────────────────────────────────────────────────────────

export async function validateToken(
  wabaId: string,
  accessToken: string
): Promise<boolean> {
  const res = await fetch(`${BASE}/${wabaId}?access_token=${accessToken}`);
  return res.ok;
}

// ── WABA webhook subscription ────────────────────────────────────────────────

export async function subscribeToWABA(
  wabaId: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${BASE}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`WABA subscription failed: ${JSON.stringify(data)}`);
  }
}

// ── Template sync from Meta ──────────────────────────────────────────────────

export async function fetchTemplatesFromMeta(
  tenant: OrgChannel
): Promise<unknown[]> {
  const token = tenant.access_token_encrypted
    ? decrypt(tenant.access_token_encrypted)
    : tenant.access_token!;

  const res = await fetch(
    `${BASE}/${tenant.waba_id}/message_templates?limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = (await res.json()) as { data?: unknown[] };
  return data.data ?? [];
}
