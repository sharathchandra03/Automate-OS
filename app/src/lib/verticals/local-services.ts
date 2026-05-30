import type { VerticalPack } from "./index";

export const localServicesPack: VerticalPack = {
  id: "local-services",
  name: "Local Services",
  emoji: "🛠️",
  tagline: "Quote → schedule → invoice. The stack for plumbers, electricians, cleaners, movers.",
  copy: {
    leadsLabel: "Customers",
    leadSingular: "customer",
    contactLabel: "Customer",
    appointmentLabel: "Service visit",
    pipelineStages: ["Lead", "Quoted", "Scheduled", "On-site", "Completed", "Invoiced"],
  },
  kpis: [
    { key: "jobs_week",     label: "Jobs this week",      format: "number",   good: "up" },
    { key: "quote_to_job",  label: "Quote → job rate",    format: "percent",  good: "up" },
    { key: "avg_ticket",    label: "Avg job value",       format: "currency", good: "up" },
    { key: "review_score",  label: "Avg review",          format: "number",   good: "up" },
  ],
  recommendedIntegrations: ["whatsapp", "google_calendar", "openai", "stripe", "google_sheets"],
  automations: [
    { id: "quote_send",    name: "Auto-quote",          description: "Generate ballpark quote on inbound.",         trigger: "lead.created", actions: ["lead.qualify", "followup.send"], recommended: true },
    { id: "schedule",      name: "Schedule visit",      description: "Book the slot, send arrival window.",          trigger: "lead.stage_changed", actions: ["appointment.book"], recommended: true },
    { id: "remind_arrival",name: "Arrival reminder",    description: "Tech-on-the-way notification.",                trigger: "appointment.remind", actions: ["appointment.remind"], recommended: true },
    { id: "review_ask",    name: "Review request",      description: "Day-after review request to top platform.",   trigger: "appointment.completed", actions: ["followup.send"], recommended: true },
  ],
  campaignTemplates: [
    { id: "arrival", name: "Tech on the way",   channel: "whatsapp", body: "Hi {{name}}, your tech {{tech}} is heading over and will arrive between {{window}}." },
    { id: "review",  name: "Loved the service?", channel: "whatsapp", body: "Hope everything's working great, {{name}} 🛠️ A quick review really helps small teams: {{review_link}}." },
  ],
  onboardingQuestions: [
    { id: "trade",     label: "What trade?",         type: "select", options: ["Plumbing", "Electrical", "HVAC", "Cleaning", "Moving", "Pest control", "Landscaping", "Other"], required: true },
    { id: "team",      label: "Team size?",           type: "select", options: ["Solo", "2-5", "6-15", "15+"], required: true },
    { id: "service_radius", label: "Service radius (km/mi)?", type: "number" },
  ],
  aiPersona: "You are a no-nonsense local services dispatcher. Confirm address, problem, urgency. Give a clear price range when possible. Always confirm a visit window in writing.",
};
