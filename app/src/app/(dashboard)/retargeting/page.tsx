"use client";

import * as React from "react";
import { Target, Sparkles, Play } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { triggerAutomation } from "@/lib/n8n";
import { getLeads } from "@/lib/api";
import type { Lead } from "@/lib/types";

const CUTOFF_DAYS = 14;

export default function RetargetingPage() {
  const [running, setRunning] = React.useState<string | null>(null);

  const { data: allLeads = [] } = useQuery({ queryKey: ["leads"], queryFn: getLeads });

  const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const inactiveLeads: Lead[] = allLeads.filter(
    (l) => !l.last_contacted_at || l.last_contacted_at < cutoff
  );

  async function handleReengage(lead: Lead) {
    setRunning(lead.id);
    const r = await triggerAutomation("retargeting.run", { lead_id: lead.id, rule: "inactive_14" });
    setRunning(null);
    if (r.ok) toast.success(`Re-engagement triggered for ${lead.name}`);
    else toast.error(r.error ?? "Failed to trigger");
  }

  return (
    <>
      <PageHeader
        title="Retargeting"
        description="Detect inactive leads and bring them back automatically."
        actions={<Button leftIcon={<Sparkles className="h-4 w-4" />}>Build new audience rule</Button>}
      />

      {inactiveLeads.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          No inactive leads found. All leads were contacted in the last {CUTOFF_DAYS} days.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {inactiveLeads.map((lead) => (
            <Card key={lead.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> {lead.name}
                </CardTitle>
                <Badge tone={lead.temperature === "hot" ? "success" : lead.temperature === "cold" ? "destructive" : "info"}>
                  {lead.temperature}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold capitalize">{lead.status}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Last contacted</p>
                    <p className="text-sm font-semibold">
                      {lead.last_contacted_at
                        ? new Date(lead.last_contacted_at).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                  loading={running === lead.id}
                  onClick={() => handleReengage(lead)}
                >
                  Re-engage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
