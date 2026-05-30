# Internal Logic — Core Systems Reference

> **IMPORTANT FOR ALL WEEKS:** This file defines the real internal logic that powers AutomateOS.
> Every week plan that touches messaging, analytics, AI, or automation MUST implement the
> relevant section here BEFORE wiring the UI. Do not skip to the UI layer until the
> underlying logic in this file is in place for that week.
>
> Each section is tagged with the week it belongs to. When executing a week plan,
> check this file first and complete the tagged sections before the week's UI tasks.

---

## Quick Reference — Which Week Implements What

| Section | Implement In | Files |
|---------|-------------|-------|
| Outbound message sending (WhatsApp) | **Week 3** | `src/lib/comms/index.ts` |
| Outbound message sending (Telegram) | **Week 3** | `src/lib/comms/telegram.ts` |
| Inbox reply route + UI | **Week 3** | `src/app/api/conversations/[id]/messages/route.ts` |
| Analytics event writes | **Week 2** | `src/lib/analytics.ts`, `src/app/api/comms/send/route.ts` |
| n8n workflow templates | **Week 4** | `n8n/workflows/` |
| Lead scoring trigger | **Week 4** | `src/app/api/webhooks/n8n/route.ts` |
| Follow-up sequence trigger | **Week 4** | `src/app/api/trigger/[action]/route.ts` |
| Credit deduction on send | **Week 3** | `src/app/api/comms/send/route.ts` |
| Comms send route (full) | **Week 3** | `src/app/api/comms/send/route.ts` |

---

## Section 1 — Outbound Messaging (Week 3)

### 1A. WhatsApp Business Cloud API

`src/lib/comms/index.ts` must actually call the Meta Graph API.
Implement this BEFORE wiring the inbox send button in Week 3.

```ts
// src/lib/comms/index.ts
export interface SendMessageOptions {
  to: string;           // recipient phone number e.g. "+919876543210"
  body: string;         // plain text body
  channel: "whatsapp" | "telegram";
  phoneNumberId?: string; // WhatsApp phone_number_id from org_channels
  botToken?: string;      // Telegram bot token from org_channels
  chatId?: string;        // Telegram chat_id
}

export interface SendResult {
  ok: boolean;
  provider_message_id?: string;
  error?: string;
}

export async function sendMessage(opts: SendMessageOptions): Promise<SendResult> {
  if (opts.channel === "whatsapp") return sendWhatsApp(opts);
  if (opts.channel === "telegram") return sendTelegram(opts);
  return { ok: false, error: `Unsupported channel: ${opts.channel}` };
}

async function sendWhatsApp(opts: SendMessageOptions): Promise<SendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = opts.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("[comms] WhatsApp env vars not set — message not sent");
    return { ok: false, error: "WhatsApp not configured" };
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to.replace(/\D/g, ""), // strip non-digits
        type: "text",
        text: { body: opts.body },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data?.error?.message ?? "WhatsApp API error" };
  }
  return { ok: true, provider_message_id: data?.messages?.[0]?.id };
}
```

**Add to `.env.example`:**
```
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
```

---

### 1B. Telegram Bot API

```ts
// append to src/lib/comms/index.ts (or keep in src/lib/comms/telegram.ts)
async function sendTelegram(opts: SendMessageOptions): Promise<SendResult> {
  const token = opts.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = opts.chatId;

  if (!token || !chatId) {
    return { ok: false, error: "Telegram not configured or chat_id missing" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: opts.body }),
  });

  const data = await res.json();
  if (!data.ok) {
    return { ok: false, error: data.description ?? "Telegram API error" };
  }
  return { ok: true, provider_message_id: String(data.result?.message_id) };
}
```

**Add to `.env.example`:**
```
TELEGRAM_BOT_TOKEN=123456:ABC-xxxx
```

---

## Section 2 — Comms Send Route (Full Implementation) (Week 3)

`src/app/api/comms/send/route.ts` is the single outbound message gateway.
This must tie together: auth guard → credit check → send → deduct credits → persist message → write analytics event.

```ts
// src/app/api/comms/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendMessage } from "@/lib/comms/index";
import { trackEvent } from "@/lib/analytics";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  // 1. Auth guard
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  const orgId = profile?.organization_id as string;
  if (!orgId) return NextResponse.json({ ok: false, error: "No org" }, { status: 403 });

  // 2. Parse body
  const body = await req.json().catch(() => ({}));
  const { to, message, channel = "whatsapp", conversation_id, credit_type = "conversation" } = body as {
    to: string;
    message: string;
    channel: "whatsapp" | "telegram";
    conversation_id?: string;
    credit_type?: "conversation" | "broadcast";
  };

  if (!to || !message) {
    return NextResponse.json({ ok: false, error: "to and message are required" }, { status: 400 });
  }

  const admin = svc();

  // 3. Credit balance check (fast pre-check — deductCredits enforces atomically)
  const { data: wallet } = await admin
    .from("wallets").select("conversation_credits,broadcast_credits")
    .eq("organization_id", orgId).single();

  const balance = credit_type === "broadcast"
    ? (wallet?.broadcast_credits ?? 0)
    : (wallet?.conversation_credits ?? 0);

  if (balance < 1) {
    return NextResponse.json(
      { ok: false, error: "Insufficient credits. Please top up your wallet." },
      { status: 402 }
    );
  }

  // 4. Resolve channel credentials from org_channels
  const { data: chanRow } = await admin
    .from("org_channels")
    .select("phone_number_id, bot_token, chat_id")
    .eq("organization_id", orgId)
    .eq("provider", channel)
    .eq("status", "active")
    .single();

  // 5. Send the message
  const result = await sendMessage({
    to,
    body: message,
    channel,
    phoneNumberId: chanRow?.phone_number_id ?? undefined,
    botToken: chanRow?.bot_token ?? undefined,
    chatId: chanRow?.chat_id ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  // 6. Deduct credits (atomic RPC)
  await admin.rpc("deduct_credits", {
    p_org_id: orgId,
    p_credit_type: credit_type,
    p_amount: 1,
    p_description: `${channel} message to ${to}`,
    p_reference_id: result.provider_message_id ?? null,
  });

  // 7. Persist outbound message to DB
  if (conversation_id) {
    await admin.from("messages").insert({
      conversation_id,
      organization_id: orgId,
      direction: "outbound",
      channel,
      body: message,
      wa_message_id: result.provider_message_id ?? null,
      status: "sent",
    });
  }

  // 8. Track analytics event
  await trackEvent(orgId, "message_sent", { channel, credit_type });

  return NextResponse.json({ ok: true, message_id: result.provider_message_id });
}
```

---

## Section 3 — Inbox Reply Route + UI (Week 3)

### 3A. Reply API Route

```ts
// src/app/api/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json().catch(() => ({}));
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // Resolve conversation → contact phone + channel
  const { data: conv } = await supabase
    .from("conversations")
    .select("contact_id, channel, organization_id, contacts(phone)")
    .eq("id", ctx.params.id)
    .single();

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const to = (conv.contacts as any)?.phone as string;
  if (!to) return NextResponse.json({ error: "No phone number for contact" }, { status: 400 });

  // Delegate to comms/send which handles credits + sending + persisting
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/comms/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward auth cookie so comms/send can auth the user
      Cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      to,
      message,
      channel: conv.channel,
      conversation_id: ctx.params.id,
      credit_type: "conversation",
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}
```

### 3B. Inbox Reply UI

In `src/app/(dashboard)/inbox/page.tsx`, add a reply input at the bottom of the chat pane:

```tsx
const [replyText, setReplyText] = useState("");
const [sending, setSending] = useState(false);

async function handleSendReply() {
  if (!replyText.trim() || !selectedConv) return;
  setSending(true);
  const res = await fetch(`/api/conversations/${selectedConv.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: replyText }),
  });
  if (res.ok) {
    setReplyText("");
    // Realtime will refresh the conversation list automatically
  } else {
    const { error } = await res.json();
    toast.error(error ?? "Failed to send");
  }
  setSending(false);
}

// JSX at bottom of chat pane:
<div className="border-t p-3 flex gap-2">
  <input
    className="flex-1 rounded-md border px-3 py-2 text-sm"
    placeholder="Type a reply..."
    value={replyText}
    onChange={(e) => setReplyText(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
    disabled={sending}
  />
  <button
    className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
    onClick={handleSendReply}
    disabled={sending || !replyText.trim()}
  >
    Send
  </button>
</div>
```

---

## Section 4 — Analytics Event Tracking (Week 2)

### 4A. Create src/lib/analytics.ts

This is the single function all other modules call to write analytics events.
Implement this in Week 2 before the overview dashboard is built.

```ts
// src/lib/analytics.ts
import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function trackEvent(
  orgId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return; // no-op in demo mode
  try {
    await svc().from("analytics_events").insert({
      organization_id: orgId,
      event,
      properties,
      created_at: new Date().toISOString(),
    });
  } catch {
    // analytics must never crash the caller
  }
}
```

### 4B. Where to Call trackEvent

Call `trackEvent` from these places — implement each call when that feature is built:

| Event name | Call site | Week |
|-----------|-----------|------|
| `lead_created` | `src/app/api/orgs/route.ts` after lead insert | Week 2 |
| `message_sent` | `src/app/api/comms/send/route.ts` on success | Week 3 |
| `message_received` | `src/app/api/webhooks/whatsapp/route.ts` per message | Week 3 |
| `campaign_launched` | `src/app/api/trigger/[action]/route.ts` on `campaign.launch` | Week 4 |
| `subscription_upgraded` | `src/app/api/webhooks/stripe/route.ts` on `checkout.session.completed` | Week 5 |
| `knowledge_article_created` | `src/app/api/knowledge/route.ts` POST | Week 6 |

### 4C. analytics_events table schema (add to supabase/schema.sql in Week 2)

```sql
create table if not exists analytics_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_analytics_events_org_event
  on analytics_events(organization_id, event, created_at desc);
```

---

## Section 5 — n8n Workflow Definitions (Week 4)

n8n workflows are JSON files imported into the n8n UI. Create the folder `n8n/workflows/` and add one file per workflow.

### 5A. Campaign Launch Workflow

Save as `n8n/workflows/campaign-launch.json`. Import into n8n via Settings → Import Workflow.

The workflow receives a webhook from `/api/trigger/campaign.launch`, fetches all contacts for the campaign's audience, and sends a message to each one via `/api/comms/send`.

**n8n nodes (configure in n8n UI):**

1. **Webhook** node — Method: POST, Path: `campaign-launch`, Authentication: Header Auth (`x-n8n-secret` = `N8N_WEBHOOK_SECRET`)
2. **HTTP Request** node — GET `{{$env.APP_URL}}/api/campaigns/{{$json.campaign_id}}/audience` (returns list of contacts with phone numbers)
3. **Split In Batches** node — batch size 1 (loop per contact)
4. **HTTP Request** node — POST `{{$env.APP_URL}}/api/comms/send` body `{ "to": "{{$json.phone}}", "message": "{{$json.template_body}}", "channel": "{{$json.channel}}", "credit_type": "broadcast" }`
5. **HTTP Request** node — POST `{{$env.APP_URL}}/api/webhooks/n8n` body `{ "event": "campaign.delivered", "campaign_id": "{{$json.campaign_id}}" }`

**Add campaign audience endpoint** (needed by the workflow) in Week 4:

```ts
// src/app/api/campaigns/[id]/audience/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ contacts: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();

  // Return all active contacts for this org as the broadcast audience
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, phone, channel")
    .eq("organization_id", profile?.organization_id ?? "")
    .not("phone", "is", null);

  return NextResponse.json({ contacts: contacts ?? [] });
}
```

### 5B. Retargeting Workflow

Save as `n8n/workflows/retargeting.json`.

**n8n nodes:**

1. **Webhook** — POST, Path: `retargeting-run`
2. **HTTP Request** — GET `{{$env.APP_URL}}/api/leads/{{$json.lead_id}}` (get lead phone + channel)
3. **HTTP Request** — POST `{{$env.APP_URL}}/api/comms/send` with a re-engagement message template
4. **HTTP Request** — POST `{{$env.APP_URL}}/api/webhooks/n8n` body `{ "event": "followup.sent", "lead_id": "{{$json.lead_id}}" }`

### 5C. Lead Scoring Workflow

Save as `n8n/workflows/lead-scoring.json`.

Triggered daily via n8n Schedule trigger. For each lead, computes a score based on:
- Days since last contact (recency) — subtract 1 point per 3 days idle
- Channel (WhatsApp = +10 vs email = +5)
- Status (qualified = +20, new = 0, cold = -10)

**n8n nodes:**

1. **Schedule** — every day at 02:00
2. **HTTP Request** — GET `{{$env.APP_URL}}/api/leads` (returns all leads)
3. **Code** node (JS):
```js
const leads = $input.all().map(item => item.json);
return leads.map(lead => {
  let score = 50;
  const daysSinceContact = lead.last_contacted_at
    ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / 86400000)
    : 30;
  score -= Math.floor(daysSinceContact / 3);
  if (lead.channel === "whatsapp") score += 10;
  if (lead.status === "qualified") score += 20;
  if (lead.status === "cold") score -= 10;
  return { json: { lead_id: lead.id, score: Math.max(0, Math.min(100, score)) } };
});
```
4. **HTTP Request** (loop) — POST `{{$env.APP_URL}}/api/webhooks/n8n` body `{ "event": "lead.scored", "lead_id": "{{$json.lead_id}}", "score": {{$json.score}} }`

### 5D. n8n Environment Variables (set in n8n instance Settings → Variables)

```
APP_URL=https://your-app.vercel.app
N8N_WEBHOOK_SECRET=same-value-as-your-env
```

---

## Section 6 — Trigger Route Full Implementation (Week 4)

`src/app/api/trigger/[action]/route.ts` must forward the request to the correct n8n webhook URL.

```ts
// src/app/api/trigger/[action]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics";

const ACTION_WEBHOOK: Record<string, string> = {
  "campaign.launch":   "/webhook/campaign-launch",
  "retargeting.run":  "/webhook/retargeting-run",
  "followup.trigger": "/webhook/followup-trigger",
};

export async function POST(
  req: NextRequest,
  ctx: { params: { action: string } }
) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  const orgId = profile?.organization_id as string;

  const webhookPath = ACTION_WEBHOOK[ctx.params.action];
  if (!webhookPath) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const n8nBase = process.env.N8N_API_URL;
  const secret  = process.env.N8N_WEBHOOK_SECRET ?? "";

  if (!n8nBase) {
    // Demo mode — just acknowledge
    return NextResponse.json({ ok: true, demo: true });
  }

  const body = await req.json().catch(() => ({}));

  const n8nRes = await fetch(`${n8nBase}${webhookPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-n8n-secret": secret,
    },
    body: JSON.stringify({ ...body, organization_id: orgId }),
  });

  if (!n8nRes.ok) {
    const text = await n8nRes.text();
    return NextResponse.json({ error: `n8n error: ${text}` }, { status: 502 });
  }

  await trackEvent(orgId, ctx.params.action, body);

  return NextResponse.json({ ok: true });
}
```

---

## Section 7 — Lead API Endpoint for n8n (Week 4)

n8n's lead scoring workflow needs to GET all leads. Add a server-to-server leads endpoint:

```ts
// src/app/api/leads/route.ts  (GET handler — add alongside existing if file exists)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  // n8n calls this with the webhook secret as a bearer token
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.N8N_WEBHOOK_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data } = await supabase
    .from("leads")
    .select("id, name, status, channel, score, last_contacted_at")
    .eq("organization_id", orgId);

  return NextResponse.json(data ?? []);
}
```

---

## Section 8 — Checklist: Before You Wire Any UI Feature

Use this checklist every time you are about to wire a UI button or page to a backend:

- [ ] Is the API route protected by `supabase.auth.getUser()`?
- [ ] Does the route resolve `organization_id` from the `profiles` table?
- [ ] If the action costs credits — does it call `deduct_credits` RPC after success?
- [ ] If the action sends a message — does it go through `src/app/api/comms/send`?
- [ ] If the action is a meaningful user event — does it call `trackEvent(orgId, ...)`?
- [ ] If the action triggers n8n — does it go through `src/app/api/trigger/[action]`?
- [ ] Is the action reflected in the UI immediately (optimistic update or re-fetch)?
- [ ] Does a failed action show a toast error to the user?

---

## Section 9 — Environment Variables Master List

All variables across all weeks. Populate `.env.local` before running locally.
Populate Vercel environment variables before deploying.

```
# Supabase (required from Week 1)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App URL (required for server-to-server calls)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WhatsApp (Week 3)
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Telegram (Week 3)
TELEGRAM_BOT_TOKEN=

# n8n (Week 4)
N8N_API_URL=https://your-n8n-instance.app.n8n.cloud
N8N_API_KEY=
N8N_WEBHOOK_SECRET=

# Stripe (Week 5)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_PRO=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI providers (Week 7) — at least one required
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# Sentry (Week 8)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```
