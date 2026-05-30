/**
 * Job queue abstraction.
 *
 * In production: BullMQ on Redis, or Inngest, or Trigger.dev.
 * Here: an in-memory queue that runs handlers asynchronously, with retry, scheduling, and DLQ.
 */

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "dead";

export interface Job<T = unknown> {
  id: string;
  name: string;
  payload: T;
  tenantId?: string;
  attempts: number;
  maxAttempts: number;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  runAt?: string;
}

type Handler<T = unknown> = (payload: T, job: Job<T>) => Promise<void> | void;

const handlers = new Map<string, Handler>();
const jobs: Job[] = [];
const dlq: Job[] = [];

export function registerHandler<T>(name: string, fn: Handler<T>) {
  handlers.set(name, fn as Handler);
}

export function enqueue<T>(name: string, payload: T, opts: { tenantId?: string; maxAttempts?: number; runAt?: Date } = {}): Job<T> {
  const job: Job<T> = {
    id: `job_${Math.random().toString(36).slice(2, 12)}`,
    name,
    payload,
    tenantId: opts.tenantId,
    attempts: 0,
    maxAttempts: opts.maxAttempts ?? 3,
    status: "queued",
    createdAt: new Date().toISOString(),
    runAt: (opts.runAt ?? new Date()).toISOString(),
  };
  jobs.unshift(job);
  if (jobs.length > 1000) jobs.pop();
  // schedule
  const delay = Math.max(0, (opts.runAt?.getTime() ?? Date.now()) - Date.now());
  setTimeout(() => void runJob(job.id), delay);
  return job;
}

async function runJob(id: string) {
  const job = jobs.find((j) => j.id === id);
  if (!job || job.status !== "queued") return;
  const fn = handlers.get(job.name);
  if (!fn) {
    job.status = "failed";
    job.error = `No handler for "${job.name}"`;
    job.finishedAt = new Date().toISOString();
    return;
  }
  job.attempts += 1;
  job.status = "running";
  job.startedAt = new Date().toISOString();
  try {
    await fn(job.payload, job);
    job.status = "succeeded";
    job.finishedAt = new Date().toISOString();
  } catch (err) {
    job.error = err instanceof Error ? err.message : String(err);
    if (job.attempts < job.maxAttempts) {
      job.status = "queued";
      // exponential backoff: 1s, 4s, 9s
      const delay = Math.pow(job.attempts, 2) * 1000;
      setTimeout(() => void runJob(job.id), delay);
    } else {
      job.status = "dead";
      job.finishedAt = new Date().toISOString();
      dlq.unshift(job);
      if (dlq.length > 500) dlq.pop();
    }
  }
}

export function listJobs(tenantId?: string, limit = 50): Job[] {
  const list = tenantId ? jobs.filter((j) => j.tenantId === tenantId) : jobs;
  return list.slice(0, limit);
}

export function listDeadLetter(tenantId?: string, limit = 50): Job[] {
  const list = tenantId ? dlq.filter((j) => j.tenantId === tenantId) : dlq;
  return list.slice(0, limit);
}

export function retryJob(id: string): Job | undefined {
  const j = dlq.find((d) => d.id === id);
  if (!j) return undefined;
  j.attempts = 0;
  j.status = "queued";
  j.error = undefined;
  setTimeout(() => void runJob(j.id), 100);
  return j;
}

// Built-in handlers (demo). Real n8n calls happen elsewhere via lib/n8n.ts.
registerHandler("noop", async () => { /* nothing */ });
registerHandler("echo", async (p) => { void p; });
