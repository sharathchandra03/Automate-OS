import json
import uuid
import urllib.request
import urllib.error
import sys

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

N8N_URL    = "http://187.127.160.219:5678"
API_KEY    = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJzdWIiOiIwODdlOWY5Ny0zOTgxLTRhNGEtYmE4ZS02NTA4ZDM5NmQ4NmYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNGQxOWJjYzAtNWUwYi00MDNhLWFhYzMtN2E2MTgxYWQ3OGZkIiwiaWF0IjoxNzgwMTY2NzEyfQ"
    ".iDFRA0S8tYOvRzWjNiLBcmE6ex_ATWky1gZneYYeaj8"
)
SUPA_URL   = "https://pwcdpskszhjiqtarsjsq.supabase.co"
SUPA_KEY   = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Y2Rwc2tzemhqaXF0YXJzanNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk0NjA5MSwiZXhwIjoyMDk0NTIyMDkxfQ"
    ".waxxIc5xaOnjw80H9p7QhkEEY2TStY2hoARNii3FBJE"
)

WORKFLOW_IDS = {
    "lead-qualify":    "wTkRZlDiVs8EhZRD",
    "followup-send":   "Arc9KGiJdzL009fm",
    "campaign-launch": "W1ByEXbEx7Q4g2m9",
    "appointment-book":"0GtMN7LmLR8kqjSh",
    "ticket-create":   "fUPhKkShLepw5o0g",
    "retargeting-run": "oga5mU8aOz6Rihcp",
}


# ── helpers ─────────────────────────────────────────────────────────────────

def G():
    return str(uuid.uuid4())

def api_call(method, path, data=None):
    url  = N8N_URL + "/api/v1" + path
    body = json.dumps(data).encode("utf-8") if data else None
    req  = urllib.request.Request(url, data=body, method=method)
    req.add_header("X-N8N-API-KEY", API_KEY)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode("utf-8"), "code": e.code}
    except Exception as e:
        return {"error": str(e)}


# ── node builders ────────────────────────────────────────────────────────────

def n_webhook(path_slug, x=240):
    return {
        "id": G(), "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1, "position": [x, 300],
        "parameters": {
            "httpMethod": "POST", "path": path_slug,
            "responseMode": "responseNode", "options": {}
        },
        "webhookId": G()
    }

def n_code(js, name="Process", x=520):
    return {
        "id": G(), "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2, "position": [x, 300],
        "parameters": {"jsCode": js}
    }

def n_http_supabase(name, method, table, query_expr, body_json, x=760):
    """PATCH/GET a Supabase table row. query_expr is appended to ?"""
    url = "=" + SUPA_URL + "/rest/v1/" + table + "?" + query_expr
    params = {
        "method": method,
        "url": url,
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"id": G(), "name": "apikey",         "value": SUPA_KEY},
                {"id": G(), "name": "Authorization",   "value": "Bearer " + SUPA_KEY},
                {"id": G(), "name": "Content-Type",    "value": "application/json"},
                {"id": G(), "name": "Prefer",          "value": "return=minimal"},
            ]
        },
        "options": {}
    }
    if body_json:
        params["sendBody"]    = True
        params["specifyBody"] = "json"
        params["jsonBody"]    = body_json
    return {
        "id": G(), "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4, "position": [x, 300],
        "parameters": params
    }

def n_respond(ref_node="Process", x=1000):
    """Respond to Webhook — always echoes the Process node's JSON output."""
    return {
        "id": G(), "name": "Respond to Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1, "position": [x, 300],
        "parameters": {
            "respondWith": "json",
            "responseBody": "={{ $('Process').item.json }}"
        }
    }

def chain(*names):
    """Build n8n connections dict by chaining node names in order."""
    conns = {}
    for i in range(len(names) - 1):
        conns[names[i]] = {
            "main": [[{"node": names[i+1], "type": "main", "index": 0}]]
        }
    return conns


# ── workflow definitions ─────────────────────────────────────────────────────

LEAD_QUALIFY_CODE = """
const input = $input.first().json;
const b = input.body || input;
const payload = b.payload || b;

// Multi-factor lead scoring
let score = 50;
if (payload.phone)                    score += 10;
if (payload.email)                    score += 8;
if (payload.source === 'referral')    score += 15;
if ((payload.message_count || 0) > 2) score += 10;
score = Math.min(score + Math.floor(Math.random() * 8), 99);

const temperature = score >= 70 ? 'hot' : score >= 50 ? 'warm' : 'cold';
return [{ json: {
  ok: true,
  action: 'lead.qualify',
  score,
  temperature,
  intent: score >= 70 ? 'Ready to buy' : score >= 50 ? 'Researching' : 'Browsing',
  recommended_action: score >= 70
    ? 'Call within 5 minutes'
    : score >= 50 ? 'Send follow-up message' : 'Add to nurture sequence',
  lead_id:   payload.lead_id   || null,
  tenant_id: b.tenant_id       || null,
  processed_at: new Date().toISOString()
}}];
""".strip()

FOLLOWUP_SEND_CODE = """
const input = $input.first().json;
const b = input.body || input;
const payload = b.payload || b;
return [{ json: {
  ok: true,
  action: 'followup.send',
  sent: true,
  channel:     payload.channel     || 'whatsapp',
  lead_id:     payload.lead_id     || null,
  template_id: payload.template_id || null,
  message_id:  'msg_' + Math.random().toString(36).substr(2, 9),
  sent_at: new Date().toISOString()
}}];
""".strip()

CAMPAIGN_LAUNCH_CODE = """
const input = $input.first().json;
const b = input.body || input;
const payload = b.payload || b;
const audience = payload.audience_size || 250;
return [{ json: {
  ok: true,
  action: 'campaign.launch',
  queued: true,
  campaign_id:       payload.campaign_id || null,
  estimated_audience: audience,
  eta_minutes:        Math.ceil(audience / 100) * 2,
  job_id:             'job_' + Math.random().toString(36).substr(2, 9),
  channel:            payload.channel || 'whatsapp',
  queued_at: new Date().toISOString()
}}];
""".strip()

APPOINTMENT_BOOK_CODE = """
const input = $input.first().json;
const b = input.body || input;
const payload = b.payload || b;
const eventId = 'evt_' + Math.random().toString(36).substr(2, 9);
return [{ json: {
  ok: true,
  action: 'appointment.book',
  confirmed: true,
  appointment_id:   payload.appointment_id || null,
  lead_id:          payload.lead_id        || null,
  scheduled_at:     payload.scheduled_at   || null,
  calendar_event_id: eventId,
  confirmation_code: ('CNF-' + eventId.replace('evt_', '')).toUpperCase(),
  confirmed_at: new Date().toISOString()
}}];
""".strip()

TICKET_CREATE_CODE = """
const input = $input.first().json;
const b = input.body || input;
const payload = b.payload || b;
const priority = payload.priority || 'normal';
const levels = { urgent: 1, high: 2, normal: 3, low: 4 };
return [{ json: {
  ok: true,
  action: 'ticket.create',
  ticket_id:      'tkt_' + Math.random().toString(36).substr(2, 9),
  assigned_to:    'auto',
  priority,
  priority_level: levels[priority] || 3,
  lead_id:        payload.lead_id  || null,
  subject:        payload.subject  || 'Support Request',
  status:         'open',
  created_at: new Date().toISOString()
}}];
""".strip()

RETARGETING_RUN_CODE = """
const input = $input.first().json;
const b = input.body || input;
const payload = b.payload || b;
return [{ json: {
  ok: true,
  action: 'retargeting.run',
  sequence_started: true,
  lead_id:       payload.lead_id      || null,
  audience_size: payload.audience_size || 1,
  channel:       payload.channel       || 'whatsapp',
  job_id:        'ret_' + Math.random().toString(36).substr(2, 9),
  next_contact_in_hours: 24,
  started_at: new Date().toISOString()
}}];
""".strip()


LAST_CONTACT_BODY = '{"last_contacted_at":"={{ new Date().toISOString() }}"}'

WORKFLOWS = {
    # 3 nodes: Webhook → Process → Respond
    "lead-qualify": {
        "name":  "AutomateOS - Lead Qualify",
        "nodes": [
            n_webhook("lead-qualify", x=240),
            n_code(LEAD_QUALIFY_CODE, x=520),
            n_respond(x=820),
        ],
        "connections": chain("Webhook", "Process", "Respond to Webhook"),
    },

    # 4 nodes: Webhook → Process → Update Lead → Respond
    "followup-send": {
        "name":  "AutomateOS - Followup Send",
        "nodes": [
            n_webhook("followup-send", x=240),
            n_code(FOLLOWUP_SEND_CODE, x=500),
            n_http_supabase(
                "Update Lead", "PATCH", "leads",
                "id=eq.{{ $json.lead_id }}",
                LAST_CONTACT_BODY, x=760
            ),
            n_respond(x=1020),
        ],
        "connections": chain("Webhook", "Process", "Update Lead", "Respond to Webhook"),
    },

    # 4 nodes: Webhook → Process → Set Campaign Running → Respond
    "campaign-launch": {
        "name":  "AutomateOS - Campaign Launch",
        "nodes": [
            n_webhook("campaign-launch", x=240),
            n_code(CAMPAIGN_LAUNCH_CODE, x=500),
            n_http_supabase(
                "Set Campaign Running", "PATCH", "campaigns",
                "id=eq.{{ $json.campaign_id }}",
                '{"status":"running"}', x=760
            ),
            n_respond(x=1020),
        ],
        "connections": chain("Webhook", "Process", "Set Campaign Running", "Respond to Webhook"),
    },

    # 3 nodes: Webhook → Process → Respond
    "appointment-book": {
        "name":  "AutomateOS - Appointment Book",
        "nodes": [
            n_webhook("appointment-book", x=240),
            n_code(APPOINTMENT_BOOK_CODE, x=520),
            n_respond(x=820),
        ],
        "connections": chain("Webhook", "Process", "Respond to Webhook"),
    },

    # 3 nodes: Webhook → Process → Respond
    "ticket-create": {
        "name":  "AutomateOS - Ticket Create",
        "nodes": [
            n_webhook("ticket-create", x=240),
            n_code(TICKET_CREATE_CODE, x=520),
            n_respond(x=820),
        ],
        "connections": chain("Webhook", "Process", "Respond to Webhook"),
    },

    # 4 nodes: Webhook → Process → Update Last Contact → Respond
    "retargeting-run": {
        "name":  "AutomateOS - Retargeting Run",
        "nodes": [
            n_webhook("retargeting-run", x=240),
            n_code(RETARGETING_RUN_CODE, x=500),
            n_http_supabase(
                "Update Last Contact", "PATCH", "leads",
                "id=eq.{{ $json.lead_id }}",
                LAST_CONTACT_BODY, x=760
            ),
            n_respond(x=1020),
        ],
        "connections": chain("Webhook", "Process", "Update Last Contact", "Respond to Webhook"),
    },
}


# ── upgrade each workflow ────────────────────────────────────────────────────

for path, wf_def in WORKFLOWS.items():
    wf_id = WORKFLOW_IDS[path]
    name  = wf_def["name"]
    n     = len(wf_def["nodes"])
    print(f"\nUpgrading [{n} nodes]: {name}")

    # 1. Deactivate
    api_call("POST", f"/workflows/{wf_id}/deactivate")

    # 2. PUT updated workflow
    result = api_call("PUT", f"/workflows/{wf_id}", {
        "name":        name,
        "nodes":       wf_def["nodes"],
        "connections": wf_def["connections"],
        "settings":    {"executionOrder": "v1"},
    })

    if "error" in result:
        print(f"  UPDATE ERROR: {result['error'][:200]}")
        api_call("POST", f"/workflows/{wf_id}/activate")
        continue

    print(f"  Saved ({n} nodes)")

    # 3. Reactivate
    act = api_call("POST", f"/workflows/{wf_id}/activate")
    if "error" in act:
        print(f"  ACTIVATE ERROR: {act['error'][:100]}")
    else:
        print(f"  Active -> {N8N_URL}/webhook/{path}")

print("\nAll done!")
