"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Download, Plus, Eye, Trash2,
  Tag, X, AlertCircle, CheckCircle2, ChevronDown, Users,
} from "lucide-react";
import { getContactLabels, createContactLabel, deleteContactLabel, exportLabelContacts } from "@/lib/api";
import type { ContactLabel, Contact } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZoneName: "short",
  }).replace(",", ",");
}

// ── View Label modal ──────────────────────────────────────────────────────────

function ViewLabelModal({ label, onClose }: { label: ContactLabel; onClose: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    exportLabelContacts(label.id).then((c) => { setContacts(c); setLoading(false); });
  }, [label.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{label.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{label.contact_count.toLocaleString()} contacts in this label</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No contacts to preview.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Phone</th>
                  <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/30">
                    <td className="py-2 font-medium text-foreground">{c.name}</td>
                    <td className="py-2 text-xs font-mono text-muted-foreground">{c.phone}</td>
                    <td className="py-2 text-xs text-muted-foreground">{c.email ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          Showing {contacts.length} of {label.contact_count.toLocaleString()} contacts (preview)
        </div>

        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Close</button>
      </div>
    </div>
  );
}

// ── Create Label modal ────────────────────────────────────────────────────────

function CreateLabelModal({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    if (!name.trim()) { setErr("Label name is required."); return; }
    onSave(name.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Create Label</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        {err && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />{err}
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Label Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Diet Patient"
            autoFocus
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancel</button>
          <button onClick={submit} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Create</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Contacts dropdown ─────────────────────────────────────────────────────

function AddContactsDropdown({ onCreateLabel }: { onCreateLabel: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
        <Plus className="h-4 w-4" />
        Add Contacts
        <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <button
              onClick={() => { setOpen(false); onCreateLabel(); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
            >
              <Tag className="h-4 w-4 text-muted-foreground" />
              New Label
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LabelsPage() {
  const [labels, setLabels] = useState<ContactLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<ContactLabel | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLabels(await getContactLabels());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toast$(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreate(name: string) {
    await createContactLabel(name);
    toast$(`Label "${name}" created.`);
    setShowCreate(false);
    load();
  }

  async function handleDelete(label: ContactLabel) {
    if (!confirm(`Delete label "${label.name}"? Contacts will not be deleted.`)) return;
    await deleteContactLabel(label.id);
    toast$(`Label "${label.name}" deleted.`);
    load();
  }

  async function handleExport(label: ContactLabel) {
    const contacts = await exportLabelContacts(label.id);
    const rows = [
      ["Name", "Phone", "Email"],
      ...contacts.map((c) => [c.name, c.phone, c.email ?? ""]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${label.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    toast$(`Exported "${label.name}".`);
  }

  const filtered = labels.filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8 flex flex-col h-screen bg-background">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg border ${toast.ok ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Labels</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in labels"
              className="w-56 rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Export all */}
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            <Download className="h-4 w-4 text-muted-foreground" />
            Export
          </button>

          <AddContactsDropdown onCreateLabel={() => setShowCreate(true)} />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Label</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Contacts</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Added on</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <Tag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{search ? "No labels match your search." : "No labels yet. Create a label to group contacts."}</p>
                    {!search && (
                      <button onClick={() => setShowCreate(true)} className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 mx-auto">
                        <Plus className="h-4 w-4" /> Create Label
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((label) => (
                  <tr key={label.id} className="border-b border-border hover:bg-secondary/30 transition-colors group">
                    {/* Label name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{label.name}</span>
                      </div>
                    </td>

                    {/* Contacts count */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{label.contact_count.toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Added on */}
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDateTime(label.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* View */}
                        <button
                          onClick={() => setViewing(label)}
                          className="text-primary hover:opacity-70 transition-opacity"
                          title="View contacts"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(label)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete label"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {/* Download */}
                        <button
                          onClick={() => handleExport(label)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Export as CSV"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {viewing && <ViewLabelModal label={viewing} onClose={() => setViewing(null)} />}
      {showCreate && <CreateLabelModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
