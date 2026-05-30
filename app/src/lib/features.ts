/**
 * Feature flag system.
 *
 * Two layers:
 *   1. Plan entitlement - does the org's plan include this feature?
 *   2. Org override - has an admin (or us) toggled it on/off for this org?
 *
 * Always check `hasFeature()` before rendering or routing to gated UI.
 */

import { getPlan, PlanId } from "./plans";

export interface FeatureMeta {
  key: string;
  name: string;
  description: string;
  category: "core" | "ai" | "comms" | "analytics" | "ops" | "enterprise" | "growth";
  minPlan: PlanId;
}

export const FEATURES: FeatureMeta[] = [
  // core
  { key: "leads",                category: "core",       minPlan: "starter",    name: "Leads",                description: "Capture, qualify, and route leads." },
  { key: "campaigns",            category: "core",       minPlan: "starter",    name: "Campaigns",            description: "Outbound message campaigns across channels." },
  { key: "appointments",         category: "core",       minPlan: "starter",    name: "Appointments",         description: "Booking, reminders, no-show handling." },
  { key: "tickets",              category: "core",       minPlan: "starter",    name: "Support tickets",      description: "Inbox, queues, escalation." },
  { key: "faq",                  category: "core",       minPlan: "starter",    name: "FAQ bot",              description: "Auto-reply from your knowledge base." },
  { key: "follow_ups",           category: "core",       minPlan: "starter",    name: "Follow-ups",           description: "Automated multi-step nurture sequences." },
  { key: "connect_center",       category: "core",       minPlan: "starter",    name: "Connect Center",       description: "Integrations and channel auth." },
  { key: "automations_view",     category: "core",       minPlan: "starter",    name: "Automations view",     description: "View and toggle workflows." },
  { key: "notifications",        category: "core",       minPlan: "starter",    name: "Notifications",        description: "In-app + email + push alerts." },

  // ai
  { key: "ai_basic",             category: "ai",         minPlan: "starter",    name: "AI Assistant (basic)", description: "Lead qualification, ticket triage, draft replies." },
  { key: "ai_advanced",          category: "ai",         minPlan: "pro",        name: "AI Assistant (advanced)", description: "Workflow suggestions, daily brief, anomaly detection." },
  { key: "ai_voice",             category: "ai",         minPlan: "business",   name: "Voice AI",             description: "AI-powered inbound and outbound calls." },
  { key: "knowledge_base",       category: "ai",         minPlan: "pro",        name: "Knowledge base + RAG", description: "Upload docs, train your AI." },

  // analytics
  { key: "analytics_basic",      category: "analytics",  minPlan: "starter",    name: "Analytics",            description: "Core charts and KPIs." },
  { key: "analytics_advanced",   category: "analytics",  minPlan: "pro",        name: "Advanced analytics",   description: "Funnels, cohorts, attribution." },
  { key: "scheduled_reports",    category: "analytics",  minPlan: "pro",        name: "Scheduled reports",    description: "Email/PDF reports on a schedule." },
  { key: "customer_health",      category: "analytics",  minPlan: "pro",        name: "Customer health",      description: "Score and predict churn." },
  { key: "anomaly_detection",    category: "analytics",  minPlan: "business",   name: "Anomaly detection",    description: "Auto-alerts on unusual patterns." },

  // ops
  { key: "workflow_builder",     category: "ops",        minPlan: "pro",        name: "Workflow builder",     description: "Visual drag-drop automation editor." },
  { key: "webhook_logs",         category: "ops",        minPlan: "pro",        name: "Webhook logs",         description: "Inspect, replay, debug." },
  { key: "api_keys",             category: "ops",        minPlan: "pro",        name: "API keys",             description: "Programmatic access for developers." },
  { key: "approvals",            category: "ops",        minPlan: "business",   name: "Approvals",            description: "Approve campaigns, replies, automations." },
  { key: "tasks",                category: "ops",        minPlan: "business",   name: "Tasks",                description: "Assign, track, complete." },
  { key: "ab_testing",           category: "ops",        minPlan: "business",   name: "A/B testing",          description: "Run experiments on campaigns and flows." },

  // growth
  { key: "templates_marketplace",category: "growth",     minPlan: "pro",        name: "Templates marketplace",description: "Install pre-built workflows and campaigns." },
  { key: "client_portal_basic",  category: "growth",     minPlan: "pro",        name: "Client portal",        description: "A login for your customers." },
  { key: "client_portal_full",   category: "growth",     minPlan: "business",   name: "Client portal (full)", description: "Branded customer portal with self-service." },

  // enterprise
  { key: "white_label",          category: "enterprise", minPlan: "agency",     name: "White-label",          description: "Replace AutomateOS branding with your own." },
  { key: "multi_org",            category: "enterprise", minPlan: "agency",     name: "Multi-org",            description: "Manage multiple clients from one login." },
  { key: "agency_dashboard",     category: "enterprise", minPlan: "agency",     name: "Agency dashboard",     description: "Roll-up reporting across client orgs." },
  { key: "sso",                  category: "enterprise", minPlan: "enterprise", name: "SSO (SAML/OIDC)",      description: "Single sign-on with identity providers." },
  { key: "scim",                 category: "enterprise", minPlan: "enterprise", name: "SCIM provisioning",    description: "Auto-sync users from your IdP." },
  { key: "audit_streaming",      category: "enterprise", minPlan: "enterprise", name: "Audit streaming",      description: "Stream audit logs to your SIEM." },
  { key: "ip_allowlist",         category: "enterprise", minPlan: "enterprise", name: "IP allow-list",        description: "Restrict access by IP." },
  { key: "byok",                 category: "enterprise", minPlan: "enterprise", name: "Customer-managed keys",description: "Bring your own encryption keys." },
  { key: "dedicated_region",     category: "enterprise", minPlan: "enterprise", name: "Dedicated region",     description: "Single-tenant region for compliance." },
  { key: "premium_sla",          category: "enterprise", minPlan: "enterprise", name: "Premium SLA",          description: "99.99% uptime + dedicated CSM." },
];

export const FEATURE_BY_KEY = new Map(FEATURES.map((f) => [f.key, f]));

export interface FeatureContext {
  planId: PlanId;
  /** Per-org overrides: { feature_key: true|false }. true forces on, false forces off. */
  overrides?: Record<string, boolean>;
}

export function hasFeature(ctx: FeatureContext, key: string): boolean {
  if (ctx.overrides && key in ctx.overrides) return ctx.overrides[key];
  const plan = getPlan(ctx.planId);
  return plan.features.includes(key);
}

export function listAvailableFeatures(ctx: FeatureContext): FeatureMeta[] {
  return FEATURES.filter((f) => hasFeature(ctx, f.key));
}

export function listLockedFeatures(ctx: FeatureContext): FeatureMeta[] {
  return FEATURES.filter((f) => !hasFeature(ctx, f.key));
}
