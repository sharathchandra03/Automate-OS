/**
 * Webhook log + replay store.
 *
 * Captures every inbound and outbound webhook for inspection, debugging, and replay.
 */

export type WebhookDirection = "inbound" | "outbound";
export type WebhookStatus = "pending" | "delivered" | "failed" | "retrying";

export interface WebhookLogEntry {
  id: string;
  tenantId: string;
  direction: WebhookDirection;
  url?: string;       // outbound destination, or our public path for inbound
  source?: string;    // e.g. "n8n", "stripe", "lead-capture"
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers: Record<string, string>;
  body: string;
  status: WebhookStatus;
  responseStatus?: number;
  responseBody?: string;
  durationMs?: number;
  attempts: number;
  at: string;
  error?: string;
}

const logs: WebhookLogEntry[] = [];

export function logWebhook(entry: Omit<WebhookLogEntry, "id" | "at" | "attempts" | "status"> & Partial<Pick<WebhookLogEntry, "status" | "attempts">>): WebhookLogEntry {
  const log: WebhookLogEntry = {
    id: `wh_${Math.random().toString(36).slice(2, 12)}`,
    at: new Date().toISOString(),
    attempts: entry.attempts ?? 1,
    status: entry.status ?? "delivered",
    ...entry,
  };
  logs.unshift(log);
  if (logs.length > 2000) logs.pop();
  return log;
}

export function listWebhookLogs(tenantId: string, opts: { direction?: WebhookDirection; status?: WebhookStatus; limit?: number } = {}): WebhookLogEntry[] {
  return logs
    .filter((l) =>
      l.tenantId === tenantId &&
      (!opts.direction || l.direction === opts.direction) &&
      (!opts.status || l.status === opts.status),
    )
    .slice(0, opts.limit ?? 100);
}

export function getWebhookLog(id: string): WebhookLogEntry | undefined {
  return logs.find((l) => l.id === id);
}

export function seedDemoWebhookLogs(tenantId: string) {
  if (logs.some((l) => l.tenantId === tenantId)) return;
  const samples: Array<Omit<WebhookLogEntry, "id" | "at">> = [
    { tenantId, direction: "inbound",  source: "lead-capture", method: "POST", url: "/api/webhooks/leads/abc",  headers: { "x-source": "fb-ad" }, body: '{"name":"Priya R","phone":"+91…"}', status: "delivered", responseStatus: 200, durationMs: 47, attempts: 1 },
    { tenantId, direction: "outbound", source: "n8n",         method: "POST", url: "https://n8n…/webhook/lead.qualify", headers: {}, body: '{"action":"lead.qualify"}', status: "delivered", responseStatus: 200, durationMs: 132, attempts: 1 },
    { tenantId, direction: "outbound", source: "n8n",         method: "POST", url: "https://n8n…/webhook/campaign.launch", headers: {}, body: '{"campaign_id":"cmp_…"}', status: "failed", responseStatus: 500, durationMs: 4200, attempts: 3, error: "Upstream 500" },
    { tenantId, direction: "inbound",  source: "stripe",      method: "POST", url: "/api/webhooks/stripe", headers: { "stripe-signature": "t=…" }, body: '{"type":"invoice.paid"}', status: "delivered", responseStatus: 200, durationMs: 28, attempts: 1 },
    { tenantId, direction: "inbound",  source: "n8n",         method: "POST", url: "/api/webhooks/n8n", headers: {}, body: '{"action":"lead.qualify","status":"ok"}', status: "delivered", responseStatus: 200, durationMs: 12, attempts: 1 },
  ];
  // spread across last 24h
  samples.forEach((s, i) => logs.push({ ...s, id: `wh_seed_${i}`, at: new Date(Date.now() - i * 3_600_000).toISOString() }));
}
