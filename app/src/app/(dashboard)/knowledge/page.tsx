"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookOpen, Plus, Trash2, Sparkles, Loader2, Send, Eye, EyeOff } from "lucide-react";
import { answerWithContext } from "@/lib/ai/knowledge";
import {
  getKnowledgeArticles,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
} from "@/lib/api";
import type { KnowledgeArticle } from "@/lib/types";
import { toast } from "sonner";

const DEMO_TENANT = "org_demo";

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [busy, setBusy] = useState(false);

  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    getKnowledgeArticles().then(setArticles).catch(() => setArticles([]));
  }, []);

  async function onCreate() {
    if (!title.trim() || !body.trim()) return toast.error("Title and content are required");
    setBusy(true);
    try {
      const article = await createKnowledgeArticle({ title: title.trim(), content: body, category });
      setArticles((prev) => [article, ...prev]);
      setTitle(""); setBody(""); setCategory("General"); setOpen(false);
      toast.success("Article saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishToggle(id: string, current: boolean) {
    await updateKnowledgeArticle(id, { published: !current });
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, published: !current } : a));
  }

  async function handleDelete(id: string) {
    await deleteKnowledgeArticle(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
    toast.success("Article deleted");
  }

  async function onAsk() {
    if (!question.trim()) return;
    setThinking(true); setAnswer("");
    try {
      const a = await answerWithContext(DEMO_TENANT, question);
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
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Add article</Button>
          </div>
        }
      />

      {articles.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No articles yet" description="Add your pricing, refund policy, FAQs - anything your team answers repeatedly." action={<Button onClick={() => setOpen(true)}>Add your first article</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1">{a.title}</CardTitle>
                  <Badge tone={a.published ? "success" : "muted"} dot>{a.published ? "Published" : "Draft"}</Badge>
                </div>
                <CardDescription>
                  {a.category} · {new Date(a.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.content}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {a.tags.map((t) => <Badge key={t} tone="muted">#{t}</Badge>)}
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost"
                    leftIcon={a.published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    onClick={() => handlePublishToggle(a.id, a.published)}>
                    {a.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-3 w-3" />} onClick={() => handleDelete(a.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add article">
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refund policy" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>General</option>
              <option>Policy</option>
              <option>Product</option>
              <option>Support</option>
              <option>Pricing</option>
            </Select>
          </div>
          <div>
            <Label>Content</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste docs, FAQs, transcripts, scripts…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={onCreate}>{busy ? "Saving…" : "Save article"}</Button>
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
