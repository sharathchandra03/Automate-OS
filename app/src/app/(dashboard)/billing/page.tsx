"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PLAN_LIST, fmtLimit, type PlanId } from "@/lib/plans";
import { pctOf } from "@/lib/billing/meter";
import { CheckCircle2, Sparkles, Zap, Shield, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getWallet, getCreditTransactions } from "@/lib/api";
import type { Wallet, CreditTransaction } from "@/lib/types";

export default function BillingPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [plan, setPlan] = useState<string>("free");
  const [billing, setBilling] = useState<"month" | "year">("month");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    getWallet().then(setWallet).catch(() => {});
    getCreditTransactions().then(setTransactions).catch(() => {});
    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((d) => setPlan(d.plan ?? "free"))
      .catch(() => {});
  }, []);

  async function handleUpgrade(targetPlan: string) {
    setLoadingPlan(targetPlan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const { url, error } = await res.json();
      if (error) { toast.error(error); return; }
      if (url) window.location.href = url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleManage() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { url, error } = await res.json();
      if (error) { toast.error(error); return; }
      if (url) window.location.href = url;
    } catch {
      toast.error("Failed to open billing portal. Please try again.");
    } finally {
      setLoadingPortal(false);
    }
  }

  const convCredits = wallet?.conversation_credits ?? 0;
  const bcCredits   = wallet?.broadcast_credits ?? 0;

  const usageRows = [
    {
      key: "Conversation credits",
      used: convCredits,
      limit: 1000,
      unit: "",
      description: "Credits used for 1-on-1 messaging",
    },
    {
      key: "Broadcast credits",
      used: bcCredits,
      limit: 500,
      unit: "",
      description: "Credits used for campaign sends",
    },
  ];

  const recentTx = transactions.slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & plan"
        description="Pick a plan, monitor usage, and manage payment."
        actions={
          <Button
            variant="secondary"
            leftIcon={loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            onClick={handleManage}
            disabled={loadingPortal}
          >
            Manage payment
          </Button>
        }
      />

      {/* Credit Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Credit balance</CardTitle>
          <CardDescription>
            You are on the <b className="capitalize">{plan}</b> plan.
            {wallet && (
              <span className="ml-2 text-muted-foreground">
                Last updated {new Date(wallet.updated_at).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            {usageRows.map((r) => {
              const pct = pctOf(r.used, r.limit);
              const tone = pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={r.key} className="rounded-xl border bg-card p-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.key}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {fmtNumber(r.used)} credits
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div className={`h-2 rounded-full transition-all ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  {pct >= 80 && (
                    <p className="mt-2 text-xs text-amber-600">
                      Running low — consider upgrading your plan.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {recentTx.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Last 5 credit movements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div>
                    <p className="font-medium capitalize">{tx.transaction_type}</p>
                    <p className="text-xs text-muted-foreground">{tx.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-medium ${tx.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.credit_type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Plans</h2>
        <div className="inline-flex rounded-lg border p-1 text-sm">
          <button
            onClick={() => setBilling("month")}
            className={`px-3 py-1.5 rounded-md ${billing === "month" ? "bg-foreground text-background" : ""}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("year")}
            className={`px-3 py-1.5 rounded-md ${billing === "year" ? "bg-foreground text-background" : ""}`}
          >
            Yearly · 2 months free
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {PLAN_LIST.map((p) => {
          const current = p.id === (plan as PlanId);
          const price = billing === "year" ? p.pricePerYear : p.pricePerMonth;
          const isPaid = ["starter", "growth", "pro"].includes(p.id);
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
                  disabled={current || loadingPlan === p.id}
                  leftIcon={loadingPlan === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                  onClick={() => {
                    if (current) return;
                    if (p.id === "enterprise") {
                      toast.info("Contact sales@automateos.com for enterprise pricing.");
                      return;
                    }
                    if (isPaid) {
                      handleUpgrade(p.id);
                    } else {
                      toast.info("You are already on the free plan.");
                    }
                  }}
                >
                  {current ? "Current plan" : p.id === "enterprise" ? "Talk to sales" : `Upgrade to ${p.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function fmtNumber(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 ? 1 : 0) + "k";
  return Math.round(n).toString();
}
