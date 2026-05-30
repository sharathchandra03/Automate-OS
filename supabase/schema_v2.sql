-- =============================================================================
-- AutomateOS Schema v2 — Backend Engine Extensions
-- Run AFTER schema.sql in Supabase SQL Editor
-- Adds: WhatsApp-specific columns, campaign tables, flow engine tables,
--       sequences, appointments, support tickets, automation logs
-- =============================================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- EXTEND org_channels — add WhatsApp backend fields
-- =============================================================================

ALTER TABLE public.org_channels
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS webhook_verify_token    TEXT,
  ADD COLUMN IF NOT EXISTS tier                   INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS daily_limit            INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS quality_rating         TEXT DEFAULT 'GREEN';

-- =============================================================================
-- EXTEND contacts — add opt-in tracking
-- =============================================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS opted_in      BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS opted_in_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opted_out_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at  TIMESTAMPTZ;

-- =============================================================================
-- EXTEND workflows — add trigger matching fields for flow engine
-- trigger_type: keyword | inbound | campaign_reply | schedule
-- trigger_match_type: exact | contains
-- =============================================================================

ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS trigger_type       TEXT DEFAULT 'keyword',
  ADD COLUMN IF NOT EXISTS trigger_value      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS trigger_match_type TEXT DEFAULT 'exact';

-- =============================================================================
-- EXTEND workflow_runs — add session tracking fields
-- =============================================================================

ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS context          JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;

-- =============================================================================
-- WHATSAPP TEMPLATES — approved Meta templates per org
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_name   TEXT NOT NULL,
  template_id     TEXT,
  category        TEXT,                    -- MARKETING, UTILITY, AUTHENTICATION
  language        TEXT DEFAULT 'en',
  status          TEXT,                    -- APPROVED, PENDING, REJECTED
  components      JSONB NOT NULL DEFAULT '[]',
  variables       JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, template_name, language)
);

CREATE INDEX IF NOT EXISTS templates_org ON public.whatsapp_templates(organization_id);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select whatsapp_templates"
  ON public.whatsapp_templates FOR SELECT
  USING (organization_id = public.my_org_id());
CREATE POLICY "org members insert whatsapp_templates"
  ON public.whatsapp_templates FOR INSERT
  WITH CHECK (organization_id = public.my_org_id());
CREATE POLICY "org members update whatsapp_templates"
  ON public.whatsapp_templates FOR UPDATE
  USING (organization_id = public.my_org_id());
CREATE POLICY "org members delete whatsapp_templates"
  ON public.whatsapp_templates FOR DELETE
  USING (organization_id = public.my_org_id());

-- =============================================================================
-- CAMPAIGNS — broadcast blast records
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT DEFAULT 'draft',
  -- draft | scheduled | running | completed | paused | failed
  template_id     UUID REFERENCES public.whatsapp_templates(id),
  target_segment  JSONB,
  recipient_count INTEGER DEFAULT 0,
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  stats           JSONB DEFAULT '{"total":0,"sent":0,"delivered":0,"read":0,"replied":0,"failed":0}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_org    ON public.campaigns(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaigns_status ON public.campaigns(status, scheduled_at)
  WHERE status IN ('scheduled', 'running');

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select campaigns"
  ON public.campaigns FOR SELECT USING (organization_id = public.my_org_id());
CREATE POLICY "org members insert campaigns"
  ON public.campaigns FOR INSERT WITH CHECK (organization_id = public.my_org_id());
CREATE POLICY "org members update campaigns"
  ON public.campaigns FOR UPDATE USING (organization_id = public.my_org_id());
CREATE POLICY "org members delete campaigns"
  ON public.campaigns FOR DELETE USING (organization_id = public.my_org_id());

-- =============================================================================
-- CAMPAIGN RECIPIENTS — one row per contact per campaign
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone       TEXT NOT NULL,
  status      TEXT DEFAULT 'pending',  -- pending | sent | delivered | read | failed
  message_id  TEXT,                    -- wamid from Meta after send
  sent_at     TIMESTAMPTZ,
  variables   JSONB DEFAULT '{}',      -- per-contact template variable values
  error_code  TEXT
);

CREATE INDEX IF NOT EXISTS recipients_campaign ON public.campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS recipients_contact  ON public.campaign_recipients(contact_id);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — the backend worker manages these rows
CREATE POLICY "service role full access campaign_recipients"
  ON public.campaign_recipients USING (true) WITH CHECK (true);

-- =============================================================================
-- SEQUENCES — drip campaign definitions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  trigger_event   TEXT,   -- new_lead | appointment_booked | custom
  steps           JSONB NOT NULL DEFAULT '[]',
  -- steps: [{delay_hours, template_name, language, variables, message}]
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select sequences"
  ON public.sequences FOR SELECT USING (organization_id = public.my_org_id());
CREATE POLICY "org members insert sequences"
  ON public.sequences FOR INSERT WITH CHECK (organization_id = public.my_org_id());
CREATE POLICY "org members update sequences"
  ON public.sequences FOR UPDATE USING (organization_id = public.my_org_id());
CREATE POLICY "org members delete sequences"
  ON public.sequences FOR DELETE USING (organization_id = public.my_org_id());

-- =============================================================================
-- SEQUENCE ENROLLMENTS — contacts enrolled in drip sequences
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id  UUID REFERENCES public.sequences(id) ON DELETE CASCADE,
  contact_id   UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status       TEXT DEFAULT 'active',  -- active | completed | paused | cancelled
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  next_send_at TIMESTAMPTZ,
  UNIQUE(sequence_id, contact_id)
);

CREATE INDEX IF NOT EXISTS enrollments_due ON public.sequence_enrollments(status, next_send_at)
  WHERE status = 'active';

ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access sequence_enrollments"
  ON public.sequence_enrollments USING (true) WITH CHECK (true);

-- =============================================================================
-- APPOINTMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title             TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER DEFAULT 30,
  status            TEXT DEFAULT 'confirmed',
  -- confirmed | cancelled | rescheduled | completed
  reminder_sent_24h BOOLEAN DEFAULT false,
  reminder_sent_1h  BOOLEAN DEFAULT false,
  follow_up_sent    BOOLEAN DEFAULT false,
  notes             TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_org      ON public.appointments(organization_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS appointments_reminder ON public.appointments(scheduled_at, reminder_sent_24h, reminder_sent_1h)
  WHERE status = 'confirmed';

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select appointments"
  ON public.appointments FOR SELECT USING (organization_id = public.my_org_id());
CREATE POLICY "org members insert appointments"
  ON public.appointments FOR INSERT WITH CHECK (organization_id = public.my_org_id());
CREATE POLICY "org members update appointments"
  ON public.appointments FOR UPDATE USING (organization_id = public.my_org_id());
CREATE POLICY "org members delete appointments"
  ON public.appointments FOR DELETE USING (organization_id = public.my_org_id());

-- =============================================================================
-- SUPPORT TICKETS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id   UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  title             TEXT,
  description       TEXT,
  priority          TEXT DEFAULT 'medium',  -- low | medium | high | urgent
  status            TEXT DEFAULT 'open',    -- open | in_progress | waiting_customer | resolved
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sla_breach_at     TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tickets_org    ON public.support_tickets(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_sla    ON public.support_tickets(sla_breach_at)
  WHERE status NOT IN ('resolved');

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select support_tickets"
  ON public.support_tickets FOR SELECT USING (organization_id = public.my_org_id());
CREATE POLICY "org members insert support_tickets"
  ON public.support_tickets FOR INSERT WITH CHECK (organization_id = public.my_org_id());
CREATE POLICY "org members update support_tickets"
  ON public.support_tickets FOR UPDATE USING (organization_id = public.my_org_id());
CREATE POLICY "org members delete support_tickets"
  ON public.support_tickets FOR DELETE USING (organization_id = public.my_org_id());

-- =============================================================================
-- RPC: increment_campaign_sent — atomic counter for campaign stats
-- Called by campaign worker after each successful send
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_campaign_sent(p_campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.campaigns
  SET stats = jsonb_set(
    stats,
    '{sent}',
    to_jsonb(COALESCE((stats->>'sent')::int, 0) + 1)
  )
  WHERE id = p_campaign_id;
END;
$$;

-- =============================================================================
-- AUTOMATION LOGS — full audit trail of every automated action
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type     TEXT,   -- campaign | flow | sequence | appointment
  entity_id       UUID,
  contact_id      UUID,
  action          TEXT,   -- message_sent | flow_triggered | reminder_sent | etc.
  result          TEXT,   -- success | failed | skipped
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS logs_org ON public.automation_logs(organization_id, created_at DESC);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select automation_logs"
  ON public.automation_logs FOR SELECT USING (organization_id = public.my_org_id());
CREATE POLICY "org members insert automation_logs"
  ON public.automation_logs FOR INSERT WITH CHECK (organization_id = public.my_org_id());
