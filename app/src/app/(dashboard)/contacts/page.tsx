"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, SlidersHorizontal, Download, ChevronDown,
  Pencil, Trash2, X, AlertCircle, CheckCircle2,
  Plus, Upload, ChevronLeft, ChevronRight, UserCircle2,
} from "lucide-react";
import {
  getContacts, createContact, updateContact, deleteContact, importContactsFromCSV,
} from "@/lib/api";
import type { Contact } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ── Add/Edit Contact modal ────────────────────────────────────────────────────

function ContactFormModal({ initial, onSave, onClose }: {
  initial?: Contact | null;
  onSave: (d: { name: string; phone: string; email: string; tags: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [err, setErr] = useState("");

  function submit() {
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!phone.trim()) { setErr("Phone is required."); return; }
    onSave({ name: name.trim(), phone: phone.trim(), email: email.trim(), tags: tags.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{initial ? "Edit Contact" : "Add Contact"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        {err && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />{err}
          </div>
        )}
        <div className="space-y-3">
          {[
            { label: "Full Name *", val: name, set: setName, ph: "Aarav Sharma", type: "text" },
            { label: "Phone (E.164) *", val: phone, set: setPhone, ph: "+919876543210", type: "text" },
            { label: "Email", val: email, set: setEmail, ph: "aarav@example.com", type: "email" },
            { label: "Tags (comma-separated)", val: tags, set: setTags, ph: "customer, vip", type: "text" },
          ].map(({ label, val, set, ph, type }) => (
            <div key={label}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
              <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} type={type}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancel</button>
          <button onClick={submit} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            {initial ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CSV Import modal ──────────────────────────────────────────────────────────

function ImportModal({ onDone }: { onDone: (imported: number) => void }) {
  const [status, setStatus] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [errMsg, setErrMsg] = useState("");

  async function handleFile(file: File) {
    setStatus("parsing");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines[0]!.toLowerCase().split(",").map((h) => h.trim());
      const ni = header.findIndex((h) => h.includes("name"));
      const pi = header.findIndex((h) => h.includes("phone") || h.includes("mobile"));
      const ei = header.findIndex((h) => h.includes("email"));
      const ti = header.findIndex((h) => h.includes("tag"));
      if (ni < 0 || pi < 0) { setErrMsg('CSV must have "name" and "phone" columns.'); setStatus("error"); return; }
      const rows = lines.slice(1).map((l) => {
        const c = l.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
        return { name: c[ni] ?? "", phone: c[pi] ?? "", email: ei >= 0 ? c[ei] : undefined, tags: ti >= 0 ? c[ti] : undefined };
      }).filter((r) => r.name || r.phone);
      const res = await importContactsFromCSV(rows);
      setResult({ imported: res.imported, skipped: res.skipped, errors: res.errors });
      setStatus("done");
    } catch { setErrMsg("Failed to parse file."); setStatus("error"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Import Contacts</h2>
          <button onClick={() => onDone(result?.imported ?? 0)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        {status === "idle" && (
          <>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/40 py-10 transition hover:border-primary/60 hover:bg-primary/5">
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Click to upload CSV / Excel</p>
              <p className="mt-1 text-xs text-muted-foreground">Required columns: <span className="font-mono">name, phone</span></p>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
            <div className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground font-mono">
              name,phone,email,tags<br />
              Aarav Sharma,+919876543210,a@g.com,vip
            </div>
          </>
        )}
        {status === "parsing" && (
          <div className="flex flex-col items-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3" />
            <p className="text-sm text-muted-foreground">Importing…</p>
          </div>
        )}
        {status === "done" && result && (
          <div className="space-y-3">
            <div className="flex gap-2 rounded-xl bg-success/10 p-4">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Import complete</p>
                <p className="text-xs text-muted-foreground mt-0.5">{result.imported} imported · {result.skipped} skipped · {result.errors} errors</p>
              </div>
            </div>
            <button onClick={() => onDone(result.imported)} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Done</button>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <div className="flex gap-2 rounded-xl bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{errMsg}</p>
            </div>
            <button onClick={() => setStatus("idle")} className="w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-secondary">Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Contacts dropdown ─────────────────────────────────────────────────────

function AddContactsDropdown({ onManual, onImport }: { onManual: () => void; onImport: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        Add Contacts
        <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <button
              onClick={() => { setOpen(false); onManual(); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
            >
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              Add Manually
            </button>
            <button
              onClick={() => { setOpen(false); onImport(); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              Import CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showRppDrop, setShowRppDrop] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setContacts(await getContacts());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toast$(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(d: { name: string; phone: string; email: string; tags: string }) {
    const tagList = d.tags ? d.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (editing) {
      await updateContact(editing.id, { name: d.name, phone: d.phone, email: d.email || null, tags: tagList });
      toast$("Contact updated.");
    } else {
      await createContact({ name: d.name, phone: d.phone, email: d.email || null, tags: tagList });
      toast$("Contact added.");
    }
    setShowForm(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    await deleteContact(id);
    toast$("Contact deleted.");
    load();
  }

  function exportCSV() {
    const rows = [
      ["Name", "Phone Number", "Email ID", "Tags", "Added On", "Updated On"],
      ...filtered.map((c) => [c.name, c.phone, c.email ?? "NA", c.tags.join(";"), fmtDateTime(c.created_at), fmtDateTime(c.last_messaged_at)]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "contacts.csv";
    a.click();
  }

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => setPage(1), [search]);

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
        <h1 className="text-lg font-semibold text-foreground">Contacts</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in contacts"
              className="w-60 rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filters */}
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Filters
          </button>

          {/* Export */}
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            <Download className="h-4 w-4 text-muted-foreground" />
            Export
          </button>

          {/* Add Contacts dropdown */}
          <AddContactsDropdown
            onManual={() => { setEditing(null); setShowForm(true); }}
            onImport={() => setShowImport(true)}
          />
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-24">Actions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Phone Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Email ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Lead Assignment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Added On</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Updated On</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-sm text-muted-foreground">
                    {search ? "No contacts match your search." : "No contacts yet. Import a CSV or add manually."}
                  </td>
                </tr>
              ) : (
                paginated.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-secondary/30 transition-colors group">
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditing(c); setShowForm(true); }}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.phone.replace("+", "")}</td>

                    {/* Email */}
                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? "NA"}</td>

                    {/* Lead Assignment */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 w-fit">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">U</span>
                        <span className="text-xs font-medium text-foreground">Unassigned</span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </td>

                    {/* Added On */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(c.created_at)}</td>

                    {/* Updated On */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(c.last_messaged_at ?? c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <div className="relative">
            <button
              onClick={() => setShowRppDrop((v) => !v)}
              className="flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-sm text-foreground hover:bg-secondary"
            >
              {rowsPerPage} <ChevronDown className="h-3 w-3" />
            </button>
            {showRppDrop && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRppDrop(false)} />
                <div className="absolute bottom-full left-0 z-50 mb-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {ROWS_PER_PAGE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => { setRowsPerPage(n); setPage(1); setShowRppDrop(false); }}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-secondary ${rowsPerPage === n ? "text-primary font-semibold" : "text-foreground"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {filtered.length === 0 ? "0" : `${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, filtered.length)}`} of {filtered.length.toLocaleString()}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded p-1 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded p-1 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <ContactFormModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {showImport && (
        <ImportModal
          onDone={(n) => {
            setShowImport(false);
            if (n > 0) { toast$(`${n} contacts imported.`); load(); }
          }}
        />
      )}
    </div>
  );
}
