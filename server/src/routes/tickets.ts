import { Router, Request, Response } from "express";
import { z } from "zod";
import supabase from "../lib/db";

const router = Router();

const SLA_HOURS: Record<string, number> = {
  urgent: 1,
  high: 4,
  medium: 24,
  low: 72,
};

// GET /api/tickets
router.get("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const status = req.query.status as string | undefined;

  let query = supabase
    .from("support_tickets")
    .select("*, contacts(name, phone), profiles!support_tickets_assigned_agent_id_fkey(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ tickets: data });
});

// POST /api/tickets
router.post("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const schema = z.object({
    contact_id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional().default(""),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const slaBreachAt = new Date(
    Date.now() + (SLA_HOURS[parsed.data.priority] ?? 24) * 3600 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      organization_id: orgId,
      sla_breach_at: slaBreachAt,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ ticket: data });
});

// PUT /api/tickets/:id
router.put("/:id", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { status, priority, title, description } = req.body as Record<string, string>;

  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (priority) {
    update.priority = priority;
    update.sla_breach_at = new Date(
      Date.now() + (SLA_HOURS[priority] ?? 24) * 3600 * 1000
    ).toISOString();
  }
  if (title) update.title = title;
  if (description !== undefined) update.description = description;

  const { data, error } = await supabase
    .from("support_tickets")
    .update(update)
    .eq("id", req.params.id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ticket: data });
});

// POST /api/tickets/:id/assign
router.post("/:id/assign", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { agent_id } = req.body as { agent_id: string };
  if (!agent_id) return res.status(400).json({ error: "agent_id required" });

  await supabase
    .from("support_tickets")
    .update({ assigned_agent_id: agent_id, status: "in_progress" })
    .eq("id", req.params.id)
    .eq("organization_id", orgId);

  return res.json({ success: true });
});

// POST /api/tickets/:id/resolve
router.post("/:id/resolve", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  await supabase
    .from("support_tickets")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("organization_id", orgId);

  return res.json({ success: true });
});

export { router as ticketsRouter };
