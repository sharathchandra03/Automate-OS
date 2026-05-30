/**
 * Plan tiers, limits, and feature entitlements.
 * Single source of truth for monetization gating.
 */

export type PlanId = "starter" | "pro" | "business" | "agency" | "enterprise";

export interface PlanLimits {
  users: number;
  contacts: number;
  automationsPerMonth: number;
  aiTokensPerMonth: number;
  storageGB: number;
  childOrgs: number; // for agency / enterprise
  inboxChannels: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  pricePerMonth: number;        // USD
  pricePerYear: number;         // USD (2 months free)
  badge?: string;
  highlight?: boolean;
  limits: PlanLimits;
  features: string[];           // feature keys, see features.ts
}

const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Run your first automations end-to-end.",
    pricePerMonth: 29,
    pricePerYear: 290,
    limits: {
      users: 1,
      contacts: 500,
      automationsPerMonth: 1_000,
      aiTokensPerMonth: 50_000,
      storageGB: 1,
      childOrgs: 0,
      inboxChannels: 2,
    },
    features: [
      "leads", "campaigns", "appointments", "tickets", "faq",
      "follow_ups", "analytics_basic", "connect_center",
      "ai_basic", "notifications", "automations_view",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For growing teams that need leverage.",
    pricePerMonth: 79,
    pricePerYear: 790,
    badge: "Most popular",
    highlight: true,
    limits: {
      users: 5,
      contacts: 10_000,
      automationsPerMonth: 25_000,
      aiTokensPerMonth: 1_000_000,
      storageGB: 25,
      childOrgs: 0,
      inboxChannels: 5,
    },
    features: [
      "leads", "campaigns", "appointments", "tickets", "faq",
      "follow_ups", "analytics_basic", "analytics_advanced", "connect_center",
      "ai_basic", "ai_advanced", "knowledge_base", "workflow_builder",
      "notifications", "automations_view", "webhook_logs", "api_keys",
      "templates_marketplace", "customer_health", "scheduled_reports",
      "client_portal_basic",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "For established teams scaling automation across departments.",
    pricePerMonth: 199,
    pricePerYear: 1_990,
    limits: {
      users: 20,
      contacts: 50_000,
      automationsPerMonth: 250_000,
      aiTokensPerMonth: 5_000_000,
      storageGB: 100,
      childOrgs: 0,
      inboxChannels: 10,
    },
    features: [
      "leads", "campaigns", "appointments", "tickets", "faq",
      "follow_ups", "analytics_basic", "analytics_advanced", "connect_center",
      "ai_basic", "ai_advanced", "ai_voice", "knowledge_base",
      "workflow_builder", "notifications", "automations_view", "webhook_logs",
      "api_keys", "templates_marketplace", "customer_health",
      "scheduled_reports", "client_portal_full", "approvals", "tasks",
      "anomaly_detection", "ab_testing",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    tagline: "Manage many clients from one beautiful UI.",
    pricePerMonth: 399,
    pricePerYear: 3_990,
    badge: "For agencies",
    limits: {
      users: 25,
      contacts: 100_000,
      automationsPerMonth: 500_000,
      aiTokensPerMonth: 10_000_000,
      storageGB: 250,
      childOrgs: 10,
      inboxChannels: UNLIMITED,
    },
    features: [
      "leads", "campaigns", "appointments", "tickets", "faq",
      "follow_ups", "analytics_basic", "analytics_advanced", "connect_center",
      "ai_basic", "ai_advanced", "ai_voice", "knowledge_base",
      "workflow_builder", "notifications", "automations_view", "webhook_logs",
      "api_keys", "templates_marketplace", "customer_health",
      "scheduled_reports", "client_portal_full", "approvals", "tasks",
      "anomaly_detection", "ab_testing", "white_label", "multi_org",
      "agency_dashboard",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Mission-critical scale, security, and support.",
    pricePerMonth: 0, // custom
    pricePerYear: 0,
    badge: "Custom",
    limits: {
      users: UNLIMITED,
      contacts: UNLIMITED,
      automationsPerMonth: UNLIMITED,
      aiTokensPerMonth: UNLIMITED,
      storageGB: UNLIMITED,
      childOrgs: UNLIMITED,
      inboxChannels: UNLIMITED,
    },
    features: [
      "leads", "campaigns", "appointments", "tickets", "faq",
      "follow_ups", "analytics_basic", "analytics_advanced", "connect_center",
      "ai_basic", "ai_advanced", "ai_voice", "knowledge_base",
      "workflow_builder", "notifications", "automations_view", "webhook_logs",
      "api_keys", "templates_marketplace", "customer_health",
      "scheduled_reports", "client_portal_full", "approvals", "tasks",
      "anomaly_detection", "ab_testing", "white_label", "multi_org",
      "agency_dashboard", "sso", "scim", "audit_streaming", "ip_allowlist",
      "byok", "dedicated_region", "premium_sla",
    ],
  },
};

export const PLAN_LIST: Plan[] = Object.values(PLANS);

export function getPlan(id: PlanId): Plan {
  return PLANS[id] ?? PLANS.starter;
}

/** Format an unlimited-aware number for display. */
export function fmtLimit(n: number): string {
  if (n === UNLIMITED) return "Unlimited";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}k`;
  return `${n}`;
}
