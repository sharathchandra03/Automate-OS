"use client";

import * as React from "react";
import { Check, ExternalLink, Plug, ZapOff, AlertCircle, Search, CheckCircle } from "lucide-react";
import { getIntegrations, updateIntegration, getOrgChannels } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { IntegrationProvider, IntegrationStatus } from "@/lib/types";
import { WhatsAppConnectButton } from "@/components/ui/whatsapp-connect-button";

// ── Brand colour helpers ──────────────────────────────────────────────────────

interface ProviderMeta {
  id: IntegrationProvider;
  label: string;
  description: string;
  bg: string;           // Tailwind bg class
  text: string;         // Tailwind text class
  abbr: string;         // fallback monogram
  fields: { key: string; label: string; type?: string; placeholder?: string; help?: string }[];
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "shopify",
    label: "Shopify",
    description: "Sync orders, products & customers from your Shopify store.",
    bg: "bg-[#96bf48]/15",
    text: "text-[#96bf48]",
    abbr: "SH",
    fields: [
      { key: "shop_domain", label: "Shop domain", placeholder: "mystore.myshopify.com" },
      { key: "access_token", label: "Admin API access token", type: "password", placeholder: "shpat_…" },
    ],
  },
  {
    id: "woocommerce",
    label: "WooCommerce",
    description: "Connect your WooCommerce store to sync orders and contacts.",
    bg: "bg-[#7f54b3]/15",
    text: "text-[#7f54b3]",
    abbr: "WC",
    fields: [
      { key: "store_url", label: "Store URL", placeholder: "https://mystore.com" },
      { key: "consumer_key", label: "Consumer Key", type: "password" },
      { key: "consumer_secret", label: "Consumer Secret", type: "password" },
    ],
  },
  {
    id: "kylas",
    label: "Kylas CRM",
    description: "Push leads & contacts directly into Kylas CRM pipelines.",
    bg: "bg-blue-500/15",
    text: "text-blue-500",
    abbr: "KY",
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "kylas_…" },
      { key: "tenant_id", label: "Tenant ID", placeholder: "123456" },
    ],
  },
  {
    id: "openai",
    label: "ChatGPT / OpenAI",
    description: "Power AI replies, lead scoring, and smart message drafting.",
    bg: "bg-emerald-500/15",
    text: "text-emerald-500",
    abbr: "AI",
    fields: [
      { key: "api_key", label: "API key", type: "password", placeholder: "sk-…" },
      { key: "model", label: "Model", placeholder: "gpt-4o-mini" },
    ],
  },
  {
    id: "amazon_ses",
    label: "Amazon SES",
    description: "Send transactional and bulk email via Amazon Simple Email Service.",
    bg: "bg-orange-500/15",
    text: "text-orange-500",
    abbr: "SES",
    fields: [
      { key: "access_key_id", label: "Access Key ID", placeholder: "AKIA…" },
      { key: "secret_access_key", label: "Secret Access Key", type: "password" },
      { key: "region", label: "Region", placeholder: "us-east-1" },
      { key: "from_email", label: "Verified sender email", placeholder: "noreply@company.com" },
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Capture Facebook Lead Ads and sync audiences automatically.",
    bg: "bg-[#1877F2]/15",
    text: "text-[#1877F2]",
    abbr: "FB",
    fields: [
      { key: "page_access_token", label: "Page access token", type: "password", placeholder: "EAAb…" },
      { key: "page_id", label: "Page ID", placeholder: "123456789" },
    ],
  },
  {
    id: "meta_ads",
    label: "Meta Ads Manager",
    description: "Sync ad audiences and conversion events to Meta for retargeting.",
    bg: "bg-blue-600/15",
    text: "text-blue-600",
    abbr: "MA",
    fields: [
      { key: "ad_account_id", label: "Ad Account ID", placeholder: "act_123456" },
      { key: "pixel_id", label: "Pixel ID", placeholder: "987654321" },
      { key: "access_token", label: "Access token", type: "password", placeholder: "EAAb…" },
    ],
  },
  {
    id: "google_meet",
    label: "Google Meet",
    description: "Auto-create Meet links for booked appointments.",
    bg: "bg-green-500/15",
    text: "text-green-600",
    abbr: "GM",
    fields: [
      { key: "oauth_refresh_token", label: "OAuth refresh token", type: "password", help: "Obtained via Google OAuth 2.0 flow" },
      { key: "calendar_id", label: "Calendar ID", placeholder: "primary" },
    ],
  },
  {
    id: "google_sheets",
    label: "Google Sheets",
    description: "Export leads and contacts to a master spreadsheet automatically.",
    bg: "bg-green-400/15",
    text: "text-green-500",
    abbr: "GS",
    fields: [
      { key: "sheet_url", label: "Sheet URL", placeholder: "https://docs.google.com/spreadsheets/…" },
    ],
  },
  {
    id: "zoho_crm",
    label: "Zoho CRM",
    description: "Bi-directional sync of leads and deals with Zoho CRM.",
    bg: "bg-red-500/15",
    text: "text-red-500",
    abbr: "ZC",
    fields: [
      { key: "client_id", label: "Client ID" },
      { key: "client_secret", label: "Client Secret", type: "password" },
      { key: "refresh_token", label: "Refresh token", type: "password" },
    ],
  },
  {
    id: "salesforce",
    label: "Salesforce",
    description: "Push qualified leads into Salesforce and sync opportunity stages.",
    bg: "bg-[#00a1e0]/15",
    text: "text-[#00a1e0]",
    abbr: "SF",
    fields: [
      { key: "instance_url", label: "Instance URL", placeholder: "https://yourorg.salesforce.com" },
      { key: "access_token", label: "Access token", type: "password" },
    ],
  },
  {
    id: "freshdesk",
    label: "Freshdesk",
    description: "Convert WhatsApp tickets into Freshdesk support tickets automatically.",
    bg: "bg-teal-500/15",
    text: "text-teal-500",
    abbr: "FD",
    fields: [
      { key: "domain", label: "Domain", placeholder: "yourcompany.freshdesk.com" },
      { key: "api_key", label: "API key", type: "password" },
    ],
  },
  {
    id: "hubspot",
    label: "HubSpot",
    description: "Sync contacts and deals with HubSpot CRM and marketing hub.",
    bg: "bg-orange-600/15",
    text: "text-orange-600",
    abbr: "HS",
    fields: [
      { key: "private_app_token", label: "Private App Token", type: "password", placeholder: "pat-…" },
      { key: "portal_id", label: "Portal ID", placeholder: "123456" },
    ],
  },
  {
    id: "zoho_billing",
    label: "Zoho Billing",
    description: "Send payment reminders and invoices via WhatsApp or SMS.",
    bg: "bg-red-400/15",
    text: "text-red-400",
    abbr: "ZB",
    fields: [
      { key: "organization_id", label: "Organization ID" },
      { key: "auth_token", label: "Auth token", type: "password" },
    ],
  },
  {
    id: "calendly",
    label: "Calendly",
    description: "Trigger WhatsApp confirmations when appointments are booked.",
    bg: "bg-indigo-500/15",
    text: "text-indigo-500",
    abbr: "CA",
    fields: [
      { key: "personal_access_token", label: "Personal Access Token", type: "password", help: "From Calendly Account → Integrations → API & Webhooks" },
    ],
  },
  {
    id: "callhippo",
    label: "CallHippo",
    description: "Log calls and trigger follow-ups via WhatsApp after a call ends.",
    bg: "bg-pink-500/15",
    text: "text-pink-500",
    abbr: "CH",
    fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "team_id", label: "Team ID", placeholder: "123456" },
    ],
  },
  {
    id: "webhook",
    label: "Webhooks & API",
    description: "Send events to any service - n8n, Make, Zapier, or your own endpoint.",
    bg: "bg-slate-500/15",
    text: "text-slate-400",
    abbr: "WH",
    fields: [
      { key: "url", label: "Webhook URL", placeholder: "https://hooks.example.com/…" },
      { key: "secret", label: "Signing secret (optional)", type: "password" },
    ],
  },
];

const STATUS_BADGE: Record<IntegrationStatus, { label: string; cls: string }> = {
  connected:    { label: "Connected",    cls: "bg-success/15 text-success border-success/30" },
  disconnected: { label: "Not connected", cls: "bg-secondary text-muted-foreground border-border" },
  error:        { label: "Error",        cls: "bg-destructive/15 text-destructive border-destructive/30" },
  testing:      { label: "Testing…",    cls: "bg-warning/15 text-warning border-warning/30" },
};

// ── Connect modal ─────────────────────────────────────────────────────────────

function ConnectModal({ provider, onClose }: { provider: ProviderMeta; onClose: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const config: Record<string, string> = {};
    provider.fields.forEach((f) => { config[f.key] = String(fd.get(f.key) ?? ""); });
    await updateIntegration("new", { provider: provider.id, status: "connected", config, last_synced_at: new Date().toISOString() });
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold", provider.bg, provider.text)}>
            {provider.abbr}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Connect {provider.label}</h2>
            <p className="text-xs text-muted-foreground">{provider.description}</p>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <Check className="h-6 w-6 text-success" />
            </div>
            <p className="font-semibold text-foreground">Connected successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {provider.fields.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
                <input
                  name={f.key}
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {f.help && <p className="mt-1 text-[11px] text-muted-foreground">{f.help}</p>}
              </div>
            ))}

            <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Check className="h-3.5 w-3.5 mt-0.5 text-success shrink-0" />
              We'll run a test connection automatically. You can disconnect anytime.
            </div>

            <div className="flex items-center justify-between pt-1">
              <a href="#docs" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Setup docs <ExternalLink className="h-3 w-3" />
              </a>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  <Plug className="h-3.5 w-3.5" />
                  {saving ? "Connecting…" : "Save & test"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Integration card ──────────────────────────────────────────────────────────

function IntegrationCard({
  provider,
  status,
  onConnect,
  onDisconnect,
}: {
  provider: ProviderMeta;
  status: IntegrationStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const badge = STATUS_BADGE[status];
  return (
    <div className={cn(
      "group flex flex-col rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md",
      status === "connected" ? "border-success/30" : "border-border",
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold shrink-0", provider.bg, provider.text)}>
          {provider.abbr}
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", badge.cls)}>
          {status === "connected" && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
          {badge.label}
        </span>
      </div>

      {/* Name + description */}
      <p className="mt-3 font-semibold text-foreground">{provider.label}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed flex-1">{provider.description}</p>

      {/* Error notice */}
      {status === "error" && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Auth expired - please reconnect.
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {status === "connected" ? (
          <>
            <button
              onClick={onConnect}
              className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              Edit
            </button>
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/50 hover:text-destructive"
            >
              <ZapOff className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plug className="h-3.5 w-3.5" />
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ── WhatsApp primary channel card ─────────────────────────────────────────────

function WhatsAppCard({ organizationId }: { organizationId: string }) {
  const [connected, setConnected] = React.useState(false);
  const [phone, setPhone] = React.useState<string | null>(null);

  // Check existing connection on mount
  React.useEffect(() => {
    getOrgChannels()
      .then((channels) => {
        const wa = channels.find((c) => c.provider === "whatsapp" && c.status === "active");
        if (wa) { setConnected(true); setPhone(wa.phone_number ?? null); }
      })
      .catch(() => null);
  }, [organizationId]);

  return (
    <div className="col-span-full rounded-2xl border border-[#25D366]/30 bg-gradient-to-br from-[#25D366]/5 to-card p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Left: icon + info */}
        <div className="flex items-start gap-4 flex-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366] text-lg font-bold">
            WA
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">WhatsApp Business</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Primary Channel</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Connect your WhatsApp Business number via Meta's Embedded Signup. Takes 3 minutes - no technical knowledge needed.
            </p>
            {connected && phone && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                {phone}
              </div>
            )}
          </div>
        </div>

        {/* Right: connect button */}
        <div className="w-full sm:w-48 shrink-0">
          <WhatsAppConnectButton
            organizationId={organizationId}
            connectedPhone={phone}
            onSuccess={(p) => { setConnected(true); setPhone(p); }}
          />
        </div>
      </div>

      {/* Steps guide — shown only when not connected */}
      {!connected && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4">
          {[
            { n: "1", text: "Click Connect WhatsApp" },
            { n: "2", text: "Log in with Facebook & select your business" },
            { n: "3", text: "Verify your phone number with an OTP from Meta" },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25D366]/20 text-[10px] font-bold text-[#25D366]">{step.n}</span>
              <p className="text-xs text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConnectPage() {
  const [integrations, setIntegrations] = React.useState<Record<string, IntegrationStatus>>({});
  const [editing, setEditing] = React.useState<ProviderMeta | null>(null);
  const [search, setSearch] = React.useState("");
  // In production this comes from session/auth context
  const organizationId = typeof window !== "undefined"
    ? (localStorage.getItem("organizationId") ?? "demo-org")
    : "demo-org";

  React.useEffect(() => {
    getIntegrations().then((list) => {
      const map: Record<string, IntegrationStatus> = {};
      list.forEach((i) => { map[i.provider] = i.status; });
      setIntegrations(map);
    });
  }, []);

  function handleDisconnect(id: IntegrationProvider) {
    setIntegrations((prev) => ({ ...prev, [id]: "disconnected" }));
    updateIntegration("noop", { provider: id, status: "disconnected" });
  }

  function handleConnected(id: IntegrationProvider) {
    setIntegrations((prev) => ({ ...prev, [id]: "connected" }));
  }

  const connected = PROVIDERS.filter((p) => integrations[p.id] === "connected").length;

  const filtered = PROVIDERS.filter(
    (p) => !search || p.label.toLowerCase().includes(search.toLowerCase()),
  );

  // Hide search if query matches "whatsapp" — it's rendered above the grid
  const showWhatsAppInGrid = search && "whatsapp".includes(search.toLowerCase());

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8 flex flex-col min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Connect Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{connected} of {PROVIDERS.length} integrations connected</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="w-56 rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Progress banner */}
      <div className="mx-6 mt-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">Setup progress</p>
          <span className="text-xs text-muted-foreground">{connected}/{PROVIDERS.length} connected</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
            style={{ width: `${Math.round((connected / PROVIDERS.length) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Connect at least 2 channels and 1 CRM to unlock all automations.</p>
      </div>

      {/* WhatsApp primary card — always pinned at top, hidden only if search doesn't match */}
      <div className="grid grid-cols-1 gap-4 px-6 pt-5 pb-0">
        {(!search || showWhatsAppInGrid) && (
          <WhatsAppCard organizationId={organizationId} />
        )}
      </div>

      {/* Other integrations grid */}
      <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center text-sm text-muted-foreground">
            No integrations match "{search}".
          </div>
        ) : (
          filtered.map((p) => (
            <IntegrationCard
              key={p.id}
              provider={p}
              status={integrations[p.id] ?? "disconnected"}
              onConnect={() => setEditing(p)}
              onDisconnect={() => handleDisconnect(p.id)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {editing && (
        <ConnectModal
          provider={editing}
          onClose={() => {
            handleConnected(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
