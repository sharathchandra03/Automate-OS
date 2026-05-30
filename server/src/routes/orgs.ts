import { Router, Request, Response } from "express";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireAuthForOnboarding } from "../middleware/auth";

const router = Router();

// Admin client for org creation — bypasses RLS so we can insert into
// organizations and update the profile in a single atomic operation.
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const createOrgSchema = z.object({
  name:     z.string().min(2, "Organization name must be at least 2 characters"),
  slug:     z.string()
             .min(2)
             .max(40)
             .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  industry: z.string().min(1),
  timezone: z.string().default("Asia/Kolkata"),
});

// POST /api/orgs — create the org and link it to the authenticated user's profile.
// This is called once per user, right after they complete onboarding.
router.post("/", requireAuthForOnboarding, async (req: Request, res: Response) => {
  const userId = req.userId;

  // Check: user shouldn't already have an org
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (existingProfile?.organization_id) {
    return res.status(409).json({ error: "User already has an organization" });
  }

  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, slug, industry, timezone } = parsed.data;

  // Check slug uniqueness
  const { data: slugCheck } = await adminClient
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugCheck) {
    return res.status(409).json({ error: "This slug is already taken. Try another." });
  }

  // Create the organization
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name, slug, industry, timezone })
    .select()
    .single();

  if (orgError) {
    return res.status(500).json({ error: orgError.message });
  }

  // Link the profile to the new org and set role = owner
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ organization_id: org.id, role: "owner" })
    .eq("id", userId);

  if (profileError) {
    // Roll back the org creation to avoid orphaned orgs
    await adminClient.from("organizations").delete().eq("id", org.id);
    return res.status(500).json({ error: profileError.message });
  }

  // Seed the wallet with the 14-day trial credits (non-fatal if table not yet created)
  try {
    await adminClient.from("wallets").insert({
      organization_id: org.id,
      balance_conversation: 500,
      balance_marketing: 200,
      plan: "trial",
    });
  } catch { /* table may not exist yet — non-fatal */ }

  return res.status(201).json({ organization: org });
});

// GET /api/orgs/me — returns the current user's org (useful after onboarding)
router.get("/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const { data: { user }, error } = await adminClient.auth.getUser(authHeader.slice(7));
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: profile } = await adminClient
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return res.json({ organization: null });
  }

  const { data: org } = await adminClient
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();

  return res.json({ organization: org, role: profile.role });
});

export { router as orgsRouter };
