"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Send, Loader2, Wand2 } from "lucide-react";
import type { AIMessage } from "@/lib/ai/provider";

const SUGGESTIONS = [
  "Give me today's executive brief.",
  "Draft a WhatsApp message to win back a 60-day dormant lead.",
  "Suggest an automation to reduce no-shows.",
  "Summarize this lead: Priya R., budget 50L, 2BHK, Bandra.",
  "What's my top-performing channel this week?",
];

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: "assistant", content: "Hi 👋 I'm your AutomateOS Copilot. Ask me anything about your business, leads, or automations. I'll help you take action." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9_999, behavior: "smooth" }); }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    const next: AIMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const { reply } = await res.json();
      setMessages([...next, { role: "assistant", content: reply ?? "Sorry, something went wrong." }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `Sorry - I hit an error: ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Your business copilot - chat, draft, summarize, and ship."
        actions={<Badge tone="primary"><Sparkles className="h-3 w-3" /> AI</Badge>}
      />

      <Card>
        <CardContent className="flex h-[68vh] flex-col gap-3 p-4">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" /> thinking…
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => void send(s)} className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted">
                <Wand2 className="mr-1 inline h-3 w-3" /> {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder="Ask anything…" />
            <Button onClick={() => void send()} loading={busy} leftIcon={!busy && <Send className="h-4 w-4" />}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
