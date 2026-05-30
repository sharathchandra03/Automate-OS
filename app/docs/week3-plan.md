# Week 3 Plan — Inbox + Real-time Messaging

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **BEFORE STARTING:** Read `docs/internal-logic.md`. This week implements **Section 1 (Outbound Messaging)**, **Section 2 (Comms Send Route)**, and **Section 3 (Inbox Reply)**. Complete those sections first, then proceed with the tasks below.

**Goal:** WhatsApp Business webhook saves inbound messages to Supabase; the inbox page updates in real-time via Supabase Realtime; agents can open, close, and assign conversations.

**Architecture:** Inbound WhatsApp payloads hit `/api/webhooks/whatsapp` → verified → upserted into `conversations` + `messages`. The inbox page subscribes to `messages` channel via `supabase.channel()`. Conversation actions (assign, close) call Next.js API routes that write to Supabase.

**Tech Stack:** Next.js 14, Supabase Realtime, WhatsApp Business Cloud API (Meta), Zod

**Branch:** `week3/inbox-realtime`

---

## Task 1: WhatsApp Webhook Verification + Message Ingestion

**Files:**
- Modify: `src/app/api/webhooks/whatsapp/route.ts`
- Modify: `supabase/schema.sql` — ensure messages table has needed columns

### Steps

- [ ] **1.1 Add WHATSAPP_VERIFY_TOKEN to .env.example**
```
WHATSAPP_VERIFY_TOKEN=your-verify-token-here
WHATSAPP_APP_SECRET=your-app-secret-here
```

- [ ] **1.2 Rewrite whatsapp webhook route**

```ts
// src/app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Meta webhook verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  // Verify X-Hub-Signature-256
  const body = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const secret = process.env.WHATSAPP_APP_SECRET ?? "";
  if (secret) {
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (sig !== expected) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ ok: true }); }

  const supabase = svc();
  const entries = (payload.entry as any[]) ?? [];
  for (const entry of entries) {
    for (const change of (entry.changes ?? [])) {
      const value = change.value ?? {};
      const wabaId: string = value.metadata?.phone_number_id ?? "";

      // Resolve org from org_channels by waba_id / phone_number_id
      const { data: channel } = await supabase
        .from("org_channels")
        .select("organization_id")
        .eq("phone_number_id", wabaId)
        .single();
      if (!channel) continue;

      const orgId: string = channel.organization_id;
      const messages: any[] = value.messages ?? [];

      for (const msg of messages) {
        const fromPhone: string = msg.from;
        const text: string = msg.type === "text" ? (msg.text?.body ?? "") : `[${msg.type}]`;
        const waMessageId: string = msg.id;

        // Upsert contact
        const { data: contact } = await supabase
          .from("contacts")
          .upsert({ organization_id: orgId, name: fromPhone, phone: fromPhone },
            { onConflict: "organization_id,phone", ignoreDuplicates: false })
          .select("id").single();

        // Upsert conversation
        const { data: conv } = await supabase
          .from("conversations")
          .upsert({
            organization_id: orgId,
            contact_id: contact?.id ?? null,
            channel: "whatsapp",
            status: "open",
            last_message_at: new Date().toISOString(),
          }, { onConflict: "organization_id,contact_id,channel" })
          .select("id").single();

        // Insert message (idempotent by wa_message_id)
        await supabase.from("messages").upsert({
          conversation_id: conv?.id,
          organization_id: orgId,
          direction: "inbound",
          channel: "whatsapp",
          body: text,
          wa_message_id: waMessageId,
          sender_phone: fromPhone,
          status: "delivered",
        }, { onConflict: "wa_message_id", ignoreDuplicates: true });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **1.3 Ensure messages table has wa_message_id column**

In `supabase/schema.sql`, find the `messages` table and add if missing:
```sql
alter table if exists messages add column if not exists wa_message_id text unique;
alter table if exists messages add column if not exists sender_phone text;
```

- [ ] **1.4 Commit**
```
git add src/app/api/webhooks/whatsapp/route.ts supabase/schema.sql
git commit -m "feat: WhatsApp webhook ingests messages into conversations + messages tables"
```

---

## Task 2: Real-time Inbox Page

**Files:**
- Modify: `src/app/(dashboard)/inbox/page.tsx`

### Steps

- [ ] **2.1 Replace mock data load with Supabase query + Realtime subscription**

At top of the `InboxPage` component:
```ts
const supabase = createSupabaseBrowserClient();

useEffect(() => {
  // Initial load
  getConversations().then(setConversations);

  if (!supabase) return;

  // Real-time: re-fetch when a new message arrives in this org
  const channel = supabase
    .channel("inbox-realtime")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
    }, () => {
      getConversations().then(setConversations);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

Import `createSupabaseBrowserClient` from `@/lib/supabase/client`.

- [ ] **2.2 Add conversation actions (assign / close)**

Create `src/app/api/conversations/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();

  const updates = await req.json().catch(() => ({}));
  const allowed = ["status", "assigned_to"];
  const patch = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from("conversations")
    .update(patch)
    .eq("id", ctx.params.id)
    .eq("organization_id", profile?.organization_id ?? "")
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
```

- [ ] **2.3 Wire Close and Assign buttons in inbox/page.tsx**

For the "Close" button:
```ts
async function handleClose(convId: string) {
  await fetch(`/api/conversations/${convId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "closed" }),
  });
  setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: "closed" } : c));
}
```

- [ ] **2.4 Commit**
```
git add src/app/(dashboard)/inbox/page.tsx src/app/api/conversations/
git commit -m "feat: inbox real-time via Supabase Realtime + conversation actions"
```

---

## Task 3: Contacts Page Live Data

**Files:**
- Modify: `src/app/(dashboard)/contacts/page.tsx`
- Modify: `src/app/(dashboard)/contacts/labels/page.tsx`

### Steps

- [ ] **3.1 Wire contacts/page.tsx to getContacts()**

Find the `useEffect` that loads contacts. Replace any `memory.contacts` reference or `seedDemo` call with:
```ts
useEffect(() => {
  getContacts().then(setContacts);
}, []);
```

- [ ] **3.2 Wire contacts/labels/page.tsx to getContactLabels()**

```ts
useEffect(() => {
  getContactLabels().then(setLabels);
}, []);
```

- [ ] **3.3 Wire the export button to exportLabelContacts()**

```ts
async function handleExport(labelId: string) {
  const contacts = await exportLabelContacts(labelId);
  const csv = ["name,phone,email", ...contacts.map((c) =>
    `"${c.name}","${c.phone}","${c.email ?? ""}"`
  )].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "contacts.csv"; a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **3.4 Commit**
```
git add src/app/(dashboard)/contacts/
git commit -m "feat: contacts and labels pages read live data from Supabase"
```

---

## Task 4: Tests — Webhook Message Parsing

**Files:**
- Create: `src/__tests__/whatsapp-webhook.test.ts`

### Steps

- [ ] **4.1 Write unit tests for payload parsing logic**

Extract the message-parsing loop from the webhook route into a pure helper `parseWhatsAppPayload`:

```ts
// src/lib/whatsapp-parser.ts
export interface ParsedMessage {
  wabaId: string;
  fromPhone: string;
  text: string;
  waMessageId: string;
  timestamp: number;
}

export function parseWhatsAppPayload(payload: unknown): ParsedMessage[] {
  const out: ParsedMessage[] = [];
  const entries = (payload as any)?.entry ?? [];
  for (const entry of entries) {
    for (const change of (entry.changes ?? [])) {
      const value = change.value ?? {};
      const wabaId: string = value.metadata?.phone_number_id ?? "";
      for (const msg of (value.messages ?? [])) {
        out.push({
          wabaId,
          fromPhone: msg.from,
          text: msg.type === "text" ? (msg.text?.body ?? "") : `[${msg.type}]`,
          waMessageId: msg.id,
          timestamp: parseInt(msg.timestamp ?? "0", 10),
        });
      }
    }
  }
  return out;
}
```

Then write tests:
```ts
// src/__tests__/whatsapp-webhook.test.ts
import { describe, it, expect } from "vitest";
import { parseWhatsAppPayload } from "@/lib/whatsapp-parser";

const SAMPLE_PAYLOAD = {
  entry: [{
    changes: [{
      value: {
        metadata: { phone_number_id: "123456" },
        messages: [{
          id: "wamid.abc",
          from: "+919876543210",
          type: "text",
          text: { body: "Hello there!" },
          timestamp: "1716000000",
        }],
      },
    }],
  }],
};

describe("parseWhatsAppPayload", () => {
  it("extracts message from valid payload", () => {
    const msgs = parseWhatsAppPayload(SAMPLE_PAYLOAD);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe("Hello there!");
    expect(msgs[0].fromPhone).toBe("+919876543210");
    expect(msgs[0].wabaId).toBe("123456");
  });

  it("returns [] for empty payload", () => {
    expect(parseWhatsAppPayload({})).toHaveLength(0);
    expect(parseWhatsAppPayload(null)).toHaveLength(0);
  });

  it("handles non-text message types", () => {
    const payload = { entry: [{ changes: [{ value: {
      metadata: { phone_number_id: "x" },
      messages: [{ id: "y", from: "+1", type: "image", timestamp: "0" }],
    }}]}]};
    const msgs = parseWhatsAppPayload(payload);
    expect(msgs[0].text).toBe("[image]");
  });
});
```

- [ ] **4.2 Update webhook route to use the helper**

Import and use `parseWhatsAppPayload` in the webhook route.

- [ ] **4.3 Run tests**
```
npm test src/__tests__/whatsapp-webhook.test.ts
```
Expected: 3 tests PASS

- [ ] **4.4 Commit**
```
git add src/lib/whatsapp-parser.ts src/__tests__/whatsapp-webhook.test.ts src/app/api/webhooks/whatsapp/route.ts
git commit -m "feat: extract WhatsApp parser + add tests"
```

---

## Week 3 Done Criteria
- [ ] Sending a test WhatsApp message to the connected number creates a row in `messages` and `conversations`
- [ ] Inbox page shows real conversations and updates without refresh
- [ ] Close conversation sets `status = 'closed'` in DB
- [ ] Contacts page shows real contacts from Supabase
- [ ] `npm test` passes all tests including 3 new WhatsApp parser tests
