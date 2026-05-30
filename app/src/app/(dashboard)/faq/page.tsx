"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { deleteFAQ, getFAQ, upsertFAQ } from "@/lib/api";
import type { FAQItem } from "@/lib/types";

export default function FAQPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["faq"], queryFn: getFAQ });
  const [editing, setEditing] = React.useState<Partial<FAQItem> | null>(null);

  const save = useMutation({
    mutationFn: upsertFAQ,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faq"] }); toast.success("Saved"); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: deleteFAQ,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faq"] }); toast.success("Deleted"); },
  });

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    save.mutate({
      id: editing?.id,
      question: String(fd.get("q")),
      answer: String(fd.get("a")),
      enabled: fd.get("enabled") === "on",
    } as any);
  }

  return (
    <>
      <PageHeader
        title="FAQ Bot"
        description="Auto-answer common questions on WhatsApp, email, web. Hand off to humans when needed."
        actions={<Button onClick={() => setEditing({})} leftIcon={<Plus className="h-4 w-4" />}>Add FAQ</Button>}
      />

      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-accent/40 p-5 mb-6 flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></div>
        <div>
          <p className="font-semibold">FAQ Bot is live</p>
          <p className="text-sm text-muted-foreground">Auto-answered <b>{items.reduce((s, i) => s + i.uses, 0)}</b> questions across all channels. AI fallback enabled for unmatched queries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((it) => (
          <Card key={it.id}>
            <CardContent className="p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{it.question}</p>
                  {it.enabled ? <Badge tone="success" dot>Live</Badge> : <Badge tone="muted">Off</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{it.answer}</p>
                <p className="mt-2 text-xs text-muted-foreground">Used <b className="text-foreground">{it.uses}</b> times</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Button variant="ghost" size="icon" onClick={() => setEditing(it)} aria-label="Edit"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(it.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit FAQ" : "Add FAQ"}>
        <form onSubmit={onSave} className="space-y-3">
          <div><Label htmlFor="q">Question</Label><Input id="q" name="q" defaultValue={editing?.question} required /></div>
          <div><Label htmlFor="a">Answer</Label><Textarea id="a" name="a" rows={4} defaultValue={editing?.answer} required /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={editing?.enabled ?? true} className="h-4 w-4 rounded border-border" />
            Enable for auto-replies
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
