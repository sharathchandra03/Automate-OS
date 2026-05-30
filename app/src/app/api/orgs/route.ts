import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  name:     z.string().min(2).max(120),
  slug:     z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  industry: z.string().optional(),
  timezone: z.string().optional(),
});

function createServiceRoleClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  // ── 1. Auth: verify the JWT from the Authorization header ──────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error: Supabase not configured" }, { status: 500 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // ── 2. Parse and validate body ─────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { name, slug, industry, timezone } = parsed.data;

  // ── 3. Guard: user must not already have a profile ─────────────────────
  const { data: existing } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.organization_id) {
    return NextResponse.json({ error: "User already has an organization" }, { status: 409 });
  }

  // ── 4. Check slug uniqueness ───────────────────────────────────────────
  const { data: slugCheck } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugCheck) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  // ── 5. Create org then profile atomically ──────────────────────────────
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name:     name.trim(),
      slug,
      industry: industry ?? null,
      timezone: timezone ?? "UTC",
    })
    .select()
    .single();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  const fullName = [
    user.user_metadata?.first_name,
    user.user_metadata?.last_name,
  ].filter(Boolean).join(" ") || user.user_metadata?.vendor_name || user.email?.split("@")[0] || "Owner";

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id:              user.id,
      email:           user.email!,
      full_name:       fullName,
      organization_id: org.id,
      role:            "owner",
    });

  if (profileError) {
    // Roll back the org if profile insert fails
    await supabase.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // ── 6. Update user app_metadata so the JWT claim is set on next refresh ─
  await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { organization_id: org.id },
  });

  // ── 7. Generate a per-org webhook token for the lead capture URL ───────
  const webhookToken = crypto.randomUUID().replace(/-/g, "");
  await supabase.from("webhook_tokens").insert({ token: webhookToken, organization_id: org.id });

  return NextResponse.json({ organization: org, webhook_token: webhookToken }, { status: 201 });
}
