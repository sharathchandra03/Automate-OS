# Week 6 Plan — Settings + Knowledge Base

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Settings page branding tab fully functional (logo upload, brand color, AI tone), knowledge base CRUD persisted to Supabase, team member invite + role management wired to the profiles table.

**Architecture:** Logo upload uses Supabase Storage bucket `org-assets`. Brand color and AI tone are columns on `organizations`. Knowledge base articles live in a `knowledge_articles` table. Team invites use Supabase Auth `inviteUserByEmail` via service-role client.

**Tech Stack:** Next.js 14, Supabase Storage, Supabase Auth invite flow, Zod

**Branch:** `week6/settings-knowledge`

---

## Task 1: Supabase Storage Setup + Logo Upload

**Files:**
- Modify: `supabase/schema.sql` — add brand/AI tone columns to organizations
- Modify: `src/app/(dashboard)/settings/page.tsx` — wire branding tab
- Create: `src/app/api/settings/logo/route.ts`

### Steps

- [ ] **1.1 Add columns to organizations table**

```sql
alter table if exists organizations add column if not exists brand_color text default '#5B5BF7';
alter table if exists organizations add column if not exists ai_tone text default 'professional';
alter table if exists organizations add column if not exists logo_url text;
```

Run in Supabase SQL editor.

- [ ] **1.2 Create Supabase Storage bucket**

In Supabase Dashboard → Storage → New Bucket:
- Name: `org-assets`
- Public: **yes** (logos are public)

Add RLS policy to allow org members to upload:
```sql
create policy "org members can upload logos"
on storage.objects for insert
with check (bucket_id = 'org-assets' AND auth.uid() IS NOT NULL);

create policy "logos are public"
on storage.objects for select
using (bucket_id = 'org-assets');
```

- [ ] **1.3 Create logo upload API route**

```ts
// src/app/api/settings/logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: "No org" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${profile.organization_id}/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: uploadError } = await svc.storage
    .from("org-assets").upload(path, buffer, { upsert: true, contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = svc.storage.from("org-assets").getPublicUrl(path);

  await svc.from("organizations").update({ logo_url: publicUrl }).eq("id", profile.organization_id);

  return NextResponse.json({ url: publicUrl });
}
```

- [ ] **1.4 Wire branding tab in settings/page.tsx**

Replace the `"Coming soon - placeholder for v1."` content with:

```tsx
// Logo upload section
const [logoUrl, setLogoUrl] = useState<string | null>(null);
const [brandColor, setBrandColor] = useState("#5B5BF7");
const [aiTone, setAiTone] = useState("professional");

useEffect(() => {
  getOrganization().then((org) => {
    if (org.logo_url) setLogoUrl(org.logo_url);
    if (org.brand_color) setBrandColor(org.brand_color);
    if ((org as any).ai_tone) setAiTone((org as any).ai_tone);
  });
}, []);

async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/settings/logo", { method: "POST", body: form });
  const { url } = await res.json();
  if (url) setLogoUrl(url);
}

async function handleSaveBranding() {
  await updateOrganization({ brand_color: brandColor, ai_tone: aiTone } as any);
  toast.success("Branding saved");
}

// JSX:
<div className="space-y-4">
  <div>
    <Label>Logo</Label>
    {logoUrl && <img src={logoUrl} alt="logo" className="h-12 mb-2 rounded" />}
    <Input type="file" accept="image/*" onChange={handleLogoUpload} />
  </div>
  <div>
    <Label>Brand colour</Label>
    <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
      className="h-10 w-20 rounded border border-border cursor-pointer" />
  </div>
  <div>
    <Label>AI tone</Label>
    <Select value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
      <option value="professional">Professional</option>
      <option value="friendly">Friendly</option>
      <option value="formal">Formal</option>
      <option value="casual">Casual</option>
    </Select>
  </div>
  <Button onClick={handleSaveBranding}>Save branding</Button>
</div>
```

Add `updateOrganization` to `src/lib/api.ts` if missing:
```ts
export async function updateOrganization(patch: Partial<{ name: string; industry: string; timezone: string; brand_color: string; ai_tone: string }>): Promise<void> {
  if (!HAS_SUPABASE) { Object.assign(memory.org, patch); return; }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const orgId = await getOrgId(supabase);
  await supabase.from("organizations").update(patch).eq("id", orgId);
}
```

- [ ] **1.5 Commit**
```
git add supabase/schema.sql src/app/api/settings/logo/route.ts src/app/(dashboard)/settings/page.tsx src/lib/api.ts
git commit -m "feat: logo upload, brand color, AI tone saved to Supabase"
```

---

## Task 2: Knowledge Base CRUD

**Files:**
- Modify: `supabase/schema.sql` — add `knowledge_articles` table
- Modify: `src/lib/api.ts` — getKnowledgeArticles, createKnowledgeArticle, updateKnowledgeArticle, deleteKnowledgeArticle
- Modify: `src/app/(dashboard)/knowledge/page.tsx`

### Steps

- [ ] **2.1 Add knowledge_articles table**

```sql
create table if not exists knowledge_articles (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'General',
  tags text[] not null default '{}',
  published boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_knowledge_org on knowledge_articles(organization_id, created_at desc);
```

- [ ] **2.2 Add CRUD functions to api.ts**

```ts
export async function getKnowledgeArticles(): Promise<KnowledgeArticle[]> {
  if (!HAS_SUPABASE) return delay([...memory.knowledgeArticles ?? []]);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("knowledge_articles").select("*").eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as KnowledgeArticle[];
}

export async function createKnowledgeArticle(input: { title: string; content: string; category?: string; tags?: string[] }): Promise<KnowledgeArticle> {
  if (!HAS_SUPABASE) {
    const a = { id: uid("kb"), organization_id: memory.org.id, title: input.title, content: input.content, category: input.category ?? "General", tags: input.tags ?? [], published: false, created_by: null, created_at: nowIso(), updated_at: nowIso() };
    (memory as any).knowledgeArticles = [(a as any), ...((memory as any).knowledgeArticles ?? [])];
    return delay(a as any, 150);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Not connected");
  const orgId = await getOrgId(supabase);
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("knowledge_articles")
    .insert([{ organization_id: orgId, title: input.title, content: input.content, category: input.category ?? "General", tags: input.tags ?? [], created_by: user?.id ?? null }])
    .select().single();
  if (error) throw new Error(error.message);
  return data as KnowledgeArticle;
}

export async function updateKnowledgeArticle(id: string, patch: Partial<{ title: string; content: string; category: string; published: boolean }>): Promise<void> {
  if (!HAS_SUPABASE) return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const orgId = await getOrgId(supabase);
  await supabase.from("knowledge_articles").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", orgId);
}

export async function deleteKnowledgeArticle(id: string): Promise<void> {
  if (!HAS_SUPABASE) return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const orgId = await getOrgId(supabase);
  await supabase.from("knowledge_articles").delete().eq("id", id).eq("organization_id", orgId);
}
```

Add `KnowledgeArticle` type to `src/lib/types.ts` if missing:
```ts
export interface KnowledgeArticle {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **2.3 Wire knowledge/page.tsx**

```ts
useEffect(() => { getKnowledgeArticles().then(setArticles); }, []);

async function handleCreate(title: string, content: string, category: string) {
  const article = await createKnowledgeArticle({ title, content, category });
  setArticles((prev) => [article, ...prev]);
}

async function handlePublishToggle(id: string, current: boolean) {
  await updateKnowledgeArticle(id, { published: !current });
  setArticles((prev) => prev.map((a) => a.id === id ? { ...a, published: !current } : a));
}

async function handleDelete(id: string) {
  await deleteKnowledgeArticle(id);
  setArticles((prev) => prev.filter((a) => a.id !== id));
}
```

- [ ] **2.4 Commit**
```
git add supabase/schema.sql src/lib/api.ts src/lib/types.ts src/app/(dashboard)/knowledge/page.tsx
git commit -m "feat: knowledge base CRUD persisted to Supabase"
```

---

## Task 3: Team Member Invite + Role Management

**Files:**
- Create: `src/app/api/team/route.ts`
- Modify: `src/app/(dashboard)/settings/page.tsx` — wire team tab

### Steps

- [ ] **3.1 Create team API route**

```ts
// src/app/api/team/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getOrgId(supabase: ReturnType<typeof createSupabaseServerClient>, userId: string): Promise<string | null> {
  const { data } = await supabase!.from("profiles").select("organization_id").eq("id", userId).single();
  return data?.organization_id ?? null;
}

// GET — list team members
export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ members: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ members: [] });

  const { data } = await supabase
    .from("profiles").select("id, email, full_name, role, created_at")
    .eq("organization_id", orgId).order("created_at");

  return NextResponse.json({ members: data ?? [] });
}

// POST — invite new member
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role = "member" } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id, role").eq("id", user.id).single();
  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const svClient = svc();
  const { data, error } = await svClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/onboarding`,
    data: { organization_id: profile.organization_id, role },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data.user });
}

// PATCH — update member role
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { member_id, role } = await req.json().catch(() => ({}));
  const VALID_ROLES = ["owner", "admin", "member", "viewer"];
  if (!member_id || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles").select("organization_id, role").eq("id", user.id).single();
  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const svClient = svc();
  await svClient.from("profiles").update({ role }).eq("id", member_id).eq("organization_id", profile?.organization_id ?? "");

  return NextResponse.json({ ok: true });
}
```

- [ ] **3.2 Wire team tab in settings/page.tsx**

```ts
const [members, setMembers] = useState<{ id: string; email: string; full_name: string; role: string }[]>([]);
const [inviteEmail, setInviteEmail] = useState("");

useEffect(() => {
  fetch("/api/team").then((r) => r.json()).then((d) => setMembers(d.members ?? []));
}, []);

async function handleInvite() {
  const res = await fetch("/api/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: inviteEmail, role: "member" }),
  });
  if (res.ok) { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(""); }
  else { const d = await res.json(); toast.error(d.error); }
}

async function handleRoleChange(memberId: string, newRole: string) {
  await fetch("/api/team", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_id: memberId, role: newRole }),
  });
  setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
}
```

- [ ] **3.3 Commit**
```
git add src/app/api/team/route.ts src/app/(dashboard)/settings/page.tsx
git commit -m "feat: team invite + role management via Supabase Auth admin"
```

---

## Week 6 Done Criteria
- [ ] Uploading a logo saves to Supabase Storage and persists `logo_url` on the org
- [ ] Brand color and AI tone saved to `organizations` table and reloaded on revisit
- [ ] Creating a knowledge article writes to `knowledge_articles` table
- [ ] Publish toggle updates `published` in DB
- [ ] Inviting a team member sends a Supabase Auth invite email
- [ ] Changing a member's role updates `profiles.role` in DB
