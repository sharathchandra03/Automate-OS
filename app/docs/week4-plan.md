# Week 4 Plan — Campaigns + Automation

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **BEFORE STARTING:** Read `docs/internal-logic.md`. This week implements **Section 5 (n8n Workflow Definitions)**, **Section 6 (Trigger Route)**, and **Section 7 (Leads API for n8n)**. Complete those sections before wiring the campaign launch and retargeting buttons.

**Goal:** Campaign builder persists to Supabase, n8n workflow templates are deployable, retargeting and follow-up sequences are triggered from real lead data, and the leads pipeline board reads live data.

**Architecture:** Campaigns write to the `campaigns` table. Launching a campaign calls `POST /api/trigger/campaign.launch` which fires the n8n workflow. n8n calls back via `/api/webhooks/n8n` (already wired) to update `automation_runs`. Leads pipeline is a Kanban board driven by `getLeads()` grouped by status.

**Tech Stack:** Next.js 14, Supabase, n8n Cloud/self-hosted, Zod

**Branch:** `week4/campaigns-automation`

---

## Task 1: Campaigns Page — Live Data

**Files:**
- Modify: `src/app/(dashboard)/campaigns/page.tsx`
- Modify: `src/lib/api.ts` — verify getCampaigns / createCampaign Supabase paths exist

### Steps

- [ ] **1.1 Verify getCampaigns Supabase path in api.ts**

Search for `getCampaigns` in `src/lib/api.ts`. If the function only returns `delay(memory.campaigns)` with no `HAS_SUPABASE` branch, add:

```ts
export async function getCampaigns(): Promise<Campaign[]> {
  if (!HAS_SUPABASE) return delay([...memory.campaigns]);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([...memory.campaigns]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Campaign[];
}
```

- [ ] **1.2 Wire campaigns/page.tsx useEffect**

Replace any `seedDemo` or `memory.campaigns` reference at the top of the page component:

```ts
useEffect(() => {
  getCampaigns().then(setCampaigns);
}, []);
```

- [ ] **1.3 Wire createCampaign in api.ts**

```ts
export async function createCampaign(input: Partial<Campaign> & { name: string; channel: string }): Promise<Campaign> {
  if (!HAS_SUPABASE) {
    const c: Campaign = {
      id: uid("camp"), organization_id: memory.org.id, name: input.name,
      channel: input.channel as Campaign["channel"], status: "draft",
      audience_count: input.audience_count ?? 0, sent: 0, delivered: 0,
      replies: 0, template_id: input.template_id ?? null,
      scheduled_at: input.scheduled_at ?? null, created_at: nowIso(),
    };
    memory.campaigns.unshift(c);
    return delay(c, 200);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Not connected");
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("campaigns")
    .insert([{ organization_id: orgId, name: input.name, channel: input.channel,
      status: "draft", audience_count: input.audience_count ?? 0,
      template_id: input.template_id ?? null, scheduled_at: input.scheduled_at ?? null }])
    .select().single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}
```

- [ ] **1.4 Wire Launch Campaign button**

In `campaigns/page.tsx`, the Launch button should call:
```ts
async function handleLaunch(campaignId: string) {
  await fetch(`/api/trigger/campaign.launch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign_id: campaignId }),
  });
  setCampaigns((prev) => prev.map((c) =>
    c.id === campaignId ? { ...c, status: "running" } : c
  ));
}
```

Update campaign status in DB simultaneously:
```ts
// Also update in Supabase — add updateCampaign to api.ts
export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<void> {
  if (!HAS_SUPABASE) { const i = memory.campaigns.findIndex((c) => c.id === id); if (i >= 0) Object.assign(memory.campaigns[i]!, patch); return; }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const orgId = await getOrgId(supabase);
  await supabase.from("campaigns").update(patch).eq("id", id).eq("organization_id", orgId);
}
```

- [ ] **1.5 Commit**
```
git add src/lib/api.ts src/app/(dashboard)/campaigns/page.tsx
git commit -m "feat: campaigns page reads/writes live Supabase data + launch triggers n8n"
```

---

## Task 2: Leads Pipeline Board — Live Data

**Files:**
- Modify: `src/app/(dashboard)/leads/page.tsx`
- Modify: `src/app/(dashboard)/leads/[id]/page.tsx`

### Steps

- [ ] **2.1 Wire leads/page.tsx to getLeads()**

```ts
useEffect(() => { getLeads().then(setLeads); }, []);
```

Group leads by status for the Kanban view:
```ts
const byStatus = (status: Lead["status"]) => leads.filter((l) => l.status === status);
```

- [ ] **2.2 Wire lead status drag-and-drop to updateLead()**

On card drop (or status select change):
```ts
async function handleStatusChange(leadId: string, newStatus: Lead["status"]) {
  await updateLead(leadId, { status: newStatus });
  setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
}
```

Verify `updateLead` in `api.ts` has a Supabase branch:
```ts
export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  if (!HAS_SUPABASE) { const i = memory.leads.findIndex((l) => l.id === id); if (i >= 0) memory.leads[i] = { ...memory.leads[i]!, ...patch }; return delay(memory.leads[i]!, 150); }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Not connected");
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase.from("leads").update(patch).eq("id", id).eq("organization_id", orgId).select().single();
  if (error) throw new Error(error.message);
  return data as Lead;
}
```

- [ ] **2.3 Wire leads/[id]/page.tsx to getLead(id)**

```ts
const { id } = use(params);
useEffect(() => {
  getLead(id).then(setLead);
}, [id]);
```

Verify `getLead` exists in `api.ts`:
```ts
export async function getLead(id: string): Promise<Lead | null> {
  if (!HAS_SUPABASE) return delay(memory.leads.find((l) => l.id === id) ?? null);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.leads.find((l) => l.id === id) ?? null);
  const orgId = await getOrgId(supabase);
  const { data } = await supabase.from("leads").select("*").eq("id", id).eq("organization_id", orgId).single();
  return data as Lead | null;
}
```

- [ ] **2.4 Commit**
```
git add src/lib/api.ts src/app/(dashboard)/leads/
git commit -m "feat: leads pipeline board + detail page read live Supabase data"
```

---

## Task 3: Automations Page — Live Data

**Files:**
- Modify: `src/app/(dashboard)/automations/page.tsx`
- Modify: `src/lib/api.ts` — getAutomations, toggleAutomation

### Steps

- [ ] **3.1 Add getAutomations Supabase path**

```ts
export async function getAutomations(): Promise<Automation[]> {
  if (!HAS_SUPABASE) return delay([...memory.automations]);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([...memory.automations]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("automations").select("*").eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Automation[];
}
```

- [ ] **3.2 Add toggleAutomation Supabase path**

```ts
export async function toggleAutomation(id: string, enabled: boolean): Promise<void> {
  if (!HAS_SUPABASE) { const i = memory.automations.findIndex((a) => a.id === id); if (i >= 0) memory.automations[i]!.enabled = enabled; return; }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const orgId = await getOrgId(supabase);
  await supabase.from("automations").update({ enabled }).eq("id", id).eq("organization_id", orgId);
}
```

- [ ] **3.3 Wire automations/page.tsx**

```ts
useEffect(() => { getAutomations().then(setAutomations); }, []);

async function handleToggle(id: string, current: boolean) {
  await toggleAutomation(id, !current);
  setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, enabled: !current } : a));
}
```

- [ ] **3.4 Commit**
```
git add src/lib/api.ts src/app/(dashboard)/automations/page.tsx
git commit -m "feat: automations page reads/writes live Supabase data"
```

---

## Task 4: Retargeting Page — Live Data

**Files:**
- Modify: `src/app/(dashboard)/retargeting/page.tsx`

### Steps

- [ ] **4.1 Wire retargeting page to getLeads() filtered by last_contacted_at**

```ts
useEffect(() => {
  getLeads().then((leads) => {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    setInactiveLeads(leads.filter((l) =>
      !l.last_contacted_at || l.last_contacted_at < cutoff
    ));
  });
}, []);
```

- [ ] **4.2 Wire "Re-engage" button to trigger n8n**

```ts
async function handleReengage(leadId: string) {
  await fetch("/api/trigger/retargeting.run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_id: leadId }),
  });
  toast.success("Re-engagement triggered");
}
```

- [ ] **4.3 Commit**
```
git add src/app/(dashboard)/retargeting/page.tsx
git commit -m "feat: retargeting page shows inactive leads + triggers re-engagement"
```

---

## Task 5: Tests — Campaign Status Transitions

**Files:**
- Create: `src/__tests__/campaigns.test.ts`

### Steps

- [ ] **5.1 Write tests**

```ts
// src/__tests__/campaigns.test.ts
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/config", () => ({ HAS_SUPABASE: false }));

describe("getCampaigns (mock branch)", () => {
  it("returns an array", async () => {
    const { getCampaigns } = await import("@/lib/api");
    const result = await getCampaigns();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("createCampaign (mock branch)", () => {
  it("adds campaign to the list", async () => {
    const { createCampaign, getCampaigns } = await import("@/lib/api");
    const before = (await getCampaigns()).length;
    await createCampaign({ name: "Test Campaign", channel: "whatsapp" });
    const after = (await getCampaigns()).length;
    expect(after).toBe(before + 1);
  });

  it("new campaign has status draft", async () => {
    const { createCampaign } = await import("@/lib/api");
    const c = await createCampaign({ name: "Draft Test", channel: "email" });
    expect(c.status).toBe("draft");
  });
});
```

- [ ] **5.2 Run tests**
```
npm test src/__tests__/campaigns.test.ts
```
Expected: 3 tests PASS

- [ ] **5.3 Commit**
```
git add src/__tests__/campaigns.test.ts
git commit -m "test: campaign creation mock branch"
```

---

## Week 4 Done Criteria
- [ ] Creating a campaign in the UI writes to Supabase `campaigns` table
- [ ] Clicking Launch fires `POST /api/trigger/campaign.launch`
- [ ] Leads pipeline board shows real leads grouped by status; drag-and-drop updates DB
- [ ] Automations toggle persists to Supabase
- [ ] Retargeting page lists leads with no contact in 14+ days
- [ ] `npm test` passes including 3 new campaign tests
