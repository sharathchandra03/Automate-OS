import type { VerticalPack } from "./index";

export const coachingPack: VerticalPack = {
  id: "coaching",
  name: "Coaching",
  emoji: "🌱",
  tagline: "Discovery → enrollment → cohort delivery, all in one.",
  copy: {
    leadsLabel: "Clients",
    leadSingular: "client",
    contactLabel: "Client",
    appointmentLabel: "Discovery call",
    pipelineStages: ["Lead", "Discovery", "Proposal", "Enrolled", "Active", "Alumni"],
  },
  kpis: [
    { key: "calls_booked",  label: "Discovery calls",      format: "number",   good: "up" },
    { key: "enrollment",    label: "Enrollment rate",      format: "percent",  good: "up" },
    { key: "avg_program",   label: "Avg program value",    format: "currency", good: "up" },
    { key: "completion",    label: "Completion rate",      format: "percent",  good: "up" },
  ],
  recommendedIntegrations: ["whatsapp", "email", "google_calendar", "openai", "stripe"],
  automations: [
    { id: "discovery_book",  name: "Discovery booking",   description: "Application form → calendar slot.",  trigger: "lead.created", actions: ["lead.qualify", "appointment.book"], recommended: true },
    { id: "session_remind",  name: "Session reminders",   description: "Pre-session prep + post-session task.", trigger: "appointment.created", actions: ["appointment.remind"], recommended: true },
    { id: "milestone_check", name: "Milestone check-in",  description: "Weekly accountability nudges.",       trigger: "schedule.weekly", actions: ["followup.send"], recommended: true },
    { id: "graduation",      name: "Graduation campaign", description: "Testimonial + referral ask at end.",   trigger: "manual", actions: ["campaign.launch"], recommended: false },
  ],
  campaignTemplates: [
    { id: "apply",   name: "Application invite", channel: "email",    body: "Hi {{name}}, I'd love to hear more about your goals. 5-min application: {{link}}." },
    { id: "remind",  name: "Session reminder",   channel: "whatsapp", body: "Hi {{name}}, our session is at {{time}}. Today's focus: {{topic}}. See you there!" },
    { id: "nudge",   name: "Weekly nudge",       channel: "whatsapp", body: "Hey {{name}}, how's the {{action}} going this week? Reply with one win + one block." },
  ],
  onboardingQuestions: [
    { id: "niche",     label: "What's your coaching niche?",     type: "text", required: true },
    { id: "format",    label: "1:1, group, or hybrid?",            type: "select", options: ["1:1", "Group", "Hybrid", "Course only"], required: true },
    { id: "fee",       label: "Typical program fee?",              type: "select", options: ["<$500", "$500-2k", "$2-10k", "$10k+"] },
  ],
  aiPersona: "You are a thoughtful, grounded coach assistant. Listen first, mirror the client's words, then guide. Always confirm the goal and the next action. Never give clinical/medical advice.",
};
