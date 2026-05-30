"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Repeat, Mail, MessageSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getFollowUps } from "@/lib/api";
import type { Channel } from "@/lib/types";

const channelIcon: Record<Channel, any> = {
  whatsapp: MessageSquare, email: Mail, telegram: Send, sms: MessageSquare,
};

function formatDelay(min: number) {
  if (min === 0) return "Immediately";
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / (60 * 24))}d`;
}

export default function FollowUpsPage() {
  const { data: flows = [] } = useQuery({ queryKey: ["followups"], queryFn: getFollowUps });

  return (
    <>
      <PageHeader
        title="Follow-up sequences"
        description="Drip messages on a schedule. Stop on reply. Convert more without lifting a finger."
        actions={<Button leftIcon={<Plus className="h-4 w-4" />}>New sequence</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {flows.map((f) => (
          <Card key={f.id}>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" /> {f.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Trigger: <code>{f.trigger}</code></p>
              </div>
              <Badge tone={f.status === "active" ? "success" : f.status === "paused" ? "warning" : "muted"} dot>{f.status}</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">Active in flow</p>
                  <p className="text-lg font-semibold">{f.active_count}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">Conversions</p>
                  <p className="text-lg font-semibold">{f.conversion_count}</p>
                </div>
              </div>

              <ol className="space-y-2 border-l-2 border-dashed border-border ml-2 pl-5">
                {f.steps.map((s, i) => {
                  const Icon = channelIcon[s.channel] ?? Send;
                  return (
                    <li key={s.id} className="relative">
                      <span className="absolute -left-[26px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                        {i + 1}
                      </span>
                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-medium capitalize"><Icon className="h-3.5 w-3.5" /> {s.channel}</span>
                          <span className="text-xs text-muted-foreground">{formatDelay(s.delay_minutes)}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{s.template}</p>
                        {s.stop_on_reply && <Badge tone="muted" className="mt-2">Stops on reply</Badge>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
