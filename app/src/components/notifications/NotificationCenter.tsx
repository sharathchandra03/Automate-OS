"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  listNotifications, markAllRead, markRead, seedDemoNotifications,
  type Notification, type NotificationLevel,
} from "@/lib/notifications";

const TENANT = "org_demo";
const USER = "user_demo";

const TONE: Record<NotificationLevel, "muted" | "info" | "success" | "warning" | "destructive"> = {
  info: "info", success: "success", warning: "warning", critical: "destructive",
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    seedDemoNotifications(TENANT);
    refresh();
  }, []);
  function refresh() { listNotifications(TENANT, USER, { limit: 12 }).then(setItems); }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => { setOpen((v) => !v); refresh(); }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute right-1 top-1 inline-block h-2 w-2 rounded-full bg-primary" />}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b p-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { markAllRead(TENANT, USER).then(refresh); }}
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          </div>
          <ul className="max-h-[400px] divide-y overflow-y-auto">
            {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">All clear ✨</li>}
            {items.map((n) => {
              const inner = (
                <div className={`flex items-start gap-3 p-3 ${n.read ? "" : "bg-primary/5"}`}>
                  <span className={`mt-1 h-2 w-2 rounded-full ${n.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={TONE[n.level]}>{n.level}</Badge>
                      <span className="text-[10px] text-muted-foreground">{relTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm font-medium">{n.title}</p>
                    {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                  </div>
                </div>
              );
              return (
                <li key={n.id} onClick={() => { markRead([n.id]).then(refresh); }}>
                  {n.href ? (
                    <Link href={n.href} className="block hover:bg-muted/50">{inner}</Link>
                  ) : (
                    <button className="w-full text-left hover:bg-muted/50">{inner}</button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t p-2 text-center">
            <Link href="/notifications" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function relTime(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (d < 1) return "just now";
  if (d < 60) return `${Math.round(d)}m`;
  if (d < 60 * 24) return `${Math.round(d / 60)}h`;
  return `${Math.round(d / 60 / 24)}d`;
}
