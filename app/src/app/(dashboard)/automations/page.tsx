"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Pause, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getAutomations, updateAutomation } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { Automation } from "@/lib/types";

const STATUS_TONE: Record<Automation["status"], "success" | "warning" | "destructive"> = {
  active: "success", paused: "warning", error: "destructive",
};

export default function AutomationsPage() {
  const qc = useQueryClient();
  const { data: autos = [] } = useQuery({ queryKey: ["automations"], queryFn: getAutomations });

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Automation["status"] }) => updateAutomation(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  return (
    <>
      <PageHeader
        title="Automations"
        description="n8n workflows powering your business. Toggle, monitor, and inspect."
        actions={<Button leftIcon={<Bot className="h-4 w-4" />}>Browse marketplace</Button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {autos.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Zap className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">{a.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Trigger: <code>{a.trigger}</code>
                    </p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-secondary/50 py-2">
                  <p className="text-xs text-muted-foreground">Runs today</p>
                  <p className="font-semibold">{a.runs_today}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 py-2">
                  <p className="text-xs text-muted-foreground">Success</p>
                  <p className="font-semibold">{a.success_rate}%</p>
                </div>
                <div className="rounded-lg bg-secondary/50 py-2">
                  <p className="text-xs text-muted-foreground">Last run</p>
                  <p className="font-semibold text-xs">{a.last_run_at ? formatRelative(a.last_run_at) : "-"}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {a.status === "active" ? (
                  <Button size="sm" variant="outline" leftIcon={<Pause className="h-3.5 w-3.5" />}
                    onClick={() => { toggle.mutate({ id: a.id, status: "paused" }); toast.success("Paused"); }}>
                    Pause
                  </Button>
                ) : (
                  <Button size="sm" leftIcon={<Play className="h-3.5 w-3.5" />}
                    onClick={() => { toggle.mutate({ id: a.id, status: "active" }); toast.success("Active"); }}>
                    Resume
                  </Button>
                )}
                <Button size="sm" variant="ghost">View logs</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
