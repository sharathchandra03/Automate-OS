import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

// Admin client — used ONLY for JWT verification, never for data queries
const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Extend Express Request to carry verified identity
declare global {
  namespace Express {
    interface Request {
      userId: string;
      orgId: string;
    }
  }
}

/**
 * requireAuth — verifies the Supabase JWT in the Authorization header,
 * then looks up the user's organization from the profiles table.
 * Sets req.userId and req.orgId for downstream route handlers.
 * Replaces the old x-organization-id honor-system header.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const jwt = authHeader.slice(7);

  // Verify JWT with Supabase — this call hits no external network, it's local crypto
  const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);
  if (authError || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Fetch the user's organization from profiles
  const { data: profile, error: profileError } = await authClient
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    // User is authenticated but has no org yet (mid-onboarding)
    return res.status(403).json({ error: "No organization found. Complete onboarding first." });
  }

  req.userId = user.id;
  req.orgId  = profile.organization_id;
  return next();
}

/**
 * requireAuthForOnboarding — same JWT check but does NOT require an org yet.
 * Used only on the POST /api/orgs route so users can create their first org.
 */
export async function requireAuthForOnboarding(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const jwt = authHeader.slice(7);
  const { data: { user }, error } = await authClient.auth.getUser(jwt);
  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.userId = user.id;
  return next();
}
