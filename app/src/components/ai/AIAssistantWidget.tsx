"use client";

/**
 * Floating AI Copilot - visible on every dashboard page.
 * Knows the current page (via window.location.pathname).
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ai, type AIMessage } from "@/lib/ai/provider";
import { getPrompt } from "@/lib/ai/prompts";
import { getVertical } from "@/lib/verticals";
import { cn } from "@/lib/utils";

const TENANT = "org_demo";

export function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: "assistant", content: "Hey 👋 I'm Copilot. Ask anything about this page or your data - I'll suggest the next step." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9_999, behavior: "smooth" }); }, [messages, open, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    const next: AIMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setBusy(true);
    try {
      const built = getPrompt("copilot.chat").build({
        vertical: getVertical("generic"),
        data: {
          page: typeof window === "undefined" ? "unknown" : window.location.pathname,
          message: content,
          summary: "AutomateOS floating Copilot",
        },
      });
      const r = await ai.complete(
        [{ role: "system", content: built.system }, ...next],
        { tenantId: TENANT, feature: "copilot.widget" },
      );
      setMessages([...next, { role: "assistant", content: r.text }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `Sorry - ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        aria-label="Open Copilot"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105",
          open && "bg-foreground text-background",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b p-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Copilot</p>
            <span className="ml-auto text-xs text-muted-foreground">{ai.providerId}</span>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" /> thinking…
                </div>
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 border-t p-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder="Ask anything…" />
            <Button size="sm" onClick={() => void send()} loading={busy} leftIcon={!busy && <Send className="h-3.5 w-3.5" />}>Send</Button>
          </div>
        </div>
      )}
    </>
  );
}
