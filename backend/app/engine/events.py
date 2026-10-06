"""Security event stream — detections, responses and housekeeping."""

from __future__ import annotations

import itertools

from app.schemas import SecurityEvent, Threat

from .rng import iso, parse_iso

HOUR = 3_600_000

STATUS_LABEL = {
    "detected": "Detected",
    "awaiting_approval": "Awaiting approval",
    "mitigating": "Mitigating",
    "blocked": "Blocked",
    "quarantined": "Quarantined",
    "monitoring": "Monitoring",
    "investigating": "Investigating",
    "resolved": "Resolved",
    "dismissed": "Dismissed",
}

ANOMALY_FIRST = frozenset({"dns_anomaly", "malware", "unknown_anomaly"})
_seq = itertools.count(1)


def detection_event(threat: Threat) -> SecurityEvent:
    """The feed row for a threat: 'CRITICAL · DDoS Attack · 185.23.xx.xx · Blocked'."""
    rt = (
        f" · contained in {threat.response_time_ms} ms"
        if threat.response_time_ms is not None and threat.status in ("blocked", "quarantined")
        else ""
    )
    return SecurityEvent(
        id=f"EVT-{threat.id[4:]}",
        type="anomaly" if threat.type in ANOMALY_FIRST else "detection",
        title=threat.name,
        message=f"{threat.source_ip} → {threat.target_label} · risk {threat.risk_score}/100{rt}",
        severity=threat.severity,
        timestamp=threat.timestamp,
        related_threat=threat.id,
        source_ip=threat.source_ip,
        device_id=threat.device_id,
        outcome=STATUS_LABEL[threat.status],
    )


def response_event(threat: Threat, title: str, message: str, at: int) -> SecurityEvent:
    return SecurityEvent(
        id=f"EVT-R{next(_seq)}-{threat.id[4:]}",
        type="response",
        title=title,
        message=message,
        severity="info",
        timestamp=iso(at),
        related_threat=threat.id,
        source_ip=threat.source_ip,
        device_id=threat.device_id,
        outcome=STATUS_LABEL[threat.status],
    )


def system_event(title: str, message: str, at: int, kind: str = "system") -> SecurityEvent:
    return SecurityEvent(id=f"EVT-S{next(_seq)}", type=kind, title=title, message=message, severity="info", timestamp=iso(at))  # type: ignore[arg-type]


def seed_events(threats: list[Threat], now: int) -> list[SecurityEvent]:
    """Feed history at boot: detections from the last 6 h, featured responses, housekeeping."""
    recent = [t for t in threats if parse_iso(t.timestamp) >= now - 6 * HOUR]
    events = [detection_event(t) for t in recent]
    for t in recent:
        ts = parse_iso(t.timestamp)
        if t.response_time_ms is not None and t.status in ("blocked", "quarantined") and t.risk_score >= 55:
            what = next((a for a in t.actions if a.kind in ("block_ip", "quarantine_device")), None)
            label = f"{what.label} · {what.target}" if what else "Containment applied"
            events.append(response_event(t, "Mitigation executed", f"{label} · {t.response_time_ms} ms", ts + t.response_time_ms))
        if t.status in ("monitoring", "investigating"):
            title = "Investigation opened" if t.status == "investigating" else "Enhanced monitoring enabled"
            events.append(response_event(t, title, f"{t.source_label} · {t.name}", ts + 120))
    events += [
        system_event("Threat-intel feed synchronized", "Simulated feed · 14 new indicators", now - 20 * 60_000, "intel"),
        system_event("Anomaly baseline refreshed", "Isolation Forest baseline updated for 3 segments", now - 45 * 60_000),
        system_event("Federated round 27 aggregated", "Global model updated from 3 clients · 0 GB raw traffic shared", now - 2 * HOUR),
        system_event("Firewall policy audit passed", "FW-01 ruleset verified · 0 conflicts", now - 4 * HOUR),
    ]
    return sorted(events, key=lambda e: parse_iso(e.timestamp), reverse=True)
