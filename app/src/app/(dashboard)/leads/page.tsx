"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, KanbanSquare, LayoutList, Plus, Search, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { createLead, getLeads, updateLead } from "@/lib/api";
import { SkeletonTable } from "@/components/ui/skeleton-card";
import { triggerAutomation } from "@/lib/n8n";
import { formatRelative } from "@/lib/utils";
import type { Lead, LeadStatus, LeadTemperature } from "@/lib/types";

const STATUS_TONE: Record<LeadStatus, "info" | "primary" | "success" | "warning" | "muted" | "destructive"> = {
  new: "info",
  contacted: "primary",
  qualified: "primary",
  proposal: "warning",
  won: "success",
  lost: "muted",
};
const TEMP_TONE: Record<LeadTemperature, "destructive" | "warning" | "muted"> = {
  hot: "destructive",
  warm: "warning",
  cold: "muted",
};

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads });

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [tempFilter, setTempFilter] = React.useState<string>("all");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [view, setView] = React.useState<"table" | "board">("table");
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (tempFilter !== "all" && l.temperature !== tempFilter) return false;
      if (search && !`${l.name} ${l.email} ${l.phone} ${l.source}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, search, statusFilter, tempFilter]);

  const create = useMutation({
    mutationFn: createLead,
    onSuccess: async (lead: Lead) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Lead added · running AI qualifier…`);
      setModalOpen(false);
      const result = await triggerAutomation("lead.qualify", { lead_id: lead.id, name: lead.name, source: lead.source });
      if (result.ok) {
        toast.success(`AI scored ${lead.name}: ${(result.response.score as number) ?? "-"}/100`);
      }
    },
  });

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      updateLead(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const prev = qc.getQueryData<Lead[]>(["leads"]);
      qc.setQueryData<Lead[]>(["leads"], (old = []) =>
        old.map((l) => (l.id === id ? { ...l, status } : l))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leads"], ctx.prev);
      toast.error("Failed to update status");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? "") || null,
      phone: String(fd.get("phone") ?? "") || null,
      source: String(fd.get("source") ?? "Manual"),
      notes: String(fd.get("notes") ?? "") || null,
    } as any);
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("leadId", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, toStatus: LeadStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("leadId");
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === toStatus) return;
    move.mutate({ id, status: toStatus });
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description="Capture, qualify and convert. AI scores every new lead."
        actions={
          <>
            <Button variant="outline" leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => toast.message("Bulk re-scoring queued")}>
              Re-score all
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Add lead
            </Button>
          </>
        }
      />

      {/* Filters + view toggle */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone…" className="pl-9" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto min-w-[140px]">
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </Select>
          <Select value={tempFilter} onChange={(e) => setTempFilter(e.target.value)} className="w-auto min-w-[140px]">
            <option value="all">All temps</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </Select>
          <Button variant="outline" size="md" leftIcon={<Filter className="h-4 w-4" />}>More</Button>
          <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("table")}
              title="Table view"
              className="h-7 w-7 p-0"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("board")}
              title="Board view"
              className="h-7 w-7 p-0"
            >
              <KanbanSquare className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table view */}
      {view === "table" && (
        <Card>
          {isLoading ? (
            <div className="p-4"><SkeletonTable rows={6} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No leads match your filters"
              description="Try clearing filters, or add your first lead to start tracking."
              action={<Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Add lead</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Name</th>
                    <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Source</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Temp</th>
                    <th className="px-4 py-2.5 text-right font-medium">Score</th>
                    <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Last activity</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={l.name} size={32} />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{l.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{l.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{l.source}</td>
                      <td className="px-4 py-3"><Badge tone={STATUS_TONE[l.status]} dot>{l.status}</Badge></td>
                      <td className="px-4 py-3"><Badge tone={TEMP_TONE[l.temperature]} dot>{l.temperature}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md bg-secondary px-2 text-xs font-semibold">
                          {l.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {l.last_contacted_at ? formatRelative(l.last_contacted_at) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/leads/${l.id}`}>
                          <Button variant="ghost" size="sm">Open</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Board / Kanban view */}
      {view === "board" && (
        <div className="flex flex-col md:flex-row gap-3 overflow-x-auto pb-4 min-h-[480px]">
          {isLoading ? (
            <div className="flex-1 p-4"><SkeletonTable rows={4} /></div>
          ) : (
            STATUSES.map((status) => {
              const col = filtered.filter((l) => l.status === status);
              return (
                <div
                  key={status}
                  className="min-w-[260px] md:min-w-0 md:flex-1 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-1 pb-2">
                    <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>
                    <span className="text-xs font-medium text-muted-foreground">{col.length}</span>
                  </div>

                  {/* Drop zone */}
                  <div className="flex flex-col gap-2 flex-1 rounded-lg bg-secondary/20 p-2 min-h-[120px]">
                    {col.length === 0 && (
                      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground select-none">
                        Drop here
                      </div>
                    )}
                    {col.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm transition-opacity select-none ${
                          draggingId === lead.id ? "opacity-40" : "opacity-100 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar name={lead.name} size={22} />
                          <p className="font-medium text-sm truncate flex-1">{lead.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-2">{lead.source}</p>
                        <div className="flex items-center justify-between gap-1">
                          <Badge tone={TEMP_TONE[lead.temperature]} dot>{lead.temperature}</Badge>
                          <span className="inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded bg-secondary px-1.5 text-xs font-semibold">
                            {lead.score}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Link href={`/leads/${lead.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Open</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add a new lead"
        description="We'll auto-score and route this lead through your active automations."
        size="md"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" name="name" placeholder="Aarav Sharma" required />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select id="source" name="source" defaultValue="Manual">
                <option>Manual</option>
                <option>Website Form</option>
                <option>WhatsApp</option>
                <option>Facebook Ads</option>
                <option>Google Ads</option>
                <option>Referral</option>
                <option>Walk-in</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="aarav@example.com" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+91 9876543210" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Looking for a 3BHK in central area, budget 80L." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Add lead</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
