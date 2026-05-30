import { Router, Request, Response } from "express";
import supabase from "../lib/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/analytics?days=7|14|30
// Returns an aggregated summary for the dashboard overview page.
// All counts are scoped to req.orgId (set by requireAuth).
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const orgId = req.orgId;
  const days  = Math.min(parseInt(req.query.days as string) || 30, 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Run all aggregation queries in parallel — no waterfalls
  const [contacts, conversations, campaigns, tickets, leads] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, created_at", { count: "exact" })
      .eq("organization_id", orgId)
      .gte("created_at", since),

    supabase
      .from("conversations")
      .select("id, status, created_at", { count: "exact" })
      .eq("organization_id", orgId)
      .gte("created_at", since),

    supabase
      .from("campaigns")
      .select("id, status, stats, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", since),

    supabase
      .from("support_tickets")
      .select("id, status, created_at", { count: "exact" })
      .eq("organization_id", orgId)
      .gte("created_at", since),

    supabase
      .from("leads")
      .select("id, status, created_at", { count: "exact" })
      .eq("organization_id", orgId)
      .gte("created_at", since),
  ]);

  // Aggregate campaign stats
  const campList = campaigns.data ?? [];
  const campaignsSent     = campList.reduce((sum, c) => sum + ((c.stats as Record<string, number>)?.sent     ?? 0), 0);
  const campaignsDelivered= campList.reduce((sum, c) => sum + ((c.stats as Record<string, number>)?.delivered ?? 0), 0);
  const campaignsRead     = campList.reduce((sum, c) => sum + ((c.stats as Record<string, number>)?.read      ?? 0), 0);

  const convList = conversations.data ?? [];
  const openConversations   = convList.filter((c) => c.status === "open").length;
  const closedConversations = convList.filter((c) => c.status === "resolved").length;

  const ticketList = tickets.data ?? [];
  const openTickets   = ticketList.filter((t) => t.status === "open").length;
  const closedTickets = ticketList.filter((t) => t.status === "resolved").length;

  const leadList = leads.data ?? [];
  const wonLeads  = leadList.filter((l) => l.status === "won").length;
  const lostLeads = leadList.filter((l) => l.status === "lost").length;

  return res.json({
    period_days: days,
    since,
    contacts: {
      total: contacts.count ?? 0,
    },
    conversations: {
      total:  convList.length,
      open:   openConversations,
      closed: closedConversations,
    },
    campaigns: {
      count:     campList.length,
      sent:      campaignsSent,
      delivered: campaignsDelivered,
      read:      campaignsRead,
      open_rate: campaignsSent > 0 ? Math.round((campaignsRead / campaignsSent) * 1000) / 10 : 0,
    },
    tickets: {
      total:  ticketList.length,
      open:   openTickets,
      closed: closedTickets,
    },
    leads: {
      total:     leadList.length,
      won:       wonLeads,
      lost:      lostLeads,
      win_rate:  leadList.length > 0 ? Math.round((wonLeads / leadList.length) * 1000) / 10 : 0,
    },
  });
});

export { router as analyticsRouter };
