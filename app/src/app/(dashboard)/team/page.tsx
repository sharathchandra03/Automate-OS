"use client";

import { Plus, MailPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

const TEAM = [
  { id: "1", name: "Aarav Sharma", email: "aarav@acme.com", role: "owner", status: "active" },
  { id: "2", name: "Saanvi Patel", email: "saanvi@acme.com", role: "admin", status: "active" },
  { id: "3", name: "Rohan Mehta", email: "rohan@acme.com", role: "member", status: "active" },
  { id: "4", name: "Diya Iyer", email: "diya@acme.com", role: "member", status: "pending" },
  { id: "5", name: "Vihaan Singh", email: "vihaan@acme.com", role: "viewer", status: "active" },
];

const ROLE_TONE = {
  owner: "primary" as const,
  admin: "info" as const,
  member: "default" as const,
  viewer: "muted" as const,
};

export default function TeamPage() {
  return (
    <>
      <PageHeader
        title="Team"
        description="Invite teammates and manage permissions."
        actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.message("Invite sent")}>Invite member</Button>}
      />

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Member</th>
              <th className="px-4 py-2.5 text-left font-medium">Role</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TEAM.map((m) => (
              <tr key={m.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} size={32} />
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge tone={ROLE_TONE[m.role as keyof typeof ROLE_TONE]}>{m.role}</Badge></td>
                <td className="px-4 py-3">
                  <Badge tone={m.status === "active" ? "success" : "warning"} dot>{m.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {m.status === "pending" ? (
                    <Button size="sm" variant="ghost" leftIcon={<MailPlus className="h-3.5 w-3.5" />}>Resend</Button>
                  ) : (
                    <Button size="sm" variant="ghost">Manage</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </>
  );
}
