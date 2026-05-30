import type { VerticalPack } from "./index";

export const gymPack: VerticalPack = {
  id: "gym",
  name: "Gym / Fitness",
  emoji: "🏋️",
  tagline: "Trial → membership → retention, on autopilot.",
  copy: {
    leadsLabel: "Members",
    leadSingular: "member",
    contactLabel: "Member",
    appointmentLabel: "Trial session",
    pipelineStages: ["Inquiry", "Trial booked", "Trialed", "Member", "At-risk", "Lapsed"],
  },
  kpis: [
    { key: "active_members", label: "Active members",   format: "number",   good: "up" },
    { key: "trial_to_paid",  label: "Trial → paid",     format: "percent",  good: "up" },
    { key: "churn",          label: "Monthly churn",    format: "percent",  good: "down" },
    { key: "avg_visits",     label: "Avg visits / wk",  format: "number",   good: "up" },
  ],
  recommendedIntegrations: ["whatsapp", "google_calendar", "openai", "stripe", "google_sheets"],
  automations: [
    { id: "trial_book",   name: "Trial booking",     description: "Auto-book free trial + reminder.",                trigger: "lead.created",  actions: ["appointment.book", "appointment.remind"], recommended: true },
    { id: "post_trial",   name: "Post-trial offer",  description: "Send offer + testimonial within 1h after trial.", trigger: "appointment.completed", actions: ["followup.send"], recommended: true },
    { id: "checkin_low",  name: "Low check-in nudge",description: "If member <2 visits/week → motivation message.",  trigger: "schedule.weekly", actions: ["retargeting.run"], recommended: true },
    { id: "renewal",      name: "Renewal reminder",  description: "T-7 before expiry, then T-0.",                    trigger: "schedule.daily", actions: ["followup.send"], recommended: true },
  ],
  campaignTemplates: [
    { id: "trial",   name: "Trial invite",   channel: "whatsapp", body: "Hi {{name}}, ready for your free trial at {{gym}}? Pick a time: {{link}}." },
    { id: "renew",   name: "Membership renewal", channel: "whatsapp", body: "Hey {{name}}, your membership renews on {{date}}. Renew now & lock in current rate: {{link}}." },
    { id: "winback", name: "We miss you",    channel: "whatsapp", body: "Haven't seen you in {{days}} days, {{name}}! Here's a free guest pass to come back: {{code}}." },
  ],
  onboardingQuestions: [
    { id: "type",     label: "Type of facility?",       type: "select", options: ["Gym", "CrossFit", "Yoga", "Pilates", "Studio", "Personal training"], required: true },
    { id: "members",  label: "Active members?",          type: "select", options: ["<100", "100-500", "500-2k", "2k+"], required: true },
    { id: "trainers", label: "Number of trainers?",      type: "select", options: ["1", "2-5", "6-15", "15+"] },
  ],
  aiPersona: "You are an energetic but not pushy fitness coach. Be encouraging, specific, and practical. Always include the date/time of the next session. Celebrate small wins.",
};
