"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookOpen, Plus, Trash2, Sparkles, Loader2, Send } from "lucide-react";
import {
  ingestText, listDocs, deleteDoc, answerWithContext, seedDemoKnowledge,
  type KnowledgeDoc,
} from "@/lib/ai/knowledge";
import { toast } from "sonner";

const TENANT = "org_demo";

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    void (async () => {
      await seedDemoKnowledge(TENANT);
      setDocs(listDocs(TENANT));
    })();
  }, []);

  async function onIngest() {
    if (!title.trim() || !body.trim()) return toast.error("Title and content are required");
    setBusy(true);
    try {
      await ingestText(TENANT, title.trim(), body, { source: "manual" });
      setDocs(listDocs(TENANT));
      setTitle(""); setBody(""); setOpen(false);
      toast.success("Indexed and ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAsk() {
    if (!question.trim()) return;
    setThinking(true); setAnswer("");
    try {
      const a = await answerWithContext(TENANT, question);
      setAnswer(a);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge base"
        description="Upload your docs. Your AI replies, FAQ bot, and Copilot answer from them."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => setAskOpen(true)}>Ask AI</Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Add document</Button>
          </div>
        }
      />

      {docs.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No documents yet" description="Add your pricing, refund policy, FAQs - anything your team answers repeatedly." action={<Button onClick={() => setOpen(true)}>Add your first doc</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1">{d.title}</CardTitle>
                  <Badge tone="success" dot>{d.status}</Badge>
                </div>
                <CardDescription>
                  {d.chunks} chunks · {(d.bytes / 1024).toFixed(1)} KB · {new Date(d.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {d.tags.map((t) => <Badge key={t} tone="muted">#{t}</Badge>)}
                  <Badge tone="info">{d.source}</Badge>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-3 w-3" />} onClick={() => { deleteDoc(TENANT, d.id); setDocs(listDocs(TENANT)); }}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add document">
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refund policy" />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste docs, FAQs, transcripts, scripts…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={onIngest}>{busy ? "Indexing…" : "Ingest"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={askOpen} onClose={() => setAskOpen(false)} title="Ask your knowledge base">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. What's the refund policy after 14 days?" onKeyDown={(e) => e.key === "Enter" && onAsk()} />
            <Button onClick={onAsk} loading={thinking} leftIcon={!thinking && <Send className="h-4 w-4" />}>Ask</Button>
          </div>
          <div className="min-h-[120px] rounded-lg border bg-muted/40 p-3 text-sm">
            {thinking ? <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</span> : answer || <span className="text-muted-foreground">Answers will appear here.</span>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
