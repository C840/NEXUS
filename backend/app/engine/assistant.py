"""
NEXUS Analyst — a rule-based security assistant grounded in live state.

It explains and recommends; it never executes actions. `answer_question` is
the seam where an LLM provider (with the same state as grounded context and
the same AssistantReply contract) can replace the rules.
"""

from __future__ import annotations

import itertools
import re
from typing import TYPE_CHECKING, Callable, Optional

from app.schemas import AssistantReply, AttackType, Device, EntityRef, EvidenceItem, Threat

from .events import STATUS_LABEL
from .metrics import compute_metrics, is_active, is_contained
from .rng import iso, local, parse_iso

if TYPE_CHECKING:
    from .state import BackendState
    from .threats import ThreatRecord

GENERATED_BY = "NEXUS Analyst · rule-based engine (prototype)"
DAY = 86_400_000
_ids = itertools.count(1)

SUGGESTED_QUESTIONS = [
    "Why was PC-07 blocked?",
    "What is today's highest-risk threat?",
    "Which device is most vulnerable?",
    "Explain the latest DDoS attack.",
    "What actions did NEXUS take?",
    "What changed in the network today?",
]


def _first(label: str) -> str:
    return label.split(" ")[0]


REMEDIATION: dict[str, Callable[[Threat, bool], list[str]]] = {
    "ddos": lambda t, _i: [
        f"Keep the edge rate limit on {_first(t.target_label)} for at least 30 minutes",
        f"Ask the upstream provider to filter {t.source_ip} at their edge",
        "Review service capacity and enable SYN cookies on exposed hosts",
    ],
    "port_scan": lambda t, internal: (
        [
            f"Inspect {t.source_label} for scanning tools or malware before releasing it from quarantine",
            "Review which internal hosts responded to the scan",
            "Reset credentials that were used on the device",
        ]
        if internal
        else ["Confirm that no exposed service answered the probes", "Keep the source on the blocklist for 24 hours", "Review the perimeter for unnecessary open ports"]
    ),
    "brute_force": lambda t, _i: [
        "Verify that no login from the source succeeded",
        "Enforce key-based authentication or MFA on the targeted service",
        "Rate-limit the authentication endpoint",
    ],
    "dns_anomaly": lambda t, _i: [
        f"Inspect {t.source_label} for tunnelling tools or DGA malware",
        "Review the queried domains in the packet capture",
        "Quarantine the host if the pattern persists",
    ],
    "malware": lambda t, _i: [
        f"Quarantine {t.source_label} for forensic analysis",
        "Block the destination host at the perimeter",
        "Update firmware / re-image the device before reconnecting it",
    ],
    "unknown_anomaly": lambda t, _i: [
        f"Confirm the transfer with the owner of {t.source_label}",
        "Check the destination ownership and the classification of the data moved",
        "Add a baseline exception if the transfer is legitimate",
    ],
}


# ------------------------------------------------------------------ helpers

def _time(value: str) -> str:
    return local(parse_iso(value)).strftime("%H:%M:%S")


def _ago(value: str, now: int) -> str:
    s = max(0, round((now - parse_iso(value)) / 1000))
    if s < 60:
        return f"{s} s ago"
    m = round(s / 60)
    if m < 60:
        return f"{m} min ago"
    h = round(m / 60)
    return f"{h} h ago" if h < 48 else f"{round(h / 24)} days ago"


def _threat_ref(t: Threat) -> EntityRef:
    return EntityRef(kind="threat", id=t.id, label=f"{t.id} · {t.name}")


def _device_ref(d: Device) -> EntityRef:
    return EntityRef(kind="device", id=d.id, label=d.hostname)


def _feature_evidence(t: Threat, n: int = 3) -> list[EvidenceItem]:
    return [EvidenceItem(label=f.label, value=f"{f.observed} (baseline {f.baseline})", tone=t.severity) for f in t.features[:n]]


def _done_actions(t: Threat) -> list[str]:
    return [f"{a.label} — {a.target}" for a in t.actions if a.status == "done"]


def _lower_first(text: str) -> str:
    """'Source IP blocked' → 'source IP blocked' (keeps acronyms intact)."""
    return text[:1].lower() + text[1:]


def _join(items: list[str]) -> str:
    if len(items) <= 1:
        return "".join(items)
    return f"{', '.join(items[:-1])} and {items[-1]}"


def _follow_ups_except(*skip: str) -> list[str]:
    return [q for q in SUGGESTED_QUESTIONS if q not in skip][:3]


def _reply(paragraphs: list[str], now: int, **extra: object) -> AssistantReply:
    return AssistantReply(
        id=f"ans-{now:x}-{next(_ids)}",
        content="\n\n".join(p for p in paragraphs if p),
        evidence=extra.get("evidence", []),  # type: ignore[arg-type]
        actions_taken=extra.get("actions_taken", []),  # type: ignore[arg-type]
        recommendations=extra.get("recommendations", []),  # type: ignore[arg-type]
        references=extra.get("references", []),  # type: ignore[arg-type]
        follow_ups=extra.get("follow_ups", SUGGESTED_QUESTIONS[:3]),  # type: ignore[arg-type]
        generated_by=GENERATED_BY,
        timestamp=iso(now),
    )


def _response_sentence(r: ThreatRecord) -> str:
    t = r.threat
    done = [_lower_first(a.label) for a in t.actions if a.status == "done"]
    if not done:
        return ""
    if t.status in ("blocked", "quarantined"):
        how = "after administrator approval" if r.decided_by == "administrator" else "autonomously"
        rt = f" in {t.response_time_ms} ms" if t.response_time_ms is not None else ""
        return f"NEXUS responded {how}{rt}: {_join(done)}."
    return f"NEXUS has {_join(done)}; no containment has been applied."


# ------------------------------------------------------------------ intents

def _explain_threat(r: ThreatRecord, state: BackendState, now: int, lead: Optional[str] = None) -> AssistantReply:
    t = r.threat
    device = next((d for d in state.devices if d.id == t.device_id), None)
    intro = lead or (
        f"{t.id} is a {t.severity} {t.name} (risk {t.risk_score}/100, confidence {t.confidence:.1f}%) from {t.source_ip} against {t.target_label}, "
        f"detected at {_time(t.timestamp)} ({_ago(t.timestamp, now)}). Current status: {STATUS_LABEL[t.status].lower()}."
    )
    evidence = [
        *_feature_evidence(t),
        EvidenceItem(label="Risk score", value=f"{t.risk_score} / 100", tone=t.severity),
        EvidenceItem(label="Detection confidence", value=f"{t.confidence:.1f}%", tone="info"),
    ]
    if t.response_time_ms is not None:
        evidence.append(EvidenceItem(label="Response time", value=f"{t.response_time_ms} ms", tone="safe"))
    return _reply(
        [intro, t.explanation, _response_sentence(r)],
        now,
        evidence=evidence,
        actions_taken=_done_actions(t),
        recommendations=REMEDIATION[t.type](t, r.source.internal),
        references=[_threat_ref(t), *([_device_ref(device)] if device else [])],
    )


def _device_answer(device: Device, state: BackendState, now: int) -> AssistantReply:
    involving = [r for r in state.records if r.threat.device_id == device.id]
    self_contained = next((r for r in reversed(involving) if r.source.internal and r.threat.status in ("quarantined", "blocked")), None)
    active = next((r for r in reversed(involving) if is_active(r.threat)), None)
    targeted = next((r for r in reversed(involving) if not r.source.internal and is_contained(r.threat)), None)
    qt = state.settings.quarantine_threshold

    if device.status == "quarantined" or self_contained:
        r = self_contained or active
        if r:
            t = r.threat
            verb = "quarantined (isolated from the network)" if t.status == "quarantined" else "blocked"
            above = f" — above the quarantine threshold of {qt}" if t.risk_score >= qt else ""
            lead = (
                f"{device.hostname} ({device.ip}) was {verb} at {_time(t.timestamp)} after NEXUS detected probable {t.name.lower()} behavior "
                f"with {t.confidence:.1f}% confidence. The resulting risk score was {t.risk_score}/100{above}."
            )
            return _explain_threat(r, state, now, lead)

    if active:
        t = active.threat
        doing = "investigating" if t.status == "investigating" else "monitoring"
        chose = "an investigation with a recommended quarantine" if t.status == "investigating" else "enhanced monitoring"
        lead = (
            f"{device.hostname} has not been blocked. NEXUS is {doing} it for a {t.name} ({t.id}) detected {_ago(t.timestamp, now)} — risk {t.risk_score}/100 "
            f"is below the containment threshold ({state.settings.auto_response_threshold}), so NEXUS chose {chose} rather than isolation."
        )
        return _explain_threat(active, state, now, lead)

    if targeted:
        t = targeted.threat
        lead = (
            f"{device.hostname} itself was not blocked — it was the target. The most recent attack against it was a {t.name} ({t.id}) from {t.source_ip} at "
            f"{_time(t.timestamp)}; NEXUS blocked the attacking source, and {device.hostname} remains {device.status} with a risk score of {device.risk_score}/100."
        )
        return _explain_threat(targeted, state, now, lead)

    return _reply(
        [
            f"{device.hostname} ({device.ip}) has not been blocked. It is currently {device.status} with a risk score of {device.risk_score}/100 and no active threats. "
            f"NEXUS last observed it {_ago(device.last_seen, now)} with {device.connections} active connections, and no detection in the last 30 days involved this device.",
            "Tip: launch a simulated Port Scan from the top bar to watch NEXUS detect, explain and contain an attack in real time.",
        ],
        now,
        evidence=[
            EvidenceItem(label="Status", value=device.status, tone="safe"),
            EvidenceItem(label="Risk score", value=f"{device.risk_score} / 100", tone="safe"),
            EvidenceItem(label="Active connections", value=str(device.connections), tone="info"),
            EvidenceItem(label="Role", value=device.role),
        ],
        recommendations=["No action required — the device is behaving within its learned baseline."],
        references=[_device_ref(device)],
        follow_ups=_follow_ups_except("Why was PC-07 blocked?"),
    )


def _highest_risk(state: BackendState, now: int) -> AssistantReply:
    window = [r for r in state.records if parse_iso(r.threat.timestamp) >= now - DAY and r.threat.status != "dismissed"]
    if not window:
        return _reply(["No threats were detected in the last 24 hours."], now)
    top = max(window, key=lambda r: (r.threat.risk_score, r.threat.timestamp))
    t = top.threat
    lead = (
        f"Today's highest-risk threat (last 24 h) is the {t.name} {t.id} — risk {t.risk_score}/100 ({t.severity}) — from {t.source_ip} against {t.target_label}, "
        f"detected at {_time(t.timestamp)}. It is {STATUS_LABEL[t.status].lower()}."
    )
    answer = _explain_threat(top, state, now, lead)
    answer.follow_ups = _follow_ups_except("What is today's highest-risk threat?")
    return answer


def _most_vulnerable(state: BackendState, now: int) -> AssistantReply:
    ranked = sorted(state.devices, key=lambda d: -d.risk_score)
    d = ranked[0]
    active_on = [r.threat for r in state.records if r.threat.device_id == d.id and is_active(r.threat)]
    reasons = [
        f"an active {', '.join(f'{t.name} ({t.id}, risk {t.risk_score})' for t in active_on)}" if active_on else "",
        "embedded firmware with limited patching" if d.type in ("camera", "iot_sensor") else "",
        f"{len(d.open_ports)} exposed service port{'s' if len(d.open_ports) > 1 else ''} ({', '.join(map(str, d.open_ports))})" if d.open_ports else "",
    ]
    reasons = [r for r in reasons if r]
    runners = [f"{x.hostname} ({x.risk_score})" for x in ranked[1:3]]
    t = active_on[0] if active_on else None
    return _reply(
        [
            f"{d.hostname} — the {d.role.lower()} at {d.ip} — is currently the most vulnerable device, with a risk score of {d.risk_score}/100 and status {d.status}.",
            f"Contributing factors: {_join(reasons)}." if reasons else "",
            t.explanation if t else "",
            f"Next most exposed: {_join(runners)}.",
        ],
        now,
        evidence=[
            EvidenceItem(label="Risk score", value=f"{d.risk_score} / 100", tone="medium" if d.risk_score >= 40 else "safe"),
            EvidenceItem(label="Status", value=d.status, tone="safe" if d.status == "safe" else "medium"),
            EvidenceItem(label="Active threats", value=", ".join(x.name for x in active_on) if active_on else "none", tone="medium" if active_on else "safe"),
            EvidenceItem(label="Open ports", value=", ".join(map(str, d.open_ports)) or "none"),
        ],
        actions_taken=_done_actions(t) if t else [],
        recommendations=REMEDIATION[t.type](t, True) if t else ["Patch the device and restrict its exposed services"],
        references=[_device_ref(d), *(_threat_ref(x) for x in active_on)],
        follow_ups=_follow_ups_except("Which device is most vulnerable?"),
    )


def _latest_of_type(attack: AttackType, state: BackendState, now: int, skip: str) -> AssistantReply:
    r = next((x for x in reversed(state.records) if x.threat.type == attack and x.threat.status != "dismissed"), None)
    if not r:
        return _reply([f"No {attack.replace('_', ' ')} has been detected in the retained history."], now)
    t = r.threat
    lead = (
        f"The latest {t.name} ({t.id}) targeted {t.target_label} at {_time(t.timestamp)} ({_ago(t.timestamp, now)}) — severity {t.severity}, "
        f"risk {t.risk_score}/100, confidence {t.confidence:.1f}%."
    )
    answer = _explain_threat(r, state, now, lead)
    if r.intel:
        i = r.intel
        answer.content += (
            f"\n\nThreat intelligence (simulated feed): {i.ip} is rated {i.reputation} ({i.threat_type}, {i.confidence:g}% confidence), "
            f"first observed {_ago(i.first_observed, now)}, with {i.related_events} related events."
        )
    answer.follow_ups = _follow_ups_except(skip)
    return answer


def _actions_taken(state: BackendState, now: int) -> AssistantReply:
    day = [r for r in state.records if parse_iso(r.threat.timestamp) >= now - DAY]
    contained = [r for r in day if is_contained(r.threat)]

    def count(kind: str) -> int:
        return sum(1 for r in contained for a in r.threat.actions if a.kind == kind and a.status == "done")

    timed = [r.threat.response_time_ms for r in contained if r.threat.response_time_ms is not None]
    avg = round(sum(timed) / len(timed)) if timed else 0
    active = [r for r in state.records if is_active(r.threat)]
    recent = list(reversed(contained))[:4]
    plural = len(active) > 1
    return _reply(
        [
            f"In the last 24 hours NEXUS contained {len(contained)} threats with an average response time of {avg} ms: {count('block_ip')} source IPs or ranges blocked, "
            f"{count('update_firewall')} firewall rules updated, {count('quarantine_device')} devices quarantined and {count('rate_limit')} rate limits applied.",
            (
                f"{len(active)} threat{'s remain' if plural else ' remains'} under observation without containment because {'their risk is' if plural else 'its risk is'} "
                f"below the auto-response threshold ({state.settings.auto_response_threshold}): "
                + _join([f"{r.threat.name} on {r.threat.source_label} ({r.threat.risk_score})" for r in active])
                + "."
            )
            if active
            else "",
            "Every action was executed by the NEXUS response engine under the current autonomy policy — this assistant explains and recommends, but never executes actions itself.",
        ],
        now,
        evidence=[
            EvidenceItem(label="Threats contained (24 h)", value=str(len(contained)), tone="safe"),
            EvidenceItem(label="Average response", value=f"{avg} ms", tone="safe"),
            EvidenceItem(label="IPs / ranges blocked", value=str(count("block_ip")), tone="info"),
            EvidenceItem(label="Devices quarantined", value=str(count("quarantine_device")), tone="high" if count("quarantine_device") else "safe"),
        ],
        actions_taken=[f"{r.threat.name} {r.threat.id}: {a}" for r in recent for a in _done_actions(r.threat)[:2]],
        recommendations=[f"Review the {len(active)} monitored threat{'s' if plural else ''} and decide whether containment is warranted"] if active else [],
        references=[_threat_ref(r.threat) for r in recent],
        follow_ups=_follow_ups_except("What actions did NEXUS take?"),
    )


def _changes_today(state: BackendState, now: int) -> AssistantReply:
    midnight = int(local(now).replace(hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
    since = min(midnight, now - 6 * 3_600_000)
    label = "Since midnight" if since == midnight else "In the last 6 hours"
    rows = [r for r in state.records if parse_iso(r.threat.timestamp) >= since]
    detections = [r for r in rows if r.threat.status != "dismissed"]

    def sev(s: str) -> int:
        return sum(1 for r in detections if r.threat.severity == s)

    contained = sum(1 for r in detections if is_contained(r.threat))
    dismissed = len(rows) - len(detections)
    watched = [d for d in state.devices if d.status != "safe"]
    sources: dict[str, int] = {}
    for r in detections:
        if not r.source.internal:
            sources[r.threat.source_ip] = sources.get(r.threat.source_ip, 0) + 1
    top_source = max(sources.items(), key=lambda kv: kv[1]) if sources else None
    notable = [r for r in reversed(detections) if r.threat.risk_score >= 70 or is_active(r.threat)][:4]
    return _reply(
        [
            f"{label}, NEXUS recorded {len(detections)} detections — {sev('critical')} critical, {sev('high')} high, {sev('medium')} medium and {sev('low')} low. "
            f"{contained} were contained automatically and {dismissed} {'was' if dismissed == 1 else 'were'} dismissed as false positives.",
            ("Notable events: " + _join([f"{r.threat.name} {r.threat.id} ({STATUS_LABEL[r.threat.status].lower()}, {_time(r.threat.timestamp)})" for r in notable]) + ".") if notable else "",
            ("Devices currently under watch: " + _join([f"{d.hostname} ({d.status}, risk {d.risk_score})" for d in watched]) + ".") if watched else "All devices are currently safe.",
            f"Most active external source: {top_source[0]} with {top_source[1]} detections." if top_source else "",
        ],
        now,
        evidence=[
            EvidenceItem(label="Detections", value=str(len(detections)), tone="info"),
            EvidenceItem(label="Contained", value=str(contained), tone="safe"),
            EvidenceItem(label="Critical / high", value=f"{sev('critical')} / {sev('high')}", tone="critical" if sev("critical") else "high"),
            EvidenceItem(label="Devices under watch", value=str(len(watched)), tone="medium" if watched else "safe"),
        ],
        recommendations=[f"Review {d.hostname} ({d.status})" for d in watched[:2]],
        references=[*(_threat_ref(r.threat) for r in notable), *(_device_ref(d) for d in watched[:3])],
        follow_ups=_follow_ups_except("What changed in the network today?"),
    )


def _posture(state: BackendState, now: int) -> AssistantReply:
    threats = [r.threat for r in state.records]
    metrics, score, status = compute_metrics(threats, state.devices, state.settings, state.network_health, now)
    active = [t for t in threats if is_active(t)]
    status_text = {"operational": "operational", "elevated": "at an elevated threat level", "under_attack": "under active attack", "degraded": "degraded"}[status]
    plural = len(active) > 1
    return _reply(
        [
            f"The network is {status_text}. The NEXUS security score is {score.score}/100, network health is {metrics.network_health}% and "
            f"{metrics.threats_blocked} threats were blocked in the last 24 hours with an average response of {metrics.avg_response_ms} ms.",
            (
                f"{len(active)} threat{'s are' if plural else ' is'} active: "
                + _join([f"{t.name} on {t.source_label} (risk {t.risk_score}, {STATUS_LABEL[t.status].lower()})" for t in active])
                + "."
            )
            if active
            else "No threats are active.",
        ],
        now,
        evidence=[
            EvidenceItem(label="Security score", value=f"{score.score} / 100", tone="safe" if score.score >= 85 else "medium"),
            EvidenceItem(label="Active threats", value=str(metrics.active_threats), tone="medium" if metrics.active_threats else "safe"),
            EvidenceItem(label="Blocked (24 h)", value=str(metrics.threats_blocked), tone="safe"),
            EvidenceItem(label="Network health", value=f"{metrics.network_health}%", tone="safe"),
        ],
        references=[_threat_ref(t) for t in active],
    )


# ------------------------------------------------------------------ router

TYPE_KEYWORDS: list[tuple[re.Pattern[str], AttackType]] = [
    (re.compile(r"port ?scan|scanning"), "port_scan"),
    (re.compile(r"brute|password|login attempt|credential"), "brute_force"),
    (re.compile(r"\bdns\b|tunnel"), "dns_anomaly"),
    (re.compile(r"malware|beacon|c2|command.and.control"), "malware"),
    (re.compile(r"unknown|anomal"), "unknown_anomaly"),
]


def _find_device(text: str, devices: list[Device]) -> Optional[Device]:
    for d in devices:
        # Hostnames are [a-z0-9-] only; accept "pc-07", "pc07" and "pc 07".
        host = d.hostname.lower().replace("-", r"-?\s?")
        if re.search(rf"(^|[^a-z0-9]){host}([^a-z0-9]|$)", text) or d.ip in text:
            return d
    return None


def answer_question(question: str, state: BackendState, now: int) -> AssistantReply:
    reply = _route(question, state, now)
    asked = question.strip().lower()
    reply.follow_ups = [q for q in reply.follow_ups if q.lower() != asked][:3] or SUGGESTED_QUESTIONS[1:4]
    return reply


def _route(question: str, state: BackendState, now: int) -> AssistantReply:
    text = question.lower().strip()

    id_match = re.search(r"\bthr-?(\d+)\b", text)
    if id_match:
        r = state.by_id.get(f"THR-{id_match.group(1)}")
        if r:
            return _explain_threat(r, state, now)
        return _reply([f"I couldn't find threat THR-{id_match.group(1)} in the retained 30-day history."], now)

    device = _find_device(text, state.devices)
    if device:
        return _device_answer(device, state, now)

    if re.search(r"ddos|denial.of.service|\bflood", text):
        return _latest_of_type("ddos", state, now, "Explain the latest DDoS attack.")
    if re.search(r"highest.?risk|most dangerous|riskiest threat|worst|biggest threat|most severe", text):
        return _highest_risk(state, now)
    if re.search(r"vulnerab|weakest|riskiest device|most at.risk|which device", text):
        return _most_vulnerable(state, now)
    if re.search(r"what (actions|did)|actions?\b|mitigat|respon", text):
        return _actions_taken(state, now)
    if re.search(r"what changed|today|summary|overview|happened|brief", text):
        return _changes_today(state, now)
    for pattern, attack in TYPE_KEYWORDS:
        if pattern.search(text):
            return _latest_of_type(attack, state, now, "")
    if re.search(r"safe|status|posture|health|score|secure|risk", text):
        return _posture(state, now)

    return _reply(
        [
            'I can investigate NEXUS security data for you: explain why a device was flagged or isolated, break down a specific threat (for example "Explain THR-…"), '
            "summarize what NEXUS did, or describe what changed on the network.",
            "Try one of the questions below.",
        ],
        now,
        follow_ups=SUGGESTED_QUESTIONS,
    )

