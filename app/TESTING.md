# Testing checklist

## Smoke (run after every deploy)

- [ ] `/` lands without console errors, hero CTAs route correctly
- [ ] `/login` and `/signup` render and accept the demo creds
- [ ] `/onboarding` advances through all 5 steps
- [ ] `/overview` renders all stat cards, recent leads list, charts
- [ ] Theme toggle persists (light → dark → system)
- [ ] Mobile sidebar opens on hamburger click; closes on nav

## Module: Leads

- [ ] Add a lead via the **Add lead** modal — appears at top of list
- [ ] Search filters in real-time
- [ ] Status / temperature select filters reduce the list
- [ ] Clicking a row opens `/leads/[id]`
- [ ] Detail page: status & temperature `<Select>` updates persist
- [ ] **Re-run AI score** updates the score badge
- [ ] **Send WhatsApp** shows a toast (mock) and logs to console (real)

## Module: Campaigns

- [ ] **New campaign** modal creates a draft
- [ ] **Launch** transitions status `draft → running`
- [ ] Stat tiles update on launch (mocked: stay 0 until n8n responds)
- [ ] Pause toggles back to `paused`

## Module: Appointments

- [ ] **New booking** modal creates a pending appointment
- [ ] **Confirm** moves status to `confirmed`
- [ ] Past appointments appear in the lower table

## Module: Tickets

- [ ] Tabs filter by status
- [ ] **Resolve** moves a ticket out of the open tab
- [ ] **New ticket** modal posts validates required fields

## Module: FAQ

- [ ] Add → edit → delete cycle works
- [ ] Toggle disables the "Live" badge
- [ ] Use counter increments on simulated reply

## Module: Connect Center

- [ ] Setup-progress bar reflects connected count
- [ ] Connect modal validates required fields
- [ ] **Disconnect** flips status badge

## Module: Automations

- [ ] Pause / Resume toggles status badge
- [ ] Stats display runs_today + success_rate

## Module: Analytics

- [ ] All four charts render without overflow
- [ ] Hovering a chart shows the tooltip

## Module: Settings

- [ ] Save changes shows toast and persists in-memory

## Module: Admin

- [ ] Integration error banner appears when any integration is `error`
- [ ] Audit table renders ≥ 10 rows

## Multi-tenancy (with Supabase)

- [ ] Seed two organizations
- [ ] Sign in as Org A → cannot see Org B's leads / campaigns / tickets
- [ ] Direct API call with Org A JWT against an Org B `lead_id` returns 404 (RLS blocks)
- [ ] Migration runs as `bypassrls` role; tenant queries cannot

## Accessibility

- [ ] Keyboard-only nav: tab through topbar, sidebar, page actions
- [ ] All buttons have `aria-label` when icon-only
- [ ] Color contrast ≥ 4.5:1 for text in light + dark
- [ ] Modal `<Esc>` and click-outside both close

## Performance

- [ ] Largest Contentful Paint < 2.5s on the overview page
- [ ] No unkeyed lists (React DevTools warning-free)
- [ ] `npm run build` succeeds with no warnings
- [ ] `npm run typecheck` passes
