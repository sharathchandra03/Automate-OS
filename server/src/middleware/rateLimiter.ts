import rateLimit from "express-rate-limit";

/**
 * General API rate limit — 300 requests per minute per IP.
 * In production, replace IP-based keying with org-based keying
 * so one org can't starve another even behind a shared proxy.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down" },
  keyGenerator: (req) => {
    // Prefer org-scoped limiting once auth middleware runs
    return (req as Express.Request & { orgId?: string }).orgId
      ?? req.ip
      ?? "unknown";
  },
});

/**
 * Webhook limiter — higher limit, Meta can send bursts.
 * 1000 req/min per IP (Meta retries aggressively on 429).
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Webhook rate limit exceeded" },
});

/**
 * Message sending limiter — 60 outbound API calls per minute per org.
 * Prevents a runaway campaign from burning the org's Meta rate quota.
 */
export const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Message send rate limit exceeded (60/min)" },
  keyGenerator: (req) => {
    return (req as Express.Request & { orgId?: string }).orgId ?? req.ip ?? "unknown";
  },
});
