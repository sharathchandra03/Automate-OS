import { Router, Request, Response } from "express";
import { z } from "zod";
import supabase from "../lib/db";

const router = Router();

// GET /api/flows
router.get("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data, error } = await supabase
    .from("workflows")
    .select("id, name, status, trigger_type, trigger_value, trigger_match_type, runs_total, created_at, updated_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ flows: data });
});

// POST /api/flows
router.post("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const schema = z.object({
    name: z.string().min(1),
    trigger_type: z.enum(["keyword", "inbound", "campaign_reply", "schedule"]).default("keyword"),
    trigger_value: z.string().default(""),
    trigger_match_type: z.enum(["exact", "contains"]).default("exact"),
    nodes: z.array(z.unknown()).default([]),
    edges: z.array(z.unknown()).default([]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from("workflows")
    .insert({ organization_id: orgId, trigger: "incoming_whatsapp", status: "draft", ...parsed.data })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ flow: data });
});

// PUT /api/flows/:id
router.put("/:id", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { name, nodes, edges, trigger_type, trigger_value, trigger_match_type } = req.body as Record<string, unknown>;

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name) updatePayload.name = name;
  if (nodes) updatePayload.nodes = nodes;
  if (edges) updatePayload.edges = edges;
  if (trigger_type) updatePayload.trigger_type = trigger_type;
  if (trigger_value !== undefined) updatePayload.trigger_value = trigger_value;
  if (trigger_match_type) updatePayload.trigger_match_type = trigger_match_type;

  const { data, error } = await supabase
    .from("workflows")
    .update(updatePayload)
    .eq("id", req.params.id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ flow: data });
});

// POST /api/flows/:id/activate
router.post("/:id/activate", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  await supabase
    .from("workflows")
    .update({ status: "active" })
    .eq("id", req.params.id)
    .eq("organization_id", orgId);

  return res.json({ success: true });
});

// POST /api/flows/:id/deactivate
router.post("/:id/deactivate", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  await supabase
    .from("workflows")
    .update({ status: "paused" })
    .eq("id", req.params.id)
    .eq("organization_id", orgId);

  return res.json({ success: true });
});

// GET /api/flows/:id/sessions
router.get("/:id/sessions", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data } = await supabase
    .from("workflow_runs")
    .select("id, contact_id, status, current_node_id, context, started_at, last_activity_at, contacts(name, phone)")
    .eq("workflow_id", req.params.id)
    .eq("organization_id", orgId)
    .order("started_at", { ascending: false })
    .limit(100);

  return res.json({ sessions: data });
});

export { router as flowsRouter };
