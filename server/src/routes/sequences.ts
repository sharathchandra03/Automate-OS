import { Router, Request, Response } from "express";
import { z } from "zod";
import supabase from "../lib/db";

const router = Router();

// GET /api/sequences
router.get("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data, error } = await supabase
    .from("sequences")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ sequences: data });
});

// POST /api/sequences
router.post("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const schema = z.object({
    name: z.string().min(1),
    trigger_event: z.string().optional(),
    steps: z.array(
      z.object({
        delay_hours: z.number().min(0),
        template_name: z.string().optional(),
        language: z.string().default("en"),
        variables: z.record(z.string()).optional().default({}),
        message: z.string().optional(),
      })
    ).min(1),
    is_active: z.boolean().default(true),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from("sequences")
    .insert({ organization_id: orgId, ...parsed.data })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ sequence: data });
});

// POST /api/sequences/:id/enroll
router.post("/:id/enroll", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { contact_ids } = req.body as { contact_ids: string[] };
  if (!Array.isArray(contact_ids) || !contact_ids.length) {
    return res.status(400).json({ error: "contact_ids array required" });
  }

  const { data: sequence } = await supabase
    .from("sequences")
    .select("steps")
    .eq("id", req.params.id)
    .eq("organization_id", orgId)
    .single();

  if (!sequence) return res.status(404).json({ error: "Sequence not found" });

  const steps = sequence.steps as Array<{ delay_hours: number }>;
  const firstDelay = steps[0]?.delay_hours ?? 0;
  const nextSendAt = new Date(Date.now() + firstDelay * 3600 * 1000).toISOString();

  const rows = contact_ids.map((contactId) => ({
    sequence_id: req.params.id,
    contact_id: contactId,
    current_step: 0,
    status: "active",
    next_send_at: nextSendAt,
  }));

  const { error } = await supabase
    .from("sequence_enrollments")
    .upsert(rows, { onConflict: "sequence_id,contact_id", ignoreDuplicates: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ enrolled: rows.length });
});

// DELETE /api/sequences/:id/enrollments/:contactId
router.delete("/:id/enrollments/:contactId", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  await supabase
    .from("sequence_enrollments")
    .update({ status: "cancelled" })
    .eq("sequence_id", req.params.id)
    .eq("contact_id", req.params.contactId);

  return res.json({ success: true });
});

export { router as sequencesRouter };
