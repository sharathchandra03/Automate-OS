import { describe, it, expect } from "vitest";
import { parseWhatsAppPayload } from "@/lib/whatsapp-parser";

const SAMPLE_PAYLOAD = {
  entry: [{
    changes: [{
      value: {
        metadata: { phone_number_id: "123456" },
        messages: [{
          id: "wamid.abc",
          from: "+919876543210",
          type: "text",
          text: { body: "Hello there!" },
          timestamp: "1716000000",
        }],
      },
    }],
  }],
};

describe("parseWhatsAppPayload", () => {
  it("extracts message from valid payload", () => {
    const msgs = parseWhatsAppPayload(SAMPLE_PAYLOAD);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe("Hello there!");
    expect(msgs[0].fromPhone).toBe("+919876543210");
    expect(msgs[0].wabaId).toBe("123456");
  });

  it("returns [] for empty payload", () => {
    expect(parseWhatsAppPayload({})).toHaveLength(0);
    expect(parseWhatsAppPayload(null)).toHaveLength(0);
  });

  it("handles non-text message types", () => {
    const payload = {
      entry: [{ changes: [{ value: {
        metadata: { phone_number_id: "x" },
        messages: [{ id: "y", from: "+1", type: "image", timestamp: "0" }],
      }}]}],
    };
    const msgs = parseWhatsAppPayload(payload);
    expect(msgs[0].text).toBe("[image]");
  });
});
