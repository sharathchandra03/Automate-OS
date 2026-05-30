import { Worker, Job } from "bullmq";
import supabase from "../lib/db";
import { sendTemplateMessage, WhatsAppAPIError } from "../lib/meta-api";
import { redisConnection, type CampaignJobData } from "../lib/queue";
import type { OrgChannel } from "../lib/db";

async function processCampaignJob(job: Job<CampaignJobData>): Promise<void> {
  const { campaignId, recipientId, phone, variables, templateName, language, organizationId } =
    job.data;

  // Load tenant WhatsApp credentials
  const { data: tenant } = await supabase
    .from("org_channels")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", "whatsapp")
    .eq("status", "active")
    .single<OrgChannel>();

  if (!tenant) {
    throw new Error(`No active WhatsApp channel for org ${organizationId}`);
  }

  // Build template variables in Meta format
  const bodyParams = Object.values(variables).map((v) => ({ type: "text", text: String(v) }));

  const messageId = await sendTemplateMessage(tenant, phone, templateName, language, {
    body: bodyParams,
  });

  // Update recipient status
  await supabase
    .from("campaign_recipients")
    .update({ status: "sent", message_id: messageId, sent_at: new Date().toISOString() })
    .eq("id", recipientId);

  // Increment campaign sent count atomically
  await supabase.rpc("increment_campaign_sent", { p_campaign_id: campaignId }).throwOnError();

  await checkCampaignCompletion(campaignId);
}

async function checkCampaignCompletion(campaignId: string): Promise<void> {
  const { count: pendingCount } = await supabase
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  if ((pendingCount ?? 0) === 0) {
    await supabase
      .from("campaigns")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
  }
}

async function handleJobError(
  error: unknown,
  job: Job<CampaignJobData>
): Promise<void> {
  if (!(error instanceof WhatsAppAPIError)) return;

  const { recipientId, phone, organizationId } = job.data;

  switch (error.code) {
    case 131026:
      // Number not on WhatsApp — mark invalid, don't retry
      await supabase
        .from("contacts")
        .update({ custom_attributes: { invalid_whatsapp: true } })
        .eq("organization_id", organizationId)
        .eq("phone", phone);

      await supabase
        .from("campaign_recipients")
        .update({ status: "failed", error_code: "131026" })
        .eq("id", recipientId);
      break;

    case 100:
      // Bad token — pause all campaigns for this org and alert
      console.error(`[Campaign Worker] Invalid token for org ${organizationId} — pausing campaigns`);
      await supabase
        .from("campaigns")
        .update({ status: "paused" })
        .eq("organization_id", organizationId)
        .eq("status", "running");
      break;

    case 130429: // Rate limit
    case 131056: // Pair rate limit
      throw error; // Let BullMQ retry with exponential backoff

    default:
      await supabase
        .from("campaign_recipients")
        .update({ status: "failed", error_code: String(error.code) })
        .eq("id", recipientId);
  }
}

export function startCampaignWorker(): Worker<CampaignJobData> | null {
  if (!redisConnection) {
    console.warn("[Campaign Worker] Skipped — no REDIS_URL configured.");
    return null;
  }

  const worker = new Worker<CampaignJobData>(
    "campaign-messages",
    processCampaignJob,
    { connection: redisConnection, concurrency: 10 }
  );

  worker.on("failed", async (job, err) => {
    if (job) await handleJobError(err, job).catch(console.error);
  });

  worker.on("error", (err) => {
    console.error("[Campaign Worker] Worker error:", err);
  });

  console.log("[Campaign Worker] Started — processing campaign-messages queue");
  return worker;
}
