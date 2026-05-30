import type { VerticalPack } from "./index";

export const genericPack: VerticalPack = {
  id: "generic",
  name: "General Business",
  emoji: "🏢",
  tagline: "Works for any service business out of the box.",
  copy: {
    leadsLabel: "Leads",
    leadSingular: "lead",
    contactLabel: "Contact",
    appointmentLabel: "Appointment",
    pipelineStages: ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
  },
  kpis: [
    { key: "leads_total",     label: "Total leads",        format: "number",   good: "up" },
    { key: "qualified_pct",   label: "Qualified rate",     format: "percent",  good: "up" },
    { key: "won_value",       label: "Won pipeline",       format: "currency", good: "up" },
    { key: "response_time",   label: "First response",     format: "duration", good: "down" },
  ],
  recommendedIntegrations: ["whatsapp", "email", "google_calendar", "openai", "webhook"],
  automations: [
    { id: "lead_qualify",   name: "Qualify new leads",       description: "AI scores every new lead and tags it.",    trigger: "lead.created",   actions: ["lead.qualify"], recommended: true },
    { id: "first_response", name: "First response in 5 min", description: "Auto-acknowledge inbound leads.",          trigger: "lead.created",   actions: ["followup.send"], recommended: true },
    { id: "appointment_remind", name: "Appointment reminders", description: "Reminder 24h and 1h before.",            trigger: "appointment.created", actions: ["appointment.remind"], recommended: true },
    { id: "ticket_classify",name: "Auto-classify tickets",   description: "Tag and assign tickets by intent.",        trigger: "ticket.created", actions: ["ticket.create"], recommended: false },
  ],
  campaignTemplates: [
    { id: "welcome",  name: "Welcome message",  channel: "whatsapp", body: "Hi {{name}} 👋 Thanks for reaching out - how can we help today?" },
    { id: "checkin",  name: "Check-in",         channel: "whatsapp", body: "Hi {{name}}, just checking in - any questions I can answer?" },
    { id: "review",   name: "Ask for review",   channel: "email",    body: "Hey {{name}}, would you mind leaving us a quick review? It helps a lot 🙏" },
  ],
  onboardingQuestions: [
    { id: "company_name", label: "What's the name of your business?",        type: "text",   required: true },
    { id: "team_size",    label: "How many people are on your team?",         type: "select", options: ["Just me", "2-5", "6-20", "20+"], required: true },
    { id: "main_goal",    label: "What's your #1 goal with AutomateOS?",      type: "select", options: ["Capture more leads", "Respond faster", "Save time", "Sell more"], required: true },
  ],
  aiPersona: "You are a helpful business assistant. Match the brand voice. Be concise, warm, and actionable. Never make up facts about the business - ask if unsure.",
};
