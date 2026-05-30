import { NextRequest, NextResponse } from "next/server";
import { triggerAutomation, type AutomationAction } from "@/lib/n8n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics";

const VALID: AutomationAction[] = [
  "lead.qualify", "lead.assign", "followup.send", "campaign.launch",
  "appointment.book", "appointment.remind", "ticket.create", "ticket.escalate",
  "faq.reply", "retargeting.run", "digest.daily",
];

export async function POST(req: NextRequest, ctx: { params: { action: string } }) {
  const supabase = createSupabaseServerClient();
  let orgId: string | null = null;
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase
      .from("profiles").select("organization_id").eq("id", user.id).single();
    orgId = profile?.organization_id ?? null;
  }

  const { action } = ctx.params;
  if (!VALID.includes(action as AutomationAction)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { /* allow empty body */ }

  const tenantId = req.headers.get("x-automateos-tenant") ?? orgId ?? undefined;
  const idempotencyKey = req.headers.get("x-idempotency-key") ?? undefined;

  const result = await triggerAutomation(action as AutomationAction, payload, { tenantId, idempotencyKey });

  if (result.ok && orgId) {
    await trackEvent(orgId, action, payload);
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
