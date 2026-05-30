"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PLAN_LIST, fmtLimit, getPlan, type PlanId } from "@/lib/plans";
import { totalsFor, pctOf, seedDemoMetering } from "@/lib/billing/meter";
import { summarizeUsage, seedDemoUsage } from "@/lib/ai/usage";
import { CheckCircle2, Sparkles, Zap, Shield, CreditCard } from "lucide-react";
import { toast } from "sonner";

const DEMO_TENANT = "org_demo";

export default function BillingPage() {
  // Seed demo numbers once
  useMemo(() => { seedDemoMetering(DEMO_TENANT); seedDemoUsage(DEMO_TENANT); }, []);
  const [currentPlan, setCurrentPlan] = useState<PlanId>("pro");
  const [billing, setBilling] = useState<"month" | "year">("month");

  const plan = getPlan(currentPlan);
  const totals = totalsFor(DEMO_TENANT, 30);
  const aiSummary = summarizeUsage(DEMO_TENANT, 30);

  const usageRows = [
    { key: "Contacts",   used: 4_280,                          limit: plan.limits.contacts,            unit: "" },
    { key: "Automations",used: totals.automations_run,         limit: plan.limits.automationsPerMonth, unit: "/mo" },
    { key: "AI tokens",  used: aiSummary.totalTokens,          limit: plan.limits.aiTokensPerMonth,    unit: "/mo" },
    { key: "Messages",   used: totals.messages_sent,           limit: 999_999,                          unit: "/mo" },
    { key: "Storage",    used: Math.round(totals.storage_gb*10)/10, limit: plan.limits.storageGB,        unit: "GB" },
    { key: "Users",      used: 4,                              limit: plan.limits.users,                unit: "" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & plan"
        description="Pick a plan, monitor usage, and manage payment."
        actions={<Button variant="secondary" leftIcon={<CreditCard className="h-4 w-4" />}>Manage payment</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Current usage (last 30 days)</CardTitle>
          <CardDescription>You are on the <b>{plan.name}</b> plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            {usageRows.map((r) => {
              const pct = pctOf(r.used, r.limit);
              const tone = pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={r.key} className="rounded-xl border bg-card p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium">{r.key}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmtNumber(r.used)} / {fmtLimit(r.limit)}{r.unit}
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
                  </div>
                  {pct >= 80 && (
                    <p className="mt-2 text-xs text-amber-600">Approaching limit - consider upgrading.</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Plans</h2>
        <div className="inline-flex rounded-lg border p-1 text-sm">
          <button onClick={() => setBilling("month")} className={`px-3 py-1.5 rounded-md ${billing==="month" ? "bg-foreground text-background" : ""}`}>Monthly</button>
          <button onClick={() => setBilling("year")}  className={`px-3 py-1.5 rounded-md ${billing==="year"  ? "bg-foreground text-background" : ""}`}>Yearly · 2 months free</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {PLAN_LIST.map((p) => {
          const current = p.id === currentPlan;
          const price = billing === "year" ? p.pricePerYear : p.pricePerMonth;
          return (
            <Card key={p.id} className={p.highlight ? "border-primary shadow-md" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {p.id === "agency" && <Sparkles className="h-4 w-4 text-primary" />}
                    {p.id === "enterprise" && <Shield className="h-4 w-4 text-primary" />}
                    {p.id === "pro" && <Zap className="h-4 w-4 text-primary" />}
                    {p.name}
                  </CardTitle>
                  {p.badge && <Badge tone="primary">{p.badge}</Badge>}
                </div>
                <CardDescription>{p.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  {price === 0 ? (
                    <p className="text-2xl font-semibold">Custom</p>
                  ) : (
                    <p className="text-2xl font-semibold">
                      ${price}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">/{billing}</span>
                    </p>
                  )}
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {fmtLimit(p.limits.users)} users</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {fmtLimit(p.limits.contacts)} contacts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {fmtLimit(p.limits.automationsPerMonth)} automations / mo</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {fmtLimit(p.limits.aiTokensPerMonth)} AI tokens / mo</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {fmtLimit(p.limits.storageGB)} GB storage</li>
                  <li className="flex items-center gap-2 text-muted-foreground">{p.features.length} features included</li>
                </ul>
                <Button
                  className="w-full"
                  variant={current ? "secondary" : p.highlight ? "primary" : "outline"}
                  onClick={() => {
                    setCurrentPlan(p.id);
                    toast.success(`Switched to ${p.name} (demo)`);
                  }}
                >
                  {current ? "Current plan" : p.id === "enterprise" ? "Talk to sales" : "Switch to this plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI usage & cost (last 30 days)</CardTitle>
          <CardDescription>Tracked per feature, model, and tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Total tokens</p>
              <p className="text-2xl font-semibold">{fmtNumber(aiSummary.totalTokens)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Estimated cost</p>
              <p className="text-2xl font-semibold">${aiSummary.totalCostUsd.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Most used feature</p>
              <p className="text-2xl font-semibold">{topKey(aiSummary.byFeature)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function fmtNumber(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 ? 1 : 0) + "k";
  return Math.round(n).toString();
}

function topKey(map: Record<string, { tokens: number }>): string {
  let best = "-", bestN = -1;
  for (const [k, v] of Object.entries(map)) if (v.tokens > bestN) { best = k; bestN = v.tokens; }
  return best;
}
