// =========================================================================
// AutomateOS - Domain types (mirror supabase/schema.sql)
// =========================================================================

export type UUID = string;
export type ISODate = string;

export type Role = "owner" | "admin" | "member" | "viewer";

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  industry: string;
  timezone: string;
  brand_color: string;
  logo_url: string | null;
  business_hours: string | null;
  created_at: ISODate;
}

export interface Profile {
  id: UUID;
  email: string;
  full_name: string;
  avatar_url: string | null;
  organization_id: UUID;
  role: Role;
  created_at: ISODate;
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export type LeadTemperature = "hot" | "warm" | "cold";

export interface Lead {
  id: UUID;
  organization_id: UUID;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  score: number; // 0-100
  intent: string | null;
  tags: string[];
  notes: string | null;
  owner_id: UUID | null;
  last_contacted_at: ISODate | null;
  created_at: ISODate;
}

export type Channel = "whatsapp" | "email" | "telegram" | "sms";

export type CampaignStatus = "draft" | "scheduled" | "running" | "completed" | "paused";

export interface Campaign {
  id: UUID;
  organization_id: UUID;
  name: string;
  channel: Channel;
  template_id: UUID | null;
  audience_filter: Record<string, unknown>;
  status: CampaignStatus;
  scheduled_at: ISODate | null;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  reply_count: number;
  created_at: ISODate;
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: UUID;
  organization_id: UUID;
  lead_id: UUID | null;
  contact_name: string;
  contact_email: string | null;
  service: string;
  starts_at: ISODate;
  duration_min: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: ISODate;
}

export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export interface Ticket {
  id: UUID;
  organization_id: UUID;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  contact_name: string;
  contact_email: string | null;
  assignee_id: UUID | null;
  description: string;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface FAQItem {
  id: UUID;
  organization_id: UUID;
  question: string;
  answer: string;
  tags: string[];
  uses: number;
  enabled: boolean;
  created_at: ISODate;
}

export type FollowUpStep = {
  id: string;
  delay_minutes: number;
  channel: Channel;
  template: string;
  stop_on_reply: boolean;
};

export type FollowUpStatus = "active" | "paused" | "draft";

export interface FollowUp {
  id: UUID;
  organization_id: UUID;
  name: string;
  trigger: string;
  steps: FollowUpStep[];
  status: FollowUpStatus;
  active_count: number;
  conversion_count: number;
  created_at: ISODate;
}

export type IntegrationProvider =
  | "google_sheets"
  | "gmail"
  | "whatsapp"
  | "telegram"
  | "google_calendar"
  | "supabase"
  | "openai"
  | "webhook"
  | "shopify"
  | "woocommerce"
  | "kylas"
  | "amazon_ses"
  | "facebook"
  | "meta_ads"
  | "google_meet"
  | "zoho_crm"
  | "salesforce"
  | "freshdesk"
  | "hubspot"
  | "zoho_billing"
  | "calendly"
  | "callhippo";

export type IntegrationStatus = "connected" | "disconnected" | "error" | "testing";

export interface Integration {
  id: UUID;
  organization_id: UUID;
  provider: IntegrationProvider;
  label: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  last_synced_at: ISODate | null;
  created_at: ISODate;
}

export type AutomationStatus = "active" | "paused" | "error";

export interface Automation {
  id: UUID;
  organization_id: UUID;
  name: string;
  description: string;
  trigger: string;
  webhook_url: string;
  status: AutomationStatus;
  last_run_at: ISODate | null;
  runs_today: number;
  success_rate: number; // 0-100
  created_at: ISODate;
}

export interface AutomationRun {
  id: UUID;
  automation_id: UUID;
  status: "success" | "failed" | "running";
  payload: Record<string, unknown>;
  response: Record<string, unknown> | null;
  error: string | null;
  duration_ms: number;
  created_at: ISODate;
}

export interface AnalyticsSummary {
  leads_total: number;
  leads_new_7d: number;
  conversion_rate: number;
  active_campaigns: number;
  appointments_7d: number;
  open_tickets: number;
  avg_response_min: number;
  channel_performance: Array<{
    channel: Channel;
    sent: number;
    delivered: number;
    replies: number;
  }>;
  weekly_leads: Array<{ day: string; leads: number; qualified: number }>;
  funnel: Array<{ stage: string; count: number }>;
  score_distribution: Array<{ band: string; count: number }>;
}

export interface AuditEvent {
  id: UUID;
  organization_id: UUID;
  actor: string;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  created_at: ISODate;
}

// =========================================================================
// Contacts - WhatsApp address book (separate from CRM Leads)
// =========================================================================

export interface Contact {
  id: UUID;
  organization_id: UUID;
  name: string;
  phone: string;              // E.164 format: +919876543210
  email: string | null;
  avatar_url: string | null;
  tags: string[];
  custom_attributes: Record<string, string>;
  opted_out: boolean;         // STOP / unsubscribe
  whatsapp_valid: boolean;    // confirmed to have WhatsApp
  last_messaged_at: ISODate | null;
  created_at: ISODate;
}

export interface ContactImport {
  id: UUID;
  organization_id: UUID;
  filename: string;
  total_rows: number;
  imported: number;
  skipped: number;
  errors: number;
  status: "pending" | "processing" | "done" | "failed";
  created_at: ISODate;
}

export interface ContactLabel {
  id: UUID;
  organization_id: UUID;
  name: string;
  contact_count: number;
  created_at: ISODate;
  updated_at: ISODate;
}

// =========================================================================
// OrgChannel - per-org channel credentials (stored encrypted in DB)
// =========================================================================

export type ChannelProvider = "whatsapp" | "instagram" | "telegram" | "sms_twilio";

export interface OrgChannel {
  id: UUID;
  organization_id: UUID;
  provider: ChannelProvider;
  label: string;              // e.g. "Revive Hospitals WhatsApp"
  phone_number: string | null;
  // WhatsApp Cloud API
  waba_id: string | null;     // WhatsApp Business Account ID
  phone_number_id: string | null;
  access_token: string | null; // stored encrypted; masked in UI
  // Telegram
  bot_token: string | null;
  // SMS (Twilio)
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_from_number: string | null;
  // Status
  status: "active" | "disconnected" | "error";
  connected_at: ISODate | null;
  created_at: ISODate;
}

// =========================================================================
// Wallet & Credits - Cheerio-style dual credit model
// =========================================================================

export interface Wallet {
  id: UUID;
  organization_id: UUID;
  conversation_credits: number;   // for 24h WhatsApp session replies
  broadcast_credits: number;      // for bulk campaign messages
  lifetime_conversation_added: number;
  lifetime_broadcast_added: number;
  lifetime_conversation_spent: number;
  lifetime_broadcast_spent: number;
  updated_at: ISODate;
}

export type CreditType = "conversation" | "broadcast";
export type TransactionType = "topup" | "deduct" | "refund" | "admin_grant";

export interface CreditTransaction {
  id: UUID;
  organization_id: UUID;
  credit_type: CreditType;
  transaction_type: TransactionType;
  amount: number;                 // positive = added, negative = deducted
  balance_after: number;
  description: string;
  reference_id: string | null;    // message_id, campaign_id, etc.
  created_by: string | null;      // admin user id for admin_grant
  created_at: ISODate;
}

// =========================================================================
// Conversations & Messages - WhatsApp inbox
// =========================================================================

export type ConversationStatus = "open" | "resolved" | "expired" | "bot";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface Conversation {
  id: UUID;
  organization_id: UUID;
  contact_id: UUID;
  org_channel_id: UUID;
  status: ConversationStatus;
  assignee_id: UUID | null;
  tags: string[];
  last_message_at: ISODate | null;
  last_message_preview: string | null;
  unread_count: number;
  window_expires_at: ISODate | null;  // WhatsApp 24h window
  created_at: ISODate;
}

export type MessageContentType = "text" | "image" | "document" | "audio" | "video" | "template" | "interactive";

export interface Message {
  id: UUID;
  conversation_id: UUID;
  organization_id: UUID;
  direction: MessageDirection;
  content_type: MessageContentType;
  body: string;
  media_url: string | null;
  template_name: string | null;
  interactive_buttons: Array<{ id: string; title: string }> | null;
  wa_message_id: string | null;   // Meta's message ID for status tracking
  status: MessageStatus;
  created_at: ISODate;
}

// =========================================================================
// Workflows - visual bot flows (ReactFlow nodes + edges stored as JSON)
// =========================================================================

export type WorkflowStatus = "active" | "paused" | "draft";

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
}

export interface Workflow {
  id: UUID;
  organization_id: UUID;
  name: string;
  trigger: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  org_channel_id: UUID | null;
  runs_total: number;
  runs_last_30d: number;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface WorkflowRun {
  id: UUID;
  workflow_id: UUID;
  organization_id: UUID;
  contact_id: UUID | null;
  conversation_id: UUID | null;
  status: "running" | "completed" | "failed";
  current_node_id: string | null;
  variables: Record<string, string>;
  error: string | null;
  started_at: ISODate;
  ended_at: ISODate | null;
}
