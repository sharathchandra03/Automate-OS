# Week 2 Plan — Security + Tests + API Keys

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **BEFORE STARTING:** Read `docs/internal-logic.md`. This week implements **Section 4 (Analytics Event Tracking)** — create `src/lib/analytics.ts` and `analytics_events` table as Task 0 before any other task.

**Goal:** Encrypt channel credentials at rest, stand up Vitest with meaningful coverage on the riskiest code paths, and persist API keys + webhook logs to Supabase.

**Architecture:** pgcrypto `pgp_sym_encrypt/decrypt` wraps credentials before storage. Vitest runs in-process against the real api.ts mock branches and middleware path-matching logic. API keys live in a new `api_keys` table; webhook events land in `webhook_events`.

**Tech Stack:** Next.js 14 App Router, Supabase, Vitest, pgcrypto (already enabled in schema)

**Branch:** `week2/security-tests-apikeys`

---

## Task 1: Encrypt Channel Credentials in schema + api.ts

**Files:**
- Modify: `supabase/schema.sql` — add encrypt/decrypt helpers
- Modify: `src/lib/api.ts` — wrap access_token, bot_token, twilio_auth_token on upsert/read

### Steps

- [ ] **1.1 Add SQL encrypt/decrypt helpers to schema.sql**

Append after the `deduct_credits` function:

```sql
-- ============== Credential helpers ==============

create or replace function encrypt_credential(plaintext text) returns text as $$
  select pgp_sym_encrypt(plaintext, current_setting('app.credential_key'))::text;
$$ language sql security definer;

create or replace function decrypt_credential(ciphertext text) returns text as $$
  select pgp_sym_decrypt(ciphertext::bytea, current_setting('app.credential_key'));
$$ language sql security definer;
```

Run in Supabase SQL editor. Set `app.credential_key` in your Supabase project settings → Vault or via `ALTER DATABASE ... SET app.credential_key = '...'`.

- [ ] **1.2 Add CREDENTIAL_KEY env var**

In `.env.example` add:
```
CREDENTIAL_KEY=change-me-32-chars-min
```

In `src/lib/config.ts` export:
```ts
export const CREDENTIAL_KEY = process.env.CREDENTIAL_KEY ?? "";
```

- [ ] **1.3 Wrap credentials in upsertOrgChannel**

In `src/lib/api.ts`, inside the `upsertOrgChannel` Supabase branch, replace the `record` object's sensitive fields:

```ts
// Before inserting, encrypt sensitive fields via RPC
const encrypt = async (val: string | null) => {
  if (!val) return null;
  const { data } = await supabase.rpc("encrypt_credential", { plaintext: val });
  return data as string | null;
};

const record = {
  organization_id: orgId,
  provider: input.provider,
  label: input.label,
  phone_number: input.phone_number ?? null,
  waba_id: input.waba_id ?? null,
  phone_number_id: input.phone_number_id ?? null,
  access_token: await encrypt(input.access_token ?? null),
  bot_token: await encrypt(input.bot_token ?? null),
  twilio_account_sid: input.twilio_account_sid ?? null,
  twilio_auth_token: await encrypt(input.twilio_auth_token ?? null),
  twilio_from_number: input.twilio_from_number ?? null,
  status: "active" as const,
  connected_at: nowIso(),
};
```

- [ ] **1.4 Decrypt credentials in getOrgChannels**

After the Supabase query in `getOrgChannels`, add a decrypt pass:

```ts
const decrypt = async (val: string | null) => {
  if (!val) return null;
  try {
    const { data } = await supabase.rpc("decrypt_credential", { ciphertext: val });
    return data as string | null;
  } catch { return val; } // plaintext fallback for rows inserted before encryption
};

const decrypted = await Promise.all((data as OrgChannel[]).map(async (ch) => ({
  ...ch,
  access_token: await decrypt(ch.access_token),
  bot_token: await decrypt(ch.bot_token),
  twilio_auth_token: await decrypt(ch.twilio_auth_token),
})));
return decrypted;
```

- [ ] **1.5 Commit**
```
git add supabase/schema.sql src/lib/api.ts src/lib/config.ts .env.example
git commit -m "feat: encrypt channel credentials at rest with pgcrypto"
```

---

## Task 2: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`
- Modify: `package.json` — add test script

### Steps

- [ ] **2.1 Install Vitest**
```
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **2.2 Create vitest.config.ts**
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["src/__tests__/setup.ts"],
    globals: true,
    coverage: { reporter: ["text", "html"], include: ["src/lib/**", "src/app/api/**"] },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **2.3 Create src/__tests__/setup.ts**
```ts
import "@testing-library/jest-dom";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/headers", () => ({ cookies: () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }) }));
```

- [ ] **2.4 Add test script to package.json**

In `package.json` scripts section add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **2.5 Verify setup runs**
```
npm test
```
Expected: "No test files found" (zero failures, clean exit).

- [ ] **2.6 Commit**
```
git add vitest.config.ts src/__tests__/setup.ts package.json package-lock.json
git commit -m "chore: add Vitest test infrastructure"
```

---

## Task 3: Tests — Middleware Path Matching

**Files:**
- Create: `src/__tests__/middleware.test.ts`

### Steps

- [ ] **3.1 Write failing tests**

```ts
// src/__tests__/middleware.test.ts
import { describe, it, expect } from "vitest";

// Extract the path-matching logic from middleware.ts into a pure helper
// so it can be tested without Next.js runtime
function isProtectedPath(pathname: string): boolean {
  const PUBLIC = ["/", "/login", "/signup", "/auth/callback", "/onboarding"];
  if (PUBLIC.includes(pathname)) return false;
  if (pathname.startsWith("/api/webhooks/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  return pathname.startsWith("/");
}

describe("middleware path matching", () => {
  it("allows public routes through", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/signup")).toBe(false);
    expect(isProtectedPath("/auth/callback")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });

  it("allows webhook routes without auth", () => {
    expect(isProtectedPath("/api/webhooks/leads/abc123")).toBe(false);
    expect(isProtectedPath("/api/webhooks/n8n")).toBe(false);
  });

  it("protects dashboard routes", () => {
    expect(isProtectedPath("/overview")).toBe(true);
    expect(isProtectedPath("/leads")).toBe(true);
    expect(isProtectedPath("/inbox")).toBe(true);
    expect(isProtectedPath("/settings/channels")).toBe(true);
  });

  it("protects API routes that are not webhooks", () => {
    expect(isProtectedPath("/api/comms/send")).toBe(true);
    expect(isProtectedPath("/api/trigger/lead.qualify")).toBe(true);
  });
});
```

- [ ] **3.2 Run test — verify it passes**
```
npm test src/__tests__/middleware.test.ts
```
Expected: 4 tests PASS

- [ ] **3.3 Export the helper from middleware.ts**

In `src/middleware.ts`, extract the path check into an exported function:
```ts
export function isProtectedPath(pathname: string): boolean {
  const PUBLIC = ["/", "/login", "/signup", "/auth/callback", "/onboarding"];
  if (PUBLIC.includes(pathname)) return false;
  if (pathname.startsWith("/api/webhooks/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  return pathname.startsWith("/");
}
```

Update the test import to use the real function:
```ts
import { isProtectedPath } from "@/middleware";
```

- [ ] **3.4 Run test again to confirm**
```
npm test src/__tests__/middleware.test.ts
```
Expected: 4 tests PASS

- [ ] **3.5 Commit**
```
git add src/__tests__/middleware.test.ts src/middleware.ts
git commit -m "test: middleware path-matching logic"
```

---

## Task 4: Tests — deductCredits RPC (mock branch)

**Files:**
- Create: `src/__tests__/api-credits.test.ts`

### Steps

- [ ] **4.1 Write failing tests for mock branch**

```ts
// src/__tests__/api-credits.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Force demo mode so no Supabase needed
vi.mock("@/lib/config", () => ({ HAS_SUPABASE: false }));

// Reset module between tests so memory state is fresh
beforeEach(() => { vi.resetModules(); });

describe("deductCredits (mock branch)", () => {
  it("returns ok:true and reduces balance when credits are sufficient", async () => {
    const { deductCredits, getWallet } = await import("@/lib/api");
    const before = await getWallet();
    const convBefore = before.conversation_credits;

    const result = await deductCredits("conversation", 1, "test msg");
    expect(result.ok).toBe(true);
    expect(result.wallet.conversation_credits).toBe(convBefore - 1);
  });

  it("returns ok:false when balance is zero", async () => {
    const { deductCredits } = await import("@/lib/api");
    // drain all credits
    for (let i = 0; i < 500; i++) {
      await deductCredits("conversation", 1, "drain");
    }
    const result = await deductCredits("conversation", 1, "over limit");
    expect(result.ok).toBe(false);
  });

  it("negative amount (refund) increases balance", async () => {
    const { deductCredits, getWallet } = await import("@/lib/api");
    const before = await getWallet();
    await deductCredits("conversation", -5, "refund");
    const after = await getWallet();
    expect(after.conversation_credits).toBe(before.conversation_credits + 5);
  });
});
```

- [ ] **4.2 Run tests**
```
npm test src/__tests__/api-credits.test.ts
```
Expected: 3 tests PASS

- [ ] **4.3 Commit**
```
git add src/__tests__/api-credits.test.ts
git commit -m "test: deductCredits mock-branch credit logic"
```

---

## Task 5: Tests — getOrgId fallback behaviour

**Files:**
- Create: `src/__tests__/api-org.test.ts`

### Steps

- [ ] **5.1 Write tests**

```ts
// src/__tests__/api-org.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/config", () => ({ HAS_SUPABASE: false }));

describe("getAnalytics (mock branch, no Supabase)", () => {
  it("returns a valid AnalyticsSummary shape", async () => {
    const { getAnalytics } = await import("@/lib/api");
    const result = await getAnalytics();
    expect(typeof result.leads_total).toBe("number");
    expect(typeof result.conversion_rate).toBe("number");
    expect(Array.isArray(result.weekly_leads)).toBe(true);
    expect(Array.isArray(result.funnel)).toBe(true);
  });
});

describe("importContactsFromCSV (mock branch)", () => {
  it("skips rows missing phone or name", async () => {
    const { importContactsFromCSV } = await import("@/lib/api");
    const result = await importContactsFromCSV([
      { name: "", phone: "+919876543210" },
      { name: "Alice", phone: "" },
      { name: "Bob", phone: "+911234567890" },
    ]);
    expect(result.errors).toBe(2);
    expect(result.imported).toBe(1);
    expect(result.status).toBe("done");
  });
});
```

- [ ] **5.2 Run tests**
```
npm test src/__tests__/api-org.test.ts
```
Expected: 2 tests PASS

- [ ] **5.3 Commit**
```
git add src/__tests__/api-org.test.ts
git commit -m "test: getAnalytics and importContactsFromCSV mock branches"
```

---

## Task 6: API Keys Persistence

**Files:**
- Modify: `supabase/schema.sql` — add `api_keys` table
- Create: `src/app/api/api-keys/route.ts` — CRUD endpoints
- Modify: `src/app/(dashboard)/api-keys/page.tsx` — connect to real API

### Steps

- [ ] **6.1 Add api_keys table to schema.sql**

```sql
-- ============== API Keys ==============

create table if not exists api_keys (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key_hash text not null unique,          -- sha256 of the raw key
  key_prefix text not null,               -- first 8 chars for display
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_api_keys_org on api_keys(organization_id);
create index if not exists idx_api_keys_hash on api_keys(key_hash);
```

Run in Supabase SQL editor.

- [ ] **6.2 Create src/app/api/api-keys/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ keys: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ keys: [] });

  const svc = serviceClient();
  const { data } = await svc
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, expires_at, created_at, revoked_at")
    .eq("organization_id", profile.organization_id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "API Key");
  const rawKey = `aos_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);

  const svc = serviceClient();
  const { data, error } = await svc
    .from("api_keys")
    .insert([{ organization_id: profile.organization_id, name, key_hash: keyHash, key_prefix: keyPrefix, created_by: user.id }])
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ key: rawKey, meta: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();

  const svc = serviceClient();
  await svc.from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", profile?.organization_id ?? "");

  return NextResponse.json({ ok: true });
}
```

- [ ] **6.3 Update api-keys/page.tsx to fetch from real API**

Replace the hardcoded tenant in `src/app/(dashboard)/api-keys/page.tsx` top-level data fetch:

```ts
// Remove: const TENANT = "org_demo" pattern
// Replace the useEffect that seeds demo keys with:
useEffect(() => {
  fetch("/api/api-keys")
    .then((r) => r.json())
    .then((d) => setKeys(d.keys ?? []));
}, []);

// Replace create handler:
async function handleCreate(name: string) {
  const res = await fetch("/api/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const d = await res.json();
  if (d.key) {
    setNewKey(d.key); // show once
    setKeys((prev) => [d.meta, ...prev]);
  }
}

// Replace delete handler:
async function handleRevoke(id: string) {
  await fetch("/api/api-keys", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  setKeys((prev) => prev.filter((k) => k.id !== id));
}
```

- [ ] **6.4 Manual smoke test**
1. `npm run dev`, log in, go to `/api-keys`
2. Create a key — verify it appears in Supabase `api_keys` table
3. Revoke — verify `revoked_at` is set, key disappears from UI

- [ ] **6.5 Commit**
```
git add supabase/schema.sql src/app/api/api-keys/route.ts src/app/(dashboard)/api-keys/page.tsx
git commit -m "feat: persist API keys to Supabase with create/revoke endpoints"
```

---

## Task 7: Webhook Events Log Persistence

**Files:**
- Modify: `supabase/schema.sql` — add `webhook_events` table
- Modify: `src/app/api/webhooks/n8n/route.ts` — log every inbound event
- Modify: `src/app/(dashboard)/webhooks/page.tsx` — fetch from Supabase

### Steps

- [ ] **7.1 Add webhook_events table**

Append to `supabase/schema.sql`:
```sql
-- ============== Webhook events log ==============

create table if not exists webhook_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  source text not null,          -- 'n8n', 'whatsapp', 'stripe', etc.
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processed','failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_webhook_events_org_created on webhook_events(organization_id, created_at desc);
```

- [ ] **7.2 Log events in n8n webhook route**

In `src/app/api/webhooks/n8n/route.ts`, after the switch block and before the final return:

```ts
if (supabase) {
  // Resolve org_id from x-automateos-tenant header if present
  const tenantHeader = req.headers.get("x-automateos-tenant");
  await supabase.from("webhook_events").insert([{
    organization_id: tenantHeader ?? null,
    source: "n8n",
    event: event || "unknown",
    payload: body,
    status: "processed",
  }]);
}
```

- [ ] **7.3 Update webhooks/page.tsx to query Supabase**

Replace the hardcoded `const TENANT = "org_demo"` section with:
```ts
useEffect(() => {
  fetch("/api/webhook-events")
    .then((r) => r.json())
    .then((d) => setEvents(d.events ?? []));
}, []);
```

Create `src/app/api/webhook-events/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ events: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();

  const { data } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ events: data ?? [] });
}
```

- [ ] **7.4 Commit**
```
git add supabase/schema.sql src/app/api/webhooks/n8n/route.ts src/app/api/webhook-events/route.ts src/app/(dashboard)/webhooks/page.tsx
git commit -m "feat: persist webhook events log to Supabase"
```

---

## Task 8: Overview Dashboard — Real Data

**Files:**
- Modify: `src/app/(dashboard)/overview/page.tsx` — remove MESSAGING_MOCK / CHATBOT_MOCK constants, fetch from real api functions

### Steps

- [ ] **8.1 Identify hardcoded mocks in overview/page.tsx**

Look for `MESSAGING_MOCK`, `CHATBOT_MOCK`, or `const ... = [` at the top of the file. These are the constants to replace.

- [ ] **8.2 Replace with getAnalytics() + getLeads() calls**

```ts
// At top of component:
const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
const [recentLeads, setRecentLeads] = useState<Lead[]>([]);

useEffect(() => {
  getAnalytics().then(setAnalytics);
  getLeads().then((leads) => setRecentLeads(leads.slice(0, 5)));
}, []);
```

Replace any hardcoded constant reference with `analytics?.field_name ?? 0`.

- [ ] **8.3 Add loading skeleton**

While `analytics === null`, render a loading skeleton:
```tsx
if (!analytics) return (
  <div className="space-y-4 animate-pulse">
    {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-muted" />)}
  </div>
);
```

- [ ] **8.4 Commit**
```
git add src/app/(dashboard)/overview/page.tsx
git commit -m "feat: overview dashboard reads real analytics from Supabase"
```

---

## Week 2 Done Criteria
- [ ] Channel credentials encrypted in `org_channels` table
- [ ] `npm test` passes all 9+ tests with zero failures
- [ ] API keys page creates real keys visible in Supabase, revoke works
- [ ] Webhook events log populated by n8n callbacks
- [ ] Overview dashboard shows real leads_total / leads_new_7d when Supabase is connected
