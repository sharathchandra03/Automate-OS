import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json().catch(() => ({}));
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const { data: conv } = await supabase
    .from("conversations")
    .select("contact_id, channel, organization_id, contacts(phone)")
    .eq("id", ctx.params.id)
    .single();

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const to = (conv.contacts as any)?.phone as string;
  if (!to) return NextResponse.json({ error: "No phone number for contact" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${appUrl}/api/comms/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      to,
      text: message,
      channel: conv.channel ?? "whatsapp",
      conversationId: ctx.params.id,
      creditType: "conversation",
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}
