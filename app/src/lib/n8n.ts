// =========================================================================
// n8n / Automation webhook abstraction.
// Triggers a registered workflow by action name. Falls back to a mock
// success response in dev mode so the UI is fully usable without a backend.
// =========================================================================

export type AutomationAction =
  | "lead.qualify"
  | "lead.assign"
  | "followup.send"
  | "campaign.launch"
  | "appointment.book"
  | "appointment.remind"
  | "ticket.create"
  | "ticket.escalate"
  | "faq.reply"
  | "retargeting.run"
  | "digest.daily";

const ACTION_ENV_MAP: Record<AutomationAction, string | undefined> = {
  "lead.qualify": process.env.N8N_WEBHOOK_LEAD_QUALIFY,
  "lead.assign": process.env.N8N_WEBHOOK_LEAD_QUALIFY,
  "followup.send": process.env.N8N_WEBHOOK_FOLLOWUP_SEND,
  "campaign.launch": process.env.N8N_WEBHOOK_CAMPAIGN_LAUNCH,
  "appointment.book": process.env.N8N_WEBHOOK_APPOINTMENT_BOOK,
  "appointment.remind": process.env.N8N_WEBHOOK_APPOINTMENT_BOOK,
  "ticket.create": process.env.N8N_WEBHOOK_TICKET_CREATE,
  "ticket.escalate": process.env.N8N_WEBHOOK_TICKET_CREATE,
  "faq.reply": process.env.N8N_WEBHOOK_FAQ_REPLY,
  "retargeting.run": process.env.N8N_WEBHOOK_RETARGETING_RUN,
  "digest.daily": undefined,
};

export interface AutomationResult {
  ok: boolean;
  action: AutomationAction;
  mocked: boolean;
  duration_ms: number;
  response: Record<string, unknown>;
  error?: string;
}

export async function triggerAutomation(
  action: AutomationAction,
  payload: Record<string, unknown>,
  opts?: { tenantId?: string; idempotencyKey?: string },
): Promise<AutomationResult> {
  const url = ACTION_ENV_MAP[action];
  const started = Date.now();

  if (!url) {
    // Mock mode - simulate latency + a useful response.
    await new Promise((r) => setTimeout(r, 250 + Math.random() * 350));
    return {
      ok: true,
      action,
      mocked: true,
      duration_ms: Date.now() - started,
      response: mockResponseFor(action, payload),
    };
  }

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-automateos-action": action,
    };
    if (opts?.tenantId) headers["x-automateos-tenant"] = opts.tenantId;
    if (opts?.idempotencyKey) headers["x-idempotency-key"] = opts.idempotencyKey;
    if (process.env.N8N_WEBHOOK_SECRET) {
      headers["x-automateos-secret"] = process.env.N8N_WEBHOOK_SECRET;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, payload, tenant_id: opts?.tenantId ?? null }),
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
    return {
      ok: res.ok,
      action,
      mocked: false,
      duration_ms: Date.now() - started,
      response: parsed,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      action,
      mocked: false,
      duration_ms: Date.now() - started,
      response: {},
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function mockResponseFor(action: AutomationAction, payload: Record<string, unknown>): Record<string, unknown> {
  switch (action) {
    case "lead.qualify": {
      const score = 30 + Math.floor(Math.random() * 70);
      return {
        score,
        temperature: score >= 70 ? "hot" : score >= 40 ? "warm" : "cold",
        intent: score >= 70 ? "Ready to buy" : score >= 40 ? "Researching" : "Awareness",
        recommended_action: score >= 70 ? "Call within 5 minutes" : "Add to nurture sequence",
      };
    }
    case "campaign.launch":
      return { queued: true, estimated_audience: payload.audience_size ?? 250, eta_minutes: 5 };
    case "appointment.book":
      return { confirmed: true, calendar_event_id: "evt_" + Math.random().toString(36).slice(2, 8) };
    case "ticket.create":
      return { ticket_id: "tkt_" + Math.random().toString(36).slice(2, 8), assigned_to: "auto" };
    case "faq.reply":
      return { reply: "Thanks for reaching out! Our team will respond within 1 business hour.", confidence: 0.92 };
    case "followup.send":
      return { sent: true, channel: payload.channel ?? "whatsapp" };
    case "retargeting.run":
      return { audience_size: 84, sequence_started: true };
    default:
      return { ok: true };
  }
}
