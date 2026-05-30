"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { FileDown, Mail, Calendar, Plus, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduledReport {
  id: string;
  name: string;
  schedule: "daily" | "weekly" | "monthly";
  delivery: "email" | "slack" | "whatsapp";
  recipients: string;
  metrics: string[];
  format: "pdf" | "csv" | "xlsx";
  active: boolean;
  lastRunAt?: string;
}

const SAMPLE: ScheduledReport[] = [
  { id: "r1", name: "Weekly Executive Brief",   schedule: "weekly",  delivery: "email",   recipients: "owner@acme.io",        metrics: ["Leads", "Pipeline", "Won deals"], format: "pdf", active: true,  lastRunAt: new Date(Date.now()-86_400_000*2).toISOString() },
  { id: "r2", name: "Daily Lead Velocity",      schedule: "daily",   delivery: "slack",   recipients: "#sales-daily",         metrics: ["New leads", "First response", "Conv. rate"], format: "pdf", active: true },
  { id: "r3", name: "Monthly Channel Mix",      schedule: "monthly", delivery: "email",   recipients: "team@acme.io",         metrics: ["Channel", "Revenue", "ROI"], format: "xlsx", active: false },
];

const ALL_METRICS = ["Leads", "Pipeline", "Won deals", "Lost deals", "First response", "Conv. rate", "MRR", "Channel mix", "ROI", "Tickets", "CSAT", "AI cost"];

export default function ReportsPage() {
  const [list, setList] = useState<ScheduledReport[]>(SAMPLE);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<ScheduledReport>>({ name: "", schedule: "weekly", delivery: "email", format: "pdf", metrics: [], recipients: "" });

  function add() {
    if (!draft.name || !draft.recipients || !(draft.metrics?.length)) return toast.error("Fill in name, recipients, and at least one metric");
    setList((l) => [{ id: `r${Date.now()}`, name: draft.name!, schedule: draft.schedule!, delivery: draft.delivery!, format: draft.format!, recipients: draft.recipients!, metrics: draft.metrics!, active: true } as ScheduledReport, ...l]);
    setOpen(false); setDraft({ name: "", schedule: "weekly", delivery: "email", format: "pdf", metrics: [], recipients: "" });
    toast.success("Report scheduled");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Recurring, branded summaries delivered to email, Slack, or WhatsApp."
        actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>New report</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-1">{r.name}</CardTitle>
                <Badge tone={r.active ? "success" : "muted"}>{r.active ? "Active" : "Paused"}</Badge>
              </div>
              <CardDescription>{r.schedule} · {r.format.toUpperCase()} · via {r.delivery}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground"><Mail className="mr-1 inline h-3 w-3" />{r.recipients}</p>
              <div className="flex flex-wrap gap-1">
                {r.metrics.slice(0, 4).map((m) => <Badge key={m} tone="muted">{m}</Badge>)}
                {r.metrics.length > 4 && <span className="text-xs text-muted-foreground">+{r.metrics.length - 4}</span>}
              </div>
              {r.lastRunAt && <p className="text-xs text-muted-foreground"><Calendar className="mr-1 inline h-3 w-3" />Last sent {new Date(r.lastRunAt).toLocaleDateString()}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" leftIcon={<Play className="h-3 w-3" />} onClick={() => toast.success("Running now (demo)")}>Run now</Button>
                <Button size="sm" variant="ghost" leftIcon={<FileDown className="h-3 w-3" />} onClick={() => toast.success("Download started (demo)")}>Download</Button>
                <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-3 w-3" />} onClick={() => setList((l) => l.filter((x) => x.id !== r.id))}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule report">
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Schedule</Label>
              <Select value={draft.schedule} onChange={(e) => setDraft({ ...draft, schedule: e.target.value as ScheduledReport["schedule"] })}>
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value as ScheduledReport["format"] })}>
                <option value="pdf">PDF</option><option value="csv">CSV</option><option value="xlsx">Excel</option>
              </Select>
            </div>
            <div>
              <Label>Delivery</Label>
              <Select value={draft.delivery} onChange={(e) => setDraft({ ...draft, delivery: e.target.value as ScheduledReport["delivery"] })}>
                <option value="email">Email</option><option value="slack">Slack</option><option value="whatsapp">WhatsApp</option>
              </Select>
            </div>
            <div>
              <Label>Recipients</Label>
              <Input value={draft.recipients ?? ""} onChange={(e) => setDraft({ ...draft, recipients: e.target.value })} placeholder="email@…, #channel, +91…" />
            </div>
          </div>
          <div>
            <Label>Metrics</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ALL_METRICS.map((m) => {
                const sel = draft.metrics?.includes(m);
                return (
                  <button key={m} onClick={() => setDraft({ ...draft, metrics: sel ? draft.metrics!.filter((x) => x !== m) : [...(draft.metrics ?? []), m] })} className={`rounded-full border px-3 py-1 text-xs ${sel ? "bg-primary text-primary-foreground" : ""}`}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} placeholder="A short cover note for the recipients…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add}>Schedule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
