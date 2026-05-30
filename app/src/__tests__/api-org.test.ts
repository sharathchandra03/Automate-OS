import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/config", () => ({ HAS_SUPABASE: false }));

describe("getAnalytics (mock branch, no Supabase)", () => {
  it("returns a valid AnalyticsSummary shape", async () => {
    const { getAnalytics } = await import("@/lib/api");
    const result = await getAnalytics();
    expect(typeof result.leads_total).toBe("number");
    expect(typeof result.conversion_rate).toBe("number");
    expect(Array.isArray(result.weekly_leads)).toBe(true);
    expect(Array.isArray(result.funnel)).toBe(true);
  });
});

describe("importContactsFromCSV (mock branch)", () => {
  it("skips rows missing phone or name", async () => {
    const { importContactsFromCSV } = await import("@/lib/api");
    const result = await importContactsFromCSV([
      { name: "", phone: "+919876543210" },
      { name: "Alice", phone: "" },
      { name: "Bob", phone: "+911234567890" },
    ]);
    expect(result.errors).toBe(2);
    expect(result.imported).toBe(1);
    expect(result.status).toBe("done");
  });
});
