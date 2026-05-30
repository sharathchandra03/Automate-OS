"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { getAudit, getAutomations, getIntegrations } from "@/lib/api";
import { formatRelative } from "@/lib/utils";

export default function AdminPage() {
  const { data: audit = [] } = useQuery({ queryKey: ["audit"], queryFn: getAudit });
  const { data: integ = [] } = useQuery({ queryKey: ["integrations"], queryFn: getIntegrations });
  const { data: autos = [] } = useQuery({ queryKey: ["automations"], queryFn: getAutomations });

  const errors = integ.filter((i) => i.status === "error");
  const activeAutos = autos.filter((a) => a.status === "active").length;

  return (
    <>
      <PageHeader title="Admin & system status" description="Audit trail, integration health, and platform diagnostics." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Active automations" value={activeAutos} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Connected integrations" value={integ.filter((i) => i.status === "connected").length} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Integration errors" value={errors.length} icon={<AlertCircle className="h-4 w-4" />} tone={errors.length ? "primary" : "default"} />
        <StatCard label="Audit events (24h)" value={audit.length} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      {errors.length > 0 && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold">Action required</p>
                <p className="text-sm text-muted-foreground">{errors.length} integration{errors.length > 1 ? "s" : ""} need{errors.length === 1 ? "s" : ""} attention.</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {errors.map((e) => <li key={e.id}>• <b>{e.label}</b> - token expired or auth failed</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Audit trail</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-2 text-left font-medium">Actor</th>
                <th className="px-6 py-2 text-left font-medium">Action</th>
                <th className="px-6 py-2 text-left font-medium">Target</th>
                <th className="px-6 py-2 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audit.map((e) => (
                <tr key={e.id} className="hover:bg-secondary/30">
                  <td className="px-6 py-3 font-medium">{e.actor}</td>
                  <td className="px-6 py-3"><Badge tone="default">{e.action}</Badge></td>
                  <td className="px-6 py-3 text-muted-foreground"><code className="text-xs">{e.target}</code></td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{formatRelative(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
