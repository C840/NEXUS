"""Metric formulas — docs/SIMULATED_DATASET.md §5."""

from __future__ import annotations

from app.schemas import DashboardMetrics, DefenseSettings, Device, ScoreComponent, SecurityScore, SystemStatus, Threat

from .rng import js_round, parse_iso

ACTIVE_STATUSES = frozenset({"detected", "awaiting_approval", "mitigating", "monitoring", "investigating"})
CONTAINED_STATUSES = frozenset({"blocked", "quarantined", "resolved"})

DAY = 86_400_000
SCORE_24H_AGO = 92


def is_active(t: Threat) -> bool:
    return t.status in ACTIVE_STATUSES


def is_contained(t: Threat) -> bool:
    return t.status in CONTAINED_STATUSES


def device_security(devices: list[Device]) -> int:
    def count(status: str) -> int:
        return sum(1 for d in devices if d.status == status)

    value = 100 - 3.7 * count("suspicious") - 12 * count("compromised") - 2 * count("quarantined")
    return max(0, min(100, js_round(value)))


def security_score(devices: list[Device], settings: DefenseSettings, network_health: float) -> SecurityScore:
    components = [
        ScoreComponent(key="threat_detection", label="Threat Detection", value=96, weight=0.25),
        ScoreComponent(key="network_health", label="Network Health", value=js_round(network_health), weight=0.2),
        ScoreComponent(key="device_security", label="Device Security", value=device_security(devices), weight=0.25),
        ScoreComponent(key="response_readiness", label="Response Readiness", value=95 if settings.autonomous_mode else 82, weight=0.2),
        ScoreComponent(key="privacy", label="Privacy", value=95, weight=0.1),
    ]
    score = js_round(sum(c.value * c.weight for c in components))
    return SecurityScore(score=score, components=components, delta24h=score - SCORE_24H_AGO)


def system_status(active: list[Threat]) -> SystemStatus:
    if any(t.severity == "critical" for t in active):
        return "under_attack"
    if any(t.risk_score >= 70 for t in active):
        return "elevated"
    return "operational"


def compute_metrics(threats: list[Threat], devices: list[Device], settings: DefenseSettings, network_health: float, now: int) -> tuple[DashboardMetrics, SecurityScore, SystemStatus]:
    active = [t for t in threats if is_active(t)]
    contained_24h = [t for t in threats if is_contained(t) and parse_iso(t.timestamp) >= now - DAY]
    timed = [t.response_time_ms for t in contained_24h if t.response_time_ms is not None]
    avg = js_round(sum(timed) / len(timed)) if timed else 0
    score = security_score(devices, settings, network_health)
    metrics = DashboardMetrics(
        security_score=score.score,
        active_threats=len(active),
        threats_blocked=len(contained_24h),
        devices_protected=len(devices),
        network_health=js_round(network_health * 10) / 10,
        avg_response_ms=avg,
    )
    return metrics, score, system_status(active)
