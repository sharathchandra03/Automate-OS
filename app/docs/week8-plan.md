# Week 8 Plan — Polish + Production Launch

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Every dashboard page has error boundaries and skeleton loaders; all public API routes are rate-limited; Sentry captures errors in production; a mobile-responsiveness pass cleans up layout breakpoints; and a production deployment checklist is verified before go-live.

**Architecture:** Error boundaries wrap each dashboard route segment — Next.js 13+ `error.tsx` files. Skeleton loaders use Tailwind `animate-pulse` divs matching the real content shape. Rate limiting uses an in-memory sliding window (no Redis required for solo launch; upgrade path documented). Sentry is wired via `@sentry/nextjs`. Deployment runs on Vercel with environment variables validated at startup.

**Tech Stack:** Next.js 14, Sentry (`@sentry/nextjs`), Tailwind CSS, Vercel

**Branch:** `week8/polish-launch`

---

## Task 1: Error Boundaries on All Dashboard Routes

**Files:**
- Create: `src/app/(dashboard)/error.tsx`
- Create: `src/app/(dashboard)/leads/error.tsx`
- Create: `src/app/(dashboard)/inbox/error.tsx`
- Create: `src/app/(dashboard)/billing/error.tsx`

### Steps

- [ ] **1.1 Create root dashboard error boundary**

```tsx
// src/app/(dashboard)/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm text-center">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset} variant="outline">Try again</Button>
    </div>
  );
}
```

- [ ] **1.2 Copy the same error.tsx into leads/, inbox/, and billing/**

The file content is identical for all — Next.js picks the closest `error.tsx` in the tree. No customisation needed at this stage.

```
cp src/app/(dashboard)/error.tsx src/app/(dashboard)/leads/error.tsx
cp src/app/(dashboard)/error.tsx src/app/(dashboard)/inbox/error.tsx
cp src/app/(dashboard)/error.tsx src/app/(dashboard)/billing/error.tsx
```

- [ ] **1.3 Commit**
```
git add src/app/(dashboard)/error.tsx src/app/(dashboard)/leads/error.tsx src/app/(dashboard)/inbox/error.tsx src/app/(dashboard)/billing/error.tsx
git commit -m "feat: add error boundaries to dashboard routes"
```

---

## Task 2: Skeleton Loading States

**Files:**
- Create: `src/components/ui/skeleton-card.tsx`
- Modify: `src/app/(dashboard)/overview/page.tsx`
- Modify: `src/app/(dashboard)/leads/page.tsx`
- Modify: `src/app/(dashboard)/inbox/page.tsx`

### Steps

- [ ] **2.1 Create reusable SkeletonCard component**

```tsx
// src/components/ui/skeleton-card.tsx
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-muted" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-8 rounded bg-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-muted opacity-60" />
      ))}
    </div>
  );
}
```

- [ ] **2.2 Add skeleton to overview/page.tsx**

Replace any `if (!summary) return null` or `if (!summary) return <Spinner />` with:
```tsx
import { SkeletonStatGrid } from "@/components/ui/skeleton-card";

// At the stats render site:
{!summary ? <SkeletonStatGrid count={4} /> : (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {stats.map((s) => <StatCard key={s.label} {...s} />)}
  </div>
)}
```

- [ ] **2.3 Add skeleton to leads/page.tsx**

```tsx
import { SkeletonTable } from "@/components/ui/skeleton-card";

// Replace loading state:
{leads.length === 0 && !loaded ? <SkeletonTable rows={6} /> : /* kanban board */ }
```

Track `loaded` with a `useState(false)` that flips to `true` after `getLeads().then(...)` resolves.

- [ ] **2.4 Add skeleton to inbox/page.tsx**

```tsx
import { SkeletonCard } from "@/components/ui/skeleton-card";

// Conversation list loading state:
{conversations.length === 0 && !loaded ? (
  <div className="space-y-3 p-4">
    {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={2} />)}
  </div>
) : /* real list */ }
```

- [ ] **2.5 Commit**
```
git add src/components/ui/skeleton-card.tsx src/app/(dashboard)/overview/page.tsx src/app/(dashboard)/leads/page.tsx src/app/(dashboard)/inbox/page.tsx
git commit -m "feat: skeleton loading states on overview, leads, and inbox pages"
```

---

## Task 3: Rate Limiting on Public Webhook Routes

**Files:**
- Create: `src/lib/rate-limit.ts`
- Modify: `src/app/api/webhooks/leads/[token]/route.ts`

### Steps

- [ ] **3.1 Create in-memory sliding-window rate limiter**

```ts
// src/lib/rate-limit.ts

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (bucket.count >= limit) return false; // blocked

  bucket.count++;
  return true; // allowed
}
```

- [ ] **3.2 Apply rate limiter to leads webhook route**

At the top of the POST handler in `src/app/api/webhooks/leads/[token]/route.ts`:
```ts
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

// Inside POST handler, before any DB work:
const ip = req.headers.get("x-forwarded-for") ?? "unknown";
const allowed = rateLimit(`leads-webhook:${ip}`, 60, 60_000); // 60 req/min per IP
if (!allowed) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

- [ ] **3.3 Apply rate limiter to WhatsApp webhook route**

Same pattern in `src/app/api/webhooks/whatsapp/route.ts` POST handler:
```ts
const ip = req.headers.get("x-forwarded-for") ?? "unknown";
if (!rateLimit(`wa-webhook:${ip}`, 120, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

- [ ] **3.4 Commit**
```
git add src/lib/rate-limit.ts src/app/api/webhooks/leads/[token]/route.ts src/app/api/webhooks/whatsapp/route.ts
git commit -m "feat: in-memory rate limiting on public webhook routes (60/min leads, 120/min WhatsApp)"
```

---

## Task 4: Sentry Error Monitoring

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `next.config.js` — wrap with `withSentryConfig`
- Modify: `.env.example` — add SENTRY_DSN

### Steps

- [ ] **4.1 Install Sentry**
```
npm install @sentry/nextjs
```

- [ ] **4.2 Create sentry.client.config.ts**

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

- [ ] **4.3 Create sentry.server.config.ts**

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

- [ ] **4.4 Create sentry.edge.config.ts**

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

- [ ] **4.5 Wrap next.config.js with withSentryConfig**

Read `next.config.js` and wrap the export:
```js
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  // existing config
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
```

- [ ] **4.6 Add Sentry env vars to .env.example**
```
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=automate-os
SENTRY_AUTH_TOKEN=...
```

- [ ] **4.7 Commit**
```
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts next.config.js .env.example package.json package-lock.json
git commit -m "feat: Sentry error monitoring wired for client, server, and edge runtimes"
```

---

## Task 5: Mobile Responsiveness Audit

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/app/(dashboard)/leads/page.tsx`
- Modify: `src/app/(dashboard)/inbox/page.tsx`

### Steps

- [ ] **5.1 Add mobile sidebar toggle**

In `Sidebar.tsx`, ensure the sidebar collapses on small screens:
```tsx
// Add state for mobile open/close
const [mobileOpen, setMobileOpen] = useState(false);

// Wrap nav in:
<aside className={`
  fixed inset-y-0 left-0 z-50 w-64 bg-background border-r
  transform transition-transform duration-200
  ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
  md:relative md:translate-x-0 md:block
`}>
  {/* nav content */}
</aside>

// Mobile toggle button (rendered outside aside, in the header):
<button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
  <MenuIcon className="h-5 w-5" />
</button>
```

- [ ] **5.2 Fix leads Kanban board on mobile**

The Kanban columns are likely `flex-row` which overflows on mobile. Wrap columns:
```tsx
<div className="flex flex-col md:flex-row gap-4 overflow-x-auto pb-4">
  {/* kanban columns */}
</div>
```

Each column:
```tsx
<div className="min-w-[260px] md:min-w-0 md:flex-1">
```

- [ ] **5.3 Fix inbox split-pane on mobile**

The inbox likely has a conversation list + chat pane side by side. On mobile show only one at a time:
```tsx
<div className="flex h-full">
  <div className={`w-full md:w-72 border-r ${selectedConv ? "hidden md:block" : "block"}`}>
    {/* conversation list */}
  </div>
  <div className={`flex-1 ${selectedConv ? "block" : "hidden md:block"}`}>
    {/* chat pane */}
  </div>
</div>
```

Add a back button in the chat pane header for mobile:
```tsx
<button className="md:hidden mr-2" onClick={() => setSelectedConv(null)}>
  <ArrowLeftIcon className="h-5 w-5" />
</button>
```

- [ ] **5.4 Commit**
```
git add src/components/layout/Sidebar.tsx src/app/(dashboard)/leads/page.tsx src/app/(dashboard)/inbox/page.tsx
git commit -m "fix: mobile sidebar toggle, Kanban overflow, inbox split-pane for small screens"
```

---

## Task 6: Environment Variable Validation at Startup

**Files:**
- Create: `src/lib/env.ts`
- Modify: `src/app/layout.tsx` — import env validation

### Steps

- [ ] **6.1 Create env.ts validator**

```ts
// src/lib/env.ts
const REQUIRED_SERVER = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const OPTIONAL_WARN = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
];

export function validateEnv() {
  if (typeof window !== "undefined") return; // client — skip

  const missing = REQUIRED_SERVER.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const missingOpt = OPTIONAL_WARN.filter((k) => !process.env[k]);
  if (missingOpt.length) {
    console.warn("[env] Optional vars not set (some features disabled):", missingOpt.join(", "));
  }
}
```

- [ ] **6.2 Call validateEnv() in root layout**

In `src/app/layout.tsx`, add at the top of the file (outside the component, runs at import time on the server):
```ts
import { validateEnv } from "@/lib/env";
validateEnv();
```

- [ ] **6.3 Commit**
```
git add src/lib/env.ts src/app/layout.tsx
git commit -m "feat: validate required environment variables at server startup"
```

---

## Task 7: Production Deployment Checklist

**Files:**
- Create: `docs/DEPLOY.md`

### Steps

- [ ] **7.1 Write deployment checklist**

```markdown
# Production Deployment Checklist

## Environment Variables (Vercel → Settings → Environment Variables)

### Required
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NEXT_PUBLIC_APP_URL (e.g. https://app.yourdomain.com)

### Stripe (Week 5)
- [ ] STRIPE_SECRET_KEY (sk_live_...)
- [ ] STRIPE_WEBHOOK_SECRET (whsec_...)
- [ ] STRIPE_PRICE_STARTER
- [ ] STRIPE_PRICE_GROWTH
- [ ] STRIPE_PRICE_PRO
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...)

### WhatsApp (Week 3)
- [ ] WHATSAPP_VERIFY_TOKEN
- [ ] WHATSAPP_APP_SECRET

### AI (Week 7)
- [ ] ANTHROPIC_API_KEY or GEMINI_API_KEY

### Monitoring (Week 8)
- [ ] NEXT_PUBLIC_SENTRY_DSN
- [ ] SENTRY_AUTH_TOKEN
- [ ] SENTRY_ORG
- [ ] SENTRY_PROJECT

### n8n (Week 2)
- [ ] N8N_API_URL
- [ ] N8N_API_KEY
- [ ] N8N_WEBHOOK_SECRET

## Supabase Setup
- [ ] Run `supabase/schema.sql` in SQL editor (all migrations applied)
- [ ] `daily_lead_counts` function created (Week 7)
- [ ] `deduct_credits` RPC function created (Week 1)
- [ ] RLS enabled on all tables
- [ ] Storage bucket `org-assets` created with public read policy (Week 6)
- [ ] Auth redirect URLs set to production domain

## Stripe Setup
- [ ] Webhook endpoint registered: `https://<domain>/api/webhooks/stripe`
- [ ] Events subscribed: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## WhatsApp Setup
- [ ] Webhook URL registered: `https://<domain>/api/webhooks/whatsapp`
- [ ] Verify token matches `WHATSAPP_VERIFY_TOKEN`

## Vercel Deployment
- [ ] Connect GitHub repo to Vercel project
- [ ] Root directory: `app` (if monorepo)
- [ ] Build command: `npm run build`
- [ ] Output: `.next`
- [ ] Node.js 20.x runtime

## Final Checks
- [ ] `npm run build` succeeds locally with 0 errors
- [ ] `npm test` passes all tests
- [ ] Sign up → onboarding flow works end-to-end in staging
- [ ] Stripe test checkout completes and subscription row appears in DB
- [ ] WhatsApp test message appears in inbox
- [ ] AI assistant returns a response
- [ ] Error boundary shows on simulated crash (add `throw new Error("test")` temporarily)
- [ ] Mobile layout checked on iPhone SE size (375px wide)
```

- [ ] **7.2 Commit**
```
git add docs/DEPLOY.md
git commit -m "docs: production deployment checklist"
```

---

## Task 8: Final Test Pass + PR

**Files:**
- No new files

### Steps

- [ ] **8.1 Run full test suite**
```
npm test
```
Expected: all tests PASS with 0 failures.

- [ ] **8.2 Run TypeScript check**
```
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **8.3 Run production build**
```
npm run build
```
Expected: successful build, 0 errors.

- [ ] **8.4 Create PR**
```
gh pr create \
  --title "feat: Week 8 — Polish, error boundaries, rate limiting, Sentry, mobile fixes, launch checklist" \
  --body "Completes production readiness: error boundaries on all dashboard routes, skeleton loaders, in-memory rate limiting on public webhooks, Sentry integration, mobile responsiveness fixes, env validation, and deployment checklist." \
  --base main
```

---

## Week 8 Done Criteria
- [ ] Every dashboard route shows a friendly error page on crash (not a blank screen)
- [ ] Overview, leads, and inbox show skeletons while data loads
- [ ] Leads webhook returns 429 after >60 req/min from same IP
- [ ] Sentry DSN set + `@sentry/nextjs` installed; error boundaries report to Sentry
- [ ] Sidebar collapses on mobile; inbox and Kanban are usable at 375px
- [ ] `npm run build` + `npm test` both pass with 0 errors
- [ ] DEPLOY.md checklist reviewed and all items ticked before go-live
