# AutomateOS — Product Blueprint v2

> From **automation dashboard** → **AI-powered Business Operating System**

This document is the strategic spine of AutomateOS. It is the single source of truth for what the product is, what it is missing, where it is going, and how to build it without painting ourselves into corners. Everything here is opinionated, prioritized, and engineered for a 5-year horizon.

---

## 0. Mental model

> **AutomateOS is an AI-native operating system for service businesses.**
> One platform. Many verticals. One UI. Infinite automations underneath.

Think of it like this:

| Layer | Analogy | Examples |
|---|---|---|
| **Kernel** | OS kernel | Multi-tenant Postgres + RLS, queue, audit log, RBAC |
| **System services** | Background daemons | n8n workflows, AI pipelines, schedulers, webhooks |
| **Apps** | Installable apps | Leads, Campaigns, Tickets, FAQ, Reports |
| **UI shell** | Window manager | Sidebar + topbar + dashboard, themed per vertical |
| **Marketplace** | App store | Workflow & template marketplace, white-label resellers |

Everything we add must fit cleanly into one of these layers. If it doesn't, it's a smell.

---

## 1. Deliverable 1 — Missing Feature Analysis

What we have today is solid for a **mid-market vertical-agnostic CRM + automation hub**. What we are missing falls into 9 categories.

### 1.1 Identity & access
- ❌ Real authentication (currently mocked) → Supabase Auth + OAuth (Google, Microsoft)
- ❌ Multi-organization membership per user (an agency owner managing 10 clients)
- ❌ Granular RBAC (roles + per-resource permissions, not just role string)
- ❌ SSO (SAML / OIDC) for enterprise
- ❌ SCIM provisioning for enterprise
- ❌ Magic-link + passkey logins
- ❌ Session management UI (active devices, revoke)
- ❌ 2FA / MFA enforcement at org level
- ❌ IP allow-list per org (enterprise)
- ❌ Audit log streaming (SIEM) for enterprise

### 1.2 Billing & monetization
- ❌ Stripe subscription engine
- ❌ Razorpay for India / regional gateways
- ❌ Plan tiers + feature gating
- ❌ Usage metering (messages, AI tokens, automations, storage)
- ❌ Hard & soft limits with grace periods
- ❌ Invoices, receipts, tax handling, dunning
- ❌ Pause / cancel / downgrade flows
- ❌ Credits system (AI credits, automation credits)
- ❌ Affiliate / referral program
- ❌ Add-on marketplace

### 1.3 AI infrastructure
- ❌ Provider abstraction (OpenAI, Anthropic, Gemini, local Ollama)
- ❌ Prompt library / prompt versioning
- ❌ Token & cost tracking per tenant + per feature
- ❌ Vector store + RAG ingestion
- ❌ Model fallback ladder (cheap → mid → premium)
- ❌ Caching layer for repeat queries
- ❌ Conversation memory (per-lead, per-customer)
- ❌ AI guardrails (PII redaction, jailbreak filter, output validators)
- ❌ Eval harness (regression tests for prompts)

### 1.4 Communications
- ❌ Unified inbox (WhatsApp + email + Telegram + SMS in one thread)
- ❌ Email deliverability (SPF/DKIM/DMARC, warm-up)
- ❌ SMS via Twilio / MSG91
- ❌ Voice calls + voicemail drops + call recording
- ❌ Voice AI agents (Vapi / Retell)
- ❌ Live chat widget for the customer's own website
- ❌ Push notifications (web + mobile)
- ❌ In-app notification center

### 1.5 Workflow & automation
- ❌ Visual drag-drop workflow builder (low-code, in-app)
- ❌ Webhook log / inspector
- ❌ Automation run history with replay
- ❌ Retry / dead-letter queue UI
- ❌ Conditional branching templates
- ❌ Scheduled / cron-based workflows
- ❌ A/B testing inside workflows
- ❌ Workflow marketplace (clone & install)
- ❌ Versioning + staging for workflows

### 1.6 Analytics & intelligence
- ❌ Funnel builder (custom funnels)
- ❌ Cohort analysis
- ❌ Attribution (UTM → revenue)
- ❌ Forecasting (revenue, churn, capacity)
- ❌ Anomaly detection
- ❌ Customer health score
- ❌ Team productivity scorecards
- ❌ Export to CSV / PDF / scheduled email reports
- ❌ Embedded BI (Metabase / custom dashboards)

### 1.7 Operations
- ❌ Background job queue (BullMQ / Inngest / Trigger.dev)
- ❌ Cron scheduler with UI
- ❌ Status page + uptime monitor (public + internal)
- ❌ System health dashboard
- ❌ Backup & restore
- ❌ Data export (full GDPR export)
- ❌ Data deletion (right to be forgotten)
- ❌ Staging environment per tenant
- ❌ Rate limiter (per IP, per tenant, per endpoint)

### 1.8 Collaboration
- ❌ Internal comments on leads / tickets / deals
- ❌ @mentions + email/push notifications
- ❌ Internal team chat (lightweight, like Linear's)
- ❌ Tasks & assignments
- ❌ Approvals workflow (e.g. campaign approval)
- ❌ Activity feed per record + per user

### 1.9 Customer-facing
- ❌ Client portal (tenant's customer logs in)
- ❌ Booking page (public, brandable)
- ❌ Knowledge base (public, brandable)
- ❌ Forms builder (public capture forms)
- ❌ Quote / proposal builder
- ❌ Invoicing for the tenant's customers (if they sell services)

---

## 2. Deliverable 2 — Product Gap Report

Beyond raw "missing features," the product has structural gaps:

### 2.1 The "lonely lead" problem
A lead today is just a row. It should be a **first-class object** with:
- Conversation history across every channel
- AI-generated profile + intent + likely objections
- Predicted next-best-action
- Predicted close probability + LTV
- Linked appointments, tickets, deals, files, notes
- Visible across the entire team in real time

### 2.2 The "dead automation" problem
Once an automation is set up, no one looks at it again. We need:
- Health score per automation (success rate, latency, last error)
- Auto-pause on >X% failure
- Notifications when a critical workflow breaks
- AI suggestions to optimize weak workflows

### 2.3 The "empty Monday" problem
A user opens AutomateOS Monday morning. What do they see?
Currently: a dashboard. That's not enough. They should see:
- Daily AI brief: "3 hot leads, 2 tickets aging, 1 automation failing, 2 opportunities to win back."
- A queue of *one-click decisions* (approve, send, schedule)
- A "what's working / what's not" delta vs last week

### 2.4 The "I'm an agency" problem
Agencies want to manage **many tenants** from one login. We need:
- Multi-org switcher with consolidated reporting
- Agency dashboard ("all clients" view)
- White-label per client
- Per-client billing (agency pays, or client pays through agency)

### 2.5 The "I'm an enterprise" problem
Enterprise buyers ask for things SMBs don't. We need:
- SSO, SCIM, audit log streaming, IP allow-list
- DPA, SOC2, GDPR, HIPAA-readiness
- SLA + premium support
- Dedicated environments / VPC
- Custom data retention

### 2.6 The "non-technical user" problem
Onboarding is the #1 retention lever. Today onboarding is 5 steps. It should be:
- Vertical-aware (real-estate gets different prompts than clinic)
- AI-guided (the AI asks, fills, suggests)
- Outcome-first ("Connect WhatsApp → see your first qualified lead in 60s")
- Instant gratification: end with a working demo lead, demo campaign, demo report.

---

## 3. Deliverable 3 — Recommended New Modules

Ranked by leverage. Each is shipped as a **module** that can be enabled per plan.

| # | Module | Plan | Why it matters |
|---|---|---|---|
| 1 | **AI Assistant (Copilot)** | All | Constant value, sticky, cross-cuts every page |
| 2 | **Knowledge Base + RAG** | Pro+ | Powers FAQ, support, and AI replies with the tenant's own data |
| 3 | **Workflow Builder (visual)** | Pro+ | Lock-in: once they build flows in our UI, they can't leave |
| 4 | **Unified Inbox** | All | The day-to-day surface; replaces 5 other tools |
| 5 | **Billing + Plans + Usage** | Core | Required for monetization |
| 6 | **Notification Center** | All | Engagement loop |
| 7 | **Insights (AI weekly brief)** | All | Retention engine |
| 8 | **Customer Health Score** | Pro+ | Account expansion + churn prevention |
| 9 | **Forms Builder** | All | Lead-gen surface area |
| 10 | **Booking Pages (public)** | All | Replaces Calendly |
| 11 | **Templates Marketplace** | All | Time-to-value, lock-in |
| 12 | **API Keys + Webhooks Inspector** | Pro+ | Power users + integrators |
| 13 | **Reports + Scheduled Exports** | Pro+ | Executive value |
| 14 | **Client Portal** | Pro+ | New surface for the tenant's customers |
| 15 | **Voice AI (calls)** | Enterprise | Differentiator vs HubSpot/Zoho |
| 16 | **Quotes / Proposals / Invoices** | Pro+ | Closes the sale loop |
| 17 | **Approvals + Tasks** | Pro+ | Ops team feature |
| 18 | **White-Label Mode** | Agency | Agency reseller plan |
| 19 | **Multi-Org Switcher** | Agency | Required for agencies |
| 20 | **SSO + SCIM + Audit Streaming** | Enterprise | Enterprise checklist |

---

## 4. Deliverable 4 — Roadmap (v1 → v2 → Enterprise)

### v1.0 — "Run a real business on it" (now → 6 weeks)
- Real Supabase auth + RLS wired end-to-end
- Stripe billing + 3 plans (Starter / Pro / Agency)
- Vertical packs (10 industries shipped)
- AI abstraction + token tracking
- Notification center
- Daily AI brief (Insights module)
- Knowledge base + RAG (basic)
- Forms builder + public booking page
- Webhook logs + automation run history
- API keys management
- White-label (logo, color, domain) for Agency plan
- PWA support

### v1.5 — "Replace 5 tools" (months 2–4)
- Visual workflow builder
- Unified inbox (WhatsApp + Email + SMS + Telegram)
- Customer health score + churn prediction
- Templates marketplace
- Reports + scheduled exports (PDF + email)
- Client portal (basic)
- Multi-org switcher for agencies

### v2.0 — "AI-native business OS" (months 4–9)
- AI workflow builder ("describe the automation, we build it")
- Voice AI (inbound + outbound calls)
- AI sales coach (real-time call scoring)
- Quote / proposal / invoice generator
- Approvals + tasks
- Anomaly detection + smart alerts
- A/B testing in workflows + campaigns
- Embedded BI dashboards
- Mobile app (React Native)

### Enterprise (parallel track)
- SSO (SAML + OIDC), SCIM
- Audit log streaming (Datadog, Splunk, S3)
- Dedicated regions / VPC
- IP allow-list
- DPA, SOC2 Type II, HIPAA, GDPR DPA
- Custom data retention
- Premium SLA (99.99%)
- Dedicated CSM

---

## 5. Deliverable 5 — Technical Debt Prevention Strategy

We avoid the typical SaaS rot by enforcing 7 rules from day one.

1. **One source of truth for data** — every page goes through `lib/api.ts`. No component touches Supabase directly. No hidden fetches.
2. **One source of truth for automations** — every side-effect goes through `triggerAutomation()`. The UI never knows the underlying provider.
3. **Feature flags > branches** — new modules ship behind `features.ts`, dark-launched, then rolled out per plan.
4. **Vertical packs > if/else** — business-type logic lives in `verticals/`, never sprinkled in pages.
5. **Strict tenant scoping** — every query is gated by `organization_id` in code AND by RLS in Postgres. Defense in depth.
6. **Append-only audit log** — every mutation writes an `audit_event`. This is non-negotiable.
7. **No business logic in components** — components render. Hooks fetch. Lib computes. Workflows execute. Anything that breaks this rule is rejected in review.

---

## 6. Deliverable 6 — Scalability Strategy

### 6.1 Tier 0 (now → 1k tenants)
- Supabase managed Postgres + RLS
- Vercel for the Next.js app
- n8n cloud (or self-hosted) for workflows
- All blocking I/O happens in webhooks → workers, not in request path

### 6.2 Tier 1 (1k → 10k tenants)
- Move to **Postgres with read replicas** (Neon / Supabase Pro / RDS)
- Add **Redis** for: rate limits, session cache, AI response cache, idempotency keys
- Add **BullMQ / Inngest / Trigger.dev** for background jobs
- Add **CDN** for static + signed-URL assets
- Move long-running AI calls to a worker pool, not the edge
- Per-tenant **rate limiting** at the edge

### 6.3 Tier 2 (10k → 100k tenants)
- **Database sharding by tenant** (Postgres or Citus); cold tenants → archive shard
- **Event-driven architecture** — every domain event is published to a bus (Kafka / Redpanda / NATS)
- **Per-region deployments** (US, EU, India) for data residency
- **Object storage** (S3) with per-tenant bucket prefix
- **Vector DB** (pgvector → Qdrant / Pinecone) for RAG at scale
- **Observability stack**: OpenTelemetry → Tempo + Loki + Prometheus + Grafana
- **SLOs**: 99.9% API, 99.95% webhook ingestion, p95 < 300ms

### 6.4 Failure modes we plan for
- Supabase outage → degrade to read-only with cached data
- n8n outage → enqueue locally, replay on recovery
- AI provider outage → fallback ladder (Anthropic ↔ OpenAI ↔ Gemini ↔ local)
- Webhook flood → token bucket per tenant; 429 with retry-after
- Tenant abuse → per-tenant quotas hard-stop at 110% with override

---

## 7. Deliverable 7 — AI Roadmap

### 7.1 Stage 1: AI as a tool (today)
Single-purpose actions: qualify lead, draft message, classify ticket.

### 7.2 Stage 2: AI as a layer (v1.5)
- **Provider abstraction** (`lib/ai/provider.ts`): one interface, many models
- **Prompt library** with versioning + A/B
- **Token + cost tracking** per tenant, per feature, per user
- **Caching** layer (deterministic inputs → cached outputs)
- **Fallback ladder**: Haiku → Sonnet → Opus, or GPT-mini → GPT-4o
- **Guardrails**: PII redaction in, output validators out, jailbreak filter
- **Eval harness**: regression tests for prompts on every PR

### 7.3 Stage 3: AI as a memory (v2)
- **RAG**: knowledge base ingestion (PDF, web, CSV, Notion, Drive)
- **Per-lead memory**: every conversation is embedded + recalled
- **Per-tenant memory**: brand voice, past playbooks, win/loss patterns
- **Per-user memory**: personal style, preferences

### 7.4 Stage 4: AI as an agent (v2+)
- **Copilot panel** on every page — "what should I do next?"
- **Autonomous next-best-action** queue
- **AI workflow builder** — describe in English, generate the n8n flow
- **Voice agents** for inbound/outbound calls
- **Multi-agent orchestration** for complex tasks (research → draft → send → followup)

### 7.5 Always-on AI features
| Feature | Where | Effort |
|---|---|---|
| Auto-summarize conversations | Lead detail | Low |
| Auto-classify tickets | Tickets | Low |
| Auto-draft replies | Inbox / FAQ | Low |
| Sentiment per message | Inbox | Low |
| Conversion probability | Lead list | Medium |
| Churn probability | Customer list | Medium |
| Anomaly detection | Analytics | Medium |
| Daily brief | Overview | Medium |
| Workflow suggestions | Automations | High |
| Smart segmentation | Campaigns | High |

---

## 8. Deliverable 8 — Security Roadmap

### 8.1 Foundations (v1)
- Postgres RLS on every tenant table (already in)
- Service-role key never reaches the browser
- All webhooks **HMAC-signed** with tenant-specific secrets
- Idempotency keys on every mutation
- All inputs validated with Zod
- CSP, HSTS, X-Frame-Options headers
- Cookie flags: HttpOnly, Secure, SameSite=Lax
- Rate limit at edge per IP and per tenant
- Secrets in env, not in code; rotated quarterly

### 8.2 Compliance (v1.5)
- GDPR data export + delete endpoints
- DPA template for customers
- Subprocessor list maintained publicly
- Cookie consent banner for EU
- Data residency (EU region opt-in)
- Audit log retention 365 days minimum
- Backup encryption (KMS)

### 8.3 Enterprise (v2)
- SOC2 Type II
- HIPAA BAA available
- SSO (SAML + OIDC)
- SCIM provisioning
- Audit log streaming
- IP allow-list
- Customer-managed keys (CMK / BYOK)
- Penetration tests annually

### 8.4 AI safety
- PII redaction before any prompt leaves the tenant boundary
- Output validators (no PII leak, no off-topic, no hallucinated PII)
- Jailbreak detection on user inputs to AI
- "AI used this data" disclosure in audit log
- Per-tenant opt-out of model training

---

## 9. Deliverable 9 — UX Simplification Recommendations

Our north star: **"a non-technical owner can run their business from the home page."**

### 9.1 Drop the dropdown
Replace deep dropdowns with **command palette** (Cmd+K) for everything.

### 9.2 Outcome-first labels
- ❌ "Trigger automation"
- ✅ "Send 12 reminders now"

### 9.3 Empty states are sales pages
Every empty state shows: a 30-second example, a one-click "load demo data", and a "what this does" line.

### 9.4 One-click defaults
Every form has a sensible default. Onboarding pre-fills 80% of fields based on vertical pack.

### 9.5 Progressive disclosure
- Basic users see Overview, Leads, Inbox, Calendar, Reports.
- Power users unlock Automations, Workflow Builder, API Keys, Webhooks via Settings.
- Enterprise unlocks SSO, SCIM, Audit Streaming.

### 9.6 The "single primary action" rule
Every page has ONE primary CTA (filled). All other actions are secondary or ghost.

### 9.7 Speak the user's language
Vertical packs override copy:
- Real estate: "Leads" → "Buyers/Sellers"
- Clinic: "Leads" → "Patients"
- Agency: "Leads" → "Prospects"

### 9.8 Always-visible Copilot
A `?` button bottom-right opens the AI assistant on every page. It knows the page context.

---

## 10. Deliverable 10 — Retention Feature Recommendations

The product becomes **impossible to leave** when these are in place:

1. **Daily AI brief** — emailed + in-app every morning
2. **Weekly executive summary** — emailed Mondays, branded for the customer's own boss
3. **Health score nudges** — "you have 3 leads aging > 7 days"
4. **Automation health alerts** — "your follow-up workflow has dropped to 70% delivery"
5. **Conversion alerts** — "lead X is showing 80% buy intent — call now"
6. **Missed-lead alerts** — any inbound that wasn't responded to in 5 minutes
7. **ROI dashboard** — "AutomateOS saved you $4,231 this month"
8. **Gamification (sales)** — leaderboards, streaks, weekly winners
9. **Goal tracking** — set MRR, lead, response-time targets; dashboard shows progress
10. **Reactivation playbooks** — automatic if a customer goes quiet for 14 days
11. **Knowledge ingestion** — once they upload their docs, leaving is painful
12. **Workflow lock-in** — hand-built flows in our UI = high switching cost
13. **API + webhooks** — once integrated, hard to remove
14. **Branded client portal** — their customers see *their* brand, not ours; cancel = telling customers to relearn

---

## 11. Deliverable 11 — Monetization Strategy

### 11.1 Plans

| Plan | Price (USD/mo) | For | Key limits |
|---|---|---|---|
| **Starter** | $29 | Solo / very small biz | 1 user, 500 contacts, 1k automations, 50k AI tokens |
| **Pro** | $79 | Growing teams | 5 users, 10k contacts, 25k automations, 1M AI tokens, knowledge base, workflow builder |
| **Business** | $199 | Established biz | 20 users, 50k contacts, unlimited automations, 5M AI tokens, voice AI, scheduled reports |
| **Agency** | $399 | Agencies | 10 client orgs, white-label, multi-org dashboard |
| **Enterprise** | custom | 100+ users | SSO, SCIM, audit streaming, SLA, dedicated CSM |

### 11.2 Usage-based add-ons
- **AI credits**: $10 per 500k tokens
- **Voice minutes**: $0.05 / min
- **Extra contacts**: $5 per 1,000
- **Extra automations**: $10 per 10,000 runs
- **Extra storage**: $5 per 10GB

### 11.3 Expansion levers
- Seat expansion (per-user pricing kicks in at limit)
- Module add-ons (Voice AI, Quote Builder, Client Portal as $19/mo each on Pro)
- Marketplace revenue share (30% on paid templates)
- Affiliate program (20% recurring)

### 11.4 Anti-churn levers
- Annual plans = 2 months free
- Pause-instead-of-cancel
- Win-back emails after 30 days
- Downgrade-instead-of-cancel flow with usage-based plan

### 11.5 Billing infra
- Stripe primary
- Razorpay for India
- Paddle as fallback (merchant-of-record for EU)
- Usage metered via internal counter table; flushed nightly to billing
- Hard cap at 110% with admin override; soft warning at 80%, 100%

---

## 12. Deliverable 12 — SaaS Growth Strategy

### 12.1 Distribution
- **Vertical landing pages** (one per business type) — SEO + paid
- **Templates marketplace** — every template is an SEO landing page
- **Free tier** with watermark on outbound (free marketing for us)
- **Affiliate program** — agencies, consultants, content creators
- **Integrations directory** — each integration is a backlink magnet

### 12.2 Activation
- Onboarding ends with **a working demo** — not an empty dashboard
- AI fills in their first lead, first automation, first report from their website
- Time-to-first-value < 5 minutes

### 12.3 Engagement
- Daily AI brief (email + in-app)
- Weekly summary
- "You're trending" notifications

### 12.4 Expansion
- Usage dashboard surfaces "you're at 80% of your plan" → upgrade CTA
- Lock advanced features behind plan, but show them grayed-out (FOMO)

### 12.5 Retention
- See section 10
- NPS surveys quarterly
- "Pause" instead of "cancel"
- Annual discounts

### 12.6 Referral
- $50 credit per referred customer who pays
- White-label resellers get 30% recurring

---

## 13. Deliverable 13 — Enterprise Readiness Plan

### 13.1 Security
- SOC2 Type II (target: 9 months)
- ISO 27001 (target: 18 months)
- HIPAA BAA available
- GDPR DPA + EU data residency
- Penetration tests annual (Cobalt or HackerOne)
- Bug bounty program

### 13.2 Identity
- SAML SSO (Okta, Azure AD, Google Workspace)
- OIDC SSO
- SCIM 2.0 user provisioning
- 2FA enforcement at org level
- IP allow-list

### 13.3 Reliability
- 99.9% uptime SLA on Business; 99.99% on Enterprise
- Status page with subscription
- Incident comms playbook
- RPO 1h, RTO 4h disaster recovery
- Multi-AZ Postgres + nightly snapshots + 30-day retention

### 13.4 Procurement
- DPA, MSA, SOC2 report under NDA
- Subprocessor list public
- Security questionnaire pre-filled (CAIQ, SIG)
- Annual review meetings

### 13.5 Operations
- Dedicated CSM
- Slack Connect channel
- Quarterly business reviews
- Custom training sessions

### 13.6 Architecture
- Dedicated environments option (single-tenant)
- VPC / PrivateLink option
- BYOK / customer-managed keys
- Custom data retention windows

---

## 14. Deliverable 14 — Integration Expansion Strategy

### 14.1 Tier 1 — must have for v1
WhatsApp Business, Email (SMTP/SendGrid/SES), Google Calendar, Outlook Calendar, Google Sheets, Stripe, Razorpay, OpenAI/Anthropic, Webhooks, Zapier, n8n.

### 14.2 Tier 2 — Pro plan
Twilio (SMS + voice), Telegram, Instagram DM, Facebook Messenger, Slack, Discord, HubSpot import, Salesforce import, Mailchimp, ActiveCampaign, Notion, Google Drive, Dropbox, Shopify, WooCommerce, Calendly, Zoom, Meta Ads, Google Ads.

### 14.3 Tier 3 — Business plan
LinkedIn (lead gen), TikTok Lead Ads, Twilio Voice AI, Vapi, Retell, ElevenLabs, Cal.com, Pipedrive, Zoho, Freshdesk, Zendesk, Intercom, Plaid (payments).

### 14.4 Tier 4 — Enterprise
Salesforce (full bi-di sync), MS Dynamics, NetSuite, SAP, Workday, ServiceNow, custom SFTP, on-prem connectors.

### 14.5 Integration surface
Every integration is built once, surfaced 3 ways:
- **Connect Center** card (UI)
- **Workflow node** (low-code builder)
- **API + webhook** (developers)

### 14.6 Build-vs-rent decisions
- Build: WhatsApp, AI providers, internal queues — they are the product
- Rent: SMS (Twilio), email (SES), calendar (Cronofy?), payments (Stripe) — undifferentiated
- Buy: vector DB → start with pgvector, migrate to Pinecone/Qdrant at scale

---

## 15. Deliverable 15 — Future-Proof Architecture Recommendations

```
┌─────────────────────────────────────────────────────────────────┐
│                          EDGE LAYER                              │
│  Vercel/Cloudflare · CDN · WAF · Rate limiting · A/B routing   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                       APP LAYER (stateless)                       │
│  Next.js 14 (App Router) · React Server Components · API routes  │
│  Auth (Supabase Auth + SSO) · Feature flags · Vertical packs     │
└──────────────┬───────────────┬───────────────┬───────────────────┘
               │               │               │
       ┌───────▼─────┐  ┌──────▼─────┐  ┌──────▼──────┐
       │   READS     │  │   WRITES   │  │  AUTOMATIONS│
       │  Postgres   │  │  Postgres  │  │     n8n     │
       │  (replica)  │  │  (primary) │  │   workers   │
       │   pgvector  │  │  +RLS+audit│  │   queues    │
       └─────────────┘  └────────────┘  └──────┬──────┘
                                                │
                          ┌─────────────────────┼─────────────────────┐
                          │                     │                     │
                  ┌───────▼──────┐      ┌───────▼──────┐      ┌──────▼──────┐
                  │  AI Provider │      │  Comms       │      │  Storage    │
                  │  abstraction │      │  abstraction │      │  abstraction│
                  │ OpenAI/Claude│      │ WA/SMS/Email │      │ S3/R2/local │
                  │ Gemini/Local │      │ Voice/Tg     │      └─────────────┘
                  └──────────────┘      └──────────────┘
                          │
                  ┌───────▼──────┐
                  │  Vector DB   │
                  │ pgvector →   │
                  │ Qdrant/Pinec │
                  └──────────────┘
```

### 15.1 Key principles
1. **Stateless app, stateful data layer** — any pod can serve any request.
2. **Provider abstraction at every external boundary** (AI, comms, storage, payments). Swap providers in one file.
3. **Event sourcing for critical paths** — every status change of a lead, ticket, or run is an event. Replay-able. Debuggable.
4. **Idempotency keys on every mutation** that calls external systems. Webhooks especially.
5. **Per-tenant feature flags** — flip features on for a customer without a deploy.
6. **All side-effects async** — request handlers enqueue, workers execute. Predictable latency.
7. **Append-only audit log** — separate table, separate retention, exported daily.
8. **Multi-region from day one** in DNS shape, even if first region is single. Don't paint into a corner.
9. **One write path per resource** — no two code paths can write to `leads`. Funnel everything through `lib/api.ts` → repository.
10. **Schema-first** — every DB change goes through versioned migrations (Supabase migrations / Prisma / Drizzle / sqitch).

### 15.2 Modular folder layout (target)
```
src/
├── app/                    # Next.js routes (thin)
├── modules/                # Each module is a self-contained domain
│   ├── leads/              # types, api, components, hooks, prompts
│   ├── billing/
│   ├── inbox/
│   ├── workflow-builder/
│   └── ...
├── lib/
│   ├── ai/                 # providers, prompts, usage, RAG
│   ├── plans/              # plan tiers + limits
│   ├── features/           # feature flags
│   ├── permissions/        # RBAC
│   ├── verticals/          # per-industry packs
│   ├── queue/              # background jobs abstraction
│   ├── notifications/      # in-app + email + push
│   ├── audit/              # append-only log
│   ├── billing/            # stripe + razorpay
│   ├── supabase/           # client + server
│   └── n8n.ts              # automation abstraction
├── components/             # shared UI (presentational only)
└── store/                  # client-side state
```

### 15.3 Core abstractions (stable contracts)

```ts
// AI
interface AIProvider {
  complete(prompt: Prompt, opts?: AIOpts): Promise<AIResult>;
  embed(texts: string[]): Promise<number[][]>;
  models(): string[];
}

// Comms
interface CommsProvider {
  send(channel: 'whatsapp'|'sms'|'email'|'telegram', msg: Message): Promise<SendResult>;
}

// Storage
interface StorageProvider {
  put(tenantId: string, key: string, blob: Buffer): Promise<string>;
  get(tenantId: string, key: string): Promise<Buffer>;
  signedUrl(tenantId: string, key: string, ttl: number): Promise<string>;
}

// Queue
interface Queue {
  enqueue(job: Job): Promise<string>;       // returns job id
  schedule(job: Job, runAt: Date): Promise<string>;
  cron(name: string, expr: string, job: Job): void;
}

// Permissions
interface Permissions {
  can(actor: Actor, action: string, resource: Resource): boolean;
}

// Feature flags
interface Features {
  has(orgId: string, key: string): boolean;
  list(orgId: string): string[];
}
```

These contracts must not change in v2. Implementations behind them will.

---

## 16. The "north-star" experience

When AutomateOS is finished, this is what Monday morning looks like for a customer:

> 7:00 — daily brief lands in their inbox: "3 hot leads, 2 tickets aging, 1 booking confirmed for 11am, 1 automation needs attention."
>
> 7:05 — they open the app on their phone. PWA. Touch ID. They're in.
>
> 7:06 — Overview greets them: "You're 18% above last week. Best channel: WhatsApp."
>
> 7:07 — they tap an alert: "Lead Priya has 82% buy intent — last replied 14m ago." AutomateOS suggests three reply variants, drafted in their tone of voice. They tap one. Sent.
>
> 7:09 — they tap "Approve" on a campaign Copilot drafted overnight. It ships.
>
> 7:10 — they close the app. The platform keeps working: AI replies to FAQs, books appointments, escalates angry tickets, retargets dormant leads, and sends them the daily brief tomorrow.

That's the product. Everything in this document exists to deliver that experience.

---

## 17. What we will NOT build (anti-roadmap)

To stay focused, we explicitly say no to:
- Generic project management (Asana / ClickUp territory)
- Generic email marketing newsletters (Mailchimp territory) — except as part of campaigns
- Accounting / bookkeeping (Xero / QuickBooks)
- HRIS, payroll
- Code editors / dev tools
- Anything that doesn't tie back to **acquiring, converting, retaining, or supporting a customer**.

This boundary is what lets us go deep instead of wide.

---

**End of Blueprint v2.**

Implementation of v1 expansion items begins in this same commit — see the new modules, libraries, and pages added across `src/lib/`, `src/modules/`, and `src/app/(dashboard)/`.
