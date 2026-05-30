import type { VerticalPack } from "./index";

export const clinicPack: VerticalPack = {
  id: "clinic",
  name: "Clinic / Healthcare",
  emoji: "🩺",
  tagline: "Fewer no-shows, faster patient response, happier reviews.",
  copy: {
    leadsLabel: "Patients",
    leadSingular: "patient",
    contactLabel: "Patient",
    appointmentLabel: "Consultation",
    pipelineStages: ["Inquiry", "Triaged", "Booked", "Visited", "Follow-up", "Discharged"],
  },
  kpis: [
    { key: "bookings_week",  label: "Bookings this week",  format: "number",  good: "up" },
    { key: "no_show_rate",   label: "No-show rate",        format: "percent", good: "down" },
    { key: "review_score",   label: "Avg review score",    format: "number",  good: "up" },
    { key: "response_time",  label: "First response",      format: "duration", good: "down" },
  ],
  recommendedIntegrations: ["whatsapp", "email", "google_calendar", "openai", "webhook"],
  automations: [
    { id: "patient_intake",   name: "Patient intake form",   description: "Collect basics, history, insurance.",          trigger: "lead.created", actions: ["lead.qualify"], recommended: true },
    { id: "appointment_book", name: "Auto-book consults",    description: "Offer slots, confirm, send prep instructions.", trigger: "lead.qualified", actions: ["appointment.book", "appointment.remind"], recommended: true },
    { id: "remind_24_1",      name: "24h + 1h reminders",    description: "Reduce no-shows.",                              trigger: "appointment.created", actions: ["appointment.remind"], recommended: true },
    { id: "review_request",   name: "Post-visit review",     description: "Ask for a Google review after a visit.",        trigger: "appointment.completed", actions: ["followup.send"], recommended: true },
  ],
  campaignTemplates: [
    { id: "reminder", name: "Visit reminder", channel: "whatsapp", body: "Hi {{name}}, just a reminder of your appointment with Dr. {{doctor}} tomorrow at {{time}}. Reply C to confirm or R to reschedule." },
    { id: "review",   name: "Review request", channel: "whatsapp", body: "Thanks for visiting {{clinic}} today, {{name}} 🙏 If we did well, would you mind leaving a quick review? {{review_link}}" },
    { id: "checkup",  name: "Annual check-up", channel: "email",   body: "Hi {{name}}, it's been a year since your last visit - time for your annual check-up. Book here: {{link}}." },
  ],
  onboardingQuestions: [
    { id: "specialty",  label: "What's your specialty?",        type: "text",   required: true },
    { id: "doctors",    label: "How many practitioners?",        type: "select", options: ["1", "2-5", "6-15", "15+"], required: true },
    { id: "ehr",        label: "What EHR / EMR do you use?",     type: "text" },
  ],
  aiPersona: "You are a calm, empathetic clinic receptionist. Never give medical advice. Confirm symptoms briefly, never diagnose. Always book or reschedule appointments. Respect privacy: don't share details with anyone but the patient.",
};
