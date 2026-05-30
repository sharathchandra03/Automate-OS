# Week 5 Plan — Billing + Stripe

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **BEFORE STARTING:** Read `docs/internal-logic.md` — specifically **Section 8 (pre-wire checklist)** and **Section 9 (env vars)**. Add Stripe env vars from Section 9 to your `.env.local` before starting Task 1.

**Goal:** Stripe checkout creates real subscriptions, a webhook updates the `subscriptions` table, plan limits are enforced on credit deduction and API calls, and the billing page shows live metering from real DB data.

**Architecture:** Stripe Checkout (hosted page) for upgrades. Stripe webhooks update `subscriptions` table via service-role client. `deductCredits` RPC already exists — add plan-limit check before calling it. Billing page queries `wallets` + `credit_transactions` directly via `getWallet()` and `getCreditTransactions()`.

**Tech Stack:** Next.js 14, Supabase, Stripe SDK (`stripe` + `@stripe/stripe-js`), Zod

**Branch:** `week5/billing-stripe`

---

## Task 1: Stripe Setup + Schema

**Files:**
- Modify: `supabase/schema.sql` — add `subscriptions` table
- Modify: `.env.example` — Stripe keys

### Steps

- [ ] **1.1 Install Stripe SDK**
```
npm install stripe @stripe/stripe-js
```

- [ ] **1.2 Add Stripe env vars to .env.example**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_PRO=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- [ ] **1.3 Add subscriptions table to schema.sql**

```sql
-- ============== Subscriptions ==============

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free','starter','growth','pro')),
  status text not null default 'active' check (status in ('active','past_due','canceled','trialing')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_org on subscriptions(organization_id);
create index if not exists idx_subscriptions_stripe on subscriptions(stripe_subscription_id);
```

Also add a `plan` column to `organizations` as a denormalized fast lookup:
```sql
alter table if exists organizations add column if not exists plan text not null default 'free';
```

Run in Supabase SQL editor.

- [ ] **1.4 Create Stripe singleton helper**

Create `src/lib/stripe.ts`:
```ts
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

export const PLAN_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? "",
  growth:  process.env.STRIPE_PRICE_GROWTH  ?? "",
  pro:     process.env.STRIPE_PRICE_PRO     ?? "",
};
```

- [ ] **1.5 Commit**
```
git add supabase/schema.sql src/lib/stripe.ts .env.example package.json package-lock.json
git commit -m "feat: add subscriptions table + Stripe singleton"
```

---

## Task 2: Stripe Checkout Endpoint

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`
- Create: `src/app/api/billing/portal/route.ts`

### Steps

- [ ] **2.1 Create checkout route**

```ts
// src/app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe, PLAN_PRICES } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({}));
  const priceId = PLAN_PRICES[plan as string];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: "No org" }, { status: 403 });

  const stripe = getStripe();

  // Get or create Stripe customer
  const { data: sub } = await supabase
    .from("subscriptions").select("stripe_customer_id")
    .eq("organization_id", profile.organization_id).single();

  let customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { organization_id: profile.organization_id },
    });
    customerId = customer.id;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    metadata: { organization_id: profile.organization_id, plan },
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **2.2 Create customer portal route**

```ts
// src/app/api/billing/portal/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();

  const { data: sub } = await supabase
    .from("subscriptions").select("stripe_customer_id")
    .eq("organization_id", profile?.organization_id ?? "").single();

  if (!sub?.stripe_customer_id) return NextResponse.json({ error: "No Stripe customer" }, { status: 404 });

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id as string,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **2.3 Commit**
```
git add src/app/api/billing/
git commit -m "feat: Stripe checkout + customer portal routes"
```

---

## Task 3: Stripe Webhook Handler

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

### Steps

- [ ] **3.1 Create Stripe webhook route**

```ts
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function planFromPriceId(priceId: string): string {
  const { STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_PRO } = process.env;
  if (priceId === STRIPE_PRICE_STARTER) return "starter";
  if (priceId === STRIPE_PRICE_GROWTH)  return "growth";
  if (priceId === STRIPE_PRICE_PRO)     return "pro";
  return "free";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = svc();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as { metadata?: Record<string, string>; customer?: string; subscription?: string };
      const orgId = session.metadata?.organization_id;
      const plan  = session.metadata?.plan ?? "starter";
      if (!orgId) break;

      await supabase.from("subscriptions").upsert({
        organization_id: orgId,
        stripe_customer_id: session.customer ?? null,
        stripe_subscription_id: session.subscription ?? null,
        plan,
        status: "active",
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });

      await supabase.from("organizations").update({ plan }).eq("id", orgId);
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as {
        id: string; status: string; cancel_at_period_end: boolean;
        current_period_end: number; items: { data: { price: { id: string } }[] };
      };
      const priceId = sub.items.data[0]?.price.id ?? "";
      const plan = event.type === "customer.subscription.deleted" ? "free" : planFromPriceId(priceId);

      await supabase.from("subscriptions").update({
        plan,
        status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("stripe_subscription_id", sub.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as { subscription?: string };
      if (invoice.subscription) {
        await supabase.from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", invoice.subscription);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **3.2 Commit**
```
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat: Stripe webhook updates subscriptions table on payment events"
```

---

## Task 4: Billing Page — Live Data

**Files:**
- Modify: `src/app/(dashboard)/billing/page.tsx`

### Steps

- [ ] **4.1 Replace hardcoded seedDemoMetering with real API calls**

```ts
// Remove: seedDemoMetering("org_demo"), seedDemoUsage("org_demo"), const TENANT = "org_demo"

const [wallet, setWallet] = useState<Wallet | null>(null);
const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
const [plan, setPlan] = useState<string>("free");

useEffect(() => {
  getWallet().then(setWallet);
  getCreditTransactions().then(setTransactions);
  fetch("/api/billing/subscription")
    .then((r) => r.json())
    .then((d) => setPlan(d.plan ?? "free"));
}, []);
```

- [ ] **4.2 Create GET /api/billing/subscription**

```ts
// src/app/api/billing/subscription/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ plan: "free" });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ plan: "free" });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();

  const { data } = await supabase
    .from("subscriptions").select("plan, status, current_period_end, cancel_at_period_end")
    .eq("organization_id", profile?.organization_id ?? "").single();

  return NextResponse.json(data ?? { plan: "free" });
}
```

- [ ] **4.3 Wire Upgrade buttons**

```ts
async function handleUpgrade(targetPlan: string) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: targetPlan }),
  });
  const { url } = await res.json();
  if (url) window.location.href = url;
}

async function handleManage() {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const { url } = await res.json();
  if (url) window.location.href = url;
}
```

- [ ] **4.4 Commit**
```
git add src/app/(dashboard)/billing/page.tsx src/app/api/billing/subscription/route.ts
git commit -m "feat: billing page shows live wallet, transactions, and plan from Supabase + Stripe"
```

---

## Task 5: Plan Limit Enforcement

**Files:**
- Modify: `src/app/api/comms/send/route.ts` — check plan before sending

### Steps

- [ ] **5.1 Add plan limits constant**

Create `src/lib/plan-limits.ts`:
```ts
export const PLAN_LIMITS = {
  free:    { conversation_credits: 100,  broadcast_credits: 0   },
  starter: { conversation_credits: 1000, broadcast_credits: 500  },
  growth:  { conversation_credits: 5000, broadcast_credits: 2000 },
  pro:     { conversation_credits: 99999, broadcast_credits: 9999 },
} as const;
```

- [ ] **5.2 Enforce in comms/send route**

After the auth guard in `src/app/api/comms/send/route.ts`, add:
```ts
// Check wallet has credits before sending (deductCredits already enforces atomically,
// but this gives a clear 402 before incurring any cost)
const wallet = await getWallet();
const balance = creditType === "conversation"
  ? wallet.conversation_credits
  : wallet.broadcast_credits;
if (balance < 1) {
  return NextResponse.json(
    { ok: false, error: "Insufficient credits. Please top up your wallet." },
    { status: 402 }
  );
}
```

- [ ] **5.3 Commit**
```
git add src/lib/plan-limits.ts src/app/api/comms/send/route.ts
git commit -m "feat: enforce credit balance before sending messages"
```

---

## Week 5 Done Criteria
- [ ] Clicking Upgrade on billing page redirects to Stripe Checkout
- [ ] Completing payment creates a row in `subscriptions` table
- [ ] Billing page shows real `conversation_credits` and `broadcast_credits` from wallet
- [ ] Canceling via portal sets `cancel_at_period_end = true` in DB
- [ ] Sending a message with zero credits returns 402
