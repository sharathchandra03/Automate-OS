import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMessage } from "@/lib/comms";
import { getActiveChannel, deductCredits } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics";

const schema = z.object({
  channel: z.enum(["whatsapp", "sms", "telegram"]),
  to: z.string().min(1, "Recipient is required"),
  text: z.string().min(1, "Message text is required").max(4096),
  /** Optional: conversationId to record the message and deduct conversation credits */
  conversationId: z.string().optional(),
  /** Credit type to deduct. Defaults to "conversation". */
  creditType: z.enum(["conversation", "broadcast"]).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  let orgId: string | null = null;
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase
      .from("profiles").select("organization_id").eq("id", user.id).single();
    orgId = profile?.organization_id ?? null;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { channel, to, text, conversationId, creditType = "conversation" } = parsed.data;

  // Look up the org's active channel credentials
  const providerMap = { whatsapp: "whatsapp", sms: "sms_twilio", telegram: "telegram" } as const;
  const orgChannel = await getActiveChannel(providerMap[channel] as "whatsapp" | "sms_twilio" | "telegram");

  // Build per-org credentials object
  const credentials = orgChannel
    ? {
        phoneNumberId: orgChannel.phone_number_id ?? undefined,
        accessToken: orgChannel.access_token ?? undefined,
        botToken: orgChannel.bot_token ?? undefined,
        twilioAccountSid: orgChannel.twilio_account_sid ?? undefined,
        twilioAuthToken: orgChannel.twilio_auth_token ?? undefined,
        twilioFromNumber: orgChannel.twilio_from_number ?? undefined,
      }
    : undefined;

  // Check and deduct credits before sending
  const deductResult = await deductCredits(
    creditType,
    1,
    `${channel} message to ${to}`,
    conversationId
  );

  if (!deductResult.ok) {
    return NextResponse.json(
      { ok: false, error: "Insufficient credits. Please top up your wallet." },
      { status: 402 }
    );
  }

  const result = await sendMessage({ channel, to, text, credentials });

  // Refund the credit if the actual send failed
  if (!result.ok) {
    await deductCredits(creditType, -1, `Refund: failed ${channel} message to ${to}`, conversationId);
  } else if (orgId) {
    await trackEvent(orgId, "message_sent", { channel, credit_type: creditType });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
