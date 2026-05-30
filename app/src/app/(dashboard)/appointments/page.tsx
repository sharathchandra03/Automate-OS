"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { createAppointment, getAppointments, updateAppointment } from "@/lib/api";
import { triggerAutomation } from "@/lib/n8n";
import { formatDate, formatRelative } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

const STATUS_TONE: Record<Appointment["status"], "success" | "info" | "muted" | "warning" | "destructive"> = {
  confirmed: "success", pending: "warning", completed: "muted", cancelled: "destructive", no_show: "destructive",
};

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const { data: appts = [] } = useQuery({ queryKey: ["appointments"], queryFn: getAppointments });
  const [open, setOpen] = React.useState(false);

  const upcoming = appts.filter((a) => new Date(a.starts_at) > new Date()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = appts.filter((a) => new Date(a.starts_at) <= new Date());

  const create = useMutation({
    mutationFn: createAppointment,
    onSuccess: async (a: Appointment) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment booked");
      setOpen(false);
      await triggerAutomation("appointment.book", { appointment_id: a.id, contact: a.contact_name });
    },
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      contact_name: String(fd.get("name")),
      contact_email: String(fd.get("email") ?? ""),
      service: String(fd.get("service")),
      starts_at: String(fd.get("starts_at")),
      duration_min: Number(fd.get("duration") ?? 30),
    } as any);
  }

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Bookings, calendar sync, reminders, and rescheduling - all in one place."
        actions={<Button onClick={() => setOpen(true)} leftIcon={<CalendarPlus className="h-4 w-4" />}>New booking</Button>}
      />

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming · {upcoming.length}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-8">
        {upcoming.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar name={a.contact_name} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.contact_name}</p>
                <p className="text-xs text-muted-foreground truncate">{a.service} · {a.duration_min} min</p>
                <p className="mt-1 text-xs flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatDate(a.starts_at, { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge>
                {a.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    await updateAppointment(a.id, { status: "confirmed" });
                    qc.invalidateQueries({ queryKey: ["appointments"] });
                    toast.success("Confirmed");
                  }}>Confirm</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past · {past.length}</h2>
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {past.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{a.contact_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.service}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatRelative(a.starts_at)}</td>
                    <td className="px-4 py-3 text-right"><Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Book new appointment">
        <form onSubmit={onCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="name">Contact name</Label><Input id="name" name="name" required /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
          </div>
          <div>
            <Label htmlFor="service">Service</Label>
            <Select id="service" name="service">
              <option>Site Visit</option>
              <option>Discovery Call</option>
              <option>Property Tour</option>
              <option>Strategy Session</option>
              <option>Demo</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="starts_at">Date & time</Label><Input id="starts_at" name="starts_at" type="datetime-local" required /></div>
            <div><Label htmlFor="duration">Duration (min)</Label><Input id="duration" name="duration" type="number" defaultValue={30} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Book</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
