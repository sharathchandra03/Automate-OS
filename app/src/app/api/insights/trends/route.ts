import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ trends: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  const orgId = profile?.organization_id ?? "";

  const { data } = await supabase.rpc("daily_lead_counts", { p_org_id: orgId, p_days: 30 });

  return NextResponse.json({ trends: data ?? [] });
}
