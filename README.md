# NEXUS — Neural Explainable Unified Security

An AI-native network-security **research prototype**: a SOC-style command center that observes a
(simulated) network, detects threats, **explains why** it believes traffic is malicious, scores the risk and
demonstrates an **autonomous (or human-approved) response**.

> **What is real and what is simulated.** With Npcap installed, NEXUS captures packet headers from your
> Wi-Fi interface, scores them with a locally trained Isolation Forest + XGBoost, explains detections with SHAP
> and shows them on the **Live Capture** page and in the threat feed. The device inventory, incident history,
> featured incidents, federated learning and the attack simulator remain simulated, and enforcement (blocking)
> is always simulated. Every simulated surface is labelled in the UI.

```
OBSERVE → UNDERSTAND → DETECT → EXPLAIN → RESPOND → LEARN
```

## Quick start

Requirements: Node 20+ and Python 3.11+.

```bash
# 1 · backend (once)
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt      # macOS/Linux: .venv/bin/pip …
cd ..

# 2 · frontend (once)
npm --prefix frontend install

# 3 · run both (API :8000, UI :5173)
npm run dev
```

Open **http://localhost:5173**. The API documentation is at **http://localhost:8000/docs**.

With Docker: `docker compose up --build` → http://localhost:8080 (add `--profile db` to start the prepared PostgreSQL).

Tests: `npm test` (backend pytest suite + frontend type-check).

### Live capture (phase 4)

1. Install **Npcap** from https://npcap.com and tick *“Install Npcap in WinPcap API-compatible mode”*
   (macOS/Linux: libpcap is built in; run the backend with capture permissions).
2. Optional: copy `backend/.env.example` to `backend/.env` and set `NEXUS_CAPTURE_IFACE` (default `Wi-Fi`).
3. Restart the backend. Capture starts automatically (`NEXUS_CAPTURE_AUTOSTART=0` disables it);
   control it from **Live Capture** in the sidebar.

NEXUS first learns a baseline of your network (120 host-windows ≈ 10 minutes), then retrains the models on it
and starts alerting. Only header fields are kept, and payloads are never stored. Attack classes (port scan, brute force,
DNS anomaly, DDoS) are learned from synthetic attack profiles layered on your real benign traffic, so treat
detections as research-grade.

### Hosted website (GitHub Pages)

The frontend is published at **https://c840.github.io/NEXUS/** by `.github/workflows/pages.yml` on every push
to `main` that touches `frontend/`. The backend stays on your PC, which is the only place packet capture can run.
To share it:

```bash
npm run share
```

This starts the backend plus a Cloudflare quick tunnel ([cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
must be installed). It prints a link of the form `https://c840.github.io/NEXUS/?api=<tunnel>&token=<token>` and saves it to
`share-link.txt`. The site works only while that command runs. The tunnel URL and access token change every run,
and without the token the backend rejects remote requests.

### LLM assistant (optional)

Set `GROQ_API_KEY` (and optionally `NEXUS_LLM_MODEL`, default `openai/gpt-oss-120b`) in `backend/.env`.
The rule-based analyst still gathers every fact. The LLM only narrates those facts, and it has no tools and cannot act.
Without a key, or if the call fails, the rule-based answer is returned. `backend/.env` is gitignored, so never commit keys.

## Demo script (3–5 minutes)

1. **Overview** — security score 94/100, 3 active threats under observation, 127 threats blocked, 42 devices,
   98.2 % network health, 142 ms average response. Live traffic, the threat feed, the topology and the posture breakdown.
2. **Simulate attack → Port Scan → Launch.** Watch the HUD walk through
   *Normal → Traffic spike → Anomaly → AI classification → Risk → Threat mapped → Autonomous response → Blocked → Recovered*:
   the traffic chart spikes red then mitigates, the feed streams the detection, PC-07 turns red and then gray (quarantined)
   on the topology, which opens its inspector automatically.
3. **Open investigation** — PORT SCAN · HIGH · confidence 96.4 % · risk 89/100 · source 192.168.1.44 · 142 ms.
   Attack timeline, risk engine, **“Why did NEXUS detect this?”** (Port Diversity +0.31, Connection Rate +0.24,
   SYN Ratio +0.18 …) and the autonomous response (✓ IP blocked ✓ device quarantined ✓ firewall rule updated).
4. **AI Assistant** — ask *“Why was PC-07 blocked?”*: a grounded analyst report citing the same features and numbers.
5. **Privacy** — federated learning: model updates travel, raw traffic never does (0 GB shared), differential privacy active.
6. Optional: switch **Autonomous defense** off in the sidebar and simulate a DDoS — NEXUS detects and explains, then waits
   for your approval (compare the human response time with the autonomous 142 ms).

## Architecture

```
frontend (React · TypeScript · Tailwind · Recharts · React Flow · Framer Motion)
   │  NexusApi (HTTP, src/services/api)          RealtimeSource (WebSocket + polling fallback)
   ▼                                              ▼
backend (FastAPI)  /api/*  ──────────────  /ws/events  ← sequenced event log (app/realtime/bus.py)
   │
   └─ NexusService (app/engine/service.py) — application layer
        ├─ state.py        in-memory repository   → PostgreSQL-ready (db/schema.sql)
        ├─ traffic.py      traffic model          → Scapy / flow aggregation
        ├─ catalog.py      features + explanations → feature extraction + SHAP
        ├─ threats.py      detections + risk       → XGBoost / Isolation Forest + risk engine
        ├─ simulation.py   attack scenarios        (demonstration)
        └─ assistant.py    rule-based analyst      → LLM provider (same reply contract)
```

* **One contract.** `frontend/src/types` and `backend/app/schemas.py` mirror each other; JSON is camelCase.
* **One story.** [docs/SIMULATED_DATASET.md](docs/SIMULATED_DATASET.md) defines the simulated environment
  (42 devices, featured incidents, invariants such as score 94 / 127 blocked / 142 ms) and the tests enforce it.
* **Live state.** Every change is a sequenced `RealtimeMessage` (traffic ticks, events, threats, devices, nodes,
  links, metrics, responses, simulation stages). Clients resume by sequence number after reconnecting.
* **Honest by construction.** Data source = `simulation`; every module reports whether it is simulated, ready, planned or active
  (Settings → Pipeline modules).

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard` | status, metrics, security score, latest response, featured intel, settings |
| GET | `/api/threats` | threats (filters: `severity`, `status`, `type`, `search`, `limit`) |
| GET | `/api/threats/{id}` | investigation detail: risk factors, timeline, response, intel, replay |
| GET | `/api/devices` · `/api/network` · `/api/events` | inventory, topology, event stream |
| GET | `/api/traffic?range=live\|1h\|6h\|24h\|7d` | traffic series |
| GET | `/api/analytics?range=today\|7d\|30d` | analytics + (simulated) model performance |
| GET | `/api/privacy` | federated learning status |
| GET | `/api/simulate/scenarios` · POST `/api/simulate` | attack simulator |
| POST | `/api/response` | administrator decision (manual mode) |
| POST | `/api/assistant` | security assistant |
| GET/PATCH | `/api/settings` | autonomy policy and thresholds |
| GET | `/api/system` · `/api/health` | module registry, health |
| GET | `/api/live/status` | capture state, hosts, model info, live detections |
| POST | `/api/live/start` · `/api/live/stop` · `/api/live/train` | control capture / retrain models |
| WS | `/ws/events?after=<seq>` | realtime push (polling twin: GET `/api/realtime/poll`) |

## Project layout

```
frontend/   React app — src/{app,components,features,lib,services,store,types}
backend/    FastAPI app — app/{api,engine,live,realtime}, tests/, db/schema.sql
docs/       NEXUS_SPEC.md (product brief) · SIMULATED_DATASET.md (simulated environment)
scripts/    dev.mjs (run everything) · test-api.mjs
```

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Complete frontend, every page polished | ✅ |
| 2 | FastAPI backend, frontend connected | ✅ |
| 3 | Attack simulator + realtime event flow (WebSocket) | ✅ |
| 4 | Real Scapy capture, Isolation Forest + XGBoost + SHAP, Groq LLM narration | ✅ (prototype) |
| — | Hosted frontend on GitHub Pages + `npm run share` tunnel | ✅ |
