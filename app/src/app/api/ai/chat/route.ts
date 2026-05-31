import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ai } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, history = [] } = await req.json().catch(() => ({ message: "", history: [] }));
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  const orgId = profile?.organization_id ?? "";

  const [leadsRes, walletRes, subRes] = await Promise.all([
    supabase.from("leads").select("name,status,score,channel").eq("organization_id", orgId)
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("wallets").select("conversation_credits,broadcast_credits").eq("organization_id", orgId).single(),
    supabase.from("subscriptions").select("plan,status").eq("organization_id", orgId).single(),
  ]);

  const context = {
    recent_leads: leadsRes.data ?? [],
    wallet: walletRes.data ?? { conversation_credits: 0, broadcast_credits: 0 },
    plan: subRes.data?.plan ?? "free",
  };

  const systemPrompt = buildSystemPrompt(context);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const result = await ai.complete(messages, { feature: "copilot.chat", tenantId: orgId });

  return NextResponse.json({ reply: result.text });
}
