/**
 * Lightweight RBAC + ABAC layer.
 *
 * Roles:    owner > admin > manager > member > viewer > client
 * Resource-level rules can override role defaults.
 *
 * Always go through `can()` before performing or rendering a privileged action.
 */

export type Role = "owner" | "admin" | "manager" | "member" | "viewer" | "client";

export type Action =
  | "read" | "create" | "update" | "delete"
  | "approve" | "export" | "invite" | "billing"
  | "manage_integrations" | "manage_automations" | "view_audit"
  | "manage_team" | "manage_org" | "impersonate";

export type ResourceKind =
  | "lead" | "campaign" | "appointment" | "ticket" | "faq"
  | "automation" | "integration" | "team" | "org" | "billing"
  | "audit" | "knowledge" | "report" | "api_key" | "webhook"
  | "client_portal";

export interface Actor {
  userId: string;
  orgId: string;
  role: Role;
}

export interface Resource {
  kind: ResourceKind;
  ownerId?: string;     // for "own only" rules
  orgId?: string;       // resource's org; must match actor.orgId
}

const ROLE_RANK: Record<Role, number> = {
  owner: 100, admin: 80, manager: 60, member: 40, viewer: 20, client: 10,
};

/** Highest-level base policy table. Override per-resource below. */
const BASE_POLICY: Partial<Record<Action, Role>> = {
  read: "client",
  create: "member",
  update: "member",
  delete: "manager",
  approve: "manager",
  export: "manager",
  invite: "admin",
  manage_integrations: "admin",
  manage_automations: "manager",
  view_audit: "admin",
  manage_team: "admin",
  manage_org: "admin",
  billing: "owner",
  impersonate: "owner",
};

/** Per-resource overrides that diverge from base. */
const RESOURCE_POLICY: Partial<Record<ResourceKind, Partial<Record<Action, Role>>>> = {
  billing:       { read: "admin", update: "owner", export: "owner" },
  audit:         { read: "admin", export: "admin" },
  org:           { update: "admin", delete: "owner" },
  team:          { update: "admin", create: "admin", delete: "admin" },
  api_key:       { read: "admin", create: "admin", delete: "admin" },
  webhook:       { read: "manager", create: "admin", delete: "admin" },
  client_portal: { read: "client", update: "manager" },
  knowledge:     { create: "manager", delete: "manager" },
  report:        { create: "manager", export: "member" },
};

function requiredRole(action: Action, kind: ResourceKind): Role {
  return RESOURCE_POLICY[kind]?.[action] ?? BASE_POLICY[action] ?? "owner";
}

export function can(actor: Actor, action: Action, resource: Resource): boolean {
  // Tenant isolation: never allow cross-org access.
  if (resource.orgId && resource.orgId !== actor.orgId) return false;

  const need = requiredRole(action, resource.kind);
  return ROLE_RANK[actor.role] >= ROLE_RANK[need];
}

export function canAny(actor: Actor, action: Action, kinds: ResourceKind[]): boolean {
  return kinds.some((kind) => can(actor, action, { kind, orgId: actor.orgId }));
}

export function isAtLeast(actor: Actor, role: Role): boolean {
  return ROLE_RANK[actor.role] >= ROLE_RANK[role];
}

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "owner",   label: "Owner",   description: "Full access including billing." },
  { id: "admin",   label: "Admin",   description: "Manage team, integrations, automations, audit." },
  { id: "manager", label: "Manager", description: "Approve campaigns, manage automations, export reports." },
  { id: "member",  label: "Member",  description: "Day-to-day operator: leads, tickets, appointments." },
  { id: "viewer",  label: "Viewer",  description: "Read-only access to dashboards and records." },
  { id: "client",  label: "Client",  description: "External customer portal access only." },
];
