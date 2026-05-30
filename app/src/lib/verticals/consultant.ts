import type { VerticalPack } from "./index";

export const consultantPack: VerticalPack = {
  id: "consultant",
  name: "Consulting",
  emoji: "📊",
  tagline: "Pipeline, proposals, and retainers - without admin drag.",
  copy: {
    leadsLabel: "Clients",
    leadSingular: "client",
    contactLabel: "Client",
    appointmentLabel: "Strategy session",
    pipelineStages: ["Inquiry", "Discovery", "Proposal", "SoW", "Engaged", "Closed"],
  },
  kpis: [
    { key: "pipeline_value",label: "Pipeline value",      format: "currency", good: "up" },
    { key: "win_rate",      label: "Win rate",            format: "percent",  good: "up" },
    { key: "utilization",   label: "Utilization",         format: "percent",  good: "up" },
    { key: "avg_engagement",label: "Avg engagement",      format: "currency", good: "up" },
  ],
  recommendedIntegrations: ["email", "google_calendar", "openai", "stripe", "google_sheets"],
  automations: [
    { id: "discovery",   name: "Discovery scheduler", description: "Auto-route inquiries to a 30m slot.",      trigger: "lead.created", actions: ["appointment.book"], recommended: true },
    { id: "proposal",    name: "Proposal sender",      description: "Draft + send branded proposal.",            trigger: "lead.stage_changed", actions: ["followup.send"], recommended: true },
    { id: "engagement",  name: "Engagement kickoff",  description: "Onboarding pack + access requests.",        trigger: "lead.won", actions: ["followup.send"], recommended: false },
  ],
  campaignTemplates: [
    { id: "intro",     name: "Intro email",        channel: "email", body: "Hi {{name}}, thanks for the inquiry on {{topic}}. Here are some thoughts based on what you shared, and a slot to dig deeper: {{link}}." },
    { id: "proposal",  name: "Proposal follow-up", channel: "email", body: "Hi {{name}}, any questions on the proposal? Happy to walk through it live: {{link}}." },
  ],
  onboardingQuestions: [
    { id: "domain",  label: "Consulting domain?",    type: "select", options: ["Strategy", "Ops", "Tech", "Marketing", "Finance", "HR", "Legal", "Other"], required: true },
    { id: "size",    label: "Solo or firm?",          type: "select", options: ["Solo", "Boutique 2-10", "Mid 11-50", "Large 50+"], required: true },
  ],
  aiPersona: "You are an articulate, senior consultant assistant. Diagnose before prescribing. Use clear frameworks. Always quantify. Push toward a paid scoping engagement before scope is fully defined.",
};
