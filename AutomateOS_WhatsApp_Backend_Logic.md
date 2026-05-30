# AutomateOS — WhatsApp Backend Logic Master Document
### For AI Agent Implementation Reference

---

## TABLE OF CONTENTS

1. [How WhatsApp Cloud API Actually Works](#1-how-whatsapp-cloud-api-actually-works)
2. [Multi-Tenant Architecture — How Each Client Connects Their Own WhatsApp](#2-multi-tenant-architecture)
3. [Webhook Engine — The Heart of Everything](#3-webhook-engine)
4. [Database Schema — All Tables You Need](#4-database-schema)
5. [Message Types — What Can Be Sent and How](#5-message-types)
6. [Broadcast / Campaign Engine](#6-broadcast--campaign-engine)
7. [Chatbot / Flow Engine](#7-chatbot--flow-engine)
8. [Conversation State Machine](#8-conversation-state-machine)
9. [Appointment & Follow-up Automation](#9-appointment--follow-up-automation)
10. [Drip Sequence Engine](#10-drip-sequence-engine)
11. [Lead Qualification Bot Logic](#11-lead-qualification-bot-logic)
12. [Support Ticket Automation](#12-support-ticket-automation)
13. [Template Management](#13-template-management)
14. [Rate Limiting & Tier Management](#14-rate-limiting--tier-management)
15. [Error Handling & Retry Logic](#15-error-handling--retry-logic)
16. [Full API Route Map](#16-full-api-route-map)
17. [n8n Integration Points](#17-n8n-integration-points)
18. [Critical Rules — Never Break These](#18-critical-rules--never-break-these)

---

## 1. HOW WHATSAPP CLOUD API ACTUALLY WORKS

### The Real Picture

Meta hosts the WhatsApp Cloud API on their own infrastructure. Your AutomateOS backend NEVER touches WhatsApp servers directly — it talks to **Meta's Graph API** via HTTP REST calls.

```
YOUR CLIENT'S CUSTOMER  →  WhatsApp App
                                ↓
                        Meta's Cloud API Servers
                         ↙              ↘
            Outbound Messages         Inbound Webhook
         (you POST to Meta)        (Meta POSTs to you)
                                         ↓
                              YOUR WEBHOOK ENDPOINT
                              /api/webhook/whatsapp
                                         ↓
                              Route by tenant_id
                                         ↓
                              Your Business Logic
```

### Key IDs Every Developer Must Know

Every client (tenant) who connects their WhatsApp has THREE critical identifiers:

| ID | What It Is | Where It Comes From |
|---|---|---|
| `waba_id` | WhatsApp Business Account ID | Client's Meta account |
| `phone_number_id` | The specific phone number registered | Meta API Setup |
| `access_token` | Auth token to make API calls on their behalf | Client's System User |

**These are stored per-tenant in your DB. Never hardcode any of these.**

### How Messages Flow (Outbound — You Sending TO Customer)

```
1. Your backend calls:
   POST https://graph.facebook.com/v19.0/{phone_number_id}/messages
   Headers: Authorization: Bearer {tenant_access_token}
   Body: { message payload as JSON }

2. Meta receives it → delivers to WhatsApp user

3. Meta fires webhook back to YOUR server with delivery status:
   sent → delivered → read
```

### How Messages Flow (Inbound — Customer Sending TO You)

```
1. Customer sends message on WhatsApp

2. Meta fires a POST to YOUR webhook URL:
   POST https://yourapp.com/api/webhook/whatsapp

3. Your server reads:
   - phone_number_id → look up which tenant this belongs to
   - message content, type, from number

4. Your business logic handles it:
   - Is there an active bot flow? → Continue flow
   - Is an agent assigned? → Route to inbox
   - Is it a keyword trigger? → Fire automation
```

---

## 2. MULTI-TENANT ARCHITECTURE

### The Core Problem

You have 100 businesses using AutomateOS. Each has their own WhatsApp number. Meta sends ALL their inbound messages to ONE webhook URL on your server. You must figure out which business each message belongs to and route it correctly.

### Solution: Single Webhook + Tenant Router

```
Meta fires webhook → POST /api/webhook/whatsapp
                              ↓
         Read: entry[0].changes[0].value.metadata.phone_number_id
                              ↓
         DB Query: SELECT tenant_id FROM whatsapp_accounts
                   WHERE phone_number_id = '...'
                              ↓
              Route to that tenant's logic
```

### How a Client Connects Their WhatsApp (The Onboarding Flow)

**Step 1 — Client enters their credentials in your Settings page:**
Your UI shows a form asking for:
- WABA ID
- Phone Number ID
- Permanent Access Token (System User Token)
- Webhook Verify Token (they create this)

**Step 2 — Your backend validates and stores:**
```
POST /api/workspace/whatsapp/connect
Body: { waba_id, phone_number_id, access_token, display_name }

Backend does:
1. Call Meta Graph API to verify the token is valid
2. Encrypt the access_token before storing
3. Store in whatsapp_accounts table
4. Register YOUR webhook URL with Meta for this WABA:
   POST https://graph.facebook.com/v19.0/{waba_id}/subscribed_apps
   This tells Meta to send webhooks for this account to YOUR server
5. Return success
```

**Step 3 — Webhook subscription:**
Each WABA must explicitly subscribe to receive webhooks. Without this, messages arrive at Meta but never reach you. This is a critical step that MUST happen after credentials are saved.

**Step 4 — Client configures webhook on their Meta App:**
The client must set your webhook URL in their Meta Developer App:
```
Callback URL: https://yourapp.com/api/webhook/whatsapp
Verify Token: (any string they choose, stored in your DB)
```

**Webhook Verification Handshake (GET request):**
```javascript
// When Meta verifies the webhook, it sends a GET with:
// hub.mode = "subscribe"
// hub.verify_token = whatever the client set
// hub.challenge = a random string

// Your server must:
// 1. Check hub.verify_token matches what's stored
// 2. Respond with hub.challenge as plain text
// 3. Return 200 status

app.get('/api/webhook/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe') {
    // Find tenant by verify_token
    const tenant = await db.findTenantByVerifyToken(token);
    if (tenant) {
      return res.status(200).send(challenge); // Echo back challenge
    }
  }
  res.sendStatus(403);
});
```

---

## 3. WEBHOOK ENGINE

### The Webhook Payload Structure (What Meta Sends You)

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WABA_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "919876543210",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": { "name": "Customer Name" },
                "wa_id": "919876543210"
              }
            ],
            "messages": [
              {
                "from": "919876543210",
                "id": "wamid.UNIQUE_MESSAGE_ID",
                "timestamp": "1715000000",
                "type": "text",
                "text": { "body": "Hello" }
              }
            ],
            "statuses": [
              {
                "id": "wamid.UNIQUE_MESSAGE_ID",
                "status": "delivered",
                "timestamp": "1715000001",
                "recipient_id": "919876543210"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Message Types You Will Receive

| `type` field | What the customer sent |
|---|---|
| `text` | Plain text message |
| `interactive` | Button reply or list reply |
| `image` | Image file |
| `document` | PDF or doc |
| `audio` | Voice note |
| `video` | Video |
| `location` | GPS coordinates |
| `contacts` | Contact card |
| `button` | Template quick reply |

### Webhook Handler Logic (Master Router)

```javascript
// POST /api/webhook/whatsapp
app.post('/api/webhook/whatsapp', async (req, res) => {
  // CRITICAL: Always respond 200 within 5 seconds
  // If you fail 5 times, Meta disables your webhook
  res.status(200).send('OK'); // Respond IMMEDIATELY

  // Then process asynchronously
  processWebhookAsync(req.body);
});

async function processWebhookAsync(payload) {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  
  if (!change) return;

  const phoneNumberId = change.metadata?.phone_number_id;
  
  // Find which tenant this belongs to
  const tenant = await db.query(
    'SELECT * FROM whatsapp_accounts WHERE phone_number_id = $1',
    [phoneNumberId]
  );
  if (!tenant) return; // Unknown number, ignore
  
  // Route based on what arrived
  if (change.messages?.length > 0) {
    for (const message of change.messages) {
      await handleInboundMessage(tenant, message, change.contacts?.[0]);
    }
  }
  
  if (change.statuses?.length > 0) {
    for (const status of change.statuses) {
      await handleStatusUpdate(tenant, status);
    }
  }
}

async function handleInboundMessage(tenant, message, contact) {
  const from = message.from; // Customer's phone number
  const messageId = message.id;
  const type = message.type;

  // 1. Upsert contact in DB
  await upsertContact(tenant.workspace_id, from, contact?.profile?.name);

  // 2. Save message to conversations table
  await saveMessage(tenant.workspace_id, from, message, 'inbound');

  // 3. Determine routing
  const activeFlow = await getActiveFlow(tenant.workspace_id, from);
  const activeAgent = await getAssignedAgent(tenant.workspace_id, from);

  if (activeFlow) {
    // Bot is handling this conversation
    await processFlowStep(tenant, activeFlow, message);
  } else if (activeAgent) {
    // Human agent is handling — just deliver to inbox
    await notifyAgentInbox(tenant.workspace_id, activeAgent, message);
  } else {
    // No active flow, no agent — check triggers
    await checkTriggers(tenant, message);
  }
}

async function handleStatusUpdate(tenant, status) {
  // Update message delivery status in DB
  await db.query(
    `UPDATE messages SET status = $1, status_updated_at = NOW()
     WHERE whatsapp_message_id = $2 AND workspace_id = $3`,
    [status.status, status.id, tenant.workspace_id]
  );

  // If it's a campaign message, update campaign analytics
  await updateCampaignDeliveryStats(tenant.workspace_id, status.id, status.status);
}
```

---

## 4. DATABASE SCHEMA

### All Required Tables

```sql
-- TENANT WHATSAPP ACCOUNTS (one per business)
CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  phone_number_id TEXT NOT NULL UNIQUE,  -- Meta's phone number ID
  waba_id TEXT NOT NULL,
  display_phone_number TEXT NOT NULL,    -- e.g. +919876543210
  display_name TEXT,
  access_token_encrypted TEXT NOT NULL,  -- AES encrypted
  webhook_verify_token TEXT NOT NULL,
  status TEXT DEFAULT 'active',          -- active, disconnected, banned
  tier INTEGER DEFAULT 1,                -- Meta messaging tier 1,2,3,4
  daily_limit INTEGER DEFAULT 1000,      -- based on tier
  quality_rating TEXT DEFAULT 'GREEN',   -- GREEN, YELLOW, RED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTACTS (per workspace)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  phone TEXT NOT NULL,                   -- E.164 format: +919876543210
  name TEXT,
  email TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',      -- any extra data
  opted_in BOOLEAN DEFAULT true,
  opted_in_at TIMESTAMPTZ,
  opted_out BOOLEAN DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, phone)
);

-- CONVERSATIONS (one per contact-channel pair)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  contact_id UUID REFERENCES contacts(id),
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'open',            -- open, resolved, waiting
  assigned_agent_id UUID REFERENCES users(id),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  conversation_id UUID REFERENCES conversations(id),
  whatsapp_message_id TEXT UNIQUE,       -- wamid.XXX from Meta
  direction TEXT NOT NULL,               -- inbound, outbound
  type TEXT NOT NULL,                    -- text, image, template, interactive, etc.
  content JSONB NOT NULL,                -- full message payload
  status TEXT DEFAULT 'sent',            -- sent, delivered, read, failed
  status_updated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  campaign_id UUID,                      -- if part of a campaign
  flow_id UUID,                          -- if sent by a bot flow
  error_code TEXT,
  error_message TEXT
);

-- TEMPLATES (approved Meta templates, stored per workspace)
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  template_name TEXT NOT NULL,           -- must match Meta's template name exactly
  template_id TEXT,                      -- Meta's template ID
  category TEXT,                         -- MARKETING, UTILITY, AUTHENTICATION
  language TEXT DEFAULT 'en',
  status TEXT,                           -- APPROVED, PENDING, REJECTED
  components JSONB NOT NULL,             -- header, body, footer, buttons
  variables JSONB DEFAULT '[]',          -- list of variable placeholders
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAMPAIGNS (broadcast blasts)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',           -- draft, scheduled, running, completed, paused, failed
  template_id UUID REFERENCES whatsapp_templates(id),
  target_segment JSONB,                  -- filter criteria for contacts
  recipient_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,             -- null = immediate
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{
    "total": 0, "sent": 0, "delivered": 0,
    "read": 0, "replied": 0, "failed": 0
  }',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAMPAIGN RECIPIENTS (one row per contact per campaign)
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',         -- pending, sent, delivered, read, failed
  message_id TEXT,                       -- whatsapp_message_id after sending
  sent_at TIMESTAMPTZ,
  variables JSONB DEFAULT '{}',          -- personalization variables for this contact
  error_code TEXT
);

-- BOT FLOWS (visual workflow definitions)
CREATE TABLE bot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT,                     -- keyword, inbound, campaign_reply, schedule
  trigger_value TEXT,                    -- the keyword or event that starts this flow
  nodes JSONB NOT NULL,                  -- ReactFlow node definitions
  edges JSONB NOT NULL,                  -- ReactFlow edge definitions
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FLOW SESSIONS (tracks where each contact is in a flow)
CREATE TABLE flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  flow_id UUID REFERENCES bot_flows(id),
  contact_id UUID REFERENCES contacts(id),
  current_node_id TEXT NOT NULL,         -- which node in the flow they're at
  context JSONB DEFAULT '{}',            -- collected data so far (name, email, etc.)
  status TEXT DEFAULT 'active',          -- active, completed, abandoned
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                 -- auto-abandon if no activity
);

-- DRIP SEQUENCES
CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  trigger_event TEXT,                    -- new_lead, appointment_booked, custom
  steps JSONB NOT NULL,                  -- array of {delay_hours, template_id, message}
  is_active BOOLEAN DEFAULT true
);

-- SEQUENCE ENROLLMENTS (contacts enrolled in drip sequences)
CREATE TABLE sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES sequences(id),
  contact_id UUID REFERENCES contacts(id),
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',          -- active, completed, paused, cancelled
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  next_send_at TIMESTAMPTZ,
  UNIQUE(sequence_id, contact_id)        -- prevent duplicate enrollments
);

-- APPOINTMENTS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  contact_id UUID REFERENCES contacts(id),
  title TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'confirmed',       -- confirmed, cancelled, rescheduled, completed
  reminder_sent_24h BOOLEAN DEFAULT false,
  reminder_sent_1h BOOLEAN DEFAULT false,
  follow_up_sent BOOLEAN DEFAULT false,
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- SUPPORT TICKETS
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  contact_id UUID REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  title TEXT,
  description TEXT,
  priority TEXT DEFAULT 'medium',        -- low, medium, high, urgent
  status TEXT DEFAULT 'open',            -- open, in_progress, waiting_customer, resolved
  assigned_agent_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  sla_breach_at TIMESTAMPTZ             -- auto-calculate based on priority
);

-- AUTOMATION LOGS (every automation action logged)
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  entity_type TEXT,                      -- campaign, flow, sequence, appointment
  entity_id UUID,
  contact_id UUID,
  action TEXT,                           -- message_sent, flow_triggered, etc.
  result TEXT,                           -- success, failed, skipped
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. MESSAGE TYPES

### 5A. Text Message

```javascript
// Outbound: Send plain text (only during 24h service window)
async function sendTextMessage(tenant, toPhone, text) {
  return await callMetaAPI(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "text",
    text: { body: text }
  });
}
```

### 5B. Template Message (Required for broadcast / first contact)

Templates are pre-approved by Meta. You CANNOT send marketing messages without approved templates. Always use templates when:
- Contacting a customer first (no existing 24h window)
- Sending campaigns / broadcasts
- Sending reminders / notifications

```javascript
async function sendTemplateMessage(tenant, toPhone, templateName, language, variables) {
  // variables example: [{ type: "text", text: "John" }]
  
  const components = [];
  if (variables.header) {
    components.push({ type: "header", parameters: variables.header });
  }
  if (variables.body) {
    components.push({ type: "body", parameters: variables.body });
  }
  if (variables.buttons) {
    variables.buttons.forEach((btn, idx) => {
      components.push({
        type: "button",
        sub_type: btn.sub_type, // quick_reply or url
        index: idx.toString(),
        parameters: btn.parameters
      });
    });
  }

  return await callMetaAPI(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: language || "en" },
      components
    }
  });
}
```

### 5C. Interactive Message — Buttons (max 3 buttons)

```javascript
async function sendButtonMessage(tenant, toPhone, bodyText, buttons, headerText, footerText) {
  // buttons = [{ id: "btn_1", title: "Yes, confirm" }, ...]
  // Max 3 buttons, title max 20 chars

  return await callMetaAPI(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "interactive",
    interactive: {
      type: "button",
      header: headerText ? { type: "text", text: headerText } : undefined,
      body: { text: bodyText },
      footer: footerText ? { text: footerText } : undefined,
      action: {
        buttons: buttons.map(btn => ({
          type: "reply",
          reply: { id: btn.id, title: btn.title }
        }))
      }
    }
  });
}
```

### 5D. Interactive Message — List (up to 10 options)

```javascript
async function sendListMessage(tenant, toPhone, bodyText, buttonText, sections) {
  // sections = [{ title: "Options", rows: [{ id: "opt_1", title: "Option 1", description: "..." }] }]
  
  return await callMetaAPI(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonText,  // e.g. "Choose an option"
        sections
      }
    }
  });
}
```

### 5E. Media Messages

```javascript
async function sendMediaMessage(tenant, toPhone, type, mediaUrl, caption) {
  // type = 'image' | 'document' | 'audio' | 'video'
  return await callMetaAPI(tenant, {
    messaging_product: "whatsapp",
    to: toPhone,
    type,
    [type]: {
      link: mediaUrl,  // publicly accessible URL
      caption: caption || undefined
    }
  });
}
```

### The Core API Call Function

```javascript
async function callMetaAPI(tenant, payload) {
  const accessToken = decryptToken(tenant.access_token_encrypted);
  
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${tenant.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    // Log error, handle rate limits
    throw new WhatsAppAPIError(data.error);
  }

  // data.messages[0].id = the wamid (message ID for tracking)
  return data.messages?.[0]?.id;
}
```

---

## 6. BROADCAST / CAMPAIGN ENGINE

### How Campaigns Work — The Full Flow

```
Client creates campaign in UI
         ↓
Selects template + target contacts
         ↓
Backend resolves recipients (apply filters)
         ↓
Campaign saved as "scheduled" or "draft"
         ↓
Job scheduler triggers at scheduled_at
         ↓
Campaign status → "running"
         ↓
Batch processor pushes to message queue
         ↓
Queue workers send one by one (rate limited)
         ↓
Webhook updates delivery status per message
         ↓
Campaign stats updated in real time
         ↓
When all done → status "completed"
```

### Campaign Creation API

```javascript
// POST /api/campaigns
async function createCampaign(workspaceId, data) {
  const {
    name,
    templateId,
    scheduledAt,    // null = send now
    filters,        // { tags: ['VIP'], lastSeenBefore: '2024-01-01' }
    variableMapping // how to populate template vars from contact fields
  } = data;

  // 1. Resolve recipients based on filters
  const recipients = await resolveRecipients(workspaceId, filters);
  
  // 2. Check daily limit won't be exceeded
  const account = await getWhatsappAccount(workspaceId);
  await checkDailyLimit(account, recipients.length);

  // 3. Create campaign
  const campaign = await db.query(`
    INSERT INTO campaigns (workspace_id, name, template_id, target_segment, 
                          recipient_count, scheduled_at, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [workspaceId, name, templateId, filters, recipients.length,
      scheduledAt, scheduledAt ? 'scheduled' : 'queued']);

  // 4. Insert recipients
  await db.query(`
    INSERT INTO campaign_recipients (campaign_id, contact_id, phone, variables)
    SELECT $1, c.id, c.phone, $2
    FROM contacts c WHERE c.id = ANY($3)
  `, [campaign.id, variableMapping, recipients.map(r => r.id)]);

  // 5. Schedule or trigger immediately
  if (!scheduledAt) {
    await queueCampaignExecution(campaign.id);
  }

  return campaign;
}
```

### The Message Queue (BullMQ with Redis)

```javascript
import { Queue, Worker } from 'bullmq';

const campaignQueue = new Queue('campaign-messages', {
  connection: redisConnection
});

// When campaign is triggered, add all messages to queue
async function queueCampaignExecution(campaignId) {
  const recipients = await db.query(
    'SELECT * FROM campaign_recipients WHERE campaign_id = $1 AND status = $2',
    [campaignId, 'pending']
  );

  const campaign = await db.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
  const template = await db.query('SELECT * FROM whatsapp_templates WHERE id = $1', [campaign.template_id]);
  const account = await getWhatsappAccount(campaign.workspace_id);

  // Update campaign status
  await db.query('UPDATE campaigns SET status = $1, started_at = NOW() WHERE id = $2',
    ['running', campaignId]);

  // Add each recipient as a job with delay for rate limiting
  // Meta allows 80 messages/sec max, we use 10/sec to be safe
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const delay = Math.floor(i / 10) * 1000; // 10 per second = batch every 1000ms

    await campaignQueue.add('send-campaign-message', {
      campaignId,
      recipientId: recipient.id,
      phone: recipient.phone,
      variables: recipient.variables,
      templateName: template.template_name,
      language: template.language,
      tenantId: campaign.workspace_id
    }, {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });
  }
}

// Worker processes jobs
const worker = new Worker('campaign-messages', async (job) => {
  const { campaignId, recipientId, phone, variables, templateName, language, tenantId } = job.data;

  const tenant = await getWhatsappAccount(tenantId);

  try {
    const messageId = await sendTemplateMessage(tenant, phone, templateName, language, variables);

    // Update recipient status
    await db.query(`
      UPDATE campaign_recipients
      SET status = 'sent', message_id = $1, sent_at = NOW()
      WHERE id = $2
    `, [messageId, recipientId]);

    // Update campaign sent count
    await db.query(`
      UPDATE campaigns
      SET stats = jsonb_set(stats, '{sent}', (CAST(stats->>'sent' AS int) + 1)::text::jsonb)
      WHERE id = $1
    `, [campaignId]);

    // Check if campaign is complete
    await checkCampaignCompletion(campaignId);

  } catch (error) {
    await db.query(`
      UPDATE campaign_recipients
      SET status = 'failed', error_code = $1
      WHERE id = $2
    `, [error.code, recipientId]);
  }
}, { connection: redisConnection, concurrency: 10 });
```

---

## 7. CHATBOT / FLOW ENGINE

### Node Types in the Visual Builder

Your ReactFlow builder creates flows with these node types:

| Node Type | What It Does | DB Representation |
|---|---|---|
| `trigger` | Entry point (keyword, inbound, etc.) | `{ type: 'trigger', triggerType: 'keyword', value: 'hello' }` |
| `send_message` | Send a text message | `{ type: 'send_message', text: '...' }` |
| `send_buttons` | Send interactive buttons | `{ type: 'send_buttons', body: '...', buttons: [...] }` |
| `send_list` | Send a list menu | `{ type: 'send_list', sections: [...] }` |
| `send_template` | Send approved template | `{ type: 'send_template', templateId: '...' }` |
| `collect_input` | Wait for user response, save to context | `{ type: 'collect_input', variable: 'name', prompt: 'What is your name?' }` |
| `condition` | Branch based on context value | `{ type: 'condition', variable: 'city', operator: 'equals', value: 'Mumbai' }` |
| `set_variable` | Set a value in context | `{ type: 'set_variable', variable: 'lead_score', value: '10' }` |
| `tag_contact` | Add tag to contact | `{ type: 'tag_contact', tag: 'hot_lead' }` |
| `assign_agent` | Assign to a human agent | `{ type: 'assign_agent', agentId: '...' }` |
| `create_ticket` | Create support ticket | `{ type: 'create_ticket', priority: 'high' }` |
| `webhook` | Call external API | `{ type: 'webhook', url: '...', method: 'POST' }` |
| `delay` | Wait before next step | `{ type: 'delay', hours: 2 }` |
| `end_flow` | Terminate the flow | `{ type: 'end_flow' }` |

### Flow Engine Processor

```javascript
async function processFlowStep(tenant, session, incomingMessage) {
  const flow = await db.query('SELECT * FROM bot_flows WHERE id = $1', [session.flow_id]);
  const currentNode = getNodeById(flow.nodes, session.current_node_id);

  if (!currentNode) {
    await endFlowSession(session.id);
    return;
  }

  // Update last activity
  await db.query('UPDATE flow_sessions SET last_activity_at = NOW() WHERE id = $1', [session.id]);

  // Handle the current node based on type
  switch (currentNode.type) {
    case 'collect_input': {
      // We were waiting for user input — now we have it
      const userResponse = extractUserResponse(incomingMessage);
      
      // Save response to session context
      const updatedContext = {
        ...session.context,
        [currentNode.data.variable]: userResponse
      };
      await db.query('UPDATE flow_sessions SET context = $1 WHERE id = $2',
        [updatedContext, session.id]);

      // Move to next node
      const nextNode = getNextNode(flow, currentNode, userResponse);
      await moveToNode(tenant, session, flow, nextNode, updatedContext);
      break;
    }

    case 'interactive': {
      // User clicked a button or list item
      const buttonId = incomingMessage.interactive?.button_reply?.id
                    || incomingMessage.interactive?.list_reply?.id;
      
      const nextNode = getNextNodeByButtonId(flow, currentNode, buttonId);
      await moveToNode(tenant, session, flow, nextNode, session.context);
      break;
    }
  }
}

async function moveToNode(tenant, session, flow, node, context) {
  if (!node) {
    await endFlowSession(session.id);
    return;
  }

  // Update current node in session
  await db.query('UPDATE flow_sessions SET current_node_id = $1 WHERE id = $2',
    [node.id, session.id]);

  // Execute this node's action
  await executeNode(tenant, session, node, context, flow);
}

async function executeNode(tenant, session, node, context, flow) {
  const contact = await getContact(session.contact_id);

  switch (node.type) {
    case 'send_message': {
      const text = interpolateVariables(node.data.text, context, contact);
      await sendTextMessage(tenant, contact.phone, text);
      
      // Auto-advance if next node doesn't need input
      const nextNode = getFirstEdgeTarget(flow, node.id);
      if (nextNode && !requiresUserInput(nextNode)) {
        await moveToNode(tenant, session, flow, nextNode, context);
      }
      break;
    }

    case 'send_buttons': {
      const body = interpolateVariables(node.data.body, context, contact);
      await sendButtonMessage(tenant, contact.phone, body, node.data.buttons);
      // Wait for button reply — don't auto-advance
      break;
    }

    case 'send_list': {
      await sendListMessage(tenant, contact.phone, node.data.body,
                           node.data.buttonText, node.data.sections);
      // Wait for list selection
      break;
    }

    case 'collect_input': {
      const prompt = interpolateVariables(node.data.prompt, context, contact);
      await sendTextMessage(tenant, contact.phone, prompt);
      // Wait for text reply
      break;
    }

    case 'condition': {
      const value = context[node.data.variable];
      const matches = evaluateCondition(value, node.data.operator, node.data.value);
      const nextNode = getConditionalNext(flow, node.id, matches ? 'true' : 'false');
      await moveToNode(tenant, session, flow, nextNode, context);
      break;
    }

    case 'tag_contact': {
      await db.query(
        'UPDATE contacts SET tags = array_append(tags, $1) WHERE id = $2',
        [node.data.tag, session.contact_id]
      );
      const nextNode = getFirstEdgeTarget(flow, node.id);
      await moveToNode(tenant, session, flow, nextNode, context);
      break;
    }

    case 'assign_agent': {
      await db.query(
        'UPDATE conversations SET assigned_agent_id = $1 WHERE contact_id = $2',
        [node.data.agentId, session.contact_id]
      );
      await endFlowSession(session.id); // Human takes over
      break;
    }

    case 'create_ticket': {
      await createSupportTicket(tenant.workspace_id, session.contact_id, {
        title: context.issue_title || 'Support Request',
        description: context.issue_description || '',
        priority: node.data.priority || 'medium'
      });
      const nextNode = getFirstEdgeTarget(flow, node.id);
      await moveToNode(tenant, session, flow, nextNode, context);
      break;
    }

    case 'webhook': {
      const response = await callExternalWebhook(node.data.url, node.data.method, context);
      const updatedContext = { ...context, webhook_response: response };
      const nextNode = getFirstEdgeTarget(flow, node.id);
      await moveToNode(tenant, session, flow, nextNode, updatedContext);
      break;
    }

    case 'delay': {
      // Schedule continuation after delay
      await scheduleFlowResume(session.id, node.id, node.data.hours);
      break;
    }

    case 'end_flow': {
      await endFlowSession(session.id);
      break;
    }
  }
}

// Variable interpolation: {{name}} → "John"
function interpolateVariables(text, context, contact) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] || contact[key] || match;
  });
}
```

---

## 8. CONVERSATION STATE MACHINE

### The Logic That Decides What Happens When a Message Arrives

```
INBOUND MESSAGE ARRIVES
         ↓
Does this contact have an ACTIVE FLOW SESSION?
   YES → processFlowStep()
   NO  ↓
Is this contact ASSIGNED TO AN AGENT?
   YES → Push to agent inbox, skip automation
   NO  ↓
Check KEYWORD TRIGGERS (does message match any?)
   YES → Start matched flow
   NO  ↓
Check FALLBACK FLOW (workspace default bot)
   YES → Start fallback flow
   NO  ↓
Send DEFAULT REPLY (if configured)
   or just log to inbox unassigned
```

### Trigger Matching Logic

```javascript
async function checkTriggers(tenant, message) {
  if (message.type !== 'text') return; // Only text can match keywords
  
  const text = message.text?.body?.toLowerCase().trim();
  
  // Load all active flows for this workspace
  const flows = await db.query(
    `SELECT * FROM bot_flows
     WHERE workspace_id = $1 AND is_active = true
     AND trigger_type = 'keyword'`,
    [tenant.workspace_id]
  );

  let matchedFlow = null;

  for (const flow of flows) {
    const keywords = flow.trigger_value.split(',').map(k => k.trim().toLowerCase());
    
    // Exact match
    if (keywords.includes(text)) {
      matchedFlow = flow;
      break;
    }
    
    // Contains match (configurable per flow)
    if (flow.trigger_match_type === 'contains') {
      if (keywords.some(k => text.includes(k))) {
        matchedFlow = flow;
        break;
      }
    }
  }

  if (matchedFlow) {
    await startFlowSession(tenant, matchedFlow, message.from);
  } else {
    // Check for workspace default fallback flow
    const fallback = await getFallbackFlow(tenant.workspace_id);
    if (fallback) {
      await startFlowSession(tenant, fallback, message.from);
    }
  }
}

async function startFlowSession(tenant, flow, phone) {
  const contact = await getOrCreateContact(tenant.workspace_id, phone);

  // End any existing active session for this contact
  await db.query(
    `UPDATE flow_sessions SET status = 'abandoned'
     WHERE contact_id = $1 AND status = 'active'`,
    [contact.id]
  );

  // Find the trigger node (entry point)
  const triggerNode = flow.nodes.find(n => n.type === 'trigger');
  const firstActionNode = getFirstEdgeTarget(flow, triggerNode.id);

  if (!firstActionNode) return;

  // Create new session
  const session = await db.query(`
    INSERT INTO flow_sessions (workspace_id, flow_id, contact_id, current_node_id, status)
    VALUES ($1, $2, $3, $4, 'active')
    RETURNING *
  `, [tenant.workspace_id, flow.id, contact.id, firstActionNode.id]);

  // Execute the first node
  await executeNode(tenant, session.rows[0], firstActionNode, {}, flow);
}
```

---

## 9. APPOINTMENT & FOLLOW-UP AUTOMATION

### Reminder System (Cron Jobs)

```javascript
// Run every 15 minutes
async function appointmentReminderCron() {
  const now = new Date();
  
  // 24-hour reminders
  const appointments24h = await db.query(`
    SELECT a.*, c.phone, w.workspace_id
    FROM appointments a
    JOIN contacts c ON c.id = a.contact_id
    JOIN workspaces w ON w.id = a.workspace_id
    WHERE a.status = 'confirmed'
    AND a.reminder_sent_24h = false
    AND a.scheduled_at BETWEEN NOW() + interval '23 hours' 
                            AND NOW() + interval '25 hours'
  `);

  for (const appt of appointments24h) {
    const tenant = await getWhatsappAccount(appt.workspace_id);
    
    await sendTemplateMessage(tenant, appt.phone, 'appointment_reminder_24h', 'en', {
      body: [
        { type: 'text', text: appt.title },
        { type: 'text', text: formatDate(appt.scheduled_at) }
      ]
    });

    await db.query(
      'UPDATE appointments SET reminder_sent_24h = true WHERE id = $1',
      [appt.id]
    );
  }

  // 1-hour reminders
  const appointments1h = await db.query(`...similar query for 1 hour...`);
  // same pattern

  // Post-appointment follow-up (sent 2 hours after scheduled time)
  const completedAppts = await db.query(`
    SELECT * FROM appointments
    WHERE status = 'confirmed'
    AND follow_up_sent = false
    AND scheduled_at < NOW() - interval '2 hours'
  `);

  for (const appt of completedAppts) {
    const tenant = await getWhatsappAccount(appt.workspace_id);
    
    // Send feedback request with rating buttons
    await sendButtonMessage(tenant, appt.phone,
      "Thank you for your visit! How was your experience?",
      [
        { id: 'rating_excellent', title: '⭐ Excellent' },
        { id: 'rating_good', title: '👍 Good' },
        { id: 'rating_poor', title: '👎 Needs Improvement' }
      ]
    );

    await db.query(
      'UPDATE appointments SET follow_up_sent = true WHERE id = $1',
      [appt.id]
    );
  }
}
```

---

## 10. DRIP SEQUENCE ENGINE

### How Drip Sequences Work

```javascript
// Enroll a contact in a sequence
async function enrollInSequence(sequenceId, contactId) {
  const sequence = await db.query('SELECT * FROM sequences WHERE id = $1', [sequenceId]);
  const firstStep = sequence.steps[0];

  await db.query(`
    INSERT INTO sequence_enrollments (sequence_id, contact_id, current_step, next_send_at)
    VALUES ($1, $2, 0, $3)
    ON CONFLICT (sequence_id, contact_id) DO NOTHING
  `, [sequenceId, contactId, new Date(Date.now() + firstStep.delay_hours * 3600000)]);
}

// Cron job: process due sequence steps
async function sequenceCron() {
  const dueEnrollments = await db.query(`
    SELECT se.*, s.steps, s.workspace_id, c.phone
    FROM sequence_enrollments se
    JOIN sequences s ON s.id = se.sequence_id
    JOIN contacts c ON c.id = se.contact_id
    WHERE se.status = 'active'
    AND se.next_send_at <= NOW()
  `);

  for (const enrollment of dueEnrollments) {
    const step = enrollment.steps[enrollment.current_step];
    if (!step) {
      // No more steps — complete the sequence
      await db.query(
        'UPDATE sequence_enrollments SET status = $1 WHERE id = $2',
        ['completed', enrollment.id]
      );
      continue;
    }

    const tenant = await getWhatsappAccount(enrollment.workspace_id);

    // Send the message for this step
    if (step.template_id) {
      await sendTemplateMessage(tenant, enrollment.phone, step.template_name, step.language, step.variables);
    } else {
      await sendTextMessage(tenant, enrollment.phone, step.message);
    }

    // Advance to next step
    const nextStep = enrollment.steps[enrollment.current_step + 1];
    const nextSendAt = nextStep
      ? new Date(Date.now() + nextStep.delay_hours * 3600000)
      : null;

    await db.query(`
      UPDATE sequence_enrollments
      SET current_step = $1, next_send_at = $2,
          status = $3
      WHERE id = $4
    `, [
      enrollment.current_step + 1,
      nextSendAt,
      nextStep ? 'active' : 'completed',
      enrollment.id
    ]);
  }
}
```

---

## 11. LEAD QUALIFICATION BOT LOGIC

### The Qualification Flow Pattern

```javascript
// A typical lead qualification flow stores answers to questions
// in the flow session context, then creates a lead/contact record

// Example hospital lead flow:
const hospitalLeadFlow = {
  nodes: [
    { id: 'start', type: 'trigger', data: { triggerType: 'keyword', value: 'hi,hello,book,appointment' } },
    { id: 'greet', type: 'send_message', data: { text: "Hello {{name}}! Welcome to City Hospital. How can I help you today?" } },
    { id: 'menu', type: 'send_list', data: {
      body: "Please select what you need:",
      buttonText: "Choose",
      sections: [{
        title: "Services",
        rows: [
          { id: 'book_apt', title: '📅 Book Appointment' },
          { id: 'view_reports', title: '📋 View Lab Reports' },
          { id: 'doctor_info', title: '👨‍⚕️ Doctor Information' },
          { id: 'emergency', title: '🚨 Emergency' },
          { id: 'talk_agent', title: '💬 Talk to Someone' }
        ]
      }]
    }},
    { id: 'collect_name', type: 'collect_input', data: { variable: 'patient_name', prompt: "Please share your full name:" } },
    { id: 'collect_phone', type: 'collect_input', data: { variable: 'alt_phone', prompt: "Your contact number (we'll call to confirm):" } },
    { id: 'collect_dept', type: 'send_buttons', data: {
      body: "Which department?",
      buttons: [
        { id: 'dept_general', title: 'General OPD' },
        { id: 'dept_cardio', title: 'Cardiology' },
        { id: 'dept_ortho', title: 'Orthopedic' }
      ]
    }},
    { id: 'confirm', type: 'send_message', data: { text: "✅ Your appointment request has been noted!\nName: {{patient_name}}\nDept: {{dept}}\nWe'll confirm within 30 minutes." } },
    { id: 'tag', type: 'tag_contact', data: { tag: 'appointment_requested' } },
    { id: 'notify', type: 'webhook', data: { url: '/api/internal/notify-team', method: 'POST' } },
    { id: 'end', type: 'end_flow' }
  ]
};

// After flow completes, score the lead
async function scoreLead(contactId, context) {
  let score = 0;
  
  if (context.patient_name) score += 20;
  if (context.alt_phone) score += 20;
  if (context.dept) score += 30;
  if (context.preferred_date) score += 30;

  await db.query(
    'UPDATE contacts SET custom_fields = jsonb_set(custom_fields, \'{lead_score}\', $1) WHERE id = $2',
    [score.toString(), contactId]
  );

  // Tag based on score
  const tag = score >= 80 ? 'hot_lead' : score >= 50 ? 'warm_lead' : 'cold_lead';
  await db.query(
    'UPDATE contacts SET tags = array_append(tags, $1) WHERE id = $2',
    [tag, contactId]
  );
}
```

---

## 12. SUPPORT TICKET AUTOMATION

```javascript
// When inbound message is about a complaint/issue
async function createSupportTicket(workspaceId, contactId, data) {
  const { title, description, priority } = data;
  
  // SLA times by priority
  const slaHours = { urgent: 1, high: 4, medium: 24, low: 72 };
  const slaBreachAt = new Date(Date.now() + slaHours[priority] * 3600000);

  const ticket = await db.query(`
    INSERT INTO support_tickets 
    (workspace_id, contact_id, title, description, priority, sla_breach_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [workspaceId, contactId, title, description, priority, slaBreachAt]);

  // Auto-acknowledgement to customer
  const contact = await getContact(contactId);
  const tenant = await getWhatsappAccount(workspaceId);
  
  await sendTextMessage(tenant, contact.phone,
    `✅ Your request has been received!\n\nTicket ID: #${ticket.id.slice(0, 8).toUpperCase()}\nPriority: ${priority}\nExpected response: within ${slaHours[priority]} hour(s)\n\nOur team will get back to you shortly.`
  );

  // Notify agents
  await notifyTeamChannel(workspaceId, ticket);

  return ticket;
}

// SLA breach monitor (cron every 15 min)
async function slaBreachMonitor() {
  const breachedTickets = await db.query(`
    SELECT st.*, c.phone
    FROM support_tickets st
    JOIN contacts c ON c.id = st.contact_id
    WHERE st.status NOT IN ('resolved', 'closed')
    AND st.sla_breach_at < NOW()
    AND NOT (st.metadata->>'sla_breach_notified')::boolean
  `);

  for (const ticket of breachedTickets) {
    // Alert manager / escalate
    await escalateTicket(ticket);
    
    await db.query(`
      UPDATE support_tickets
      SET metadata = jsonb_set(metadata, '{sla_breach_notified}', 'true')
      WHERE id = $1
    `, [ticket.id]);
  }
}
```

---

## 13. TEMPLATE MANAGEMENT

### Syncing Templates from Meta

```javascript
// GET /api/templates/sync
async function syncTemplatesFromMeta(workspaceId) {
  const tenant = await getWhatsappAccount(workspaceId);
  const accessToken = decryptToken(tenant.access_token_encrypted);
  
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${tenant.waba_id}/message_templates?limit=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  const { data: templates } = await response.json();
  
  for (const template of templates) {
    await db.query(`
      INSERT INTO whatsapp_templates 
      (workspace_id, template_name, template_id, category, language, status, components)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (workspace_id, template_name, language)
      DO UPDATE SET status = EXCLUDED.status, components = EXCLUDED.components
    `, [workspaceId, template.name, template.id, template.category,
        template.language, template.status, template.components]);
  }
}
```

---

## 14. RATE LIMITING & TIER MANAGEMENT

### Meta's Tier System

| Tier | Max Unique Users / 24h |
|---|---|
| Tier 1 | 1,000 |
| Tier 2 | 10,000 |
| Tier 3 | 100,000 |
| Tier 4 | Unlimited |

**IMPORTANT:** Tier applies per phone number, not per your platform. Each of your clients has their own tier based on their number's history and quality rating.

### What Your Backend Must Track

```javascript
// Before any broadcast, check if it will exceed daily limit
async function checkDailyLimit(account, recipientCount) {
  const sentToday = await db.query(`
    SELECT COUNT(DISTINCT contact_id) as count
    FROM campaign_recipients cr
    JOIN campaigns c ON c.id = cr.campaign_id
    WHERE c.workspace_id = $1
    AND cr.sent_at > NOW() - interval '24 hours'
    AND cr.status IN ('sent', 'delivered', 'read')
  `, [account.workspace_id]);

  const alreadySent = parseInt(sentToday.rows[0].count);
  const limit = account.daily_limit; // 1000 for tier 1

  if (alreadySent + recipientCount > limit) {
    throw new Error(`Daily limit exceeded. Already sent to ${alreadySent} unique contacts today. Limit: ${limit}`);
  }
}
```

### Rate Limiting the Queue

```
Meta's hard limit: 80 messages/second per phone number
Your safe limit: 10 messages/second (to avoid hitting it)
Pair rate limit: Don't send >1 message to same number within 60 seconds
```

```javascript
// When building the queue, add inter-message delays
const MESSAGES_PER_SECOND = 10;
const DELAY_BETWEEN_BATCHES_MS = 1000;

for (let i = 0; i < recipients.length; i++) {
  const batchIndex = Math.floor(i / MESSAGES_PER_SECOND);
  const delay = batchIndex * DELAY_BETWEEN_BATCHES_MS;
  
  await campaignQueue.add('send', jobData, { delay });
}
```

---

## 15. ERROR HANDLING & RETRY LOGIC

### Meta Error Codes You MUST Handle

| Error Code | Meaning | Action |
|---|---|---|
| 130429 | Rate limit hit (throughput) | Retry after 60s with backoff |
| 131026 | Number not on WhatsApp | Mark contact as invalid, skip |
| 131047 | 24h window expired — must use template | Switch to template message |
| 131049 | Marketing template limit | Reduce frequency, flag contact |
| 131051 | Unsupported message type | Fallback to supported type |
| 131056 | Pair rate limit (too many to same user) | Delay and retry |
| 132001 | Template not found or not approved | Check template status |
| 100 | Invalid access token | Alert tenant to reconnect |

```javascript
class WhatsAppAPIError extends Error {
  constructor(metaError) {
    super(metaError.message);
    this.code = metaError.code;
    this.subcode = metaError.error_subcode;
    this.type = metaError.type;
  }
}

async function handleSendError(error, recipientId, jobData) {
  const code = error.code;

  switch (code) {
    case 130429: // Throughput rate limit
    case 131056: // Pair rate limit
      // Retry with backoff — BullMQ handles this automatically
      throw error; // Rethrow to trigger retry

    case 131026: // Not on WhatsApp
      await db.query(
        'UPDATE contacts SET custom_fields = jsonb_set(custom_fields, \'{invalid_whatsapp}\', \'true\') WHERE phone = $1',
        [jobData.phone]
      );
      // Don't retry
      return;

    case 100: // Bad token
      await alertTenantTokenExpired(jobData.tenantId);
      // Pause all campaigns for this tenant
      await pauseAllCampaigns(jobData.tenantId);
      return;

    default:
      // Log and skip
      console.error('WhatsApp send failed:', error);
  }
}
```

---

## 16. FULL API ROUTE MAP

```
# WhatsApp Connection
POST   /api/workspace/whatsapp/connect          → Save credentials, subscribe webhook
DELETE /api/workspace/whatsapp/disconnect       → Remove, unsubscribe
GET    /api/workspace/whatsapp/status           → Connection status + tier info

# Webhook (external, called by Meta)
GET    /api/webhook/whatsapp                    → Webhook verification
POST   /api/webhook/whatsapp                    → Receive messages & status updates

# Contacts
GET    /api/contacts                            → List with filters
POST   /api/contacts                            → Create single
POST   /api/contacts/import                     → Bulk import from CSV
DELETE /api/contacts/:id                        → Delete
POST   /api/contacts/:id/opt-out               → Mark opted out
POST   /api/contacts/:id/tags                  → Add/remove tags

# Templates
GET    /api/templates                           → List templates
POST   /api/templates/sync                      → Sync from Meta API
POST   /api/templates                           → Create new (submit to Meta)

# Campaigns
GET    /api/campaigns                           → List campaigns
POST   /api/campaigns                           → Create campaign
POST   /api/campaigns/:id/send                  → Trigger send
POST   /api/campaigns/:id/pause                 → Pause running campaign
GET    /api/campaigns/:id/stats                 → Real-time stats
GET    /api/campaigns/:id/recipients            → Recipient list with statuses

# Bot Flows
GET    /api/flows                               → List flows
POST   /api/flows                               → Create flow
PUT    /api/flows/:id                           → Update flow (save canvas)
POST   /api/flows/:id/activate                  → Enable flow
POST   /api/flows/:id/deactivate               → Disable flow
GET    /api/flows/:id/sessions                  → Active sessions

# Conversations (Inbox)
GET    /api/conversations                       → List with filters
GET    /api/conversations/:id/messages          → Message history
POST   /api/conversations/:id/send             → Send message as agent
POST   /api/conversations/:id/assign           → Assign to agent
POST   /api/conversations/:id/resolve          → Mark resolved

# Sequences (Drip)
GET    /api/sequences                           → List sequences
POST   /api/sequences                           → Create
POST   /api/sequences/:id/enroll               → Enroll contacts
DELETE /api/sequences/:id/enrollments/:contactId → Unenroll

# Appointments
GET    /api/appointments                        → List
POST   /api/appointments                        → Create (triggers reminder automation)
PUT    /api/appointments/:id                    → Update / reschedule
POST   /api/appointments/:id/cancel            → Cancel + notify

# Support Tickets
GET    /api/tickets                             → List
POST   /api/tickets                             → Create
PUT    /api/tickets/:id                         → Update status/priority
POST   /api/tickets/:id/assign                 → Assign agent
POST   /api/tickets/:id/resolve                → Mark resolved + CSAT message
```

---

## 17. n8n INTEGRATION POINTS

Your architecture uses n8n for complex automations. Here's how AutomateOS connects:

```javascript
// When a flow node type = 'webhook', call n8n
async function triggerN8nWorkflow(workflowWebhookUrl, context) {
  const response = await fetch(workflowWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact: context.contact,
      session_context: context.flowContext,
      workspace_id: context.workspaceId,
      timestamp: new Date().toISOString()
    })
  });
  return await response.json();
}
```

**n8n handles:**
- Complex CRM integrations
- Payment verification
- External database lookups
- Multi-step API chains
- Scheduled bulk operations

**AutomateOS handles:**
- WhatsApp message sending/receiving
- Flow state management
- Contact management
- Campaign queuing

---

## 18. CRITICAL RULES — NEVER BREAK THESE

### Rule 1: Always respond to webhook within 5 seconds
```javascript
// ALWAYS do this pattern — respond first, process after
app.post('/api/webhook/whatsapp', (req, res) => {
  res.status(200).send('OK');   // Immediate response
  processAsync(req.body);        // Async processing after
});
```

### Rule 2: Never expose access tokens to frontend
Tokens are encrypted in DB, decrypted only in backend at call time.

### Rule 3: Only use templates for first-contact messages
If no 24h service window exists, you MUST use an approved template.
Sending a plain text message to a cold number will fail with error 131047.

### Rule 4: Opt-outs are sacred
If a contact replies STOP / opt-out — immediately set opted_out = true and NEVER message them again. Violating this gets the phone number banned.

### Rule 5: Subscribe to WABA webhooks after connecting
Without calling `POST /{waba_id}/subscribed_apps`, inbound messages won't arrive.

### Rule 6: Tenant data isolation everywhere
Every DB query MUST include `workspace_id = $X`. Never query without it.

### Rule 7: Queue campaigns, never send directly
Direct loops will hit rate limits. Always go through BullMQ.

### Rule 8: Phone numbers in E.164 format
Always store and send as `+919876543210` (country code, no spaces, no dashes).

### Rule 9: Validate templates exist and are APPROVED before campaign
Check status = 'APPROVED' before allowing a campaign to launch.

### Rule 10: Session cleanup
If a flow session has no activity for 24 hours, mark it abandoned. Old sessions can cause ghost replies from stale state.

---

## ENVIRONMENT VARIABLES NEEDED

```env
# Meta / WhatsApp
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
WHATSAPP_API_VERSION=v19.0
WEBHOOK_BASE_URL=https://yourapp.com

# Encryption (for storing access tokens)
ENCRYPTION_KEY=32-char-random-string

# Queue
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://...

# n8n
N8N_WEBHOOK_BASE=https://your-n8n.com/webhook
```

---

*Document Version: 1.0 | AutomateOS WhatsApp Backend*
*Last Updated: May 2026*
*For AI Agent Use — Complete backend implementation reference*
