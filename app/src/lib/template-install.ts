/**
 * Template installer — translates marketplace templates into real in-memory records.
 * Called when the user clicks "Install" on the /templates page.
 */

import { createAutomation, upsertFAQ, createFollowUp, createCampaign } from "./api";

export interface InstallResult {
  automations: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
  faq: { id: string; question: string }[];
  followUps: { id: string; name: string }[];
}

type TemplatePayload = {
  automations?: { name: string; webhook_url: string; action: string }[];
  campaigns?: { name: string; channel: "whatsapp" | "email" | "telegram" | "sms" }[];
  faq?: { question: string; answer: string; tags: string[] }[];
  followUps?: { name: string; steps: { delay_minutes: number; channel: "whatsapp" | "email"; template: string }[] }[];
};

const INSTALL_PAYLOADS: Record<string, TemplatePayload> = {
  tpl_lead_speed: {
    automations: [
      { name: "5-min Lead Acknowledge", webhook_url: "", action: "lead.qualify" },
    ],
    campaigns: [
      { name: "Lead Welcome — WhatsApp", channel: "whatsapp" },
      { name: "Lead Welcome — Email", channel: "email" },
    ],
    followUps: [
      {
        name: "5-min Lead Speed Sequence",
        steps: [
          { delay_minutes: 5, channel: "whatsapp", template: "Hi {{Name}} 👋 Thanks for your interest! We'll get back to you shortly." },
          { delay_minutes: 1440, channel: "email", template: "Hi {{Name}}, just checking in — can we schedule a quick call?" },
        ],
      },
    ],
  },

  tpl_no_show_killer: {
    automations: [
      { name: "24h Appointment Reminder", webhook_url: "", action: "appointment.remind" },
      { name: "1h Appointment Reminder",  webhook_url: "", action: "appointment.remind" },
      { name: "No-Show Recovery",         webhook_url: "", action: "appointment.book"  },
    ],
    campaigns: [
      { name: "No-Show Reminder — WhatsApp", channel: "whatsapp" },
      { name: "Reschedule Offer — WhatsApp", channel: "whatsapp" },
      { name: "Reschedule Offer — Email",    channel: "email"    },
    ],
  },

  tpl_cart_recovery: {
    automations: [{ name: "Cart Recovery Trigger", webhook_url: "", action: "retargeting.run" }],
    campaigns: [
      { name: "Cart Recovery — Step 1", channel: "whatsapp" },
      { name: "Cart Recovery — Step 2", channel: "whatsapp" },
      { name: "Cart Recovery — Step 3 (Discount)", channel: "whatsapp" },
    ],
    followUps: [
      {
        name: "Cart Recovery Sequence",
        steps: [
          { delay_minutes: 60,   channel: "whatsapp", template: "Hi {{Name}}! You left something in your cart 🛒 Complete your order here: {{cart_link}}" },
          { delay_minutes: 1440, channel: "whatsapp", template: "Still thinking? Your cart is saved. Here's a 10% discount: {{discount_code}}" },
          { delay_minutes: 4320, channel: "whatsapp", template: "Last chance! Your discount expires soon. Order now: {{cart_link}}" },
        ],
      },
    ],
  },

  tpl_review_engine: {
    automations: [{ name: "Post-Visit Review Request", webhook_url: "", action: "followup.send" }],
    campaigns: [
      { name: "Review Request — WhatsApp", channel: "whatsapp" },
      { name: "Review Request — Email",    channel: "email"    },
    ],
  },

  tpl_winback: {
    automations: [{ name: "60-Day Win-Back Trigger", webhook_url: "", action: "retargeting.run" }],
    followUps: [
      {
        name: "60-Day Win-Back",
        steps: [
          { delay_minutes: 0,    channel: "whatsapp", template: "Hi {{Name}}, we miss you! Here's a special offer just for you 🎁" },
          { delay_minutes: 2880, channel: "email",    template: "Hi {{Name}}, your exclusive offer expires in 48 hours." },
        ],
      },
    ],
    campaigns: [
      { name: "Win-Back Campaign", channel: "whatsapp" },
      { name: "Win-Back Offer",    channel: "email"    },
    ],
  },

  tpl_support_triage: {
    automations: [
      { name: "AI Ticket Classifier",  webhook_url: "", action: "ticket.create"   },
      { name: "AI Ticket Escalation",  webhook_url: "", action: "ticket.escalate" },
    ],
    faq: [
      { question: "How do I reset my password?",  answer: "Go to Settings → Security → Reset Password.", tags: ["account"] },
      { question: "What is your refund policy?",  answer: "We offer a 30-day money-back guarantee for all plans.", tags: ["billing"] },
      { question: "How do I contact support?",    answer: "Reply to this message or email support@yourcompany.com.", tags: ["support"] },
    ],
  },

  tpl_weekly_brief: {
    automations: [{ name: "Weekly Executive Brief", webhook_url: "", action: "digest.daily" }],
  },

  tpl_buyer_intake: {
    automations: [{ name: "Buyer Intake Qualifier", webhook_url: "", action: "lead.qualify" }],
    campaigns:   [{ name: "Buyer Intake — WhatsApp", channel: "whatsapp" }],
    followUps: [
      {
        name: "Buyer Intake Sequence",
        steps: [
          { delay_minutes: 0,   channel: "whatsapp", template: "Hi {{Name}} 🏠 Let's find your perfect home. What's your budget?" },
          { delay_minutes: 15,  channel: "whatsapp", template: "Great! Which area are you looking in?" },
          { delay_minutes: 30,  channel: "whatsapp", template: "How many bedrooms do you need?" },
        ],
      },
    ],
  },

  tpl_patient_reminders: {
    automations: [
      { name: "Appointment Confirmation",  webhook_url: "", action: "appointment.book"   },
      { name: "24h Patient Reminder",      webhook_url: "", action: "appointment.remind" },
      { name: "Post-Visit Review Request", webhook_url: "", action: "followup.send"      },
    ],
    campaigns: [
      { name: "Appointment Confirmation — WA",   channel: "whatsapp" },
      { name: "Appointment Reminder — WA",       channel: "whatsapp" },
      { name: "Post-Visit Feedback — WA",        channel: "whatsapp" },
      { name: "Follow-Up Care Reminder — Email", channel: "email"    },
    ],
  },
};

export async function installTemplate(templateId: string): Promise<InstallResult> {
  const payload = INSTALL_PAYLOADS[templateId];
  if (!payload) return { automations: [], campaigns: [], faq: [], followUps: [] };

  const result: InstallResult = { automations: [], campaigns: [], faq: [], followUps: [] };

  // Automations
  for (const a of payload.automations ?? []) {
    try {
      const created = await createAutomation({ name: a.name, webhook_url: a.webhook_url, status: "active" });
      result.automations.push({ id: created.id, name: created.name });
    } catch { /* non-fatal */ }
  }

  // Campaigns
  for (const c of payload.campaigns ?? []) {
    try {
      const created = await createCampaign({ name: c.name, channel: c.channel, status: "draft" });
      result.campaigns.push({ id: created.id, name: created.name });
    } catch { /* non-fatal */ }
  }

  // FAQ items
  for (const f of payload.faq ?? []) {
    try {
      const created = await upsertFAQ({ question: f.question, answer: f.answer, tags: f.tags });
      result.faq.push({ id: created.id, question: created.question });
    } catch { /* non-fatal */ }
  }

  // Follow-ups
  for (const fu of payload.followUps ?? []) {
    try {
      const created = await createFollowUp({ name: fu.name, steps: fu.steps as any, status: "active" });
      result.followUps.push({ id: created.id, name: created.name });
    } catch { /* non-fatal */ }
  }

  return result;
}
