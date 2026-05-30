# Roadmap

## v1.0 — what's shipped (this scaffold)

- Multi-tenant data model + RLS
- 14 dashboard modules wired to a unified `lib/api.ts`
- n8n webhook abstraction with mock fallback
- Auth & onboarding screens
- Light / dark theme + responsive layout
- Realistic mock dataset for instant demos
- API routes for inbound webhooks (`/api/webhooks/leads/[token]`, `/api/webhooks/n8n`) and outbound triggers (`/api/trigger/[action]`)

## v1.1 — production readiness (1–2 weeks)

- [ ] Wire Supabase Auth into login / signup (email + magic link + Google OAuth)
- [ ] Replace `lib/api.ts` mock branches with real Supabase client calls
- [ ] React Hook Form + Zod schemas on every form
- [ ] Lead detail as a `<Drawer>` over the list (faster nav)
- [ ] Per-tenant rate limiting via Upstash Redis
- [ ] Sentry + analytics hookups
- [ ] CSV import / export for leads
- [ ] First Playwright E2E suite (login, create lead, launch campaign)

## v1.2 — power users (3–4 weeks)

- [ ] Real-time updates via Supabase Realtime channels
- [ ] Audit log search & filters
- [ ] Email template editor with merge variables
- [ ] WhatsApp template registry + approval workflow tracker
- [ ] Webhook signing + replay protection (HMAC over body)
- [ ] Cross-tenant admin console (super-admin role only)
- [ ] Org-level subdomain routing (`acme.automateos.app`)

## v1.3 — workflow builder (5–8 weeks)

- [ ] Visual workflow builder (React Flow) that compiles to n8n JSON
- [ ] Template marketplace per industry vertical (real estate pack, clinic pack, …)
- [ ] One-click "install workflow" with prefilled prompts/templates
- [ ] AI agent builder (multi-step LLM workflows tied to org data)

## v2.0 — SaaS at scale

- [ ] Subscription billing (Stripe) — Free / Pro / Business / Enterprise tiers
- [ ] White-label / reseller mode (custom domain, custom branding)
- [ ] Per-tenant subdomains + CDN
- [ ] Multi-region deployments
- [ ] SOC 2 readiness pack
- [ ] Mobile app (Expo + React Native — reuses the same `lib/api.ts`)
- [ ] Marketplace revenue share for workflow authors

---

## "Industry packs" we plan to ship

Each pack ships pre-configured pipeline stages, FAQ entries, follow-up
sequences, and message templates. The customer picks their pack during
onboarding and is live in literally 5 minutes.

- **Real Estate** — buyer / seller pipelines, site visit booking, EMI estimator
- **Clinics** — appointment + reminder + intake form + Rx upload
- **Coaching / Education** — demo class, batch enrollment, fee dunning
- **Agencies** — proposal flow, client status updates, weekly digest
- **E-commerce** — abandoned cart, COD confirmation, returns
- **Salons / Gyms** — class booking, no-show recovery, package upsell
- **Consultancies** — discovery → proposal → contract → onboarding
- **SaaS** — trial → activation → expansion → renewal

---

## North-star UX principles

These are the rules we don't break:

1. **The next action is always obvious.** No empty page without a clear CTA.
2. **Connect once, done forever.** No re-asking for credentials per feature.
3. **Plain English everywhere.** No "OAuth client ID", no "JWT", no "bearer".
4. **Progressive disclosure.** Advanced settings hide until the user crosses a threshold.
5. **Feedback in 250ms.** Every click shows a toast, badge, or skeleton.
6. **30-second comprehension.** New users understand what the dashboard *does* without training.
7. **Mobile-first behaviour, desktop-first density.** Touch targets ≥ 40px, but desktop pages use the space.
