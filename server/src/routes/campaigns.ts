import { Router, Request, Response } from "express";
import { z } from "zod";
import supabase from "../lib/db";
import { campaignQueue, type CampaignJobData } from "../lib/queue";

const router = Router();

const MESSAGES_PER_SECOND = 10;

// GET /api/campaigns
router.get("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data, error } = await supabase
    .from("campaigns")
    .select("*, whatsapp_templates(template_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ campaigns: data });
});

// POST /api/campaigns
router.post("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const schema = z.object({
    name: z.string().min(1),
    template_id: z.string().uuid(),
    filters: z.record(z.unknown()).optional().default({}),
    variable_mapping: z.record(z.string()).optional().default({}),
    scheduled_at: z.string().datetime().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, template_id, filters, variable_mapping, scheduled_at } = parsed.data;

  // Verify template is APPROVED
  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("id, template_name, language, status")
    .eq("id", template_id)
    .eq("organization_id", orgId)
    .single();

  if (!template) return res.status(404).json({ error: "Template not found" });
  if (template.status !== "APPROVED") {
    return res.status(400).json({ error: "Template must be APPROVED before launching a campaign" });
  }

  // Resolve recipients
  let query = supabase
    .from("contacts")
    .select("id, phone")
    .eq("organization_id", orgId)
    .eq("opted_out", false);

  // Apply tag filter if provided
  const filterTags = (filters as { tags?: string[] }).tags;
  if (filterTags?.length) {
    query = query.overlaps("tags", filterTags as unknown as string);
  }

  const { data: recipients } = await query;
  if (!recipients?.length) {
    return res.status(400).json({ error: "No eligible recipients for this campaign" });
  }

  // Check daily sending limit
  const { data: channel } = await supabase
    .from("org_channels")
    .select("daily_limit")
    .eq("organization_id", orgId)
    .eq("provider", "whatsapp")
    .single();

  const { count: sentToday } = await supabase
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .in("status", ["sent", "delivered", "read"]);

  const limit = channel?.daily_limit ?? 1000;
  if ((sentToday ?? 0) + recipients.length > limit) {
    return res.status(400).json({
      error: `Daily limit exceeded. Sent today: ${sentToday}, limit: ${limit}`,
    });
  }

  // Create campaign
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .insert({
      organization_id: orgId,
      name,
      template_id,
      target_segment: filters,
      recipient_count: recipients.length,
      scheduled_at: scheduled_at ?? null,
      status: scheduled_at ? "scheduled" : "draft",
      stats: { total: recipients.length, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 },
    })
    .select()
    .single();

  if (campErr || !campaign) {
    return res.status(500).json({ error: campErr?.message ?? "Failed to create campaign" });
  }

  // Insert campaign recipients
  const recipientRows = recipients.map((r) => ({
    campaign_id: campaign.id,
    contact_id: r.id,
    phone: r.phone as string,
    variables: Object.fromEntries(
      Object.entries(variable_mapping).map(([k, field]) => [k, (r as Record<string, unknown>)[field] ?? ""])
    ),
  }));

  await supabase.from("campaign_recipients").insert(recipientRows);

  // If no scheduled_at, queue immediately
  if (!scheduled_at) {
    await queueCampaignExecution(campaign.id, orgId, template.template_name, template.language);
  }

  return res.status(201).json({ campaign });
});

// POST /api/campaigns/:id/send
router.post("/:id/send", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const id = String(req.params.id);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, whatsapp_templates(template_name, language, status)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  if (campaign.status === "running") {
    return res.status(400).json({ error: "Campaign is already running" });
  }

  const tplRaw = campaign.whatsapp_templates as unknown;
  const tpl = (Array.isArray(tplRaw) ? tplRaw[0] : tplRaw) as { template_name: string; language: string; status: string } | null;
  if (!tpl || tpl.status !== "APPROVED") {
    return res.status(400).json({ error: "Template must be APPROVED" });
  }

  await queueCampaignExecution(id, String(orgId), tpl.template_name, tpl.language);
  return res.json({ success: true, message: "Campaign queued" });
});

// POST /api/campaigns/:id/pause
router.post("/:id/pause", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  await supabase
    .from("campaigns")
    .update({ status: "paused" })
    .eq("id", req.params.id)
    .eq("organization_id", orgId);

  return res.json({ success: true });
});

// GET /api/campaigns/:id/stats
router.get("/:id/stats", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data } = await supabase
    .from("campaigns")
    .select("id, name, status, stats, recipient_count, started_at, completed_at")
    .eq("id", req.params.id)
    .eq("organization_id", orgId)
    .single();

  return res.json({ stats: data });
});

// GET /api/campaigns/:id/recipients
router.get("/:id/recipients", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const page = parseInt(req.query.page as string) || 0;
  const limit = 50;

  const { data, count } = await supabase
    .from("campaign_recipients")
    .select("*, contacts(name, phone)", { count: "exact" })
    .eq("campaign_id", req.params.id)
    .range(page * limit, page * limit + limit - 1);

  return res.json({ recipients: data, total: count });
});

// ── Queue helper ─────────────────────────────────────────────────────────────

async function queueCampaignExecution(
  campaignId: string,
  organizationId: string,
  templateName: string,
  language: string
): Promise<void> {
  if (!campaignQueue) {
    console.warn("[Campaigns] Cannot send — no REDIS_URL configured. Add REDIS_URL to server/.env.");
    return;
  }

  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("id, phone, variables")
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  if (!recipients?.length) return;

  await supabase
    .from("campaigns")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", campaignId);

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const delay = Math.floor(i / MESSAGES_PER_SECOND) * 1000;

    const jobData: CampaignJobData = {
      campaignId,
      recipientId: r.id as string,
      phone: r.phone as string,
      variables: (r.variables ?? {}) as Record<string, string>,
      templateName,
      language,
      organizationId,
    };

    await campaignQueue.add("send-campaign-message", jobData, { delay });
  }
}

export { router as campaignsRouter };
