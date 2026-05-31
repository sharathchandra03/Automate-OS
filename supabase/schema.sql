-- =============================================================================
-- AutomateOS — Complete Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================

create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  industry      text not null default 'Other',
  timezone      text not null default 'Asia/Kolkata',
  brand_color   text not null default '#22c55e',
  logo_url      text,
  business_hours text,
  created_at    timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- =============================================================================
-- PROFILES (one per Supabase auth user)
-- =============================================================================

create table if not exists public.profiles (
  id              uuid primary key references auth.users on delete cascade,
  email           text not null,
  full_name       text not null default '',
  avatar_url      text,
  organization_id uuid references public.organizations on delete cascade,
  role            text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Automatically create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- ORG CHANNELS — per-org messaging credentials (stored encrypted at rest)
-- =============================================================================

create table if not exists public.org_channels (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations on delete cascade,
  provider             text not null check (provider in ('whatsapp','instagram','telegram','sms_twilio')),
  label                text not null,
  phone_number         text,
  -- WhatsApp Cloud API
  waba_id              text,
  phone_number_id      text,
  access_token         text,       -- store encrypted; never expose in SELECT *
  -- Telegram
  bot_token            text,
  -- SMS Twilio
  twilio_account_sid   text,
  twilio_auth_token    text,
  twilio_from_number   text,
  -- Status
  status               text not null default 'disconnected' check (status in ('active','disconnected','error')),
  connected_at         timestamptz,
  created_at           timestamptz not null default now()
);

alter table public.org_channels enable row level security;

-- =============================================================================
-- CONTACTS — WhatsApp address book (separate from CRM leads)
-- =============================================================================

create table if not exists public.contacts (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations on delete cascade,
  name              text not null,
  phone             text not null,    -- E.164: +919876543210
  email             text,
  avatar_url        text,
  tags              text[] not null default '{}',
  custom_attributes jsonb not null default '{}',
  opted_out         boolean not null default false,
  whatsapp_valid    boolean not null default true,
  last_messaged_at  timestamptz,
  created_at        timestamptz not null default now(),
  unique (organization_id, phone)    -- one contact per phone per org
);

create index if not exists contacts_org_phone on public.contacts (organization_id, phone);
create index if not exists contacts_org_name  on public.contacts (organization_id, name);

alter table public.contacts enable row level security;

-- =============================================================================
-- CONTACT IMPORTS — CSV/XLS import job tracking
-- =============================================================================

create table if not exists public.contact_imports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  filename        text not null,
  total_rows      integer not null default 0,
  imported        integer not null default 0,
  skipped         integer not null default 0,
  errors          integer not null default 0,
  status          text not null default 'pending' check (status in ('pending','processing','done','failed')),
  created_at      timestamptz not null default now()
);

alter table public.contact_imports enable row level security;

-- =============================================================================
-- WALLET — per-org credit balances
-- =============================================================================

create table if not exists public.wallets (
  id                              uuid primary key default gen_random_uuid(),
  organization_id                 uuid not null unique references public.organizations on delete cascade,
  conversation_credits            integer not null default 0 check (conversation_credits >= 0),
  broadcast_credits               integer not null default 0 check (broadcast_credits >= 0),
  lifetime_conversation_added     integer not null default 0,
  lifetime_broadcast_added        integer not null default 0,
  lifetime_conversation_spent     integer not null default 0,
  lifetime_broadcast_spent        integer not null default 0,
  updated_at                      timestamptz not null default now()
);

alter table public.wallets enable row level security;

-- Automatically create a wallet row when an organization is created
create or replace function public.handle_new_org_wallet()
returns trigger language plpgsql security definer as $$
begin
  insert into public.wallets (organization_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_org_created_wallet on public.organizations;
create trigger on_org_created_wallet
  after insert on public.organizations
  for each row execute procedure public.handle_new_org_wallet();

-- =============================================================================
-- CREDIT TRANSACTIONS — full ledger (never delete rows)
-- =============================================================================

create table if not exists public.credit_transactions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations on delete cascade,
  credit_type      text not null check (credit_type in ('conversation','broadcast')),
  transaction_type text not null check (transaction_type in ('topup','deduct','refund','admin_grant')),
  amount           integer not null,   -- positive = added, negative = spent
  balance_after    integer not null,
  description      text not null,
  reference_id     text,               -- message_id, campaign_id, etc.
  created_by       uuid references public.profiles,
  created_at       timestamptz not null default now()
);

create index if not exists credit_tx_org_date on public.credit_transactions (organization_id, created_at desc);

alter table public.credit_transactions enable row level security;

-- =============================================================================
-- CONVERSATIONS — WhatsApp conversation sessions
-- =============================================================================

create table if not exists public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations on delete cascade,
  contact_id           uuid not null references public.contacts on delete cascade,
  org_channel_id       uuid references public.org_channels on delete set null,
  status               text not null default 'open' check (status in ('open','resolved','expired','bot')),
  assignee_id          uuid references public.profiles on delete set null,
  tags                 text[] not null default '{}',
  last_message_at      timestamptz,
  last_message_preview text,
  unread_count         integer not null default 0,
  window_expires_at    timestamptz,    -- WhatsApp 24h window expiry
  created_at           timestamptz not null default now()
);

create index if not exists conversations_org_status   on public.conversations (organization_id, status, last_message_at desc);
create index if not exists conversations_org_contact  on public.conversations (organization_id, contact_id);
create index if not exists conversations_assignee     on public.conversations (assignee_id) where assignee_id is not null;

alter table public.conversations enable row level security;

-- =============================================================================
-- MESSAGES — individual messages within a conversation
-- =============================================================================

create table if not exists public.messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.conversations on delete cascade,
  organization_id     uuid not null references public.organizations on delete cascade,
  direction           text not null check (direction in ('inbound','outbound')),
  content_type        text not null default 'text' check (content_type in ('text','image','document','audio','video','template','interactive')),
  body                text not null default '',
  media_url           text,
  template_name       text,
  interactive_buttons jsonb,           -- [{id, title}]
  wa_message_id       text,            -- Meta's wamid for status tracking
  status              text not null default 'sent' check (status in ('sent','delivered','read','failed')),
  created_at          timestamptz not null default now()
);

create index if not exists messages_conversation on public.messages (conversation_id, created_at asc);
create index if not exists messages_wa_id        on public.messages (wa_message_id) where wa_message_id is not null;

alter table public.messages enable row level security;

-- =============================================================================
-- WORKFLOWS — visual bot flows (ReactFlow JSON stored here)
-- =============================================================================

create table if not exists public.workflows (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name            text not null,
  trigger         text not null default 'incoming_whatsapp',
  nodes           jsonb not null default '[]',
  edges           jsonb not null default '[]',
  status          text not null default 'draft' check (status in ('active','paused','draft')),
  org_channel_id  uuid references public.org_channels on delete set null,
  runs_total      integer not null default 0,
  runs_last_30d   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.workflows enable row level security;

-- =============================================================================
-- WORKFLOW RUNS — execution log
-- =============================================================================

create table if not exists public.workflow_runs (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references public.workflows on delete cascade,
  organization_id uuid not null references public.organizations on delete cascade,
  contact_id      uuid references public.contacts on delete set null,
  conversation_id uuid references public.conversations on delete set null,
  status          text not null default 'running' check (status in ('running','completed','failed')),
  current_node_id text,
  variables       jsonb not null default '{}',
  error           text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz
);

create index if not exists wf_runs_workflow on public.workflow_runs (workflow_id, started_at desc);

alter table public.workflow_runs enable row level security;

-- =============================================================================
-- LEADS (already existed — adding missing columns if needed)
-- =============================================================================

create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  source          text not null default 'Manual',
  status          text not null default 'new' check (status in ('new','contacted','qualified','proposal','won','lost')),
  temperature     text not null default 'warm' check (temperature in ('hot','warm','cold')),
  score           integer not null default 50 check (score between 0 and 100),
  intent          text,
  tags            text[] not null default '{}',
  notes           text,
  owner_id        uuid references public.profiles on delete set null,
  last_contacted_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.leads enable row level security;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- All tables: users can only see rows where organization_id matches their profile
-- =============================================================================

-- Helper function: get current user's organization_id
create or replace function public.my_org_id()
returns uuid language sql stable security definer as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- Helper function: check if current user is platform admin (role = 'owner' + special flag)
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
    -- extend with a separate admin table later if needed
  )
$$;

-- ORGANIZATIONS
create policy "org members can read their org"
  on public.organizations for select
  using (id = public.my_org_id());

create policy "org owners can update their org"
  on public.organizations for update
  using (id = public.my_org_id())
  with check (id = public.my_org_id());

-- PROFILES
create policy "users can read profiles in their org"
  on public.profiles for select
  using (organization_id = public.my_org_id() or id = auth.uid());

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Macro for all org-scoped tables
-- (applies to: org_channels, contacts, contact_imports, wallets,
--  credit_transactions, conversations, messages, workflows, workflow_runs, leads)

do $$ declare t text; begin
  foreach t in array array[
    'org_channels','contacts','contact_imports','wallets',
    'credit_transactions','conversations','messages',
    'workflows','workflow_runs','leads'
  ] loop
    execute format('
      create policy "org members select %1$s"
        on public.%1$s for select
        using (organization_id = public.my_org_id());
      create policy "org members insert %1$s"
        on public.%1$s for insert
        with check (organization_id = public.my_org_id());
      create policy "org members update %1$s"
        on public.%1$s for update
        using (organization_id = public.my_org_id());
      create policy "org members delete %1$s"
        on public.%1$s for delete
        using (organization_id = public.my_org_id());
    ', t);
  end loop;
end $$;

-- =============================================================================
-- REALTIME — enable for inbox (messages + conversations)
-- =============================================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- =============================================================================
-- SUBSCRIPTIONS — Stripe subscription state per org
-- =============================================================================

create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id    text,
  stripe_subscription_id text unique,
  plan                  text not null default 'free' check (plan in ('free','starter','growth','pro')),
  status                text not null default 'active' check (status in ('active','past_due','canceled','trialing')),
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_subscriptions_org    on public.subscriptions(organization_id);
create index if not exists idx_subscriptions_stripe on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

create policy "org members select subscriptions"
  on public.subscriptions for select
  using (organization_id = public.my_org_id());

-- Denormalized fast-lookup plan column on organizations
alter table public.organizations add column if not exists plan text not null default 'free';

-- =============================================================================
-- SEED: Platform admin org (optional — remove before production)
-- =============================================================================

-- Insert a demo org for local development
-- insert into public.organizations (id, name, slug, industry)
-- values ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'demo', 'Other');
