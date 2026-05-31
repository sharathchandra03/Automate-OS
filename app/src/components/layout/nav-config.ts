import {
  LayoutDashboard,
  Users,
  Megaphone,
  Repeat,
  CalendarCheck,
  LifeBuoy,
  MessageSquareMore,
  Target,
  BarChart3,
  Plug,
  Bot,
  UsersRound,
  Settings,
  ShieldCheck,
  Sparkles,
  Inbox,
  Bell,
  BookOpen,
  GitBranch,
  Webhook,
  Key,
  Store,
  CreditCard,
  FileBarChart2,
  Contact,
  Wallet,
  MessageCircle,
  Tag,
} from "lucide-react";

export interface NavGroup {
  label: string;
  items: NavItem[];
}
export interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  description?: string;
  /** Feature-flag key required to show this item. */
  feature?: string;
  /** Sub-navigation items - shown indented when parent or any child is active. */
  children?: Omit<NavItem, "children">[];
}

// ── Agent nav - only what agents need ────────────────────────────────────────
export const AGENT_NAV: NavGroup[] = [
  {
    label: "Work",
    items: [
      { label: "Inbox",        href: "/inbox",        icon: Inbox,        description: "Your assigned WhatsApp conversations" },
      { label: "Appointments", href: "/appointments", icon: CalendarCheck, description: "Upcoming appointments assigned to you" },
      { label: "Tickets",      href: "/tickets",      icon: LifeBuoy,     description: "Support tickets in your queue" },
    ],
  },
  {
    label: "Contacts",
    items: [
      { label: "Contacts", href: "/contacts", icon: Contact, description: "Customer contact list" },
    ],
  },
  {
    label: "Updates",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell, description: "Alerts & messages" },
    ],
  },
];

// ── Admin / full nav ──────────────────────────────────────────────────────────
export const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview",     href: "/overview",      icon: LayoutDashboard, description: "Daily snapshot of your business" },
      { label: "Insights",     href: "/insights",      icon: Sparkles,        description: "AI daily brief & health",            badge: "AI" },
      { label: "Inbox",        href: "/inbox",         icon: Inbox,           description: "Unified WhatsApp / Email / SMS / Telegram" },
      { label: "Analytics",    href: "/analytics",     icon: BarChart3,       description: "Performance & funnel insights",       feature: "analytics_basic" },
      { label: "Reports",      href: "/reports",       icon: FileBarChart2,   description: "Scheduled exports",                   feature: "scheduled_reports" },
    ],
  },
  {
    label: "Contacts",
    items: [
      {
        label: "Contacts",
        href: "/contacts",
        icon: Contact,
        description: "WhatsApp address book",
        children: [
          { label: "All Contacts", href: "/contacts",        icon: Users, description: "View and manage all contacts" },
          { label: "Labels",       href: "/contacts/labels", icon: Tag,   description: "Saved contact groups" },
        ],
      },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { label: "Leads",        href: "/leads",         icon: Users,           description: "Capture, qualify & convert" },
      { label: "Appointments", href: "/appointments",  icon: CalendarCheck,   description: "Bookings & calendar" },
      { label: "Tickets",      href: "/tickets",       icon: LifeBuoy,        description: "Customer support inbox" },
    ],
  },
  {
    label: "Outreach",
    items: [
      { label: "Campaigns",    href: "/campaigns",     icon: Megaphone,       description: "WhatsApp / Email / Telegram blasts" },
      { label: "Follow-ups",   href: "/follow-ups",    icon: Repeat,          description: "Drip & nurture sequences" },
      { label: "Retargeting",  href: "/retargeting",   icon: Target,          description: "Re-engage inactive leads" },
      { label: "FAQ Bot",      href: "/faq",           icon: MessageSquareMore, description: "Auto-replies & knowledge base" },
    ],
  },
  {
    label: "AI",
    items: [
      { label: "AI Assistant", href: "/ai-assistant",  icon: Sparkles,        description: "Your business copilot" },
      { label: "Knowledge",    href: "/knowledge",     icon: BookOpen,        description: "Train AI on your docs",               feature: "knowledge_base" },
      { label: "Templates",    href: "/templates",     icon: Store,           description: "Pre-built workflows & campaigns",     feature: "templates_marketplace" },
      { label: "AI Agents",    href: "/agents",        icon: Bot,             description: "Configure automated AI agents",        feature: "ai_agents" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Connect Center",   href: "/connect",          icon: Plug,         description: "Channels & integrations", badge: "Setup" },
      { label: "Automations",      href: "/automations",      icon: Bot,          description: "n8n workflows" },
      { label: "Workflow Builder", href: "/workflow-builder", icon: GitBranch,    description: "Build flows visually",        feature: "workflow_builder" },
      { label: "Webhook logs",     href: "/webhooks",         icon: Webhook,      description: "Inspect & replay",            feature: "webhook_logs" },
      { label: "API keys",         href: "/api-keys",         icon: Key,          description: "Programmatic access",          feature: "api_keys" },
      { label: "Notifications",    href: "/notifications",    icon: Bell,         description: "Alerts inbox" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Team",         href: "/team",              icon: UsersRound,     description: "Members & roles" },
      { label: "Wallet",       href: "/wallet",            icon: Wallet,         description: "Credits & transaction history" },
      { label: "Billing",      href: "/billing",           icon: CreditCard,     description: "Plan, usage & invoices" },
      { label: "Admin",        href: "/admin",             icon: ShieldCheck,    description: "Logs & system status" },
      { label: "Settings",     href: "/settings",          icon: Settings,       description: "Business profile" },
      { label: "Channels",     href: "/settings/channels", icon: MessageCircle,  description: "WhatsApp, Telegram & SMS credentials" },
    ],
  },
];
