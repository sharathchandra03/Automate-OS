import { Router, Request, Response } from "express";
import { z } from "zod";
import supabase from "../lib/db";

const router = Router();

// GET /api/contacts
router.get("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const page   = parseInt(req.query.page as string)  || 0;
  const limit  = parseInt(req.query.limit as string) || 50;
  const search = req.query.search as string | undefined;
  const tag    = req.query.tag as string | undefined;

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(page * limit, page * limit + limit - 1);

  if (search) query = query.ilike("name", `%${search}%`);
  if (tag)    query = query.contains("tags", [tag]);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ contacts: data, total: count });
});

// POST /api/contacts
router.post("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const schema = z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^\+\d{7,15}$/, "Phone must be E.164 format e.g. +919876543210"),
    email: z.string().email().optional(),
    tags: z.array(z.string()).optional().default([]),
    custom_attributes: z.record(z.unknown()).optional().default({}),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from("contacts")
    .insert({ organization_id: orgId, ...parsed.data })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ contact: data });
});

// POST /api/contacts/import — bulk import from array
router.post("/import", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const schema = z.object({
    contacts: z.array(
      z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string().email().optional(),
        tags: z.array(z.string()).optional(),
      })
    ).min(1).max(5000),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const rows = parsed.data.contacts.map((c) => ({
    ...c,
    organization_id: orgId,
    opted_in: true,
    opted_in_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("contacts")
    .upsert(rows, { onConflict: "organization_id,phone", ignoreDuplicates: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ imported: rows.length });
});

// DELETE /api/contacts/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  await supabase.from("contacts").delete().eq("id", req.params.id).eq("organization_id", orgId);
  return res.json({ success: true });
});

// POST /api/contacts/:id/opt-out
router.post("/:id/opt-out", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  await supabase
    .from("contacts")
    .update({ opted_out: true, opted_out_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("organization_id", orgId);

  return res.json({ success: true });
});

// POST /api/contacts/:id/tags
router.post("/:id/tags", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { add = [], remove = [] } = req.body as { add?: string[]; remove?: string[] };

  const { data: contact } = await supabase
    .from("contacts")
    .select("tags")
    .eq("id", req.params.id)
    .eq("organization_id", orgId)
    .single();

  if (!contact) return res.status(404).json({ error: "Contact not found" });

  const currentTags = (contact.tags as string[]) ?? [];
  const updatedTags = [...new Set([...currentTags, ...add])].filter((t) => !remove.includes(t));

  await supabase
    .from("contacts")
    .update({ tags: updatedTags })
    .eq("id", req.params.id)
    .eq("organization_id", orgId);

  return res.json({ tags: updatedTags });
});

export { router as contactsRouter };
