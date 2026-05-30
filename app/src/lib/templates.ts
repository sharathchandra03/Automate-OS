/**
 * Template marketplace registry.
 *
 * Each template encapsulates: description, vertical fit, what it installs
 * (campaigns, automations, FAQ, follow-ups), and whether it's free or paid.
 */

import type { VerticalId } from "./verticals";

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: "lead-gen" | "support" | "campaigns" | "ops" | "analytics";
  verticals: VerticalId[];
  installs: number;
  rating: number;        // 0-5
  free: boolean;
  priceUsd?: number;
  installs_what: string[];   // human-readable items
  estSetupMinutes: number;
}

export const TEMPLATES: MarketplaceTemplate[] = [
  {
    id: "tpl_lead_speed",
    name: "5-minute Lead Speed",
    description: "Auto-acknowledge inbound leads within 5 minutes via WhatsApp + email.",
    category: "lead-gen",
    verticals: ["generic", "real-estate", "agency", "saas", "coaching", "consultant"],
    installs: 4_812, rating: 4.8, free: true,
    installs_what: ["1 automation", "2 message templates", "1 follow-up sequence"],
    estSetupMinutes: 3,
  },
  {
    id: "tpl_no_show_killer",
    name: "No-Show Killer",
    description: "Reminders 24h + 1h before, plus rebooking link if missed.",
    category: "ops",
    verticals: ["clinic", "salon", "gym", "restaurant", "education"],
    installs: 3_201, rating: 4.9, free: true,
    installs_what: ["3 automations", "3 templates"],
    estSetupMinutes: 4,
  },
  {
    id: "tpl_cart_recovery",
    name: "Abandoned Cart Recovery",
    description: "3-step recovery sequence with personalized discount codes.",
    category: "lead-gen",
    verticals: ["ecommerce"],
    installs: 2_154, rating: 4.7, free: false, priceUsd: 19,
    installs_what: ["1 automation", "3 message templates", "1 retargeting rule"],
    estSetupMinutes: 6,
  },
  {
    id: "tpl_review_engine",
    name: "Review Engine",
    description: "Automatically request a Google review after every successful interaction.",
    category: "ops",
    verticals: ["clinic", "salon", "restaurant", "local-services", "gym"],
    installs: 1_879, rating: 4.6, free: true,
    installs_what: ["1 automation", "2 templates"],
    estSetupMinutes: 3,
  },
  {
    id: "tpl_winback",
    name: "60-Day Win-Back",
    description: "Re-engage dormant leads with a personalized AI message + offer.",
    category: "campaigns",
    verticals: ["generic", "ecommerce", "salon", "gym", "saas"],
    installs: 1_402, rating: 4.5, free: false, priceUsd: 14,
    installs_what: ["1 retargeting rule", "1 follow-up", "2 templates"],
    estSetupMinutes: 5,
  },
  {
    id: "tpl_support_triage",
    name: "AI Support Triage",
    description: "Auto-classify, prioritize, and route tickets with AI sentiment analysis.",
    category: "support",
    verticals: ["generic", "saas", "ecommerce"],
    installs: 1_201, rating: 4.7, free: false, priceUsd: 19,
    installs_what: ["2 automations", "Knowledge-base seed"],
    estSetupMinutes: 7,
  },
  {
    id: "tpl_weekly_brief",
    name: "Weekly Executive Brief",
    description: "Email a polished, branded weekly summary every Monday.",
    category: "analytics",
    verticals: ["generic", "agency", "consultant"],
    installs: 980, rating: 4.4, free: true,
    installs_what: ["1 scheduled report"],
    estSetupMinutes: 2,
  },
  {
    id: "tpl_buyer_intake",
    name: "Real-Estate Buyer Intake",
    description: "Capture budget, area, bedrooms, timeline; suggest matching listings.",
    category: "lead-gen",
    verticals: ["real-estate"],
    installs: 740, rating: 4.6, free: false, priceUsd: 24,
    installs_what: ["1 form", "1 automation", "3 templates"],
    estSetupMinutes: 8,
  },
  {
    id: "tpl_patient_reminders",
    name: "Patient Reminder Pack",
    description: "Confirmations, reminders, and post-visit reviews for clinics.",
    category: "ops",
    verticals: ["clinic"],
    installs: 612, rating: 4.8, free: true,
    installs_what: ["3 automations", "4 templates"],
    estSetupMinutes: 6,
  },
];

export function listTemplates(filter?: { vertical?: VerticalId | null; category?: MarketplaceTemplate["category"]; free?: boolean }): MarketplaceTemplate[] {
  return TEMPLATES.filter((t) => {
    if (filter?.vertical && filter.vertical !== "generic" && !t.verticals.includes(filter.vertical) && !t.verticals.includes("generic")) return false;
    if (filter?.category && t.category !== filter.category) return false;
    if (typeof filter?.free === "boolean" && t.free !== filter.free) return false;
    return true;
  });
}
