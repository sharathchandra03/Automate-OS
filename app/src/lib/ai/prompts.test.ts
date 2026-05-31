import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/prompts";

describe("buildSystemPrompt", () => {
  it("returns base prompt when no context", () => {
    const p = buildSystemPrompt();
    expect(p).toContain("AutomateOS");
  });

  it("includes lead data when provided", () => {
    const p = buildSystemPrompt({
      recent_leads: [{ name: "Alice", status: "new", score: 80, channel: "whatsapp" }],
    });
    expect(p).toContain("Alice");
  });

  it("includes plan in prompt", () => {
    const p = buildSystemPrompt({ plan: "growth" });
    expect(p).toContain("growth");
  });
});
