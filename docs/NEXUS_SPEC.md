# NEXUS — AI-Native Network Security Platform (Product Specification)

> Source: the original project brief. Kept verbatim in substance so every contributor builds against the same requirements.

Build a polished, modern web application called **NEXUS (Neural Explainable Unified Security)**.

NEXUS is an AI-powered network security and threat-monitoring platform designed to continuously observe network traffic, identify malicious or anomalous behavior, assess the severity of threats, explain why a threat was detected, and visualize or simulate an automated security response.

The primary goal of this project is to create a high-quality interactive cybersecurity dashboard and prototype, not a production-grade cybersecurity product. The application should feel like a futuristic AI-powered Security Operations Center (SOC), but it must remain clean, professional, intuitive, and visually sophisticated.

**Build order (from the project owner):** First create the complete frontend with mock data and make every page visually polished and functional. Then create the FastAPI backend and connect the frontend to it. After that, implement the attack simulator and real-time event flow. Only then begin replacing simulated security components with real Scapy/ML implementations.

## 1. Core concept

Pipeline: Network Traffic → Traffic Analysis → Feature Extraction → AI Threat Detection → Anomaly Detection → Threat Classification → Risk Scoring → Explainable AI → Automated Response → Visualization → Security Assistant.

NEXUS doesn't simply tell an administrator that an attack happened. It attempts to identify what happened, determine how dangerous it is, explain why it believes the traffic is malicious, and recommend or simulate an appropriate response. The application should communicate these concepts throughout the UI.

## 2. Project scope

Do NOT build every advanced technology as a production implementation. This is a prototype/demo application. The frontend should be fully functional using realistic simulated data. Structure the application so simulated services can later be replaced with real implementations (Frontend → API → Detection Engine → Database). Initially the Detection Engine may return simulated results. The architecture should make it possible to later integrate: Scapy (packet capture), XGBoost/Random Forest (supervised classification), Isolation Forest or Autoencoder (anomaly detection), SHAP (explainability), NetworkX/GNN (network relationship analysis), PostgreSQL (security events), WebSockets (real-time events), Federated Learning, Differential Privacy, LLM-based security assistant.

**Do not pretend that simulated data is real network telemetry.** The UI can present the prototype as a NEXUS security environment while clearly keeping the architecture ready for real data.

## 3. Technology stack

Frontend: React, TypeScript, Tailwind CSS, React Router, Recharts, React Flow, Framer Motion, Lucide React. Backend: Python, FastAPI. Data: PostgreSQL-ready architecture; mock JSON/local data acceptable initially. Real-time: WebSocket-ready. AI: mock AI responses initially; structured so XGBoost, Isolation Forest, SHAP and an LLM can be connected later. Docker-ready. Do not introduce unnecessary frameworks.

## 4. Visual design

The visual identity is extremely important. NEXUS should be: clean, futuristic, vivid, abstract, intelligent, technical, premium, professional, slightly mysterious, visually memorable.

- Do NOT make it look like a generic admin dashboard.
- Do NOT use the stereotypical "hacker" aesthetic with excessive green Matrix text.
- Do NOT fill the screen with glowing effects.

Visual language: modern AI interface + cybersecurity SOC + abstract network visualization + futuristic scientific visualization + premium developer tool. Think "AI laboratory + cybersecurity command center", not "Hollywood hacker terminal".

## 5. Color system

Very dark foundation (near-black, deep navy, charcoal). Primary accent: electric cyan, vivid blue, subtle violet. Threat colors: red = critical, orange = high, yellow = medium, cyan/blue = informational, green = safe. Use gradients sparingly. Allow small areas of vivid cyan/violet/red to create visual hierarchy. Predominantly dark with carefully controlled bright elements. Avoid excessive glassmorphism. Use subtle borders, shadows, gradients, glow, transparency, blur, grid patterns, particle/network effects — only where they improve the interface.

## 6. Abstract visual language

NEXUS should visually represent a living network: animated network particles, flowing connection lines, node graphs, data streams, abstract topology, pulsing threat nodes, radial threat visualizations, animated traffic paths, subtle grid backgrounds. These must feel purposeful. E.g. the dashboard background can contain a very subtle animated network mesh; when a threat is detected a node can pulse red and connections can temporarily change state. Animations must remain smooth and restrained.

## 7. Application structure

Pages: Dashboard, Threats, Threat Investigation, Network, Devices, Analytics, AI Assistant, Privacy / Federated Learning, Settings. Persistent sidebar navigation.

## 8. Sidebar

Clean collapsible sidebar. Brand "NEXUS", subtitle "NEURAL SECURITY INTELLIGENCE". Navigation: Overview, Threats, Network, Devices, Analytics, AI Assistant, Privacy, Settings. Bottom: "SYSTEM STATUS ● OPERATIONAL" and "AUTONOMOUS DEFENSE ON/OFF".

## 9. Dashboard (the most important page)

Must immediately communicate the state of the network. Top section: "NEXUS — Network Security Intelligence — Status: ● SYSTEM OPERATIONAL". Main metric cards: Security Score (94 / 100), Active Threats (3), Threats Blocked (127), Devices Protected (42), Network Health (98.2%), Average Response Time (142 ms). Animated number transitions.

## 10. Network traffic visualization

Large interactive traffic chart showing packets/sec, bandwidth, normal baseline, anomalies, attack spikes. Range switch: LIVE, 1H, 6H, 24H, 7D. When a simulated attack occurs the graph visibly changes: smooth baseline → large spike → mitigation → traffic returns toward baseline.

## 11. Live threat feed

Real-time security event stream, e.g.:
- CRITICAL · DDoS Attack · 185.23.xx.xx · Blocked · 12:41:03
- HIGH · Port Scan · 192.168.1.44 · Quarantined · 12:40:51
- MEDIUM · DNS Anomaly · 192.168.1.21 · Monitoring · 12:40:37

Events animate into the feed. Filters: All, Critical, High, Medium, Low.

## 12. Network topology

Interactive network visualization (React Flow). Example: Internet → Firewall → Router → Servers / PCs / IoT devices. Node states: GREEN normal, YELLOW suspicious, RED compromised, GRAY blocked. Clicking a node opens its information panel, e.g. DEVICE PC-07 · 192.168.1.44 · Status COMPROMISED · Risk 89/100 · Threats: Port Scanning, Suspicious DNS · Connections 17 · Last Activity 12:41:03.

## 13. Threat investigation page

Detailed investigation when a threat is selected, e.g. PORT SCAN · Severity HIGH · Confidence 96.4% · Risk 89/100 · Source 192.168.1.44 · Target Internal Network · Detected 12:40:51 · Status BLOCKED. Attack timeline: Normal Traffic → Traffic Anomaly → Unusual Port Activity → AI Detection → Threat Classification → Risk Assessment → Device Quarantined. Visually strong timeline.

## 14. Explainable AI (one of the most important concepts)

Section "WHY DID NEXUS DETECT THIS?" with feature contributions shown visually, e.g. Port Diversity +0.31, Connection Rate +0.24, SYN Ratio +0.18, Packet Frequency +0.12, Traffic Volume +0.08. Then a human-readable explanation, e.g. "NEXUS classified this traffic as a probable port scan because the device contacted an unusually large number of destination ports in a short period while producing a high SYN-to-ACK ratio." The explanation must be based on the displayed simulated features — never contradict the displayed data.

## 15. Risk engine

Visually prominent threat score, e.g. 89 / 100 HIGH RISK. Breakdown: Detection confidence 96%, Anomaly score 91%, Behavioral risk 87%, Threat intelligence 82%. Show how these contribute to the final risk score.

## 16. Autonomous response

Dedicated response panel: THREAT DETECTED → CLASSIFIED → RISK ASSESSED → RESPONSE SELECTED. Actions: ✓ Source IP blocked ✓ Device quarantined ✓ Firewall rule updated ✓ Administrator notified. Response time 142 ms. Communicate DETECT → DECIDE → RESPOND → RECOVER.

## 17. Autonomous defense toggle

"AUTONOMOUS DEFENSE ● ON". Switch between AUTONOMOUS MODE and MANUAL MODE. Manual: "Threat detected. Waiting for administrator approval." Autonomous: "Threat detected. Mitigation automatically executed."

## 18. Attack simulator (extremely important for the demo)

Button "SIMULATE ATTACK" → modal: DDoS, Port Scan, Brute Force, Suspicious DNS, Malware Behavior, Unknown Anomaly. Then simulate: Normal → Traffic spike → Anomaly detected → AI classification → Risk score increases → Threat appears on network map → Autonomous response → Threat blocked → Network recovery. Make the simulation visually convincing.

## 19. Attack replay

Replay a previous incident: 00:00 Normal · 00:05 Anomaly begins · 00:10 Detection · 00:12 Threat classified · 00:14 Risk reaches critical · 00:15 Response initiated · 00:17 Threat blocked · 00:25 Network recovered. Use animation and charts.

## 20. Devices page

Searchable device inventory. Columns: Device, IP, Type, Risk, Status, Last Seen. E.g. PC-01 192.168.1.12 Workstation 12 Safe; PC-07 192.168.1.44 Workstation 89 Compromised; IoT-04 192.168.1.71 Camera 54 Suspicious; Server-01 192.168.1.5 Server 8 Safe.

## 21. Analytics page

Charts: attacks over time, attacks by type, attacks by severity, most targeted devices, top malicious sources, average response time, false positive trend, detection confidence. Filters: TODAY, 7 DAYS, 30 DAYS.

## 22. AI model performance

Research-oriented section: Accuracy 96.7%, Precision 95.8%, Recall 94.9%, F1 95.3%. Compare Traditional Detection 91.4%, Anomaly Detection 87.2%, Hybrid NEXUS 96.7%. Use charts. Clearly label these as prototype/experimental metrics if simulated. Never imply simulated metrics are results from real experiments.

## 23. Privacy / Federated learning page

Hospital, University, Bank — each has its own local model. They send MODEL UPDATES, not RAW NETWORK TRAFFIC. Hospital/University/Bank → Local Training → Federated Server → Global Model. Metrics: Federated Clients 3, Training Rounds 27, Global Accuracy 96.2%, Raw Traffic Shared 0 GB. Differential Privacy ACTIVE. Explain: "Organizations collaboratively improve the detection model without directly sharing raw network traffic."

## 24. AI security assistant

Title "NEXUS SECURITY ASSISTANT", subtitle "AI-powered security investigation". Suggested questions: Why was PC-07 blocked? · What is today's highest-risk threat? · Which device is most vulnerable? · Explain the latest DDoS attack. · What actions did NEXUS take? · What changed in the network today? Example answer: "PC-07 was isolated after NEXUS detected probable port scanning behavior. The device contacted 73 unique ports within 12 seconds and generated an unusually high SYN ratio. The resulting risk score was 89/100." The assistant has access to the simulated security data. Design it like a professional AI analyst, not a generic chatbot.

## 25. Threat intelligence

Panel, e.g. IP 185.23.xx.xx · Reputation MALICIOUS · Threat Type Botnet · Confidence 98% · First Observed 3 hours ago · Related Events 12. Simulated for the prototype.

## 26. Security score

NEXUS SECURITY SCORE with breakdown: Threat Detection, Network Health, Device Security, Response Readiness, Privacy. Radial visualization.

## 27. Real-time behavior

The interface should feel alive: subtle animations for threat events, traffic graphs, network nodes, counters, status indicators, attack simulation, response actions. Do not animate everything simultaneously — responsive and sophisticated rather than distracting.

## 28. Data architecture

Threat {id, type, severity, sourceIp, targetIp, confidence, riskScore, status, timestamp, explanation, features, actions}; Device {id, hostname, ip, type, status, riskScore, connections, lastSeen}; SecurityEvent {id, type, message, severity, timestamp, relatedThreat}; NetworkNode {id, label, ip, type, status, risk}. Keep all data structures clean and replaceable.

## 29. Backend API

GET /api/dashboard · GET /api/threats · GET /api/threats/{id} · GET /api/devices · GET /api/network · GET /api/events · GET /api/analytics · POST /api/simulate · POST /api/response · POST /api/assistant · GET /api/privacy. Realistic mock data initially. The frontend communicates with the backend rather than containing all security data directly.

## 30. Code quality

Reusable components, clean folder structure, TypeScript types, reusable cards/charts/modals/status badges/threat components, clear naming, no giant components, no duplicated code. Scalable architecture.

## 31. Responsiveness

Desktop, laptop, tablet. Prioritize desktop (command center). The dashboard should work especially well at 1440px+.

## 32. UX requirements

The user should immediately understand: 1) Is the network safe? 2) What threats exist? 3) Where are the threats? 4) Why were they detected? 5) What did NEXUS do? 6) What is happening right now? Do not hide critical information behind excessive menus.

## 33. Design principle — the UI tells a story

OBSERVE → UNDERSTAND → DETECT → EXPLAIN → RESPOND → LEARN. This is the conceptual identity of NEXUS.

## 34. Do NOT

Create a generic admin dashboard · use excessive neon colors · use Matrix-style green text · overload every section with charts · use random fake numbers without context · claim simulated AI results are real · claim the application is production-ready · add unnecessary pages · create meaningless AI buzzwords · make the LLM responsible for blindly executing security actions · make the interface difficult to understand. It should look like a serious research prototype.

## 35. Primary demo flow (3–5 minutes)

1. Open the dashboard. 2. Show network health, security score, traffic, devices, threat feed. 3. Click SIMULATE ATTACK. 4. Select PORT SCAN. 5. Traffic becomes abnormal. 6. NEXUS detects the anomaly. 7. Display PORT SCAN · Confidence 96.4% · Risk 89/100. 8. Highlight the compromised device on the topology. 9. Open Threat Investigation. 10. Show WHY NEXUS DETECTED THIS with feature contributions. 11. Show the attack timeline. 12. Show AUTONOMOUS RESPONSE ✓ IP blocked ✓ Device quarantined ✓ Firewall rule updated. 13. Traffic returns to normal. 14. Open AI Assistant. 15. Ask "Why was PC-07 blocked?" 16. Detailed explanation based on the simulated incident. 17. Open Privacy. 18. Demonstrate the federated learning architecture.

## 36. Overall goal

Move cybersecurity from Traditional (MONITOR → ALERT → HUMAN INVESTIGATION → MANUAL RESPONSE) toward NEXUS (MONITOR → DETECT → UNDERSTAND → EXPLAIN → ASSESS → RESPOND → LEARN). A next-generation AI cybersecurity command center that remains technically credible, modular, visually clean, and suitable as a university research prototype. Polished UI first, realistic simulated data second, clear architecture for integrating real technologies later. Do not sacrifice usability for visual effects. A professor should immediately understand: "This is a system that observes a network, detects threats, explains its decisions, and demonstrates autonomous cyber defense."
