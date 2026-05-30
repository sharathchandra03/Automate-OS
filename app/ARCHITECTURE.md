# AutomateOS Architecture

## Product summary

AutomateOS is a **front-end control panel** for running multi-channel
automation services (lead capture → AI qualification → outreach → booking →
support → analytics) across **many business verticals** from one workspace.

Three layers:

1. **Frontend (Next.js)** — what the user sees & operates.
2. **Data layer (Supabase / Postgres)** — tenant-isolated CRUD + auth.
3. **Workflow layer (n8n / webhooks)** — the actual automations.

The frontend never talks to channels (WhatsApp, Gmail, Telegram, …) directly.
It only stores data and emits *intent* events. n8n owns delivery, retries,
back-pressure, and channel-specific quirks.

---

## Page-by-page UI structure

| Path | Purpose | Key actions |
|---|---|---|
| `/` | Marketing landing | Sign in / open demo |
| `/login`, `/signup` | Auth | Email + password (Supabase Auth) |
| `/onboarding` | 5-step setup wizard | Profile → channels → automations → first source → test |
| `/overview` | Daily snapshot | Stat cards, recent leads, active automations, channel mix, campaigns running |
| `/leads` | CRM list | Filter by status/temperature/search · Add lead · AI auto-score |
| `/leads/[id]` | Lead detail | Pipeline edit · WhatsApp · Re-score · Activity · Notes · AI insight |
| `/campaigns` | Broadcasts | Channel + audience + schedule · Launch / pause |
| `/follow-ups` | Drip sequences | Visual step list · trigger + delay + channel · stop-on-reply |
| `/appointments` | Bookings | Upcoming / past · Confirm · Reschedule (UI hook) |
| `/tickets` | Support inbox | Status tabs · Resolve · Priority chip |
| `/faq` | Knowledge base | CRUD · Toggle on/off · Usage counters |
| `/retargeting` | Re-engagement rules | Run sequence on rule (inactive 14d, abandoned, …) |
| `/analytics` | Charts | Weekly leads/qualified · Funnel · Score distribution · Channel mix |
| `/connect` | Integrations | Cards per provider · Connect / Edit / Disconnect with guided forms |
| `/automations` | n8n workflows | List active, pause/resume, success rate |
| `/team` | Members | Invite · Roles (owner/admin/member/viewer) |
| `/settings` | Business profile | Name · industry · timezone · brand color · hours |
| `/admin` | System status | KPIs, integration errors, audit trail |

---

## Component & folder structure

```
src/
├── app/                      Next.js App Router pages + API routes
├── components/
│   ├── ui/                   Primitives — Button, Card, Input, Modal, Tabs, …
│   ├── layout/               Sidebar, Topbar, Logo, nav-config
│   └── providers.tsx         Theme + react-query + sonner
├── lib/
│   ├── api.ts                Unified data API — Supabase or mock
│   ├── n8n.ts                triggerAutomation(action, payload, opts)
│   ├── supabase/{client,server}.ts
│   ├── types.ts              Mirror of supabase/schema.sql
│   ├── mock-data.ts          Demo seed
│   ├── config.ts             APP_NAME, HAS_SUPABASE, INDUSTRIES, …
│   └── utils.ts              cn, formatDate, formatRelative, …
└── store/tenant-store.ts     Zustand: org + profile
```

### Design tokens (Tailwind + CSS variables)

All colors are HSL CSS variables defined in `globals.css` for both `:root` and
`.dark`. Tailwind reads them via `tailwind.config.ts` so utilities like
`bg-primary`, `text-muted-foreground`, `border-border` map to the same tokens.

---

## Data model

(See `supabase/schema.sql` for the full DDL.)

| Table | Tenant scope | Notes |
|---|---|---|
| `organizations` | self (by `id`) | tenant root |
| `profiles` | `organization_id` | linked to `auth.users` |
| `leads` | `organization_id` | indexed by (org, created_at), (org, status), (org, temperature) |
| `appointments` | `organization_id` | indexed by (org, starts_at) |
| `tickets` | `organization_id` | indexed by (org, status) |
| `campaigns` | `organization_id` | jsonb `audience_filter` |
| `follow_ups` | `organization_id` | jsonb `steps` |
| `faq_items` | `organization_id` | |
| `templates` | `organization_id` | |
| `integrations` | `organization_id` | jsonb `config` |
| `automations` | `organization_id` | webhook_url + status |
| `automation_runs` | `organization_id` | run-by-run history |
| `analytics_events` | `organization_id` | flexible event log |
| `audit_events` | `organization_id` | actor / action / target |

### RLS

`policies.sql` enables and **forces** RLS on every tenant-scoped table with a
single policy that compares `organization_id = current_tenant_id()`.

`current_tenant_id()` resolves from either:
- the JWT claim `organization_id` (set during signup/login), or
- a session-local variable (`set_config('app.current_tenant_id', $1, true)`) for
  background jobs / migrations.

---

## Integration strategy

The `connect` page lists 8 providers (WhatsApp, Gmail, Telegram, Google Calendar,
Google Sheets, Supabase, OpenAI, generic webhook). Each provider exposes a small
**field schema** (key + label + type + help) so the UI can render its own form.

When the user saves:

```ts
update.mutate({ id: integ.id, patch: { status: "connected", config: {…}, last_synced_at: now } })
```

In production, the actual OAuth flows redirect to the provider; in demo mode we
just persist the config and flip the badge to **connected**.

n8n then reads the org's `integrations` row at runtime to authenticate
provider calls (token rotation, refresh, etc. is n8n's responsibility).

---

## Automation contract

```ts
type AutomationAction =
  | "lead.qualify" | "lead.assign" | "followup.send"
  | "campaign.launch" | "appointment.book" | "appointment.remind"
  | "ticket.create" | "ticket.escalate" | "faq.reply"
  | "retargeting.run" | "digest.daily";

triggerAutomation(action, payload, { tenantId, idempotencyKey })
  → { ok, mocked, duration_ms, response, error }
```

The webhook receives:

```json
{
  "action": "lead.qualify",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "payload": { "lead_id": "lead_…", "name": "…", "source": "Website Form" }
}
```

…with headers:

```
content-type: application/json
x-automateos-action: lead.qualify
x-automateos-tenant: <uuid>
x-idempotency-key: <opaque>
x-automateos-secret: <shared>
```

Inbound results land at `POST /api/webhooks/n8n` (signed by the same secret).

---

## Multi-tenant defence in depth

1. **Application:** Every query goes through `lib/api.ts` which scopes by
   `organization_id` (in production, from the authenticated session).
2. **Database:** RLS forces `organization_id = current_tenant_id()` on every read & write.
3. **Indexes:** All composite indexes lead with `organization_id` so tenant
   queries always hit the index.
4. **Cross-tenant routes:** `/admin/*` aggregations would use a dedicated
   `bypass_rls` role (not exposed to tenant users) — out of scope for v1.
5. **IDs:** All tenant-scoped resources use UUIDs to prevent enumeration.

See `saas-multi-tenant` skill notes inlined throughout.

---

## Decisions log

- **Next.js App Router over Pages Router** — Server Components, layouts, intercepting routes ready when we need them.
- **Tailwind v3 over v4** — broader plugin compatibility, fewer breaking changes; v4 upgrade is a 1-day task.
- **TanStack Query for server state** — invalidations replace global refetches; pairs cleanly with Supabase.
- **No external UI library install** — primitives are hand-built (Button, Card, Modal, Tabs, …) so the app installs in one `npm install` with no shadcn/Radix indirection. Replacing them is mechanical.
- **n8n webhook abstraction** — never hardcode WhatsApp tokens or channel logic in the UI. Workflow files live in n8n; we ship JSON examples in `ROADMAP.md`.
- **Mock-data fallback** — every component renders without Supabase configured, which makes the project demoable in 30 seconds.
