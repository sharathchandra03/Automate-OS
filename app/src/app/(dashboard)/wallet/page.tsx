"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet, TrendingUp, TrendingDown, MessageSquare,
  Megaphone, Plus, ArrowUpRight, ArrowDownLeft,
  RefreshCw, ShieldCheck, Clock,
} from "lucide-react";
import { getWallet, getCreditTransactions } from "@/lib/api";
import type { CreditTransaction, Wallet as WalletType } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function txIcon(tx: CreditTransaction) {
  if (tx.transaction_type === "topup" || tx.transaction_type === "admin_grant") {
    return <ArrowUpRight className="h-4 w-4 text-green-600" />;
  }
  if (tx.transaction_type === "refund") {
    return <RefreshCw className="h-4 w-4 text-blue-500" />;
  }
  return <ArrowDownLeft className="h-4 w-4 text-red-500" />;
}

function txBg(tx: CreditTransaction) {
  if (tx.transaction_type === "topup" || tx.transaction_type === "admin_grant") return "bg-green-50";
  if (tx.transaction_type === "refund") return "bg-blue-50";
  return "bg-red-50";
}

function creditTypeBadge(type: CreditTransaction["credit_type"]) {
  return type === "conversation"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700"><MessageSquare className="h-2.5 w-2.5" />Conversation</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><Megaphone className="h-2.5 w-2.5" />Broadcast</span>;
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, iconBg }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; iconBg: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [txns, setTxns] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "conversation" | "broadcast">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [w, t] = await Promise.all([getWallet(), getCreditTransactions()]);
    setWallet(w);
    setTxns(t);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = txns.filter((t) => tab === "all" || t.credit_type === tab);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!wallet) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wallet & Credits</h1>
          <p className="text-sm text-gray-400 mt-0.5">Credits are consumed when messages are sent or workflows run.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Contact your account manager to top up credits</span>
        </div>
      </div>

      {/* Credit Balance Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Conversation Credits"
          value={wallet.conversation_credits}
          sub={`${wallet.lifetime_conversation_spent.toLocaleString()} used lifetime`}
          icon={<MessageSquare className="h-5 w-5 text-violet-600" />}
          iconBg="bg-violet-100"
        />
        <StatCard
          label="Broadcast Credits"
          value={wallet.broadcast_credits}
          sub={`${wallet.lifetime_broadcast_spent.toLocaleString()} used lifetime`}
          icon={<Megaphone className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          label="Conversation Added"
          value={wallet.lifetime_conversation_added}
          sub="All time"
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          label="Broadcast Added"
          value={wallet.lifetime_broadcast_added}
          sub="All time"
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
      </div>

      {/* Credit info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <MessageSquare className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Conversation Credits</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Used when you reply to or initiate a WhatsApp conversation (24-hour window).
                <br />1 credit = 1 conversation window opened.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-violet-100">
                  <div
                    className="h-2 rounded-full bg-violet-500 transition-all"
                    style={{ width: `${Math.min(100, (wallet.lifetime_conversation_spent / Math.max(1, wallet.lifetime_conversation_added)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {wallet.lifetime_conversation_spent}/{wallet.lifetime_conversation_added} used
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Megaphone className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Broadcast Credits</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Used when you send bulk campaign messages to your contact list.
                <br />1 credit = 1 message sent to 1 recipient.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-amber-100">
                  <div
                    className="h-2 rounded-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, (wallet.lifetime_broadcast_spent / Math.max(1, wallet.lifetime_broadcast_added)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {wallet.lifetime_broadcast_spent}/{wallet.lifetime_broadcast_added} used
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Transaction History</h2>
          <div className="flex rounded-lg border border-gray-200 text-xs font-medium overflow-hidden">
            {(["all", "conversation", "broadcast"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 transition-colors capitalize ${tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Clock className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${txBg(tx)}`}>
                  {txIcon(tx)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {creditTypeBadge(tx.credit_type)}
                    <span className="text-xs text-gray-400">{fmtDate(tx.created_at)}</span>
                    {tx.reference_id && (
                      <span className="text-xs text-gray-300">· ref: {tx.reference_id}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">bal: {tx.balance_after.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low credit warning */}
      {(wallet.conversation_credits < 100 || wallet.broadcast_credits < 500) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <TrendingDown className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Low credit balance</p>
            <p className="text-xs text-red-600 mt-0.5">
              {wallet.conversation_credits < 100 && `Conversation credits low (${wallet.conversation_credits} remaining). `}
              {wallet.broadcast_credits < 500 && `Broadcast credits low (${wallet.broadcast_credits} remaining). `}
              Contact your account manager to top up.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
