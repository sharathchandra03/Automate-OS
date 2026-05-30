import type { VerticalPack } from "./index";

export const agencyPack: VerticalPack = {
  id: "agency",
  name: "Marketing / Creative Agency",
  emoji: "🎯",
  tagline: "Run lead-gen, retainers, and client reporting from one OS.",
  copy: {
    leadsLabel: "Prospects",
    leadSingular: "prospect",
    contactLabel: "Contact",
    appointmentLabel: "Discovery call",
    pipelineStages: ["Lead", "Qualified", "Proposal sent", "Negotiation", "Won", "Lost"],
  },
  kpis: [
    { key: "pipeline_value", label: "Pipeline value",   format: "currency", good: "up" },
    { key: "win_rate",       label: "Win rate",         format: "percent",  good: "up" },
    { key: "calls_booked",   label: "Calls booked",     format: "number",   good: "up" },
    { key: "avg_deal",       label: "Avg deal size",    format: "currency", good: "up" },
  ],
  recommendedIntegrations: ["whatsapp", "email", "google_calendar", "openai", "google_sheets", "stripe", "slack"],
  automations: [
    { id: "discovery_book",   name: "Auto-book discovery",   description: "Offer 30-min slots, confirm, send brief.",    trigger: "lead.created", actions: ["appointment.book"], recommended: true },
    { id: "proposal_send",    name: "Auto-send proposals",   description: "Trigger when stage moves to Proposal.",        trigger: "lead.stage_changed", actions: ["followup.send"], recommended: true },
    { id: "client_report",    name: "Weekly client reports", description: "Email-ready PDF every Monday per client.",     trigger: "schedule.weekly", actions: ["digest.daily"], recommended: true },
    { id: "renewal_remind",   name: "Renewal reminders",     description: "30/14/7 days before contract end.",            trigger: "schedule.contract", actions: ["followup.send"], recommended: false },
  ],
  campaignTemplates: [
    { id: "outreach",  name: "Cold outreach",   channel: "email",    body: "Hi {{name}}, noticed {{company}} is doing X. We've helped similar teams 3x results in 90 days. Worth a quick chat?" },
    { id: "proposal",  name: "Proposal sent",   channel: "email",    body: "Hi {{name}}, the proposal is in your inbox. Happy to walk through it live - pick a slot: {{link}}." },
    { id: "checkin",   name: "Client check-in", channel: "whatsapp", body: "Hi {{name}}, this week's report is ready. Quick win: {{insight}}. Want to jump on a call?" },
  ],
  onboardingQuestions: [
    { id: "services", label: "What services do you offer?", type: "multi-select", options: ["SEO", "Paid ads", "Content", "Social", "Web design", "Branding", "Email", "Video"], required: true },
    { id: "model",    label: "Pricing model?",               type: "select", options: ["Project", "Retainer", "Performance", "Hybrid"], required: true },
    { id: "clients",  label: "Active client count?",         type: "select", options: ["1-5", "6-20", "21-50", "50+"], required: true },
  ],
  aiPersona: "You are a sharp agency new-business assistant. Confidence without bluster. Always discover budget, timeline, and decision-maker. Push toward a discovery call. Use industry vocabulary correctly.",
};
