import type { VerticalPack } from "./index";

export const educationPack: VerticalPack = {
  id: "education",
  name: "Education / Training",
  emoji: "🎓",
  tagline: "Enroll more students, reduce drop-offs, automate support.",
  copy: {
    leadsLabel: "Students",
    leadSingular: "student",
    contactLabel: "Student",
    appointmentLabel: "Counselling session",
    pipelineStages: ["Inquiry", "Counselled", "Enrolled", "Active", "Completed", "Alumni"],
  },
  kpis: [
    { key: "enrollments",    label: "New enrollments",   format: "number",   good: "up" },
    { key: "completion",     label: "Completion rate",   format: "percent",  good: "up" },
    { key: "avg_fee",        label: "Avg fee",           format: "currency", good: "up" },
    { key: "response_time",  label: "First response",    format: "duration", good: "down" },
  ],
  recommendedIntegrations: ["whatsapp", "email", "google_calendar", "openai", "google_sheets", "stripe"],
  automations: [
    { id: "inquiry_qualify",   name: "Inquiry qualifier",   description: "Capture course interest, level, fee budget.", trigger: "lead.created", actions: ["lead.qualify"], recommended: true },
    { id: "counsel_book",      name: "Auto-book counselling", description: "Slot offer, brochure send, reminder.",       trigger: "lead.qualified", actions: ["appointment.book", "appointment.remind"], recommended: true },
    { id: "drop_revival",      name: "Revive drop-offs",      description: "If inactive 7d, AI-personalized message.",  trigger: "schedule.daily", actions: ["retargeting.run"], recommended: true },
    { id: "fee_reminder",      name: "Fee reminders",         description: "T-7, T-1 reminders before due.",            trigger: "schedule.daily", actions: ["followup.send"], recommended: true },
  ],
  campaignTemplates: [
    { id: "demo",       name: "Demo class invite",    channel: "whatsapp", body: "Hi {{name}}, free demo for {{course}} this Sat 6pm. Reserve your seat: {{link}}." },
    { id: "fee_due",    name: "Fee due reminder",     channel: "whatsapp", body: "Hi {{name}}, your next fee installment of {{amount}} is due {{date}}. Pay here: {{link}}." },
    { id: "alumni",     name: "Alumni newsletter",    channel: "email",    body: "Hey {{name}}, here's what's new at {{school}} this month: {{highlights}}." },
  ],
  onboardingQuestions: [
    { id: "type",       label: "What kind of education?",       type: "select", options: ["School", "College / University", "Coaching center", "Online course", "Bootcamp", "Test prep"], required: true },
    { id: "students",   label: "Active students?",                type: "select", options: ["<50", "50-500", "500-5k", "5k+"], required: true },
    { id: "courses",    label: "How many courses / programs?",    type: "select", options: ["1", "2-5", "6-20", "20+"] },
  ],
  aiPersona: "You are a warm, patient education counsellor. Always confirm the student's goal, current level, and budget. Never overpromise outcomes. Push toward booking a counselling session or demo class.",
};
