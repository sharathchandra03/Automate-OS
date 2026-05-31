# AutomateOS — Build Roadmap

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to execute each week's plan.

## Status Overview

| Week | Theme | Branch | Status |
|------|-------|--------|--------|
| Week 1 | Auth + DB + Route Guards | `week1/auth-db-middleware` | ✅ Complete |
| Week 2 | Security + Tests + API Keys | `week2/security-tests-apikeys` | ✅ Complete |
| Week 3 | Inbox + Real-time Messaging | `week3/inbox-realtime` | ✅ Complete |
| Week 4 | Campaigns + Automation | `week4/campaigns-automation` | ✅ Complete |
| Week 5 | Billing + Stripe | `week5/billing-stripe` | 🔲 Next |
| Week 6 | Settings + Knowledge Base | `week6/settings-knowledge` | 🔲 Planned |
| Week 7 | AI Insights + Dashboard | `week7/ai-insights-dashboard` | 🔲 Planned |
| Week 8 | Polish + Production Launch | `week8/polish-launch` | 🔲 Planned |

## What Each Week Delivers

**Week 1 (Done):** Real auth, multi-tenant DB, API security, Anthropic/Gemini providers, notifications persistence, atomic credit deduction, webhook token system.

**Week 2 (Done):** Vitest setup with 15 passing tests, channel credential encryption (`encrypt_credential` SQL), API keys persisted to Supabase (`api-keys/route.ts`), webhook events log (`webhook-events/route.ts`).

**Week 3 (Done):** WhatsApp Business webhook receiver with message ingestion (`whatsapp-parser.ts`), real-time inbox via Supabase Realtime subscription, conversation open/close/assign (`conversations/[id]/route.ts`), contacts page live data.

**Week 4 (Done):** Campaign builder reads/writes live Supabase data, automations toggle persisted to DB, retargeting page wired to real leads, campaign status transition tests passing.

**Week 5:** Stripe checkout + webhooks, subscription table, plan limit enforcement on credits + API calls, billing page live metering.

**Week 6:** Logo upload (Supabase Storage), brand color + AI tone saved per org, knowledge base CRUD to DB, team member invite + role management.

**Week 7:** Overview dashboard aggregated from real tables (not MOCK constants), AI insights from live lead/conversation data, reports page, AI assistant context-aware.

**Week 8:** Error boundaries on all pages, skeleton loaders, mobile audit, Sentry integration, production deploy checklist, rate limiting on public routes.

## Open Concerns (from CONCERNS.md — not yet addressed)
- **#5** Channel credentials in plaintext → Week 2
- **#15** No tests → Week 2
- **#18** Billing disconnected → Week 5
- **#19** Settings branding placeholder → Week 6
