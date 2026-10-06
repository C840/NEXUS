"""
Attack scenarios for the simulator — docs/SIMULATED_DATASET.md §10.

Each scenario is data: who attacks whom, the signals NEXUS observes (feature
attributions + explanation), the risk factors, the traffic signature and the
links that light up as the attack path. The runner (simulation.py) plays it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.schemas import AttackType, FeatureContribution, LinkStatus

from .catalog import FactorValues, feature


@dataclass(frozen=True)
class Scenario:
    attack: AttackType
    label: str
    #: Device whose state changes (the internal attacker, or the attacked server).
    victim: str
    internal_source: bool
    #: External source (ip, label) when the attacker is outside.
    external: Optional[tuple[str, str]]
    #: Target (ip, label) as shown on the threat.
    target: tuple[str, str]
    factors: FactorValues
    features: tuple[FeatureContribution, ...]
    #: Detection-focused explanation; the outcome sentence is appended once NEXUS decides.
    explanation: str
    signal: str
    spike_label: str
    response_time_ms: int
    #: Network-wide packet-rate multiplier at the attack's peak.
    peak_multiplier: float
    packet_bytes: int
    #: Links forced into a state while the attack is active.
    attack_path: dict[str, LinkStatus] = field(default_factory=dict)
    #: Network-health points lost while the attack is active.
    health_penalty: float = 0.4
    detected_by: tuple[str, ...] = ("anomaly", "classifier")
    intel_ip: Optional[str] = None


SCENARIOS: dict[str, Scenario] = {
    "port_scan": Scenario(
        attack="port_scan",
        label="Port Scan",
        victim="pc-07",
        internal_source=True,
        external=None,
        target=("192.168.1.0/24", "Internal Network"),
        factors=(96.4, 91, 87, 82),
        features=(
            feature("port_diversity", "Port Diversity", 0.31, "73 unique ports / 12 s", "≤ 4 ports / 12 s"),
            feature("connection_rate", "Connection Rate", 0.24, "6.1 conn/s", "≈ 0.3 conn/s"),
            feature("syn_ratio", "SYN Ratio", 0.18, "0.94 SYN-to-ACK", "≈ 0.05"),
            feature("packet_frequency", "Packet Frequency", 0.12, "412 pps", "≈ 38 pps"),
            feature("traffic_volume", "Traffic Volume", 0.08, "1.9 MB / 12 s", "≈ 0.2 MB / 12 s"),
        ),
        explanation=(
            "NEXUS classified this traffic as a probable port scan because PC-07 contacted 73 unique destination ports within 12 seconds — "
            "far above its baseline of ≤ 4 — while producing a SYN-to-ACK ratio of 0.94. Connection rate and packet frequency rose sharply at the same time."
        ),
        signal="73 destination ports probed in 12 s",
        spike_label="Outbound connection burst from PC-07",
        response_time_ms=142,
        peak_multiplier=1.6,
        packet_bytes=60,
        attack_path={"sw-ws->pc-07": "attack", "rtr-01->sw-ws": "suspicious"},
        health_penalty=1.1,
    ),
    "ddos": Scenario(
        attack="ddos",
        label="DDoS",
        victim="server-01",
        internal_source=False,
        external=("185.23.xx.xx", "External · Botnet (1,412 hosts)"),
        target=("192.168.1.5", "Server-01 · Web"),
        factors=(98.6, 98, 90, 95),
        features=(
            feature("inbound_packet_rate", "Inbound Packet Rate", 0.35, "176,800 pps", "≈ 13,200 pps"),
            feature("source_ip_entropy", "Source IP Entropy", 0.23, "1,412 unique sources", "≈ 40 sources"),
            feature("udp_share", "UDP Share", 0.14, "94% of packets", "≈ 21%"),
            feature("mean_packet_size", "Mean Packet Size", 0.09, "70 bytes", "≈ 610 bytes"),
            feature("threat_intel_match", "Threat Intel Match", 0.08, "Botnet indicator match", "No match"),
        ),
        explanation=(
            "NEXUS classified this traffic as a volumetric DDoS attack: inbound packets to Server-01 rose to 176,800 per second — about 13× the "
            "learned baseline — from 1,412 distinct sources. 94% of the packets were UDP with an average size of 70 bytes, and the source range matches "
            "the botnet indicator seen earlier today."
        ),
        signal="Inbound rate 176,800 pps (≈13× baseline)",
        spike_label="Inbound UDP flood toward Server-01",
        response_time_ms=104,
        peak_multiplier=0.0,  # computed from the absolute peak below
        packet_bytes=70,
        attack_path={"internet->fw-01": "attack", "fw-01->rtr-01": "attack", "rtr-01->sw-srv": "attack", "sw-srv->server-01": "attack"},
        health_penalty=6.8,
        detected_by=("anomaly", "classifier", "threat_intel"),
        intel_ip="185.23.xx.xx",
    ),
    "brute_force": Scenario(
        attack="brute_force",
        label="Brute Force",
        victim="server-02",
        internal_source=False,
        external=("45.155.xx.xx", "External · SSH scanner"),
        target=("192.168.1.6", "Server-02 · SSH"),
        factors=(95.2, 74, 79, 72),
        features=(
            feature("failed_auth_rate", "Failed Auth Rate", 0.3, "486 failures / 5 min", "≈ 3 / 5 min"),
            feature("username_diversity", "Username Diversity", 0.18, "64 distinct usernames", "≈ 2"),
            feature("connection_rate", "Connection Rate", 0.11, "1.6 SSH sessions / s", "≈ 0.02 / s"),
            feature("source_reputation", "Source Reputation", 0.08, "listed: SSH scanner", "not listed"),
            feature("attempt_cadence", "Attempt Cadence", 0.05, "regular 0.6 s interval", "human-irregular"),
        ),
        explanation=(
            "NEXUS detected a password-guessing attack against Server-02's SSH service: 486 failed logins in five minutes across 64 different "
            "usernames at a machine-regular 0.6-second cadence, from a source the threat-intelligence feed lists as an SSH scanner."
        ),
        signal="486 failed SSH logins in 5 min",
        spike_label="SSH login burst toward Server-02",
        response_time_ms=131,
        peak_multiplier=1.18,
        packet_bytes=140,
        attack_path={"internet->fw-01": "attack", "fw-01->rtr-01": "attack", "rtr-01->sw-srv": "attack", "sw-srv->server-02": "attack"},
        health_penalty=0.6,
        detected_by=("classifier", "signature", "threat_intel"),
        intel_ip="45.155.xx.xx",
    ),
    "dns_anomaly": Scenario(
        attack="dns_anomaly",
        label="Suspicious DNS",
        victim="pc-03",
        internal_source=True,
        external=None,
        target=("192.168.1.8", "DNS-01 → external resolvers"),
        factors=(91.5, 86, 72, 48),
        features=(
            feature("query_entropy", "Query Name Entropy", 0.26, "4.9 bits/char", "≈ 3.1 bits/char"),
            feature("query_rate", "Query Rate", 0.19, "96 queries/min", "≈ 6 queries/min"),
            feature("nxdomain_ratio", "NXDOMAIN Ratio", 0.12, "37%", "< 2%"),
            feature("subdomain_length", "Subdomain Length", 0.08, "52 chars avg", "≈ 14 chars"),
            feature("txt_share", "TXT Record Share", 0.05, "18% of queries", "< 1%"),
        ),
        explanation=(
            "PC-03's DNS behavior escalated sharply: 96 queries per minute with very high name entropy (4.9 bits/char vs ≈3.1), a 37% NXDOMAIN ratio and "
            "an 18% share of TXT lookups — a strong indication of DNS tunnelling."
        ),
        signal="96 high-entropy queries/min, 37% NXDOMAIN",
        spike_label="Burst of random-looking DNS lookups from PC-03",
        response_time_ms=118,
        peak_multiplier=1.05,
        packet_bytes=90,
        attack_path={"sw-ws->pc-03": "attack", "rtr-01->sw-ws": "suspicious", "sw-srv->dns-01": "suspicious"},
        health_penalty=0.3,
    ),
    "malware": Scenario(
        attack="malware",
        label="Malware Behavior",
        victim="iot-04",
        internal_source=True,
        external=None,
        target=("103.75.xx.xx", "Rare external host"),
        factors=(92.0, 90, 88, 76),
        features=(
            feature("beacon_periodicity", "Beacon Periodicity", 0.24, "every 30.0 s (±0.2 s)", "irregular"),
            feature("destination_rarity", "Destination Rarity", 0.17, "first seen on network", "known vendor hosts"),
            feature("out_in_ratio", "Outbound / Inbound Ratio", 0.12, "9.4 : 1", "≈ 0.4 : 1"),
            feature("payload_uniformity", "Payload Size Uniformity", 0.07, "512 B ± 2 B", "variable"),
            feature("tls_no_sni", "TLS without SNI", 0.04, "100% of sessions", "SNI present"),
        ),
        explanation=(
            "IoT-04 doubled its beaconing rate to a near-perfect 30-second interval toward the first-seen host 103.75.xx.xx and is now sending 9.4× more "
            "data than it receives — consistent with an active command-and-control channel and possible data staging."
        ),
        signal="Beacon every 30 s to a first-seen host",
        spike_label="Periodic outbound beacons from IoT-04",
        response_time_ms=127,
        peak_multiplier=1.08,
        packet_bytes=512,
        attack_path={"sw-iot->iot-04": "attack", "rtr-01->sw-iot": "suspicious", "fw-01->rtr-01": "suspicious"},
        health_penalty=0.4,
        intel_ip="103.75.xx.xx",
    ),
    "unknown_anomaly": Scenario(
        attack="unknown_anomaly",
        label="Unknown Anomaly",
        victim="server-03",
        internal_source=True,
        external=None,
        target=("45.12.xx.xx", "Unfamiliar storage endpoint"),
        factors=(62.0, 88, 58, 12),
        features=(
            feature("outbound_volume", "Outbound Volume", 0.18, "7.2 GB in 9 min", "≈ 0.6 GB / night"),
            feature("destination_port", "Destination Port", 0.09, "TCP/8443", "TCP/443"),
            feature("session_duration", "Session Duration", 0.06, "9 min single session", "< 5 min"),
            feature("schedule_deviation", "Schedule Deviation", 0.05, "outside backup window", "nightly 01:00–02:00"),
        ),
        explanation=(
            "The anomaly detector flagged a 7.2 GB outbound burst from Server-03 in nine minutes to an unfamiliar endpoint on TCP/8443 — far outside its "
            "learned behavior. No supervised attack class matched with high confidence (best match 44%), so NEXUS labelled it an unknown anomaly."
        ),
        signal="7.2 GB outbound on TCP/8443",
        spike_label="Unusual outbound transfer from Server-03",
        response_time_ms=96,
        peak_multiplier=1.25,
        packet_bytes=1400,
        attack_path={"sw-srv->server-03": "suspicious", "rtr-01->sw-srv": "suspicious"},
        health_penalty=0.5,
        detected_by=("anomaly",),
    ),
}

#: Absolute packet-rate peak for volumetric scenarios (overrides peak_multiplier).
PEAK_PPS: dict[str, int] = {"ddos": 176_800}
