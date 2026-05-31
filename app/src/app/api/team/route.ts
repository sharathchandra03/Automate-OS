import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getOrgAndRole(supabase: ReturnType<typeof createSupabaseServerClient>, userId: string) {
  const { data } = await supabase!.from("profiles").select("organization_id, role").eq("id", userId).single();
  return data ?? null;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ members: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getOrgAndRole(supabase, user.id);
  if (!profile?.organization_id) return NextResponse.json({ members: [] });

  const { data } = await supabase
    .from("profiles").select("id, email, full_name, role, created_at")
    .eq("organization_id", profile.organization_id).order("created_at");

  return NextResponse.json({ members: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role = "member" } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const profile = await getOrgAndRole(supabase, user.id);
  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const svClient = svc();
  const { data, error } = await svClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/onboarding`,
    data: { organization_id: profile.organization_id, role },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data.user });
}

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { member_id, role } = await req.json().catch(() => ({}));
  const VALID_ROLES = ["owner", "admin", "member", "viewer"];
  if (!member_id || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const profile = await getOrgAndRole(supabase, user.id);
  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const svClient = svc();
  await svClient.from("profiles").update({ role })
    .eq("id", member_id).eq("organization_id", profile?.organization_id ?? "");

  return NextResponse.json({ ok: true });
}
