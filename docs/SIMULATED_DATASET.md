# NEXUS Simulated Dataset — Canonical Narrative

All NEXUS telemetry in the prototype is **simulated**. This document is the single source of truth for the
simulated environment so every layer (in-browser mock backend in phase 1, FastAPI backend from phase 2,
the attack simulator in phase 3) tells the *same* story with *internally consistent* numbers.

Rules that apply everywhere:

* **Deterministic.** Use a seeded PRNG (mulberry32, seed `0x4E455855` = "NEXU"). Reloading produces the same
  devices, threats and history. All timestamps are **relative to backend start (`bootTime`)**.
* **Consistent.** Every displayed number must be derivable from the data (counts are counted, averages are
  averaged, risk = Σ factor × weight, explanations quote the feature values that are shown).
* **Honest.** Model metrics are labelled as simulated/prototype; the data source is reported as
  `mode: 'simulation'`, label `Simulated environment`.
* External IPs are partially masked (`185.23.xx.xx`) — the prototype never attributes activity to a real host.
* MAC addresses use the locally-administered prefix `02:4e:58` ("NX").

---

## 1. Network inventory — 42 devices (`devicesProtected = 42`)

`id` = lower-case hostname (e.g. `pc-07`). Topology node id === device id; the Internet node id is `internet`.

| # | Hostname | IP | Type | Segment | Role |
|---|---|---|---|---|---|
| 1 | FW-01 | 192.168.1.1 | network | edge | Perimeter firewall |
| 2 | RTR-01 | 192.168.1.2 | network | core | Core router |
| 3 | SW-SRV | 192.168.1.3 | network | core | Server VLAN switch |
| 4 | SW-WS | 192.168.1.4 | network | core | Workstation VLAN switch |
| 5 | SW-IOT | 192.168.1.67 | network | core | IoT VLAN switch |
| 6 | Server-01 | 192.168.1.5 | server | servers | Web / application server |
| 7 | Server-02 | 192.168.1.6 | server | servers | Database server (PostgreSQL) |
| 8 | Server-03 | 192.168.1.7 | server | servers | File & backup server |
| 9 | DNS-01 | 192.168.1.8 | server | servers | Internal DNS resolver |
| 10 | MAIL-01 | 192.168.1.9 | server | servers | Mail relay |
| 11 | DC-01 | 192.168.1.10 | server | servers | Directory / authentication |
| 12 | PC-01 | 192.168.1.12 | workstation | workstations | Finance workstation |
| 13 | PC-02 | 192.168.1.14 | workstation | workstations | Finance workstation |
| 14 | PC-03 | 192.168.1.21 | workstation | workstations | Engineering workstation |
| 15 | PC-04 | 192.168.1.23 | workstation | workstations | Engineering workstation |
| 16 | PC-05 | 192.168.1.27 | workstation | workstations | Engineering workstation |
| 17 | PC-06 | 192.168.1.31 | workstation | workstations | HR workstation |
| 18 | PC-07 | 192.168.1.44 | workstation | workstations | Research workstation |
| 19 | PC-08 | 192.168.1.46 | workstation | workstations | Research workstation |
| 20 | PC-09 | 192.168.1.48 | workstation | workstations | Operations workstation |
| 21 | PC-10 | 192.168.1.52 | workstation | workstations | Operations workstation |
| 22 | PC-11 | 192.168.1.53 | workstation | workstations | Support workstation |
| 23 | PC-12 | 192.168.1.54 | workstation | workstations | Reception workstation |
| 24–30 | LT-01 … LT-07 | 192.168.1.60 … .66 | laptop | workstations | Staff laptop |
| 31 | IoT-01 | 192.168.1.68 | iot_sensor | iot | Smart thermostat |
| 32 | IoT-02 | 192.168.1.69 | camera | iot | Parking camera |
| 33 | IoT-03 | 192.168.1.70 | iot_sensor | iot | Badge reader |
| 34 | IoT-04 | 192.168.1.71 | camera | iot | Lobby camera |
| 35 | IoT-05 | 192.168.1.72 | iot_sensor | iot | Conference display |
| 36 | IoT-06 | 192.168.1.73 | iot_sensor | iot | HVAC controller |
| 37 | IoT-07 | 192.168.1.75 | camera | iot | Server room camera |
| 38 | IoT-08 | 192.168.1.76 | iot_sensor | iot | Environmental sensor |
| 39 | PRN-01 | 192.168.1.80 | printer | iot | Office printer, floor 1 |
| 40 | PRN-02 | 192.168.1.81 | printer | iot | Office printer, floor 2 |
| 41 | MOB-01 | 192.168.1.90 | mobile | workstations | Managed tablet |
| 42 | MOB-02 | 192.168.1.91 | mobile | workstations | Managed tablet |

OS / vendor: use plausible generic strings (Windows 11 Pro, Ubuntu 22.04 LTS, macOS 15, Embedded Linux, NGFW OS 7.4…;
vendors such as "Dell", "Lenovo", "HP", "Generic OEM" — IoT devices are always "Generic OEM" so no real vendor is implied to be vulnerable).
Open ports: Server-01 [22, 80, 443] · Server-02 [22, 5432] · Server-03 [22, 445, 8443] · DNS-01 [53] · MAIL-01 [25, 587, 993] ·
DC-01 [88, 389, 636] · workstations [135, 445] · cameras [80, 554] · sensors [8883] · printers [631, 9100] · network gear [22, 443].
Connections: FW-01 ≈ 1,800, RTR-01 ≈ 1,200, switches 300–700, servers 120–480, workstations 8–40, IoT 2–6, mobiles 3–12.
`lastSeen` within the last 60 s for everything online.

**Boot-time state:** PC-03 `suspicious` risk 47 · IoT-04 `suspicious` risk 54 · Server-03 `suspicious` risk 31 · Server-01 safe 18 ·
Server-02 safe 15 · FW-01 safe 22 · **PC-07 safe 12** (it is the Port Scan simulation target in phase 3) · all others safe, risk 3–14.

## 2. Topology

```
internet ─▶ FW-01 ─▶ RTR-01 ─┬▶ SW-SRV ─▶ Server-01..03, DNS-01, MAIL-01, DC-01
                             ├▶ SW-WS  ─▶ PC-01..12, LT-01..07, MOB-01..02
                             └▶ SW-IOT ─▶ IoT-01..08, PRN-01..02
```

Node type mapping: FW-01 → `firewall`, RTR-01 → `router`, SW-* → `switch`, servers → `server`,
workstation/laptop/mobile → `workstation`, camera/iot_sensor/printer → `iot`.
Node status from device status: safe → normal, suspicious → suspicious, compromised → compromised, quarantined → blocked.
Link status: `attack` while an attack traverses the link, `suspicious` toward a suspicious device, `blocked` toward a quarantined device, else `normal`.
`node.threats` = display names of the device's active threats.

## 3. Featured threats (hand-tuned, present at boot)

Risk engine: four factors with **equal weights 0.25** — `riskScore = round(Σ value × 0.25)`.
Factor values are listed as (detection confidence, anomaly score, behavioral risk, threat intelligence).

### A. DNS Anomaly — MEDIUM — `monitoring` — boot − 280 s
PC-03 (192.168.1.21) → "External resolvers". Confidence **81.2**, risk **47** (81.2, 62, 34, 11). Detected by anomaly + classifier.
MITRE T1071.004 Application Layer Protocol: DNS (Command and Control).

| Feature | Contribution | Observed | Baseline |
|---|---|---|---|
| Query Name Entropy | +0.21 | 4.6 bits/char | ≈ 3.1 bits/char |
| Query Rate | +0.14 | 38 queries/min | ≈ 6 queries/min |
| NXDOMAIN Ratio | +0.09 | 22% | < 2% |
| Subdomain Length | +0.06 | 41 chars avg | ≈ 14 chars |
| TXT Record Share | +0.03 | 9% of queries | < 1% |

Explanation: "NEXUS flagged PC-03 for anomalous DNS behavior: its queries show unusually high name entropy (4.6 bits/char vs ≈3.1)
at roughly six times its normal query rate, with a 22% NXDOMAIN ratio and long, random-looking subdomains. This pattern is
consistent with DNS tunnelling or a domain-generation algorithm. The risk score (47) is below the autonomous containment
threshold (70), so NEXUS is monitoring the host rather than isolating it."
Actions (done): Enhanced DNS logging enabled (PC-03) · Packet capture started (PC-03 · UDP/53) · Administrator notified.

### B. DDoS Attack — CRITICAL — `blocked` — boot − 243 s
Source **185.23.xx.xx** ("External · Botnet (1,284 hosts)") → Server-01 (192.168.1.5, "Server-01 · Web").
Confidence **98.1**, risk **94** (98.1, 97, 88, 93). Detected by anomaly + classifier + threat_intel. Response time **118 ms**, autonomous.
MITRE T1498 Network Denial of Service (Impact).

| Feature | Contribution | Observed | Baseline |
|---|---|---|---|
| Inbound Packet Rate | +0.34 | 182,400 pps | ≈ 13,200 pps |
| Source IP Entropy | +0.22 | 1,284 unique sources | ≈ 40 sources |
| UDP Share | +0.15 | 93% of packets | ≈ 21% |
| Mean Packet Size | +0.09 | 74 bytes | ≈ 610 bytes |
| Threat Intel Match | +0.07 | Botnet indicator match | No match |

Explanation: "NEXUS classified this traffic as a volumetric DDoS attack: inbound packets to Server-01 rose to 182,400 per second —
nearly 14× the learned baseline — from 1,284 distinct sources. 93% of the packets were UDP with an average size of only 74 bytes,
and the dominant source range matches a botnet indicator in the threat-intelligence feed."
Actions (done, in order): Edge rate limiting applied (Server-01 · UDP) · Source range blocked (185.23.xx.xx/16) ·
Firewall rule updated (FW-01 rule #4127) · Administrator notified.
Intel: 185.23.xx.xx · malicious · Botnet · 98 · first observed boot − 3 h · related events 12 · tags botnet, udp-flood, mirai-like.
**Replay** (25 s, frames every 0.5 s): 00:00 Normal · 00:05 Anomaly begins · 00:10 Detection · 00:12 Threat classified ·
00:14 Risk reaches critical · 00:15 Response initiated · 00:17 Threat blocked · 00:25 Network recovered.
pps ≈ 13,200 until 5 s, climbs to ~182,400 by ~11 s, holds until 17 s, collapses to ~16,000 by 20 s and ≈ baseline by 25 s;
anomalyScore follows (0.08 → 0.97 → 0.12); risk climbs to 94 by 14 s.
This is the dashboard's `latestResponse` at boot.

### C. Malware Behavior (C2 beaconing) — MEDIUM — `investigating` — boot − 19 min
IoT-04 (192.168.1.71, lobby camera) → 103.75.xx.xx ("Rare external host"). Confidence **73.8**, risk **54** (73.8, 69, 52, 21).
Detected by anomaly + classifier. MITRE T1071 Application Layer Protocol (Command and Control).

| Feature | Contribution | Observed | Baseline |
|---|---|---|---|
| Beacon Periodicity | +0.19 | every 60.0 s (±0.4 s) | irregular |
| Destination Rarity | +0.13 | first seen on network | known vendor hosts |
| Outbound / Inbound Ratio | +0.08 | 6.2 : 1 | ≈ 0.4 : 1 |
| Payload Size Uniformity | +0.05 | 512 B ± 3 B | variable |
| TLS without SNI | +0.03 | 100% of sessions | SNI present |

Explanation: "IoT-04 (lobby camera) is contacting a host never before seen on this network at a near-perfect 60-second interval
with uniform 512-byte payloads, and is sending about 6× more data than it receives — the opposite of its normal video-streaming
profile. This periodic beaconing is characteristic of command-and-control traffic. Risk 54 is below the containment threshold,
so NEXUS opened an investigation and recommends quarantine for analyst review."
Actions: Flow logging enabled (done) · Packet capture started (done) · Administrator notified (done) ·
Device quarantine — `pending` ("Recommended — awaiting analyst review").

### D. Unknown Anomaly — LOW — `monitoring` — boot − 52 min
Server-03 (192.168.1.7) → 45.12.xx.xx ("Unfamiliar storage endpoint"). Confidence **58.0**, risk **31** (58, 52, 9, 5).
Detected by anomaly only. No MITRE mapping.

| Feature | Contribution | Observed | Baseline |
|---|---|---|---|
| Outbound Volume | +0.12 | 4.8 GB in 38 min | ≈ 0.6 GB / night |
| Destination Port | +0.06 | TCP/8443 | TCP/443 |
| Session Duration | +0.05 | 38 min single session | < 5 min |
| Schedule Deviation | +0.04 | outside backup window | nightly 01:00–02:00 |

Explanation: "The anomaly detector flagged a 4.8 GB outbound transfer from Server-03 in a single 38-minute session to an
unfamiliar endpoint on TCP/8443 — about 8× its usual nightly volume and outside its scheduled backup window. No supervised attack
class matched with high confidence (best match 41%), so NEXUS labelled it an unknown anomaly. Risk 31 is low; the transfer is
being monitored."
Actions (done): Transfer monitoring enabled · Administrator notified.

### E. Brute Force — HIGH — `blocked` — boot − 38 min
45.155.xx.xx ("External · SSH scanner") → Server-02 (192.168.1.6, "Server-02 · SSH"). Confidence **94.7**, risk **78**
(94.7, 72, 76, 69). Detected by classifier + signature + threat_intel. Response time **156 ms**.
MITRE T1110.001 Brute Force: Password Guessing (Credential Access).

| Feature | Contribution | Observed | Baseline |
|---|---|---|---|
| Failed Auth Rate | +0.29 | 412 failures / 5 min | ≈ 3 / 5 min |
| Username Diversity | +0.17 | 58 distinct usernames | ≈ 2 |
| Connection Rate | +0.11 | 1.4 SSH sessions / s | ≈ 0.02 / s |
| Source Reputation | +0.08 | listed: SSH scanner | not listed |
| Attempt Cadence | +0.05 | regular 0.7 s interval | human-irregular |

Explanation: "NEXUS detected a password-guessing attack against Server-02's SSH service: 412 failed logins in five minutes
(about 140× normal) across 58 different usernames at a machine-regular 0.7-second cadence, from a source listed in the
threat-intelligence feed as an SSH scanner. The source IP was blocked automatically."
Actions (done): Source IP blocked (45.155.xx.xx) · Firewall rule updated (FW-01 rule #4119) · Administrator notified.
Intel: 45.155.xx.xx · malicious · SSH scanner · 91 · first observed boot − 26 h · related events 7.

### F. Port Scan (perimeter) — MEDIUM — `blocked` — boot − 2 h 11 min
91.240.xx.xx ("External · Scanner") → FW-01 ("Perimeter (FW-01)"). Confidence **92.3**, risk **58** (92.3, 70, 40, 30).
Detected by signature + classifier. Response time **97 ms**. MITRE T1046 Network Service Discovery (Discovery).
Features: Port Diversity +0.27 (1,024 ports / 30 s vs ≤ 6) · Connection Rate +0.18 (34 conn/s vs ≈ 0.5) ·
SYN Ratio +0.12 (0.97 SYN-only vs ≈ 0.08) · Probe Sequencing +0.06 (sequential port order vs random) ·
Source Reputation +0.04 (listed: mass scanner).
Actions (done): Source IP blocked · Firewall rule updated (FW-01 rule #4102) · Administrator notified.

Featured intel for the dashboard: 185.23.xx.xx (Botnet, 98), 45.155.xx.xx (SSH scanner, 91), 103.75.xx.xx (suspicious, "Possible C2 server", 64).

## 4. Generated history (30 days)

Deterministic generator producing full `Threat` objects (features, explanation, actions, risk factors, timeline, replay)
from per-type templates. Volume ≈ 110–140 per day with a weekly pattern (weekends × 0.75). Type mix: port scans ≈ 55%,
brute force ≈ 25%, DDoS ≈ 3%, DNS anomaly ≈ 6%, malware ≈ 4%, unknown anomaly ≈ 7%. Severity follows the risk engine
(severity = risk level), which yields roughly low ≈ 45%, medium ≈ 45%, high ≈ 7%, critical ≈ 2%. No generated DDoS falls in the
last 24 h — the featured DDoS (B) is the day's headline incident. Most are perimeter events from masked external IPs; ≈ 15% involve internal devices.
Status: ≈ 96% contained (`blocked` / `resolved` / `quarantined`), ≈ 3% `dismissed` (false positives, slowly trending down
over 30 days to show learning), the rest `resolved` after monitoring. Only the featured threats A, C, D are active at boot.

Invariants:
* **Exactly 127 contained threats in the 24 h before boot** (featured B, E, F count toward it) → `threatsBlocked = 127`.
* Response times of contained threats are drawn around 142 ms (≈ 80–260 ms); adjust deterministically so the
  **24 h mean is exactly 142 ms** → `avgResponseMs = 142`.
* Explanations are generated from the same feature values that are displayed.
* Threat ids are `THR-<n>` numbered chronologically (oldest = smallest); new threats continue the sequence.

## 5. Metrics

* Active threats = threats with status in {detected, awaiting_approval, mitigating, monitoring, investigating} → **3** at boot.
* Network health ≈ **98.2%** (jitter ±0.1 live; drops during volumetric attacks).
* Security score components (weights): Threat Detection 96 (0.25) · Network Health round(networkHealth) = 98 (0.20) ·
  Device Security `round(100 − 3.7·suspicious − 12·compromised − 2·quarantined)` = 89 (0.25) ·
  Response Readiness 95 in autonomous mode / 82 in manual mode (0.20) · Privacy 95 (0.10).
  Score = round(Σ value × weight) = **94** at boot (92 in manual mode). delta24h = +2.
* System status: `under_attack` if any active critical threat; `elevated` if any active threat with risk ≥ 70; else `operational`.

## 6. Traffic

Baseline pps ≈ 8,000 at night → ≈ 15,500 mid-day (smooth diurnal curve, weekends × 0.7), ≈ 13,200 in working hours.
Bandwidth (Mbps) = pps × mean packet size (≈ 420 B) × 8 / 1e6. Noise ±3%. Anomaly score baseline 0.04–0.18.
Historical threats overlay spikes at their timestamps (DDoS × 8–14, port scan × 1.3–1.8, brute force × 1.15, others ≤ 1.1)
with anomaly scores 0.7–0.98, so incidents are visible in the 1H / 6H / 24H / 7D views (use bucket peaks so short spikes
survive aggregation). Ranges: live = 120 × 1 s · 1h = 60 × 60 s · 6h = 72 × 5 min · 24h = 96 × 15 min · 7d = 84 × 2 h.
Anomaly threshold = settings.anomalyThreshold (0.72).

## 7. Settings defaults

autonomousMode true · autoResponseThreshold 70 · quarantineThreshold 85 · anomalyThreshold 0.72 · notifyAdministrator true ·
detectionSensitivity balanced.

## 8. Model performance (simulated evaluation — must be labelled)

Hybrid NEXUS: accuracy 96.7 · precision 95.8 · recall 94.9 · F1 95.3.
Traditional (signature-based): 91.4 · 93.1 · 84.6 · 88.6. Anomaly only (Isolation Forest): 87.2 · 81.4 · 90.3 · 85.6.
Confusion matrix over [Benign, DDoS, Port Scan, Brute Force, DNS Anomaly, Malware] whose overall accuracy is 96.7%.
ROC AUC 0.987. Disclaimer: "Prototype metrics from a simulated evaluation — not results from real experiments. Replace with
measured results after training on a labelled dataset (e.g. CIC-IDS2017)."

## 9. Federated learning (simulated)

Clients: Hospital (1.84 M local flow records, local accuracy 94.1), University (2.31 M, 93.6), Bank (3.02 M, 95.2).
27 rounds, FedAvg with secure aggregation, global accuracy **96.2**, raw traffic shared **0 GB**, model updates 4.2 MB per client
per round (27 × 3 × 4.2 = 340.2 MB total). Differential privacy ACTIVE: Gaussian mechanism (DP-SGD), ε = 1.8, δ = 1e-5,
noise multiplier 1.1, clipping norm 1.0; ε spent per client ≈ 1.6. Accuracy by round rises from ≈ 78% (round 1) to 96.2%
(round 27) with diminishing returns; each local-only curve plateaus at its local accuracy.

## 10. Simulation scenarios (phase 3)

| Attack | Target | Severity | Signature numbers |
|---|---|---|---|
| Port Scan | PC-07 (192.168.1.44) → Internal Network (192.168.1.0/24) | HIGH | confidence 96.4, risk 89 (96.4, 91, 87, 82); 73 unique ports in 12 s; features Port Diversity +0.31, Connection Rate +0.24, SYN Ratio +0.18, Packet Frequency +0.12, Traffic Volume +0.08; response ✓ Source IP blocked ✓ Device quarantined ✓ Firewall rule updated ✓ Administrator notified; 142 ms |
| DDoS | botnet → Server-01 | CRITICAL | as featured threat B, fresh instance |
| Brute Force | external → Server-02 SSH | HIGH | as featured threat E |
| Suspicious DNS | PC-03 | MEDIUM→HIGH | as featured threat A with stronger signals |
| Malware Behavior | IoT-04 | HIGH | as featured threat C with risk above quarantine threshold |
| Unknown Anomaly | Server-03 | MEDIUM | anomaly-only detection |

Port Scan explanation: "NEXUS classified this traffic as a probable port scan because PC-07 contacted 73 unique destination
ports within 12 seconds — far above its baseline of ≤ 4 — while producing a SYN-to-ACK ratio of 0.94. Connection rate and packet
frequency rose sharply at the same time. Risk 89 exceeded the quarantine threshold, so NEXUS isolated the device."
