import type {
  AnalyticsSummary,
  Appointment,
  Automation,
  AuditEvent,
  Campaign,
  Contact,
  ContactImport,
  ContactLabel,
  Conversation,
  CreditTransaction,
  FAQItem,
  FollowUp,
  Integration,
  Lead,
  Message,
  OrgChannel,
  Organization,
  Profile,
  Ticket,
  Wallet,
  Workflow,
} from "./types";

const ORG_ID = "org_demo_0001";
const USER_ID = "usr_demo_0001";

const now = () => new Date().toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const hoursAhead = (n: number) =>
  new Date(Date.now() + n * 60 * 60 * 1000).toISOString();

export const mockOrg: Organization = {
  id: ORG_ID,
  name: "Acme Realty",
  slug: "acme",
  industry: "Real Estate",
  timezone: "Asia/Kolkata",
  brand_color: "#5B5BF7",
  logo_url: null,
  business_hours: "Mon–Sat 9:00–19:00",
  created_at: daysAgo(120),
};

export const mockProfile: Profile = {
  id: USER_ID,
  email: "demo@automateos.app",
  full_name: "Aarav Sharma",
  avatar_url: null,
  organization_id: ORG_ID,
  role: "owner",
  created_at: daysAgo(120),
};

const FIRST = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Kabir", "Anaya", "Saanvi", "Diya", "Pari", "Aadhya", "Myra", "Anvi", "Riya", "Aarohi", "Liam", "Olivia", "Noah", "Emma", "Ava", "Mia", "Sophia"];
const LAST = ["Sharma", "Verma", "Patel", "Kumar", "Singh", "Gupta", "Reddy", "Iyer", "Mehta", "Nair", "Shah", "Joshi", "Smith", "Johnson", "Brown", "Garcia", "Lee", "Wilson"];
const SOURCES = ["Website Form", "WhatsApp", "Facebook Ads", "Google Ads", "Referral", "Cold Outreach", "Instagram", "Walk-in"];
const TAGS = ["budget-3br", "premium", "first-time-buyer", "investor", "rental", "follow-up-needed", "demo-requested", "ready-to-close"];
const NOTES = [
  "Interested in 3BR apartments in central area. Budget 80L.",
  "Asked for site visit next weekend. Wants parking + balcony.",
  "Investor - looking at 2 units min. Cash buyer.",
  "Replied via WhatsApp. Wants brochure of new project.",
  "Cold contact, may need nurturing for 30+ days.",
  "Met at expo. Very engaged. Send proposal.",
  null,
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function rngSeed(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = rngSeed(42);
const pickSeeded = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)] as T;

export const mockLeads: Lead[] = Array.from({ length: 36 }, (_, i) => {
  const first = pickSeeded(FIRST);
  const last = pickSeeded(LAST);
  const score = Math.floor(rand() * 100);
  const temp = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
  const statuses: Lead["status"][] = ["new", "contacted", "qualified", "proposal", "won", "lost"];
  const weights = [0.35, 0.25, 0.18, 0.1, 0.07, 0.05];
  const r = rand();
  let acc = 0;
  let status: Lead["status"] = "new";
  for (let k = 0; k < statuses.length; k++) {
    acc += weights[k]!;
    if (r < acc) { status = statuses[k]!; break; }
  }
  return {
    id: `lead_${(i + 1).toString().padStart(4, "0")}`,
    organization_id: ORG_ID,
    name: `${first} ${last}`,
    email: `${first}.${last}`.toLowerCase() + `@example.com`,
    phone: `+91 9${Math.floor(100000000 + rand() * 899999999)}`,
    source: pickSeeded(SOURCES),
    status,
    temperature: temp,
    score,
    intent: temp === "hot" ? "High purchase intent" : temp === "warm" ? "Researching options" : "Awareness only",
    tags: Array.from({ length: 1 + Math.floor(rand() * 2) }, () => pickSeeded(TAGS)),
    notes: pickSeeded(NOTES),
    owner_id: USER_ID,
    last_contacted_at: rand() > 0.2 ? daysAgo(Math.floor(rand() * 14)) : null,
    created_at: daysAgo(Math.floor(rand() * 60)),
  };
});

const TEMPLATES = ["Welcome Flow", "Reactivation", "Festive Offer", "Demo Reminder", "Site Visit Followup"];

export const mockCampaigns: Campaign[] = [
  {
    id: "camp_001",
    organization_id: ORG_ID,
    name: "October Site Visits",
    channel: "whatsapp",
    template_id: null,
    audience_filter: { temperature: "warm" },
    status: "running",
    scheduled_at: daysAgo(2),
    sent_count: 1240,
    delivered_count: 1198,
    failed_count: 42,
    reply_count: 187,
    created_at: daysAgo(5),
  },
  {
    id: "camp_002",
    organization_id: ORG_ID,
    name: "Festive Discount Blast",
    channel: "email",
    template_id: null,
    audience_filter: {},
    status: "scheduled",
    scheduled_at: hoursAhead(36),
    sent_count: 0,
    delivered_count: 0,
    failed_count: 0,
    reply_count: 0,
    created_at: daysAgo(1),
  },
  {
    id: "camp_003",
    organization_id: ORG_ID,
    name: "Premium Buyers Outreach",
    channel: "whatsapp",
    template_id: null,
    audience_filter: { tags: ["premium"] },
    status: "completed",
    scheduled_at: daysAgo(14),
    sent_count: 380,
    delivered_count: 376,
    failed_count: 4,
    reply_count: 91,
    created_at: daysAgo(16),
  },
  {
    id: "camp_004",
    organization_id: ORG_ID,
    name: "Win-back Inactive 30d",
    channel: "telegram",
    template_id: null,
    audience_filter: { last_contacted_days: 30 },
    status: "draft",
    scheduled_at: null,
    sent_count: 0,
    delivered_count: 0,
    failed_count: 0,
    reply_count: 0,
    created_at: daysAgo(0),
  },
];

export const mockAppointments: Appointment[] = Array.from({ length: 12 }, (_, i) => ({
  id: `appt_${(i + 1).toString().padStart(4, "0")}`,
  organization_id: ORG_ID,
  lead_id: `lead_${(1 + Math.floor(rand() * 36)).toString().padStart(4, "0")}`,
  contact_name: `${pickSeeded(FIRST)} ${pickSeeded(LAST)}`,
  contact_email: "client@example.com",
  service: pickSeeded(["Site Visit", "Discovery Call", "Property Tour", "Strategy Session", "Demo"]),
  starts_at: hoursAhead(i * 6 - 24),
  duration_min: pickSeeded([30, 45, 60]),
  status: pickSeeded(["confirmed", "pending", "confirmed", "completed"]),
  notes: rand() > 0.5 ? "Bring brochure + parking pass details." : null,
  created_at: daysAgo(Math.floor(rand() * 7)),
}));

export const mockTickets: Ticket[] = Array.from({ length: 14 }, (_, i) => ({
  id: `tkt_${(i + 1).toString().padStart(4, "0")}`,
  organization_id: ORG_ID,
  subject: pickSeeded([
    "Cannot access portal",
    "Refund request for booking",
    "Question about availability",
    "Document upload failing",
    "Pricing clarification",
    "Reschedule appointment",
    "Payment receipt missing",
  ]),
  category: pickSeeded(["Account", "Billing", "Booking", "Technical", "General"]),
  priority: pickSeeded(["low", "normal", "high", "urgent"]),
  status: pickSeeded(["open", "in_progress", "waiting", "resolved"]),
  contact_name: `${pickSeeded(FIRST)} ${pickSeeded(LAST)}`,
  contact_email: "support@example.com",
  assignee_id: rand() > 0.3 ? USER_ID : null,
  description: "Customer reports the issue is preventing them from completing the action. Provided screenshots.",
  created_at: daysAgo(Math.floor(rand() * 10)),
  updated_at: daysAgo(Math.floor(rand() * 3)),
}));

export const mockFAQ: FAQItem[] = [
  {
    id: "faq_001",
    organization_id: ORG_ID,
    question: "What are your business hours?",
    answer: "We are open Monday to Saturday, 9:00 AM to 7:00 PM IST.",
    tags: ["hours"],
    uses: 142,
    enabled: true,
    created_at: daysAgo(60),
  },
  {
    id: "faq_002",
    organization_id: ORG_ID,
    question: "How do I schedule a site visit?",
    answer: "Reply with the property name and your preferred date - we will confirm within 1 business hour.",
    tags: ["booking"],
    uses: 318,
    enabled: true,
    created_at: daysAgo(60),
  },
  {
    id: "faq_003",
    organization_id: ORG_ID,
    question: "Do you offer financing assistance?",
    answer: "Yes, we partner with HDFC, ICICI and SBI. Share your details and we will connect you with a loan officer.",
    tags: ["financing"],
    uses: 86,
    enabled: true,
    created_at: daysAgo(40),
  },
  {
    id: "faq_004",
    organization_id: ORG_ID,
    question: "What documents are needed for booking?",
    answer: "PAN card, Aadhaar, recent payslip, and 6 months bank statement.",
    tags: ["documents"],
    uses: 64,
    enabled: true,
    created_at: daysAgo(30),
  },
  {
    id: "faq_005",
    organization_id: ORG_ID,
    question: "Is the booking amount refundable?",
    answer: "Booking amount is fully refundable within 7 days of payment, subject to terms.",
    tags: ["refund", "policy"],
    uses: 41,
    enabled: false,
    created_at: daysAgo(15),
  },
];

export const mockFollowUps: FollowUp[] = [
  {
    id: "fup_001",
    organization_id: ORG_ID,
    name: "New Lead → 5-Touch Nurture",
    trigger: "lead.created",
    status: "active",
    active_count: 84,
    conversion_count: 19,
    created_at: daysAgo(20),
    steps: [
      { id: "s1", delay_minutes: 0, channel: "whatsapp", template: "Welcome + ask intent", stop_on_reply: true },
      { id: "s2", delay_minutes: 60, channel: "email", template: "Brochure + social proof", stop_on_reply: false },
      { id: "s3", delay_minutes: 60 * 24, channel: "whatsapp", template: "Soft check-in", stop_on_reply: true },
      { id: "s4", delay_minutes: 60 * 24 * 3, channel: "whatsapp", template: "Offer of consultation", stop_on_reply: true },
      { id: "s5", delay_minutes: 60 * 24 * 7, channel: "email", template: "Final value drop", stop_on_reply: false },
    ],
  },
  {
    id: "fup_002",
    organization_id: ORG_ID,
    name: "No-Show Recovery",
    trigger: "appointment.no_show",
    status: "active",
    active_count: 12,
    conversion_count: 4,
    created_at: daysAgo(40),
    steps: [
      { id: "s1", delay_minutes: 30, channel: "whatsapp", template: "Sorry we missed you - reschedule?", stop_on_reply: true },
      { id: "s2", delay_minutes: 60 * 24, channel: "email", template: "Reschedule link + benefits", stop_on_reply: true },
    ],
  },
  {
    id: "fup_003",
    organization_id: ORG_ID,
    name: "Inactive 14-Day Reactivation",
    trigger: "lead.inactive_14d",
    status: "paused",
    active_count: 0,
    conversion_count: 0,
    created_at: daysAgo(60),
    steps: [
      { id: "s1", delay_minutes: 0, channel: "whatsapp", template: "Hey, still interested?", stop_on_reply: true },
    ],
  },
];

export const mockIntegrations: Integration[] = [
  {
    id: "int_gmail",
    organization_id: ORG_ID,
    provider: "gmail",
    label: "Gmail (sales@acme.com)",
    status: "connected",
    config: { email: "sales@acme.com" },
    last_synced_at: daysAgo(0),
    created_at: daysAgo(45),
  },
  {
    id: "int_whatsapp",
    organization_id: ORG_ID,
    provider: "whatsapp",
    label: "WhatsApp Business API",
    status: "connected",
    config: { phone_number: "+91 80000 00000" },
    last_synced_at: daysAgo(0),
    created_at: daysAgo(30),
  },
  {
    id: "int_calendar",
    organization_id: ORG_ID,
    provider: "google_calendar",
    label: "Google Calendar",
    status: "connected",
    config: { calendar_id: "primary" },
    last_synced_at: daysAgo(0),
    created_at: daysAgo(20),
  },
  {
    id: "int_sheets",
    organization_id: ORG_ID,
    provider: "google_sheets",
    label: "Leads → Master Sheet",
    status: "error",
    config: { sheet_url: "https://docs.google.com/..." },
    last_synced_at: daysAgo(2),
    created_at: daysAgo(50),
  },
  {
    id: "int_telegram",
    organization_id: ORG_ID,
    provider: "telegram",
    label: "Telegram Bot",
    status: "disconnected",
    config: {},
    last_synced_at: null,
    created_at: daysAgo(10),
  },
  {
    id: "int_openai",
    organization_id: ORG_ID,
    provider: "openai",
    label: "OpenAI (lead scoring)",
    status: "connected",
    config: { model: "gpt-4o-mini" },
    last_synced_at: daysAgo(0),
    created_at: daysAgo(15),
  },
];

export const mockAutomations: Automation[] = [
  {
    id: "auto_001",
    organization_id: ORG_ID,
    name: "AI Lead Qualifier",
    description: "Scores every new lead and routes hot leads to sales channel.",
    trigger: "lead.created",
    webhook_url: "/api/trigger/lead.qualify",
    status: "active",
    last_run_at: daysAgo(0),
    runs_today: 47,
    success_rate: 98.2,
    created_at: daysAgo(40),
  },
  {
    id: "auto_002",
    organization_id: ORG_ID,
    name: "WhatsApp Auto-Reply",
    description: "Replies instantly to inbound WhatsApp using FAQ + AI fallback.",
    trigger: "whatsapp.inbound",
    webhook_url: "/api/trigger/faq.reply",
    status: "active",
    last_run_at: daysAgo(0),
    runs_today: 213,
    success_rate: 99.1,
    created_at: daysAgo(30),
  },
  {
    id: "auto_003",
    organization_id: ORG_ID,
    name: "Appointment Reminder",
    description: "Sends 24h + 1h reminders via WhatsApp & email.",
    trigger: "appointment.upcoming",
    webhook_url: "/api/trigger/appointment.remind",
    status: "active",
    last_run_at: daysAgo(0),
    runs_today: 34,
    success_rate: 100,
    created_at: daysAgo(25),
  },
  {
    id: "auto_004",
    organization_id: ORG_ID,
    name: "Inactive Lead Retargeting",
    description: "Detects 14d inactivity, runs re-engagement sequence.",
    trigger: "lead.inactive_14d",
    webhook_url: "/api/trigger/retargeting.run",
    status: "paused",
    last_run_at: daysAgo(3),
    runs_today: 0,
    success_rate: 92.5,
    created_at: daysAgo(60),
  },
  {
    id: "auto_005",
    organization_id: ORG_ID,
    name: "Daily KPI Digest",
    description: "Posts a Slack/email digest of yesterday's KPIs.",
    trigger: "schedule.daily",
    webhook_url: "/api/trigger/digest.daily",
    status: "active",
    last_run_at: daysAgo(0),
    runs_today: 1,
    success_rate: 100,
    created_at: daysAgo(70),
  },
];

export const mockAnalytics: AnalyticsSummary = {
  leads_total: 1248,
  leads_new_7d: 86,
  conversion_rate: 14.3,
  active_campaigns: 2,
  appointments_7d: 32,
  open_tickets: 9,
  avg_response_min: 4,
  channel_performance: [
    { channel: "whatsapp", sent: 1620, delivered: 1574, replies: 278 },
    { channel: "email", sent: 980, delivered: 942, replies: 73 },
    { channel: "telegram", sent: 210, delivered: 208, replies: 41 },
    { channel: "sms", sent: 80, delivered: 78, replies: 6 },
  ],
  weekly_leads: [
    { day: "Mon", leads: 14, qualified: 5 },
    { day: "Tue", leads: 18, qualified: 7 },
    { day: "Wed", leads: 11, qualified: 4 },
    { day: "Thu", leads: 22, qualified: 9 },
    { day: "Fri", leads: 19, qualified: 8 },
    { day: "Sat", leads: 25, qualified: 12 },
    { day: "Sun", leads: 9, qualified: 3 },
  ],
  funnel: [
    { stage: "New", count: 412 },
    { stage: "Contacted", count: 286 },
    { stage: "Qualified", count: 198 },
    { stage: "Proposal", count: 102 },
    { stage: "Won", count: 58 },
  ],
  score_distribution: [
    { band: "0-20", count: 184 },
    { band: "21-40", count: 312 },
    { band: "41-60", count: 358 },
    { band: "61-80", count: 247 },
    { band: "81-100", count: 147 },
  ],
};

export const mockAudit: AuditEvent[] = Array.from({ length: 10 }, (_, i) => ({
  id: `aud_${(i + 1).toString().padStart(4, "0")}`,
  organization_id: ORG_ID,
  actor: pickSeeded(["Aarav Sharma", "system", "WhatsApp Bot", "AI Qualifier"]),
  action: pickSeeded(["lead.created", "campaign.launched", "automation.triggered", "ticket.resolved", "integration.connected"]),
  target: pickSeeded(["lead_0001", "camp_001", "auto_002", "tkt_0003", "int_whatsapp"]),
  metadata: {},
  created_at: daysAgo(i * 0.3),
}));

// =========================================================================
// Contacts - WhatsApp address book
// =========================================================================

const CONTACT_TAGS = ["customer", "prospect", "vip", "cold", "clinic", "follow-up", "pharmacy", "doctor", "corporate"];

export const mockContacts: Contact[] = Array.from({ length: 40 }, (_, i) => {
  const first = pickSeeded(FIRST);
  const last = pickSeeded(LAST);
  const phone = `+91${9000000001 + i}`;
  return {
    id: `contact_${(i + 1).toString().padStart(4, "0")}`,
    organization_id: ORG_ID,
    name: `${first} ${last}`,
    phone,
    email: rand() > 0.4 ? `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com` : null,
    avatar_url: null,
    tags: Array.from({ length: Math.floor(rand() * 2) + 1 }, () => pickSeeded(CONTACT_TAGS)),
    custom_attributes: i % 3 === 0 ? { city: "Mumbai", dob: "1990-05-12" } : ({} as Record<string, string>),
    opted_out: i === 5 || i === 18,
    whatsapp_valid: i !== 7 && i !== 22,
    last_messaged_at: rand() > 0.3 ? daysAgo(Math.floor(rand() * 30)) : null,
    created_at: daysAgo(Math.floor(rand() * 90)),
  };
});

// =========================================================================
// OrgChannel - demo WhatsApp channel
// =========================================================================

export const mockOrgChannels: OrgChannel[] = [
  {
    id: "chan_wa_001",
    organization_id: ORG_ID,
    provider: "whatsapp",
    label: "Acme Realty WhatsApp",
    phone_number: "+91 98765 00000",
    waba_id: "1234567890",
    phone_number_id: "9876543210",
    access_token: "EAAxxxxxx",   // masked in UI
    bot_token: null,
    twilio_account_sid: null,
    twilio_auth_token: null,
    twilio_from_number: null,
    status: "active",
    connected_at: daysAgo(30),
    created_at: daysAgo(30),
  },
  {
    id: "chan_tg_001",
    organization_id: ORG_ID,
    provider: "telegram",
    label: "Acme Support Bot",
    phone_number: null,
    waba_id: null,
    phone_number_id: null,
    access_token: null,
    bot_token: "7654321:AAFxxxxxx",
    twilio_account_sid: null,
    twilio_auth_token: null,
    twilio_from_number: null,
    status: "disconnected",
    connected_at: null,
    created_at: daysAgo(5),
  },
];

// =========================================================================
// Wallet & Credit Transactions
// =========================================================================

export const mockWallet: Wallet = {
  id: "wallet_001",
  organization_id: ORG_ID,
  conversation_credits: 1240,
  broadcast_credits: 8500,
  lifetime_conversation_added: 2000,
  lifetime_broadcast_added: 10000,
  lifetime_conversation_spent: 760,
  lifetime_broadcast_spent: 1500,
  updated_at: daysAgo(0),
};

export const mockCreditTransactions: CreditTransaction[] = [
  { id: "tx_001", organization_id: ORG_ID, credit_type: "broadcast", transaction_type: "admin_grant", amount: 10000, balance_after: 10000, description: "Initial credit grant by admin", reference_id: null, created_by: "admin_001", created_at: daysAgo(30) },
  { id: "tx_002", organization_id: ORG_ID, credit_type: "broadcast", transaction_type: "deduct",      amount: -1500, balance_after: 8500,  description: "Campaign: October Site Visits (1240 recipients + failed)", reference_id: "camp_001", created_by: null, created_at: daysAgo(2) },
  { id: "tx_003", organization_id: ORG_ID, credit_type: "conversation", transaction_type: "admin_grant", amount: 2000, balance_after: 2000, description: "Conversation credits grant", reference_id: null, created_by: "admin_001", created_at: daysAgo(30) },
  { id: "tx_004", organization_id: ORG_ID, credit_type: "conversation", transaction_type: "deduct",      amount: -760,  balance_after: 1240, description: "760 conversation windows opened", reference_id: null, created_by: null, created_at: daysAgo(1) },
  { id: "tx_005", organization_id: ORG_ID, credit_type: "broadcast", transaction_type: "deduct",      amount: -380, balance_after: 8500, description: "Campaign: Premium Buyers Outreach", reference_id: "camp_003", created_by: null, created_at: daysAgo(14) },
];

// =========================================================================
// Conversations & Messages - demo inbox data
// =========================================================================

export const mockConversations: Conversation[] = [
  {
    id: "conv_001",
    organization_id: ORG_ID,
    contact_id: "contact_0001",
    org_channel_id: "chan_wa_001",
    status: "open",
    assignee_id: USER_ID,
    tags: ["vip"],
    last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    last_message_preview: "Yes, I would like to schedule a visit this Saturday.",
    unread_count: 2,
    window_expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    created_at: daysAgo(1),
  },
  {
    id: "conv_002",
    organization_id: ORG_ID,
    contact_id: "contact_0002",
    org_channel_id: "chan_wa_001",
    status: "open",
    assignee_id: null,
    tags: [],
    last_message_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    last_message_preview: "What is the price for the 3BHK unit?",
    unread_count: 1,
    window_expires_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
    created_at: daysAgo(2),
  },
  {
    id: "conv_003",
    organization_id: ORG_ID,
    contact_id: "contact_0003",
    org_channel_id: "chan_wa_001",
    status: "expired",
    assignee_id: USER_ID,
    tags: ["follow-up"],
    last_message_at: daysAgo(2),
    last_message_preview: "Please send me the brochure.",
    unread_count: 0,
    window_expires_at: daysAgo(1),
    created_at: daysAgo(3),
  },
  {
    id: "conv_004",
    organization_id: ORG_ID,
    contact_id: "contact_0004",
    org_channel_id: "chan_wa_001",
    status: "resolved",
    assignee_id: USER_ID,
    tags: [],
    last_message_at: daysAgo(4),
    last_message_preview: "Thank you, appointment confirmed!",
    unread_count: 0,
    window_expires_at: null,
    created_at: daysAgo(5),
  },
];

export const mockMessages: Message[] = [
  // conv_001
  { id: "msg_001", conversation_id: "conv_001", organization_id: ORG_ID, direction: "inbound",  content_type: "text", body: "Hi, I saw your listing on 99acres. Is the 3BHK still available?", media_url: null, template_name: null, interactive_buttons: null, wa_message_id: "wamid.001", status: "read", created_at: daysAgo(1) },
  { id: "msg_002", conversation_id: "conv_001", organization_id: ORG_ID, direction: "outbound", content_type: "text", body: "Hello! Yes, the 3BHK at Acme Heights is available. Would you like to schedule a site visit?", media_url: null, template_name: null, interactive_buttons: null, wa_message_id: "wamid.002", status: "read", created_at: daysAgo(1) },
  { id: "msg_003", conversation_id: "conv_001", organization_id: ORG_ID, direction: "outbound", content_type: "interactive", body: "Please choose a time that works for you:", media_url: null, template_name: null, interactive_buttons: [{ id: "sat_morning", title: "Saturday Morning" }, { id: "sat_evening", title: "Saturday Evening" }, { id: "sun_morning", title: "Sunday Morning" }], wa_message_id: "wamid.003", status: "delivered", created_at: daysAgo(1) },
  { id: "msg_004", conversation_id: "conv_001", organization_id: ORG_ID, direction: "inbound",  content_type: "text", body: "Yes, I would like to schedule a visit this Saturday.", media_url: null, template_name: null, interactive_buttons: null, wa_message_id: "wamid.004", status: "read", created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  // conv_002
  { id: "msg_005", conversation_id: "conv_002", organization_id: ORG_ID, direction: "inbound",  content_type: "text", body: "What is the price for the 3BHK unit?", media_url: null, template_name: null, interactive_buttons: null, wa_message_id: "wamid.005", status: "read", created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
  // conv_003
  { id: "msg_006", conversation_id: "conv_003", organization_id: ORG_ID, direction: "inbound",  content_type: "text", body: "Please send me the brochure.", media_url: null, template_name: null, interactive_buttons: null, wa_message_id: "wamid.006", status: "read", created_at: daysAgo(2) },
  { id: "msg_007", conversation_id: "conv_003", organization_id: ORG_ID, direction: "outbound", content_type: "document", body: "Acme Heights Brochure", media_url: "/mock/brochure.pdf", template_name: null, interactive_buttons: null, wa_message_id: "wamid.007", status: "delivered", created_at: daysAgo(2) },
];

// =========================================================================
// Contact Labels - named contact groups
// =========================================================================

export const mockContactLabels: ContactLabel[] = [
  { id: "lbl_001", organization_id: ORG_ID, name: "Diet Patient",   contact_count: 104,  created_at: daysAgo(17), updated_at: daysAgo(17) },
  { id: "lbl_002", organization_id: ORG_ID, name: "New Gen Pat",    contact_count: 3837, created_at: daysAgo(41), updated_at: daysAgo(11) },
  { id: "lbl_003", organization_id: ORG_ID, name: "Ped New",        contact_count: 7899, created_at: daysAgo(42), updated_at: daysAgo(42) },
  { id: "lbl_004", organization_id: ORG_ID, name: "Gyn Pat List",   contact_count: 5212, created_at: daysAgo(42), updated_at: daysAgo(42) },
  { id: "lbl_005", organization_id: ORG_ID, name: "Old Gynec Pat",  contact_count: 247,  created_at: daysAgo(42), updated_at: daysAgo(42) },
  { id: "lbl_006", organization_id: ORG_ID, name: "Pediatric Pat",  contact_count: 615,  created_at: daysAgo(45), updated_at: daysAgo(45) },
  { id: "lbl_007", organization_id: ORG_ID, name: "Replied To",     contact_count: 30,   created_at: daysAgo(74), updated_at: daysAgo(74) },
];

// =========================================================================
// Workflows - saved visual bot flows
// =========================================================================

export const mockWorkflows: Workflow[] = [
  {
    id: "wf_001",
    organization_id: ORG_ID,
    name: "PCOS Awareness Flow",
    trigger: "incoming_whatsapp",
    nodes: [],
    edges: [],
    status: "active",
    org_channel_id: "chan_wa_001",
    runs_total: 482,
    runs_last_30d: 143,
    created_at: daysAgo(20),
    updated_at: daysAgo(2),
  },
  {
    id: "wf_002",
    organization_id: ORG_ID,
    name: "Lead Qualification Bot",
    trigger: "incoming_whatsapp",
    nodes: [],
    edges: [],
    status: "paused",
    org_channel_id: "chan_wa_001",
    runs_total: 210,
    runs_last_30d: 0,
    created_at: daysAgo(45),
    updated_at: daysAgo(10),
  },
];
