export interface ParsedMessage {
  wabaId: string;
  fromPhone: string;
  text: string;
  waMessageId: string;
  timestamp: number;
}

export function parseWhatsAppPayload(payload: unknown): ParsedMessage[] {
  const out: ParsedMessage[] = [];
  const entries = (payload as any)?.entry ?? [];
  for (const entry of entries) {
    for (const change of (entry.changes ?? [])) {
      const value = change.value ?? {};
      const wabaId: string = value.metadata?.phone_number_id ?? "";
      for (const msg of (value.messages ?? [])) {
        out.push({
          wabaId,
          fromPhone: msg.from,
          text: msg.type === "text" ? (msg.text?.body ?? "") : `[${msg.type}]`,
          waMessageId: msg.id,
          timestamp: parseInt(msg.timestamp ?? "0", 10),
        });
      }
    }
  }
  return out;
}
