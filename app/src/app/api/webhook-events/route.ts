import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ events: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();

  const { data } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ events: data ?? [] });
}
