import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/config", () => ({ HAS_SUPABASE: false }));

describe("getCampaigns (mock branch)", () => {
  it("returns an array", async () => {
    const { getCampaigns } = await import("@/lib/api");
    const result = await getCampaigns();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("createCampaign (mock branch)", () => {
  it("adds campaign to the list", async () => {
    const { createCampaign, getCampaigns } = await import("@/lib/api");
    const before = (await getCampaigns()).length;
    await createCampaign({ name: "Test Campaign", channel: "whatsapp" });
    const after = (await getCampaigns()).length;
    expect(after).toBe(before + 1);
  });

  it("new campaign has status draft", async () => {
    const { createCampaign } = await import("@/lib/api");
    const c = await createCampaign({ name: "Draft Test", channel: "email" });
    expect(c.status).toBe("draft");
  });
});
