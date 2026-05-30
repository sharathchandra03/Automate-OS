import { Router, Request, Response } from "express";
import { z } from "zod";
import supabase from "../lib/db";
import { encrypt } from "../lib/crypto";
import { validateToken, subscribeToWABA } from "../lib/meta-api";

const META_GRAPH = "https://graph.facebook.com/v19.0";

const router = Router();

const connectSchema = z.object({
  waba_id: z.string().min(1),
  phone_number_id: z.string().min(1),
  access_token: z.string().min(1),
  display_name: z.string().min(1),
  phone_number: z.string().min(1),
  webhook_verify_token: z.string().min(6),
});

// POST /api/workspace/whatsapp/connect
router.post("/connect", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { waba_id, phone_number_id, access_token, display_name, phone_number, webhook_verify_token } =
    parsed.data;

  // 1. Validate token with Meta
  const isValid = await validateToken(waba_id, access_token);
  if (!isValid) {
    return res.status(400).json({ error: "Invalid access token — Meta rejected it" });
  }

  // 2. Encrypt token
  const access_token_encrypted = encrypt(access_token);

  // 3. Upsert into org_channels
  const { data: channel, error } = await supabase
    .from("org_channels")
    .upsert(
      {
        organization_id: orgId,
        provider: "whatsapp",
        label: display_name,
        phone_number,
        waba_id,
        phone_number_id,
        access_token_encrypted,
        access_token: null, // never store plaintext
        webhook_verify_token,
        status: "active",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,phone_number_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[WhatsApp Connect] DB error:", error);
    return res.status(500).json({ error: "Failed to save credentials" });
  }

  // 4. Subscribe to WABA webhooks — CRITICAL: without this, inbound messages never arrive
  try {
    await subscribeToWABA(waba_id, access_token);
  } catch (err) {
    console.error("[WhatsApp Connect] WABA subscription failed:", err);
    // Non-fatal: credentials saved; instruct client to subscribe manually
    return res.status(200).json({
      success: true,
      channel,
      warning: "Saved credentials but WABA webhook subscription failed. Please retry.",
    });
  }

  return res.status(200).json({ success: true, channel });
});

// ── POST /api/workspace/whatsapp/embedded-signup ──────────────────────────────
// Called by frontend after Meta's Embedded Signup popup completes.
// Frontend sends: code (OAuth code), waba_id, phone_number_id, display_phone_number
// This route exchanges the code for a token, saves credentials, subscribes webhook.

const embeddedSignupSchema = z.object({
  code: z.string().min(1),
  waba_id: z.string().min(1),
  phone_number_id: z.string().min(1),
  display_phone_number: z.string().min(1),
  display_name: z.string().optional(),
});

router.post("/embedded-signup", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const parsed = embeddedSignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { code, waba_id, phone_number_id, display_phone_number, display_name } = parsed.data;

  // 1. Exchange OAuth code for a User Access Token
  const tokenRes = await fetch(
    `${META_GRAPH}/oauth/access_token` +
      `?client_id=${process.env.META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}` +
      `&code=${code}`
  );
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } };

  if (!tokenData.access_token) {
    console.error("[EmbeddedSignup] Token exchange failed:", tokenData.error);
    return res.status(400).json({ error: "Failed to exchange code for token. Please try connecting again." });
  }

  const userToken = tokenData.access_token;

  // 2. Exchange short-lived user token → long-lived user token (valid 60 days)
  const longLivedRes = await fetch(
    `${META_GRAPH}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${process.env.META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}` +
      `&fb_exchange_token=${userToken}`
  );
  const longLivedData = (await longLivedRes.json()) as { access_token?: string };
  const finalToken = longLivedData.access_token ?? userToken;

  // 3. Validate the token works for this WABA
  const isValid = await validateToken(waba_id, finalToken);
  if (!isValid) {
    return res.status(400).json({ error: "Token validation failed. The selected WhatsApp account could not be verified." });
  }

  // 4. Encrypt and save to org_channels
  const access_token_encrypted = encrypt(finalToken);
  const label = display_name ?? display_phone_number;

  const { data: channel, error: dbError } = await supabase
    .from("org_channels")
    .upsert(
      {
        organization_id: orgId,
        provider: "whatsapp",
        label,
        phone_number: display_phone_number,
        waba_id,
        phone_number_id,
        access_token_encrypted,
        access_token: null,
        webhook_verify_token: null,
        status: "active",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,phone_number_id" }
    )
    .select()
    .single();

  if (dbError) {
    console.error("[EmbeddedSignup] DB error:", dbError);
    return res.status(500).json({ error: "Failed to save WhatsApp credentials." });
  }

  // 5. Subscribe to WABA webhooks so inbound messages arrive
  try {
    await subscribeToWABA(waba_id, finalToken);
  } catch (err) {
    console.error("[EmbeddedSignup] Webhook subscription failed:", err);
    return res.status(200).json({
      success: true,
      channel,
      warning: "Connected but webhook subscription failed. Inbound messages may not arrive. Please reconnect.",
    });
  }

  return res.status(200).json({ success: true, channel });
});

// DELETE /api/workspace/whatsapp/disconnect
router.delete("/disconnect", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  await supabase
    .from("org_channels")
    .update({ status: "disconnected", access_token_encrypted: null, access_token: null })
    .eq("organization_id", orgId)
    .eq("provider", "whatsapp");

  return res.status(200).json({ success: true });
});

// GET /api/workspace/whatsapp/status
router.get("/status", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data: channel } = await supabase
    .from("org_channels")
    .select(
      "id, label, phone_number, waba_id, phone_number_id, status, tier, daily_limit, quality_rating, connected_at"
    )
    .eq("organization_id", orgId)
    .eq("provider", "whatsapp")
    .single();

  return res.status(200).json({ channel: channel ?? null });
});

export { router as whatsappRouter };
