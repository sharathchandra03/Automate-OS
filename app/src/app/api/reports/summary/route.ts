import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ data: null });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  const orgId = profile?.organization_id ?? "";

  const [byStatus, byChannel, topLeads] = await Promise.all([
    supabase.from("leads").select("status").eq("organization_id", orgId),
    supabase.from("leads").select("channel").eq("organization_id", orgId),
    supabase.from("leads").select("name,score,status,channel")
      .eq("organization_id", orgId).order("score", { ascending: false }).limit(5),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of byStatus.data ?? []) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  const channelCounts: Record<string, number> = {};
  for (const row of byChannel.data ?? []) {
    channelCounts[row.channel] = (channelCounts[row.channel] ?? 0) + 1;
  }

  return NextResponse.json({
    status_breakdown: statusCounts,
    channel_breakdown: channelCounts,
    top_leads: topLeads.data ?? [],
  });
}
