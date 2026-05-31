"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bell, CheckCheck, Filter } from "lucide-react";
import {
  listNotifications, markAllRead, markRead, seedDemoNotifications,
  type Notification, type NotificationLevel,
} from "@/lib/notifications";

const TENANT = "org_demo";
const USER = "user_demo";

const TONE_BY_LEVEL: Record<NotificationLevel, "muted" | "info" | "success" | "warning" | "destructive"> = {
  info: "info",
  success: "success",
  warning: "warning",
  critical: "destructive",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => { seedDemoNotifications(TENANT); refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function refresh() { listNotifications(TENANT, USER, { unreadOnly: filter === "unread" }).then(setItems); }
  useEffect(refresh, [filter]);  // eslint-disable-line

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Everything that needs your attention, in one place."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" leftIcon={<Filter className="h-4 w-4" />} onClick={() => setFilter(filter === "all" ? "unread" : "all")}>
              {filter === "all" ? "Show unread only" : "Show all"}
            </Button>
            <Button variant="secondary" leftIcon={<CheckCheck className="h-4 w-4" />} onClick={() => { markAllRead(TENANT, USER).then(refresh); }}>
              Mark all read
            </Button>
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title="You're all caught up" description="New alerts will land here as they happen." />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => { markRead([n.id]).then(refresh); if (n.href) window.location.href = n.href; }}
                className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${n.read ? "" : "bg-primary/5"}`}
              >
                <span className={`mt-1 h-2 w-2 rounded-full ${n.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={TONE_BY_LEVEL[n.level]}>{n.level}</Badge>
                    <Badge tone="muted">{n.kind}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
