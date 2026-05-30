import supabase from "./db";
import {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  sendTemplateMessage,
} from "./meta-api";
import type { OrgChannel, WorkflowRun, Workflow } from "./db";
import type { WAMessage } from "../routes/webhook";

// ── Node type definitions ────────────────────────────────────────────────────

interface FlowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

// ── Trigger matcher ──────────────────────────────────────────────────────────

export async function checkTriggers(
  tenant: OrgChannel,
  message: WAMessage,
  contactId: string
): Promise<void> {
  if (message.type !== "text") return;

  const text = (message.text?.body ?? "").toLowerCase().trim();
  const orgId = tenant.organization_id;

  const { data: flows } = await supabase
    .from("workflows")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .eq("trigger_type", "keyword");

  let matchedFlow: Workflow | null = null;

  for (const flow of flows ?? []) {
    const keywords = (flow.trigger_value as string)
      .split(",")
      .map((k: string) => k.trim().toLowerCase())
      .filter(Boolean);

    if (flow.trigger_match_type === "contains") {
      if (keywords.some((k) => text.includes(k))) {
        matchedFlow = flow as Workflow;
        break;
      }
    } else {
      // exact match
      if (keywords.includes(text)) {
        matchedFlow = flow as Workflow;
        break;
      }
    }
  }

  if (!matchedFlow) {
    // Check for a fallback/default flow
    const { data: fallback } = await supabase
      .from("workflows")
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .eq("trigger_type", "inbound")
      .limit(1)
      .single();

    matchedFlow = (fallback as Workflow) ?? null;
  }

  if (matchedFlow) {
    await startFlowSession(tenant, matchedFlow, contactId);
  }
}

export async function startFlowSession(
  tenant: OrgChannel,
  flow: Workflow,
  contactId: string
): Promise<void> {
  const orgId = tenant.organization_id;

  // Abandon any existing active session for this contact
  await supabase
    .from("workflow_runs")
    .update({ status: "failed" })
    .eq("organization_id", orgId)
    .eq("contact_id", contactId)
    .eq("status", "running");

  const nodes = flow.nodes as FlowNode[];
  const edges = flow.edges as FlowEdge[];

  const triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode) return;

  const firstNode = getFirstEdgeTarget(edges, nodes, triggerNode.id);
  if (!firstNode) return;

  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const { data: session } = await supabase
    .from("workflow_runs")
    .insert({
      organization_id: orgId,
      workflow_id: flow.id,
      contact_id: contactId,
      status: "running",
      current_node_id: firstNode.id,
      variables: {},
      context: {},
      last_activity_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (session) {
    await executeNode(tenant, session as WorkflowRun, firstNode, {}, { nodes, edges });
  }
}

// ── Flow step processor (called on each inbound message) ────────────────────

export async function processFlowStep(
  tenant: OrgChannel,
  session: WorkflowRun,
  message: WAMessage
): Promise<void> {
  const { data: flowRow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", session.workflow_id)
    .single();

  if (!flowRow) return;

  const nodes = flowRow.nodes as FlowNode[];
  const edges = flowRow.edges as FlowEdge[];
  const flow = { nodes, edges };

  const currentNode = nodes.find((n) => n.id === session.current_node_id);
  if (!currentNode) {
    await endSession(session.id);
    return;
  }

  // Update last activity
  await supabase
    .from("workflow_runs")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", session.id);

  const ctx = session.context as Record<string, string>;

  switch (currentNode.type) {
    case "collect_input": {
      const userResponse = extractUserResponse(message);
      const variable = currentNode.data.variable as string;
      const updatedCtx = { ...ctx, [variable]: userResponse };

      await supabase
        .from("workflow_runs")
        .update({ context: updatedCtx })
        .eq("id", session.id);

      const nextNode = getFirstEdgeTarget(edges, nodes, currentNode.id);
      if (nextNode) {
        await moveToNode(tenant, session, nextNode, updatedCtx, flow);
      } else {
        await endSession(session.id);
      }
      break;
    }

    case "send_buttons":
    case "send_list": {
      // User clicked a button or list item
      const buttonId =
        message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id;
      if (!buttonId) break;

      const nextNode = getEdgeByHandle(edges, nodes, currentNode.id, buttonId);
      if (nextNode) {
        await moveToNode(tenant, session, nextNode, ctx, flow);
      } else {
        await endSession(session.id);
      }
      break;
    }

    default:
      break;
  }
}

// ── Node executor ────────────────────────────────────────────────────────────

async function executeNode(
  tenant: OrgChannel,
  session: WorkflowRun,
  node: FlowNode,
  context: Record<string, string>,
  flow: { nodes: FlowNode[]; edges: FlowEdge[] }
): Promise<void> {
  const { data: contactRow } = await supabase
    .from("contacts")
    .select("phone, name, email, custom_attributes")
    .eq("id", session.contact_id)
    .single();

  if (!contactRow) return;

  const phone = contactRow.phone as string;

  await supabase
    .from("workflow_runs")
    .update({ current_node_id: node.id })
    .eq("id", session.id);

  switch (node.type) {
    case "send_message": {
      const text = interpolate(node.data.text as string, context, contactRow);
      await sendTextMessage(tenant, phone, text);

      const next = getFirstEdgeTarget(flow.edges, flow.nodes, node.id);
      if (next && !requiresInput(next)) {
        await moveToNode(tenant, session, next, context, flow);
      }
      break;
    }

    case "send_buttons": {
      const body = interpolate(node.data.body as string, context, contactRow);
      await sendButtonMessage(
        tenant,
        phone,
        body,
        node.data.buttons as Array<{ id: string; title: string }>
      );
      // Wait for user button click — don't auto-advance
      break;
    }

    case "send_list": {
      await sendListMessage(
        tenant,
        phone,
        node.data.body as string,
        node.data.buttonText as string,
        node.data.sections as Array<{
          title: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>
      );
      break;
    }

    case "send_template": {
      await sendTemplateMessage(
        tenant,
        phone,
        node.data.templateName as string,
        (node.data.language as string) ?? "en",
        (node.data.variables as object) ?? {}
      );
      const next = getFirstEdgeTarget(flow.edges, flow.nodes, node.id);
      if (next) await moveToNode(tenant, session, next, context, flow);
      break;
    }

    case "collect_input": {
      const prompt = interpolate(node.data.prompt as string, context, contactRow);
      await sendTextMessage(tenant, phone, prompt);
      // Wait for user text reply
      break;
    }

    case "condition": {
      const value = context[node.data.variable as string] ?? "";
      const matches = evaluateCondition(
        value,
        node.data.operator as string,
        node.data.value as string
      );
      const next = getEdgeByHandle(
        flow.edges,
        flow.nodes,
        node.id,
        matches ? "true" : "false"
      );
      if (next) await moveToNode(tenant, session, next, context, flow);
      break;
    }

    case "set_variable": {
      const updated = { ...context, [node.data.variable as string]: node.data.value as string };
      await supabase
        .from("workflow_runs")
        .update({ context: updated })
        .eq("id", session.id);
      const next = getFirstEdgeTarget(flow.edges, flow.nodes, node.id);
      if (next) await moveToNode(tenant, session, next, updated, flow);
      break;
    }

    case "tag_contact": {
      const { data: ct } = await supabase
        .from("contacts")
        .select("tags")
        .eq("id", session.contact_id)
        .single();
      const existingTags: string[] = ct?.tags ?? [];
      const newTag = node.data.tag as string;
      if (!existingTags.includes(newTag)) {
        await supabase
          .from("contacts")
          .update({ tags: [...existingTags, newTag] })
          .eq("id", session.contact_id);
      }
      const next = getFirstEdgeTarget(flow.edges, flow.nodes, node.id);
      if (next) await moveToNode(tenant, session, next, context, flow);
      break;
    }

    case "assign_agent": {
      await supabase
        .from("conversations")
        .update({ assignee_id: node.data.agentId as string })
        .eq("organization_id", tenant.organization_id)
        .eq("contact_id", session.contact_id);
      await endSession(session.id);
      break;
    }

    case "create_ticket": {
      const slaMap: Record<string, number> = { urgent: 1, high: 4, medium: 24, low: 72 };
      const priority = (node.data.priority as string) ?? "medium";
      const slaBreachAt = new Date(Date.now() + (slaMap[priority] ?? 24) * 3600 * 1000);

      await supabase.from("support_tickets").insert({
        organization_id: tenant.organization_id,
        contact_id: session.contact_id,
        title: context.issue_title ?? "Support Request",
        description: context.issue_description ?? "",
        priority,
        sla_breach_at: slaBreachAt.toISOString(),
      });

      await sendTextMessage(
        tenant,
        phone,
        `✅ Your request has been received!\nPriority: ${priority}\nOur team will get back to you shortly.`
      );

      const next = getFirstEdgeTarget(flow.edges, flow.nodes, node.id);
      if (next) await moveToNode(tenant, session, next, context, flow);
      break;
    }

    case "webhook": {
      try {
        const response = await fetch(node.data.url as string, {
          method: (node.data.method as string) ?? "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: session.contact_id,
            context,
            organization_id: tenant.organization_id,
          }),
        });
        const json = await response.json().catch(() => ({}));
        const updated = { ...context, webhook_response: JSON.stringify(json) };
        const next = getFirstEdgeTarget(flow.edges, flow.nodes, node.id);
        if (next) await moveToNode(tenant, session, next, updated, flow);
      } catch (err) {
        console.error("[Flow Engine] Webhook node failed:", err);
      }
      break;
    }

    case "delay": {
      // Schedule resume after delay — re-enters the next node via cron
      const hours = (node.data.hours as number) ?? 1;
      const resumeAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      const next = getFirstEdgeTarget(flow.edges, flow.nodes, node.id);
      if (next) {
        await supabase
          .from("workflow_runs")
          .update({ current_node_id: next.id, expires_at: resumeAt })
          .eq("id", session.id);
      }
      break;
    }

    case "end_flow": {
      await endSession(session.id);
      break;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function moveToNode(
  tenant: OrgChannel,
  session: WorkflowRun,
  node: FlowNode,
  context: Record<string, string>,
  flow: { nodes: FlowNode[]; edges: FlowEdge[] }
): Promise<void> {
  await executeNode(tenant, session, node, context, flow);
}

async function endSession(sessionId: string): Promise<void> {
  await supabase
    .from("workflow_runs")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
}

function getFirstEdgeTarget(
  edges: FlowEdge[],
  nodes: FlowNode[],
  sourceId: string
): FlowNode | null {
  const edge = edges.find((e) => e.source === sourceId && !e.sourceHandle);
  return edge ? (nodes.find((n) => n.id === edge.target) ?? null) : null;
}

function getEdgeByHandle(
  edges: FlowEdge[],
  nodes: FlowNode[],
  sourceId: string,
  handle: string
): FlowNode | null {
  const edge = edges.find(
    (e) => e.source === sourceId && e.sourceHandle === handle
  );
  return edge ? (nodes.find((n) => n.id === edge.target) ?? null) : null;
}

function requiresInput(node: FlowNode): boolean {
  return ["collect_input", "send_buttons", "send_list"].includes(node.type);
}

function extractUserResponse(message: WAMessage): string {
  if (message.type === "text") return message.text?.body ?? "";
  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.id ??
      message.interactive?.list_reply?.id ??
      ""
    );
  }
  return "";
}

function interpolate(
  template: string,
  context: Record<string, string>,
  contact: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return (
      context[key] ??
      (contact[key] as string | undefined) ??
      `{{${key}}}`
    );
  });
}

function evaluateCondition(value: string, operator: string, target: string): boolean {
  switch (operator) {
    case "equals":      return value === target;
    case "not_equals":  return value !== target;
    case "contains":    return value.includes(target);
    case "starts_with": return value.startsWith(target);
    case "ends_with":   return value.endsWith(target);
    default:            return false;
  }
}
