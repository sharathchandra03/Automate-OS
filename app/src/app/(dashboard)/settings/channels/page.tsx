"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageCircle, Send, Phone, Plus, Pencil, Trash2,
  X, CheckCircle2, AlertCircle, Eye, EyeOff, Plug,
  ExternalLink, Shield, Wifi, WifiOff,
} from "lucide-react";
import { getOrgChannels, upsertOrgChannel, deleteOrgChannel } from "@/lib/api";
import type { OrgChannel } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_META: Record<OrgChannel["provider"], { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  whatsapp:    { label: "WhatsApp",       icon: <MessageCircle className="h-5 w-5" />, color: "text-white", bg: "bg-[#25D366]" },
  instagram:   { label: "Instagram DM",   icon: <Phone className="h-5 w-5" />,        color: "text-white", bg: "bg-gradient-to-br from-purple-500 to-pink-500" },
  telegram:    { label: "Telegram",       icon: <Send className="h-5 w-5" />,          color: "text-white", bg: "bg-sky-500" },
  sms_twilio:  { label: "SMS (Twilio)",   icon: <Phone className="h-5 w-5" />,        color: "text-white", bg: "bg-red-500" },
};

function mask(val: string | null) {
  if (!val) return "-";
  return val.length > 8 ? val.slice(0, 4) + "••••" + val.slice(-4) : "••••••••";
}

// ── Channel form ─────────────────────────────────────────────────────────────

type FormData = {
  provider: OrgChannel["provider"];
  label: string;
  phone_number: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  bot_token: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_from_number: string;
};

function ChannelForm({ initial, onSave, onClose }: {
  initial?: OrgChannel | null;
  onSave: (data: FormData) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<OrgChannel["provider"]>(initial?.provider ?? "whatsapp");
  const [form, setForm] = useState<FormData>({
    provider: initial?.provider ?? "whatsapp",
    label: initial?.label ?? "",
    phone_number: initial?.phone_number ?? "",
    waba_id: initial?.waba_id ?? "",
    phone_number_id: initial?.phone_number_id ?? "",
    access_token: initial?.access_token ?? "",
    bot_token: initial?.bot_token ?? "",
    twilio_account_sid: initial?.twilio_account_sid ?? "",
    twilio_auth_token: initial?.twilio_auth_token ?? "",
    twilio_from_number: initial?.twilio_from_number ?? "",
  });
  const [showToken, setShowToken] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit() {
    if (!form.label.trim()) { setErr("Label is required."); return; }
    if (provider === "whatsapp" && (!form.phone_number_id.trim() || !form.access_token.trim())) {
      setErr("Phone Number ID and Access Token are required for WhatsApp."); return;
    }
    if (provider === "telegram" && !form.bot_token.trim()) {
      setErr("Bot Token is required for Telegram."); return;
    }
    if (provider === "sms_twilio" && (!form.twilio_account_sid.trim() || !form.twilio_auth_token.trim() || !form.twilio_from_number.trim())) {
      setErr("All Twilio fields are required."); return;
    }
    onSave({ ...form, provider });
  }

  const Field = ({ label, field, placeholder, type = "text" }: { label: string; field: keyof FormData; placeholder: string; type?: string }) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input value={form[field] as string} onChange={set(field)} placeholder={placeholder} type={type}
        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-6">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl mx-4">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{initial ? "Edit Channel" : "Connect Channel"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />{err}
          </div>
        )}

        <div className="space-y-4">
          {/* Provider selector */}
          {!initial && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Channel Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PROVIDER_META) as OrgChannel["provider"][]).map((p) => {
                  const m = PROVIDER_META[p];
                  return (
                    <button key={p} onClick={() => { setProvider(p); setForm((f) => ({ ...f, provider: p })); }}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${provider === p ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "border-border text-muted-foreground hover:border-border/80 hover:bg-muted"}`}>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${m.bg} shrink-0`}>
                        <span className="text-white scale-75">{m.icon}</span>
                      </span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Field label="Label (e.g. Company Name WhatsApp)" field="label" placeholder="Acme Realty WhatsApp" />

          {/* WhatsApp fields */}
          {provider === "whatsapp" && (
            <>
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 p-3 text-xs text-green-700 dark:text-green-300">
                <p className="font-semibold mb-1">Where to find these?</p>
                <p>Go to <span className="font-mono">Meta Business Manager → WhatsApp Manager → API Setup</span> to get your Phone Number ID, WABA ID, and Permanent Token.</p>
              </div>
              <Field label="Phone Number (E.164)" field="phone_number" placeholder="+919876543210" />
              <Field label="WABA ID (WhatsApp Business Account ID)" field="waba_id" placeholder="1234567890123456" />
              <Field label="Phone Number ID" field="phone_number_id" placeholder="9876543210987" />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Permanent Access Token *</label>
                <div className="relative">
                  <input value={form.access_token} onChange={set("access_token")} placeholder="EAAxxxxxx…"
                    type={showToken ? "text" : "password"}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <button onClick={() => setShowToken((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Webhook URL info */}
              <div className="rounded-xl bg-muted border border-border p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Webhook URL (set this in Meta)</p>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/webhooks/whatsapp
                </p>
                <p className="text-xs text-muted-foreground mt-1">Verify token: <span className="font-mono font-medium text-foreground">automateos_whatsapp</span></p>
              </div>
            </>
          )}

          {/* Telegram fields */}
          {provider === "telegram" && (
            <>
              <div className="rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/30 p-3 text-xs text-sky-700 dark:text-sky-300">
                <p className="font-semibold mb-1">Get your bot token</p>
                <p>Open Telegram → search <span className="font-mono">@BotFather</span> → /newbot → copy the token.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Bot Token *</label>
                <div className="relative">
                  <input value={form.bot_token} onChange={set("bot_token")} placeholder="1234567890:AAFxxxxx…"
                    type={showToken ? "text" : "password"}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <button onClick={() => setShowToken((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Twilio SMS fields */}
          {provider === "sms_twilio" && (
            <>
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-3 text-xs text-red-700 dark:text-red-300">
                <p className="font-semibold mb-1">Twilio credentials</p>
                <p>Find these at <span className="font-mono">console.twilio.com → Account Info</span></p>
              </div>
              <Field label="Account SID *" field="twilio_account_sid" placeholder="ACxxxxxxxxxxxxxxx" />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Auth Token *</label>
                <div className="relative">
                  <input value={form.twilio_auth_token} onChange={set("twilio_auth_token")} placeholder="your_auth_token"
                    type={showToken ? "text" : "password"}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <button onClick={() => setShowToken((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Field label="Twilio Phone Number (E.164) *" field="twilio_from_number" placeholder="+12025551234" />
            </>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            Your credentials are stored encrypted and never exposed to the browser.
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
          <button onClick={submit} className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-600">
            {initial ? "Save Changes" : "Connect Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Channel card ─────────────────────────────────────────────────────────────

function ChannelCard({ channel, onEdit, onDelete }: {
  channel: OrgChannel;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = PROVIDER_META[channel.provider];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg}`}>
            <span className={meta.color}>{meta.icon}</span>
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{channel.label}</p>
            <p className="text-xs text-muted-foreground">{meta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {channel.status === "active"
            ? <span className="flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400"><Wifi className="h-3 w-3" />Active</span>
            : channel.status === "error"
            ? <span className="flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3" />Error</span>
            : <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"><WifiOff className="h-3 w-3" />Disconnected</span>
          }
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {channel.phone_number && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Phone</span>
            <span className="text-xs font-medium text-foreground">{channel.phone_number}</span>
          </div>
        )}
        {channel.waba_id && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">WABA ID</span>
            <span className="text-xs font-mono text-foreground/80">{channel.waba_id}</span>
          </div>
        )}
        {channel.phone_number_id && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Phone Number ID</span>
            <span className="text-xs font-mono text-foreground/80">{channel.phone_number_id}</span>
          </div>
        )}
        {channel.access_token && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Access Token</span>
            <span className="text-xs font-mono text-muted-foreground">{mask(channel.access_token)}</span>
          </div>
        )}
        {channel.bot_token && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Bot Token</span>
            <span className="text-xs font-mono text-muted-foreground">{mask(channel.bot_token)}</span>
          </div>
        )}
        {channel.twilio_account_sid && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Twilio SID</span>
            <span className="text-xs font-mono text-muted-foreground">{mask(channel.twilio_account_sid)}</span>
          </div>
        )}
      </div>

      {/* Webhook URL for WhatsApp */}
      {channel.provider === "whatsapp" && (
        <div className="mb-3 rounded-lg bg-muted border border-border px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1">Webhook URL</p>
          <p className="text-xs font-mono text-foreground/80 break-all">
            {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/whatsapp
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={onDelete} className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800/30 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ChannelsPage() {
  const [channels, setChannels] = useState<OrgChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OrgChannel | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setChannels(await getOrgChannels());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(data: FormData) {
    await upsertOrgChannel({ ...(editing ? { id: editing.id } : {}), ...data });
    showToast(editing ? "Channel updated." : "Channel connected.");
    setShowForm(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this channel? Messages in the inbox will still be visible.")) return;
    await deleteOrgChannel(id);
    showToast("Channel removed.");
    load();
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Channel Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Connect your WhatsApp, Telegram, or SMS accounts. Each client uses their own credentials.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 shadow-sm">
          <Plus className="h-4 w-4" /> Connect Channel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center">
          <Plug className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">No channels connected yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Connect WhatsApp to start sending and receiving messages</p>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">
            <Plus className="h-4 w-4" /> Connect WhatsApp
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onEdit={() => { setEditing(ch); setShowForm(true); }}
              onDelete={() => handleDelete(ch.id)}
            />
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/20 p-5">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">How per-client channels work</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs text-blue-700 dark:text-blue-300">
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">1.</span>
            <p>You enter your own WhatsApp Business API credentials (from Meta Business Manager)</p>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">2.</span>
            <p>Credentials are stored encrypted in our database - only your account can access them</p>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">3.</span>
            <p>All messages sent from this platform use YOUR WhatsApp number, not ours</p>
          </div>
        </div>
      </div>

      {showForm && (
        <ChannelForm
          initial={editing}
          onSave={handleSave as any}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
