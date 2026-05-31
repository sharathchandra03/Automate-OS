"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Modal, Drawer } from "@/components/ui/Modal";
import { Bot, Plus, Play, Pause, MessageSquare, Zap, Globe } from "lucide-react";

type AgentStatus = "active" | "paused";
type Persona = "professional" | "friendly" | "empathetic" | "concise";
type Trigger = "incoming_whatsapp" | "new_lead" | "ticket_created" | "scheduled";
type Channel = "whatsapp" | "email" | "telegram";
type Language = "english" | "hindi" | "hinglish";

interface Agent {
  id: string;
  name: string;
  persona: Persona;
  trigger: Trigger;
  channel: Channel;
  language: Language;
  knowledgeBase: string;
  status: AgentStatus;
  conversationsHandled: number;
}

const DEMO_AGENTS: Agent[] = [
  {
    id: "ag_1",
    name: "Lead Qualifier Bot",
    persona: "friendly",
    trigger: "new_lead",
    channel: "whatsapp",
    language: "hinglish",
    knowledgeBase: "Qualify leads by asking: budget, timeline, location preference, and BHK requirement. Be conversational and warm.",
    status: "active",
    conversationsHandled: 142,
  },
  {
    id: "ag_2",
    name: "Support Triage Agent",
    persona: "empathetic",
    trigger: "ticket_created",
    channel: "whatsapp",
    language: "english",
    knowledgeBase: "Handle common support queries: password reset, billing, refunds, and delivery status. Escalate unresolved issues after 2 attempts.",
    status: "active",
    conversationsHandled: 89,
  },
  {
    id: "ag_3",
    name: "Appointment Reminder",
    persona: "professional",
    trigger: "scheduled",
    channel: "whatsapp",
    language: "hindi",
    knowledgeBase: "Send appointment reminders 24h and 1h before. Offer rescheduling if the user responds negatively.",
    status: "paused",
    conversationsHandled: 31,
  },
];

const MOCK_CONVERSATION: { role: "agent" | "user"; text: string }[] = [
  { role: "agent", text: "Hi! I'm your AI assistant. How can I help you today?" },
  { role: "user",  text: "I wanted to know more about your product." },
  { role: "agent", text: "Great! I'd love to help. Could you tell me a bit about your budget and timeline?" },
  { role: "user",  text: "Around ₹50 lakhs, looking to buy in 3 months." },
  { role: "agent", text: "Perfect! That works well with several options in our portfolio. Which area are you interested in?" },
];

const TRIGGER_LABELS: Record<Trigger, string> = {
  incoming_whatsapp: "Incoming WhatsApp",
  new_lead: "New Lead",
  ticket_created: "Ticket Created",
  scheduled: "Scheduled",
};

const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  telegram: "Telegram",
};

function uid() {
  return `ag_${Date.now().toString(36)}`;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(DEMO_AGENTS);
  const [showNew, setShowNew] = useState(false);
  const [testAgent, setTestAgent] = useState<Agent | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [persona, setPersona] = useState<Persona>("professional");
  const [trigger, setTrigger] = useState<Trigger>("incoming_whatsapp");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [language, setLanguage] = useState<Language>("english");
  const [knowledgeBase, setKnowledgeBase] = useState("");

  function resetForm() {
    setName("");
    setPersona("professional");
    setTrigger("incoming_whatsapp");
    setChannel("whatsapp");
    setLanguage("english");
    setKnowledgeBase("");
  }

  function handleCreate() {
    if (!name.trim()) return;
    const agent: Agent = {
      id: uid(),
      name: name.trim(),
      persona,
      trigger,
      channel,
      language,
      knowledgeBase,
      status: "active",
      conversationsHandled: 0,
    };
    setAgents((prev) => [agent, ...prev]);
    setShowNew(false);
    resetForm();
  }

  function toggleStatus(id: string) {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a
      )
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Agents"
        description="Configure automated AI agents that handle conversations, qualify leads, and resolve support tickets."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowNew(true)}>
            New Agent
          </Button>
        }
      />

      {agents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No agents yet. Create your first AI agent.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Bot className="h-4 w-4 shrink-0 text-primary" />
                  <CardTitle className="line-clamp-1">{agent.name}</CardTitle>
                </div>
                <Badge tone={agent.status === "active" ? "success" : "muted"}>
                  {agent.status === "active" ? "Active" : "Paused"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="h-3 w-3" /> {TRIGGER_LABELS[agent.trigger]}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> {CHANNEL_LABELS[agent.channel]}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Globe className="h-3 w-3" /> {agent.language.charAt(0).toUpperCase() + agent.language.slice(1)}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">{agent.knowledgeBase || "No knowledge base configured."}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">{agent.conversationsHandled.toLocaleString()} conversations</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setTestAgent(agent)}>
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={agent.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    onClick={() => toggleStatus(agent.id)}
                  >
                    {agent.status === "active" ? "Pause" : "Enable"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Agent Modal */}
      <Modal
        open={showNew}
        onClose={() => { setShowNew(false); resetForm(); }}
        title="New AI Agent"
        description="Configure how this agent behaves and what triggers it."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowNew(false); resetForm(); }}>Cancel</Button>
            <Button disabled={!name.trim()} onClick={handleCreate}>Create Agent</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input placeholder="e.g. Lead Qualifier Bot" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Persona</label>
              <Select value={persona} onChange={(e) => setPersona(e.target.value as Persona)}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="empathetic">Empathetic</option>
                <option value="concise">Concise</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Trigger</label>
              <Select value={trigger} onChange={(e) => setTrigger(e.target.value as Trigger)}>
                <option value="incoming_whatsapp">Incoming WhatsApp</option>
                <option value="new_lead">New Lead</option>
                <option value="ticket_created">Ticket Created</option>
                <option value="scheduled">Scheduled</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Channel</label>
              <Select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Response language</label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="hinglish">Hinglish</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Knowledge base</label>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-y"
              placeholder="Paste your docs, FAQs, or instructions here…"
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Test Conversation Drawer */}
      <Drawer
        open={testAgent !== null}
        onClose={() => setTestAgent(null)}
        title={testAgent ? `Preview — ${testAgent.name}` : "Preview"}
      >
        {testAgent && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-4">
              Mock conversation showing how this agent responds.
            </p>
            {MOCK_CONVERSATION.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "agent" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "agent"
                      ? "bg-secondary text-foreground rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
