import { Router, Request, Response } from "express";
import supabase from "../lib/db";
import { processFlowStep, checkTriggers, startFlowSession } from "../lib/flow-engine";
import type { OrgChannel } from "../lib/db";

const router = Router();

// ── GET /api/webhook/whatsapp — Meta verification handshake ─────────────────

router.get("/", async (req: Request, res: Response) => {
  const mode      = req.query["hub.mode"] as string;
  const token     = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (mode !== "subscribe" || !token) {
    return res.sendStatus(403);
  }

  // 1. Accept the global app-level token (set in .env — used during Meta App setup)
  if (process.env.WEBHOOK_VERIFY_TOKEN && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  // 2. Accept per-org tokens (stored when each client connects their WhatsApp)
  const { data: tenant } = await supabase
    .from("org_channels")
    .select("id, organization_id")
    .eq("webhook_verify_token", token)
    .eq("provider", "whatsapp")
    .single();

  if (tenant) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// ── POST /api/webhook/whatsapp — incoming messages from Meta ─────────────────
// CRITICAL: Always respond 200 within 5 seconds. Process async after.

router.post("/", (req: Request, res: Response) => {
  res.status(200).send("OK"); // Immediate response

  void processWebhookAsync(req.body as WAPayload);
});

// ── Async processing ─────────────────────────────────────────────────────────

async function processWebhookAsync(payload: WAPayload) {
  const entry  = payload.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  if (!change) return;

  const phoneNumberId = change.metadata?.phone_number_id;
  if (!phoneNumberId) return;

  const { data: tenant } = await supabase
    .from("org_channels")
    .select("*")
    .eq("phone_number_id", phoneNumberId)
    .eq("provider", "whatsapp")
    .single<OrgChannel>();

  if (!tenant) return;

  if (change.messages?.length) {
    for (const msg of change.messages) {
      await handleInboundMessage(tenant, msg, change.contacts?.[0]);
    }
  }

  if (change.statuses?.length) {
    for (const status of change.statuses) {
      await handleStatusUpdate(tenant, status);
    }
  }
}

async function handleInboundMessage(
  tenant: OrgChannel,
  message: WAMessage,
  contact?: WAContact
) {
  const orgId = tenant.organization_id;
  const from  = message.from;

  // 1. Upsert contact
  const { data: contactRow } = await supabase
    .from("contacts")
    .upsert(
      {
        organization_id: orgId,
        phone: from,
        name: contact?.profile?.name ?? from,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,phone", ignoreDuplicates: false }
    )
    .select("id, opted_out")
    .single();

  if (!contactRow) return;
  if (contactRow.opted_out) return; // Never process messages from opted-out contacts

  // 2. Handle opt-out keywords
  if (message.type === "text") {
    const text = message.text?.body?.toLowerCase().trim() ?? "";
    if (["stop", "unsubscribe", "opt out", "optout"].includes(text)) {
      await supabase
        .from("contacts")
        .update({ opted_out: true, opted_out_at: new Date().toISOString() })
        .eq("id", contactRow.id);
      return;
    }
  }

  // 3. Upsert conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .upsert(
      {
        organization_id: orgId,
        contact_id: contactRow.id,
        org_channel_id: tenant.id,
        status: "open",
        last_message_at: new Date().toISOString(),
        last_message_preview: extractPreview(message),
        window_expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      },
      { onConflict: "organization_id,contact_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  // 4. Save message record
  if (conversation?.id) {
    await supabase.from("messages").insert({
      organization_id: orgId,
      conversation_id: conversation.id,
      direction: "inbound",
      content_type: message.type === "text" ? "text" : message.type,
      body: extractPreview(message),
      wa_message_id: message.id,
      status: "delivered",
    });
  }

  // 5. Route: active flow session → flow engine
  const { data: activeSession } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("contact_id", contactRow.id)
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (activeSession) {
    await processFlowStep(tenant, activeSession, message);
    return;
  }

  // 6. Route: assigned agent → deliver to inbox (no bot)
  const { data: assignedConv } = await supabase
    .from("conversations")
    .select("assignee_id")
    .eq("organization_id", orgId)
    .eq("contact_id", contactRow.id)
    .not("assignee_id", "is", null)
    .single();

  if (assignedConv?.assignee_id) return;

  // 7. No active session and no agent — check keyword triggers
  await checkTriggers(tenant, message, contactRow.id);
}

async function handleStatusUpdate(tenant: OrgChannel, status: WAStatus) {
  await supabase
    .from("messages")
    .update({ status: status.status, })
    .eq("wa_message_id", status.id)
    .eq("organization_id", tenant.organization_id);

  // Update campaign recipient status if applicable
  await supabase
    .from("campaign_recipients")
    .update({ status: status.status })
    .eq("message_id", status.id);
}

function extractPreview(msg: WAMessage): string {
  if (msg.type === "text") return msg.text?.body ?? "";
  if (msg.type === "image") return msg.image?.caption ?? "[Image]";
  if (msg.type === "audio") return "[Voice message]";
  if (msg.type === "document") return msg.document?.filename ?? "[Document]";
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ??
      msg.interactive?.list_reply?.title ??
      "[Interactive]"
    );
  }
  return `[${msg.type}]`;
}

// ── Meta Webhook Types ───────────────────────────────────────────────────────

interface WAPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{ value: WAValue; field: string }>;
  }>;
}

interface WAValue {
  messaging_product: string;
  metadata?: { display_phone_number: string; phone_number_id: string };
  contacts?: WAContact[];
  messages?: WAMessage[];
  statuses?: WAStatus[];
}

interface WAContact {
  profile: { name: string };
  wa_id: string;
}

interface WAMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { caption?: string; id: string };
  audio?: { id: string };
  document?: { filename?: string; id: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

interface WAStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

export { router as webhookRouter };
export type { WAMessage };
