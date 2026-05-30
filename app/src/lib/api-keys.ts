/**
 * Tenant-scoped API key management.
 *
 * In production: hash secrets with bcrypt, store only the hash, surface the
 * cleartext exactly once at creation.
 * In demo: keep the cleartext in memory so the UI can display it.
 */

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  prefix: string;       // visible: aos_live_ABCD...
  secret?: string;      // cleartext (demo-only)
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
  revokedAt?: string;
}

const keys: ApiKey[] = [];

const SCOPES = [
  "leads:read", "leads:write",
  "campaigns:read", "campaigns:write",
  "appointments:read", "appointments:write",
  "tickets:read", "tickets:write",
  "automations:trigger",
  "webhooks:manage",
];

export function listScopes(): string[] {
  return [...SCOPES];
}

function rand(prefix: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = prefix;
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function createKey(tenantId: string, name: string, scopes: string[], createdBy: string): ApiKey {
  const secret = rand("aos_live_");
  const key: ApiKey = {
    id: `key_${Math.random().toString(36).slice(2, 10)}`,
    tenantId,
    name,
    prefix: secret.slice(0, 14) + "…",
    secret,
    scopes,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  keys.unshift(key);
  return key;
}

export function listKeys(tenantId: string): ApiKey[] {
  return keys.filter((k) => k.tenantId === tenantId);
}

export function revoke(id: string) {
  const k = keys.find((x) => x.id === id);
  if (k) k.revokedAt = new Date().toISOString();
}

export function seedDemoKeys(tenantId: string, createdBy: string) {
  if (keys.some((k) => k.tenantId === tenantId)) return;
  createKey(tenantId, "Production",  ["leads:read", "leads:write", "automations:trigger"], createdBy);
  createKey(tenantId, "Zapier",      ["leads:write", "appointments:write"], createdBy);
  createKey(tenantId, "Mobile app",  ["leads:read", "campaigns:read", "appointments:read"], createdBy);
}
