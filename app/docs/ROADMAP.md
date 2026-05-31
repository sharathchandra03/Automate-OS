# AutomateOS — Build Roadmap

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to execute each week's plan.

## Status Overview

| Week | Theme | Branch | Status |
|------|-------|--------|--------|
| Week 1 | Auth + DB + Route Guards | `week1/auth-db-middleware` | ✅ Complete |
| Week 2 | Security + Tests + API Keys | `week2/security-tests-apikeys` | ✅ Complete |
| Week 3 | Inbox + Real-time Messaging | `week3/inbox-realtime` | ✅ Complete |
| Week 4 | Campaigns + Automation | `week4/campaigns-automation` | ✅ Complete |
| Week 5 | Billing + Stripe | `week5/billing-stripe` | ✅ Complete |
| Week 6 | Settings + Knowledge Base | `week6/settings-knowledge` | ✅ Complete |
| Week 7 | AI Insights + Dashboard | `week7/ai-insights-dashboard` | ✅ Complete |
| Week 8 | Polish + Production Launch | `week8/polish-launch` | ✅ Complete |

## What Each Week Delivers

**Week 1 (Done):** Real auth, multi-tenant DB, API security, Anthropic/Gemini providers, notifications persistence, atomic credit deduction, webhook token system.

**Week 2 (Done):** Vitest setup with 15 passing tests, channel credential encryption (`encrypt_credential` SQL), API keys persisted to Supabase (`api-keys/route.ts`), webhook events log (`webhook-events/route.ts`).

**Week 3 (Done):** WhatsApp Business webhook receiver with message ingestion (`whatsapp-parser.ts`), real-time inbox via Supabase Realtime subscription, conversation open/close/assign (`conversations/[id]/route.ts`), contacts page live data.

**Week 4 (Done):** Campaign builder reads/writes live Supabase data, automations toggle persisted to DB, retargeting page wired to real leads, campaign status transition tests passing.

**Week 5 (Done):** Stripe checkout + webhooks, subscription table, plan limit enforcement on credits + API calls, billing page live metering.

**Week 6 (Done):** Logo upload (Supabase Storage), brand color + AI tone saved per org, knowledge base CRUD to DB, team member invite + role management via Supabase Auth admin.

**Week 7 (Done):** `getDashboardSummary()` queries leads/conversations/messages/wallet directly; overview page live stat grid with skeletons; `/api/insights/trends` + `daily_lead_counts` RPC; insights page 30-day BarChart; `/api/ai/chat` fetches lead context before LLM call; `buildSystemPrompt(context)` added; AI assistant + widget route through server API; `/api/reports/summary` serves status breakdown + top leads; reports page PieChart + ranked table; 3 prompt-builder unit tests passing.

**Week 8 (Done):** Error boundaries (`error.tsx`) on dashboard root, leads, inbox, and billing routes; `SkeletonCard/SkeletonTable/SkeletonStatGrid` components wired to overview, leads, and inbox; `rateLimit()` sliding-window applied to leads webhook (60/min) and WhatsApp webhook (120/min); `@sentry/nextjs` installed with client/server/edge configs; `next.config.mjs` wrapped with `withSentryConfig`; mobile Kanban overflow fixed; inbox single-panel mobile with back button; `validateEnv()` at server startup; `docs/DEPLOY.md` full production checklist. 18/18 tests passing.

## Open Concerns (from CONCERNS.md)
- **#5** Channel credentials in plaintext → ✅ Resolved in Week 2 (`encrypt_credential` SQL)
- **#15** No tests → ✅ Resolved in Week 2 (Vitest suite, now 18+ tests)
- **#18** Billing disconnected → ✅ Resolved in Week 5 (Stripe checkout + webhooks)
- **#19** Settings branding placeholder → ✅ Resolved in Week 6 (logo, brand color, AI tone persisted)

## All 8 Weeks Complete 🚀

The full roadmap is delivered. See [DEPLOY.md](DEPLOY.md) for the production go-live checklist.
