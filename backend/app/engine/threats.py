"""Threat records: featured incidents (§3), generated 30-day history (§4), detail builders."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional

from app.schemas import (
    AttackType,
    DefenseSettings,
    Device,
    FeatureContribution,
    ModelLabels,
    ResponseAction,
    ResponseActionKind,
    ResponseExecution,
    ResponseMode,
    ResponsePhase,
    RiskFactor,
    Severity,
    Threat,
    ThreatDetail,
    ThreatIntel,
)

from .catalog import (
    ATTACK_INFO,
    CONTAINED,
    FEATURE_GENERATORS,
    MODEL_LABELS,
    OUTCOME_STATUS,
    FactorValues,
    GenInput,
    Outcome,
    Party,
    PlaybookInput,
    ReplayInput,
    TimelineInput,
    TrafficSignature,
    build_actions,
    build_replay,
    build_timeline,
    feature,
    generate_factors,
    risk_from_factors,
)
from .rng import Random, clamp, iso, js_round, local, parse_iso
from .sources import RARE_HOSTS, device_party, external_party, pick_external
from .traffic import TrafficOverlay, baseline_pps

MIN = 60_000
HOUR = 60 * MIN
DAY = 24 * HOUR

CONTAINED_24H_TARGET = 127
AVG_RESPONSE_TARGET = 142


def level_of(score: float) -> Severity:
    if score >= 90:
        return "critical"
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


@dataclass
class RecordSpec:
    """Everything needed to materialize one threat."""

    attack: AttackType
    timestamp: int
    source: Party
    target: Party
    factors: FactorValues
    features: list[FeatureContribution]
    explanation: str
    signal: str
    outcome: Outcome
    response_time_ms: Optional[int]
    rule_no: int
    related_event_count: int
    mode: ResponseMode
    actions: Optional[list[ResponseAction]] = None
    intel: Optional[ThreatIntel] = None
    traffic: Optional[TrafficSignature] = None
    detected_by: Optional[tuple[str, ...]] = None
    # Traffic overlay pinned to an absolute peak (featured DDoS).
    peak_pps: Optional[int] = None


@dataclass
class ThreatRecord:
    """Backend-side threat: the public Threat plus what's needed to rebuild its detail."""

    threat: Threat
    factors: FactorValues
    signal: str
    outcome: Outcome
    mode: ResponseMode
    source: Party
    target: Party
    replay_baseline_pps: float
    replay_peak_multiplier: float
    intel: Optional[ThreatIntel] = None
    overlay: Optional[TrafficOverlay] = None
    decided_by: Optional[Literal["administrator"]] = None
    extra: dict[str, object] = field(default_factory=dict)


# ------------------------------------------------------------------ featured threats (§3)

ActionRow = tuple[ResponseActionKind, str, str, Literal["done", "pending"], Optional[str]]


def explicit_actions(prefix: str, timestamp: int, total_ms: int, rows: list[ActionRow]) -> list[ResponseAction]:
    return [
        ResponseAction(
            id=f"{prefix}-a{i + 1}",
            kind=kind,
            label=label,
            target=target,
            status=status,
            detail=detail,
            timestamp=iso(timestamp + js_round((total_ms * (i + 1)) / len(rows))) if status == "done" else None,
        )
        for i, (kind, label, target, status, detail) in enumerate(rows)
    ]


def make_intel(ip: str, reputation: str, threat_type: str, confidence: float, first: int, last: int, related: int, tags: list[str]) -> ThreatIntel:
    return ThreatIntel(
        ip=ip,
        reputation=reputation,  # type: ignore[arg-type]
        threat_type=threat_type,
        confidence=confidence,
        first_observed=iso(first),
        last_observed=iso(last),
        related_events=related,
        tags=tags,
        source="NEXUS simulated threat-intel feed",
    )


def featured_specs(now: int, devices: list[Device]) -> list[RecordSpec]:
    by_id = {d.id: d for d in devices}
    pc03, server01, server02, server03, iot04, fw01 = (by_id[k] for k in ("pc-03", "server-01", "server-02", "server-03", "iot-04", "fw-01"))

    t_a = now - 280_000
    t_b = now - 243_000
    t_c = now - 19 * MIN
    t_d = now - 52 * MIN
    t_e = now - 38 * MIN
    t_f = now - (2 * HOUR + 11 * MIN)
    soc = "SOC on-call"

    return [
        RecordSpec(
            attack="dns_anomaly",
            timestamp=t_a,
            source=device_party(pc03),
            target=Party(ip="192.168.1.8", label="DNS-01 → external resolvers", internal=True),
            factors=(81.2, 62, 34, 11),
            features=[
                feature("query_entropy", "Query Name Entropy", 0.21, "4.6 bits/char", "≈ 3.1 bits/char"),
                feature("query_rate", "Query Rate", 0.14, "38 queries/min", "≈ 6 queries/min"),
                feature("nxdomain_ratio", "NXDOMAIN Ratio", 0.09, "22%", "< 2%"),
                feature("subdomain_length", "Subdomain Length", 0.06, "41 chars avg", "≈ 14 chars"),
                feature("txt_share", "TXT Record Share", 0.03, "9% of queries", "< 1%"),
            ],
            explanation=(
                "NEXUS flagged PC-03 for anomalous DNS behavior: its queries show unusually high name entropy (4.6 bits/char vs ≈3.1) at roughly six times "
                "its normal query rate, with a 22% NXDOMAIN ratio and long, random-looking subdomains. This pattern is consistent with DNS tunnelling or a "
                "domain-generation algorithm. The risk score (47) is below the autonomous containment threshold (70), so NEXUS is monitoring the host rather than isolating it."
            ),
            signal="38 high-entropy queries/min, 22% NXDOMAIN",
            outcome="monitoring",
            response_time_ms=None,
            rule_no=0,
            related_event_count=4,
            mode="autonomous",
            actions=explicit_actions("f-dns", t_a, 96, [
                ("increase_monitoring", "Enhanced DNS logging enabled", "PC-03", "done", None),
                ("capture_pcap", "Packet capture started", "PC-03 · UDP/53", "done", None),
                ("notify_admin", "Administrator notified", soc, "done", None),
            ]),
        ),
        RecordSpec(
            attack="ddos",
            timestamp=t_b,
            source=Party(ip="185.23.xx.xx", label="External · Botnet (1,284 hosts)", internal=False),
            target=device_party(server01, "Server-01 · Web"),
            factors=(98.1, 97, 88, 93),
            features=[
                feature("inbound_packet_rate", "Inbound Packet Rate", 0.34, "182,400 pps", "≈ 13,200 pps"),
                feature("source_ip_entropy", "Source IP Entropy", 0.22, "1,284 unique sources", "≈ 40 sources"),
                feature("udp_share", "UDP Share", 0.15, "93% of packets", "≈ 21%"),
                feature("mean_packet_size", "Mean Packet Size", 0.09, "74 bytes", "≈ 610 bytes"),
                feature("threat_intel_match", "Threat Intel Match", 0.07, "Botnet indicator match", "No match"),
            ],
            explanation=(
                "NEXUS classified this traffic as a volumetric DDoS attack: inbound packets to Server-01 rose to 182,400 per second — nearly 14× the learned "
                "baseline — from 1,284 distinct sources. 93% of the packets were UDP with an average size of only 74 bytes, and the dominant source range "
                "matches a botnet indicator in the threat-intelligence feed."
            ),
            signal="Inbound rate 182,400 pps (≈14× baseline)",
            outcome="blocked",
            response_time_ms=118,
            rule_no=4127,
            related_event_count=12,
            mode="autonomous",
            actions=explicit_actions("f-ddos", t_b, 118, [
                ("rate_limit", "Edge rate limiting applied", "Server-01 · UDP", "done", None),
                ("block_ip", "Source range blocked", "185.23.xx.xx/16", "done", None),
                ("update_firewall", "Firewall rule updated", "FW-01 rule #4127", "done", None),
                ("notify_admin", "Administrator notified", soc, "done", None),
            ]),
            intel=make_intel("185.23.xx.xx", "malicious", "Botnet", 98, now - 3 * HOUR, t_b, 12, ["botnet", "udp-flood", "mirai-like"]),
            traffic=TrafficSignature(0, 18, 74),
            peak_pps=182_400,
        ),
        RecordSpec(
            attack="malware",
            timestamp=t_c,
            source=device_party(iot04),
            target=Party(ip="103.75.xx.xx", label="Rare external host", internal=False),
            factors=(73.8, 69, 52, 21),
            features=[
                feature("beacon_periodicity", "Beacon Periodicity", 0.19, "every 60.0 s (±0.4 s)", "irregular"),
                feature("destination_rarity", "Destination Rarity", 0.13, "first seen on network", "known vendor hosts"),
                feature("out_in_ratio", "Outbound / Inbound Ratio", 0.08, "6.2 : 1", "≈ 0.4 : 1"),
                feature("payload_uniformity", "Payload Size Uniformity", 0.05, "512 B ± 3 B", "variable"),
                feature("tls_no_sni", "TLS without SNI", 0.03, "100% of sessions", "SNI present"),
            ],
            explanation=(
                "IoT-04 (lobby camera) is contacting a host never before seen on this network at a near-perfect 60-second interval with uniform 512-byte "
                "payloads, and is sending about 6× more data than it receives — the opposite of its normal video-streaming profile. This periodic beaconing is "
                "characteristic of command-and-control traffic. Risk 54 is below the containment threshold, so NEXUS opened an investigation and recommends "
                "quarantine for analyst review."
            ),
            signal="Beacon every 60.0 s to a first-seen host",
            outcome="investigating",
            response_time_ms=None,
            rule_no=0,
            related_event_count=6,
            mode="autonomous",
            actions=explicit_actions("f-mal", t_c, 104, [
                ("increase_monitoring", "Flow logging enabled", "IoT-04", "done", None),
                ("capture_pcap", "Packet capture started", "IoT-04 · TCP/443", "done", None),
                ("notify_admin", "Administrator notified", soc, "done", None),
                ("quarantine_device", "Device quarantine", "IoT-04", "pending", "Recommended — awaiting analyst review"),
            ]),
            intel=make_intel("103.75.xx.xx", "suspicious", "Possible C2 server", 64, now - 59 * MIN, now - MIN, 41, ["c2-candidate", "first-seen", "tls-no-sni"]),
        ),
        RecordSpec(
            attack="unknown_anomaly",
            timestamp=t_d,
            source=device_party(server03),
            target=Party(ip="45.12.xx.xx", label="Unfamiliar storage endpoint", internal=False),
            factors=(58, 52, 9, 5),
            features=[
                feature("outbound_volume", "Outbound Volume", 0.12, "4.8 GB in 38 min", "≈ 0.6 GB / night"),
                feature("destination_port", "Destination Port", 0.06, "TCP/8443", "TCP/443"),
                feature("session_duration", "Session Duration", 0.05, "38 min single session", "< 5 min"),
                feature("schedule_deviation", "Schedule Deviation", 0.04, "outside backup window", "nightly 01:00–02:00"),
            ],
            explanation=(
                "The anomaly detector flagged a 4.8 GB outbound transfer from Server-03 in a single 38-minute session to an unfamiliar endpoint on TCP/8443 — "
                "about 8× its usual nightly volume and outside its scheduled backup window. No supervised attack class matched with high confidence (best match "
                "41%), so NEXUS labelled it an unknown anomaly. Risk 31 is low; the transfer is being monitored."
            ),
            signal="4.8 GB outbound on TCP/8443",
            outcome="monitoring",
            response_time_ms=None,
            rule_no=0,
            related_event_count=2,
            mode="autonomous",
            actions=explicit_actions("f-unk", t_d, 88, [
                ("increase_monitoring", "Transfer monitoring enabled", "Server-03", "done", None),
                ("notify_admin", "Administrator notified", soc, "done", None),
            ]),
            intel=make_intel("45.12.xx.xx", "unknown", "Unclassified storage endpoint", 22, now - 72 * MIN, now - 2 * MIN, 3, ["first-seen", "non-standard-port"]),
            traffic=TrafficSignature(1.06, 38 * 60, 1400),
        ),
        RecordSpec(
            attack="brute_force",
            timestamp=t_e,
            source=Party(ip="45.155.xx.xx", label="External · SSH scanner", internal=False),
            target=device_party(server02, "Server-02 · SSH"),
            factors=(94.7, 72, 76, 69),
            features=[
                feature("failed_auth_rate", "Failed Auth Rate", 0.29, "412 failures / 5 min", "≈ 3 / 5 min"),
                feature("username_diversity", "Username Diversity", 0.17, "58 distinct usernames", "≈ 2"),
                feature("connection_rate", "Connection Rate", 0.11, "1.4 SSH sessions / s", "≈ 0.02 / s"),
                feature("source_reputation", "Source Reputation", 0.08, "listed: SSH scanner", "not listed"),
                feature("attempt_cadence", "Attempt Cadence", 0.05, "regular 0.7 s interval", "human-irregular"),
            ],
            explanation=(
                "NEXUS detected a password-guessing attack against Server-02's SSH service: 412 failed logins in five minutes (about 140× normal) across 58 "
                "different usernames at a machine-regular 0.7-second cadence, from a source listed in the threat-intelligence feed as an SSH scanner. The source "
                "IP was blocked automatically."
            ),
            signal="412 failed SSH logins in 5 min",
            outcome="blocked",
            response_time_ms=156,
            rule_no=4119,
            related_event_count=7,
            mode="autonomous",
            detected_by=("classifier", "signature", "threat_intel"),
            actions=explicit_actions("f-bf", t_e, 156, [
                ("block_ip", "Source IP blocked", "45.155.xx.xx", "done", None),
                ("update_firewall", "Firewall rule updated", "FW-01 rule #4119", "done", None),
                ("notify_admin", "Administrator notified", soc, "done", None),
            ]),
            intel=make_intel("45.155.xx.xx", "malicious", "SSH scanner", 91, now - 26 * HOUR, t_e, 7, ["ssh-bruteforce", "scanner"]),
        ),
        RecordSpec(
            attack="port_scan",
            timestamp=t_f,
            source=Party(ip="91.240.xx.xx", label="External · Scanner", internal=False),
            target=device_party(fw01, "Perimeter (FW-01)"),
            factors=(92.3, 70, 40, 30),
            features=[
                feature("port_diversity", "Port Diversity", 0.27, "1,024 ports / 30 s", "≤ 6 ports / 30 s"),
                feature("connection_rate", "Connection Rate", 0.18, "34 conn/s", "≈ 0.5 conn/s"),
                feature("syn_ratio", "SYN Ratio", 0.12, "0.97 SYN-only", "≈ 0.08"),
                feature("probe_sequencing", "Probe Sequencing", 0.06, "sequential port order", "no probing"),
                feature("source_reputation", "Source Reputation", 0.04, "listed: mass scanner", "not listed"),
            ],
            explanation=(
                "NEXUS classified this traffic as a port scan: 91.240.xx.xx probed 1,024 destination ports on the perimeter firewall within 30 seconds — far "
                "above the normal of 6 or fewer — and 97% of its connection attempts never completed the TCP handshake. The source also appears in the "
                "threat-intelligence feed as a mass scanner. The source IP was blocked automatically."
            ),
            signal="1,024 destination ports probed in 30 s",
            outcome="blocked",
            response_time_ms=97,
            rule_no=4102,
            related_event_count=3,
            mode="autonomous",
            actions=explicit_actions("f-ps", t_f, 97, [
                ("block_ip", "Source IP blocked", "91.240.xx.xx", "done", None),
                ("update_firewall", "Firewall rule updated", "FW-01 rule #4102", "done", None),
                ("notify_admin", "Administrator notified", soc, "done", None),
            ]),
            intel=make_intel("91.240.xx.xx", "malicious", "Mass scanner", 88, now - 9 * DAY, t_f, 23, ["scanner", "tcp-syn"]),
            traffic=TrafficSignature(1.5, 30, 60),
        ),
    ]


# ------------------------------------------------------------------ generated history (§4)

TYPE_MIX: list[tuple[AttackType, float]] = [
    ("port_scan", 55),
    ("brute_force", 25),
    ("ddos", 3),
    ("dns_anomaly", 6),
    ("malware", 4),
    ("unknown_anomaly", 7),
]
NON_VOLUMETRIC: tuple[AttackType, ...] = ("port_scan", "brute_force", "dns_anomaly", "malware", "unknown_anomaly")
BRUTE_TARGETS = [("server-02", "Server-02 · SSH", "SSH", 35), ("fw-01", "FW-01 · VPN portal", "VPN", 25), ("mail-01", "MAIL-01 · SMTP", "SMTP AUTH", 25), ("server-01", "Server-01 · SSH", "SSH", 15)]
PORT_SCAN_TARGETS = [("fw-01", "Perimeter (FW-01)", 70), ("server-01", "Server-01 · Web", 20), ("mail-01", "MAIL-01 · Mail", 10)]


def generate_spec(
    rng: Random,
    timestamp: int,
    devices: list[Device],
    dismiss_probability: float,
    outcome_kind: Optional[Literal["contained", "dismissed"]] = None,
    types: Optional[tuple[AttackType, ...]] = None,
    max_intensity: float = 1.0,
) -> RecordSpec:
    by_id = {d.id: d for d in devices}
    attack: AttackType = rng.weighted([(t, w) for t, w in TYPE_MIX if types is None or t in types])
    raw = 0.3 + 0.7 * rng.next() if attack == "ddos" else rng.next() ** 2.1
    intensity = min(raw, max_intensity)
    listed = False
    service: Optional[str] = None

    if attack == "port_scan":
        ext = pick_external(rng, ("scanner", "botnet"))
        dev_id, label = rng.weighted([((t[0], t[1]), t[2]) for t in PORT_SCAN_TARGETS])
        source, target, listed = external_party(ext), device_party(by_id[dev_id], label), ext.listed
    elif attack == "brute_force":
        ext = pick_external(rng, ("credential",))
        dev_id, label, service = rng.weighted([((t[0], t[1], t[2]), t[3]) for t in BRUTE_TARGETS])
        source, target, listed = external_party(ext), device_party(by_id[dev_id], label), ext.listed
    elif attack == "ddos":
        ext = pick_external(rng, ("botnet",))
        source = external_party(ext)
        source.label = f"External · Botnet ({rng.int(200, 2100):,} hosts)"
        target = device_party(by_id["server-01"], "Server-01 · Web") if rng.chance(0.8) else device_party(by_id["mail-01"], "MAIL-01 · Mail")
        listed = ext.listed
    elif attack == "dns_anomaly":
        pool = [d for d in devices if d.type in ("workstation", "laptop") and d.id != "pc-07"]
        source = device_party(rng.pick(pool))
        target = Party(ip="192.168.1.8", label="DNS-01 → external resolvers", internal=True)
    elif attack == "malware":
        pool = [d for d in devices if d.type in ("camera", "iot_sensor", "workstation") and d.id not in ("pc-07", "iot-04")]
        source = device_party(rng.pick(pool))
        target = Party(ip=rng.pick(RARE_HOSTS), label="Rare external host", internal=False)
    else:
        pool = [d for d in devices if d.id in ("server-03", "mail-01", "dc-01", "pc-05", "pc-08", "lt-03")]
        source = device_party(rng.pick(pool))
        target = Party(ip=rng.pick(RARE_HOSTS), label="Unfamiliar external endpoint", internal=False)

    factors = generate_factors(attack, intensity, listed, rng)
    risk = risk_from_factors(factors)
    dismissed = outcome_kind == "dismissed" if outcome_kind else rng.chance(dismiss_probability)
    outcome: Outcome = "dismissed" if dismissed else ("blocked" if not source.internal else ("quarantined" if risk >= 85 else "resolved"))
    fs = FEATURE_GENERATORS[attack](GenInput(rng=rng, intensity=intensity, source=source, target=target, listed=listed, outcome=outcome, baseline_pps=js_round(baseline_pps(timestamp)), service=service))
    response_time = None if outcome == "dismissed" else js_round(clamp(rng.normal(142, 34), 70, 260))
    info = ATTACK_INFO[attack]
    return RecordSpec(
        attack=attack,
        timestamp=timestamp,
        source=source,
        target=target,
        factors=factors,
        features=fs.features,
        explanation=fs.explanation,
        signal=fs.signal,
        outcome=outcome,
        response_time_ms=response_time,
        rule_no=0,
        related_event_count=rng.int(1, 6),
        mode="autonomous",
        traffic=fs.traffic,
        detected_by=(*info.detected_by, "threat_intel") if listed and attack != "ddos" else None,
    )


def perimeter_spec(rng: Random, timestamp: int, devices: list[Device], rule_no: int) -> RecordSpec:
    """A live, low-severity perimeter detection (port scan / brute force, blocked)."""
    spec = generate_spec(rng, timestamp, devices, 0, "contained", ("port_scan", "brute_force"), 0.4)
    spec.rule_no = rule_no
    spec.response_time_ms = js_round(clamp(rng.normal(142, 30), 80, 220))
    return spec


def history_specs(now: int, devices: list[Device], featured: list[RecordSpec]) -> list[RecordSpec]:
    """Exactly 127 contained threats in the 24 h before boot with a mean response of exactly 142 ms."""
    rng = Random()
    specs: list[RecordSpec] = []
    featured_contained = [f for f in featured if f.timestamp >= now - DAY and OUTCOME_STATUS[f.outcome] in CONTAINED]

    generated_contained = CONTAINED_24H_TARGET - len(featured_contained)
    slice_start = now - DAY + MIN
    slice_end = now - 6 * MIN
    last_day: list[RecordSpec] = []
    for k in range(generated_contained + 3):
        t = js_round(slice_start + rng.next() * (slice_end - slice_start))
        # The featured DDoS is the day's headline incident — no generated floods in the last 24 h.
        last_day.append(generate_spec(rng, t, devices, 0, "contained" if k < generated_contained else "dismissed", NON_VOLUMETRIC))

    contained = [s for s in last_day if s.response_time_ms is not None]
    target_sum = AVG_RESPONSE_TARGET * CONTAINED_24H_TARGET - sum(f.response_time_ms or 0 for f in featured_contained)
    diff = target_sum - sum(c.response_time_ms or 0 for c in contained)
    guard = 0
    while diff != 0 and guard < 100_000:
        guard += 1
        c = contained[guard % len(contained)]
        step = 1 if diff > 0 else -1
        nxt = (c.response_time_ms or 0) + step
        if 70 <= nxt <= 260:
            c.response_time_ms = nxt
            diff -= step
    specs.extend(last_day)

    for d in range(1, 30):
        day_end = now - d * DAY
        weekend = 0.75 if local(day_end).weekday() >= 5 else 1.0
        count = js_round(rng.int(110, 140) * weekend)
        dismiss_p = 0.022 + (0.023 * d) / 30
        for _ in range(count):
            t = js_round(day_end - DAY + rng.next() * DAY)
            specs.append(generate_spec(rng, t, devices, dismiss_p))
    return specs


# ------------------------------------------------------------------ materialization

def make_record(spec: RecordSpec, threat_id: str) -> ThreatRecord:
    info = ATTACK_INFO[spec.attack]
    risk = risk_from_factors(spec.factors)
    status = OUTCOME_STATUS[spec.outcome]
    actions = spec.actions or build_actions(
        PlaybookInput(spec.attack, spec.source, spec.target, spec.outcome, spec.timestamp, spec.response_time_ms, spec.rule_no, risk),
        threat_id,
    )
    device_id = spec.source.device_id if spec.source.internal else spec.target.device_id

    threat = Threat(
        id=threat_id,
        type=spec.attack,
        name=info.name,
        severity=level_of(risk),
        source_ip=spec.source.ip,
        source_label=spec.source.label,
        target_ip=spec.target.ip,
        target_label=spec.target.label,
        confidence=spec.factors[0],
        risk_score=risk,
        status=status,
        timestamp=iso(spec.timestamp),
        explanation=spec.explanation,
        features=spec.features,
        actions=actions,
        device_id=device_id,
        mitre=info.mitre,
        detected_by=list(spec.detected_by or info.detected_by),
        response_time_ms=spec.response_time_ms,
        related_event_count=spec.related_event_count,
    )

    overlay: Optional[TrafficOverlay] = None
    sig = spec.traffic
    if sig and (spec.peak_pps or sig.peak_multiplier >= 1.35 or spec.attack == "unknown_anomaly"):
        base = baseline_pps(spec.timestamp)
        contained = status in ("blocked", "quarantined")
        peak = 1 + (spec.peak_pps - 13_200) / base if spec.peak_pps else sig.peak_multiplier
        span = sig.duration_sec * 1000
        lead = 6000 if spec.attack == "ddos" else min(span * 0.6, info.lead_ms[1])
        mitigation_start = spec.timestamp + 2000 if contained else spec.timestamp + span * 0.4
        overlay = TrafficOverlay(
            attack=spec.attack,
            detected_at=spec.timestamp,
            start=int(spec.timestamp - lead),
            mitigation_start=mitigation_start,
            end=mitigation_start + (8000 if contained else span * 0.4),
            peak_multiplier=peak,
            packet_bytes=sig.packet_bytes,
            anomaly_peak=spec.factors[1] / 100,
            contained=contained,
        )

    if spec.peak_pps:
        replay_base, replay_peak = 13_200.0, spec.peak_pps / 13_200
    else:
        replay_base = float(js_round(baseline_pps(spec.timestamp)))
        replay_peak = overlay.peak_multiplier if overlay else (10 if spec.attack == "ddos" else 1.4 if spec.attack == "port_scan" else 1.1)

    return ThreatRecord(
        threat=threat,
        factors=spec.factors,
        signal=spec.signal,
        outcome=spec.outcome,
        mode=spec.mode,
        source=spec.source,
        target=spec.target,
        replay_baseline_pps=replay_base,
        replay_peak_multiplier=replay_peak,
        intel=spec.intel,
        overlay=overlay,
    )


def materialize(specs: list[RecordSpec]) -> list[ThreatRecord]:
    """Sort chronologically and number THR-1001… (oldest = smallest)."""
    ordered = sorted(specs, key=lambda s: s.timestamp)
    rule = 3600
    records: list[ThreatRecord] = []
    for i, spec in enumerate(ordered):
        if not spec.rule_no and spec.outcome in ("blocked", "quarantined"):
            rule = 3600 if rule >= 4099 else rule + 1
            spec.rule_no = rule
        records.append(make_record(spec, f"THR-{1001 + i}"))
    return records


# ------------------------------------------------------------------ detail

FACTOR_META = (
    ("detection_confidence", "Detection confidence", "Probability assigned by the supervised classifier."),
    ("anomaly_score", "Anomaly score", "Deviation from the learned behavioral baseline (Isolation Forest)."),
    ("behavioral_risk", "Behavioral risk", "Severity of the observed behavior and criticality of the asset involved."),
    ("threat_intelligence", "Threat intelligence", "Match strength against threat-intelligence indicators (simulated feed)."),
)


def risk_factors(f: FactorValues) -> list[RiskFactor]:
    return [RiskFactor(key=k, label=label, description=desc, value=f[i], weight=0.25) for i, (k, label, desc) in enumerate(FACTOR_META)]  # type: ignore[arg-type]


MESSAGES = {
    "auto_contained": "Threat detected. Mitigation automatically executed.",
    "approved": "Mitigation executed after administrator approval.",
    "awaiting": "Threat detected. Waiting for administrator approval.",
    "monitoring": "Risk below the containment threshold — NEXUS is monitoring.",
    "rejected": "Administrator rejected containment — NEXUS continues monitoring.",
    "dismissed": "Detection reviewed and dismissed as a false positive.",
    "executing": "Threat detected. Executing mitigation…",
}


def build_response(record: ThreatRecord, settings: DefenseSettings) -> ResponseExecution:
    t = record.threat
    ts = parse_iso(t.timestamp)
    status = t.status
    contained = status in CONTAINED
    rt = t.response_time_ms or 0
    decided = record.decided_by == "administrator"

    if status == "awaiting_approval":
        state, message = "awaiting_approval", MESSAGES["awaiting"]
    elif status in ("mitigating", "detected"):
        state, message = "executing", MESSAGES["executing"]
    elif status == "dismissed":
        state, message = "completed", MESSAGES["dismissed"]
    elif status in ("monitoring", "investigating"):
        state, message = ("rejected", MESSAGES["rejected"]) if decided else ("monitoring", MESSAGES["monitoring"])
    else:
        state = "completed"
        message = MESSAGES["approved"] if decided else MESSAGES["monitoring"] if record.outcome == "resolved" else MESSAGES["auto_contained"]

    if t.risk_score >= settings.quarantine_threshold and t.device_id and record.source.internal:
        policy = f"Risk {t.risk_score} ≥ {settings.quarantine_threshold} → isolate device"
    elif t.risk_score >= settings.auto_response_threshold:
        policy = f"Risk {t.risk_score} ≥ {settings.auto_response_threshold} → contain"
    else:
        policy = f"Risk {t.risk_score} < {settings.auto_response_threshold} → monitor"

    contained_now = status in ("blocked", "quarantined")
    done_actions = len([a for a in t.actions if a.status == "done"])
    if contained_now:
        respond_status, respond_detail = "done", f"{done_actions} actions in {rt} ms"
    elif state in ("awaiting_approval", "executing"):
        respond_status, respond_detail = "active", "Waiting for approval" if state == "awaiting_approval" else "Executing"
    elif status == "dismissed":
        respond_status, respond_detail = "skipped", "False positive"
    elif contained:
        respond_status, respond_detail = "done", "Monitoring only"
    else:
        respond_status, respond_detail = "skipped", "Monitoring only"

    phases = [
        ResponsePhase(key="detect", label="Detect", status="done", timestamp=iso(ts), detail=f"{t.confidence:.1f}% confidence"),
        ResponsePhase(key="decide", label="Decide", status="active" if state == "executing" else "done", timestamp=iso(ts + js_round((rt or 60) * 0.45)), detail=policy),
        ResponsePhase(key="respond", label="Respond", status=respond_status, timestamp=iso(ts + rt) if contained else None, detail=respond_detail),  # type: ignore[arg-type]
        ResponsePhase(
            key="recover",
            label="Recover",
            status="done" if contained_now or status == "resolved" else "pending",
            timestamp=iso(ts + rt + 8000) if contained_now else None,
            detail="Back to baseline" if contained_now else "Activity ended" if status == "resolved" else "Pending",
        ),
    ]

    return ResponseExecution(
        id=f"RSP-{t.id[4:]}",
        threat_id=t.id,
        threat_name=t.name,
        mode=record.mode,
        state=state,  # type: ignore[arg-type]
        phases=phases,
        actions=t.actions,
        response_time_ms=t.response_time_ms if contained_now or status == "resolved" else None,
        message=message,
        decided_by=None if state == "awaiting_approval" else ("administrator" if decided else "nexus"),
        timestamp=iso(ts + rt),
    )


def build_threat_detail(record: ThreatRecord, settings: DefenseSettings) -> ThreatDetail:
    t = record.threat
    info = ATTACK_INFO[t.type]
    level = level_of(t.risk_score)
    timeline = build_timeline(
        TimelineInput(
            attack=t.type,
            timestamp=parse_iso(t.timestamp),
            source=record.source,
            target=record.target,
            confidence=t.confidence,
            risk_score=t.risk_score,
            risk_level=level,
            anomaly_score=record.factors[1] / 100,
            signal=record.signal,
            outcome=record.outcome,
            response_time_ms=t.response_time_ms,
            auto_threshold=settings.auto_response_threshold,
        ),
        info,
    )
    contained = t.status in ("blocked", "quarantined")
    replay = (
        build_replay(
            ReplayInput(
                risk_score=t.risk_score,
                risk_level=level,
                anomaly_peak=record.factors[1] / 100,
                baseline_pps=record.replay_baseline_pps,
                peak_multiplier=record.replay_peak_multiplier,
                outcome=record.outcome,
                seed=int(t.id[4:]),
            )
        )
        if contained
        else None
    )
    return ThreatDetail(
        **t.model_dump(),
        risk_factors=risk_factors(record.factors),
        timeline=timeline,
        response=build_response(record, settings),
        intel=record.intel,
        replay=replay,
        models=ModelLabels(**MODEL_LABELS),
    )


def intel_for_source(records: list[ThreatRecord], ip: str, listed: bool, label: str) -> Optional[ThreatIntel]:
    """Aggregate intel for external sources from the history (featured sources carry explicit intel)."""
    related = [r for r in records if r.threat.source_ip == ip]
    if not related:
        return None
    first = parse_iso(related[0].threat.timestamp)
    last = parse_iso(related[-1].threat.timestamp)
    slug = label.lower().replace(" ", "-")
    return make_intel(
        ip,
        "malicious" if listed else "suspicious",
        label,
        min(97, 70 + len(related)) if listed else min(68, 38 + len(related)),
        first,
        last,
        len(related),
        ["listed" if listed else "unlisted", slug],
    )
