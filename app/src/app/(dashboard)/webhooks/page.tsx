"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Drawer } from "@/components/ui/Modal";
import { Webhook, RotateCw } from "lucide-react";
import { listWebhookLogs, seedDemoWebhookLogs, type WebhookLogEntry } from "@/lib/webhook-logs";
import { toast } from "sonner";

const TENANT = "org_demo";

const STATUS_TONE: Record<WebhookLogEntry["status"], "muted" | "info" | "success" | "warning" | "destructive"> = {
  pending: "muted",
  delivered: "success",
  failed: "destructive",
  retrying: "warning",
};

interface WebhookEvent {
  id: string;
  source: string;
  event: string;
  payload: Record<string, unknown>;
  status: "received" | "processed" | "failed";
  error: string | null;
  created_at: string;
}

function toLogEntry(e: WebhookEvent): WebhookLogEntry {
  return {
    id: e.id,
    tenantId: TENANT,
    at: e.created_at,
    direction: "inbound",
    source: e.source,
    status: e.status === "processed" ? "delivered" : e.status === "failed" ? "failed" : "pending",
    url: `n8n/${e.event}`,
    method: "POST",
    attempts: 1,
    headers: {},
    body: JSON.stringify(e.payload, null, 2),
    error: e.error ?? undefined,
  };
}

export default function WebhooksPage() {
  const [tab, setTab] = useState<"all" | "inbound" | "outbound">("all");
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [selected, setSelected] = useState<WebhookLogEntry | null>(null);
  const [usingRealData, setUsingRealData] = useState(false);

  async function refresh() {
    try {
      const res = await fetch("/api/webhook-events");
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d.events) && d.events.length >= 0 && !d.error) {
          setLogs((d.events as WebhookEvent[]).map(toLogEntry));
          setUsingRealData(true);
          return;
        }
      }
    } catch { /* fall through to demo data */ }

    seedDemoWebhookLogs(TENANT);
    setLogs(listWebhookLogs(TENANT, { direction: tab === "all" ? undefined : tab }));
  }

  useEffect(() => { refresh(); }, []); // eslint-disable-line
  useEffect(() => {
    if (!usingRealData) {
      setLogs(listWebhookLogs(TENANT, { direction: tab === "all" ? undefined : tab }));
    }
  }, [tab, usingRealData]);

  const filtered = useMemo(() => {
    if (!usingRealData || tab === "all") return logs;
    return logs.filter((l) => l.direction === tab);
  }, [logs, tab, usingRealData]);

  const stats = useMemo(() => ({
    total: filtered.length,
    delivered: filtered.filter((l) => l.status === "delivered").length,
    failed: filtered.filter((l) => l.status === "failed").length,
  }), [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhook logs"
        description="Every inbound and outbound webhook, with replay."
        actions={<Button variant="secondary" leftIcon={<RotateCw className="h-4 w-4" />} onClick={refresh}>Refresh</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total (24h)</p><p className="text-2xl font-semibold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Delivered</p><p className="text-2xl font-semibold text-success">{stats.delivered}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-semibold text-destructive">{stats.failed}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "inbound" | "outbound")}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="inbound">Inbound</TabsTrigger>
          <TabsTrigger value="outbound">Outbound</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <EmptyState icon={<Webhook className="h-6 w-6" />} title="No webhooks yet" description="Logs appear here as integrations send and receive events." />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Click any row to inspect headers, payload, and replay.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr><th className="px-4 py-2">When</th><th>Direction</th><th>Source</th><th>Status</th><th>Latency</th><th>URL</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((l) => (
                      <tr key={l.id} className="cursor-pointer border-t hover:bg-muted/30" onClick={() => setSelected(l)}>
                        <td className="px-4 py-2 text-muted-foreground">{new Date(l.at).toLocaleString()}</td>
                        <td><Badge tone={l.direction === "inbound" ? "info" : "muted"}>{l.direction}</Badge></td>
                        <td>{l.source ?? "-"}</td>
                        <td><Badge tone={STATUS_TONE[l.status]}>{l.status}{l.responseStatus ? ` · ${l.responseStatus}` : ""}</Badge></td>
                        <td className="text-muted-foreground">{l.durationMs ?? "-"} ms</td>
                        <td className="max-w-[280px] truncate font-mono text-xs">{l.url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Webhook detail">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Detail label="Direction" value={selected.direction} />
              <Detail label="Source"    value={selected.source ?? "-"} />
              <Detail label="Method"    value={selected.method} />
              <Detail label="Status"    value={`${selected.status}${selected.responseStatus ? ` · ${selected.responseStatus}` : ""}`} />
              <Detail label="Attempts"  value={String(selected.attempts)} />
              <Detail label="Latency"   value={`${selected.durationMs ?? 0} ms`} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">URL</p>
              <code className="block break-all rounded bg-muted p-2 text-xs">{selected.url}</code>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Headers</p>
              <pre className="max-h-[120px] overflow-auto rounded bg-muted p-2 text-[11px]">{JSON.stringify(selected.headers, null, 2)}</pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Body</p>
              <pre className="max-h-[160px] overflow-auto rounded bg-muted p-2 text-[11px]">{selected.body}</pre>
            </div>
            {selected.error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-destructive">{selected.error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button onClick={() => toast.success("Replayed (demo)")}>Replay</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
