import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createLead } from "@/lib/api";
import { triggerAutomation } from "@/lib/n8n";
import { HAS_SUPABASE } from "@/lib/config";

// =========================================================================
// Public lead capture webhook.
// Token maps to a specific org via the webhook_tokens table.
// In demo mode, any valid-length token routes to the demo tenant.
// =========================================================================

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest, ctx: { params: { token: string } }) {
  const { token } = ctx.params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (!body.name && !body.email && !body.phone) {
    return NextResponse.json({ error: "Provide at least name, email, or phone" }, { status: 400 });
  }

  // Resolve org from token when Supabase is available
  let resolvedOrgId: string | undefined;
  if (HAS_SUPABASE) {
    const supabase = createServiceClient();
    if (supabase) {
      const { data } = await supabase
        .from("webhook_tokens").select("organization_id").eq("token", token).single();
      if (!data) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      resolvedOrgId = data.organization_id as string;

      // Insert lead directly with the resolved org_id
      const { data: lead, error } = await supabase
        .from("leads")
        .insert([{
          organization_id: resolvedOrgId,
          name: String(body.name ?? body.full_name ?? "Unknown"),
          email: body.email ? String(body.email) : null,
          phone: body.phone ? String(body.phone) : null,
          source: body.source ? String(body.source) : "Webhook",
          notes: body.notes ? String(body.notes) : null,
          status: "new", temperature: "warm", score: 50,
        }])
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      triggerAutomation("lead.qualify", { lead_id: lead.id, name: lead.name, source: lead.source }).catch(() => {});
      return NextResponse.json({ ok: true, lead_id: lead.id }, { status: 201 });
    }
  }

  // Demo mode — route to demo tenant via createLead()
  const lead = await createLead({
    name: String(body.name ?? body.full_name ?? "Unknown"),
    email: body.email ? String(body.email) : null,
    phone: body.phone ? String(body.phone) : null,
    source: String(body.source ?? "Webhook"),
    notes: body.notes ? String(body.notes) : null,
  });
  triggerAutomation("lead.qualify", { lead_id: lead.id, name: lead.name, source: lead.source }).catch(() => {});
  return NextResponse.json({ ok: true, lead_id: lead.id }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    docs: "POST JSON to this endpoint with { name, email, phone, source, notes } to capture a lead.",
  });
}
