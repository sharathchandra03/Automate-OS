"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bot, ChevronDown, ChevronRight, CreditCard, HelpCircle,
  Info, Link2, Megaphone, MessageCircle, Phone, QrCode,
  RefreshCw, Send, Star, Upload, Users, Video, Wallet,
  Zap, CheckCircle, CalendarDays, BarChart3, Shield,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { getAnalytics, getWallet, getConversations, getContacts, getDashboardSummary, type DashboardSummary } from "@/lib/api";

// ── Mock analytics data per (channel, days) ────────────────────────────────

type ChannelKey = "WhatsApp" | "Email" | "SMS";
type DayKey = "7" | "14" | "30";

const MESSAGING_MOCK: Record<ChannelKey, Record<DayKey, { delivery: number; open: number; ctr: number; response: number }>> = {
  WhatsApp: {
    "7":  { delivery: 97.4, open: 82.1, ctr: 14.3, response: 31.8 },
    "14": { delivery: 96.9, open: 80.5, ctr: 13.7, response: 29.4 },
    "30": { delivery: 98.1, open: 85.3, ctr: 16.2, response: 34.1 },
  },
  Email: {
    "7":  { delivery: 94.2, open: 22.7, ctr: 3.8, response: 5.1 },
    "14": { delivery: 93.8, open: 21.4, ctr: 3.5, response: 4.8 },
    "30": { delivery: 95.0, open: 24.9, ctr: 4.2, response: 6.0 },
  },
  SMS: {
    "7":  { delivery: 99.1, open: 91.5, ctr: 7.2, response: 12.4 },
    "14": { delivery: 98.7, open: 90.2, ctr: 6.9, response: 11.8 },
    "30": { delivery: 99.3, open: 93.1, ctr: 8.4, response: 14.2 },
  },
};

const CHATBOT_MOCK: Record<DayKey, { csat: number; conversations: number; completion: number; unique: number }> = {
  "7":  { csat: 4.2, conversations: 156, completion: 93.3, unique: 124 },
  "14": { csat: 4.0, conversations: 298, completion: 91.7, unique: 241 },
  "30": { csat: 4.4, conversations: 682, completion: 94.8, unique: 547 },
};

// ── MetricCard ─────────────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, suffix = "", trend,
}: {
  icon: React.ReactNode; label: string; value: string | number; suffix?: string; trend?: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${trend >= 0 ? "text-success" : "text-destructive"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {trend === undefined && <Info className="h-3.5 w-3.5 text-muted-foreground/40" />}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {value}<span className="text-base font-normal text-muted-foreground">{suffix}</span>
      </p>
    </div>
  );
}

// ── Channel card ──────────────────────────────────────────────────────────────

const CHANNELS = [
  { name: "Instagram", desc: "Send & receive messages from the newer generation via Instagram.", gradient: "from-purple-600 via-pink-500 to-orange-400", icon: "📸", href: "/settings/channels" },
  { name: "WhatsApp",  desc: "Engage with customers, accelerate sales & drive better support.", gradient: "from-green-500 to-emerald-600", icon: "💬", href: "/settings/channels" },
  { name: "Email",     desc: "Send & engage with customers via the most used medium.",         gradient: "from-blue-500 to-indigo-600", icon: "✉️", href: "/settings/channels" },
  { name: "SMS",       desc: "Send offers, messages to your customers via SMS across India.",  gradient: "from-slate-600 to-slate-800", icon: "📱", href: "/settings/channels" },
];

function ChannelCard({ ch }: { ch: typeof CHANNELS[0] }) {
  return (
    <Link href={ch.href} className={`relative flex flex-col rounded-xl bg-gradient-to-br ${ch.gradient} p-4 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}>
      <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
        <CheckCircle className="h-2.5 w-2.5" /> Added
      </span>
      <p className="text-sm font-bold text-white mb-1">{ch.name}</p>
      <p className="text-[10px] text-white/80 leading-relaxed mb-3">{ch.desc}</p>
      <div className="mt-auto flex justify-center text-4xl opacity-80">{ch.icon}</div>
    </Link>
  );
}

// ── Setup steps ───────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Setup a channel",      href: "/settings/channels" },
  { n: 2, label: "Build an audience",    href: "/contacts" },
  { n: 3, label: "Create content",       href: "/templates" },
  { n: 4, label: "Broadcast campaigns",  href: "/campaigns" },
];

function SetupStep({ step, open, toggle }: { step: typeof STEPS[0]; open: boolean; toggle: () => void }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground hover:bg-secondary/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{step.n}</span>
          {step.label}
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className={`bg-secondary/20 ${step.n === 1 ? "px-5 pb-5 pt-3" : "px-5 pb-4"}`}>
          {step.n === 1 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CHANNELS.map((ch) => <ChannelCard key={ch.name} ch={ch} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href={step.href} className="text-primary hover:underline">Get started →</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Quick shortcut tile ───────────────────────────────────────────────────────

function ShortcutTile({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors group">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
    </Link>
  );
}

// ── Date selector ─────────────────────────────────────────────────────────────

function DaySelect({ value, onChange }: { value: DayKey; onChange: (v: DayKey) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DayKey)}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
    >
      <option value="7">7 days</option>
      <option value="14">14 days</option>
      <option value="30">30 days</option>
    </select>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({ queryKey: ["analytics"], queryFn: getAnalytics });
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet });
  const { data: conversations } = useQuery({ queryKey: ["conversations"], queryFn: () => getConversations() });
  const { data: contacts } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });

  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => { getDashboardSummary().then(setSummary).catch(() => null); }, []);

  const [openStep, setOpenStep] = useState<number | null>(1);
  const [chatbotDays, setChatbotDays] = useState<DayKey>("7");
  const [msgChannel, setMsgChannel] = useState<ChannelKey>("WhatsApp");
  const [msgDays, setMsgDays] = useState<DayKey>("7");

  const chatbotStats = CHATBOT_MOCK[chatbotDays];
  const msgStats = MESSAGING_MOCK[msgChannel][msgDays];

  // Calculate live stats from real data when available
  const liveConversations = conversations?.length ?? chatbotStats.conversations;
  const liveUniqueUsers = contacts?.length ?? chatbotStats.unique;
  const credits = wallet?.broadcast_credits ?? 10;
  const conversationCredits = wallet?.conversation_credits ?? 0;

  const today = useMemo(() => new Date(), []);
  const periodStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - parseInt(msgDays));
    return d;
  }, [today, msgDays]);

  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8 bg-background min-h-screen">
      <div className="flex h-full">

        {/* ── LEFT: Main content ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-5">

          {/* Hero banner */}
          <div className="flex items-start justify-between rounded-2xl border border-border bg-card p-6">
            <div>
              <h1 className="text-lg font-bold text-foreground">Get started with your first AI Assistant</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Create and deploy an AI-powered assistant on your WhatsApp Business Account so customers get automatic, instant replies.
              </p>
            </div>
            <div className="flex gap-2 ml-6 shrink-0">
              <Link href="/workflow-builder">
                <button className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <Bot className="h-4 w-4" /> Create Assistant
                </button>
              </Link>
              <Link href="/knowledge">
                <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" /> Help guide
                </button>
              </Link>
            </div>
          </div>

          {/* Real-time summary stats */}
          {summary === null ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={<Users className="h-4 w-4" />} label="Total Leads" value={summary.total_leads} trend={summary.new_leads_7d > 0 ? summary.new_leads_7d : undefined} />
              <MetricCard icon={<MessageCircle className="h-4 w-4" />} label="Open Conversations" value={summary.open_conversations} />
              <MetricCard icon={<Send className="h-4 w-4" />} label="Messages Sent (7d)" value={summary.messages_sent_7d} />
              <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Conversion Rate" value={summary.conversion_rate} suffix="%" />
            </div>
          )}

          {/* Setup steps */}
          <div className="space-y-2">
            {STEPS.map((step) => (
              <SetupStep
                key={step.n}
                step={step}
                open={openStep === step.n}
                toggle={() => setOpenStep((p) => (p === step.n ? null : step.n))}
              />
            ))}
          </div>

          {/* Chatbot Analytics */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Chatbot Analytics</h2>
              </div>
              <div className="flex items-center gap-2">
                <DaySelect value={chatbotDays} onChange={setChatbotDays} />
                <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  <span>{fmt(periodStart)}</span>
                </div>
                <span className="text-xs text-muted-foreground">-</span>
                <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  <span>{fmt(today)}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-0 sm:grid-cols-4 divide-x divide-y divide-border">
              <MetricCard
                icon={<Star className="h-4 w-4" />}
                label="CSAT Score"
                value={chatbotStats.csat.toFixed(1)}
                suffix="/5"
                trend={chatbotDays === "7" ? undefined : 0.3}
              />
              <MetricCard
                icon={<MessageCircle className="h-4 w-4" />}
                label="Total Conversations"
                value={liveConversations.toLocaleString()}
                trend={chatbotDays === "30" ? 12.4 : undefined}
              />
              <MetricCard
                icon={<CheckCircle className="h-4 w-4" />}
                label="Completion Rate"
                value={chatbotStats.completion.toFixed(1)}
                suffix="%"
                trend={chatbotDays === "14" ? -1.6 : undefined}
              />
              <MetricCard
                icon={<Users className="h-4 w-4" />}
                label="Unique Users"
                value={liveUniqueUsers.toLocaleString()}
                trend={chatbotDays === "30" ? 8.7 : undefined}
              />
            </div>
          </div>

          {/* Messaging Analytics */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Messaging Analytics</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Channel selector */}
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  {(["WhatsApp", "Email", "SMS"] as ChannelKey[]).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setMsgChannel(ch)}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        msgChannel === ch
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                <DaySelect value={msgDays} onChange={setMsgDays} />
                <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />{fmt(periodStart)}
                </div>
                <span className="text-xs text-muted-foreground">-</span>
                <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />{fmt(today)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-0 sm:grid-cols-4 divide-x divide-y divide-border">
              <MetricCard icon={<Send className="h-4 w-4" />}     label="Delivery Rate"       value={msgStats.delivery.toFixed(1)} suffix="%" trend={1.2} />
              <MetricCard icon={<Zap className="h-4 w-4" />}      label="Open Rate"           value={msgStats.open.toFixed(1)}    suffix="%" trend={msgChannel === "WhatsApp" ? 2.4 : -0.8} />
              <MetricCard icon={<Link2 className="h-4 w-4" />}    label="Click-through Rate"  value={msgStats.ctr.toFixed(1)}     suffix="%" trend={msgChannel === "Email" ? -0.3 : 0.7} />
              <MetricCard icon={<RefreshCw className="h-4 w-4" />} label="Response Rate"      value={msgStats.response.toFixed(1)} suffix="%" trend={-1.1} />
            </div>
          </div>

        </div>

        {/* ── RIGHT: Sidebar panel ─────────────────────────────────────────── */}
        <div className="w-[268px] shrink-0 border-l border-border bg-card overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Quick Shortcuts */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick Shortcuts</h3>
              <div className="space-y-1">
                <ShortcutTile icon={<Wallet className="h-3.5 w-3.5" />}    label="Add Wallet Balance"  href="/wallet" />
                <ShortcutTile icon={<Upload className="h-3.5 w-3.5" />}    label="Upload Contacts"     href="/contacts" />
                <ShortcutTile icon={<Megaphone className="h-3.5 w-3.5" />} label="Run Campaign"        href="/campaigns" />
                <ShortcutTile icon={<Video className="h-3.5 w-3.5" />}     label="Help Videos"         href="/knowledge" />
                <ShortcutTile icon={<HelpCircle className="h-3.5 w-3.5" />}label="Help Guides"         href="/knowledge" />
                <ShortcutTile icon={<QrCode className="h-3.5 w-3.5" />}    label="WhatsApp QR Code"    href="/settings/channels" />
                <ShortcutTile icon={<Link2 className="h-3.5 w-3.5" />}     label="Track DR Link"       href="/analytics" />
              </div>
            </div>

            {/* Credits */}
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Credits</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Broadcast</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-foreground">{credits.toLocaleString()}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">remaining</p>
                </div>
                <Link href="/wallet">
                  <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
                    Buy Credits
                  </button>
                </Link>
              </div>
            </div>

            {/* Wallet */}
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Wallet</span>
                </div>
                <Link href="/wallet">
                  <button className="text-[11px] text-primary hover:underline">View history</button>
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  {analyticsLoading ? (
                    <div className="h-7 w-28 rounded bg-muted animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold text-foreground">{conversationCredits.toLocaleString()} credits</span>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">conversation credits</p>
                </div>
                <Link href="/wallet">
                  <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                    Add Balance
                  </button>
                </Link>
              </div>
            </div>

            {/* Lead Summary */}
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Leads</span>
                </div>
                <Link href="/leads">
                  <button className="text-[11px] text-primary hover:underline">View all</button>
                </Link>
              </div>
              {analyticsLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-6 w-16 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
              ) : (
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-bold text-foreground">{analytics?.leads_total ?? 0}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">total leads</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-success">+{analytics?.leads_new_7d ?? 0}</span>
                    <p className="text-[11px] text-muted-foreground">last 7 days</p>
                  </div>
                </div>
              )}
            </div>

            {/* WA API Quality */}
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">WA API Quality</span>
                </div>
                <span className="rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-xs font-bold text-success">High</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-4/5 rounded-full bg-success" />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">Template quality is in good standing</p>
            </div>

            {/* Daily WABA Limit */}
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Daily WABA Limit</span>
                </div>
                <span className="text-sm font-bold text-foreground">2K</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-1/3 rounded-full bg-primary" />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">~667 messages sent today</p>
            </div>

            {/* Phone number */}
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Connected Number</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-foreground">+91 98765 43210</span>
                <Link href="/settings/channels">
                  <button className="text-[11px] text-primary hover:underline">Manage</button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
