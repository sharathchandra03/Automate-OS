/**
 * Unified AI provider abstraction.
 *
 * Application code calls `ai.complete()` and `ai.embed()`.
 * Providers (OpenAI / Anthropic / Gemini / Local / Mock) are interchangeable.
 *
 * Selection order (first usable wins):
 *   1. The provider explicitly passed in opts.
 *   2. Per-tenant override (future).
 *   3. Env-configured default.
 *   4. Mock provider (so the UI is always functional).
 */

export type AIProviderId = "openai" | "anthropic" | "gemini" | "local" | "mock";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIOptions {
  provider?: AIProviderId;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** Tenant id, used for usage tracking and per-tenant policy. */
  tenantId?: string;
  /** Feature key, used for usage attribution. */
  feature?: string;
}

export interface AIResult {
  text: string;
  json?: unknown;
  model: string;
  provider: AIProviderId;
  usage: { input: number; output: number; total: number };
  latencyMs: number;
  cached: boolean;
}

export interface AIProvider {
  id: AIProviderId;
  models: string[];
  complete(messages: AIMessage[], opts?: AIOptions): Promise<AIResult>;
  embed(texts: string[], opts?: AIOptions): Promise<number[][]>;
}

// ---------- Mock provider (always available) ----------

const mockProvider: AIProvider = {
  id: "mock",
  models: ["mock-fast", "mock-smart"],
  async complete(messages, opts) {
    const start = Date.now();
    const last = messages[messages.length - 1]?.content ?? "";
    const intent = guessIntent(last);
    const text = mockResponseFor(intent, last);
    const inputTok = Math.ceil(messages.reduce((a, m) => a + m.content.length, 0) / 4);
    const outputTok = Math.ceil(text.length / 4);
    return {
      text,
      json: opts?.jsonMode ? safeParseJson(text) : undefined,
      model: opts?.model ?? "mock-smart",
      provider: "mock",
      usage: { input: inputTok, output: outputTok, total: inputTok + outputTok },
      latencyMs: Date.now() - start,
      cached: false,
    };
  },
  async embed(texts) {
    // deterministic, low-quality "embedding" - fine for UI demos and unit tests
    return texts.map((t) => hashEmbedding(t, 384));
  },
};

// ---------- OpenAI provider (real, used when key present) ----------

const openaiProvider: AIProvider = {
  id: "openai",
  models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  async complete(messages, opts) {
    const start = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");
    const model = opts?.model ?? "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts?.temperature ?? 0.4,
        max_tokens: opts?.maxTokens ?? 800,
        response_format: opts?.jsonMode ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return {
      text,
      json: opts?.jsonMode ? safeParseJson(text) : undefined,
      model,
      provider: "openai",
      usage: {
        input: data.usage?.prompt_tokens ?? 0,
        output: data.usage?.completion_tokens ?? 0,
        total: data.usage?.total_tokens ?? 0,
      },
      latencyMs: Date.now() - start,
      cached: false,
    };
  },
  async embed(texts) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
    });
    if (!res.ok) throw new Error(`OpenAI embed ${res.status}`);
    const data = await res.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  },
};

// ---------- Anthropic provider ----------

const anthropicProvider: AIProvider = {
  id: "anthropic",
  models: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  async complete(messages, opts) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
    const start = Date.now();
    const model = opts?.model ?? "claude-haiku-4-5-20251001";
    const systemMsg = messages.find((m) => m.role === "system")?.content;
    const userMessages = messages.filter((m) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts?.maxTokens ?? 800,
        ...(systemMsg ? { system: systemMsg } : {}),
        messages: userMessages,
        temperature: opts?.temperature ?? 0.4,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    return {
      text,
      json: opts?.jsonMode ? safeParseJson(text) : undefined,
      model,
      provider: "anthropic",
      usage: {
        input: data.usage?.input_tokens ?? 0,
        output: data.usage?.output_tokens ?? 0,
        total: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      latencyMs: Date.now() - start,
      cached: false,
    };
  },
  async embed() {
    throw new Error("Anthropic does not provide an embeddings API — use OpenAI for embeddings");
  },
};

// ---------- Gemini provider ----------

const geminiProvider: AIProvider = {
  id: "gemini",
  models: ["gemini-2.0-flash", "gemini-1.5-flash"],
  async complete(messages, opts) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");
    const start = Date.now();
    const model = opts?.model ?? "gemini-2.0-flash";
    const systemMsg = messages.find((m) => m.role === "system")?.content;
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: userMessages,
          ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg }] } } : {}),
          generationConfig: {
            maxOutputTokens: opts?.maxTokens ?? 800,
            temperature: opts?.temperature ?? 0.4,
            ...(opts?.jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const usage = data.usageMetadata ?? {};
    return {
      text,
      json: opts?.jsonMode ? safeParseJson(text) : undefined,
      model,
      provider: "gemini",
      usage: {
        input: usage.promptTokenCount ?? 0,
        output: usage.candidatesTokenCount ?? 0,
        total: usage.totalTokenCount ?? 0,
      },
      latencyMs: Date.now() - start,
      cached: false,
    };
  },
  async embed() {
    throw new Error("Gemini embeddings not implemented — use OpenAI for embeddings");
  },
};

// ---------- Local provider (Ollama / custom) ----------

const localProvider: AIProvider = {
  id: "local",
  models: [],
  async complete() {
    throw new Error("Local AI provider not configured. Set OLLAMA_BASE_URL or use another provider.");
  },
  async embed() {
    throw new Error("Local AI provider not configured.");
  },
};

// ---------- Provider registry + chooser ----------

const PROVIDERS: Record<AIProviderId, AIProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  local: localProvider,
  mock: mockProvider,
};

function defaultProvider(): AIProvider {
  if (process.env.OPENAI_API_KEY) return PROVIDERS.openai;
  if (process.env.ANTHROPIC_API_KEY) return PROVIDERS.anthropic;
  if (process.env.GEMINI_API_KEY) return PROVIDERS.gemini;
  return PROVIDERS.mock;
}

export const ai = {
  async complete(messages: AIMessage[], opts: AIOptions = {}): Promise<AIResult> {
    const provider = opts.provider ? PROVIDERS[opts.provider] : defaultProvider();
    const r = await provider.complete(messages, opts);
    // Fire-and-forget usage tracking
    void recordUsage(opts.tenantId, opts.feature, r);
    return r;
  },
  async embed(texts: string[], opts: AIOptions = {}): Promise<number[][]> {
    const provider = opts.provider ? PROVIDERS[opts.provider] : defaultProvider();
    return provider.embed(texts, opts);
  },
  get providerId(): AIProviderId {
    return defaultProvider().id;
  },
  models(): string[] {
    return defaultProvider().models;
  },
};

// ---------- Helpers ----------

function safeParseJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return undefined; }
}

function guessIntent(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("qualify") || t.includes("score")) return "qualify";
  if (t.includes("draft") || t.includes("write")) return "draft";
  if (t.includes("summari")) return "summarize";
  if (t.includes("classify") || t.includes("category")) return "classify";
  if (t.includes("workflow") || t.includes("automation")) return "workflow";
  if (t.includes("brief") || t.includes("daily")) return "brief";
  return "answer";
}

function mockResponseFor(intent: string, _input: string): string {
  switch (intent) {
    case "qualify":
      return `{"score":78,"temperature":"warm","reasoning":"Has budget signals and explicit intent.","next_action":"Send budget-qualification questions then book a call."}`;
    case "draft":
      return "Hi {{name}} - thanks for reaching out. I have something that fits exactly what you described. Want to grab 15 min Wednesday?";
    case "summarize":
      return "Customer has been pleasant, asked about pricing twice, prefers WhatsApp, last contacted 2 days ago.";
    case "classify":
      return `{"category":"billing","priority":"high","sentiment":"frustrated"}`;
    case "workflow":
      return `{"name":"Lead-to-call","steps":["receive lead","AI qualify","book call","reminder","followup"]}`;
    case "brief":
      return "Today: 3 hot leads to call, 1 invoice overdue, 2 tickets aging > 24h. Best automation: WhatsApp follow-up (87% reply rate).";
    default:
      return "Got it - here's a clear, helpful answer based on what you shared.";
  }
}

function hashEmbedding(s: string, dim: number): number[] {
  // Deterministic pseudo-embedding (NOT for production semantic search)
  const out = new Array(dim).fill(0);
  for (let i = 0; i < s.length; i++) {
    out[i % dim] += (s.charCodeAt(i) % 17) / 17;
  }
  const mag = Math.sqrt(out.reduce((a, b) => a + b * b, 0)) || 1;
  return out.map((v) => v / mag);
}

// usage tracker is in ./usage.ts; lazy-import to avoid cycles
async function recordUsage(tenantId?: string, feature?: string, r?: AIResult) {
  if (!tenantId || !r) return;
  try {
    const { trackTokens } = await import("./usage");
    trackTokens(tenantId, feature ?? "unknown", r.provider, r.model, r.usage.total);
  } catch { /* noop */ }
}
