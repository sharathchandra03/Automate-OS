"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  MessageCircle, Zap, ShoppingBag, Facebook, Webhook,
  Users, FileText, Mail, Instagram, Send,
} from "lucide-react";

export interface TriggerNodeData {
  trigger: string;
  label: string;
}

const TRIGGER_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  incoming_whatsapp: { icon: <MessageCircle className="h-4 w-4" />, color: "text-white", bg: "bg-[#25D366]" },
  campaign_sent:     { icon: <Zap className="h-4 w-4" />,           color: "text-white", bg: "bg-blue-500" },
  shopify_events:    { icon: <ShoppingBag className="h-4 w-4" />,   color: "text-white", bg: "bg-[#96bf48]" },
  facebook_lead:     { icon: <Facebook className="h-4 w-4" />,      color: "text-white", bg: "bg-[#1877F2]" },
  new_contact:       { icon: <Users className="h-4 w-4" />,         color: "text-white", bg: "bg-violet-500" },
  new_form_response: { icon: <FileText className="h-4 w-4" />,      color: "text-white", bg: "bg-amber-500" },
  incoming_webhook:  { icon: <Webhook className="h-4 w-4" />,       color: "text-white", bg: "bg-slate-600" },
  gmail:             { icon: <Mail className="h-4 w-4" />,          color: "text-white", bg: "bg-red-500" },
  instagram:         { icon: <Instagram className="h-4 w-4" />,     color: "text-white", bg: "bg-pink-500" },
  telegram:          { icon: <Send className="h-4 w-4" />,          color: "text-white", bg: "bg-sky-500" },
};

function TriggerNodeInner({ data }: NodeProps<TriggerNodeData>) {
  const meta = TRIGGER_META[data.trigger] ?? TRIGGER_META.incoming_webhook;

  return (
    <div className="w-[200px] rounded-xl border-2 border-[#22c55e] bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 ${meta.bg}`}>
        <span className={meta.color}>{meta.icon}</span>
        <span className="text-xs font-semibold text-white truncate">Trigger</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-medium text-foreground">{data.label}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">When this happens</p>
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: "#22c55e", width: 12, height: 12, border: "2px solid hsl(var(--card))" }}
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeInner);
