"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";
import { createTicket, getTickets, updateTicket } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";

const STATUS_TONE: Record<TicketStatus, "info" | "warning" | "primary" | "success" | "muted"> = {
  open: "info", in_progress: "primary", waiting: "warning", resolved: "success", closed: "muted",
};
const PRIORITY_TONE: Record<TicketPriority, "muted" | "default" | "warning" | "destructive"> = {
  low: "muted", normal: "default", high: "warning", urgent: "destructive",
};

export default function TicketsPage() {
  const qc = useQueryClient();
  const { data: tickets = [] } = useQuery({ queryKey: ["tickets"], queryFn: getTickets });
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | TicketStatus>("all");

  const filtered = tickets.filter((t) => filter === "all" || t.status === filter);

  const create = useMutation({
    mutationFn: createTicket,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); toast.success("Ticket created"); setOpen(false); },
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      subject: String(fd.get("subject")),
      contact_name: String(fd.get("contact")),
      contact_email: String(fd.get("email") ?? ""),
      category: String(fd.get("category") ?? "General"),
      priority: fd.get("priority") as TicketPriority,
      description: String(fd.get("description") ?? ""),
    } as any);
  }

  return (
    <>
      <PageHeader
        title="Support tickets"
        description="Inbox for customer issues. Auto-route, escalate, and resolve."
        actions={<Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>New ticket</Button>}
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          {(["all","open","in_progress","waiting","resolved","closed"] as const).map((s) => (
            <TabsTrigger key={s} value={s}>{s.replace("_"," ")} <span className="ml-1.5 text-xs text-muted-foreground">{s === "all" ? tickets.length : tickets.filter((t)=>t.status===s).length}</span></TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filter}>
          <Card><CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">No tickets here. ✨</div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((t) => (
                  <li key={t.id} className="p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <Avatar name={t.contact_name} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium truncate">{t.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">{t.contact_name} · {t.category}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge tone={STATUS_TONE[t.status]} dot>{t.status.replace("_"," ")}</Badge>
                            <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{formatRelative(t.created_at)}</p>
                          <div className="flex gap-2">
                            {t.status !== "resolved" && (
                              <Button size="sm" variant="outline" onClick={async () => {
                                await updateTicket(t.id, { status: "resolved" });
                                qc.invalidateQueries({ queryKey: ["tickets"] });
                                toast.success("Marked resolved");
                              }}>Resolve</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Modal open={open} onClose={() => setOpen(false)} title="Create ticket">
        <form onSubmit={onCreate} className="space-y-3">
          <div><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="contact">Contact name</Label><Input id="contact" name="contact" required /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" name="category">
                <option>General</option><option>Account</option><option>Billing</option><option>Booking</option><option>Technical</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue="normal">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </Select>
            </div>
          </div>
          <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create ticket</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
