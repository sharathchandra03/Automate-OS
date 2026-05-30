import { Router, Request, Response } from "express";
import { z } from "zod";
import supabase from "../lib/db";
import { sendTemplateMessage, sendButtonMessage } from "../lib/meta-api";
import type { OrgChannel } from "../lib/db";

const router = Router();

// GET /api/appointments
router.get("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data, error } = await supabase
    .from("appointments")
    .select("*, contacts(name, phone)")
    .eq("organization_id", orgId)
    .order("scheduled_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ appointments: data });
});

// POST /api/appointments
router.post("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const schema = z.object({
    contact_id: z.string().uuid(),
    title: z.string().min(1),
    scheduled_at: z.string().datetime(),
    duration_minutes: z.number().default(30),
    notes: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from("appointments")
    .insert({ organization_id: orgId, status: "confirmed", ...parsed.data })
    .select("*, contacts(name, phone)")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ appointment: data });
});

// PUT /api/appointments/:id
router.put("/:id", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { scheduled_at, status, notes, duration_minutes } = req.body as Record<string, unknown>;

  const updatePayload: Record<string, unknown> = {};
  if (scheduled_at) {
    updatePayload.scheduled_at = scheduled_at;
    updatePayload.reminder_sent_24h = false;
    updatePayload.reminder_sent_1h = false;
  }
  if (status) updatePayload.status = status;
  if (notes !== undefined) updatePayload.notes = notes;
  if (duration_minutes) updatePayload.duration_minutes = duration_minutes;

  const { data, error } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", req.params.id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ appointment: data });
});

// POST /api/appointments/:id/cancel
router.post("/:id/cancel", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data: appt } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", req.params.id)
    .eq("organization_id", orgId)
    .select("*, contacts(phone)")
    .single();

  if (appt) {
    const { data: tenant } = await supabase
      .from("org_channels")
      .select("*")
      .eq("organization_id", orgId)
      .eq("provider", "whatsapp")
      .single<OrgChannel>();

    if (tenant) {
      const contact = appt.contacts as { phone: string } | null;
      if (contact?.phone) {
        await sendTextCancel(tenant, contact.phone, appt.title as string).catch(console.error);
      }
    }
  }

  return res.json({ success: true });
});

async function sendTextCancel(tenant: OrgChannel, phone: string, title: string): Promise<void> {
  const { sendTextMessage } = await import("../lib/meta-api");
  await sendTextMessage(tenant, phone, `Your appointment "${title}" has been cancelled. Contact us to reschedule.`);
}

export { router as appointmentsRouter };
