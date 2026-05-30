/**
 * Prompt library - versioned, swappable, vertical-aware.
 *
 * Every AI feature in the app references a prompt by `key`.
 * Editing a prompt here is the only way to change AI behavior.
 */

import type { VerticalPack } from "../verticals";

export interface PromptDef {
  key: string;
  version: string;
  description: string;
  /** Build the system+user messages given context. */
  build: (ctx: PromptContext) => { system: string; user: string };
}

export interface PromptContext {
  vertical?: VerticalPack;
  brandVoice?: string;
  data: Record<string, unknown>;
}

const verticalSystem = (v?: VerticalPack) =>
  `${v?.aiPersona ?? "You are a helpful business assistant."} Respond in plain text unless asked for JSON.`;

export const PROMPTS: Record<string, PromptDef> = {
  "lead.qualify": {
    key: "lead.qualify",
    version: "1.2.0",
    description: "Score a lead 0-100, classify temperature, propose next action.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
You are scoring an inbound lead. Respond ONLY with valid JSON of shape:
{"score": number 0-100, "temperature":"hot|warm|cold", "reasoning": string, "next_action": string}`,
      user: `Lead:\n${JSON.stringify(ctx.data, null, 2)}`,
    }),
  },

  "ticket.classify": {
    key: "ticket.classify",
    version: "1.0.0",
    description: "Classify a support ticket by category, priority, sentiment.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
Classify this support ticket. Respond ONLY with valid JSON of shape:
{"category": string, "priority":"low|normal|high|urgent", "sentiment":"positive|neutral|frustrated|angry"}`,
      user: `Ticket:\n${JSON.stringify(ctx.data, null, 2)}`,
    }),
  },

  "campaign.draft": {
    key: "campaign.draft",
    version: "1.1.0",
    description: "Draft a campaign message in the brand voice.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
Brand voice: ${ctx.brandVoice ?? "warm, concise, professional"}.
Write a single message - no preamble. Use {{name}} placeholders. Max 2 sentences.`,
      user: `Goal: ${JSON.stringify(ctx.data)}`,
    }),
  },

  "faq.reply": {
    key: "faq.reply",
    version: "1.0.0",
    description: "Answer an FAQ from the knowledge base.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
Answer using ONLY the facts in CONTEXT. If unsure, say "Let me check with the team and get back to you." Keep replies under 3 sentences.`,
      user: `CONTEXT:\n${ctx.data.context}\n\nQUESTION:\n${ctx.data.question}`,
    }),
  },

  "insights.brief": {
    key: "insights.brief",
    version: "1.1.0",
    description: "Daily executive brief from KPIs and recent activity.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
Write a 4-bullet executive brief: wins, risks, top action, and a one-line "today's number". Be specific. Use real numbers from data.`,
      user: `Data:\n${JSON.stringify(ctx.data, null, 2)}`,
    }),
  },

  "workflow.suggest": {
    key: "workflow.suggest",
    version: "1.0.0",
    description: "Suggest a workflow given a business goal.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
You design automations. Respond ONLY with valid JSON:
{"name": string, "trigger": string, "steps":[{"action": string, "config": object}], "rationale": string}`,
      user: `Goal: ${ctx.data.goal}\nVertical: ${ctx.vertical?.id}`,
    }),
  },

  "lead.summarize": {
    key: "lead.summarize",
    version: "1.0.0",
    description: "Summarize all activity on a lead in 1 paragraph.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
Summarize this lead's history in <=4 sentences. Mention: source, intent, last action, and what to do next.`,
      user: `Lead:\n${JSON.stringify(ctx.data, null, 2)}`,
    }),
  },

  "anomaly.explain": {
    key: "anomaly.explain",
    version: "1.0.0",
    description: "Explain an anomaly detection result in human terms.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
Explain this anomaly to a busy operator in 1-2 sentences with one specific recommendation.`,
      user: `Anomaly:\n${JSON.stringify(ctx.data, null, 2)}`,
    }),
  },

  "copilot.chat": {
    key: "copilot.chat",
    version: "1.0.0",
    description: "Generic AI assistant chat with page context.",
    build: (ctx) => ({
      system: `${verticalSystem(ctx.vertical)}
You are the AutomateOS Copilot. The user is on page: ${ctx.data.page ?? "unknown"}.
Context summary: ${ctx.data.summary ?? "none"}.
Be specific, action-oriented, and offer to perform allowed actions when relevant.`,
      user: String(ctx.data.message ?? ""),
    }),
  },
};

export function getPrompt(key: string): PromptDef {
  const p = PROMPTS[key];
  if (!p) throw new Error(`Unknown prompt: ${key}`);
  return p;
}
