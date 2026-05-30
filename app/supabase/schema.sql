-- =========================================================================
-- AutomateOS — Supabase / PostgreSQL multi-tenant schema
-- Run with: psql -f schema.sql  (or paste into Supabase SQL editor)
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============== Core: tenants & users ==============

create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  industry text,
  timezone text default 'UTC',
  brand_color text default '#5B5BF7',
  logo_url text,
  business_hours text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_org on profiles(organization_id);

-- ============== CRM: leads, appointments, tickets ==============

create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  source text not null default 'Manual',
  status text not null default 'new' check (status in ('new','contacted','qualified','proposal','won','lost')),
  temperature text not null default 'warm' check (temperature in ('hot','warm','cold')),
  score integer not null default 50 check (score between 0 and 100),
  intent text,
  tags text[] not null default '{}',
  notes text,
  owner_id uuid references profiles(id) on delete set null,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_leads_org_created on leads(organization_id, created_at desc);
create index if not exists idx_leads_org_status on leads(organization_id, status);
create index if not exists idx_leads_org_temp on leads(organization_id, temperature);

create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  contact_name text not null,
  contact_email text,
  service text not null,
  starts_at timestamptz not null,
  duration_min integer not null default 30,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_appts_org_starts on appointments(organization_id, starts_at);

create table if not exists tickets (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  subject text not null,
  category text not null default 'General',
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','waiting','resolved','closed')),
  contact_name text not null,
  contact_email text,
  assignee_id uuid references profiles(id) on delete set null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tickets_org_status on tickets(organization_id, status);

-- ============== Outreach: campaigns, follow-ups, FAQ ==============

create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('whatsapp','email','telegram','sms')),
  template_id uuid,
  audience_filter jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','scheduled','running','completed','paused')),
  scheduled_at timestamptz,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  failed_count integer not null default 0,
  reply_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_campaigns_org_status on campaigns(organization_id, status);

create table if not exists follow_ups (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trigger text not null,
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('active','paused','draft')),
  active_count integer not null default 0,
  conversion_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists faq_items (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  question text not null,
  answer text not null,
  tags text[] not null default '{}',
  uses integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_faq_org on faq_items(organization_id);

create table if not exists templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel text not null,
  body text not null,
  variables text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ============== Platform: integrations, automations, audit ==============

create table if not exists integrations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null,
  label text not null,
  status text not null default 'disconnected' check (status in ('connected','disconnected','error','testing')),
  config jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists automations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  trigger text not null,
  webhook_url text not null,
  status text not null default 'paused' check (status in ('active','paused','error')),
  last_run_at timestamptz,
  runs_today integer not null default 0,
  success_rate numeric(5,2) not null default 100.00,
  created_at timestamptz not null default now()
);

create table if not exists automation_runs (
  id uuid primary key default uuid_generate_v4(),
  automation_id uuid not null references automations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  status text not null check (status in ('success','failed','running')),
  payload jsonb,
  response jsonb,
  error text,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_runs_org_created on automation_runs(organization_id, created_at desc);

create table if not exists analytics_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event text not null,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_events_org_time on analytics_events(organization_id, occurred_at desc);

create table if not exists audit_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor text not null,
  action text not null,
  target text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_org on audit_events(organization_id, created_at desc);

-- ============== Helper: current tenant ==============

create or replace function current_tenant_id() returns uuid as $$
  select coalesce(
    nullif(current_setting('app.current_tenant_id', true), ''),
    (auth.jwt() -> 'app_metadata' ->> 'organization_id'),
    (auth.jwt() ->> 'organization_id'),
    (select organization_id::text from public.profiles where id = auth.uid())
  )::uuid;
$$ language sql stable security definer;

-- ============== Contacts — WhatsApp address book ==============

create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text not null,                        -- E.164 format: +919876543210
  email text,
  avatar_url text,
  tags text[] not null default '{}',
  custom_attributes jsonb not null default '{}'::jsonb,
  opted_out boolean not null default false,   -- STOP / unsubscribe
  whatsapp_valid boolean not null default true,
  last_messaged_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_contacts_org on contacts(organization_id);
create index if not exists idx_contacts_org_phone on contacts(organization_id, phone);
create index if not exists idx_contacts_org_created on contacts(organization_id, created_at desc);

create table if not exists contact_labels (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  contact_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contact_labels_org on contact_labels(organization_id);

-- ============== OrgChannel — per-org channel credentials ==============
-- IMPORTANT: All token / secret fields should be stored encrypted in production.
-- Use pgcrypto (pgp_sym_encrypt) or a secrets manager; never store plaintext.

create table if not exists org_channels (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('whatsapp','instagram','telegram','sms_twilio')),
  label text not null,                        -- e.g. "Revive Hospitals WhatsApp"
  phone_number text,
  -- WhatsApp Cloud API
  waba_id text,                               -- WhatsApp Business Account ID (store encrypted in production)
  phone_number_id text,                       -- (store encrypted in production)
  access_token text,                          -- (store encrypted in production)
  -- Telegram
  bot_token text,                             -- (store encrypted in production)
  -- SMS via Twilio
  twilio_account_sid text,                    -- (store encrypted in production)
  twilio_auth_token text,                     -- (store encrypted in production)
  twilio_from_number text,
  -- Status
  status text not null default 'disconnected' check (status in ('active','disconnected','error')),
  connected_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_org_channels_org on org_channels(organization_id);
create index if not exists idx_org_channels_org_provider on org_channels(organization_id, provider);

-- ============== Wallet & Credits ==============

create table if not exists wallets (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  conversation_credits integer not null default 0 check (conversation_credits >= 0),
  broadcast_credits integer not null default 0 check (broadcast_credits >= 0),
  lifetime_conversation_added integer not null default 0,
  lifetime_broadcast_added integer not null default 0,
  lifetime_conversation_spent integer not null default 0,
  lifetime_broadcast_spent integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists idx_wallets_org on wallets(organization_id);

create table if not exists credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  credit_type text not null check (credit_type in ('conversation','broadcast')),
  transaction_type text not null check (transaction_type in ('topup','deduct','refund','admin_grant')),
  amount integer not null,                    -- positive = added, negative = deducted
  balance_after integer not null,
  description text not null default '',
  reference_id text,                          -- message_id, campaign_id, etc.
  created_by text,                            -- admin user id for admin_grant
  created_at timestamptz not null default now()
);
create index if not exists idx_credit_tx_org_created on credit_transactions(organization_id, created_at desc);
create index if not exists idx_credit_tx_org_type on credit_transactions(organization_id, credit_type);

-- ============== Conversations & Messages — WhatsApp inbox ==============

create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  org_channel_id uuid not null references org_channels(id) on delete cascade,
  status text not null default 'open' check (status in ('open','resolved','expired','bot')),
  assignee_id uuid references profiles(id) on delete set null,
  tags text[] not null default '{}',
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer not null default 0 check (unread_count >= 0),
  window_expires_at timestamptz,              -- WhatsApp 24h window expiry
  created_at timestamptz not null default now()
);
create index if not exists idx_conversations_org_status on conversations(organization_id, status);
create index if not exists idx_conversations_org_last_msg on conversations(organization_id, last_message_at desc);
create index if not exists idx_conversations_contact on conversations(contact_id);
create index if not exists idx_conversations_channel on conversations(org_channel_id);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  content_type text not null check (content_type in ('text','image','document','audio','video','template','interactive')),
  body text not null default '',
  media_url text,
  template_name text,
  interactive_buttons jsonb,                  -- [{id, title}, ...]
  wa_message_id text,                         -- Meta's message ID for status tracking
  status text not null default 'sent' check (status in ('sent','delivered','read','failed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at asc);
create index if not exists idx_messages_org_created on messages(organization_id, created_at desc);
create index if not exists idx_messages_wa_id on messages(wa_message_id) where wa_message_id is not null;

-- ============== Workflows — visual bot flows ==============

create table if not exists workflows (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trigger text not null,
  nodes jsonb not null default '[]'::jsonb,   -- ReactFlow WorkflowNode[]
  edges jsonb not null default '[]'::jsonb,   -- ReactFlow WorkflowEdge[]
  status text not null default 'draft' check (status in ('active','paused','draft')),
  org_channel_id uuid references org_channels(id) on delete set null,
  runs_total integer not null default 0,
  runs_last_30d integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workflows_org_status on workflows(organization_id, status);
create index if not exists idx_workflows_org_created on workflows(organization_id, created_at desc);

create table if not exists workflow_runs (
  id uuid primary key default uuid_generate_v4(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  current_node_id text,
  variables jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_workflow_runs_org_created on workflow_runs(organization_id, started_at desc);
create index if not exists idx_workflow_runs_workflow on workflow_runs(workflow_id, started_at desc);

-- ============== Webhook tokens (per-org public lead capture) ==============

create table if not exists webhook_tokens (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  organization_id uuid not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_webhook_tokens_token on webhook_tokens(token);

-- ============== Notifications ==============

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  kind text not null,
  level text not null default 'info' check (level in ('info','success','warning','critical')),
  title text not null,
  body text,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_org_user on notifications(organization_id, user_id, created_at desc);

-- ============== RPC: atomic credit deduction ==============

create or replace function deduct_credits(
  p_org_id uuid,
  p_credit_type text,
  p_amount int,
  p_description text,
  p_reference_id text default null
) returns jsonb as $$
declare
  v_wallet wallets;
  v_balance int;
  v_new_conv_credits int;
  v_new_bc_credits int;
  v_balance_after int;
  v_tx_id uuid;
begin
  select * into v_wallet from wallets where organization_id = p_org_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  end if;

  v_balance := case when p_credit_type = 'conversation'
    then v_wallet.conversation_credits
    else v_wallet.broadcast_credits end;

  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'wallet', row_to_json(v_wallet));
  end if;

  v_new_conv_credits := case when p_credit_type = 'conversation'
    then v_wallet.conversation_credits - p_amount
    else v_wallet.conversation_credits end;
  v_new_bc_credits := case when p_credit_type = 'broadcast'
    then v_wallet.broadcast_credits - p_amount
    else v_wallet.broadcast_credits end;

  update wallets set
    conversation_credits      = v_new_conv_credits,
    broadcast_credits         = v_new_bc_credits,
    lifetime_conversation_spent = case when p_credit_type = 'conversation'
      then lifetime_conversation_spent + p_amount else lifetime_conversation_spent end,
    lifetime_broadcast_spent  = case when p_credit_type = 'broadcast'
      then lifetime_broadcast_spent + p_amount else lifetime_broadcast_spent end,
    updated_at = now()
  where organization_id = p_org_id;

  v_balance_after := case when p_credit_type = 'conversation' then v_new_conv_credits else v_new_bc_credits end;

  insert into credit_transactions
    (organization_id, credit_type, transaction_type, amount, balance_after, description, reference_id)
  values
    (p_org_id, p_credit_type, 'deduct', -p_amount, v_balance_after, p_description, p_reference_id)
  returning id into v_tx_id;

  select * into v_wallet from wallets where organization_id = p_org_id;

  return jsonb_build_object(
    'ok', true,
    'wallet', row_to_json(v_wallet),
    'transaction_id', v_tx_id
  );
end;
$$ language plpgsql security definer;

-- ============== Credential helpers ==============

create or replace function encrypt_credential(plaintext text) returns text as $$
  select pgp_sym_encrypt(plaintext, current_setting('app.credential_key'))::text;
$$ language sql security definer;

create or replace function decrypt_credential(ciphertext text) returns text as $$
  select pgp_sym_decrypt(ciphertext::bytea, current_setting('app.credential_key'));
$$ language sql security definer;

-- ============== API Keys ==============

create table if not exists api_keys (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_api_keys_org on api_keys(organization_id);
create index if not exists idx_api_keys_hash on api_keys(key_hash);

-- ============== Webhook events log ==============

create table if not exists webhook_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  source text not null,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processed','failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_webhook_events_org_created on webhook_events(organization_id, created_at desc);
