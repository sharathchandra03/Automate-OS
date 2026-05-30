# Week 1 Plan — Auth + DB + Route Guards

## Context
AutomateOS is a Next.js 14 App Router project at `C:\Users\LENOVO\Desktop\AI Automation Project\app`.
Branch: `week1/auth-db-middleware`

The scaffold has all pages but zero real backend. Everything runs on in-memory mock data.
`supabase/schema.sql` exists with core tables. `src/lib/api.ts` has `// TODO: supabase fetch` on every function.
Auth is a fake setTimeout redirect. No middleware.ts. No route protection.

## Task 1: Complete Supabase Schema
Add missing tables to `supabase/schema.sql`:
- contacts, contact_labels, org_channels, wallets, credit_transactions
- conversations, messages, workflows, workflow_runs
Add these tables to the RLS policy loop in `supabase/policies.sql`.
Update `supabase/seed.sql` with sample rows for new tables.

## Task 2: Wire Supabase Auth (login + signup + callback)
- `src/app/(auth)/login/page.tsx` — replace setTimeout with `supabase.auth.signInWithPassword()`
- `src/app/(auth)/signup/page.tsx` — create org + profile on signup using service role
- `src/app/auth/callback/route.ts` — new file, handle OAuth callback (code exchange)
- Add react-hook-form + zod validation to both forms

## Task 3: Create middleware.ts (route protection + security headers)
- New file: `src/middleware.ts`
- Protect all `/(dashboard)/` routes — redirect unauthenticated to `/login`
- Set security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Refresh Supabase session on every request

## Task 4: Wire real Supabase reads in lib/api.ts
- Replace all mock-only branches with real Supabase client calls
- Keep `if (!HAS_SUPABASE) return delay(memory.xxx)` as fallback
- Scope every query by `organization_id` from the session

## Task 5: Wire real Supabase writes in lib/api.ts
- Replace in-memory mutations (create/update/delete) with real Supabase inserts/updates/deletes
- Keep mock fallback
