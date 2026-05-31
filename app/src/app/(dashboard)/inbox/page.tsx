"use client";

/**
 * WhatsApp CRM Inbox - 3-panel layout
 * Left: contact list  |  Centre: chat thread  |  Right: contact details
 */

import { useRef, useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Search, Phone, Mail, Edit2, Copy, MoreHorizontal,
  ChevronDown, Star, Tag, UserCheck, Send, Paperclip,
  MessageCircle, Clock, CheckCheck, AlertCircle, Plus,
  X, Filter, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type TagColor = "red" | "yellow" | "green" | "gray" | "blue";

interface ContactTag {
  label: string;
  color: TagColor;
}

type MsgType = "text" | "buttons" | "system" | "template";

interface Msg {
  id: string;
  from: "me" | "them";
  type: MsgType;
  at: string;
  text?: string;
  buttons?: string[];
  sentVia?: string;
  read?: boolean;
}

interface Contact {
  id: string;
  name: string;
  phone: string;         // e.g. +919148862983
  flag: string;          // emoji flag
  lastMsg: string;
  lastAt: string;
  assignee: string | null;
  tags: ContactTag[];
  status: "active" | "expired" | "pending";
  unread: number;
  messages: Msg[];
  attrs: { name: string; phone: string; email: string };
  comments: string[];
}

// ── Demo data ────────────────────────────────────────────────────────────────

const CONTACTS: Contact[] = [
  {
    id: "c1", name: "Bhanu", phone: "+919535513344", flag: "🇮🇳",
    lastMsg: "Pregnancy", lastAt: "02:12 pm", assignee: null,
    tags: [{ label: "FRT Exceeded", color: "red" }, { label: "Pending", color: "yellow" }],
    status: "pending", unread: 2,
    messages: [
      { id: "m1", from: "them", type: "text", text: "Hi, I want to know about pregnancy care.", at: "12th May, 2026 10:00 AM", read: true },
      { id: "m2", from: "me", type: "buttons", text: "Hi {{Name}} 😊\nWelcome to Revive Hospitals, Indiranagar.\nWe help with:", buttons: ["PCOS or Hormonal", "Pregnancy", "Pediatric care", "General"], at: "12th May, 2026 10:01 AM", sentVia: "workflows" },
      { id: "m3", from: "them", type: "text", text: "Pregnancy", at: "12th May, 2026 10:02 AM", read: true },
    ],
    attrs: { name: "Bhanu", phone: "+919535513344", email: "na" },
    comments: [],
  },
  {
    id: "c2", name: "Aruna", phone: "+919148862983", flag: "🇮🇳",
    lastMsg: "yes", lastAt: "11:51 am",  assignee: null,
    tags: [{ label: "Expired", color: "red" }],
    status: "expired", unread: 0,
    messages: [
      { id: "m1", from: "them", type: "text", text: "PCOS or Hormonal", at: "12th May, 2026 11:48 AM", read: true },
      { id: "m2", from: "me", type: "buttons", text: "Since how long are you facing this?\n< 3 months\n3–12 months\n1+ year", buttons: ["3 Months", "3 to 12 months", "1 years", "child age", "main concern", "fever , vaccination", "connect shortly"], at: "12th May, 2026 11:50 AM", sentVia: "workflows" },
      { id: "m3", from: "them", type: "text", text: "yes", at: "12th May, 2026 11:51 AM", read: true },
    ],
    attrs: { name: "Aruna", phone: "+919148862983", email: "na" },
    comments: [],
  },
  {
    id: "c3", name: "Dr Hari", phone: "+919876543210", flag: "🇮🇳",
    lastMsg: "yes", lastAt: "11:14 am", assignee: null,
    tags: [{ label: "Expired", color: "red" }],
    status: "expired", unread: 0,
    messages: [
      { id: "m1", from: "them", type: "text", text: "General", at: "12th May, 2026 11:10 AM", read: true },
      { id: "m2", from: "me", type: "buttons", text: "Are you currently on any treatment?", buttons: ["yes", "No", "Default"], at: "12th May, 2026 11:12 AM", sentVia: "workflows" },
      { id: "m3", from: "them", type: "text", text: "yes", at: "12th May, 2026 11:14 AM", read: true },
    ],
    attrs: { name: "Dr Hari", phone: "+919876543210", email: "na" },
    comments: [],
  },
  {
    id: "c4", name: "Meena S.", phone: "+919900112233", flag: "🇮🇳",
    lastMsg: "Thanks for your Resp...", lastAt: "09:02 pm", assignee: null,
    tags: [],
    status: "active", unread: 1,
    messages: [
      { id: "m1", from: "them", type: "text", text: "Hello, I need help with my appointment.", at: "10th May, 2026 09:00 PM", read: true },
      { id: "m2", from: "me", type: "text", text: "Thanks for your response! Our team will reach you shortly.", at: "10th May, 2026 09:02 PM", read: true },
    ],
    attrs: { name: "Meena S.", phone: "+919900112233", email: "meena@example.com" },
    comments: ["Follow up required by tomorrow."],
  },
];

const TAG_COLORS: Record<TagColor, string> = {
  red:    "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  green:  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  gray:   "bg-muted text-muted-foreground",
  blue:   "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const supabase = createSupabaseBrowserClient();
  const [contacts, setContacts] = useState<Contact[]>(CONTACTS);
  const [activeId, setActiveId] = useState(CONTACTS[1].id);        // Aruna selected by default
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [comment, setComment] = useState("");
  const [editAttr, setEditAttr] = useState<null | "name" | "phone" | "email">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = contacts.find((c) => c.id === activeId)!;
  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  );
  const totalUnread = contacts.reduce((a, c) => a + c.unread, 0);

  // ── Send message ────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = reply.trim();
    if (!text || sending || active.status === "expired") return;
    setSending(true);

    const newMsg: Msg = { id: uid(), from: "me", type: "text", text, at: nowLabel(), read: false };
    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [...c.messages, newMsg], lastMsg: text, lastAt: "Just now" } : c,
      ),
    );
    setReply("");

    try {
      const res = await fetch("/api/comms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "whatsapp", to: active.phone, text }),
      });
      const data = await res.json();
      if (!data.ok) toast.error(data.error ?? "Failed to send");
      else toast.success("Sent via WhatsApp");
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }

  // Supabase Realtime — re-fetch when a new inbound message arrives
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        toast.info("New message received");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClose(contactId: string) {
    setContacts((prev) =>
      prev.map((c) => c.id === contactId ? { ...c, status: "expired" } : c)
    );
    toast.success("Conversation closed");
  }

  function addComment() {
    if (!comment.trim()) return;
    setContacts((prev) =>
      prev.map((c) => c.id === activeId ? { ...c, comments: [...c.comments, comment.trim()] } : c),
    );
    setComment("");
    toast.success("Comment added");
  }

  function updateAttr(field: "name" | "phone" | "email", value: string) {
    setContacts((prev) =>
      prev.map((c) => c.id === activeId ? { ...c, attrs: { ...c.attrs, [field]: value } } : c),
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8 flex h-[calc(100vh-64px)] overflow-hidden bg-muted">

      {/* ══ LEFT: Contact list ══════════════════════════════════════════════ */}
      <div className="flex w-[340px] shrink-0 flex-col border-r border-border bg-card">

        {/* WABA header */}
        <div className="flex items-center gap-2 border-b border-border bg-[#1a1a2e] px-3 py-2.5">
          <MessageCircle className="h-4 w-4 text-[#25D366] shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">(91)-9535513344</p>
            <p className="text-[10px] text-gray-400">WABA Number</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="text-gray-400 hover:text-white"><Plus className="h-4 w-4" /></button>
            <button className="text-gray-400 hover:text-white"><Filter className="h-4 w-4" /></button>
            <button className="text-gray-400 hover:text-white"><SlidersHorizontal className="h-4 w-4" /></button>
            <button className="text-gray-400 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-border p-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 border-r border-border pr-2 mr-1">
              Name/Phone <ChevronDown className="h-3 w-3" />
            </div>
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="Search by name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <div className="flex items-center gap-1 text-xs font-medium text-foreground">
            All Chats ({filtered.length})
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#5B5BF7] font-medium">
            {totalUnread > 0 && <span>{totalUnread} Unread</span>}
            <div className="relative h-4 w-7 rounded-full bg-[#5B5BF7] cursor-pointer">
              <div className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* Contact list */}
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.map((c, i) => {
            const showToday = i === 0;
            const showYesterday = i === 1;
            return (
              <li key={c.id}>
                {showToday && <div className="bg-muted px-3 py-1 text-[11px] text-muted-foreground font-medium">Today</div>}
                {showYesterday && <div className="bg-muted px-3 py-1 text-[11px] text-muted-foreground font-medium">Yesterday</div>}
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted ${activeId === c.id ? "bg-accent border-l-2 border-[#5B5BF7]" : ""}`}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B5BF7] text-sm font-bold text-white">
                      {c.name[0]}
                    </div>
                    {c.unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#25D366] text-[9px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{c.lastAt}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.lastMsg}</p>
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {c.assignee === null && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <UserCheck className="h-2.5 w-2.5" /> Unassigned
                        </span>
                      )}
                      {c.tags.map((t) => (
                        <span key={t.label} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG_COLORS[t.color]}`}>
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ══ CENTRE: Chat thread ═════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Thread header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5B5BF7] text-sm font-bold text-white shrink-0">
              {active.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground">{active.name} ({active.phone})</p>
                <button className="text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {active.status === "expired" && (
              <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">Expired</span>
            )}
            {active.status === "pending" && (
              <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400">Pending</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"><Star className="h-4 w-4" /></button>
            <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"><Tag className="h-4 w-4" /></button>
            <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-[#5B5BF7] hover:bg-accent"
            >
              {showDetails ? "CLOSE DETAILS ×" : "OPEN DETAILS →"}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {active.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
        </div>

        {/* Bottom bar */}
        {active.status === "expired" ? (
          <div className="shrink-0 border-t border-border bg-card">
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              <p>User initiated conversations lasts for 24 hours only. You can reopen conversation using a template, but unless user replies to you, you will not be able reply to them without a template message.</p>
              <button
                className="ml-auto shrink-0 rounded-lg bg-[#5B5BF7] px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
                onClick={() => toast.success("Template selector coming soon")}
              >
                Send Template
              </button>
            </div>
            {/* Comment box */}
            <div className="flex items-center gap-2 border-t border-border px-3 py-2">
              <input
                className="flex-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#5B5BF7] focus:outline-none"
                placeholder="Add a comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
              />
              <button onClick={addComment} className="text-[#5B5BF7] hover:text-indigo-700">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-t border-border bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <button className="text-muted-foreground hover:text-foreground"><Paperclip className="h-4 w-4" /></button>
              <input
                ref={inputRef}
                className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#5B5BF7] focus:outline-none"
                placeholder="Type a message…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={() => void handleSend()}
                disabled={!reply.trim() || sending}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5B5BF7] text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ RIGHT: Contact details ══════════════════════════════════════════ */}
      {showDetails && (
        <div className="flex w-[280px] shrink-0 flex-col border-l border-border bg-card overflow-y-auto">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 border-b border-border py-5">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5B5BF7] text-xl font-bold text-white">
                {active.name[0]}
              </div>
              <span className="absolute bottom-0 right-0 text-base">{active.flag}</span>
            </div>
            <p className="font-semibold text-foreground">{active.name}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>{active.flag}</span>
              <span>{active.phone}</span>
              <button className="text-muted-foreground/50 hover:text-muted-foreground" onClick={() => { navigator.clipboard.writeText(active.phone); toast.success("Copied!"); }}>
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button className="text-[#25D366] hover:text-green-600">
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Custom attributes */}
          <div className="border-b border-border px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Custom Attributes</p>
              <div className="flex items-center gap-1">
                <button className="text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                <button className="text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="space-y-2">
              {(["name", "phone", "email"] as const).map((field) => (
                <div key={field} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] capitalize text-muted-foreground">{field === "phone" ? "Phone no." : field}</p>
                    {editAttr === field ? (
                      <input
                        autoFocus
                        className="w-full text-xs text-foreground focus:outline-none bg-transparent"
                        value={active.attrs[field]}
                        onChange={(e) => updateAttr(field, e.target.value)}
                        onBlur={() => setEditAttr(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditAttr(null)}
                      />
                    ) : (
                      <p className="text-xs font-medium text-foreground truncate">{active.attrs[field] || "-"}</p>
                    )}
                  </div>
                  <button className="ml-2 shrink-0 text-muted-foreground/50 hover:text-muted-foreground" onClick={() => setEditAttr(field)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Assigned To</p>
            <button
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-[#5B5BF7] hover:text-[#5B5BF7]"
              onClick={() => toast.info("Assignment coming soon")}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Assign agent
            </button>
          </div>

          {/* Tags */}
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1">
              {active.tags.map((t) => (
                <span key={t.label} className={`rounded px-2 py-0.5 text-[11px] font-medium ${TAG_COLORS[t.color]}`}>{t.label}</span>
              ))}
              <button className="rounded border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-[#5B5BF7] hover:text-[#5B5BF7]" onClick={() => toast.info("Tag editor coming soon")}>
                + Add tag
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Comments</p>
            {active.comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No comments added</p>
            ) : (
              <ul className="space-y-1.5 mb-2">
                {active.comments.map((c, i) => (
                  <li key={i} className="rounded-lg bg-muted px-3 py-2 text-xs text-foreground">{c}</li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <input
                className="flex-1 rounded-lg border border-border bg-muted px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#5B5BF7] focus:outline-none"
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
              />
              <button onClick={addComment} className="text-[#5B5BF7] hover:text-indigo-700">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Msg }) {
  const isMe = msg.from === "me";

  if (msg.type === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">{msg.text}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-0.5`}>
      <span className="text-[10px] text-muted-foreground">{msg.at}</span>

      {msg.type === "buttons" ? (
        /* Interactive button message */
        <div className="w-[280px]">
          <div className="rounded-t-2xl rounded-bl-2xl bg-card border border-border shadow-sm overflow-hidden">
            {/* Body text */}
            <div className="px-3 py-2.5">
              <p className="whitespace-pre-line text-sm text-foreground">{msg.text}</p>
            </div>
            {/* Buttons */}
            <div className="border-t border-border">
              {msg.buttons?.map((btn, i) => (
                <button
                  key={i}
                  className="flex w-full items-center justify-center border-b border-border bg-[#4f46e5] px-3 py-2 text-sm font-medium text-white last:border-0 hover:bg-indigo-700 transition-colors"
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-0.5 px-1">
            {msg.sentVia && <span className="text-[10px] text-muted-foreground italic">Sent via {msg.sentVia}</span>}
            <CheckCheck className="h-3 w-3 text-[#25D366] ml-auto" />
          </div>
        </div>
      ) : (
        /* Plain text bubble */
        <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${isMe ? "rounded-br-none bg-[#5B5BF7] text-white" : "rounded-bl-none bg-card border border-border text-foreground"} shadow-sm`}>
          <p className="text-sm leading-snug">{msg.text}</p>
          {isMe && (
            <div className="mt-0.5 flex justify-end">
              <CheckCheck className="h-3 w-3 text-white/70" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }
function nowLabel() {
  return new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
