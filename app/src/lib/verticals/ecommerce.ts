import type { VerticalPack } from "./index";

export const ecommercePack: VerticalPack = {
  id: "ecommerce",
  name: "E-commerce",
  emoji: "🛒",
  tagline: "Recover carts, support buyers, drive repeat purchases.",
  copy: {
    leadsLabel: "Customers",
    leadSingular: "customer",
    contactLabel: "Customer",
    appointmentLabel: "Consult call",
    pipelineStages: ["Visitor", "Subscriber", "Customer", "Repeat", "VIP", "Churned"],
  },
  kpis: [
    { key: "revenue_30d",    label: "Revenue (30d)",      format: "currency", good: "up" },
    { key: "cart_recovery",  label: "Cart recovery rate", format: "percent",  good: "up" },
    { key: "repeat_rate",    label: "Repeat purchase",    format: "percent",  good: "up" },
    { key: "ticket_time",    label: "Support response",   format: "duration", good: "down" },
  ],
  recommendedIntegrations: ["whatsapp", "email", "openai", "stripe", "shopify", "google_sheets", "facebook_ads"],
  automations: [
    { id: "abandoned_cart",   name: "Abandoned cart recovery", description: "3-step WhatsApp + email sequence.",      trigger: "cart.abandoned", actions: ["followup.send"], recommended: true },
    { id: "post_purchase",    name: "Post-purchase nurture",   description: "Thank-you, how-to, review request.",       trigger: "order.created", actions: ["followup.send"], recommended: true },
    { id: "winback",          name: "Win back lapsed buyers",  description: "60-day inactive get a tailored offer.",   trigger: "schedule.daily", actions: ["retargeting.run"], recommended: true },
    { id: "vip_upsell",       name: "VIP upsell",              description: "Identify top 5% LTV and cross-sell.",      trigger: "customer.tagged_vip", actions: ["campaign.launch"], recommended: false },
  ],
  campaignTemplates: [
    { id: "cart",     name: "Abandoned cart",  channel: "whatsapp", body: "Hi {{name}}, your {{product}} is still waiting. Use code COMEBACK10 for 10% off in the next 24h: {{link}}" },
    { id: "thanks",   name: "Order thank-you", channel: "whatsapp", body: "Thanks for your order, {{name}}! It ships in 24h. Track here: {{tracking}}" },
    { id: "review",   name: "Review request",  channel: "email",    body: "Hi {{name}}, how did you like {{product}}? A 30-second review would mean the world: {{review_link}}." },
  ],
  onboardingQuestions: [
    { id: "platform",  label: "What store platform do you use?", type: "select", options: ["Shopify", "WooCommerce", "Magento", "Custom", "Other"], required: true },
    { id: "category",  label: "Main product category?",          type: "text" },
    { id: "monthly",   label: "Monthly orders?",                  type: "select", options: ["<100", "100-1k", "1k-10k", "10k+"], required: true },
  ],
  aiPersona: "You are a friendly e-commerce concierge. Reply fast, in 1-2 short sentences. Recover carts with a polite nudge, never pushy. Use the customer's name. Always include a clean CTA link when relevant.",
};
