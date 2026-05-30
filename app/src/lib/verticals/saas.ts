import type { VerticalPack } from "./index";

export const saasPack: VerticalPack = {
  id: "saas",
  name: "SaaS / Software",
  emoji: "💻",
  tagline: "Trial-to-paid, expansion, and churn prevention.",
  copy: {
    leadsLabel: "Trials",
    leadSingular: "trial",
    contactLabel: "Account",
    appointmentLabel: "Demo call",
    pipelineStages: ["Signed up", "Activated", "Trial", "Paid", "Expansion", "Churned"],
  },
  kpis: [
    { key: "mrr",            label: "MRR",                 format: "currency", good: "up" },
    { key: "trial_to_paid",  label: "Trial → paid",        format: "percent",  good: "up" },
    { key: "expansion_rev",  label: "Expansion revenue",   format: "currency", good: "up" },
    { key: "logo_churn",     label: "Logo churn",          format: "percent",  good: "down" },
  ],
  recommendedIntegrations: ["email", "openai", "stripe", "slack", "google_calendar", "webhook"],
  automations: [
    { id: "onboard",         name: "Onboarding nurture",     description: "5-step activation series during trial.",     trigger: "user.signup", actions: ["followup.send"], recommended: true },
    { id: "stuck_user",      name: "Stuck user rescue",      description: "If no activation in 48h → 1:1 outreach.",    trigger: "schedule.daily", actions: ["lead.assign", "followup.send"], recommended: true },
    { id: "expansion_signal",name: "Expansion signal",       description: "Detect upgrade triggers, alert CSM.",        trigger: "usage.high", actions: ["lead.assign"], recommended: true },
    { id: "churn_risk",      name: "Churn-risk early warn",  description: "Health score drops → CSM alert.",            trigger: "schedule.daily", actions: ["digest.daily"], recommended: true },
  ],
  campaignTemplates: [
    { id: "welcome",     name: "Welcome",         channel: "email",    body: "Welcome to {{product}}, {{name}}. Quickest win: {{first_step}}. I'm here if you need anything." },
    { id: "demo_invite", name: "Book a demo",     channel: "email",    body: "Hi {{name}}, want a 20-min walk-through tailored to {{use_case}}? Pick a slot: {{link}}." },
    { id: "winback",     name: "Win back lapsed", channel: "email",    body: "Hi {{name}}, we miss you. Here's what's new since you left: {{whats_new}}. Want me to reactivate your account?" },
  ],
  onboardingQuestions: [
    { id: "product_type", label: "What kind of SaaS?",      type: "select", options: ["B2B", "B2C", "Vertical SaaS", "DevTool", "Marketplace"], required: true },
    { id: "stage",        label: "What stage are you?",      type: "select", options: ["Pre-PMF", "PMF", "Scaling", "Mature"], required: true },
    { id: "mrr",          label: "Approx MRR?",              type: "select", options: ["$0-1k", "$1-10k", "$10-100k", "$100k+"] },
  ],
  aiPersona: "You are a helpful product specialist. Be specific, jargon-aware, and outcome-oriented. Always reference the user's use-case. Push for activation early; demos for higher-fit accounts.",
};
