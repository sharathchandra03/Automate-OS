"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { createCampaign, getCampaigns, updateCampaign } from "@/lib/api";
import { triggerAutomation } from "@/lib/n8n";
import { formatDate, formatNumber, formatRelative } from "@/lib/utils";
import type { Campaign } from "@/lib/types";

const STATUS_TONE: Record<Campaign["status"], "success" | "info" | "muted" | "warning" | "default"> = {
  running: "success", scheduled: "info", completed: "muted", paused: "warning", draft: "default",
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const { data: camps = [] } = useQuery({ queryKey: ["campaigns"], queryFn: getCampaigns });
  const [open, setOpen] = React.useState(false);

  const create = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Campaign created"); setOpen(false); },
  });

  const launch = useMutation({
    mutationFn: async (c: Campaign) => {
      const r = await triggerAutomation("campaign.launch", { campaign_id: c.id, channel: c.channel, audience_size: 250 });
      if (r.ok) await updateCampaign(c.id, { status: "running" });
      return r;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Campaign launched"); },
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      name: String(fd.get("name") ?? ""),
      channel: fd.get("channel") as Campaign["channel"],
      status: "draft",
    } as any);
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="WhatsApp, email, Telegram & SMS broadcasts. Schedule, send, measure."
        actions={<Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>New campaign</Button>}
      />

      {camps.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" />}
          title="Launch your first campaign"
          description="Build a target audience, pick a template, send across any channel."
          action={<Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>New campaign</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {camps.map((c) => {
            const rate = c.sent_count ? Math.round((c.reply_count / c.sent_count) * 100) : 0;
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold leading-tight">{c.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground capitalize">{c.channel} · {c.scheduled_at ? formatDate(c.scheduled_at, { dateStyle: "medium", timeStyle: "short" }) : "Not scheduled"}</p>
                    </div>
                    <Badge tone={STATUS_TONE[c.status]} dot>{c.status}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[
                      { l: "Sent", v: c.sent_count },
                      { l: "Delivered", v: c.delivered_count },
                      { l: "Replies", v: c.reply_count },
                      { l: "Reply %", v: `${rate}%` },
                    ].map((m) => (
                      <div key={m.l} className="rounded-lg bg-secondary/50 py-2">
                        <p className="text-xs text-muted-foreground">{m.l}</p>
                        <p className="font-semibold text-sm">{typeof m.v === "number" ? formatNumber(m.v) : m.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Created {formatRelative(c.created_at)}</p>
                    <div className="flex items-center gap-2">
                      {c.status === "running" ? (
                        <Button variant="outline" size="sm" leftIcon={<Pause className="h-3.5 w-3.5" />}
                          onClick={async () => { await updateCampaign(c.id, { status: "paused" }); qc.invalidateQueries({ queryKey: ["campaigns"] }); }}>
                          Pause
                        </Button>
                      ) : c.status === "draft" || c.status === "scheduled" || c.status === "paused" ? (
                        <Button size="sm" leftIcon={<Play className="h-3.5 w-3.5" />} loading={launch.isPending} onClick={() => launch.mutate(c)}>
                          Launch
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New campaign" size="md">
        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" name="name" placeholder="October Site Visit Outreach" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select id="channel" name="channel" defaultValue="whatsapp">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
                <option value="sms">SMS</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="audience">Audience</Label>
              <Select id="audience" name="audience" defaultValue="all">
                <option value="all">All leads</option>
                <option value="hot">Hot leads only</option>
                <option value="warm">Warm leads</option>
                <option value="inactive">Inactive 14d+</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" placeholder="Hi {{name}}, our new project just launched! Reply YES for an exclusive walkthrough." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create as draft</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
