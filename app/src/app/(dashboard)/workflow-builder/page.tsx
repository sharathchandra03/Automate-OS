"use client";

import { useCallback, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import { TriggerNode, type TriggerNodeData } from "@/components/workflow/TriggerNode";
import { ResponseNode, type ResponseNodeData } from "@/components/workflow/ResponseNode";
import {
  MessageCircle, Zap, ShoppingBag, Facebook, Webhook,
  Users, FileText, Send, Instagram, Mail,
  Save, Sparkles, Play, ChevronDown, ChevronRight,
  GitBranch, Clock, Bot, Star, Tag, Code,
  CreditCard, UserCheck, BellOff, Megaphone, RefreshCw,
  Filter, ShoppingCart, Target, BookOpen, MessageSquare,
  FilePlus, Edit3, StopCircle, PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

// ── Node type registry ──────────────────────────────────────────────────────
const NODE_TYPES = {
  "trigger-node": TriggerNode,
  "response-node": ResponseNode,
};

// ── Sidebar item definitions ────────────────────────────────────────────────
interface SidebarItem {
  type: string;
  nodeType: "trigger-node" | "response-node";
  label: string;
  icon: React.ReactNode;
  color: string;
  defaultData: TriggerNodeData | ResponseNodeData;
}

const TRIGGERS: SidebarItem[] = [
  {
    type: "incoming_whatsapp", nodeType: "trigger-node", label: "Incoming WhatsApp",
    icon: <MessageCircle className="h-4 w-4" />, color: "bg-[#25D366]",
    defaultData: { trigger: "incoming_whatsapp", label: "Incoming WhatsApp" },
  },
  {
    type: "campaign_sent", nodeType: "trigger-node", label: "Campaign Sent",
    icon: <Megaphone className="h-4 w-4" />, color: "bg-blue-500",
    defaultData: { trigger: "campaign_sent", label: "Campaign Sent" },
  },
  {
    type: "shopify_events", nodeType: "trigger-node", label: "Shopify Events",
    icon: <ShoppingBag className="h-4 w-4" />, color: "bg-[#96bf48]",
    defaultData: { trigger: "shopify_events", label: "Shopify Events" },
  },
  {
    type: "facebook_lead", nodeType: "trigger-node", label: "Facebook Lead",
    icon: <Facebook className="h-4 w-4" />, color: "bg-[#1877F2]",
    defaultData: { trigger: "facebook_lead", label: "Facebook Lead" },
  },
  {
    type: "kylas_event_create", nodeType: "trigger-node", label: "Kylas Event Create",
    icon: <FilePlus className="h-4 w-4" />, color: "bg-sky-600",
    defaultData: { trigger: "kylas_event_create", label: "Kylas Event Create" },
  },
  {
    type: "kylas_event_update", nodeType: "trigger-node", label: "Kylas Event Update",
    icon: <Edit3 className="h-4 w-4" />, color: "bg-sky-400",
    defaultData: { trigger: "kylas_event_update", label: "Kylas Event Update" },
  },
  {
    type: "pabbly_event", nodeType: "trigger-node", label: "Pabbly Event",
    icon: <Zap className="h-4 w-4" />, color: "bg-orange-500",
    defaultData: { trigger: "pabbly_event", label: "Pabbly Event" },
  },
  {
    type: "incoming_webhook", nodeType: "trigger-node", label: "Incoming Webhook",
    icon: <Webhook className="h-4 w-4" />, color: "bg-slate-500",
    defaultData: { trigger: "incoming_webhook", label: "Incoming Webhook" },
  },
  {
    type: "messenger", nodeType: "trigger-node", label: "Messenger",
    icon: <MessageSquare className="h-4 w-4" />, color: "bg-[#0084FF]",
    defaultData: { trigger: "messenger", label: "Messenger" },
  },
  {
    type: "instagram", nodeType: "trigger-node", label: "Instagram",
    icon: <Instagram className="h-4 w-4" />, color: "bg-pink-500",
    defaultData: { trigger: "instagram", label: "Instagram" },
  },
  {
    type: "commerce_event", nodeType: "trigger-node", label: "Commerce Event",
    icon: <ShoppingCart className="h-4 w-4" />, color: "bg-amber-600",
    defaultData: { trigger: "commerce_event", label: "Commerce Event" },
  },
  {
    type: "new_contact", nodeType: "trigger-node", label: "New Contact",
    icon: <Users className="h-4 w-4" />, color: "bg-violet-500",
    defaultData: { trigger: "new_contact", label: "New Contact" },
  },
  {
    type: "new_form_response", nodeType: "trigger-node", label: "New Form Response",
    icon: <FileText className="h-4 w-4" />, color: "bg-teal-500",
    defaultData: { trigger: "new_form_response", label: "New Form Response" },
  },
];

const ACTIONS: SidebarItem[] = [
  {
    type: "response_message", nodeType: "response-node", label: "Response Message",
    icon: <MessageCircle className="h-4 w-4" />, color: "bg-[#22c55e]",
    defaultData: { body: "Type your message here…", options: [{ id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "send_wa_template", nodeType: "response-node", label: "Send WA Template",
    icon: <Send className="h-4 w-4" />, color: "bg-[#25D366]",
    defaultData: { body: "Send a WhatsApp template message.", options: [{ id: uid(), label: "Sent" }, { id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "feedback_collection", nodeType: "response-node", label: "Feedback Collection",
    icon: <Star className="h-4 w-4" />, color: "bg-yellow-500",
    defaultData: { body: "How would you rate your experience? ⭐ 1–5", options: [{ id: uid(), label: "1 Star" }, { id: uid(), label: "5 Stars" }, { id: uid(), label: "Default" }], variable: "feedback_score" },
  },
  {
    type: "send_email", nodeType: "response-node", label: "Send Email",
    icon: <Mail className="h-4 w-4" />, color: "bg-red-500",
    defaultData: { body: "Send an email to the contact.", options: [{ id: uid(), label: "Sent" }, { id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "instagram_action", nodeType: "response-node", label: "Instagram Action",
    icon: <Instagram className="h-4 w-4" />, color: "bg-pink-500",
    defaultData: { body: "Send an Instagram DM or reply.", options: [{ id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "messenger_action", nodeType: "response-node", label: "Messenger Action",
    icon: <MessageSquare className="h-4 w-4" />, color: "bg-[#0084FF]",
    defaultData: { body: "Send a Messenger message.", options: [{ id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "meta_pixel", nodeType: "response-node", label: "Meta Pixel",
    icon: <Target className="h-4 w-4" />, color: "bg-blue-600",
    defaultData: { body: "Fire a Meta Pixel event.", options: [{ id: uid(), label: "Fired" }, { id: uid(), label: "Default" }], variable: "pixel_event" },
  },
  {
    type: "shopify_actions", nodeType: "response-node", label: "Shopify Actions",
    icon: <ShoppingBag className="h-4 w-4" />, color: "bg-[#96bf48]",
    defaultData: { body: "Trigger a Shopify action.", options: [{ id: uid(), label: "Success" }, { id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "assign_gpt", nodeType: "response-node", label: "Assign GPT",
    icon: <Bot className="h-4 w-4" />, color: "bg-emerald-500",
    defaultData: { body: "{{gpt_reply}}", options: [{ id: uid(), label: "Replied" }, { id: uid(), label: "Default" }], variable: "gpt_response" },
  },
  {
    type: "assign_ai_assistant", nodeType: "response-node", label: "Assign AI Assistant",
    icon: <Sparkles className="h-4 w-4" />, color: "bg-violet-600",
    defaultData: { body: "AI Assistant will handle this conversation.", options: [{ id: uid(), label: "Handled" }, { id: uid(), label: "Default" }], variable: "ai_session" },
  },
  {
    type: "send_wa_catalog", nodeType: "response-node", label: "Send WA Catalog",
    icon: <BookOpen className="h-4 w-4" />, color: "bg-teal-500",
    defaultData: { body: "Send your WhatsApp product catalog.", options: [{ id: uid(), label: "Viewed" }, { id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "payment_message", nodeType: "response-node", label: "Payment Message",
    icon: <CreditCard className="h-4 w-4" />, color: "bg-indigo-500",
    defaultData: { body: "Share a payment link or request.", options: [{ id: uid(), label: "Paid" }, { id: uid(), label: "Pending" }, { id: uid(), label: "Default" }], variable: "payment_status" },
  },
  {
    type: "assign_agent", nodeType: "response-node", label: "Assign Agent",
    icon: <UserCheck className="h-4 w-4" />, color: "bg-cyan-500",
    defaultData: { body: "Assign conversation to a human agent.", options: [{ id: uid(), label: "Assigned" }, { id: uid(), label: "Default" }], variable: "assigned_agent" },
  },
  {
    type: "update_chat_status", nodeType: "response-node", label: "Update Chat Status",
    icon: <RefreshCw className="h-4 w-4" />, color: "bg-slate-400",
    defaultData: { body: "Update conversation status.", options: [{ id: uid(), label: "Open" }, { id: uid(), label: "Resolved" }, { id: uid(), label: "Default" }], variable: "chat_status" },
  },
  {
    type: "time_delay", nodeType: "response-node", label: "Time Delay",
    icon: <Clock className="h-4 w-4" />, color: "bg-amber-500",
    defaultData: { body: "Wait before next step.", options: [{ id: uid(), label: "Continue" }], variable: "" },
  },
  {
    type: "attribute_condition", nodeType: "response-node", label: "Attribute Condition",
    icon: <Filter className="h-4 w-4" />, color: "bg-orange-500",
    defaultData: { body: "Check contact attribute value.", options: [{ id: uid(), label: "Match" }, { id: uid(), label: "No Match" }, { id: uid(), label: "Default" }], variable: "condition_result" },
  },
  {
    type: "llama", nodeType: "response-node", label: "Llama",
    icon: <Bot className="h-4 w-4" />, color: "bg-rose-500",
    defaultData: { body: "{{llama_reply}}", options: [{ id: uid(), label: "Replied" }, { id: uid(), label: "Default" }], variable: "llama_response" },
  },
  {
    type: "add_to_label", nodeType: "response-node", label: "Add to Label",
    icon: <Tag className="h-4 w-4" />, color: "bg-purple-500",
    defaultData: { body: "Add contact to a label.", options: [{ id: uid(), label: "Done" }, { id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "update_attribute", nodeType: "response-node", label: "Update Attribute",
    icon: <Edit3 className="h-4 w-4" />, color: "bg-fuchsia-500",
    defaultData: { body: "Update a contact attribute.", options: [{ id: uid(), label: "Updated" }, { id: uid(), label: "Default" }], variable: "updated_attr" },
  },
  {
    type: "set_condition", nodeType: "response-node", label: "Set a Condition",
    icon: <GitBranch className="h-4 w-4" />, color: "bg-amber-600",
    defaultData: { body: "Branch based on condition.", options: [{ id: uid(), label: "True" }, { id: uid(), label: "False" }, { id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "custom_code", nodeType: "response-node", label: "Custom Code",
    icon: <Code className="h-4 w-4" />, color: "bg-gray-600",
    defaultData: { body: "Run custom JavaScript/Python logic.", options: [{ id: uid(), label: "Success" }, { id: uid(), label: "Error" }, { id: uid(), label: "Default" }], variable: "code_result" },
  },
  {
    type: "webhook_trigger", nodeType: "response-node", label: "Webhook Trigger",
    icon: <Webhook className="h-4 w-4" />, color: "bg-slate-600",
    defaultData: { body: "Send data to an external webhook URL.", options: [{ id: uid(), label: "Success" }, { id: uid(), label: "Error" }, { id: uid(), label: "Default" }], variable: "webhook_response" },
  },
  {
    type: "end_flow", nodeType: "response-node", label: "End Flow",
    icon: <StopCircle className="h-4 w-4" />, color: "bg-red-500",
    defaultData: { body: "End this flow.", options: [], variable: "" },
  },
  {
    type: "update_broadcast", nodeType: "response-node", label: "Update Broadcast",
    icon: <Megaphone className="h-4 w-4" />, color: "bg-blue-500",
    defaultData: { body: "Update a broadcast list or campaign.", options: [{ id: uid(), label: "Updated" }, { id: uid(), label: "Default" }], variable: "" },
  },
  {
    type: "stop_schedule_messages", nodeType: "response-node", label: "Stop Schedule Msgs",
    icon: <BellOff className="h-4 w-4" />, color: "bg-rose-600",
    defaultData: { body: "Stop all scheduled messages for this contact.", options: [{ id: uid(), label: "Stopped" }, { id: uid(), label: "Default" }], variable: "" },
  },
];

// ── Default graph ─────────────────────────────────────────────────────────────
const INITIAL_NODES: Node[] = [
  {
    id: "t1", type: "trigger-node", position: { x: 60, y: 200 },
    data: { trigger: "incoming_whatsapp", label: "Incoming WhatsApp" } satisfies TriggerNodeData,
  },
  {
    id: "r1", type: "response-node", position: { x: 340, y: 60 },
    data: {
      body: "Hi {{Name}} 😊\nWelcome! How can we help you today?",
      options: [
        { id: "o1a", label: "Product inquiry" },
        { id: "o1b", label: "Support" },
        { id: "o1c", label: "Billing" },
        { id: "o1d", label: "Default" },
      ],
      variable: "",
    } satisfies ResponseNodeData,
  },
  {
    id: "r2", type: "response-node", position: { x: 720, y: 60 },
    data: {
      body: "Let me connect you with the right team.\nPlease hold for a moment.",
      options: [
        { id: "o2a", label: "Assign Agent" },
        { id: "o2b", label: "Default" },
      ],
      variable: "",
    } satisfies ResponseNodeData,
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: "e1", source: "t1", sourceHandle: "out", target: "r1", targetHandle: "in", type: "smoothstep", animated: true, style: { stroke: "#22c55e" } },
  { id: "e2", source: "r1", sourceHandle: "opt-o1a", target: "r2", targetHandle: "in", type: "smoothstep", style: { stroke: "#94a3b8" } },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkflowBuilderPage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [flowName, setFlowName] = useState("New Flow");
  const [triggersOpen, setTriggersOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const nodeIdCounter = useRef(100);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge({ ...connection, type: "smoothstep", style: { stroke: "#94a3b8" } }, eds),
      ),
    [setEdges],
  );

  function onDragStart(e: React.DragEvent, item: SidebarItem) {
    e.dataTransfer.setData("application/rfnode-type", item.nodeType);
    e.dataTransfer.setData("application/rfnode-data", JSON.stringify(item.defaultData));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData("application/rfnode-type") as Node["type"];
    const rawData = e.dataTransfer.getData("application/rfnode-data");
    if (!nodeType || !rawData) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newNode: Node = {
      id: `n${++nodeIdCounter.current}`,
      type: nodeType,
      position,
      data: JSON.parse(rawData),
    };
    setNodes((nds) => [...nds, newNode]);
  }

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8 flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-white">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-gray-600" onClick={() => history.back()}>←</button>
          <input
            className="rounded border border-transparent bg-white px-2 py-1 text-sm font-semibold text-gray-800 focus:border-gray-300 focus:outline-none"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-xs text-gray-500">
            {edges.length}/50 connectors
          </span>
          <button
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            onClick={() => toast.success("Flow started!")}
          >
            <Play className="h-4 w-4 text-[#22c55e]" /> Test
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700"
            onClick={() => toast.info("AI flow builder coming soon")}
          >
            <Sparkles className="h-4 w-4" /> AI <span className="ml-0.5 rounded bg-white/20 px-1 text-[10px]">BETA</span>
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-[#22c55e] px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-600"
            onClick={() => toast.success("Flow saved!")}
          >
            <Save className="h-4 w-4" /> Save Flow
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="flex w-[168px] shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
          {/* Triggers */}
          <button
            className="flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:bg-gray-50"
            onClick={() => setTriggersOpen((v) => !v)}
          >
            Triggers
            {triggersOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {triggersOpen && (
            <div className="flex flex-col gap-1 px-2 pb-2">
              {TRIGGERS.map((item) => (
                <SidebarNode key={item.type} item={item} onDragStart={onDragStart} />
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="my-1 border-t border-gray-200" />

          {/* Actions */}
          <button
            className="flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:bg-gray-50"
            onClick={() => setActionsOpen((v) => !v)}
          >
            Actions
            {actionsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {actionsOpen && (
            <div className="flex flex-col gap-1 px-2 pb-4">
              {ACTIONS.map((item) => (
                <SidebarNode key={item.type} item={item} onDragStart={onDragStart} />
              ))}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode="Delete"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" style={{ backgroundColor: "#f1f5f9" }} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={() => "#22c55e"}
              maskColor="rgba(240,240,240,0.6)"
              style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar draggable node ─────────────────────────────────────────────────────
function SidebarNode({
  item,
  onDragStart,
}: {
  item: SidebarItem;
  onDragStart: (e: React.DragEvent, item: SidebarItem) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 hover:border-[#22c55e] hover:bg-green-50 active:cursor-grabbing transition-colors select-none [color-scheme:light]"
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${item.color}`}>
        {item.icon}
      </div>
      <span className="text-[11px] leading-tight text-gray-600">{item.label}</span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 7);
}
