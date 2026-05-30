# AutomateOS — Automation Control Center for any business

> **One platform. Many business types. One simple interface. Many automations.**

AutomateOS is a multi-tenant SaaS web app that lets a single team run automation
services (lead capture, AI qualification, WhatsApp/email/Telegram campaigns,
appointments, support tickets, FAQ bot, retargeting, analytics) for **many
different business verticals** — real estate, clinics, coaching, agencies,
ecommerce, salons, gyms, consultancies, SaaS, local businesses — from one
clean dashboard.

The **frontend is the control panel.** **n8n** (or any webhook-driven engine)
runs the automations behind the scenes. Workflows can be plugged in or swapped
without rebuilding the UI.

---

## ✨ Highlights

- **Boots with zero setup** — runs against rich mock data when no env is configured.
- **Production-ready scaffold** — Next.js 14 App Router, TypeScript strict, Tailwind, TanStack Query, RHF + Zod, Recharts.
- **Multi-tenant by design** — every domain table has `organization_id`, RLS policies provided.
- **Generic UI, swappable workflows** — every automation is triggered through a single `triggerAutomation()` abstraction.
- **Polished, premium UX** — light/dark, responsive, accessible, soft shadows, generous spacing, friendly empty states.
- **14 modules shipped:** Auth, Onboarding, Overview, Leads (+ detail), Campaigns, Follow-ups, Appointments, Tickets, FAQ Bot, Retargeting, Analytics, Connect Center, Automations, Team, Settings, Admin.

---

## 🚀 Quick start

```bash
cd app
npm install
npm run dev
# → http://localhost:3000
```

The landing page links straight into the dashboard at `/overview` —
fully populated with realistic mock data (36 leads, 4 campaigns, 12 appointments,
14 tickets, 5 FAQs, 3 follow-up flows, 6 integrations, 5 automations, 10 audit events).

### Optional: enable Supabase persistence

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

Then run the SQL files from `supabase/`:

1. `schema.sql` — creates all tables.
2. `policies.sql` — enables Row-Level Security with tenant isolation.
3. `seed.sql` — optional demo data for the first tenant.

### Optional: enable n8n automations

Set `N8N_BASE_URL`, `N8N_WEBHOOK_SECRET`, and per-action webhook URLs (see `.env.example`).
With these set, every UI action that triggers a workflow is forwarded to your n8n
instance. Without them, the app stays fully functional in **mock-execution** mode.

---

## 🧱 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | SSR + RSC + great DX |
| Language | **TypeScript 5 (strict)** | Safety, refactor confidence |
| Styling | **Tailwind CSS 3** + custom design tokens (HSL CSS variables, light + dark) | Consistent SaaS polish |
| State (server) | **TanStack Query** | Caching, mutations, invalidations |
| State (client) | **Zustand** | Tenant + UI state |
| Forms | **React Hook Form + Zod** | Type-safe validation |
| Charts | **Recharts** | Best balance of API + look |
| Icons | **Lucide** | Consistent line icons |
| Theme | **next-themes** | Light / dark / system |
| Toasts | **sonner** | Calm notifications |
| Auth + DB | **Supabase** (optional, fallback to mocks) | Postgres + RLS + Auth in one |
| Automations | **n8n** (optional, swappable) | Webhook-based workflow orchestration |

---

## 🏛 Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                       AutomateOS Frontend                       │
│  Next.js 14 · App Router · Tailwind · TanStack Query           │
│                                                                 │
│  /overview  /leads  /campaigns  /appointments  /tickets        │
│  /faq  /follow-ups  /retargeting  /analytics  /connect         │
│  /automations  /team  /settings  /admin                        │
└──────┬──────────────────────────────────────────────┬──────────┘
       │ supabase-js (RLS by organization_id)         │ triggerAutomation()
       ▼                                              ▼
┌─────────────────────┐                ┌─────────────────────────┐
│  Supabase Postgres   │                │  n8n / Make / Custom    │
│  + RLS policies      │                │  Workflows              │
│  + Auth              │                │  (lead.qualify,         │
└─────────────────────┘                │   campaign.launch,      │
                                       │   followup.send, …)     │
                                       └──────────┬──────────────┘
                                                  ▼
                              ┌────────────────────────────────────┐
                              │  WhatsApp · Gmail · Telegram ·      │
                              │  Google Calendar · OpenAI · Sheets  │
                              └────────────────────────────────────┘
```

### Key abstraction: `triggerAutomation(action, payload)`

All UI actions that need automation flow through this single function (`src/lib/n8n.ts`).
Each `action` (e.g. `lead.qualify`, `campaign.launch`, `followup.send`) maps to an
**environment-configurable** webhook URL. If the URL is missing → **mock execution**
returns realistic responses so the UI stays usable in dev.

This is what makes the app **generic across business types** — swap the n8n
workflows without rebuilding the UI.

---

## 📁 Folder structure

```
app/
├── package.json, tsconfig.json, tailwind.config.ts, next.config.mjs
├── .env.example, .gitignore
├── README.md, ARCHITECTURE.md, DEPLOYMENT.md, ROADMAP.md, TESTING.md
├── public/favicon.svg
├── supabase/
│   ├── schema.sql
│   ├── policies.sql
│   └── seed.sql
└── src/
    ├── app/
    │   ├── layout.tsx, globals.css, page.tsx (landing)
    │   ├── (auth)/{login,signup}/page.tsx
    │   ├── onboarding/page.tsx
    │   ├── (dashboard)/
    │   │   ├── layout.tsx
    │   │   ├── overview/page.tsx
    │   │   ├── leads/page.tsx + [id]/page.tsx
    │   │   ├── campaigns/page.tsx
    │   │   ├── follow-ups/page.tsx
    │   │   ├── appointments/page.tsx
    │   │   ├── tickets/page.tsx
    │   │   ├── faq/page.tsx
    │   │   ├── retargeting/page.tsx
    │   │   ├── analytics/page.tsx
    │   │   ├── connect/page.tsx
    │   │   ├── automations/page.tsx
    │   │   ├── team/page.tsx
    │   │   ├── settings/page.tsx
    │   │   └── admin/page.tsx
    │   └── api/
    │       ├── trigger/[action]/route.ts
    │       ├── webhooks/leads/[token]/route.ts
    │       └── webhooks/n8n/route.ts
    ├── components/
    │   ├── ui/   (Button, Card, Input, Badge, Modal, Tabs, …)
    │   ├── layout/ (Sidebar, Topbar, Logo, nav-config)
    │   └── providers.tsx
    ├── lib/
    │   ├── api.ts        ← unified data API (Supabase ↔ mock)
    │   ├── n8n.ts        ← triggerAutomation()
    │   ├── types.ts      ← all domain types
    │   ├── mock-data.ts  ← rich seed data
    │   ├── config.ts     ← APP_NAME, INDUSTRIES, …
    │   ├── utils.ts      ← cn(), formatDate(), formatRelative(), …
    │   └── supabase/{client,server}.ts
    └── store/tenant-store.ts
```

---

## 🔐 Multi-tenant model

Every tenant-scoped table (`leads`, `campaigns`, `appointments`, `tickets`, …)
has a non-null `organization_id` UUID. PostgreSQL RLS is enabled and forced on
every such table:

```sql
create policy tenant_isolation on leads
  using (organization_id = current_tenant_id())
  with check (organization_id = current_tenant_id());
```

`current_tenant_id()` resolves from either the JWT (`organization_id` claim) or
a session-local variable for background jobs. Application code defends in depth
by always sending `organization_id` in queries — RLS is the safety net.

See `ARCHITECTURE.md` for full details.

---

## 🧪 Testing checklist

See `TESTING.md` for the full per-module checklist. At a glance:

- [ ] Sign up creates org, profile, default pipeline
- [ ] Onboarding wizard advances through all 5 steps
- [ ] Adding a lead triggers `lead.qualify` and updates UI optimistically
- [ ] Campaign **Launch** transitions status to `running`
- [ ] FAQ toggle disables auto-replies
- [ ] Connect Center: connect → status `connected`, disconnect → `disconnected`
- [ ] Light / dark theme toggle persists across reloads
- [ ] Mobile sidebar drawer opens & closes
- [ ] All pages responsive at 360, 768, 1280, 1440
- [ ] `tenant_isolation` policy prevents cross-tenant reads (with two seeded orgs)

---

## 🗺 Roadmap

See `ROADMAP.md` — short version:

- **v1.1** — Real Supabase auth wiring, RHF/Zod across all forms, drawer-based lead detail
- **v1.2** — Real-time updates (Supabase channels), per-tenant rate limits, audit log search
- **v1.3** — Workflow builder UI (visual graph over n8n), template marketplace
- **v2.0** — White-label / reseller mode, billing & subscription tiers, per-tenant subdomains

---

## 📜 License

MIT — use it, ship it, monetize it.
