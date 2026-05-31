import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ plan: "free" });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ plan: "free" });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, cancel_at_period_end")
    .eq("organization_id", profile?.organization_id ?? "")
    .single();

  return NextResponse.json(data ?? { plan: "free" });
}
