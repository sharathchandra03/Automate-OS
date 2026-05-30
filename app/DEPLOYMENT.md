# Deployment plan

## Recommended: Vercel + Supabase + n8n Cloud

This is the fastest production setup for AutomateOS.

```
┌─────────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│   Vercel            │    │   Supabase          │    │   n8n Cloud       │
│   Next.js (edge)    │ ── │   Postgres + Auth   │    │   Workflows       │
│   API routes        │    │   + Storage + RLS   │    │   (webhook URLs)  │
└─────────────────────┘    └────────────────────┘    └──────────────────┘
         ▲                          ▲                         ▲
         │ HTTPS                    │ pooled conn             │ HTTPS + secret
         └──────────────────────────┴─────────────────────────┘
```

---

## 1. Supabase setup (10 min)

1. Create a new Supabase project at https://supabase.com
2. In the SQL editor, paste & run in order:
   - `supabase/schema.sql`
   - `supabase/policies.sql`
   - `supabase/seed.sql` (optional demo data)
3. Copy these from the project's API Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`  (server-only)
4. Authentication → Providers: enable Email / OAuth as needed.
5. Database → Functions: confirm `current_tenant_id()` exists.

## 2. Vercel deploy (5 min)

```bash
npm install -g vercel
cd app
vercel --prod
```

Add **all** values from `.env.example` to **Settings → Environment Variables**.
Mark `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `N8N_WEBHOOK_SECRET`, and
all `N8N_WEBHOOK_*` values as **Server-only**.

## 3. n8n setup

Create a workflow per `AutomationAction`:

- `lead.qualify` — receives `{ lead_id, name, source }`, calls OpenAI to score + classify, PATCHes back to `/api/webhooks/n8n` with `{ event: "lead.scored", lead_id, score, intent }`.
- `campaign.launch` — fans out to WhatsApp / Gmail / Telegram nodes based on `payload.channel`.
- `followup.send` — sends one step of a sequence; respects `stop_on_reply`.
- `appointment.book` — creates the Google Calendar event, returns `calendar_event_id`.
- `appointment.remind` — runs hourly cron; sends 24h/1h reminders.
- `ticket.create` / `ticket.escalate` — pushes to your help-desk of choice.
- `faq.reply` — searches the FAQ table, falls back to OpenAI.
- `retargeting.run` — selects an audience, enrolls them in a sequence.
- `digest.daily` — sends a Slack/email summary.

Each n8n webhook URL goes in the matching `N8N_WEBHOOK_*` env var.

---

## Self-hosted alternative

- **Docker:** `docker compose` with `postgres` + `nextjs` + `n8n` containers.
- **Kubernetes:** standard Helm charts; mount secrets via your cluster's secret manager.
- **VPS:** a single Ubuntu box with `pm2`, `nginx` reverse proxy, Postgres 15, n8n via `docker run`.

---

## Production hardening checklist

- [ ] **HTTPS** for app, Supabase, and n8n.
- [ ] **CORS** restricted to your domains (`vercel.json` headers).
- [ ] **Rate limiting** per tenant on `/api/*` (Upstash Redis or Vercel KV).
- [ ] **Webhook secret** rotation every 90 days.
- [ ] **Backups:** Supabase daily PITR (paid tier).
- [ ] **Monitoring:** Vercel Analytics + Sentry + Supabase logs.
- [ ] **Audit log** retention 90 days minimum.
- [ ] **GDPR data export** & **deletion** endpoints (extension of `/api/admin`).
- [ ] **2FA** for owner / admin roles.
- [ ] **Service-role key** never reaches the browser.

---

## Cost estimate (first 100 customers)

| Item | Plan | $/month |
|---|---|---|
| Vercel | Pro | 20 |
| Supabase | Pro | 25 |
| n8n Cloud | Starter | 20 |
| OpenAI | gpt-4o-mini, ~$0.50 / 1k leads | ~30 |
| Total | | **~$95** |

Per-tenant cost ≈ **$1**. Healthy at $29 / tenant pricing.
