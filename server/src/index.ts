import "dotenv/config";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import { webhookRouter }      from "./routes/webhook";
import { whatsappRouter }     from "./routes/whatsapp";
import { contactsRouter }     from "./routes/contacts";
import { campaignsRouter }    from "./routes/campaigns";
import { flowsRouter }        from "./routes/flows";
import { templatesRouter }    from "./routes/templates";
import { sequencesRouter }    from "./routes/sequences";
import { appointmentsRouter } from "./routes/appointments";
import { ticketsRouter }      from "./routes/tickets";
import { orgsRouter }         from "./routes/orgs";
import { analyticsRouter }    from "./routes/analytics";

import { requireAuth }                              from "./middleware/auth";
import { apiLimiter, webhookLimiter, sendLimiter }  from "./middleware/rateLimiter";

import { startCampaignWorker } from "./workers/campaign.worker";
import { startCronJobs }       from "./crons/scheduler";

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [
    "http://localhost:3000",
  ],
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────────────────────

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check (no auth, no rate limit — for uptime monitors) ───────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "automateos-server", ts: new Date().toISOString() });
});

// ── Meta webhook — no JWT (Meta calls this directly, has its own verify token) ─

app.use("/api/webhook/whatsapp", webhookLimiter, webhookRouter);

// ── Org creation — JWT required but no existing org needed ────────────────────

app.use("/api/orgs", apiLimiter, orgsRouter);

// ── All data routes — JWT required, org scoped, rate limited ─────────────────

app.use("/api/analytics",          apiLimiter,  requireAuth, analyticsRouter);
app.use("/api/workspace/whatsapp", apiLimiter,  requireAuth, whatsappRouter);
app.use("/api/contacts",           apiLimiter,  requireAuth, contactsRouter);
app.use("/api/campaigns",          sendLimiter, requireAuth, campaignsRouter);
app.use("/api/flows",              apiLimiter,  requireAuth, flowsRouter);
app.use("/api/templates",          apiLimiter,  requireAuth, templatesRouter);
app.use("/api/sequences",          apiLimiter,  requireAuth, sequencesRouter);
app.use("/api/appointments",       apiLimiter,  requireAuth, appointmentsRouter);
app.use("/api/tickets",            apiLimiter,  requireAuth, ticketsRouter);

// ── Global error handler ──────────────────────────────────────────────────────

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err);
  const message    = err instanceof Error ? err.message : "Internal server error";
  const statusCode = (err as { status?: number })?.status ?? 500;
  res.status(statusCode).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 AutomateOS Server running on port ${PORT}`);
  console.log(`   Webhook:  http://localhost:${PORT}/api/webhook/whatsapp`);
  console.log(`   Health:   http://localhost:${PORT}/health`);
  console.log(`   Auth:     Supabase JWT (Bearer token)\n`);

  startCampaignWorker();
  startCronJobs();
});

export default app;
