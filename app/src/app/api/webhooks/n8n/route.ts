import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// =========================================================================
// Inbound webhook from n8n (results, status updates, etc.)
// Validate the shared secret, then enqueue a state update.
// In demo mode this is a no-op acknowledger.
// =========================================================================

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-automateos-secret");
  if (process.env.N8N_WEBHOOK_SECRET && secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const event = typeof body.event === "string" ? body.event : "";
  const supabase = createServiceClient();

  if (supabase && event) {
    switch (event) {
      case "lead.scored": {
        const { lead_id, score, temperature } = body as Record<string, unknown>;
        if (lead_id && typeof score === "number") {
          await supabase.from("leads").update({
            score,
            ...(typeof temperature === "string" ? { temperature } : {}),
          }).eq("id", lead_id);
        }
        break;
      }
      case "campaign.delivered":
      case "campaign.failed": {
        const { run_id, status, delivered_count } = body as Record<string, unknown>;
        if (run_id) {
          await supabase.from("automation_runs").update({
            status: event === "campaign.delivered" ? "success" : "failed",
            ...(typeof delivered_count === "number" ? { response: { delivered_count } } : {}),
          }).eq("id", run_id);
        }
        break;
      }
      case "appointment.confirmed":
      case "appointment.cancelled": {
        const { appointment_id } = body as Record<string, unknown>;
        if (appointment_id) {
          await supabase.from("appointments").update({
            status: event === "appointment.confirmed" ? "confirmed" : "cancelled",
          }).eq("id", appointment_id);
        }
        break;
      }
      case "followup.sent": {
        const { followup_id, lead_id } = body as Record<string, unknown>;
        if (followup_id) {
          await supabase.from("automation_runs").update({ status: "success" }).eq("id", followup_id);
        }
        if (lead_id) {
          await supabase.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", lead_id);
        }
        break;
      }
      default:
        break;
    }

    const tenantHeader = req.headers.get("x-automateos-tenant");
    await supabase.from("webhook_events").insert([{
      organization_id: tenantHeader ?? null,
      source: "n8n",
      event: event || "unknown",
      payload: body,
      status: "processed",
    }]);
  }

  return NextResponse.json({ ok: true, received: body }, { status: 200 });
}
