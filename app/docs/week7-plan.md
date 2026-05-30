# Week 7 Plan — AI Insights + Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **BEFORE STARTING:** Read `docs/internal-logic.md`. Confirm that `analytics_events` table is populated (Section 4 from Week 2) — the overview dashboard queries it. If not, backfill by adding `trackEvent()` calls to comms/send and lead creation before building the UI.

**Goal:** Overview dashboard shows real aggregated metrics from Supabase; AI assistant gives context-aware answers using live lead/contact data; insights page renders real trend charts; reports page surfaces actionable summaries.

**Architecture:** Overview queries `leads`, `conversations`, `analytics_events`, and `wallets` directly — no intermediate layer. AI assistant calls `/api/ai/chat` which fetches a small context bundle (recent leads, org plan, credit balance) before passing to the LLM. Insights page reuses `getAnalytics()` and adds a server-side trend query for the sparkline data. Reports page is a read-only aggregate view.

**Tech Stack:** Next.js 14, Supabase, Anthropic Messages API (via existing `src/lib/ai/provider.ts`), Recharts (already installed), Zod

**Branch:** `week7/ai-insights-dashboard`

---

## Task 1: Overview Dashboard — Real Data

**Files:**
- Modify: `src/app/(dashboard)/overview/page.tsx`
- Modify: `src/lib/api.ts` — add `getDashboardSummary()`

### Steps

- [ ] **1.1 Add getDashboardSummary() to api.ts**

```ts
export interface DashboardSummary {
  total_leads: number;
  new_leads_7d: number;
  open_conversations: number;
  messages_sent_7d: number;
  conversion_rate: number;
  credit_balance: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!HAS_SUPABASE) {
    return delay({
      total_leads: memory.leads.length,
      new_leads_7d: memory.leads.filter(
        (l) => l.created_at > new Date(Date.now() - 7 * 86400000).toISOString()
      ).length,
      open_conversations: memory.conversations.filter((c) => c.status === "open").length,
      messages_sent_7d: 0,
      conversion_rate: 0,
      credit_balance: memory.wallet.conversation_credits,
    });
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Not connected");
  const orgId = await getOrgId(supabase);
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  const [leadsAll, leadsNew, convOpen, msgSent, wallet] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).gte("created_at", since7d),
    supabase.from("conversations").select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).eq("status", "open"),
    supabase.from("messages").select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).eq("direction", "outbound").gte("created_at", since7d),
    supabase.from("wallets").select("conversation_credits").eq("organization_id", orgId).single(),
  ]);

  const total = leadsAll.count ?? 0;
  const newL  = leadsNew.count ?? 0;
  const converted = (await supabase
    .from("leads").select("id", { count: "exact", head: true })
    .eq("organization_id", orgId).eq("status", "converted")).count ?? 0;

  return {
    total_leads: total,
    new_leads_7d: newL,
    open_conversations: convOpen.count ?? 0,
    messages_sent_7d: msgSent.count ?? 0,
    conversion_rate: total > 0 ? Math.round((converted / total) * 100) : 0,
    credit_balance: (wallet.data?.conversation_credits as number) ?? 0,
  };
}
```

- [ ] **1.2 Replace hardcoded constants in overview/page.tsx**

Find any `MESSAGING_MOCK`, `CHATBOT_MOCK`, or static stat arrays at the top of the component. Replace with:

```ts
const [summary, setSummary] = useState<DashboardSummary | null>(null);

useEffect(() => {
  getDashboardSummary().then(setSummary);
}, []);
```

Map the stat cards:
```ts
const stats = summary
  ? [
      { label: "Total Leads",        value: summary.total_leads,        delta: `+${summary.new_leads_7d} this week` },
      { label: "Open Conversations",  value: summary.open_conversations,  delta: "" },
      { label: "Messages Sent (7d)",  value: summary.messages_sent_7d,    delta: "" },
      { label: "Conversion Rate",     value: `${summary.conversion_rate}%`, delta: "" },
    ]
  : [];
```

Show a loading skeleton when `summary === null`:
```ts
if (!summary) return (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
    ))}
  </div>
);
```

- [ ] **1.3 Commit**
```
git add src/lib/api.ts src/app/(dashboard)/overview/page.tsx
git commit -m "feat: overview dashboard reads real aggregated metrics from Supabase"
```

---

## Task 2: Insights Page — Real Trend Data

**Files:**
- Modify: `src/app/(dashboard)/overview/page.tsx` or `src/app/(dashboard)/insights/page.tsx`
- Create: `src/app/api/insights/trends/route.ts`

### Steps

- [ ] **2.1 Create /api/insights/trends GET route**

```ts
// src/app/api/insights/trends/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ trends: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  const orgId = profile?.organization_id ?? "";

  // Build daily lead count for the last 30 days
  const { data } = await supabase.rpc("daily_lead_counts", { p_org_id: orgId, p_days: 30 });

  return NextResponse.json({ trends: data ?? [] });
}
```

- [ ] **2.2 Add daily_lead_counts SQL function to schema.sql**

```sql
-- ============== Insights helpers ==============

create or replace function daily_lead_counts(p_org_id uuid, p_days int default 30)
returns table(day date, count bigint)
language sql stable security definer as $$
  select
    date_trunc('day', created_at)::date as day,
    count(*) as count
  from leads
  where organization_id = p_org_id
    and created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1;
$$;
```

Run in Supabase SQL editor.

- [ ] **2.3 Wire insights page to the trends endpoint**

In the insights/overview page that shows sparklines or bar charts:
```ts
const [trends, setTrends] = useState<{ day: string; count: number }[]>([]);

useEffect(() => {
  fetch("/api/insights/trends")
    .then((r) => r.json())
    .then((d) => setTrends(d.trends ?? []));
}, []);
```

Pass `trends` to the Recharts `<BarChart>` or `<LineChart>` already in the page — replace the hardcoded `data` prop.

- [ ] **2.4 Commit**
```
git add src/app/api/insights/ src/app/(dashboard)/overview/page.tsx
git commit -m "feat: insights trends endpoint + chart reads real 30-day lead data"
```

---

## Task 3: AI Assistant — Context-Aware Chat

**Files:**
- Create: `src/app/api/ai/chat/route.ts`
- Modify: `src/app/(dashboard)/ai-assistant/page.tsx`
- Modify: `src/components/ai/AIAssistantWidget.tsx`

### Steps

- [ ] **3.1 Create /api/ai/chat route**

```ts
// src/app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, history = [] } = await req.json().catch(() => ({ message: "", history: [] }));
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  const orgId = profile?.organization_id ?? "";

  // Fetch minimal context bundle
  const [leadsRes, walletRes, subRes] = await Promise.all([
    supabase.from("leads").select("name,status,score,channel").eq("organization_id", orgId)
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("wallets").select("conversation_credits,broadcast_credits").eq("organization_id", orgId).single(),
    supabase.from("subscriptions").select("plan,status").eq("organization_id", orgId).single(),
  ]);

  const context = {
    recent_leads: leadsRes.data ?? [],
    wallet: walletRes.data ?? { conversation_credits: 0, broadcast_credits: 0 },
    plan: subRes.data?.plan ?? "free",
  };

  const systemPrompt = buildSystemPrompt(context);
  const provider = getProvider();
  const reply = await provider(systemPrompt, [...history, { role: "user", content: message }]);

  return NextResponse.json({ reply });
}
```

- [ ] **3.2 Update buildSystemPrompt in src/lib/ai/prompts.ts to accept context**

```ts
// Add overload that takes a context object
export function buildSystemPrompt(context?: {
  recent_leads?: { name: string; status: string; score: number; channel: string }[];
  wallet?: { conversation_credits: number; broadcast_credits: number };
  plan?: string;
}): string {
  const base = `You are an AI assistant for AutomateOS, a CRM and automation platform.
Help the user understand their leads, conversations, and automation performance.
Be concise and actionable.`;

  if (!context) return base;

  const leadsSnippet = context.recent_leads?.length
    ? `\n\nRecent leads (last 10): ${JSON.stringify(context.recent_leads)}`
    : "";
  const walletSnippet = context.wallet
    ? `\n\nCredit balance — conversation: ${context.wallet.conversation_credits}, broadcast: ${context.wallet.broadcast_credits}`
    : "";
  const planSnippet = context.plan ? `\n\nCurrent plan: ${context.plan}` : "";

  return base + leadsSnippet + walletSnippet + planSnippet;
}
```

- [ ] **3.3 Wire ai-assistant page to /api/ai/chat**

Find the existing `handleSend` or `handleSubmit` in `ai-assistant/page.tsx`. Replace the mock response with:
```ts
async function handleSend(message: string) {
  setMessages((prev) => [...prev, { role: "user", content: message }]);
  setLoading(true);
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  const { reply } = await res.json();
  setMessages((prev) => [...prev, { role: "assistant", content: reply ?? "Sorry, something went wrong." }]);
  setLoading(false);
}
```

- [ ] **3.4 Wire AIAssistantWidget to same endpoint**

In `AIAssistantWidget.tsx`, replace any mock `callAI()` or hardcoded reply with the same `fetch("/api/ai/chat", ...)` pattern from step 3.3.

- [ ] **3.5 Commit**
```
git add src/app/api/ai/ src/lib/ai/prompts.ts src/app/(dashboard)/ai-assistant/page.tsx src/components/ai/AIAssistantWidget.tsx
git commit -m "feat: AI assistant sends real LLM requests with live lead context"
```

---

## Task 4: Reports Page — Aggregate Summaries

**Files:**
- Modify: `src/app/(dashboard)/overview/page.tsx` or the reports section within it
- Create: `src/app/api/reports/summary/route.ts`

### Steps

- [ ] **4.1 Create /api/reports/summary GET**

```ts
// src/app/api/reports/summary/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ data: null });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  const orgId = profile?.organization_id ?? "";

  const [byStatus, byChannel, topLeads] = await Promise.all([
    supabase.from("leads").select("status").eq("organization_id", orgId),
    supabase.from("leads").select("channel").eq("organization_id", orgId),
    supabase.from("leads").select("name,score,status,channel")
      .eq("organization_id", orgId).order("score", { ascending: false }).limit(5),
  ]);

  // Group by status
  const statusCounts: Record<string, number> = {};
  for (const row of byStatus.data ?? []) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  // Group by channel
  const channelCounts: Record<string, number> = {};
  for (const row of byChannel.data ?? []) {
    channelCounts[row.channel] = (channelCounts[row.channel] ?? 0) + 1;
  }

  return NextResponse.json({
    status_breakdown: statusCounts,
    channel_breakdown: channelCounts,
    top_leads: topLeads.data ?? [],
  });
}
```

- [ ] **4.2 Wire reports page to /api/reports/summary**

In the reports section (whatever page surfaces report data):
```ts
const [report, setReport] = useState<{
  status_breakdown: Record<string, number>;
  channel_breakdown: Record<string, number>;
  top_leads: { name: string; score: number; status: string; channel: string }[];
} | null>(null);

useEffect(() => {
  fetch("/api/reports/summary")
    .then((r) => r.json())
    .then(setReport);
}, []);
```

Render `status_breakdown` as a pie/donut chart using Recharts `<PieChart>`. Render `top_leads` as a ranked table.

- [ ] **4.3 Commit**
```
git add src/app/api/reports/ src/app/(dashboard)/
git commit -m "feat: reports page shows real status breakdown and top leads from Supabase"
```

---

## Task 5: Tests — AI Chat Route

**Files:**
- Create: `src/__tests__/ai-chat.test.ts`
- Create: `src/lib/ai/prompts.test.ts`

### Steps

- [ ] **5.1 Write prompt-builder tests**

```ts
// src/lib/ai/prompts.test.ts
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/prompts";

describe("buildSystemPrompt", () => {
  it("returns base prompt when no context", () => {
    const p = buildSystemPrompt();
    expect(p).toContain("AutomateOS");
  });

  it("includes lead data when provided", () => {
    const p = buildSystemPrompt({
      recent_leads: [{ name: "Alice", status: "new", score: 80, channel: "whatsapp" }],
    });
    expect(p).toContain("Alice");
  });

  it("includes plan in prompt", () => {
    const p = buildSystemPrompt({ plan: "growth" });
    expect(p).toContain("growth");
  });
});
```

- [ ] **5.2 Run prompt tests**
```
npm test src/lib/ai/prompts.test.ts
```
Expected: 3 tests PASS

- [ ] **5.3 Commit**
```
git add src/lib/ai/prompts.test.ts
git commit -m "test: AI prompt builder unit tests"
```

---

## Week 7 Done Criteria
- [ ] Overview stats cards show numbers from real Supabase queries (not constants)
- [ ] Insights/overview chart renders 30-day lead trend from DB
- [ ] AI assistant returns actual LLM-generated reply referencing real lead data
- [ ] Reports page shows status breakdown pie chart from real data
- [ ] `npm test` passes all tests
