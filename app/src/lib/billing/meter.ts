/**
 * Usage meter for billing.
 *
 * Counts metered events per org per period. Flushed nightly to billing
 * provider in production. In-memory in demo.
 */

export type MeterKey = "automations_run" | "ai_tokens" | "messages_sent" | "voice_minutes" | "storage_gb";

export interface MeterEvent {
  tenantId: string;
  key: MeterKey;
  qty: number;
  at: string;
  meta?: Record<string, unknown>;
}

const events: MeterEvent[] = [];

export function record(tenantId: string, key: MeterKey, qty: number, meta?: Record<string, unknown>) {
  events.push({ tenantId, key, qty, at: new Date().toISOString(), meta });
  if (events.length > 20_000) events.shift();
}

export function totalsFor(tenantId: string, periodDays = 30): Record<MeterKey, number> {
  const since = Date.now() - periodDays * 86_400_000;
  const out: Record<MeterKey, number> = {
    automations_run: 0,
    ai_tokens: 0,
    messages_sent: 0,
    voice_minutes: 0,
    storage_gb: 0,
  };
  for (const e of events) {
    if (e.tenantId !== tenantId) continue;
    if (new Date(e.at).getTime() < since) continue;
    out[e.key] += e.qty;
  }
  return out;
}

export function pctOf(used: number, limit: number): number {
  if (!isFinite(limit) || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function seedDemoMetering(tenantId: string) {
  if (events.some((e) => e.tenantId === tenantId)) return;
  for (let d = 30; d >= 0; d--) {
    const at = new Date(Date.now() - d * 86_400_000).toISOString();
    events.push({ tenantId, key: "automations_run", qty: 200 + Math.floor(Math.random() * 800), at });
    events.push({ tenantId, key: "ai_tokens",       qty: 12_000 + Math.floor(Math.random() * 30_000), at });
    events.push({ tenantId, key: "messages_sent",   qty: 30 + Math.floor(Math.random() * 120), at });
    events.push({ tenantId, key: "storage_gb",      qty: 0.05, at });
  }
}
