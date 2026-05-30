"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { listInsights, seedDemoInsights, type Insight } from "@/lib/ai/insights";
import { demoHealth } from "@/lib/health-score";
import { ArrowRight, Heart, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";

const TENANT = "org_demo";

const TONE: Record<Insight["level"], "muted" | "info" | "success" | "warning" | "destructive"> = {
  info: "info", win: "success", risk: "warning", alert: "destructive",
};

export default function InsightsPage() {
  const [items, setItems] = useState<Insight[]>([]);
  useEffect(() => { seedDemoInsights(TENANT); setItems(listInsights(TENANT)); }, []);
  const health = useMemo(() => demoHealth(), []);

  const bandTone = ({
    excellent: "success",
    healthy: "info",
    at_risk: "warning",
    critical: "destructive",
  } as const)[health.band];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Insights & daily brief"
        description="Your AI-generated executive snapshot. Every morning. Ready for action."
        actions={<Button leftIcon={<Zap className="h-4 w-4" />}>Email me this brief</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Hot leads"      value={3}             delta={{ value: "+2 today",   positive: true  }} icon={<TrendingUp className="h-4 w-4" />} tone="primary" />
        <StatCard label="Aging tickets"  value={2}             delta={{ value: "2 over 24h", positive: false }} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Won this week"  value={7}             delta={{ value: "+18%",       positive: true  }} icon={<Zap className="h-4 w-4" />} tone="primary" />
        <StatCard label="Health score"   value={health.score}  delta={{ value: health.band.replace("_", " "), positive: health.score >= 60 }} icon={<Heart className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {items.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <Badge tone={TONE[i.level]}>{i.level}</Badge>
                <div className="flex-1">
                  <p className="font-medium">{i.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{i.body}</p>
                </div>
                {i.cta && (
                  <Link href={i.cta.href}>
                    <Button size="sm" variant="ghost" rightIcon={<ArrowRight className="h-3 w-3" />}>{i.cta.label}</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Account health</CardTitle>
              <Badge tone={bandTone}>{health.band.replace("_", " ")}</Badge>
            </div>
            <CardDescription>Why your score moved.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold">{health.score}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <ul className="space-y-2">
              {health.drivers.map((d) => (
                <li key={d.label} className="flex items-center justify-between text-sm">
                  <span>{d.label}</span>
                  <span className={d.positive ? "text-emerald-500" : "text-rose-500"}>{d.impact > 0 ? "+" : ""}{d.impact}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
