/**
 * AI usage + cost tracker.
 *
 * In production this writes to a `ai_usage` table.
 * In demo/mock mode it keeps an in-memory log so the UI can display real-looking data.
 */

export interface UsageEvent {
  tenantId: string;
  feature: string;       // e.g. "lead.qualify", "ticket.classify"
  provider: string;
  model: string;
  tokens: number;
  costUsd: number;
  at: string;
}

// USD per 1k tokens; conservative averages - adjust per current pricing
const COST_PER_1K: Record<string, number> = {
  "gpt-4o-mini":            0.0006,
  "gpt-4o":                 0.005,
  "gpt-4.1-mini":           0.002,
  "claude-3-5-sonnet":      0.006,
  "claude-3-5-haiku":       0.001,
  "gemini-1.5-pro":         0.005,
  "gemini-1.5-flash":       0.0008,
  "mock-fast":              0,
  "mock-smart":             0,
};

export function estimateCost(model: string, tokens: number): number {
  const rate = COST_PER_1K[model] ?? 0.002;
  return (tokens / 1000) * rate;
}

const usageLog: UsageEvent[] = [];
const MAX_LOG = 5000;

export function trackTokens(
  tenantId: string,
  feature: string,
  provider: string,
  model: string,
  tokens: number,
): UsageEvent {
  const event: UsageEvent = {
    tenantId,
    feature,
    provider,
    model,
    tokens,
    costUsd: estimateCost(model, tokens),
    at: new Date().toISOString(),
  };
  usageLog.push(event);
  if (usageLog.length > MAX_LOG) usageLog.shift();
  return event;
}

export interface UsageSummary {
  tenantId: string;
  windowDays: number;
  totalTokens: number;
  totalCostUsd: number;
  byFeature: Record<string, { tokens: number; cost: number }>;
  byModel: Record<string, { tokens: number; cost: number }>;
  daily: { date: string; tokens: number; cost: number }[];
}

export function summarizeUsage(tenantId: string, windowDays = 30): UsageSummary {
  const since = Date.now() - windowDays * 86_400_000;
  const events = usageLog.filter((e) => e.tenantId === tenantId && new Date(e.at).getTime() >= since);
  const byFeature: Record<string, { tokens: number; cost: number }> = {};
  const byModel: Record<string, { tokens: number; cost: number }> = {};
  const daily: Record<string, { tokens: number; cost: number }> = {};
  let totalTokens = 0, totalCostUsd = 0;
  for (const e of events) {
    totalTokens += e.tokens;
    totalCostUsd += e.costUsd;
    byFeature[e.feature] = byFeature[e.feature] ?? { tokens: 0, cost: 0 };
    byFeature[e.feature].tokens += e.tokens;
    byFeature[e.feature].cost += e.costUsd;
    byModel[e.model] = byModel[e.model] ?? { tokens: 0, cost: 0 };
    byModel[e.model].tokens += e.tokens;
    byModel[e.model].cost += e.costUsd;
    const day = e.at.slice(0, 10);
    daily[day] = daily[day] ?? { tokens: 0, cost: 0 };
    daily[day].tokens += e.tokens;
    daily[day].cost += e.costUsd;
  }
  return {
    tenantId,
    windowDays,
    totalTokens,
    totalCostUsd,
    byFeature,
    byModel,
    daily: Object.entries(daily)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Seed some realistic-looking usage so dashboards aren't empty in demo mode. */
export function seedDemoUsage(tenantId: string) {
  if (usageLog.some((e) => e.tenantId === tenantId)) return;
  const features = ["lead.qualify", "ticket.classify", "campaign.draft", "faq.reply", "insights.brief"];
  const models = ["gpt-4o-mini", "gpt-4o", "claude-3-5-haiku"];
  const now = Date.now();
  for (let d = 29; d >= 0; d--) {
    const day = new Date(now - d * 86_400_000);
    const events = 8 + Math.floor(Math.random() * 25);
    for (let i = 0; i < events; i++) {
      const feature = features[Math.floor(Math.random() * features.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const tokens = 250 + Math.floor(Math.random() * 4500);
      usageLog.push({
        tenantId,
        feature,
        provider: model.startsWith("claude") ? "anthropic" : "openai",
        model,
        tokens,
        costUsd: estimateCost(model, tokens),
        at: new Date(day.getTime() + Math.random() * 86_400_000).toISOString(),
      });
    }
  }
}
