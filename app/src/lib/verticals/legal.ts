import type { VerticalPack } from "./index";

export const legalPack: VerticalPack = {
  id: "legal",
  name: "Law Firm",
  emoji: "⚖️",
  tagline: "Intake, schedule, and follow up - without losing billable hours.",
  copy: {
    leadsLabel: "Clients",
    leadSingular: "client",
    contactLabel: "Client",
    appointmentLabel: "Consultation",
    pipelineStages: ["Inquiry", "Conflict-checked", "Consult", "Engaged", "Active matter", "Closed"],
  },
  kpis: [
    { key: "consults_week", label: "Consults this week", format: "number",   good: "up" },
    { key: "engagement",    label: "Engagement rate",     format: "percent",  good: "up" },
    { key: "avg_fee",       label: "Avg matter value",    format: "currency", good: "up" },
    { key: "response_time", label: "First response",      format: "duration", good: "down" },
  ],
  recommendedIntegrations: ["email", "google_calendar", "openai", "webhook", "stripe"],
  automations: [
    { id: "intake",         name: "Intake form",        description: "Capture matter type, opposing party, urgency.", trigger: "lead.created", actions: ["lead.qualify"], recommended: true },
    { id: "conflict_check", name: "Conflict check",     description: "Flag inquiries against existing matters.",      trigger: "lead.qualified", actions: ["lead.assign"], recommended: true },
    { id: "consult_book",   name: "Consult booking",    description: "Offer slots, send retainer info.",              trigger: "lead.cleared", actions: ["appointment.book"], recommended: true },
    { id: "fee_remind",     name: "Invoice reminders",  description: "Net-30 / Net-60 nudges.",                       trigger: "schedule.daily", actions: ["followup.send"], recommended: false },
  ],
  campaignTemplates: [
    { id: "consult_confirm", name: "Consult confirmation", channel: "email", body: "Hi {{name}}, your consultation with {{attorney}} is confirmed for {{time}}. Please bring: {{docs}}." },
    { id: "engagement",      name: "Engagement letter",    channel: "email", body: "Hi {{name}}, attached is the engagement letter for your review. Once signed, we'll begin." },
    { id: "matter_update",   name: "Matter update",        channel: "email", body: "Hi {{name}}, an update on {{matter}}: {{summary}}. Next step: {{next}}." },
  ],
  onboardingQuestions: [
    { id: "practice", label: "What's your practice area?", type: "multi-select", options: ["Family", "Corporate", "Criminal", "IP", "Tax", "Real estate", "Immigration", "Personal injury", "Other"], required: true },
    { id: "lawyers", label: "How many attorneys?",          type: "select", options: ["Solo", "2-5", "6-20", "20+"], required: true },
  ],
  aiPersona: "You are a precise, professional legal intake specialist. Be careful with words - never give legal advice. Confirm matter type, jurisdiction, and urgency. Always book a paid consultation; never quote outcomes.",
};
