"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Key, Plus, Copy, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_SCOPES = [
  "leads:read", "leads:write",
  "contacts:read", "contacts:write",
  "conversations:read", "conversations:write",
  "campaigns:read", "campaigns:write",
];

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export default function ApiKeysPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["leads:read"]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [revealKey, setRevealKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []));
  }, []);

  async function handleCreate() {
    if (!name.trim()) return toast.error("Name is required");
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scopes }),
    });
    const d = await res.json();
    if (d.key) {
      setRevealKey(d.key);
      setKeys((prev) => [d.meta, ...prev]);
    } else {
      toast.error(d.error ?? "Failed to create key");
    }
    setOpen(false);
    setName("");
    setScopes(["leads:read"]);
  }

  async function handleRevoke(id: string) {
    await fetch("/api/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success("Key revoked");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API keys"
        description="Programmatic access for integrations, scripts, and your own apps."
        actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>New key</Button>}
      />

      {keys.length === 0 ? (
        <EmptyState icon={<Key className="h-6 w-6" />} title="No API keys yet" description="Create one to start automating from outside AutomateOS." action={<Button onClick={() => setOpen(true)}>Create your first key</Button>} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active keys</CardTitle>
            <CardDescription>Each key is scoped, audited, and can be revoked at any time.</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Name</th><th>Prefix</th><th>Scopes</th><th>Last used</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-t">
                    <td className="py-3 font-medium">{k.name}</td>
                    <td><code className="text-xs">{k.key_prefix}</code></td>
                    <td className="space-x-1">{k.scopes.slice(0, 2).map((s) => <Badge key={s} tone="muted">{s}</Badge>)}{k.scopes.length > 2 && <span className="text-xs text-muted-foreground">+{k.scopes.length - 2}</span>}</td>
                    <td className="text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}</td>
                    <td>{k.revoked_at ? <Badge tone="destructive">Revoked</Badge> : <Badge tone="success">Active</Badge>}</td>
                    <td className="text-right">
                      {!k.revoked_at && (
                        <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-3 w-3" />} onClick={() => handleRevoke(k.id)}>
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create API key">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production, Zapier, Mobile app" />
          </div>
          <div>
            <Label>Scopes</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {AVAILABLE_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 rounded-lg border p-2">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={(e) => setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s))} />
                  <span className="font-mono text-xs">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create key</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!revealKey} onClose={() => setRevealKey(null)} title="Save this key now">
        {revealKey && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground"><ShieldCheck className="mr-1 inline h-4 w-4" /> This is the only time we&apos;ll show you the full secret.</p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted p-3 font-mono text-sm">
              <code className="flex-1 break-all">{revealKey}</code>
              <Button size="sm" variant="ghost" leftIcon={<Copy className="h-3 w-3" />} onClick={() => { navigator.clipboard.writeText(revealKey); toast.success("Copied"); }}>Copy</Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setRevealKey(null)}>I&apos;ve saved it</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
