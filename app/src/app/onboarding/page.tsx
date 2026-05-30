"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Building2, Check, Plug, Sparkles, Target, MessageSquare, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { INDUSTRIES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { clearOrgCache } from "@/lib/api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STEPS = [
  { id: "business",    label: "Business profile", icon: Building2 },
  { id: "channels",   label: "Connect channels",  icon: Plug },
  { id: "automations",label: "Pick automations",  icon: Sparkles },
  { id: "first-source",label: "First lead source",icon: Target },
  { id: "test",       label: "Test & launch",     icon: Rocket },
] as const;

const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp Business", desc: "Send & receive messages on WhatsApp" },
  { id: "email",    label: "Gmail / SMTP",       desc: "Send transactional and broadcast email" },
  { id: "telegram", label: "Telegram Bot",        desc: "Two-way messaging on Telegram" },
  { id: "calendar", label: "Google Calendar",    desc: "Sync appointments to your calendar" },
];

const AUTOMATIONS = [
  { id: "qualify",  label: "AI Lead Qualifier",       desc: "Score & route every new lead" },
  { id: "followup", label: "5-Touch Follow-Up",       desc: "Auto-nurture cold and warm leads" },
  { id: "reminders",label: "Appointment Reminders",   desc: "24h + 1h reminders to clients" },
  { id: "faq",      label: "FAQ Auto-Reply",          desc: "Answer common questions instantly" },
  { id: "retarget", label: "Inactive Re-engagement",  desc: "Win back leads that went quiet" },
];

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export default function OnboardingPage() {
  const router   = useRouter();
  const [step, setStep] = React.useState(0);

  // Step 0 fields
  const [bizName,   setBizName]   = React.useState("");
  const [industry,  setIndustry]  = React.useState<string>("Real Estate");
  const [timezone,  setTimezone]  = React.useState("Asia/Kolkata");

  // Steps 1-3 selections
  const [channels, setChannels] = React.useState<string[]>(["whatsapp", "email", "calendar"]);
  const [autos, setAutos]       = React.useState<string[]>(["qualify", "followup", "reminders"]);

  const [submitting, setSubmitting] = React.useState(false);

  async function finish() {
    if (!bizName.trim()) {
      setStep(0);
      toast.error("Please enter your business name first.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      // Demo mode — just navigate
      toast.success("You're live! Welcome to AutomateOS.");
      router.push("/overview");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Your session expired. Please log in again.");
      router.push("/login");
      return;
    }

    setSubmitting(true);
    try {
      const slug = slugify(bizName) || `org-${Date.now()}`;

      const res = await fetch(`/api/orgs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: bizName.trim(), slug, industry, timezone }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.error?.includes("already has")) {
          // Already has an org — just go to dashboard
          clearOrgCache();
          router.push("/overview");
          return;
        }
        if (res.status === 409 && data.error?.includes("slug")) {
          // Slug conflict — retry with timestamp suffix
          const retrySlug = `${slug}-${Date.now().toString(36)}`;
          const retry = await fetch(`/api/orgs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ name: bizName.trim(), slug: retrySlug, industry, timezone }),
          });
          const retryData = await retry.json();
          if (!retry.ok) throw new Error(retryData.error ?? "Failed to create organization");
          clearOrgCache();
          router.push("/overview");
          return;
        } else {
          throw new Error(data.error ?? "Failed to create organization");
        }
      }

      clearOrgCache();
      toast.success("Your workspace is live! Welcome to AutomateOS.");
      router.push("/overview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const canContinueStep0 = bizName.trim().length >= 2;

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <header className="border-b border-border/50 bg-background/50 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Link href="/overview" className="text-sm text-muted-foreground hover:text-foreground">
            Skip for now →
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-10">
        {/* Progress steps */}
        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done   = i < step;
            const active = i === step;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                    done   && "bg-success border-success text-success-foreground",
                    active && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                    !done && !active && "border-border bg-card text-muted-foreground",
                  )}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <p className={cn("text-xs hidden sm:block", active ? "font-medium" : "text-muted-foreground")}>{s.label}</p>
                </div>
                {i < STEPS.length - 1 && <div className={cn("h-px flex-1 mx-2", done ? "bg-success" : "bg-border")} />}
              </React.Fragment>
            );
          })}
        </div>

        <Card className="p-8 animate-fade-in">

          {/* ── Step 0: Business profile ── */}
          {step === 0 && (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Tell us about your business</h2>
              <p className="text-sm text-muted-foreground mt-1">This helps us pre-configure pipelines, templates & automations.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="biz">Business name *</Label>
                  <Input
                    id="biz"
                    placeholder="e.g. Acme Realty"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                  {bizName && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Workspace URL: <span className="font-mono text-primary">{slugify(bizName) || "..."}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="ind">Industry</Label>
                  <Select id="ind" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tz">Timezone</Label>
                  <Select id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="Asia/Singapore">Asia/Singapore</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* ── Step 1: Channels ── */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Connect your channels</h2>
              <p className="text-sm text-muted-foreground mt-1">Pick what you use today — add more later.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {CHANNELS.map((c) => {
                  const on = channels.includes(c.id);
                  return (
                    <button key={c.id}
                      onClick={() => setChannels((x) => on ? x.filter((y) => y !== c.id) : [...x, c.id])}
                      className={cn("rounded-xl border p-4 text-left transition-colors",
                        on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40")}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{c.label}</p>
                        <div className={cn("flex h-5 w-5 items-center justify-center rounded-md border",
                          on ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                          {on && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                We'll guide you through each connection in the Connect Center after onboarding. No tech skills required.
              </div>
            </>
          )}

          {/* ── Step 2: Automations ── */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Pick your automations</h2>
              <p className="text-sm text-muted-foreground mt-1">Turn on what you need — toggle anytime later.</p>
              <div className="mt-6 grid gap-3">
                {AUTOMATIONS.map((a) => {
                  const on = autos.includes(a.id);
                  return (
                    <button key={a.id}
                      onClick={() => setAutos((x) => on ? x.filter((y) => y !== a.id) : [...x, a.id])}
                      className={cn("rounded-xl border p-4 text-left transition-colors flex items-center justify-between",
                        on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40")}
                    >
                      <div>
                        <p className="font-medium">{a.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
                      </div>
                      <div className={cn("flex h-5 w-5 items-center justify-center rounded-md border",
                        on ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                        {on && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Step 3: Lead sources ── */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Where will leads come from?</h2>
              <p className="text-sm text-muted-foreground mt-1">Pick at least one to get started — add more later.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Website Form", "WhatsApp", "Facebook Ads", "Google Ads", "Referrals", "Walk-in"].map((s) => (
                  <Badge key={s} tone="default" className="text-sm justify-start py-2 px-3 cursor-pointer hover:bg-primary/10 hover:text-primary">
                    {s}
                  </Badge>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-dashed border-border p-4">
                <p className="text-sm font-medium">Webhook URL for incoming leads</p>
                <p className="mt-1 text-xs text-muted-foreground">Send leads from any source to this URL — we'll handle the rest.</p>
                <code className="mt-2 block break-all rounded bg-secondary px-3 py-2 text-xs">
                  {`${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.automateos.io"}/api/webhooks/leads/${slugify(bizName) || "your-workspace"}`}
                </code>
              </div>
            </>
          )}

          {/* ── Step 4: Launch ── */}
          {step === 4 && (
            <>
              <h2 className="text-xl font-semibold tracking-tight">You're ready to launch 🚀</h2>
              <p className="text-sm text-muted-foreground mt-1">Your workspace will be created when you click Launch.</p>
              <div className="mt-6 space-y-3">
                {[
                  `Business profile: ${bizName || "—"}`,
                  `Industry: ${industry}`,
                  `${channels.length} channel${channels.length === 1 ? "" : "s"} selected`,
                  `${autos.length} automation${autos.length === 1 ? "" : "s"} enabled`,
                  "14-day Growth trial activated — no card needed",
                ].map((line, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success">
                      <Check className="h-4 w-4" />
                    </span>
                    <p className="text-sm">{line}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Navigation ── */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !canContinueStep0}
              >
                Continue
              </Button>
            ) : (
              <Button
                rightIcon={<Rocket className="h-4 w-4" />}
                onClick={finish}
                disabled={submitting}
              >
                {submitting ? "Creating workspace…" : "Launch dashboard"}
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
