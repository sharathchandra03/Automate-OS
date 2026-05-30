import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS.
// Every query MUST manually filter by organization_id.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default supabase;

// ── Typed row shapes ─────────────────────────────────────────────────────────

export interface OrgChannel {
  id: string;
  organization_id: string;
  provider: string;
  label: string;
  phone_number: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string | null;
  access_token_encrypted: string | null;
  webhook_verify_token: string | null;
  status: string;
  tier: number;
  daily_limit: number;
  quality_rating: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  custom_attributes: Record<string, unknown>;
  opted_out: boolean;
  opted_in: boolean;
  opted_in_at: string | null;
  opted_out_at: string | null;
  last_seen_at: string | null;
}

export interface Workflow {
  id: string;
  organization_id: string;
  name: string;
  trigger: string;
  trigger_type: string;
  trigger_value: string;
  trigger_match_type: string;
  nodes: unknown[];
  edges: unknown[];
  status: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  organization_id: string;
  contact_id: string;
  status: string;
  current_node_id: string | null;
  variables: Record<string, unknown>;
  context: Record<string, unknown>;
  last_activity_at: string;
  expires_at: string | null;
}

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  status: string;
  template_id: string | null;
  target_segment: Record<string, unknown> | null;
  recipient_count: number;
  scheduled_at: string | null;
  stats: Record<string, number>;
}

export interface WhatsappTemplate {
  id: string;
  organization_id: string;
  template_name: string;
  template_id: string | null;
  category: string | null;
  language: string;
  status: string | null;
  components: unknown[];
  variables: unknown[];
}
