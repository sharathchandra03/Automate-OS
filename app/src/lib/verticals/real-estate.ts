import type { VerticalPack } from "./index";

export const realEstatePack: VerticalPack = {
  id: "real-estate",
  name: "Real Estate",
  emoji: "🏡",
  tagline: "Convert more buyer and seller leads, faster.",
  copy: {
    leadsLabel: "Buyers / Sellers",
    leadSingular: "buyer",
    contactLabel: "Contact",
    appointmentLabel: "Property tour",
    pipelineStages: ["New inquiry", "Contacted", "Tour scheduled", "Tour done", "Offer", "Closed"],
  },
  kpis: [
    { key: "active_buyers",  label: "Active buyers",       format: "number",   good: "up" },
    { key: "tours_week",     label: "Tours this week",     format: "number",   good: "up" },
    { key: "avg_deal",       label: "Avg deal value",      format: "currency", good: "up" },
    { key: "response_time",  label: "First response",      format: "duration", good: "down" },
    { key: "tour_to_offer",  label: "Tour → offer rate",   format: "percent",  good: "up" },
  ],
  recommendedIntegrations: ["whatsapp", "email", "google_calendar", "openai", "google_sheets", "facebook_ads"],
  automations: [
    { id: "buyer_intake",     name: "Buyer intake",         description: "Capture budget, area, bedrooms; create profile.",   trigger: "lead.created", actions: ["lead.qualify"], recommended: true },
    { id: "tour_book",        name: "Auto-book tours",      description: "Send calendar link, confirm, set reminders.",       trigger: "lead.qualified", actions: ["appointment.book", "appointment.remind"], recommended: true },
    { id: "listing_match",    name: "Match new listings",   description: "Notify buyers when matching listings hit MLS.",     trigger: "listing.created", actions: ["followup.send"], recommended: true },
    { id: "post_tour_followup", name: "Post-tour follow-up", description: "Ask for feedback, suggest next options.",          trigger: "appointment.completed", actions: ["followup.send"], recommended: true },
  ],
  campaignTemplates: [
    { id: "new_listing",   name: "New listing alert",       channel: "whatsapp", body: "Hi {{name}}, a new {{bedrooms}}BR in {{area}} just hit the market at {{price}}. Want a private tour?" },
    { id: "open_house",    name: "Open house invite",       channel: "whatsapp", body: "Hi {{name}}, open house this Sat 11am-1pm at {{address}} - should I save you a slot?" },
    { id: "price_drop",    name: "Price drop alert",        channel: "email",    body: "{{address}} just dropped to {{price}}. This is the one we toured - still interested?" },
  ],
  onboardingQuestions: [
    { id: "service_area", label: "What city/area do you serve?",                  type: "text",   required: true },
    { id: "specialty",    label: "What do you focus on?",                          type: "select", options: ["Buyers", "Sellers", "Both", "Rentals", "Commercial"], required: true },
    { id: "lead_volume",  label: "Approx. leads per month?",                       type: "select", options: ["<20", "20-100", "100-500", "500+"], required: true },
    { id: "mls",          label: "Which MLS / listing source do you use?",         type: "text" },
  ],
  aiPersona: "You are an expert real-estate concierge. Speak like a friendly local agent. Always confirm budget, area, bedrooms, and timeline. Never quote prices you weren't given. Move every conversation toward a tour booking.",
};
