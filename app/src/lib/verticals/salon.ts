import type { VerticalPack } from "./index";

export const salonPack: VerticalPack = {
  id: "salon",
  name: "Salon / Spa",
  emoji: "💇",
  tagline: "Filled chairs, no-shows down, regulars coming back.",
  copy: {
    leadsLabel: "Clients",
    leadSingular: "client",
    contactLabel: "Client",
    appointmentLabel: "Appointment",
    pipelineStages: ["Inquiry", "Booked", "Visited", "Repeat", "VIP", "Lapsed"],
  },
  kpis: [
    { key: "bookings",     label: "Bookings",          format: "number",   good: "up" },
    { key: "no_show_rate", label: "No-show rate",      format: "percent",  good: "down" },
    { key: "avg_ticket",   label: "Avg ticket",        format: "currency", good: "up" },
    { key: "repeat_rate",  label: "Repeat rate",       format: "percent",  good: "up" },
  ],
  recommendedIntegrations: ["whatsapp", "google_calendar", "openai", "stripe", "google_sheets"],
  automations: [
    { id: "book",       name: "Auto-book service",     description: "Service + stylist + slot, instant confirm.", trigger: "lead.created", actions: ["appointment.book"], recommended: true },
    { id: "remind",     name: "Reminders 24h + 1h",    description: "Cuts no-shows in half.",                     trigger: "appointment.created", actions: ["appointment.remind"], recommended: true },
    { id: "rebook",     name: "Rebook nudge",          description: "Nudge ~30/45/60 days after last visit.",      trigger: "schedule.daily", actions: ["retargeting.run"], recommended: true },
    { id: "review_ask", name: "Review request",        description: "Day-after review request.",                  trigger: "appointment.completed", actions: ["followup.send"], recommended: true },
  ],
  campaignTemplates: [
    { id: "rebook", name: "Time for your next visit?", channel: "whatsapp", body: "Hi {{name}}, it's been {{days}} days since your last appointment. Want me to save your usual slot? {{link}}" },
    { id: "promo",  name: "Loyalty promo",            channel: "whatsapp", body: "Hi {{name}}, 20% off your next color this month - book here: {{link}}." },
  ],
  onboardingQuestions: [
    { id: "services", label: "What services?",        type: "multi-select", options: ["Hair", "Nails", "Skin", "Spa", "Massage", "Makeup", "Lashes"], required: true },
    { id: "stylists", label: "How many stylists?",     type: "select", options: ["1", "2-5", "6-15", "15+"], required: true },
  ],
  aiPersona: "You are a polished, helpful salon receptionist. Confirm service, stylist preference, and time. Be warm, brief, and always include the booking link.",
};
