# Codebase Concerns

**Analysis Date:** 2026-05-17

---

## 1. Broken Signup → Org Creation Flow

**Issue:** `profiles.organization_id` is `NOT NULL` in `supabase/schema.sql` (line 29), but `signUp()` in `src/app/(auth)/signup/page.tsx` never creates an `organizations` row or a `profiles` row at the moment of registration. Supabase Auth creates the `auth.users` record; a trigger or edge function to insert into `profiles` has never been wired up. This means immediately after email confirmation, the authenticated user has no `profiles` row, so any code path that calls `getOrgId()` — the core of every tenant-scoped query in `src/lib/api.ts` — silently falls back to `memory.org.id` (the demo org), leaking demo data to real users.

- **Files:** `src/app/(auth)/signup/page.tsx`, `supabase/schema.sql` (line 24–32), `src/lib/api.ts` (line 91–109)
- **Impact:** Real users see mock data. All writes go to the demo org ID in Supabase (or fail with FK violations). The entire multi-tenant data layer is effectively non-functional for newly signed-up users.
- **Fix approach:** Add a Supabase Database Function + `after insert on auth.users` trigger that creates the `profiles` row (using `raw_user_meta_data` populated during `signUp()`). The `organization_id` column must be made nullable (or the trigger must also create the org), or the org must be created first via the Express backend.

---

## 2. Org Creation Is Wired to an Unbuilt Express Backend

**Issue:** `src/app/onboarding/page.tsx` POSTs to `${SERVER_URL}/api/orgs` (line 92), which resolves to `http://localhost:3001/api/orgs`. There is no Express server in this repository. `src/lib/backend.ts` and `src/lib/config.ts` both reference `NEXT_PUBLIC_SERVER_URL` / `SERVER_URL`. The Express backend is described in comments as living in a `server/` folder that does not exist in this repo.

- **Files:** `src/app/onboarding/page.tsx` (lines 92–128), `src/lib/backend.ts`, `src/lib/config.ts` (line 6)
- **Impact:** In production with Supabase enabled, the onboarding flow always fails with a network error on the `POST /api/orgs` call, meaning no tenant is ever created, and no user ever reaches the dashboard via the real auth path.
- **Fix approach:** Either implement `POST /api/orgs` as a Next.js Route Handler (`src/app/api/orgs/route.ts`) using the Supabase service-role client, or build the Express server. The Next.js Route Handler approach is simpler and removes the external dependency.

---

## 3. profiles Table Has NOT NULL organization_id — Schema vs. Reality Mismatch

**Issue:** `supabase/schema.sql` declares `organization_id uuid not null references organizations(id)` on the `profiles` table. In practice the onboarding flow (which creates the org) runs *after* email confirmation. Even if a trigger creates the `profiles` row on auth user creation, the org doesn't exist yet, so the INSERT would fail the FK constraint.

- **Files:** `supabase/schema.sql` (line 29), `src/app/(dashboard)/layout.tsx` (line 38–46)
- **Impact:** The schema is structurally inconsistent with the intended two-step flow (signup → confirm email → onboarding → create org). Any attempt to create the profile row before the org exists will fail with a FK violation.
- **Fix approach:** Make `organization_id` nullable on `profiles` and treat `NULL` as "onboarding incomplete". The dashboard layout already handles this case correctly (lines 44–46, redirects to `/onboarding`), but the DB schema does not allow it. Alternatively, create a placeholder org row atomically with the profile in the trigger.

---

## 4. `current_tenant_id()` SQL Function Depends on JWT Claim That Is Never Set

**Issue:** The RLS helper `current_tenant_id()` in `supabase/schema.sql` (lines 204–209) reads `auth.jwt() ->> 'organization_id'` from the JWT. Supabase Auth JWTs do not automatically include custom claims. The `organization_id` claim is never set anywhere in the signup/login flow — it would require a custom Supabase Auth Hook (available in Supabase Pro tier) or a database function hook. Without this claim, `current_tenant_id()` always returns `NULL`, which means all RLS policies evaluate to `false`, blocking every tenant-scoped read and write for real users.

- **Files:** `supabase/schema.sql` (lines 204–209), `supabase/policies.sql`
- **Impact:** All RLS policies are silently broken in production. Every Supabase query from a real user returns empty results or permission denied errors, even for their own org's data.
- **Fix approach:** Either (a) add a Supabase Auth Hook (requires Pro plan) to embed `organization_id` in the JWT, or (b) rewrite `current_tenant_id()` to look up `organization_id` from the `profiles` table using `auth.uid()` instead of reading the JWT claim — e.g., `select organization_id from public.profiles where id = auth.uid()`. Option (b) works on the free plan.

---

## 5. Credentials Stored in Plaintext in `org_channels`

**Issue:** The `org_channels` table stores `access_token`, `bot_token`, `twilio_auth_token`, and `waba_id` as plaintext `text` columns. Schema comments acknowledge this (`-- store encrypted in production`) but no encryption is implemented. The mock data in `src/lib/mock-data.ts` (lines 539, 557) also includes what appear to be redacted but still present token patterns (`EAAxxxxxx`, `7654321:AAFxxxxxx`).

- **Files:** `supabase/schema.sql` (lines 245–266), `src/lib/mock-data.ts` (lines 535–570), `src/app/(dashboard)/settings/channels/page.tsx`
- **Impact:** Any Supabase RLS bypass, misconfigured policy, or internal team member can read WhatsApp Business tokens, Twilio auth tokens, and Telegram bot tokens for all tenants.
- **Fix approach:** Use `pgp_sym_encrypt` / `pgp_sym_decrypt` via Supabase's `pgcrypto` extension (already enabled in schema), or store tokens in a dedicated secrets manager (e.g., Supabase Vault) and only store a reference ID in the table. Client-side: never return raw token values in SELECT — use masked views.

---

## 6. `upsertOrgChannel` and `deleteOrgChannel` — Supabase Path Is Missing

**Issue:** `src/lib/api.ts` functions `upsertOrgChannel` (line 1138) and `deleteOrgChannel` (line 1165) only operate on `memory.orgChannels`. Neither function has a Supabase implementation branch. They were not wired to the database when the real-DB paths were added to other functions.

- **Files:** `src/lib/api.ts` (lines 1138–1169)
- **Impact:** Channel credentials saved via the Settings → Channels page are never persisted to Supabase. On page reload with Supabase enabled, the settings disappear. Channel connection state is lost between sessions.
- **Fix approach:** Add `HAS_SUPABASE` branches to both functions mirroring the pattern used by `createContact` / `deleteContact` — insert/update/delete on the `org_channels` table with `organization_id` scoping.

---

## 7. `getAnalytics()` Always Returns Mock Data

**Issue:** `src/lib/api.ts` line 284–286: `getAnalytics()` unconditionally returns `delay(memory.analytics)` with no Supabase path. The overview dashboard (`src/app/(dashboard)/overview/page.tsx`) also embeds hardcoded mock constants (`MESSAGING_MOCK`, `CHATBOT_MOCK`) rather than reading from the DB.

- **Files:** `src/lib/api.ts` (lines 284–286), `src/app/(dashboard)/overview/page.tsx` (lines 20–50)
- **Impact:** Analytics on the overview page are always fake numbers, even when connected to a live Supabase database with real tenant data.
- **Fix approach:** Implement `getAnalytics()` by aggregating from `analytics_events`, `leads`, `conversations`, and `messages` tables, or by calling `backend.analytics.summary()` from `src/lib/backend.ts`. The backend client is already wired for this.

---

## 8. `exportLabelContacts` and `importContactsFromCSV` Are Mock-Only

**Issue:** `exportLabelContacts` (line 1113) always reads from `memory.contacts` with a comment `// In production: filter contacts by label_id FK`. There is no `contact_label_id` FK column on `contacts` in the schema, so even the real implementation path is undefined. `importContactsFromCSV` (line 1028) has no `HAS_SUPABASE` branch at all — it always uses the in-memory store.

- **Files:** `src/lib/api.ts` (lines 1028–1065, 1113–1118)
- **Impact:** CSV imports in production silently succeed but write nothing to the database. Label exports return wrong data or empty results.
- **Fix approach:** Add a `contact_label_assignments` join table (contact_id, label_id) to the schema, or add a `label_ids text[]` column to `contacts`. Then implement real Supabase paths for both functions.

---

## 9. n8n Webhook Receiver Is a No-Op

**Issue:** `src/app/api/webhooks/n8n/route.ts` (line 18) has a literal `// TODO: route by body.event`. It validates the secret header and acknowledges receipt but discards all payload data — no state updates, no DB writes, no event routing.

- **Files:** `src/app/api/webhooks/n8n/route.ts`
- **Impact:** Any n8n workflow that calls back with results (e.g., lead scored, campaign delivered, follow-up sent) gets a 200 OK but the result is silently dropped. Lead scores from n8n are never applied to the leads table. Automation run statuses are never updated.
- **Fix approach:** Implement a dispatch table on `body.event`: at minimum handle `lead.scored` (update `leads.score` + `leads.temperature`), `automation.completed` (update `automation_runs`), and `campaign.delivered` (update `campaigns.delivered_count`).

---

## 10. `api/trigger/[action]` Route Has No Auth Guard

**Issue:** `src/app/api/trigger/[action]/route.ts` accepts any `POST` request and triggers real n8n webhook calls. It reads `x-automateos-tenant` from request headers for tenant scoping but does not verify any session token or API key. Any unauthenticated caller can trigger automation actions (e.g., `campaign.launch`) against arbitrary tenant IDs.

- **Files:** `src/app/api/trigger/[action]/route.ts`
- **Impact:** Unauthenticated actors can fire automations, consume n8n workflow runs, and cause unintended outbound messages/emails if n8n webhooks are configured.
- **Fix approach:** Add Bearer token verification (Supabase JWT or a stored API key from `src/lib/api-keys.ts`) before allowing the action to execute.

---

## 11. `api/webhooks/leads/[token]` Has No Real Token-to-Tenant Mapping

**Issue:** `src/app/api/webhooks/leads/[token]/route.ts` accepts any token with length >= 8 (line 14) and creates leads. The comment on line 9 says `"In production via supabase lookup"` but the lookup is never implemented. Every inbound lead goes to the demo org in memory or whichever org `getOrgId` resolves — there is no token-to-org lookup table or logic.

- **Files:** `src/app/api/webhooks/leads/[token]/route.ts`
- **Impact:** All external lead webhooks (from website forms, ad platforms, etc.) create leads in the wrong org or in mock memory. Tenants cannot use the webhook URL shown on the onboarding page to receive real leads.
- **Fix approach:** Create a `webhook_tokens` table (`token text unique, organization_id uuid`) and look up the org by token before calling `createLead`. Generate and store a per-org token during org creation.

---

## 12. Dashboard Layout Auth Guard Uses `getSession()` Instead of `getUser()`

**Issue:** `src/app/(dashboard)/layout.tsx` (line 31) calls `supabase.auth.getSession()` to check authentication. The Supabase docs and the middleware itself (which correctly uses `getUser()`) note that `getSession()` reads from local storage/cookies without validating the JWT against the server. A tampered or expired JWT can pass `getSession()` as valid but would be rejected by `getUser()`.

- **Files:** `src/app/(dashboard)/layout.tsx` (line 31)
- **Impact:** A client with a forged or expired session cookie can bypass the client-side dashboard guard. The middleware (`src/middleware.ts` line 101) still runs `getUser()` and provides server-level protection, but the client-side component renders briefly before the middleware redirect completes, potentially exposing UI state.
- **Fix approach:** Replace `supabase.auth.getSession()` with `supabase.auth.getUser()` in the dashboard layout guard to match the middleware pattern.

---

## 13. `connect/page.tsx` Still Uses `x-organization-id` Header

**Issue:** `src/app/(dashboard)/connect/page.tsx` (line 412) calls the Express backend WhatsApp status endpoint with `headers: { "x-organization-id": organizationId }` — a legacy header pattern that predates the Supabase JWT migration. `src/lib/backend.ts` now correctly uses `Authorization: Bearer <jwt>` for all calls. The connect page was not updated.

- **Files:** `src/app/(dashboard)/connect/page.tsx` (line 412)
- **Impact:** WhatsApp connection status checks fail when the Express backend validates by JWT. The WhatsApp connect card shows incorrect connection state.
- **Fix approach:** Replace the manual `fetch()` call with `backend.whatsapp.status()` from `src/lib/backend.ts`.

---

## 14. Credit Deduction Is Not Atomic (TOCTOU Race Condition)

**Issue:** `deductCredits()` in `src/lib/api.ts` (lines 1315–1437) executes as two separate Supabase calls: a `SELECT` to read the current balance, then an `UPDATE` to set the new balance. Under concurrent requests (multiple messages sent simultaneously), two requests can both read the same balance, both pass the `balance < amount` check, and both deduct, resulting in a negative balance despite the `check (conversation_credits >= 0)` DB constraint — which will then cause one of the UPDATEs to fail, possibly crashing a message send mid-flight.

- **Files:** `src/lib/api.ts` (lines 1378–1436)
- **Impact:** Under concurrent load, credit accounting can go negative or throw errors during legitimate message sending. The DB constraint will prevent actual negative storage but will surface as unhandled errors to users.
- **Fix approach:** Replace the read-then-update pattern with a single atomic `UPDATE ... SET conversation_credits = conversation_credits - $1 WHERE conversation_credits >= $1 RETURNING *` using a Supabase RPC (PostgreSQL function). This makes the decrement atomic and eliminates the race.

---

## 15. No Tests Exist Anywhere

**Issue:** There are zero test files in the repository — no Jest config (`jest.config.*`), no Vitest config (`vitest.config.*`), no `*.test.*` or `*.spec.*` files anywhere. The `package.json` test script is either absent or a placeholder.

- **Files:** Entire `src/` tree
- **Impact:** No regression protection on the auth flow, RLS policy helpers, credit deduction logic, or API functions. The mock/real data split in `api.ts` is particularly fragile without tests — a future change to the `HAS_SUPABASE` branching could silently break real-data paths while mock paths continue to pass manual testing.
- **Priority:** High. The credit deduction race condition, the org creation flow, and the RLS helper are the highest-risk areas to add tests first.
- **Fix approach:** Add Vitest (compatible with Next.js 14 App Router). Start with unit tests for `src/lib/api.ts` mock branches, `src/middleware.ts` path matching logic, and `src/lib/n8n.ts` mock response generation. Add integration tests for the auth callback route using `@supabase/supabase-js` test helpers.

---

## 16. Anthropic, Gemini, and Local AI Providers Are Stubbed

**Issue:** `src/lib/ai/provider.ts` (line 134–137) maps `anthropic`, `gemini`, and `local` provider IDs to `mockProvider`. Any code that explicitly requests `opts.provider = "anthropic"` or `"gemini"` silently receives mock responses with no error or log warning.

- **Files:** `src/lib/ai/provider.ts` (lines 132–138)
- **Impact:** Multi-provider AI routing is not functional. If the Connect Center allows users to configure an Anthropic API key and select Anthropic as their AI provider, they will silently receive mock responses.
- **Fix approach:** Implement real `anthropicProvider` and `geminiProvider` objects, or throw a `NotImplementedError` when these provider IDs are selected so the failure is visible.

---

## 17. Notification System and API Keys Are Fully In-Memory (No Supabase Persistence)

**Issue:** `src/lib/notifications.ts` stores all notifications in a module-level array (`const notifications: Notification[] = []`). `src/lib/api-keys.ts` (implied by `src/app/(dashboard)/api-keys/page.tsx`) uses a similar in-memory pattern. Both are reset on every server restart / serverless function cold start.

- **Files:** `src/lib/notifications.ts`, `src/app/(dashboard)/api-keys/page.tsx` (uses `org_demo` hardcoded tenant), `src/app/(dashboard)/webhooks/page.tsx` (uses `org_demo` hardcoded tenant)
- **Impact:** Notifications disappear on deploy. API keys are regenerated on cold start, breaking any integrations using them. The webhook log page hardcodes `const TENANT = "org_demo"` making it non-functional for real tenants.
- **Fix approach:** Add `notifications`, `api_keys`, and `webhook_logs` tables to `supabase/schema.sql` and implement Supabase-backed persistence. Until then, mark these pages clearly as demo-only.

---

## 18. Billing Page Is Entirely Disconnected from Real Data

**Issue:** `src/app/(dashboard)/billing/page.tsx` (lines 14–23) seeds demo metering data on every render with `seedDemoMetering("org_demo")` and `seedDemoUsage("org_demo")`. The tenant ID is hardcoded to `"org_demo"`. No plan state is persisted to Supabase — `currentPlan` is local React state initialized to `"pro"`. Clicking "Upgrade" shows a toast but does not integrate with any payment provider.

- **Files:** `src/app/(dashboard)/billing/page.tsx`
- **Impact:** Billing page shows demo numbers for all tenants. Plan limits are not enforced anywhere. No payment processing is connected.
- **Fix approach:** Add a `subscriptions` table (or `plan` column to `organizations`). Integrate Stripe or Razorpay for actual payment. Wire `getOrganization()` to populate the plan state.

---

## 19. Settings Branding / Advanced Tabs Are Placeholder UI

**Issue:** `src/app/(dashboard)/settings/page.tsx` (line 86) contains a hardcoded string: `"Upload a logo, customize the booking page theme, set tone-of-voice for AI replies, and configure email signatures. (Coming soon - placeholder for v1.)"`. The tab content is a static paragraph.

- **Files:** `src/app/(dashboard)/settings/page.tsx`
- **Impact:** Users can save general settings (org name, industry, timezone) but all other settings tabs are non-functional placeholders.
- **Fix approach:** Implement logo upload (Supabase Storage), brand color picker (update `organizations.brand_color`), and AI tone field (add `ai_tone text` column to `organizations`).

---

## 20. `src/app/api/comms/send/route.ts` Has No Auth Guard

**Issue:** `src/app/api/comms/send/route.ts` accepts any unauthenticated `POST` request to send WhatsApp/SMS/Telegram messages and deduct credits. There is no session check, API key validation, or CSRF protection on this route.

- **Files:** `src/app/api/comms/send/route.ts`
- **Impact:** Unauthenticated actors can send messages using any org's channel credentials (if they know a valid conversationId), depleting credits and spamming recipients.
- **Fix approach:** Add Supabase JWT verification at the start of the handler using `createSupabaseServerClient()` and `supabase.auth.getUser()`. Reject requests without a valid session.

---

*Concerns audit: 2026-05-17*
