"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, Mail, MessageSquare, Phone, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Textarea, Select, Label } from "@/components/ui/Input";
import { getLead, updateLead } from "@/lib/api";
import { triggerAutomation } from "@/lib/n8n";
import { formatRelative, formatDate } from "@/lib/utils";
import type { Lead } from "@/lib/types";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", params.id],
    queryFn: () => getLead(params.id),
  });

  const update = useMutation({
    mutationFn: (patch: Partial<Lead>) => updateLead(params.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", params.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading lead…</p>;
  if (!lead) return (
    <div className="text-center py-20">
      <p>Lead not found.</p>
      <Link href="/leads"><Button variant="outline" className="mt-4">Back to leads</Button></Link>
    </div>
  );

  return (
    <>
      <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()} className="mb-3">
        Back
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar name={lead.name} size={56} />
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
                    <p className="text-sm text-muted-foreground">{lead.source} · created {formatRelative(lead.created_at)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={lead.temperature === "hot" ? "destructive" : lead.temperature === "warm" ? "warning" : "muted"} dot className="text-sm">
                    {lead.temperature}
                  </Badge>
                  <span className="inline-flex h-7 min-w-[3rem] items-center justify-center rounded-md bg-secondary px-2 text-sm font-semibold">
                    Score {lead.score}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a href={`mailto:${lead.email}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/40">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.email ?? "No email"}</span>
                </a>
                <a href={`tel:${lead.phone}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/40">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.phone ?? "No phone"}</span>
                </a>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {lead.tags.map((t) => (
                  <Badge key={t} tone="default" className="gap-1"><Tag className="h-3 w-3" /> {t}</Badge>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                  onClick={async () => {
                    const r = await triggerAutomation("followup.send", { lead_id: lead.id, channel: "whatsapp" });
                    if (r.ok) toast.success("WhatsApp follow-up queued");
                  }}
                >
                  Send WhatsApp
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  onClick={async () => {
                    const r = await triggerAutomation("lead.qualify", { lead_id: lead.id });
                    if (r.ok) {
                      const score = (r.response.score as number) ?? lead.score;
                      update.mutate({ score, intent: r.response.intent as string });
                    }
                  }}
                >
                  Re-run AI score
                </Button>
                <Link href="/appointments">
                  <Button variant="outline" leftIcon={<CalendarPlus className="h-4 w-4" />}>Book appointment</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="ai">AI insight</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card><CardContent className="p-6">
                <ul className="space-y-4 text-sm">
                  <li className="flex items-start gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-success" /><div><b>WhatsApp message replied</b><p className="text-xs text-muted-foreground">{formatDate(lead.created_at, { dateStyle: "medium", timeStyle: "short" })}</p></div></li>
                  <li className="flex items-start gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-primary" /><div><b>AI qualified</b><p className="text-xs text-muted-foreground">Scored {lead.score}/100 - {lead.intent ?? "n/a"}</p></div></li>
                  <li className="flex items-start gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" /><div><b>Lead created</b><p className="text-xs text-muted-foreground">via {lead.source}</p></div></li>
                </ul>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card><CardContent className="p-6 space-y-3">
                <Label>Internal notes</Label>
                <Textarea
                  defaultValue={lead.notes ?? ""}
                  rows={6}
                  onBlur={(e) => update.mutate({ notes: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Auto-saves on blur.</p>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="ai">
              <Card><CardContent className="p-6 space-y-3 text-sm">
                <p><b>Predicted intent:</b> {lead.intent ?? "-"}</p>
                <p><b>Recommended next action:</b> {lead.temperature === "hot" ? "Call within 5 minutes - high purchase intent." : "Send WhatsApp brochure + check-in in 24h."}</p>
                <p><b>Why this score:</b> source quality, recency, engagement signals, and tag matches.</p>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Status</Label>
                <Select value={lead.status} onChange={(e) => update.mutate({ status: e.target.value as Lead["status"] })}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </Select>
              </div>
              <div>
                <Label>Temperature</Label>
                <Select value={lead.temperature} onChange={(e) => update.mutate({ temperature: e.target.value as Lead["temperature"] })}>
                  <option value="hot">🔥 Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Owner</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar name="Aarav Sharma" size={36} />
              <div>
                <p className="text-sm font-medium">Aarav Sharma</p>
                <p className="text-xs text-muted-foreground">Owner · responds in ~5m</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
