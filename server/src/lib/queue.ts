import { Queue } from "bullmq";
import IORedis from "ioredis";

export interface CampaignJobData {
  campaignId: string;
  recipientId: string;
  phone: string;
  variables: Record<string, string>;
  templateName: string;
  language: string;
  organizationId: string;
}

// Redis is optional — campaigns won't work without it, but the rest of the server will.
export const redisConnection: IORedis | null = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // required by BullMQ
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    })
  : null;

export const campaignQueue: Queue<CampaignJobData> | null = redisConnection
  ? new Queue("campaign-messages", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    })
  : null;

if (!redisConnection) {
  console.warn("[Queue] REDIS_URL not set — campaign queue disabled. Set REDIS_URL to enable campaigns.");
}
