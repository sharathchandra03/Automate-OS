import cron from "node-cron";
import supabase from "../lib/db";
import { sendTemplateMessage, sendButtonMessage, sendTextMessage } from "../lib/meta-api";
import type { OrgChannel } from "../lib/db";

// ── Helper: get active WhatsApp channel for an org ───────────────────────────

async function getTenant(organizationId: string): Promise<OrgChannel | null> {
  const { data } = await supabase
    .from("org_channels")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", "whatsapp")
    .eq("status", "active")
    .single<OrgChannel>();
  return data;
}

// ── 1. Appointment reminders (24h + 1h) ─────────────────────────────────────

async function appointmentReminderCron(): Promise<void> {
  const now = new Date();

  // 24-hour reminders
  const { data: appts24h } = await supabase
    .from("appointments")
    .select("id, title, scheduled_at, organization_id, contact_id, contacts(phone)")
    .eq("status", "confirmed")
    .eq("reminder_sent_24h", false)
    .gte("scheduled_at", new Date(now.getTime() + 23 * 3600 * 1000).toISOString())
    .lte("scheduled_at", new Date(now.getTime() + 25 * 3600 * 1000).toISOString());

  for (const appt of appts24h ?? []) {
    const contactRaw = appt.contacts as unknown;
    const contact = (Array.isArray(contactRaw) ? contactRaw[0] : contactRaw) as { phone: string } | null;
    if (!contact?.phone) continue;

    const tenant = await getTenant(appt.organization_id as string);
    if (!tenant) continue;

    try {
      await sendTemplateMessage(tenant, contact.phone, "appointment_reminder_24h", "en", {
        body: [
          { type: "text", text: appt.title as string },
          { type: "text", text: new Date(appt.scheduled_at as string).toLocaleString("en-IN") },
        ],
      });
      await supabase
        .from("appointments")
        .update({ reminder_sent_24h: true })
        .eq("id", appt.id);
    } catch (err) {
      console.error("[Cron] 24h reminder failed for appt", appt.id, err);
    }
  }

  // 1-hour reminders
  const { data: appts1h } = await supabase
    .from("appointments")
    .select("id, title, scheduled_at, organization_id, contact_id, contacts(phone)")
    .eq("status", "confirmed")
    .eq("reminder_sent_1h", false)
    .gte("scheduled_at", new Date(now.getTime() + 45 * 60 * 1000).toISOString())
    .lte("scheduled_at", new Date(now.getTime() + 75 * 60 * 1000).toISOString());

  for (const appt of appts1h ?? []) {
    const contactRaw1h = appt.contacts as unknown;
    const contact = (Array.isArray(contactRaw1h) ? contactRaw1h[0] : contactRaw1h) as { phone: string } | null;
    if (!contact?.phone) continue;

    const tenant = await getTenant(appt.organization_id as string);
    if (!tenant) continue;

    try {
      await sendTemplateMessage(tenant, contact.phone, "appointment_reminder_1h", "en", {
        body: [{ type: "text", text: appt.title as string }],
      });
      await supabase
        .from("appointments")
        .update({ reminder_sent_1h: true })
        .eq("id", appt.id);
    } catch (err) {
      console.error("[Cron] 1h reminder failed for appt", appt.id, err);
    }
  }
}

// ── 2. Post-appointment follow-up (2h after scheduled time) ──────────────────

async function appointmentFollowUpCron(): Promise<void> {
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, title, organization_id, contacts(phone)")
    .eq("status", "confirmed")
    .eq("follow_up_sent", false)
    .lt("scheduled_at", new Date(Date.now() - 2 * 3600 * 1000).toISOString());

  for (const appt of appts ?? []) {
    const contactRawFu = appt.contacts as unknown;
    const contact = (Array.isArray(contactRawFu) ? contactRawFu[0] : contactRawFu) as { phone: string } | null;
    if (!contact?.phone) continue;

    const tenant = await getTenant(appt.organization_id as string);
    if (!tenant) continue;

    try {
      await sendButtonMessage(
        tenant,
        contact.phone,
        "Thank you for your visit! How was your experience?",
        [
          { id: "rating_excellent", title: "⭐ Excellent" },
          { id: "rating_good", title: "👍 Good" },
          { id: "rating_poor", title: "👎 Needs Improvement" },
        ]
      );
      await supabase
        .from("appointments")
        .update({ follow_up_sent: true, status: "completed" })
        .eq("id", appt.id);
    } catch (err) {
      console.error("[Cron] Follow-up failed for appt", appt.id, err);
    }
  }
}

// ── 3. Drip sequence executor ────────────────────────────────────────────────

async function sequenceCron(): Promise<void> {
  const { data: dueEnrollments } = await supabase
    .from("sequence_enrollments")
    .select(`
      id, current_step, sequence_id,
      sequences(steps, organization_id),
      contacts(phone, name, custom_attributes)
    `)
    .eq("status", "active")
    .lte("next_send_at", new Date().toISOString());

  for (const enrollment of dueEnrollments ?? []) {
    const seqRaw = enrollment.sequences as unknown;
    const sequence = (Array.isArray(seqRaw) ? seqRaw[0] : seqRaw) as { steps: unknown[]; organization_id: string } | null;
    const ctRaw = enrollment.contacts as unknown;
    const contact  = (Array.isArray(ctRaw) ? ctRaw[0] : ctRaw) as { phone: string; name: string } | null;
    if (!sequence || !contact) continue;

    const steps = sequence.steps as Array<{
      delay_hours: number;
      template_name?: string;
      language?: string;
      variables?: Record<string, string>;
      message?: string;
    }>;

    const step = steps[enrollment.current_step as number];
    if (!step) {
      await supabase
        .from("sequence_enrollments")
        .update({ status: "completed" })
        .eq("id", enrollment.id);
      continue;
    }

    const tenant = await getTenant(sequence.organization_id);
    if (!tenant) continue;

    try {
      if (step.template_name) {
        await sendTemplateMessage(
          tenant,
          contact.phone,
          step.template_name,
          step.language ?? "en",
          { body: Object.values(step.variables ?? {}).map((v) => ({ type: "text", text: String(v) })) }
        );
      } else if (step.message) {
        await sendTextMessage(tenant, contact.phone, step.message);
      }

      const nextStep = steps[(enrollment.current_step as number) + 1];
      await supabase
        .from("sequence_enrollments")
        .update({
          current_step: (enrollment.current_step as number) + 1,
          next_send_at: nextStep
            ? new Date(Date.now() + nextStep.delay_hours * 3600 * 1000).toISOString()
            : null,
          status: nextStep ? "active" : "completed",
        })
        .eq("id", enrollment.id);
    } catch (err) {
      console.error("[Cron] Sequence step failed for enrollment", enrollment.id, err);
    }
  }
}

// ── 4. SLA breach monitor ────────────────────────────────────────────────────

async function slaBreachCron(): Promise<void> {
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, title, priority, organization_id")
    .not("status", "in", '("resolved")')
    .lt("sla_breach_at", new Date().toISOString())
    .not("metadata->>sla_breach_notified", "eq", "true");

  for (const ticket of tickets ?? []) {
    console.warn(
      `[SLA Breach] Ticket ${ticket.id} (${ticket.priority}) breached SLA — org: ${ticket.organization_id}`
    );
    await supabase
      .from("support_tickets")
      .update({ metadata: { sla_breach_notified: true } })
      .eq("id", ticket.id);

    await supabase.from("automation_logs").insert({
      organization_id: ticket.organization_id,
      entity_type: "ticket",
      entity_id: ticket.id,
      action: "sla_breach",
      result: "escalated",
      metadata: { priority: ticket.priority },
    });
  }
}

// ── 5. Campaign scheduler ────────────────────────────────────────────────────

async function campaignSchedulerCron(): Promise<void> {
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, organization_id, template_id, whatsapp_templates(template_name, language, status)")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  for (const campaign of campaigns ?? []) {
    const tplRaw = campaign.whatsapp_templates as unknown;
    const tpl = (Array.isArray(tplRaw) ? tplRaw[0] : tplRaw) as {
      template_name: string;
      language: string;
      status: string;
    } | null;

    if (tpl?.status !== "APPROVED") {
      console.warn(`[Cron] Skipping campaign ${campaign.id} — template not APPROVED`);
      continue;
    }

    // Delegate to campaign routes queue logic — import here to avoid circular deps
    const { campaignQueue } = await import("../lib/queue");
    if (!campaignQueue) {
      console.warn("[Cron] Campaign queue not available — skipping campaign dispatch (no REDIS_URL)");
      continue;
    }

    const { data: recipients } = await supabase
      .from("campaign_recipients")
      .select("id, phone, variables")
      .eq("campaign_id", campaign.id)
      .eq("status", "pending");

    if (!recipients?.length) continue;

    await supabase
      .from("campaigns")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", campaign.id);

    const RATE = 10;
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      await campaignQueue.add(
        "send-campaign-message",
        {
          campaignId: campaign.id,
          recipientId: r.id as string,
          phone: r.phone as string,
          variables: (r.variables ?? {}) as Record<string, string>,
          templateName: tpl.template_name,
          language: tpl.language,
          organizationId: campaign.organization_id as string,
        },
        { delay: Math.floor(i / RATE) * 1000 }
      );
    }
  }
}

// ── 6. Flow session cleanup (abandon stale sessions > 24h) ───────────────────

async function sessionCleanupCron(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const result = await supabase
    .from("workflow_runs")
    .update({ status: "failed" })
    .eq("status", "running")
    .lt("last_activity_at", cutoff)
    .select("id");

  const abandoned = result.data?.length ?? 0;
  if (abandoned > 0) {
    console.log(`[Cron] Abandoned ${abandoned} stale flow sessions`);
  }
}

// ── Bootstrap all crons ──────────────────────────────────────────────────────

export function startCronJobs(): void {
  // Every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    void appointmentReminderCron().catch(console.error);
    void appointmentFollowUpCron().catch(console.error);
    void sequenceCron().catch(console.error);
    void slaBreachCron().catch(console.error);
    void campaignSchedulerCron().catch(console.error);
    void sessionCleanupCron().catch(console.error);
  });

  console.log("[Crons] All 6 scheduled jobs started (every 15 minutes)");
}
