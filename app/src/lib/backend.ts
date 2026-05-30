// Bridge from Next.js frontend to the AutomateOS Express backend server.
// Uses Supabase JWT for authentication — no more x-organization-id header.

import { createSupabaseBrowserClient } from "./supabase/client";
import { SERVER_URL } from "./config";

interface BackendOptions {
  method?: string;
  body?: unknown;
}

/** Get the current JWT from the Supabase session. Throws if not authenticated. */
async function getJwt(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return session.access_token;
}

async function backendFetch<T>(path: string, options: BackendOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const jwt = await getJwt();

  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? "Backend request failed");
  }

  return res.json() as Promise<T>;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export const backend = {
  analytics: {
    summary: (days: 7 | 14 | 30 = 30) =>
      backendFetch<{
        period_days: number;
        contacts: { total: number };
        conversations: { total: number; open: number; closed: number };
        campaigns: { count: number; sent: number; delivered: number; read: number; open_rate: number };
        tickets: { total: number; open: number; closed: number };
        leads: { total: number; won: number; lost: number; win_rate: number };
      }>(`/api/analytics?days=${days}`),
  },

  // ── Org ───────────────────────────────────────────────────────────────────

  orgs: {
    create: (body: { name: string; slug: string; industry: string; timezone?: string }) =>
      backendFetch<{ organization: unknown }>("/api/orgs", { method: "POST", body }),
    me: () =>
      backendFetch<{ organization: unknown; role: string }>("/api/orgs/me"),
  },

  // ── WhatsApp ──────────────────────────────────────────────────────────────

  whatsapp: {
    connect: (body: unknown) =>
      backendFetch("/api/workspace/whatsapp/connect", { method: "POST", body }),
    disconnect: () =>
      backendFetch("/api/workspace/whatsapp/disconnect", { method: "DELETE" }),
    status: () =>
      backendFetch<{ channel: unknown }>("/api/workspace/whatsapp/status"),
  },

  // ── Templates ─────────────────────────────────────────────────────────────

  templates: {
    list: () =>
      backendFetch<{ templates: unknown[] }>("/api/templates"),
    sync: () =>
      backendFetch("/api/templates/sync", { method: "POST" }),
  },

  // ── Campaigns ─────────────────────────────────────────────────────────────

  campaigns: {
    list: () =>
      backendFetch<{ campaigns: unknown[] }>("/api/campaigns"),
    create: (body: unknown) =>
      backendFetch("/api/campaigns", { method: "POST", body }),
    send: (campaignId: string) =>
      backendFetch(`/api/campaigns/${campaignId}/send`, { method: "POST" }),
    stats: (campaignId: string) =>
      backendFetch(`/api/campaigns/${campaignId}/stats`),
  },

  // ── Flows ─────────────────────────────────────────────────────────────────

  flows: {
    list: () =>
      backendFetch<{ flows: unknown[] }>("/api/flows"),
    create: (body: unknown) =>
      backendFetch("/api/flows", { method: "POST", body }),
    update: (flowId: string, body: unknown) =>
      backendFetch(`/api/flows/${flowId}`, { method: "PUT", body }),
    activate: (flowId: string) =>
      backendFetch(`/api/flows/${flowId}/activate`, { method: "POST" }),
    deactivate: (flowId: string) =>
      backendFetch(`/api/flows/${flowId}/deactivate`, { method: "POST" }),
  },

  // ── Contacts ─────────────────────────────────────────────────────────────

  contacts: {
    list: (params?: { search?: string; tag?: string; page?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return backendFetch<{ contacts: unknown[]; total: number }>(
        `/api/contacts${qs ? `?${qs}` : ""}`,
      );
    },
    create: (body: unknown) =>
      backendFetch("/api/contacts", { method: "POST", body }),
    import: (contacts: unknown[]) =>
      backendFetch("/api/contacts/import", { method: "POST", body: { contacts } }),
    optOut: (contactId: string) =>
      backendFetch(`/api/contacts/${contactId}/opt-out`, { method: "POST" }),
  },

  // ── Sequences ────────────────────────────────────────────────────────────

  sequences: {
    list: () =>
      backendFetch<{ sequences: unknown[] }>("/api/sequences"),
    create: (body: unknown) =>
      backendFetch("/api/sequences", { method: "POST", body }),
    enroll: (sequenceId: string, contactIds: string[]) =>
      backendFetch(`/api/sequences/${sequenceId}/enroll`, {
        method: "POST",
        body: { contact_ids: contactIds },
      }),
  },

  // ── Appointments ──────────────────────────────────────────────────────────

  appointments: {
    list: () =>
      backendFetch<{ appointments: unknown[] }>("/api/appointments"),
    create: (body: unknown) =>
      backendFetch("/api/appointments", { method: "POST", body }),
    update: (id: string, body: unknown) =>
      backendFetch(`/api/appointments/${id}`, { method: "PUT", body }),
    cancel: (id: string) =>
      backendFetch(`/api/appointments/${id}/cancel`, { method: "POST" }),
  },

  // ── Tickets ───────────────────────────────────────────────────────────────

  tickets: {
    list: (status?: string) => {
      const qs = status ? `?status=${status}` : "";
      return backendFetch<{ tickets: unknown[] }>(`/api/tickets${qs}`);
    },
    create: (body: unknown) =>
      backendFetch("/api/tickets", { method: "POST", body }),
    update: (id: string, body: unknown) =>
      backendFetch(`/api/tickets/${id}`, { method: "PUT", body }),
    resolve: (id: string) =>
      backendFetch(`/api/tickets/${id}/resolve`, { method: "POST" }),
  },
};
