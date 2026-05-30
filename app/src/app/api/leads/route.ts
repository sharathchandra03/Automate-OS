import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// n8n calls this endpoint with Bearer token auth (N8N_WEBHOOK_SECRET)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.N8N_WEBHOOK_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data } = await supabase
    .from("leads")
    .select("id, name, status, channel, score, last_contacted_at")
    .eq("organization_id", orgId);

  return NextResponse.json(data ?? []);
}
