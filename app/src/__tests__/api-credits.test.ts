import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/config", () => ({ HAS_SUPABASE: false }));

beforeEach(() => { vi.resetModules(); });

describe("deductCredits (mock branch)", () => {
  it("returns ok:true and reduces balance when credits are sufficient", async () => {
    const { deductCredits, getWallet } = await import("@/lib/api");
    const before = await getWallet();
    const convBefore = before.conversation_credits;

    const result = await deductCredits("conversation", 1, "test msg");
    expect(result.ok).toBe(true);
    expect(result.wallet.conversation_credits).toBe(convBefore - 1);
  });

  it("returns ok:false when balance is zero", async () => {
    const { deductCredits, getWallet } = await import("@/lib/api");
    const { conversation_credits } = await getWallet();
    // drain the entire balance in one call
    await deductCredits("conversation", conversation_credits, "drain");
    const result = await deductCredits("conversation", 1, "over limit");
    expect(result.ok).toBe(false);
  });

  it("negative amount (refund) increases balance", async () => {
    const { deductCredits, getWallet } = await import("@/lib/api");
    const before = await getWallet();
    await deductCredits("conversation", -5, "refund");
    const after = await getWallet();
    expect(after.conversation_credits).toBe(before.conversation_credits + 5);
  });
});
