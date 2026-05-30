/**
 * Token-bucket rate limiter.
 *
 * Use per-tenant + per-IP for inbound APIs.
 * Production: back this with Upstash Redis. The interface stays the same.
 */

interface Bucket { tokens: number; lastRefill: number; }

const buckets = new Map<string, Bucket>();

export interface LimitConfig {
  /** Tokens per window. */
  capacity: number;
  /** Window duration in ms. */
  windowMs: number;
}

const DEFAULTS: Record<string, LimitConfig> = {
  api_default:    { capacity: 60,   windowMs: 60_000 },     // 60/min
  webhook_inbound:{ capacity: 600,  windowMs: 60_000 },     // 600/min
  ai_call:        { capacity: 30,   windowMs: 60_000 },     // 30 AI calls/min
  signup:         { capacity: 5,    windowMs: 60_000 },     // 5/min from one IP
};

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkLimit(key: string, kind: keyof typeof DEFAULTS = "api_default", override?: LimitConfig): LimitResult {
  const cfg = override ?? DEFAULTS[kind];
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: cfg.capacity, lastRefill: now };
  // Refill proportional to elapsed time
  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / cfg.windowMs) * cfg.capacity;
  bucket.tokens = Math.min(cfg.capacity, bucket.tokens + refill);
  bucket.lastRefill = now;
  if (bucket.tokens < 1) {
    const retryAfterMs = Math.ceil(((1 - bucket.tokens) / cfg.capacity) * cfg.windowMs);
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterMs };
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
}

export function tenantKey(tenantId: string, route: string): string {
  return `tenant:${tenantId}:${route}`;
}

export function ipKey(ip: string, route: string): string {
  return `ip:${ip}:${route}`;
}
