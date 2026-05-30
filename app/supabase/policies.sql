-- =========================================================================
-- AutomateOS — Row-Level Security policies
-- Each tenant-scoped table is isolated by `organization_id`.
-- =========================================================================

-- Helper macro: enable + force RLS, allow only same-org rows.
-- Repeat for every tenant-scoped table.

do $$
declare
  t text;
  tenant_tables text[] := array[
    'profiles','leads','appointments','tickets',
    'campaigns','follow_ups','faq_items','templates',
    'integrations','automations','automation_runs',
    'analytics_events','audit_events',
    'contacts','contact_labels','org_channels',
    'wallets','credit_transactions',
    'conversations','messages',
    'workflows','workflow_runs',
    'api_keys','webhook_events'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($pol$
      drop policy if exists tenant_isolation on %I;
      create policy tenant_isolation on %I
        using (organization_id = current_tenant_id())
        with check (organization_id = current_tenant_id());
    $pol$, t, t);
  end loop;
end $$;

-- Organizations: a user can only read their own org.
alter table organizations enable row level security;
alter table organizations force row level security;
drop policy if exists org_self on organizations;
create policy org_self on organizations
  using (id = current_tenant_id())
  with check (id = current_tenant_id());
