/**
 * In-app notification center.
 * Supabase-backed when configured; falls back to in-memory for demo mode.
 */

import { HAS_SUPABASE } from "./config";
import { createSupabaseBrowserClient } from "./supabase/client";

export type NotificationKind = "lead" | "ticket" | "appointment" | "automation" | "billing" | "system" | "team";
export type NotificationLevel = "info" | "success" | "warning" | "critical";

export interface Notification {
  id: string;
  tenantId: string;
  userId?: string;
  kind: NotificationKind;
  level: NotificationLevel;
  title: string;
  body?: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

// ── In-memory fallback store ──────────────────────────────────────────────────

const store: Notification[] = [];

function memPush(n: Omit<Notification, "id" | "read" | "createdAt">): Notification {
  const note: Notification = {
    id: `ntf_${Math.random().toString(36).slice(2, 12)}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...n,
  };
  store.unshift(note);
  if (store.length > 1000) store.pop();
  return note;
}

// ── Row mapper (Supabase row → Notification) ──────────────────────────────────

function rowToNote(r: Record<string, unknown>, tenantId: string): Notification {
  return {
    id: r.id as string,
    tenantId,
    userId: r.user_id as string | undefined,
    kind: r.kind as NotificationKind,
    level: r.level as NotificationLevel,
    title: r.title as string,
    body: r.body as string | undefined,
    href: r.href as string | undefined,
    read: r.read as boolean,
    createdAt: r.created_at as string,
  };
}

// ── Public API (all async) ────────────────────────────────────────────────────

export async function pushNotification(
  n: Omit<Notification, "id" | "read" | "createdAt">
): Promise<Notification> {
  if (!HAS_SUPABASE) return memPush(n);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return memPush(n);

  const { data, error } = await supabase
    .from("notifications")
    .insert([{
      organization_id: n.tenantId,
      user_id: n.userId ?? null,
      kind: n.kind,
      level: n.level,
      title: n.title,
      body: n.body ?? null,
      href: n.href ?? null,
    }])
    .select()
    .single();

  if (error || !data) return memPush(n);
  return rowToNote(data as Record<string, unknown>, n.tenantId);
}

export async function listNotifications(
  tenantId: string,
  userId?: string,
  opts: { limit?: number; unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  if (!HAS_SUPABASE) {
    return store
      .filter((n) =>
        n.tenantId === tenantId &&
        (n.userId === undefined || n.userId === userId) &&
        (!opts.unreadOnly || !n.read)
      )
      .slice(0, opts.limit ?? 50);
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return store
      .filter((n) =>
        n.tenantId === tenantId &&
        (n.userId === undefined || n.userId === userId) &&
        (!opts.unreadOnly || !n.read)
      )
      .slice(0, opts.limit ?? 50);
  }

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("organization_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (userId) query = query.or(`user_id.eq.${userId},user_id.is.null`);
  if (opts.unreadOnly) query = query.eq("read", false);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => rowToNote(r, tenantId));
}

export async function unreadCount(tenantId: string, userId?: string): Promise<number> {
  const items = await listNotifications(tenantId, userId, { unreadOnly: true, limit: 100 });
  return items.length;
}

export async function markRead(ids: string[]): Promise<void> {
  if (!HAS_SUPABASE) {
    for (const n of store) if (ids.includes(n.id)) n.read = true;
    return;
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    for (const n of store) if (ids.includes(n.id)) n.read = true;
    return;
  }
  await supabase.from("notifications").update({ read: true }).in("id", ids);
}

export async function markAllRead(tenantId: string, userId?: string): Promise<void> {
  if (!HAS_SUPABASE) {
    for (const n of store) {
      if (n.tenantId === tenantId && (n.userId === undefined || n.userId === userId)) n.read = true;
    }
    return;
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    for (const n of store) {
      if (n.tenantId === tenantId && (n.userId === undefined || n.userId === userId)) n.read = true;
    }
    return;
  }
  let query = supabase.from("notifications").update({ read: true }).eq("organization_id", tenantId);
  if (userId) query = query.or(`user_id.eq.${userId},user_id.is.null`);
  await query;
}

export function seedDemoNotifications(tenantId: string) {
  if (store.some((n) => n.tenantId === tenantId)) return;
  const samples: Array<Omit<Notification, "id" | "read" | "createdAt">> = [
    { tenantId, kind: "lead",        level: "success",  title: "Hot lead assigned: Priya R.", body: "Score 88. WhatsApp opened.", href: "/leads" },
    { tenantId, kind: "ticket",      level: "warning",  title: "Ticket aging: refund request",  body: "Open 26h. Sentiment: frustrated.", href: "/tickets" },
    { tenantId, kind: "automation",  level: "critical", title: "Automation 'Cart recovery' failing", body: "Success rate dropped to 62% in last hour.", href: "/automations" },
    { tenantId, kind: "appointment", level: "info",     title: "Booking confirmed: 11:00 AM tour", body: "Reminder scheduled.", href: "/appointments" },
    { tenantId, kind: "billing",     level: "warning",  title: "AI usage at 82% of monthly limit",   body: "Upgrade to Pro to avoid throttling.", href: "/billing" },
    { tenantId, kind: "team",        level: "info",     title: "Aman invited to your workspace",     body: "Role: manager.", href: "/team" },
  ];
  samples.forEach((s) => memPush(s));
}
