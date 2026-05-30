import { describe, it, expect } from "vitest";
import { isProtectedPath } from "@/middleware";

describe("middleware path matching", () => {
  it("allows public routes through", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/signup")).toBe(false);
    expect(isProtectedPath("/auth/callback")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/onboarding")).toBe(false);
  });

  it("allows webhook routes without auth", () => {
    expect(isProtectedPath("/api/webhooks/leads/abc123")).toBe(false);
    expect(isProtectedPath("/api/webhooks/n8n")).toBe(false);
    expect(isProtectedPath("/api/webhooks/whatsapp")).toBe(false);
  });

  it("protects dashboard routes", () => {
    expect(isProtectedPath("/overview")).toBe(true);
    expect(isProtectedPath("/leads")).toBe(true);
    expect(isProtectedPath("/inbox")).toBe(true);
    expect(isProtectedPath("/settings/channels")).toBe(true);
    expect(isProtectedPath("/api-keys")).toBe(true);
    expect(isProtectedPath("/billing")).toBe(true);
  });

  it("protects nested dashboard routes", () => {
    expect(isProtectedPath("/leads/lead_abc123")).toBe(true);
    expect(isProtectedPath("/contacts/labels")).toBe(true);
    expect(isProtectedPath("/settings/page")).toBe(true);
  });
});
