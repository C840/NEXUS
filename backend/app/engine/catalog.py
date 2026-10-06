"""
Attack catalogue — per-type knowledge used to synthesize consistent threats:
feature attributions, explanations that quote those features, response
playbooks, timelines and replays (docs/SIMULATED_DATASET.md).

In a real deployment the features come from flow extraction, the attributions
from SHAP over the trained classifier, and the explanation from a template (or
an LLM) grounded in those attributions — the shapes stay the same.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Literal, Optional

from app.schemas import (
    AttackType,
    DetectionSource,
    FeatureContribution,
    IncidentReplay,
    MitreTechnique,
    ReplayFrame,
    ReplayMarker,
    ResponseAction,
    ResponseActionKind,
    ThreatStatus,
    TimelineKind,
    TimelineStep,
)

from .rng import Random, clamp, iso, js_round, round1

Outcome = Literal["blocked", "quarantined", "monitoring", "investigating", "resolved", "dismissed", "awaiting_approval"]

OUTCOME_STATUS: dict[str, ThreatStatus] = {
    "blocked": "blocked",
    "quarantined": "quarantined",
    "monitoring": "monitoring",
    "investigating": "investigating",
    "resolved": "resolved",
    "dismissed": "dismissed",
    "awaiting_approval": "awaiting_approval",
}

CONTAINED: frozenset[str] = frozenset({"blocked", "quarantined", "resolved"})


@dataclass
class Party:
    ip: str
    label: str
    internal: bool
    device_id: Optional[str] = None


@dataclass(frozen=True)
class AttackInfo:
    name: str
    detected_by: tuple[DetectionSource, ...]
    signal_label: str
    lead_ms: tuple[int, int, int]
    mitre: Optional[MitreTechnique] = None


ATTACK_INFO: dict[str, AttackInfo] = {
    "ddos": AttackInfo("DDoS Attack", ("anomaly", "classifier", "threat_intel"), "Volumetric surge", (8000, 5000, 2500), MitreTechnique(id="T1498", name="Network Denial of Service", tactic="Impact")),
    "port_scan": AttackInfo("Port Scan", ("signature", "classifier"), "Unusual port activity", (12000, 7000, 3000), MitreTechnique(id="T1046", name="Network Service Discovery", tactic="Discovery")),
    "brute_force": AttackInfo("Brute Force", ("classifier", "signature"), "Repeated authentication failures", (240000, 120000, 30000), MitreTechnique(id="T1110.001", name="Brute Force: Password Guessing", tactic="Credential Access")),
    "dns_anomaly": AttackInfo("DNS Anomaly", ("anomaly", "classifier"), "Abnormal DNS query pattern", (600000, 240000, 60000), MitreTechnique(id="T1071.004", name="Application Layer Protocol: DNS", tactic="Command and Control")),
    "malware": AttackInfo("Malware Behavior", ("anomaly", "classifier"), "Periodic beaconing", (1800000, 900000, 300000), MitreTechnique(id="T1071", name="Application Layer Protocol", tactic="Command and Control")),
    "unknown_anomaly": AttackInfo("Unknown Anomaly", ("anomaly",), "Baseline deviation", (2400000, 1200000, 300000)),
}

MODEL_LABELS = {
    "classifier": "XGBoost classifier (simulated)",
    "anomaly_detector": "Isolation Forest (simulated)",
    "explainer": "SHAP TreeExplainer (simulated)",
}


# ------------------------------------------------------------------ formatting

def fmt_int(n: float) -> str:
    return f"{js_round(n):,}"


def pct(x: float) -> str:
    return f"{js_round(x * 100)}%"


def feature(key: str, label: str, contribution: float, observed: str, baseline: str) -> FeatureContribution:
    return FeatureContribution(key=key, label=label, contribution=js_round(contribution * 100) / 100, observed=observed, baseline=baseline)


def sort_features(features: list[FeatureContribution]) -> list[FeatureContribution]:
    return sorted(features, key=lambda f: -abs(f.contribution))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


# ------------------------------------------------------------------ feature generators

@dataclass
class GenInput:
    rng: Random
    intensity: float
    source: Party
    target: Party
    listed: bool
    outcome: Outcome
    baseline_pps: int
    service: Optional[str] = None


@dataclass
class TrafficSignature:
    peak_multiplier: float
    duration_sec: float
    packet_bytes: int


@dataclass
class FeatureSet:
    features: list[FeatureContribution]
    explanation: str
    signal: str
    traffic: Optional[TrafficSignature] = None


def _outcome_sentence(g: GenInput) -> str:
    return {
        "blocked": " The source IP was blocked automatically.",
        "quarantined": f" Risk exceeded the quarantine threshold, so NEXUS isolated {g.source.label}.",
        "resolved": " NEXUS monitored the activity until it ended; no containment was required.",
        "dismissed": " An analyst later reviewed the detection and marked it as a false positive.",
    }.get(g.outcome, "")


def _gen_port_scan(g: GenInput) -> FeatureSet:
    rng, i = g.rng, g.intensity
    window = rng.pick([15, 20, 30, 45, 60])
    ports = js_round(lerp(60, 1400, i) * rng.float(0.85, 1.15))
    rate = ports / window
    syn = rng.float(0.88, 0.99)
    sequential = rng.chance(0.6)
    features = [
        feature("port_diversity", "Port Diversity", 0.15 + 0.15 * i, f"{fmt_int(ports)} ports / {window} s", "≤ 6 ports / 30 s"),
        feature("connection_rate", "Connection Rate", 0.1 + 0.1 * i, f"{rate:.1f} conn/s", "≈ 0.5 conn/s"),
        feature("syn_ratio", "SYN Ratio", 0.07 + 0.08 * i, f"{syn:.2f} SYN-only", "≈ 0.08"),
        feature("probe_sequencing", "Probe Sequencing", 0.04 + 0.03 * i if sequential else 0.01, "sequential port order" if sequential else "randomized port order", "no probing"),
        feature("source_reputation", "Source Reputation", 0.04 + 0.03 * i if g.listed else -0.02, "listed: mass scanner" if g.listed else "not listed", "not listed"),
    ]
    explanation = (
        f"NEXUS classified this traffic as a port scan: {g.source.ip} probed {fmt_int(ports)} destination ports on {g.target.label} "
        f"within {window} seconds — far above the normal of 6 or fewer — and {pct(syn)} of its connection attempts never completed the TCP handshake."
        + (" The source also appears in the threat-intelligence feed as a mass scanner." if g.listed else "")
        + _outcome_sentence(g)
    )
    return FeatureSet(sort_features(features), explanation, f"{fmt_int(ports)} destination ports probed in {window} s", TrafficSignature(1.12 + 0.5 * i, window, 60))


def _gen_brute_force(g: GenInput) -> FeatureSet:
    rng, i = g.rng, g.intensity
    failures = js_round(lerp(40, 600, i) * rng.float(0.85, 1.15))
    users = js_round(lerp(3, 80, i) * rng.float(0.8, 1.2))
    cadence = rng.float(0.4, 2.5)
    sessions = (failures / 300) * 1.15
    service = g.service or "SSH"
    features = [
        feature("failed_auth_rate", "Failed Auth Rate", 0.15 + 0.15 * i, f"{fmt_int(failures)} failures / 5 min", "≈ 3 / 5 min"),
        feature("username_diversity", "Username Diversity", 0.07 + 0.1 * i, f"{users} distinct usernames", "≈ 2"),
        feature("connection_rate", "Connection Rate", 0.05 + 0.06 * i, f"{sessions:.1f} sessions / s", "≈ 0.02 / s"),
        feature("source_reputation", "Source Reputation", 0.05 + 0.04 * i if g.listed else -0.01, "listed: credential attacker" if g.listed else "not listed", "not listed"),
        feature("attempt_cadence", "Attempt Cadence", 0.03 + 0.03 * i, f"regular {cadence:.1f} s interval", "human-irregular"),
    ]
    explanation = (
        f"NEXUS detected a password-guessing attack against {g.target.label}'s {service} service: {fmt_int(failures)} failed logins in five minutes "
        f"across {users} different usernames at a machine-regular {cadence:.1f}-second cadence."
        + (" The source is listed in the threat-intelligence feed for credential attacks." if g.listed else "")
        + _outcome_sentence(g)
    )
    return FeatureSet(sort_features(features), explanation, f"{fmt_int(failures)} failed {service} logins in 5 min", TrafficSignature(1.04 + 0.12 * i, 300, 140))


def _gen_ddos(g: GenInput) -> FeatureSet:
    rng, i = g.rng, g.intensity
    pps = js_round(lerp(52000, 196000, i) * rng.float(0.92, 1.08))
    sources = js_round(lerp(220, 2100, i) * rng.float(0.85, 1.15))
    udp = rng.float(0.78, 0.95)
    size = rng.int(64, 118)
    ratio = pps / g.baseline_pps
    features = [
        feature("inbound_packet_rate", "Inbound Packet Rate", 0.22 + 0.12 * i, f"{fmt_int(pps)} pps", f"≈ {fmt_int(g.baseline_pps)} pps"),
        feature("source_ip_entropy", "Source IP Entropy", 0.13 + 0.09 * i, f"{fmt_int(sources)} unique sources", "≈ 40 sources"),
        feature("udp_share", "UDP Share", 0.08 + 0.07 * i, f"{pct(udp)} of packets", "≈ 21%"),
        feature("mean_packet_size", "Mean Packet Size", 0.05 + 0.04 * i, f"{size} bytes", "≈ 610 bytes"),
        feature("threat_intel_match", "Threat Intel Match", 0.07 if g.listed else -0.01, "Botnet indicator match" if g.listed else "No match", "No match"),
    ]
    explanation = (
        f"NEXUS classified this traffic as a volumetric DDoS attack: inbound packets to {g.target.label} rose to {fmt_int(pps)} per second — "
        f"about {js_round(ratio)}× the learned baseline — from {fmt_int(sources)} distinct sources; {pct(udp)} of the packets were UDP with an average size of {size} bytes."
        + (" The dominant source range matches a botnet indicator in the threat-intelligence feed." if g.listed else "")
        + _outcome_sentence(g)
    )
    return FeatureSet(sort_features(features), explanation, f"Inbound rate {fmt_int(pps)} pps ({js_round(ratio)}× baseline)", TrafficSignature(ratio, 18, size))


def _gen_dns(g: GenInput) -> FeatureSet:
    rng, i = g.rng, g.intensity
    entropy = lerp(3.8, 4.8, i) + rng.float(-0.1, 0.1)
    rate = js_round(lerp(16, 60, i) * rng.float(0.85, 1.15))
    nx = lerp(0.06, 0.3, i) * rng.float(0.85, 1.15)
    sub = js_round(lerp(24, 48, i))
    txt = lerp(0.02, 0.12, i)
    features = [
        feature("query_entropy", "Query Name Entropy", 0.12 + 0.1 * i, f"{entropy:.1f} bits/char", "≈ 3.1 bits/char"),
        feature("query_rate", "Query Rate", 0.08 + 0.07 * i, f"{rate} queries/min", "≈ 6 queries/min"),
        feature("nxdomain_ratio", "NXDOMAIN Ratio", 0.05 + 0.05 * i, pct(nx), "< 2%"),
        feature("subdomain_length", "Subdomain Length", 0.03 + 0.04 * i, f"{sub} chars avg", "≈ 14 chars"),
        feature("txt_share", "TXT Record Share", 0.01 + 0.03 * i, f"{pct(txt)} of queries", "< 1%"),
    ]
    explanation = (
        f"NEXUS flagged {g.source.label} for anomalous DNS behavior: query names with unusually high entropy ({entropy:.1f} bits/char vs ≈3.1) "
        f"at {rate} queries per minute, a {pct(nx)} NXDOMAIN ratio and long, random-looking subdomains — a pattern consistent with DNS tunnelling or a domain-generation algorithm."
        + _outcome_sentence(g)
    )
    return FeatureSet(sort_features(features), explanation, f"{rate} high-entropy queries/min")


def _gen_malware(g: GenInput) -> FeatureSet:
    rng, i = g.rng, g.intensity
    period = rng.pick([30, 60, 120, 300])
    jitter = rng.float(0.2, 1.5)
    ratio = lerp(2.5, 8, i)
    payload = rng.pick([256, 384, 512, 1024])
    features = [
        feature("beacon_periodicity", "Beacon Periodicity", 0.12 + 0.1 * i, f"every {period:.1f} s (±{jitter:.1f} s)", "irregular"),
        feature("destination_rarity", "Destination Rarity", 0.08 + 0.07 * i, "first seen on network", "known vendor hosts"),
        feature("out_in_ratio", "Outbound / Inbound Ratio", 0.05 + 0.05 * i, f"{ratio:.1f} : 1", "≈ 0.4 : 1"),
        feature("payload_uniformity", "Payload Size Uniformity", 0.03 + 0.03 * i, f"{payload} B ± 3 B", "variable"),
        feature("tls_no_sni", "TLS without SNI", 0.02 + 0.02 * i, "100% of sessions", "SNI present"),
    ]
    explanation = (
        f"{g.source.label} contacted a host never before seen on this network at a near-perfect {period}-second interval with uniform {payload}-byte payloads, "
        f"sending about {js_round(ratio)}× more data than it received. This periodic beaconing is characteristic of command-and-control traffic."
        + _outcome_sentence(g)
    )
    return FeatureSet(sort_features(features), explanation, f"Beacon every {period} s to a first-seen host")


def _gen_unknown(g: GenInput) -> FeatureSet:
    rng, i = g.rng, g.intensity
    gb = lerp(1.2, 6.5, i) * rng.float(0.9, 1.1)
    minutes = rng.int(12, 55)
    port = rng.pick([8443, 2222, 9001, 4443])
    ratio = gb / 0.6
    features = [
        feature("outbound_volume", "Outbound Volume", 0.08 + 0.06 * i, f"{gb:.1f} GB in {minutes} min", "≈ 0.6 GB / night"),
        feature("destination_port", "Destination Port", 0.03 + 0.04 * i, f"TCP/{port}", "TCP/443"),
        feature("session_duration", "Session Duration", 0.03 + 0.03 * i, f"{minutes} min single session", "< 5 min"),
        feature("schedule_deviation", "Schedule Deviation", 0.02 + 0.03 * i, "outside usual window", "business-hours pattern"),
    ]
    explanation = (
        f"The anomaly detector flagged a {gb:.1f} GB outbound transfer from {g.source.label} in a single {minutes}-minute session to an unfamiliar endpoint on TCP/{port} — "
        f"about {js_round(ratio)}× its usual volume. No supervised attack class matched with high confidence, so NEXUS labelled it an unknown anomaly."
        + _outcome_sentence(g)
    )
    return FeatureSet(sort_features(features), explanation, f"{gb:.1f} GB outbound on TCP/{port}", TrafficSignature(1.06, minutes * 60, 1400))


FEATURE_GENERATORS: dict[str, Callable[[GenInput], FeatureSet]] = {
    "ddos": _gen_ddos,
    "port_scan": _gen_port_scan,
    "brute_force": _gen_brute_force,
    "dns_anomaly": _gen_dns,
    "malware": _gen_malware,
    "unknown_anomaly": _gen_unknown,
}


# ------------------------------------------------------------------ risk factors

FactorValues = tuple[float, float, float, float]

# Factor ranges at intensity 0 → 1: detection confidence, anomaly, behavioral, intel (listed / unlisted).
FACTOR_PROFILE: dict[str, dict[str, tuple[float, float]]] = {
    "port_scan": {"conf": (82, 97), "anomaly": (16, 78), "behavioral": (4, 45), "listed": (20, 72), "unlisted": (2, 12)},
    "brute_force": {"conf": (84, 97), "anomaly": (20, 80), "behavioral": (8, 80), "listed": (26, 85), "unlisted": (2, 14)},
    "ddos": {"conf": (94, 99), "anomaly": (88, 99), "behavioral": (70, 92), "listed": (70, 96), "unlisted": (20, 35)},
    "dns_anomaly": {"conf": (70, 90), "anomaly": (45, 80), "behavioral": (15, 60), "listed": (20, 50), "unlisted": (3, 15)},
    "malware": {"conf": (64, 90), "anomaly": (50, 90), "behavioral": (30, 90), "listed": (30, 80), "unlisted": (5, 25)},
    "unknown_anomaly": {"conf": (45, 70), "anomaly": (45, 85), "behavioral": (5, 50), "listed": (5, 20), "unlisted": (2, 10)},
}


def generate_factors(attack: AttackType, intensity: float, listed: bool, rng: Random) -> FactorValues:
    p = FACTOR_PROFILE[attack]

    def v(rng_pair: tuple[float, float]) -> float:
        return clamp(lerp(rng_pair[0], rng_pair[1], intensity) + rng.float(-3, 3), 1, 99.5)

    return (round1(v(p["conf"])), float(js_round(v(p["anomaly"]))), float(js_round(v(p["behavioral"]))), float(js_round(v(p["listed" if listed else "unlisted"]))))


def risk_from_factors(f: FactorValues) -> int:
    """Risk engine: four equal-weight factors."""
    return js_round((f[0] + f[1] + f[2] + f[3]) / 4)


# ------------------------------------------------------------------ response playbooks

@dataclass
class PlaybookInput:
    attack: AttackType
    source: Party
    target: Party
    outcome: Outcome
    timestamp: int
    response_time_ms: Optional[int]
    rule_no: int
    risk: int


@dataclass
class _Planned:
    kind: ResponseActionKind
    label: str
    target: str
    detail: Optional[str] = None


def build_actions(p: PlaybookInput, id_prefix: str) -> list[ResponseAction]:
    notify = _Planned("notify_admin", "Administrator notified", "SOC on-call")
    firewall = _Planned("update_firewall", "Firewall rule updated", f"FW-01 rule #{p.rule_no}")
    pending = False

    if p.outcome == "blocked":
        if p.attack == "ddos":
            planned = [
                _Planned("rate_limit", "Edge rate limiting applied", f"{p.target.label} · UDP"),
                _Planned("block_ip", "Source range blocked", f"{p.source.ip}/16"),
                firewall,
            ]
        else:
            planned = [_Planned("block_ip", "Source IP blocked", p.source.ip), firewall]
        if p.risk >= 40:
            planned.append(notify)
    elif p.outcome in ("quarantined", "awaiting_approval"):
        if p.source.internal:
            planned = [
                _Planned("block_ip", "Source IP blocked", p.source.ip),
                _Planned("quarantine_device", "Device quarantined", p.source.label),
                firewall,
                notify,
            ]
        else:
            planned = [_Planned("block_ip", "Source IP blocked", p.source.ip), firewall, notify]
        pending = p.outcome == "awaiting_approval"
    elif p.outcome in ("monitoring", "investigating", "resolved"):
        host = p.source.label if p.source.internal else p.target.label
        planned = [
            _Planned("increase_monitoring", "Enhanced monitoring enabled", host),
            _Planned("capture_pcap", "Packet capture started", host),
            notify,
        ]
    else:  # dismissed
        planned = [_Planned("increase_monitoring", "Flagged for analyst review", p.source.label if p.source.internal else p.source.ip)]

    total = p.response_time_ms if p.response_time_ms is not None else 90
    actions: list[ResponseAction] = []
    for idx, a in enumerate(planned):
        at = p.timestamp + js_round((total * (idx + 1)) / len(planned))
        status = "pending" if pending and a.kind != "notify_admin" else "done"
        actions.append(
            ResponseAction(
                id=f"{id_prefix}-a{idx + 1}",
                kind=a.kind,
                label=a.label,
                target=a.target,
                status=status,
                timestamp=iso(at) if status == "done" else None,
                detail="Recommended — awaiting administrator approval" if status == "pending" else a.detail,
            )
        )
    return actions


# ------------------------------------------------------------------ timeline

_OUTCOME_STEP: dict[str, tuple[str, TimelineKind]] = {
    "blocked": ("Source IP blocked", "response"),
    "quarantined": ("Device quarantined", "response"),
    "monitoring": ("Placed under monitoring", "response"),
    "investigating": ("Investigation opened", "response"),
    "resolved": ("Monitored to resolution", "response"),
    "dismissed": ("Marked false positive", "analysis"),
    "awaiting_approval": ("Awaiting administrator approval", "response"),
}


@dataclass
class TimelineInput:
    attack: AttackType
    timestamp: int
    source: Party
    target: Party
    confidence: float
    risk_score: int
    risk_level: str
    anomaly_score: float
    signal: str
    outcome: Outcome
    response_time_ms: Optional[int]
    auto_threshold: int


def build_timeline(p: TimelineInput, info: AttackInfo) -> list[TimelineStep]:
    l_normal, l_anomaly, l_signal = info.lead_ms
    t0 = p.timestamp - l_normal
    decide = p.response_time_ms if p.response_time_ms is not None else 92
    outcome_label, outcome_kind = _OUTCOME_STEP[p.outcome]
    detector = "Isolation Forest anomaly detector" if p.attack == "unknown_anomaly" else "XGBoost classifier"
    rt = p.response_time_ms if p.response_time_ms is not None else "—"
    outcome_detail = {
        "blocked": f"{'Source range' if p.attack == 'ddos' else 'Source IP'} blocked at FW-01 in {rt} ms.",
        "quarantined": f"{p.source.label} isolated from the network in {rt} ms.",
        "monitoring": f"Risk below the containment threshold ({p.auto_threshold}) — enhanced monitoring enabled.",
        "investigating": "Investigation opened; quarantine recommended for analyst review.",
        "resolved": "Activity monitored until it ended; no containment required.",
        "dismissed": "Analyst review classified the detection as benign.",
        "awaiting_approval": "Containment queued — waiting for administrator approval.",
    }[p.outcome]
    normal_detail = (
        f"Traffic from {p.source.label} within its learned baseline." if p.source.internal else f"Traffic to {p.target.label} within its learned baseline."
    )
    above = "above" if p.risk_score >= p.auto_threshold else "below"
    classification = f"Classified as {info.name} · MITRE ATT&CK {info.mitre.id}." if info.mitre else "No known attack class matched — labelled Unknown Anomaly."

    drafts: list[tuple[str, str, str, TimelineKind, int]] = [
        ("normal", "Normal traffic", normal_detail, "normal", t0),
        ("anomaly", "Traffic anomaly", f"Anomaly score rose to {p.anomaly_score:.2f} (threshold 0.72).", "anomaly", p.timestamp - l_anomaly),
        ("signal", info.signal_label, p.signal, "anomaly", p.timestamp - l_signal),
        ("detection", "AI detection", f"{detector} flagged the flow window — confidence {p.confidence:.1f}%.", "detection", p.timestamp),
        ("classification", "Threat classification", classification, "analysis", p.timestamp + js_round(decide * 0.28)),
        ("risk", "Risk assessment", f"Risk {p.risk_score}/100 ({p.risk_level}) — {above} the auto-response threshold ({p.auto_threshold}).", "analysis", p.timestamp + js_round(decide * 0.46)),
        ("outcome", outcome_label, outcome_detail, outcome_kind, p.timestamp + decide),
    ]
    if p.outcome in ("blocked", "quarantined"):
        drafts.append(("recovery", "Network recovered", "Traffic returned to its baseline.", "recovery", p.timestamp + decide + 8000))
    return [TimelineStep(key=k, label=lbl, detail=d, kind=kind, timestamp=iso(at), offset_ms=at - t0) for k, lbl, d, kind, at in drafts]


# ------------------------------------------------------------------ replay

def _smooth(t: float) -> float:
    return t * t * (3 - 2 * t)


@dataclass
class ReplayInput:
    risk_score: int
    risk_level: str
    anomaly_peak: float
    baseline_pps: float
    peak_multiplier: float
    outcome: Outcome
    seed: int = 0
    markers: list[ReplayMarker] = field(default_factory=list)


def build_replay(p: ReplayInput) -> IncidentReplay:
    """25-second incident replay — time-scaled for clarity; the real latency is the response time."""
    frames: list[ReplayFrame] = []
    base = p.baseline_pps
    peak = base * p.peak_multiplier
    for step in range(51):
        t = step / 2
        wobble = 1 + math.sin(step * 1.7 + p.seed) * 0.006
        if 5 <= t < 11:
            pps = base + (peak - base) * _smooth((t - 5) / 6)
        elif 11 <= t < 17:
            pps = peak * (1 + math.sin(step * 2.3) * 0.006)
        elif 17 <= t < 20:
            pps = peak + (base * 1.2 - peak) * _smooth((t - 17) / 3)
        elif t >= 20:
            pps = base * 1.2 + (base - base * 1.2) * _smooth(min(1.0, (t - 20) / 5))
        else:
            pps = base

        if 5 <= t < 10:
            anomaly = 0.08 + (p.anomaly_peak - 0.08) * _smooth((t - 5) / 5)
        elif 10 <= t < 17:
            anomaly = p.anomaly_peak
        elif t >= 17:
            anomaly = p.anomaly_peak + (0.12 - p.anomaly_peak) * _smooth(min(1.0, (t - 17) / 8))
        else:
            anomaly = 0.08

        if 10 <= t < 14:
            risk = 4 + (p.risk_score - 4) * _smooth((t - 10) / 4)
        elif t >= 14:
            risk = p.risk_score
        else:
            risk = 4

        frames.append(ReplayFrame(t=t, pps=js_round(pps * wobble), baseline_pps=js_round(base), anomaly_score=js_round(anomaly * 100) / 100, risk=js_round(risk)))

    contained = "Device quarantined" if p.outcome == "quarantined" else "Threat blocked"
    markers = [
        ReplayMarker(t=0, label="Normal", kind="normal"),
        ReplayMarker(t=5, label="Anomaly begins", kind="anomaly"),
        ReplayMarker(t=10, label="Detection", kind="detection"),
        ReplayMarker(t=12, label="Threat classified", kind="analysis"),
        ReplayMarker(t=14, label=f"Risk reaches {p.risk_level}", kind="analysis"),
        ReplayMarker(t=15, label="Response initiated", kind="response"),
        ReplayMarker(t=17, label=contained, kind="response"),
        ReplayMarker(t=25, label="Network recovered", kind="recovery"),
    ]
    return IncidentReplay(duration_sec=25, frames=frames, markers=markers)
