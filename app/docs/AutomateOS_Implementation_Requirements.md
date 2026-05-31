# AutomateOS — Complete Implementation Requirements
### Reference document for AI agent — everything needed to build and launch

---

## SECTION 1 — Meta / WhatsApp Setup
**Priority: Must Have — Cannot launch without this**

### 1.1 Meta Developer Account
- Go to developers.facebook.com and register
- This is YOUR account as the platform builder
- Free, takes 10 minutes

### 1.2 Meta Developer App (Business Type)
- Create a new app at developers.facebook.com → My Apps → Create App
- Choose app type: Business
- Add WhatsApp as a product inside the app
- This gives you: App ID + App Secret (store both in .env)
- Switch app to LIVE mode before any real client connects
  - Dev mode only works with test numbers
  - Live mode works with real client WhatsApp numbers

### 1.3 Public HTTPS Webhook URL
- Meta needs a live public HTTPS URL to send webhook events to
- Cannot use localhost during development
- For development: use ngrok (`ngrok http 3000`) to get a public URL
- For production: your deployed server domain (e.g. api.automateos.in)
- Configure this in your Meta App Dashboard → WhatsApp → Configuration

### 1.4 Note on Meta Business Verification
- YOU do not need Meta Business Verification
- Your clients connect THEIR OWN WhatsApp via their credentials (WABA ID, Phone Number ID, Access Token)
- Meta's verification, tiers, and limits apply to the CLIENT's phone number — not yours
- You are just a middleware making API calls using the client's token
- Only needed if you later build Embedded Signup (Tech Provider program) — not required for MVP

### 1.5 What Clients Need (inform them)
- Their own Meta Business Account (verified if they want 10k+ messages/day)
- A WhatsApp Business Account (WABA) with a dedicated phone number
- A System User Access Token (permanent token, not the temporary one)
- Their WABA ID and Phone Number ID from Meta API Setup page
- At least one APPROVED message template before campaigns can run

---

## SECTION 2 — Infrastructure
**Priority: Must Have**

### 2.1 Supabase (already in your stack)
- Postgres database with Row-Level Security for multi-tenancy
- Enable the `pgcrypto` extension for token encryption:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  ```
- Use SERVICE ROLE key on backend (bypasses RLS — enforce workspace_id manually in every query)
- Use ANON key on frontend only
- All 14 DB tables already scaffolded — wire real queries to replace mock data

### 2.2 Redis — CRITICAL
- Powers: BullMQ campaign queue, rate limiting, flow session caching
- Without Redis, campaign broadcasts will fail on server restart (in-memory queue = lost jobs)
- **Free Option: Upstash Redis** (upstash.com)
  - Free tier: 10,000 commands/day, 256MB — enough for MVP and early launch
  - Fully managed, serverless, zero server to maintain
  - Works natively with BullMQ — no code change needed
  - Just add connection URL to .env:
    ```env
    REDIS_URL=rediss://default:yourpassword@your-upstash-url:6379
    ```
- **Alternative: Railway Redis** — add to your existing Railway project, $5 free credit/month

### 2.3 Backend Server (Node.js)
- Must run 24/7 with a static domain for the webhook URL
- Options: Railway, Render, DigitalOcean App Platform
- Cost: $10–20/month
- Must support long-running processes (BullMQ workers, cron jobs)
- Minimum: 512MB RAM, 1 vCPU for early stage

### 2.4 n8n Instance
- Used as the automation engine for complex workflow logic
- Self-host on your VPS (free) or use n8n Cloud
- Your AutomateOS workflow builder triggers n8n webhooks
- n8n handles: CRM integrations, external API chains, scheduled operations
- AutomateOS handles: WhatsApp messaging, flow state, contacts, campaigns

### 2.5 Transactional Email
- For sending auth emails, password resets, notifications TO YOUR CLIENTS (not their customers)
- Options: Resend (resend.com) or Postmark
- Resend free tier: 100 emails/day, 3,000/month — enough for early stage
- Install SDK: `npm install resend`

---

## SECTION 3 — Backend Code to Build
**Priority: Must Have — Build in this exact order**

### 3.1 Webhook Handler + Tenant Router (Build First)
This is the foundation of everything. All WhatsApp automation depends on this.

```
POST /api/webhook/whatsapp
GET  /api/webhook/whatsapp  (verification handshake)
```

Logic:
1. GET request → verify hub.verify_token matches stored token → respond with hub.challenge
2. POST request → respond 200 immediately (within 5 seconds or Meta disables webhook)
3. Process async: read phone_number_id → look up tenant → route to correct handler
4. Route inbound messages → flow engine or agent inbox
5. Route status updates (sent/delivered/read) → update message records + campaign stats

### 3.2 WhatsApp Connect Flow (Client Onboarding)
```
POST /api/workspace/whatsapp/connect
DELETE /api/workspace/whatsapp/disconnect
GET  /api/workspace/whatsapp/status
```

Logic:
1. Receive: waba_id, phone_number_id, access_token, display_name from client
2. Validate token by calling Meta Graph API
3. AES-256 encrypt the access_token before storing
4. Save to whatsapp_accounts table
5. Subscribe to webhooks: POST to `/{waba_id}/subscribed_apps` (CRITICAL — without this, inbound messages never arrive)
6. Return connection status

### 3.3 Meta Graph API Client
Single wrapper function used everywhere for all outbound messages:
- `sendTextMessage(tenant, phone, text)`
- `sendTemplateMessage(tenant, phone, templateName, language, variables)`
- `sendButtonMessage(tenant, phone, body, buttons)`
- `sendListMessage(tenant, phone, body, buttonText, sections)`
- `sendMediaMessage(tenant, phone, type, url, caption)`
- All functions: decrypt token → call graph.facebook.com/v19.0/{phone_number_id}/messages → return wamid
- Handle errors: 130429 (rate limit), 131026 (not on WhatsApp), 131047 (window expired), 100 (bad token)

### 3.4 BullMQ Campaign Queue + Workers
- Queue: `campaign-messages` (backed by Redis)
- When campaign triggers: push one job per recipient with calculated delay
- Rate: 10 messages per second max (safe limit under Meta's 80/sec hard cap)
- Delay calculation: `delay = Math.floor(recipientIndex / 10) * 1000`
- Worker: dequeue job → call sendTemplateMessage → update recipient status → update campaign stats
- Retry config: 3 attempts, exponential backoff starting at 5 seconds
- On failure: log error code, mark recipient as failed, don't retry 131026 (invalid number)

### 3.5 Flow Engine (Bot Builder Logic)
- Reads `bot_flows` JSON (nodes + edges from ReactFlow canvas)
- Manages `flow_sessions` — where each contact is in a flow
- Node executors: send_message, send_buttons, send_list, send_template, collect_input, condition, tag_contact, assign_agent, create_ticket, webhook, delay, end_flow
- Variable interpolation: `{{name}}` → replaced with contact or session context values
- On inbound message: check if contact has active session → continue flow
- On button/list reply: match button ID to edge → move to next node
- Session expiry: abandon sessions with no activity for 24 hours (cron cleanup)

### 3.6 Trigger Matcher
Runs when no active flow session exists for an inbound message:
1. Load all active flows with trigger_type = 'keyword' for this workspace
2. Match message text against keyword list (exact or contains)
3. If matched → start flow session for matched flow
4. If no match → check for fallback/default flow
5. If no fallback → deliver to unassigned inbox

### 3.7 Cron Jobs (run every 15 minutes)
- **Appointment reminders**: find appointments 24h and 1h away → send template reminder
- **Post-appointment follow-up**: find completed appointments → send feedback message with rating buttons
- **Drip sequence executor**: find enrollments where next_send_at <= NOW() → send step message → advance to next step
- **SLA breach monitor**: find unresolved tickets past sla_breach_at → escalate + notify manager
- **Campaign scheduler**: find campaigns with scheduled_at <= NOW() and status = 'scheduled' → trigger queue
- **Session cleanup**: mark flow sessions with last_activity_at older than 24h as 'abandoned'

### 3.8 Token Encryption Layer
- Algorithm: AES-256-GCM
- Encrypt before INSERT into DB, decrypt before API call
- Never log tokens, never return them in API responses
- Store ENCRYPTION_KEY in environment variables (32-char random string)

```javascript
// Encrypt
const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
};

// Decrypt
const decrypt = (hash) => {
  const [iv, tag, encrypted] = hash.split(':').map(h => Buffer.from(h, 'hex'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
};
```

### 3.9 Supabase RLS Policies
Every table must have a policy that enforces workspace_id isolation:
```sql
-- Example for contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON contacts
  USING (workspace_id = current_setting('app.workspace_id')::uuid);
```
Backend must set this for every DB session using the service role.

---

## SECTION 4 — NPM Packages to Install
**Priority: Must Have**

```bash
# Queue (CRITICAL)
npm install bullmq ioredis

# Scheduling
npm install node-cron

# Validation
npm install zod

# Date handling
npm install date-fns

# Billing
npm install stripe

# Email
npm install resend

# Already in your stack
# @supabase/supabase-js
# next, typescript, tailwindcss, tanstack-query, zustand
```

---

## SECTION 5 — Billing (Stripe)
**Priority: Need — Required for production**

### 5.1 Stripe Account
- Sign up at stripe.com
- Get API keys: Publishable Key (frontend) + Secret Key (backend only)
- Transaction fee: 2.9% + 30¢ per transaction

### 5.2 What to Build
- Subscription plans (monthly) based on: number of contacts, messages, team seats
- Credit wallet system: client tops up credits → each WhatsApp message deducts credits
- Stripe webhooks: listen for payment success/failure → update workspace plan in DB
- Usage limits: block campaign launch if workspace has insufficient credits

### 5.3 Indian Clients — Razorpay
- If targeting Indian businesses, Razorpay handles INR better than Stripe
- Supports UPI, net banking, easier KYC
- Consider offering both payment options

---

## SECTION 6 — Dev & Testing Tools
**Priority: Need**

### 6.1 ngrok
- Install: `npm install -g ngrok` or download from ngrok.com
- Run: `ngrok http 3000` → gives you a public HTTPS URL for webhook testing
- Use this URL in Meta App Dashboard during development
- Free tier is enough for development

### 6.2 Postman or Hoppscotch
- Test all your API endpoints locally
- Simulate incoming Meta webhook payloads (copy the JSON structure from the backend logic doc)
- Save a collection of all your API routes with sample payloads

### 6.3 Real WhatsApp Test Number
- Meta gives a free sandbox number in Dev mode (can message up to 5 verified recipient numbers)
- Add your personal WhatsApp number as a test recipient in Meta API Setup
- For real end-to-end testing: use a cheap SIM-only number as a test client number

### 6.4 BullMQ Dashboard (bull-board)
- Visual UI to monitor campaign queues
- See: pending, active, completed, failed jobs
- Install: `npm install @bull-board/express @bull-board/api`
- Mount at `/admin/queues` (protect with auth middleware)

---

## SECTION 7 — Compliance & Legal
**Priority: Must Have before going live**

### 7.1 WhatsApp Business Policy Acceptance
- Build an explicit checkbox in your client onboarding flow
- Text: "I agree to Meta's WhatsApp Business Policy"
- Store acceptance timestamp and IP address in DB
- Without this, clients don't understand they're responsible for compliance on their number

### 7.2 Opt-in / Opt-out System
- Every contact must have: opted_in (boolean), opted_in_at (timestamp), opted_out (boolean), opted_out_at
- If contact replies STOP / UNSUBSCRIBE / opt-out → immediately set opted_out = true
- Never send any message to opted_out = true contacts
- This is enforced in the campaign queue: skip opted_out contacts before sending
- Meta can permanently ban a phone number for opt-out violations

### 7.3 Privacy Policy for Your SaaS
- Create a privacy policy page on your website
- Mention: what data you collect, how client credentials are stored (encrypted), data retention

---

## SECTION 8 — Environment Variables Required

```env
# Your Meta App
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
WHATSAPP_API_VERSION=v19.0

# Your deployed server URL (webhook base)
WEBHOOK_BASE_URL=https://api.automateos.in

# Token encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_32_char_random_string_here

# Redis (Upstash free tier)
REDIS_URL=rediss://default:password@your-upstash-url:6379

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
RESEND_API_KEY=re_xxx
FROM_EMAIL=noreply@automateos.in

# n8n
N8N_WEBHOOK_BASE=https://your-n8n-instance.com/webhook
```

---

## SECTION 9 — Build Order (Follow This Exactly)

| Step | What to Build | Why This Order |
|---|---|---|
| 1 | DB schema + RLS policies | Everything depends on the database |
| 2 | Token encryption utils | Needed before storing any client credentials |
| 3 | WhatsApp connect flow | Clients can't use anything without connecting |
| 4 | Webhook handler + tenant router | Foundation of all real-time features |
| 5 | Meta Graph API client (all message types) | Needed for all sending features |
| 6 | BullMQ queue + campaign engine | Core monetizable feature |
| 7 | Flow engine + session management | Bot builder logic |
| 8 | Trigger matcher | Inbound message routing |
| 9 | Cron jobs (reminders, drips, SLA) | Automation features |
| 10 | Template management (sync from Meta) | Required before any campaign |
| 11 | Stripe billing + credit wallet | Required before going live |
| 12 | Analytics + reporting queries | Polish before launch |

---

## SECTION 10 — Critical Rules the AI Must Never Break

1. **Always respond to Meta webhook within 5 seconds** — respond 200 first, process async after
2. **Never expose client access tokens** — encrypted in DB, decrypted only at API call time, never returned in responses
3. **Only use templates for first-contact messages** — plain text to cold numbers fails with error 131047
4. **Never message opted-out contacts** — check opted_out = false before every send
5. **Always include workspace_id in every DB query** — never query without tenant isolation
6. **Always queue campaigns, never send in a direct loop** — direct loops hit rate limits
7. **Phone numbers must be in E.164 format** — e.g. +919876543210, no spaces, no dashes
8. **Always subscribe to WABA webhooks after client connects** — POST /{waba_id}/subscribed_apps
9. **Check template is APPROVED before allowing campaign launch** — status must = 'APPROVED'
10. **Abandon flow sessions after 24h inactivity** — stale sessions cause ghost replies

---

*Document Version: 1.0*
*AutomateOS Implementation Requirements*
*Companion to: AutomateOS_WhatsApp_Backend_Logic.md*
