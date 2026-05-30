import type { VerticalPack } from "./index";

export const restaurantPack: VerticalPack = {
  id: "restaurant",
  name: "Restaurant / Hospitality",
  emoji: "🍽️",
  tagline: "Reservations, reviews, repeat diners - automated.",
  copy: {
    leadsLabel: "Guests",
    leadSingular: "guest",
    contactLabel: "Guest",
    appointmentLabel: "Reservation",
    pipelineStages: ["Inquiry", "Reservation", "Seated", "Reviewed", "Repeat", "VIP"],
  },
  kpis: [
    { key: "reservations",  label: "Reservations",     format: "number",  good: "up" },
    { key: "no_show_rate",  label: "No-show rate",     format: "percent", good: "down" },
    { key: "avg_review",    label: "Avg review score", format: "number",  good: "up" },
    { key: "repeat_visits", label: "Repeat rate",      format: "percent", good: "up" },
  ],
  recommendedIntegrations: ["whatsapp", "google_calendar", "openai", "google_sheets"],
  automations: [
    { id: "reserve_confirm", name: "Reservation confirm", description: "WhatsApp confirmation + reminder.",          trigger: "appointment.created", actions: ["appointment.remind"], recommended: true },
    { id: "review_ask",      name: "Review request",      description: "Send review link 2h after meal.",            trigger: "appointment.completed", actions: ["followup.send"], recommended: true },
    { id: "vip_offer",       name: "VIP returning offer", description: "Top diners get a special.",                  trigger: "schedule.monthly", actions: ["campaign.launch"], recommended: false },
    { id: "event_blast",     name: "Event blast",         description: "Notify the list for special menus / events.", trigger: "manual", actions: ["campaign.launch"], recommended: false },
  ],
  campaignTemplates: [
    { id: "confirm", name: "Reservation confirmed", channel: "whatsapp", body: "Hi {{name}}, your table for {{party_size}} on {{date}} at {{time}} is booked. Reply CANCEL if plans change." },
    { id: "review",  name: "How was it?",           channel: "whatsapp", body: "Hope you enjoyed dinner, {{name}} 🍷 Would you mind a quick review? {{review_link}}" },
    { id: "event",   name: "Special event",        channel: "whatsapp", body: "Hi {{name}}, our {{event}} menu drops {{date}} - your usual table?" },
  ],
  onboardingQuestions: [
    { id: "cuisine",  label: "Cuisine?",         type: "text", required: true },
    { id: "covers",   label: "Daily covers?",    type: "select", options: ["<50", "50-200", "200-500", "500+"] },
    { id: "branches", label: "Number of outlets?", type: "select", options: ["1", "2-5", "6-20", "20+"] },
  ],
  aiPersona: "You are a friendly maître d'. Always confirm name, party size, date, time. Never overbook. Be warm, brief, and end with a CTA. Suggest dietary alternatives if asked.",
};
