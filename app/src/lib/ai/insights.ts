/**
 * AI Insights generator - daily/weekly briefs, anomaly hints, recommendations.
 *
 * In demo mode this returns deterministic, realistic insights.
 * In production it can call ai.complete() with `prompts.insights.brief`.
 */

export interface Insight {
  id: string;
  tenantId: string;
  level: "info" | "win" | "risk" | "alert";
  title: string;
  body: string;
  cta?: { label: string; href: string };
  createdAt: string;
}

const insights: Insight[] = [];

export function listInsights(tenantId: string, limit = 12): Insight[] {
  return insights
    .filter((i) => i.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function pushInsight(tenantId: string, partial: Omit<Insight, "id" | "tenantId" | "createdAt">): Insight {
  const ins: Insight = {
    id: `ins_${Math.random().toString(36).slice(2, 10)}`,
    tenantId,
    createdAt: new Date().toISOString(),
    ...partial,
  };
  insights.unshift(ins);
  if (insights.length > 500) insights.pop();
  return ins;
}

/** Build a daily brief synchronously from current numbers (used as fallback / demo). */
export function buildDailyBrief(tenantId: string, kpis: Record<string, number>): Insight[] {
  const out: Insight[] = [];
  if ((kpis.hot_leads ?? 0) > 0) {
    out.push({
      id: `ins_hot_${Date.now()}`,
      tenantId,
      level: "win",
      title: `${kpis.hot_leads} hot leads waiting for a reply`,
      body: "Reply within 5 minutes to multiply your close rate. Open the Inbox.",
      cta: { label: "Open Inbox", href: "/leads?temp=hot" },
      createdAt: new Date().toISOString(),
    });
  }
  if ((kpis.aging_tickets ?? 0) > 0) {
    out.push({
      id: `ins_aging_${Date.now()}`,
      tenantId,
      level: "risk",
      title: `${kpis.aging_tickets} tickets aging > 24h`,
      body: "Customer satisfaction drops sharply after 24h. Triage now.",
      cta: { label: "Open Tickets", href: "/tickets?status=open" },
      createdAt: new Date().toISOString(),
    });
  }
  if ((kpis.failing_automations ?? 0) > 0) {
    out.push({
      id: `ins_auto_${Date.now()}`,
      tenantId,
      level: "alert",
      title: `${kpis.failing_automations} automation(s) failing`,
      body: "Success rate dropped below 80%. Check Webhook logs and re-test the flow.",
      cta: { label: "Open Automations", href: "/automations" },
      createdAt: new Date().toISOString(),
    });
  }
  if ((kpis.deals_won_week ?? 0) > 0) {
    out.push({
      id: `ins_won_${Date.now()}`,
      tenantId,
      level: "win",
      title: `Won ${kpis.deals_won_week} deals this week`,
      body: `That's ${kpis.deals_won_week_delta_pct ?? 0}% vs last week. Best channel: WhatsApp.`,
      cta: { label: "Open Reports", href: "/analytics" },
      createdAt: new Date().toISOString(),
    });
  }
  if ((kpis.idle_followups ?? 0) > 0) {
    out.push({
      id: `ins_idle_${Date.now()}`,
      tenantId,
      level: "info",
      title: `${kpis.idle_followups} dormant leads ripe for re-engagement`,
      body: "Run the Win-Back retargeting flow with a 10% offer.",
      cta: { label: "Run Retargeting", href: "/retargeting" },
      createdAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Push the demo daily brief into the in-memory store. */
export function seedDemoInsights(tenantId: string) {
  if (insights.some((i) => i.tenantId === tenantId)) return;
  const brief = buildDailyBrief(tenantId, {
    hot_leads: 3,
    aging_tickets: 2,
    failing_automations: 1,
    deals_won_week: 7,
    deals_won_week_delta_pct: 18,
    idle_followups: 14,
  });
  brief.forEach((b) => insights.push(b));
}
