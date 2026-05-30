import { Router, Request, Response } from "express";
import supabase from "../lib/db";
import { fetchTemplatesFromMeta } from "../lib/meta-api";
import type { OrgChannel } from "../lib/db";

const router = Router();

// GET /api/templates
router.get("/", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("organization_id", orgId)
    .order("template_name");

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ templates: data });
});

// POST /api/templates/sync — pull templates from Meta and upsert
router.post("/sync", async (req: Request, res: Response) => {
  const orgId = req.orgId;

  const { data: tenant } = await supabase
    .from("org_channels")
    .select("*")
    .eq("organization_id", orgId)
    .eq("provider", "whatsapp")
    .eq("status", "active")
    .single<OrgChannel>();

  if (!tenant) {
    return res.status(400).json({ error: "No active WhatsApp channel connected" });
  }

  const metaTemplates = await fetchTemplatesFromMeta(tenant);

  let synced = 0;
  for (const t of metaTemplates) {
    const tpl = t as {
      name: string;
      id: string;
      category: string;
      language: string;
      status: string;
      components: unknown[];
    };

    await supabase.from("whatsapp_templates").upsert(
      {
        organization_id: orgId,
        template_name: tpl.name,
        template_id: tpl.id,
        category: tpl.category,
        language: tpl.language,
        status: tpl.status,
        components: tpl.components ?? [],
      },
      { onConflict: "organization_id,template_name,language" }
    );
    synced++;
  }

  return res.json({ synced, message: `${synced} templates synced from Meta` });
});

export { router as templatesRouter };
