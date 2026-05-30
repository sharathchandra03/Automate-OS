import json
import uuid
import urllib.request
import urllib.error
import sys

# Fix Windows console encoding
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

N8N_URL = "http://187.127.160.219:5678"
API_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJzdWIiOiIwODdlOWY5Ny0zOTgxLTRhNGEtYmE4ZS02NTA4ZDM5NmQ4NmYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNGQxOWJjYzAtNWUwYi00MDNhLWFhYzMtN2E2MTgxYWQ3OGZkIiwiaWF0IjoxNzgwMTY2NzEyfQ"
    ".iDFRA0S8tYOvRzWjNiLBcmE6ex_ATWky1gZneYYeaj8"
)


def api_call(method, path, data=None):
    url = f"{N8N_URL}/api/v1{path}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("X-N8N-API-KEY", API_KEY)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode("utf-8"), "code": e.code}
    except Exception as e:
        return {"error": str(e)}


def make_workflow(name, path_slug, js_code):
    return {
        "name": name,
        "nodes": [
            {
                "id": str(uuid.uuid4()),
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 1,
                "position": [250, 300],
                "parameters": {
                    "httpMethod": "POST",
                    "path": path_slug,
                    "responseMode": "lastNode",
                    "options": {},
                },
                "webhookId": str(uuid.uuid4()),
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Process",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [500, 300],
                "parameters": {"jsCode": js_code},
            },
        ],
        "connections": {
            "Webhook": {
                "main": [[{"node": "Process", "type": "main", "index": 0}]]
            }
        },
        "settings": {"executionOrder": "v1"},
    }


WORKFLOWS = [
    {
        "name": "AutomateOS - Lead Qualify",
        "path": "lead-qualify",
        "code": (
            "const input = $input.first().json;\n"
            "const b = input.body || input;\n"
            "const payload = b.payload || b;\n"
            "const score = Math.floor(Math.random() * 40) + 50;\n"
            "const temperature = score >= 70 ? 'hot' : score >= 50 ? 'warm' : 'cold';\n"
            "return [{ json: {\n"
            "  ok: true,\n"
            "  action: 'lead.qualify',\n"
            "  score,\n"
            "  temperature,\n"
            "  intent: score >= 70 ? 'Ready to buy' : 'Researching',\n"
            "  recommended_action: score >= 70 ? 'Call within 5 minutes' : 'Add to nurture sequence',\n"
            "  lead_id: payload.lead_id || null,\n"
            "  processed_at: new Date().toISOString()\n"
            "}}];"
        ),
    },
    {
        "name": "AutomateOS - Followup Send",
        "path": "followup-send",
        "code": (
            "const input = $input.first().json;\n"
            "const b = input.body || input;\n"
            "const payload = b.payload || b;\n"
            "return [{ json: {\n"
            "  ok: true,\n"
            "  action: 'followup.send',\n"
            "  sent: true,\n"
            "  channel: payload.channel || 'whatsapp',\n"
            "  lead_id: payload.lead_id || null,\n"
            "  message_id: 'msg_' + Math.random().toString(36).substr(2, 9),\n"
            "  sent_at: new Date().toISOString()\n"
            "}}];"
        ),
    },
    {
        "name": "AutomateOS - Campaign Launch",
        "path": "campaign-launch",
        "code": (
            "const input = $input.first().json;\n"
            "const b = input.body || input;\n"
            "const payload = b.payload || b;\n"
            "return [{ json: {\n"
            "  ok: true,\n"
            "  action: 'campaign.launch',\n"
            "  queued: true,\n"
            "  campaign_id: payload.campaign_id || null,\n"
            "  estimated_audience: payload.audience_size || 250,\n"
            "  eta_minutes: 5,\n"
            "  job_id: 'job_' + Math.random().toString(36).substr(2, 9),\n"
            "  queued_at: new Date().toISOString()\n"
            "}}];"
        ),
    },
    {
        "name": "AutomateOS - Appointment Book",
        "path": "appointment-book",
        "code": (
            "const input = $input.first().json;\n"
            "const b = input.body || input;\n"
            "const payload = b.payload || b;\n"
            "return [{ json: {\n"
            "  ok: true,\n"
            "  action: 'appointment.book',\n"
            "  confirmed: true,\n"
            "  appointment_id: payload.appointment_id || null,\n"
            "  calendar_event_id: 'evt_' + Math.random().toString(36).substr(2, 9),\n"
            "  confirmed_at: new Date().toISOString()\n"
            "}}];"
        ),
    },
    {
        "name": "AutomateOS - Ticket Create",
        "path": "ticket-create",
        "code": (
            "const input = $input.first().json;\n"
            "const b = input.body || input;\n"
            "const payload = b.payload || b;\n"
            "return [{ json: {\n"
            "  ok: true,\n"
            "  action: 'ticket.create',\n"
            "  ticket_id: 'tkt_' + Math.random().toString(36).substr(2, 9),\n"
            "  assigned_to: 'auto',\n"
            "  priority: payload.priority || 'normal',\n"
            "  lead_id: payload.lead_id || null,\n"
            "  created_at: new Date().toISOString()\n"
            "}}];"
        ),
    },
    {
        "name": "AutomateOS - Retargeting Run",
        "path": "retargeting-run",
        "code": (
            "const input = $input.first().json;\n"
            "const b = input.body || input;\n"
            "const payload = b.payload || b;\n"
            "return [{ json: {\n"
            "  ok: true,\n"
            "  action: 'retargeting.run',\n"
            "  sequence_started: true,\n"
            "  lead_id: payload.lead_id || null,\n"
            "  audience_size: payload.audience_size || 1,\n"
            "  job_id: 'ret_' + Math.random().toString(36).substr(2, 9),\n"
            "  started_at: new Date().toISOString()\n"
            "}}];"
        ),
    },
]

ENV_MAP = {
    "lead-qualify":    "N8N_WEBHOOK_LEAD_QUALIFY",
    "followup-send":   "N8N_WEBHOOK_FOLLOWUP_SEND",
    "campaign-launch": "N8N_WEBHOOK_CAMPAIGN_LAUNCH",
    "appointment-book": "N8N_WEBHOOK_APPOINTMENT_BOOK",
    "ticket-create":   "N8N_WEBHOOK_TICKET_CREATE",
    "retargeting-run": "N8N_WEBHOOK_RETARGETING_RUN",
}

# ---- Fetch existing workflows to avoid duplicates ----
print("Fetching existing workflows...")
existing = api_call("GET", "/workflows")
existing_paths = {}
for wf in existing.get("data", []):
    for node in wf.get("nodes", []):
        if node.get("type") == "n8n-nodes-base.webhook":
            p = node.get("parameters", {}).get("path", "")
            existing_paths[p] = {"id": wf["id"], "active": wf.get("active", False)}

print(f"Found {len(existing_paths)} existing webhook path(s): {list(existing_paths.keys())}\n")

results = []

for wf_def in WORKFLOWS:
    path = wf_def["path"]
    name = wf_def["name"]

    # Already exists and active
    if path in existing_paths and existing_paths[path]["active"]:
        url = f"{N8N_URL}/webhook/{path}"
        print(f"[SKIP] {name} already active")
        results.append({"name": name, "path": path, "status": "ACTIVE", "url": url})
        continue

    # Exists but inactive — activate it
    if path in existing_paths and not existing_paths[path]["active"]:
        wf_id = existing_paths[path]["id"]
        print(f"[ACTIVATE] {name} (id: {wf_id})")
        act = api_call("POST", f"/workflows/{wf_id}/activate")
        if "error" not in act:
            url = f"{N8N_URL}/webhook/{path}"
            results.append({"name": name, "path": path, "status": "ACTIVE", "url": url})
            print(f"  OK -> {url}")
        else:
            print(f"  ERROR: {act['error'][:150]}")
            results.append({"name": name, "path": path, "status": "ACTIVATE_FAILED"})
        continue

    # Create new
    print(f"[CREATE] {name}")
    wf_body = make_workflow(name, path, wf_def["code"])
    created = api_call("POST", "/workflows", wf_body)

    if "error" in created:
        print(f"  ERROR: {created['error'][:150]}")
        results.append({"name": name, "path": path, "status": "CREATE_FAILED"})
        continue

    wf_id = created["id"]
    print(f"  Created id: {wf_id}")

    act = api_call("POST", f"/workflows/{wf_id}/activate")
    if "error" in act:
        print(f"  ACTIVATE ERROR: {act['error'][:150]}")
        results.append({"name": name, "path": path, "status": "NOT_ACTIVE", "id": wf_id})
    else:
        url = f"{N8N_URL}/webhook/{path}"
        print(f"  Active -> {url}")
        results.append({"name": name, "path": path, "status": "ACTIVE", "id": wf_id, "url": url})

print("\n" + "=" * 60)
print("WEBHOOK URLS FOR .env.local")
print("=" * 60)
active_by_path = {r["path"]: r for r in results if r["status"] == "ACTIVE"}
for path, env_var in ENV_MAP.items():
    r = active_by_path.get(path)
    if r:
        print(f'{env_var}="{r["url"]}"')
    else:
        print(f'{env_var}=""  # FAILED - fix manually')

all_ok = len(active_by_path) == len(WORKFLOWS)
print(f"\n{'All 6 workflows active!' if all_ok else f'Only {len(active_by_path)}/6 active.'}")
