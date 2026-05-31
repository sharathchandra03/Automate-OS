// =========================================================================
// Unified data API. Uses Supabase if env is configured, otherwise mock data.
// All queries are tenant-scoped at the data layer.
// =========================================================================

import { HAS_SUPABASE } from "./config";
import {
  mockAnalytics,
  mockAppointments,
  mockAudit,
  mockAutomations,
  mockCampaigns,
  mockContactLabels,
  mockContacts,
  mockConversations,
  mockCreditTransactions,
  mockFAQ,
  mockFollowUps,
  mockIntegrations,
  mockLeads,
  mockMessages,
  mockOrg,
  mockOrgChannels,
  mockProfile,
  mockTickets,
  mockWallet,
  mockWorkflows,
} from "./mock-data";
import { createSupabaseBrowserClient } from "./supabase/client";
import type {
  AnalyticsSummary,
  Appointment,
  AuditEvent,
  Automation,
  Campaign,
  Contact,
  ContactImport,
  ContactLabel,
  Conversation,
  CreditTransaction,
  CreditType,
  FAQItem,
  FollowUp,
  FollowUpStatus,
  Integration,
  KnowledgeArticle,
  Lead,
  Message,
  OrgChannel,
  Organization,
  Profile,
  Ticket,
  Wallet,
  Workflow,
} from "./types";

// In-memory store for the demo session so create/update feel real.
const memory = {
  org: { ...mockOrg },
  profile: { ...mockProfile },
  leads: [...mockLeads],
  campaigns: [...mockCampaigns],
  appointments: [...mockAppointments],
  tickets: [...mockTickets],
  faq: [...mockFAQ],
  followups: [...mockFollowUps],
  integrations: [...mockIntegrations],
  automations: [...mockAutomations],
  audit: [...mockAudit],
  analytics: { ...mockAnalytics },
  contacts: [...mockContacts],
  contactLabels: [...mockContactLabels],
  orgChannels: [...mockOrgChannels],
  wallet: { ...mockWallet },
  creditTransactions: [...mockCreditTransactions],
  conversations: [...mockConversations],
  messages: [...mockMessages],
  workflows: [...mockWorkflows],
  knowledgeArticles: [] as KnowledgeArticle[],
};

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

// Per-session cache so we only hit profiles once per page load
const _orgCache = new Map<string, string>();

/** Clear org cache — call after org creation or logout */
export function clearOrgCache() { _orgCache.clear(); }

// Helper: get org ID by querying the profiles table (not user_metadata, which is never set)
async function getOrgId(supabase: ReturnType<typeof createSupabaseBrowserClient>): Promise<string> {
  if (!supabase) return memory.org.id;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return memory.org.id;

  const cached = _orgCache.get(user.id);
  if (cached) return cached;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id as string | null;
  if (!orgId) return memory.org.id; // no org yet → demo data while onboarding
  _orgCache.set(user.id, orgId);
  return orgId;
}

// =====================  Read APIs  =====================

export async function getOrganization(): Promise<Organization> {
  if (!HAS_SUPABASE) return delay(memory.org);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.org);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (error) throw new Error(error.message);
  return data as Organization;
}

export async function getProfile(): Promise<Profile> {
  if (!HAS_SUPABASE) return delay(memory.profile);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.profile);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return delay(memory.profile);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) return delay(memory.profile);
  return data as Profile;
}

export async function getLeads(): Promise<Lead[]> {
  if (!HAS_SUPABASE) return delay(memory.leads);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.leads);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Lead[];
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!HAS_SUPABASE) return delay(memory.leads.find((l) => l.id === id) ?? null);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.leads.find((l) => l.id === id) ?? null);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) return null;
  return data as Lead;
}

export async function getCampaigns(): Promise<Campaign[]> {
  if (!HAS_SUPABASE) return delay(memory.campaigns);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.campaigns);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Campaign[];
}

export async function getAppointments(): Promise<Appointment[]> {
  if (!HAS_SUPABASE) return delay(memory.appointments);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.appointments);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", orgId)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Appointment[];
}

export async function getTickets(): Promise<Ticket[]> {
  if (!HAS_SUPABASE) return delay(memory.tickets);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.tickets);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Ticket[];
}

export async function getFAQ(): Promise<FAQItem[]> {
  if (!HAS_SUPABASE) return delay(memory.faq);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.faq);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("faq_items")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as FAQItem[];
}

export async function getFollowUps(): Promise<FollowUp[]> {
  if (!HAS_SUPABASE) return delay(memory.followups);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.followups);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as FollowUp[];
}

export async function getIntegrations(): Promise<Integration[]> {
  if (!HAS_SUPABASE) return delay(memory.integrations);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.integrations);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Integration[];
}

export async function getAutomations(): Promise<Automation[]> {
  if (!HAS_SUPABASE) return delay(memory.automations);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.automations);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Automation[];
}

export async function getAudit(): Promise<AuditEvent[]> {
  if (!HAS_SUPABASE) return delay(memory.audit);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.audit);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data as AuditEvent[];
}

export async function getAnalytics(): Promise<AnalyticsSummary> {
  if (!HAS_SUPABASE) return delay(memory.analytics);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.analytics);
  const orgId = await getOrgId(supabase);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("analytics_events")
    .select("event, properties, occurred_at")
    .eq("organization_id", orgId)
    .order("occurred_at", { ascending: false });
  if (error || !data) return delay(memory.analytics);
  const leadsTotal = data.filter((e) => e.event === "lead.created").length;
  const leadsNew7d = data.filter((e) => e.event === "lead.created" && e.occurred_at >= sevenDaysAgo).length;
  const leadsQualified = data.filter((e) => e.event === "lead.qualified").length;
  return delay({
    ...memory.analytics,
    leads_total: leadsTotal || memory.analytics.leads_total,
    leads_new_7d: leadsNew7d || memory.analytics.leads_new_7d,
    conversion_rate: leadsTotal > 0
      ? Math.round((leadsQualified / leadsTotal) * 100)
      : memory.analytics.conversion_rate,
  });
}

// =====================  Mutations (in-memory)  =====================

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
const nowIso = () => new Date().toISOString();

export async function createLead(input: Partial<Lead> & { name: string }): Promise<Lead> {
  if (!HAS_SUPABASE) {
    const lead: Lead = {
      id: uid("lead"),
      organization_id: memory.org.id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? "Manual",
      status: input.status ?? "new",
      temperature: input.temperature ?? "warm",
      score: input.score ?? 50,
      intent: input.intent ?? null,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      owner_id: memory.profile.id,
      last_contacted_at: null,
      created_at: nowIso(),
    };
    memory.leads.unshift(lead);
    memory.analytics.leads_total += 1;
    memory.analytics.leads_new_7d += 1;
    return delay(lead, 200);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const lead: Lead = {
      id: uid("lead"),
      organization_id: memory.org.id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? "Manual",
      status: input.status ?? "new",
      temperature: input.temperature ?? "warm",
      score: input.score ?? 50,
      intent: input.intent ?? null,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      owner_id: memory.profile.id,
      last_contacted_at: null,
      created_at: nowIso(),
    };
    memory.leads.unshift(lead);
    return delay(lead, 200);
  }
  const orgId = await getOrgId(supabase);
  const { data: { user } } = await supabase.auth.getUser();
  const payload = {
    organization_id: orgId,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    source: input.source ?? "Manual",
    status: input.status ?? "new",
    temperature: input.temperature ?? "warm",
    score: input.score ?? 50,
    intent: input.intent ?? null,
    tags: input.tags ?? [],
    notes: input.notes ?? null,
    owner_id: user?.id ?? null,
    last_contacted_at: null,
  };
  const { data, error } = await supabase
    .from("leads")
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  if (!HAS_SUPABASE) {
    const i = memory.leads.findIndex((l) => l.id === id);
    if (i < 0) return null;
    memory.leads[i] = { ...memory.leads[i]!, ...patch };
    return delay(memory.leads[i]!, 150);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const i = memory.leads.findIndex((l) => l.id === id);
    if (i < 0) return null;
    memory.leads[i] = { ...memory.leads[i]!, ...patch };
    return delay(memory.leads[i]!, 150);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return null;
  return data as Lead;
}

export async function deleteLead(id: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const before = memory.leads.length;
    memory.leads = memory.leads.filter((l) => l.id !== id);
    return delay(memory.leads.length < before, 100);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const before = memory.leads.length;
    memory.leads = memory.leads.filter((l) => l.id !== id);
    return delay(memory.leads.length < before, 100);
  }
  const orgId = await getOrgId(supabase);
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
  return true;
}

export async function createCampaign(input: Partial<Campaign> & { name: string }): Promise<Campaign> {
  if (!HAS_SUPABASE) {
    const c: Campaign = {
      id: uid("camp"),
      organization_id: memory.org.id,
      name: input.name,
      channel: input.channel ?? "whatsapp",
      template_id: null,
      audience_filter: input.audience_filter ?? {},
      status: input.status ?? "draft",
      scheduled_at: input.scheduled_at ?? null,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      reply_count: 0,
      created_at: nowIso(),
    };
    memory.campaigns.unshift(c);
    return delay(c, 180);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const c: Campaign = {
      id: uid("camp"),
      organization_id: memory.org.id,
      name: input.name,
      channel: input.channel ?? "whatsapp",
      template_id: null,
      audience_filter: input.audience_filter ?? {},
      status: input.status ?? "draft",
      scheduled_at: input.scheduled_at ?? null,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      reply_count: 0,
      created_at: nowIso(),
    };
    memory.campaigns.unshift(c);
    return delay(c, 180);
  }
  const orgId = await getOrgId(supabase);
  const payload = {
    organization_id: orgId,
    name: input.name,
    channel: input.channel ?? "whatsapp",
    template_id: input.template_id ?? null,
    audience_filter: input.audience_filter ?? {},
    status: input.status ?? "draft",
    scheduled_at: input.scheduled_at ?? null,
    sent_count: 0,
    delivered_count: 0,
    failed_count: 0,
    reply_count: 0,
  };
  const { data, error } = await supabase
    .from("campaigns")
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}

export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign | null> {
  if (!HAS_SUPABASE) {
    const i = memory.campaigns.findIndex((c) => c.id === id);
    if (i < 0) return null;
    memory.campaigns[i] = { ...memory.campaigns[i]!, ...patch };
    return delay(memory.campaigns[i]!, 150);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const i = memory.campaigns.findIndex((c) => c.id === id);
    if (i < 0) return null;
    memory.campaigns[i] = { ...memory.campaigns[i]!, ...patch };
    return delay(memory.campaigns[i]!, 150);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return null;
  return data as Campaign;
}

export async function createAppointment(input: Partial<Appointment> & { contact_name: string; service: string; starts_at: string }): Promise<Appointment> {
  if (!HAS_SUPABASE) {
    const a: Appointment = {
      id: uid("appt"),
      organization_id: memory.org.id,
      lead_id: input.lead_id ?? null,
      contact_name: input.contact_name,
      contact_email: input.contact_email ?? null,
      service: input.service,
      starts_at: input.starts_at,
      duration_min: input.duration_min ?? 30,
      status: input.status ?? "pending",
      notes: input.notes ?? null,
      created_at: nowIso(),
    };
    memory.appointments.unshift(a);
    return delay(a, 180);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const a: Appointment = {
      id: uid("appt"),
      organization_id: memory.org.id,
      lead_id: input.lead_id ?? null,
      contact_name: input.contact_name,
      contact_email: input.contact_email ?? null,
      service: input.service,
      starts_at: input.starts_at,
      duration_min: input.duration_min ?? 30,
      status: input.status ?? "pending",
      notes: input.notes ?? null,
      created_at: nowIso(),
    };
    memory.appointments.unshift(a);
    return delay(a, 180);
  }
  const orgId = await getOrgId(supabase);
  const payload = {
    organization_id: orgId,
    lead_id: input.lead_id ?? null,
    contact_name: input.contact_name,
    contact_email: input.contact_email ?? null,
    service: input.service,
    starts_at: input.starts_at,
    duration_min: input.duration_min ?? 30,
    status: input.status ?? "pending",
    notes: input.notes ?? null,
  };
  const { data, error } = await supabase
    .from("appointments")
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Appointment;
}

export async function updateAppointment(id: string, patch: Partial<Appointment>): Promise<Appointment | null> {
  if (!HAS_SUPABASE) {
    const i = memory.appointments.findIndex((a) => a.id === id);
    if (i < 0) return null;
    memory.appointments[i] = { ...memory.appointments[i]!, ...patch };
    return delay(memory.appointments[i]!, 120);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const i = memory.appointments.findIndex((a) => a.id === id);
    if (i < 0) return null;
    memory.appointments[i] = { ...memory.appointments[i]!, ...patch };
    return delay(memory.appointments[i]!, 120);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return null;
  return data as Appointment;
}

export async function createTicket(input: Partial<Ticket> & { subject: string; contact_name: string }): Promise<Ticket> {
  if (!HAS_SUPABASE) {
    const t: Ticket = {
      id: uid("tkt"),
      organization_id: memory.org.id,
      subject: input.subject,
      category: input.category ?? "General",
      priority: input.priority ?? "normal",
      status: "open",
      contact_name: input.contact_name,
      contact_email: input.contact_email ?? null,
      assignee_id: null,
      description: input.description ?? "",
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    memory.tickets.unshift(t);
    return delay(t, 180);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const t: Ticket = {
      id: uid("tkt"),
      organization_id: memory.org.id,
      subject: input.subject,
      category: input.category ?? "General",
      priority: input.priority ?? "normal",
      status: "open",
      contact_name: input.contact_name,
      contact_email: input.contact_email ?? null,
      assignee_id: null,
      description: input.description ?? "",
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    memory.tickets.unshift(t);
    return delay(t, 180);
  }
  const orgId = await getOrgId(supabase);
  const payload = {
    organization_id: orgId,
    subject: input.subject,
    category: input.category ?? "General",
    priority: input.priority ?? "normal",
    status: "open" as const,
    contact_name: input.contact_name,
    contact_email: input.contact_email ?? null,
    assignee_id: null,
    description: input.description ?? "",
  };
  const { data, error } = await supabase
    .from("tickets")
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Ticket;
}

export async function updateTicket(id: string, patch: Partial<Ticket>): Promise<Ticket | null> {
  if (!HAS_SUPABASE) {
    const i = memory.tickets.findIndex((t) => t.id === id);
    if (i < 0) return null;
    memory.tickets[i] = { ...memory.tickets[i]!, ...patch, updated_at: nowIso() };
    return delay(memory.tickets[i]!, 120);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const i = memory.tickets.findIndex((t) => t.id === id);
    if (i < 0) return null;
    memory.tickets[i] = { ...memory.tickets[i]!, ...patch, updated_at: nowIso() };
    return delay(memory.tickets[i]!, 120);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("tickets")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return null;
  return data as Ticket;
}

export async function upsertFAQ(input: Partial<FAQItem> & { question: string; answer: string }): Promise<FAQItem> {
  if (!HAS_SUPABASE) {
    if (input.id) {
      const i = memory.faq.findIndex((f) => f.id === input.id);
      if (i >= 0) {
        memory.faq[i] = { ...memory.faq[i]!, ...input } as FAQItem;
        return delay(memory.faq[i]!, 100);
      }
    }
    const f: FAQItem = {
      id: uid("faq"),
      organization_id: memory.org.id,
      question: input.question,
      answer: input.answer,
      tags: input.tags ?? [],
      uses: 0,
      enabled: input.enabled ?? true,
      created_at: nowIso(),
    };
    memory.faq.unshift(f);
    return delay(f, 150);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    if (input.id) {
      const i = memory.faq.findIndex((f) => f.id === input.id);
      if (i >= 0) {
        memory.faq[i] = { ...memory.faq[i]!, ...input } as FAQItem;
        return delay(memory.faq[i]!, 100);
      }
    }
    const f: FAQItem = {
      id: uid("faq"),
      organization_id: memory.org.id,
      question: input.question,
      answer: input.answer,
      tags: input.tags ?? [],
      uses: 0,
      enabled: input.enabled ?? true,
      created_at: nowIso(),
    };
    memory.faq.unshift(f);
    return delay(f, 150);
  }
  const orgId = await getOrgId(supabase);
  if (input.id) {
    const { data, error } = await supabase
      .from("faq_items")
      .update({ question: input.question, answer: input.answer, tags: input.tags, enabled: input.enabled })
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as FAQItem;
  }
  const payload = {
    organization_id: orgId,
    question: input.question,
    answer: input.answer,
    tags: input.tags ?? [],
    uses: 0,
    enabled: input.enabled ?? true,
  };
  const { data, error } = await supabase
    .from("faq_items")
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FAQItem;
}

export async function deleteFAQ(id: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const before = memory.faq.length;
    memory.faq = memory.faq.filter((f) => f.id !== id);
    return delay(memory.faq.length < before, 80);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const before = memory.faq.length;
    memory.faq = memory.faq.filter((f) => f.id !== id);
    return delay(memory.faq.length < before, 80);
  }
  const orgId = await getOrgId(supabase);
  const { error } = await supabase
    .from("faq_items")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
  return true;
}

export async function updateIntegration(id: string, patch: Partial<Integration>): Promise<Integration | null> {
  if (!HAS_SUPABASE) {
    const i = memory.integrations.findIndex((x) => x.id === id);
    if (i < 0) return null;
    memory.integrations[i] = { ...memory.integrations[i]!, ...patch };
    return delay(memory.integrations[i]!, 200);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const i = memory.integrations.findIndex((x) => x.id === id);
    if (i < 0) return null;
    memory.integrations[i] = { ...memory.integrations[i]!, ...patch };
    return delay(memory.integrations[i]!, 200);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("integrations")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return null;
  return data as Integration;
}

export async function updateAutomation(id: string, patch: Partial<Automation>): Promise<Automation | null> {
  if (!HAS_SUPABASE) {
    const i = memory.automations.findIndex((a) => a.id === id);
    if (i < 0) return null;
    memory.automations[i] = { ...memory.automations[i]!, ...patch };
    return delay(memory.automations[i]!, 100);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const i = memory.automations.findIndex((a) => a.id === id);
    if (i < 0) return null;
    memory.automations[i] = { ...memory.automations[i]!, ...patch };
    return delay(memory.automations[i]!, 100);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("automations")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return null;
  return data as Automation;
}

export async function createAutomation(input: Partial<Automation> & { name: string }): Promise<Automation> {
  const a: Automation = {
    id: uid("auto"),
    organization_id: memory.org.id,
    name: input.name,
    description: input.description ?? "",
    trigger: input.trigger ?? "incoming_whatsapp",
    webhook_url: input.webhook_url ?? "",
    status: input.status ?? "active",
    last_run_at: null,
    runs_today: 0,
    success_rate: 0,
    created_at: nowIso(),
  };
  memory.automations.unshift(a);
  return delay(a, 150);
}

export async function createFollowUp(input: Partial<FollowUp> & { name: string }): Promise<FollowUp> {
  const f: FollowUp = {
    id: uid("fu"),
    organization_id: memory.org.id,
    name: input.name,
    trigger: input.trigger ?? "new_lead",
    steps: input.steps ?? [],
    status: (input.status as FollowUpStatus) ?? "active",
    active_count: 0,
    conversion_count: 0,
    created_at: nowIso(),
  };
  memory.followups.unshift(f);
  return delay(f, 150);
}

export async function updateOrganization(patch: Partial<Organization>): Promise<Organization> {
  if (!HAS_SUPABASE) {
    memory.org = { ...memory.org, ...patch };
    return delay(memory.org, 120);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    memory.org = { ...memory.org, ...patch };
    return delay(memory.org, 120);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", orgId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Organization;
}

export async function pushAudit(event: Omit<AuditEvent, "id" | "created_at" | "organization_id">) {
  if (!HAS_SUPABASE) {
    const e: AuditEvent = {
      id: uid("aud"),
      organization_id: memory.org.id,
      created_at: nowIso(),
      ...event,
    };
    memory.audit.unshift(e);
    if (memory.audit.length > 100) memory.audit.pop();
    return e;
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const e: AuditEvent = {
      id: uid("aud"),
      organization_id: memory.org.id,
      created_at: nowIso(),
      ...event,
    };
    memory.audit.unshift(e);
    if (memory.audit.length > 100) memory.audit.pop();
    return e;
  }
  const orgId = await getOrgId(supabase);
  const payload = {
    organization_id: orgId,
    ...event,
  };
  const { data, error } = await supabase
    .from("audit_events")
    .insert([payload])
    .select()
    .single();
  if (error) {
    // Audit failures should not crash the app - log and return a local record
    const e: AuditEvent = {
      id: uid("aud"),
      organization_id: orgId,
      created_at: nowIso(),
      ...event,
    };
    return e;
  }
  return data as AuditEvent;
}

// =========================================================================
// Contacts
// =========================================================================

export async function getContacts(): Promise<Contact[]> {
  if (!HAS_SUPABASE) return delay([...memory.contacts]);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([...memory.contacts]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Contact[];
}

export async function getContact(id: string): Promise<Contact | null> {
  if (!HAS_SUPABASE) return delay(memory.contacts.find((c) => c.id === id) ?? null);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.contacts.find((c) => c.id === id) ?? null);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) return null;
  return data as Contact;
}

export async function createContact(input: Partial<Contact> & { name: string; phone: string }): Promise<Contact> {
  if (!HAS_SUPABASE) {
    const contact: Contact = {
      id: uid("contact"),
      organization_id: memory.org.id,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      avatar_url: input.avatar_url ?? null,
      tags: input.tags ?? [],
      custom_attributes: input.custom_attributes ?? {},
      opted_out: false,
      whatsapp_valid: true,
      last_messaged_at: null,
      created_at: nowIso(),
    };
    memory.contacts.unshift(contact);
    return delay(contact, 200);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const contact: Contact = {
      id: uid("contact"),
      organization_id: memory.org.id,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      avatar_url: input.avatar_url ?? null,
      tags: input.tags ?? [],
      custom_attributes: input.custom_attributes ?? {},
      opted_out: false,
      whatsapp_valid: true,
      last_messaged_at: null,
      created_at: nowIso(),
    };
    memory.contacts.unshift(contact);
    return delay(contact, 200);
  }
  const orgId = await getOrgId(supabase);
  const payload = {
    organization_id: orgId,
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    avatar_url: input.avatar_url ?? null,
    tags: input.tags ?? [],
    custom_attributes: input.custom_attributes ?? {},
    opted_out: false,
    whatsapp_valid: true,
    last_messaged_at: null,
  };
  const { data, error } = await supabase
    .from("contacts")
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<Contact | null> {
  if (!HAS_SUPABASE) {
    const i = memory.contacts.findIndex((c) => c.id === id);
    if (i < 0) return null;
    memory.contacts[i] = { ...memory.contacts[i]!, ...patch };
    return delay(memory.contacts[i]!, 150);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const i = memory.contacts.findIndex((c) => c.id === id);
    if (i < 0) return null;
    memory.contacts[i] = { ...memory.contacts[i]!, ...patch };
    return delay(memory.contacts[i]!, 150);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return null;
  return data as Contact;
}

export async function deleteContact(id: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const before = memory.contacts.length;
    memory.contacts = memory.contacts.filter((c) => c.id !== id);
    return delay(memory.contacts.length < before, 100);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const before = memory.contacts.length;
    memory.contacts = memory.contacts.filter((c) => c.id !== id);
    return delay(memory.contacts.length < before, 100);
  }
  const orgId = await getOrgId(supabase);
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
  return true;
}

export async function importContactsFromCSV(
  rows: Array<{ name: string; phone: string; email?: string; tags?: string }>
): Promise<ContactImport> {
  const baseJob: Omit<ContactImport, "imported" | "skipped" | "errors" | "status"> = {
    id: uid("import"), organization_id: memory.org.id, filename: "import.csv",
    total_rows: rows.length, created_at: nowIso(),
  };

  if (!HAS_SUPABASE) {
    let imported = 0; let skipped = 0; let errors = 0;
    for (const row of rows) {
      if (!row.phone || !row.name) { errors++; continue; }
      if (memory.contacts.find((c) => c.phone === row.phone)) { skipped++; continue; }
      memory.contacts.unshift({
        id: uid("contact"), organization_id: memory.org.id, name: row.name, phone: row.phone,
        email: row.email ?? null, avatar_url: null,
        tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        custom_attributes: {}, opted_out: false, whatsapp_valid: true, last_messaged_at: null, created_at: nowIso(),
      });
      imported++;
    }
    return delay({ ...baseJob, imported, skipped, errors, status: "done" }, 400);
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return delay({ ...baseJob, imported: 0, skipped: rows.length, errors: 0, status: "done" }, 100);
  }
  const orgId = await getOrgId(supabase);

  let imported = 0; let skipped = 0; let errors = 0;
  for (const row of rows) {
    if (!row.phone || !row.name) { errors++; continue; }
    const tags = row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const { error } = await supabase.from("contacts").upsert(
      { organization_id: orgId, name: row.name, phone: row.phone, email: row.email ?? null, tags },
      { onConflict: "organization_id,phone", ignoreDuplicates: true }
    );
    if (error) { errors++; } else { imported++; }
  }

  return { ...baseJob, organization_id: orgId, imported, skipped, errors, status: "done" };
}

// =========================================================================
// Contact Labels
// =========================================================================

export async function getContactLabels(): Promise<ContactLabel[]> {
  if (!HAS_SUPABASE) return delay([...memory.contactLabels].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([...memory.contactLabels]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("contact_labels")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as ContactLabel[];
}

export async function createContactLabel(name: string): Promise<ContactLabel> {
  if (!HAS_SUPABASE) {
    const label: ContactLabel = { id: uid("lbl"), organization_id: memory.org.id, name, contact_count: 0, created_at: nowIso(), updated_at: nowIso() };
    memory.contactLabels.unshift(label);
    return delay(label, 150);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) { const label: ContactLabel = { id: uid("lbl"), organization_id: memory.org.id, name, contact_count: 0, created_at: nowIso(), updated_at: nowIso() }; memory.contactLabels.unshift(label); return delay(label, 150); }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("contact_labels")
    .insert([{ organization_id: orgId, name, contact_count: 0 }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ContactLabel;
}

export async function deleteContactLabel(id: string): Promise<boolean> {
  if (!HAS_SUPABASE) { const before = memory.contactLabels.length; memory.contactLabels = memory.contactLabels.filter((l) => l.id !== id); return delay(memory.contactLabels.length < before, 100); }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) { const before = memory.contactLabels.length; memory.contactLabels = memory.contactLabels.filter((l) => l.id !== id); return delay(memory.contactLabels.length < before, 100); }
  const orgId = await getOrgId(supabase);
  const { error } = await supabase.from("contact_labels").delete().eq("id", id).eq("organization_id", orgId);
  return !error;
}

export async function exportLabelContacts(labelId: string): Promise<Contact[]> {
  if (!HAS_SUPABASE) {
    const label = memory.contactLabels.find((l) => l.id === labelId);
    if (!label) return delay([]);
    return delay(memory.contacts.slice(0, Math.min(label.contact_count, memory.contacts.length)));
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([]);
  const orgId = await getOrgId(supabase);
  const { data: label } = await supabase
    .from("contact_labels").select("name").eq("id", labelId).eq("organization_id", orgId).single();
  if (!label) return [];
  const { data, error } = await supabase
    .from("contacts").select("*")
    .eq("organization_id", orgId).contains("tags", [label.name]);
  if (error) throw new Error(error.message);
  return data as Contact[];
}

// =========================================================================
// OrgChannels
// =========================================================================

export async function getOrgChannels(): Promise<OrgChannel[]> {
  if (!HAS_SUPABASE) return delay([...memory.orgChannels]);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([...memory.orgChannels]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("org_channels")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const decrypt = async (val: string | null) => {
    if (!val) return null;
    try {
      const { data: plain } = await supabase.rpc("decrypt_credential", { ciphertext: val });
      return plain as string | null;
    } catch { return val; }
  };

  const decrypted = await Promise.all((data as OrgChannel[]).map(async (ch) => ({
    ...ch,
    access_token: await decrypt(ch.access_token),
    bot_token: await decrypt(ch.bot_token),
    twilio_auth_token: await decrypt(ch.twilio_auth_token),
  })));
  return decrypted;
}

export async function upsertOrgChannel(input: Partial<OrgChannel> & { provider: OrgChannel["provider"]; label: string }): Promise<OrgChannel> {
  const mockUpsert = () => {
    const existing = input.id ? memory.orgChannels.findIndex((c) => c.id === input.id) : -1;
    if (existing >= 0) {
      memory.orgChannels[existing] = { ...memory.orgChannels[existing]!, ...input };
      return delay(memory.orgChannels[existing]!, 200);
    }
    const channel: OrgChannel = {
      id: uid("chan"), organization_id: memory.org.id, provider: input.provider, label: input.label,
      phone_number: input.phone_number ?? null, waba_id: input.waba_id ?? null,
      phone_number_id: input.phone_number_id ?? null, access_token: input.access_token ?? null,
      bot_token: input.bot_token ?? null, twilio_account_sid: input.twilio_account_sid ?? null,
      twilio_auth_token: input.twilio_auth_token ?? null, twilio_from_number: input.twilio_from_number ?? null,
      status: "active", connected_at: nowIso(), created_at: nowIso(),
    };
    memory.orgChannels.unshift(channel);
    return delay(channel, 200);
  };

  if (!HAS_SUPABASE) return mockUpsert();
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return mockUpsert();
  const orgId = await getOrgId(supabase);

  const encrypt = async (val: string | null | undefined) => {
    if (!val) return null;
    const { data } = await supabase.rpc("encrypt_credential", { plaintext: val });
    return data as string | null;
  };

  const record = {
    organization_id: orgId, provider: input.provider, label: input.label,
    phone_number: input.phone_number ?? null, waba_id: input.waba_id ?? null,
    phone_number_id: input.phone_number_id ?? null,
    access_token: await encrypt(input.access_token),
    bot_token: await encrypt(input.bot_token),
    twilio_account_sid: input.twilio_account_sid ?? null,
    twilio_auth_token: await encrypt(input.twilio_auth_token),
    twilio_from_number: input.twilio_from_number ?? null,
    status: "active" as const, connected_at: nowIso(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("org_channels").update(record).eq("id", input.id).eq("organization_id", orgId).select().single();
    if (error) throw new Error(error.message);
    return data as OrgChannel;
  }
  const { data, error } = await supabase
    .from("org_channels").insert([record]).select().single();
  if (error) throw new Error(error.message);
  return data as OrgChannel;
}

export async function deleteOrgChannel(id: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const before = memory.orgChannels.length;
    memory.orgChannels = memory.orgChannels.filter((c) => c.id !== id);
    return delay(memory.orgChannels.length < before, 100);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const before = memory.orgChannels.length;
    memory.orgChannels = memory.orgChannels.filter((c) => c.id !== id);
    return delay(memory.orgChannels.length < before, 100);
  }
  const orgId = await getOrgId(supabase);
  const { error } = await supabase.from("org_channels").delete().eq("id", id).eq("organization_id", orgId);
  return !error;
}

// =========================================================================
// Wallet & Credits
// =========================================================================

export async function getWallet(): Promise<Wallet> {
  if (!HAS_SUPABASE) return delay({ ...memory.wallet });
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay({ ...memory.wallet });
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("organization_id", orgId)
    .single();
  if (error) throw new Error(error.message);
  return data as Wallet;
}

export async function getCreditTransactions(): Promise<CreditTransaction[]> {
  if (!HAS_SUPABASE) return delay([...memory.creditTransactions]);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([...memory.creditTransactions]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as CreditTransaction[];
}

export async function adminGrantCredits(
  creditType: CreditType,
  amount: number,
  description: string,
  adminId = "admin"
): Promise<{ wallet: Wallet; transaction: CreditTransaction }> {
  if (!HAS_SUPABASE) {
    if (creditType === "conversation") {
      memory.wallet.conversation_credits += amount;
      memory.wallet.lifetime_conversation_added += amount;
    } else {
      memory.wallet.broadcast_credits += amount;
      memory.wallet.lifetime_broadcast_added += amount;
    }
    memory.wallet.updated_at = nowIso();
    const tx: CreditTransaction = {
      id: uid("tx"),
      organization_id: memory.org.id,
      credit_type: creditType,
      transaction_type: "admin_grant",
      amount,
      balance_after: creditType === "conversation" ? memory.wallet.conversation_credits : memory.wallet.broadcast_credits,
      description,
      reference_id: null,
      created_by: adminId,
      created_at: nowIso(),
    };
    memory.creditTransactions.unshift(tx);
    return delay({ wallet: { ...memory.wallet }, transaction: tx }, 200);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    if (creditType === "conversation") {
      memory.wallet.conversation_credits += amount;
      memory.wallet.lifetime_conversation_added += amount;
    } else {
      memory.wallet.broadcast_credits += amount;
      memory.wallet.lifetime_broadcast_added += amount;
    }
    memory.wallet.updated_at = nowIso();
    const tx: CreditTransaction = {
      id: uid("tx"),
      organization_id: memory.org.id,
      credit_type: creditType,
      transaction_type: "admin_grant",
      amount,
      balance_after: creditType === "conversation" ? memory.wallet.conversation_credits : memory.wallet.broadcast_credits,
      description,
      reference_id: null,
      created_by: adminId,
      created_at: nowIso(),
    };
    memory.creditTransactions.unshift(tx);
    return delay({ wallet: { ...memory.wallet }, transaction: tx }, 200);
  }
  const orgId = await getOrgId(supabase);

  // Fetch current wallet to compute new balance
  const { data: walletData, error: walletFetchError } = await supabase
    .from("wallets")
    .select("*")
    .eq("organization_id", orgId)
    .single();
  if (walletFetchError) throw new Error(walletFetchError.message);
  const wallet = walletData as Wallet;

  const newConvCredits = creditType === "conversation"
    ? wallet.conversation_credits + amount
    : wallet.conversation_credits;
  const newBcCredits = creditType === "broadcast"
    ? wallet.broadcast_credits + amount
    : wallet.broadcast_credits;
  const newLifetimeConvAdded = creditType === "conversation"
    ? wallet.lifetime_conversation_added + amount
    : wallet.lifetime_conversation_added;
  const newLifetimeBcAdded = creditType === "broadcast"
    ? wallet.lifetime_broadcast_added + amount
    : wallet.lifetime_broadcast_added;

  const { data: updatedWallet, error: walletUpdateError } = await supabase
    .from("wallets")
    .update({
      conversation_credits: newConvCredits,
      broadcast_credits: newBcCredits,
      lifetime_conversation_added: newLifetimeConvAdded,
      lifetime_broadcast_added: newLifetimeBcAdded,
      updated_at: nowIso(),
    })
    .eq("organization_id", orgId)
    .select()
    .single();
  if (walletUpdateError) throw new Error(walletUpdateError.message);

  const balanceAfter = creditType === "conversation" ? newConvCredits : newBcCredits;
  const { data: txData, error: txError } = await supabase
    .from("credit_transactions")
    .insert([{
      organization_id: orgId,
      credit_type: creditType,
      transaction_type: "admin_grant",
      amount,
      balance_after: balanceAfter,
      description,
      reference_id: null,
      created_by: adminId,
    }])
    .select()
    .single();
  if (txError) throw new Error(txError.message);
  return { wallet: updatedWallet as Wallet, transaction: txData as CreditTransaction };
}

export async function deductCredits(
  creditType: CreditType,
  amount: number,
  description: string,
  referenceId?: string
): Promise<{ ok: boolean; wallet: Wallet; transaction?: CreditTransaction }> {
  if (!HAS_SUPABASE) {
    const balance = creditType === "conversation" ? memory.wallet.conversation_credits : memory.wallet.broadcast_credits;
    if (balance < amount) {
      return delay({ ok: false, wallet: { ...memory.wallet } }, 50);
    }
    if (creditType === "conversation") {
      memory.wallet.conversation_credits -= amount;
      memory.wallet.lifetime_conversation_spent += amount;
    } else {
      memory.wallet.broadcast_credits -= amount;
      memory.wallet.lifetime_broadcast_spent += amount;
    }
    memory.wallet.updated_at = nowIso();
    const tx: CreditTransaction = {
      id: uid("tx"),
      organization_id: memory.org.id,
      credit_type: creditType,
      transaction_type: "deduct",
      amount: -amount,
      balance_after: creditType === "conversation" ? memory.wallet.conversation_credits : memory.wallet.broadcast_credits,
      description,
      reference_id: referenceId ?? null,
      created_by: null,
      created_at: nowIso(),
    };
    memory.creditTransactions.unshift(tx);
    return delay({ ok: true, wallet: { ...memory.wallet }, transaction: tx }, 100);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const balance = creditType === "conversation" ? memory.wallet.conversation_credits : memory.wallet.broadcast_credits;
    if (balance < amount) {
      return delay({ ok: false, wallet: { ...memory.wallet } }, 50);
    }
    if (creditType === "conversation") {
      memory.wallet.conversation_credits -= amount;
      memory.wallet.lifetime_conversation_spent += amount;
    } else {
      memory.wallet.broadcast_credits -= amount;
      memory.wallet.lifetime_broadcast_spent += amount;
    }
    memory.wallet.updated_at = nowIso();
    const tx: CreditTransaction = {
      id: uid("tx"),
      organization_id: memory.org.id,
      credit_type: creditType,
      transaction_type: "deduct",
      amount: -amount,
      balance_after: creditType === "conversation" ? memory.wallet.conversation_credits : memory.wallet.broadcast_credits,
      description,
      reference_id: referenceId ?? null,
      created_by: null,
      created_at: nowIso(),
    };
    memory.creditTransactions.unshift(tx);
    return delay({ ok: true, wallet: { ...memory.wallet }, transaction: tx }, 100);
  }
  const orgId = await getOrgId(supabase);

  const { data, error } = await supabase.rpc("deduct_credits", {
    p_org_id: orgId,
    p_credit_type: creditType,
    p_amount: amount,
    p_description: description,
    p_reference_id: referenceId ?? null,
  });
  if (error) throw new Error(error.message);
  if (!data.ok) return { ok: false, wallet: data.wallet as Wallet };
  return { ok: true, wallet: data.wallet as Wallet };
}

// =========================================================================
// Conversations
// =========================================================================

export async function getConversations(status?: Conversation["status"]): Promise<Conversation[]> {
  if (!HAS_SUPABASE) {
    const list = status ? memory.conversations.filter((c) => c.status === status) : memory.conversations;
    return delay([...list].sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "")));
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const list = status ? memory.conversations.filter((c) => c.status === status) : memory.conversations;
    return delay([...list].sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "")));
  }
  const orgId = await getOrgId(supabase);
  let query = supabase
    .from("conversations")
    .select("*")
    .eq("organization_id", orgId)
    .order("last_message_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Conversation[];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (!HAS_SUPABASE) return delay(memory.conversations.find((c) => c.id === id) ?? null);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay(memory.conversations.find((c) => c.id === id) ?? null);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) return null;
  return data as Conversation;
}

export async function updateConversation(id: string, patch: Partial<Conversation>): Promise<Conversation | null> {
  if (!HAS_SUPABASE) {
    const i = memory.conversations.findIndex((c) => c.id === id);
    if (i < 0) return null;
    memory.conversations[i] = { ...memory.conversations[i]!, ...patch };
    return delay(memory.conversations[i]!, 100);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const i = memory.conversations.findIndex((c) => c.id === id);
    if (i < 0) return null;
    memory.conversations[i] = { ...memory.conversations[i]!, ...patch };
    return delay(memory.conversations[i]!, 100);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("conversations")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return null;
  return data as Conversation;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!HAS_SUPABASE) {
    return delay(
      memory.messages
        .filter((m) => m.conversation_id === conversationId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    );
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return delay(
      memory.messages
        .filter((m) => m.conversation_id === conversationId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    );
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Message[];
}

export async function sendMessage(
  conversationId: string,
  body: string,
  contentType: Message["content_type"] = "text"
): Promise<{ message: Message; creditsDeducted: boolean }> {
  if (!HAS_SUPABASE) {
    const msg: Message = {
      id: uid("msg"),
      conversation_id: conversationId,
      organization_id: memory.org.id,
      direction: "outbound",
      content_type: contentType,
      body,
      media_url: null,
      template_name: null,
      interactive_buttons: null,
      wa_message_id: null,
      status: "sent",
      created_at: nowIso(),
    };
    memory.messages.push(msg);
    const ci = memory.conversations.findIndex((c) => c.id === conversationId);
    if (ci >= 0) {
      memory.conversations[ci] = {
        ...memory.conversations[ci]!,
        last_message_at: nowIso(),
        last_message_preview: body.slice(0, 80),
      };
    }
    const deduct = await deductCredits("conversation", 1, `Message sent in conversation ${conversationId}`, msg.id);
    return delay({ message: msg, creditsDeducted: deduct.ok }, 150);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const msg: Message = {
      id: uid("msg"),
      conversation_id: conversationId,
      organization_id: memory.org.id,
      direction: "outbound",
      content_type: contentType,
      body,
      media_url: null,
      template_name: null,
      interactive_buttons: null,
      wa_message_id: null,
      status: "sent",
      created_at: nowIso(),
    };
    memory.messages.push(msg);
    const ci = memory.conversations.findIndex((c) => c.id === conversationId);
    if (ci >= 0) {
      memory.conversations[ci] = {
        ...memory.conversations[ci]!,
        last_message_at: nowIso(),
        last_message_preview: body.slice(0, 80),
      };
    }
    const deduct = await deductCredits("conversation", 1, `Message sent in conversation ${conversationId}`, msg.id);
    return delay({ message: msg, creditsDeducted: deduct.ok }, 150);
  }
  const orgId = await getOrgId(supabase);

  // Insert message
  const { data: msgData, error: msgError } = await supabase
    .from("messages")
    .insert([{
      conversation_id: conversationId,
      organization_id: orgId,
      direction: "outbound",
      content_type: contentType,
      body,
      media_url: null,
      template_name: null,
      interactive_buttons: null,
      wa_message_id: null,
      status: "sent",
    }])
    .select()
    .single();
  if (msgError) throw new Error(msgError.message);

  const msg = msgData as Message;
  const now = nowIso();

  // Update conversation last_message_at and preview
  await supabase
    .from("conversations")
    .update({
      last_message_at: now,
      last_message_preview: body.slice(0, 80),
    })
    .eq("id", conversationId)
    .eq("organization_id", orgId);

  // Deduct 1 conversation credit
  const deduct = await deductCredits("conversation", 1, `Message sent in conversation ${conversationId}`, msg.id);
  return { message: msg, creditsDeducted: deduct.ok };
}

// =========================================================================
// Workflows
// =========================================================================

export async function getWorkflows(): Promise<Workflow[]> {
  if (!HAS_SUPABASE) return delay([...memory.workflows]);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([...memory.workflows]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Workflow[];
}

export async function saveWorkflow(input: Partial<Workflow> & { name: string }): Promise<Workflow> {
  if (!HAS_SUPABASE) {
    if (input.id) { const i = memory.workflows.findIndex((w) => w.id === input.id); if (i >= 0) { memory.workflows[i] = { ...memory.workflows[i]!, ...input, updated_at: nowIso() }; return delay(memory.workflows[i]!, 200); } }
    const wf: Workflow = { id: uid("wf"), organization_id: memory.org.id, name: input.name, trigger: input.trigger ?? "incoming_whatsapp", nodes: input.nodes ?? [], edges: input.edges ?? [], status: input.status ?? "draft", org_channel_id: input.org_channel_id ?? null, runs_total: 0, runs_last_30d: 0, created_at: nowIso(), updated_at: nowIso() };
    memory.workflows.unshift(wf); return delay(wf, 200);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    const wf: Workflow = { id: uid("wf"), organization_id: memory.org.id, name: input.name, trigger: input.trigger ?? "incoming_whatsapp", nodes: input.nodes ?? [], edges: input.edges ?? [], status: input.status ?? "draft", org_channel_id: input.org_channel_id ?? null, runs_total: 0, runs_last_30d: 0, created_at: nowIso(), updated_at: nowIso() };
    return delay(wf, 200);
  }
  const orgId = await getOrgId(supabase);
  if (input.id) {
    const { data, error } = await supabase
      .from("workflows")
      .update({ ...input, updated_at: nowIso() })
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Workflow;
  }
  const { data, error } = await supabase
    .from("workflows")
    .insert([{ organization_id: orgId, name: input.name, trigger: input.trigger ?? "incoming_whatsapp", nodes: input.nodes ?? [], edges: input.edges ?? [], status: input.status ?? "draft", org_channel_id: input.org_channel_id ?? null, runs_total: 0, runs_last_30d: 0 }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Workflow;
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  if (!HAS_SUPABASE) { const before = memory.workflows.length; memory.workflows = memory.workflows.filter((w) => w.id !== id); return delay(memory.workflows.length < before, 100); }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) { const before = memory.workflows.length; memory.workflows = memory.workflows.filter((w) => w.id !== id); return delay(memory.workflows.length < before, 100); }
  const orgId = await getOrgId(supabase);
  const { error } = await supabase.from("workflows").delete().eq("id", id).eq("organization_id", orgId);
  return !error;
}

// =========================================================================
// Org-scoped credential lookup (used by comms layer)
// Returns the active OrgChannel for a given provider, or null
// =========================================================================

export async function getActiveChannel(provider: OrgChannel["provider"]): Promise<OrgChannel | null> {
  if (!HAS_SUPABASE) {
    return delay(memory.orgChannels.find((c) => c.provider === provider && c.status === "active") ?? null, 0);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return delay(memory.orgChannels.find((c) => c.provider === provider && c.status === "active") ?? null, 0);
  }
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("org_channels")
    .select("*")
    .eq("organization_id", orgId)
    .eq("provider", provider)
    .eq("status", "active")
    .limit(1)
    .single();
  if (error) return null;
  return data as OrgChannel;
}

// =========================================================================
// Knowledge Base CRUD
// =========================================================================

export async function getKnowledgeArticles(): Promise<KnowledgeArticle[]> {
  if (!HAS_SUPABASE) return delay([...memory.knowledgeArticles]);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return delay([...memory.knowledgeArticles]);
  const orgId = await getOrgId(supabase);
  const { data, error } = await supabase
    .from("knowledge_articles").select("*").eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as KnowledgeArticle[];
}

export async function createKnowledgeArticle(input: { title: string; content: string; category?: string; tags?: string[] }): Promise<KnowledgeArticle> {
  if (!HAS_SUPABASE) {
    const a: KnowledgeArticle = {
      id: uid("kb"),
      organization_id: memory.org.id,
      title: input.title,
      content: input.content,
      category: input.category ?? "General",
      tags: input.tags ?? [],
      published: false,
      created_by: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    memory.knowledgeArticles.unshift(a);
    return delay(a, 150);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Not connected");
  const orgId = await getOrgId(supabase);
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("knowledge_articles")
    .insert([{
      organization_id: orgId,
      title: input.title,
      content: input.content,
      category: input.category ?? "General",
      tags: input.tags ?? [],
      created_by: user?.id ?? null,
    }])
    .select().single();
  if (error) throw new Error(error.message);
  return data as KnowledgeArticle;
}

export async function updateKnowledgeArticle(id: string, patch: Partial<{ title: string; content: string; category: string; published: boolean }>): Promise<void> {
  if (!HAS_SUPABASE) {
    const idx = memory.knowledgeArticles.findIndex((a) => a.id === id);
    if (idx >= 0) memory.knowledgeArticles[idx] = { ...memory.knowledgeArticles[idx], ...patch, updated_at: nowIso() };
    return;
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const orgId = await getOrgId(supabase);
  await supabase.from("knowledge_articles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id).eq("organization_id", orgId);
}

export async function deleteKnowledgeArticle(id: string): Promise<void> {
  if (!HAS_SUPABASE) {
    memory.knowledgeArticles = memory.knowledgeArticles.filter((a) => a.id !== id);
    return;
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const orgId = await getOrgId(supabase);
  await supabase.from("knowledge_articles").delete().eq("id", id).eq("organization_id", orgId);
}
