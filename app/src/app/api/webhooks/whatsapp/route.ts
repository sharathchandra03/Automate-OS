import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { parseWhatsAppPayload } from "@/lib/whatsapp-parser";
import { trackEvent } from "@/lib/analytics";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Meta webhook verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify X-Hub-Signature-256
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const secret = process.env.WHATSAPP_APP_SECRET ?? "";
  if (secret) {
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (sig !== expected) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ ok: true }); }

  const messages = parseWhatsAppPayload(payload);
  if (messages.length === 0) return NextResponse.json({ ok: true });

  // Skip DB writes if Supabase not configured (demo mode)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true });
  }

  const supabase = svc();

  for (const msg of messages) {
    // Resolve org_channel by phone_number_id
    const { data: orgChannel } = await supabase
      .from("org_channels")
      .select("id, organization_id")
      .eq("phone_number_id", msg.wabaId)
      .single();
    if (!orgChannel) continue;

    const orgId: string = orgChannel.organization_id;

    // Upsert contact
    const { data: contact } = await supabase
      .from("contacts")
      .upsert(
        { organization_id: orgId, name: msg.fromPhone, phone: msg.fromPhone },
        { onConflict: "organization_id,phone", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (!contact) continue;

    // Upsert conversation (unique on org + contact + org_channel)
    const { data: conv } = await supabase
      .from("conversations")
      .upsert(
        {
          organization_id: orgId,
          contact_id: contact.id,
          org_channel_id: orgChannel.id,
          status: "open",
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,contact_id,org_channel_id" }
      )
      .select("id")
      .single();

    if (!conv) continue;

    // Insert message (idempotent by wa_message_id)
    await supabase.from("messages").upsert(
      {
        conversation_id: conv.id,
        organization_id: orgId,
        direction: "inbound",
        content_type: "text",
        body: msg.text,
        wa_message_id: msg.waMessageId,
        status: "delivered",
      },
      { onConflict: "wa_message_id", ignoreDuplicates: true }
    );

    await trackEvent(orgId, "message_received", { channel: "whatsapp" });
  }

  return NextResponse.json({ ok: true });
}
