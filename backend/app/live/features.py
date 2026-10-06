"""
Flow features for live detection.

Packets are reduced to header-level `PacketRecord`s (no payloads are kept),
then aggregated per host over a fixed window into one feature row per host.
The same feature definitions drive training, detection and explanations.
"""

from __future__ import annotations

import ipaddress
import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any, Iterable, Optional


@dataclass(frozen=True)
class FeatureDef:
    key: str
    label: str
    unit: str
    fmt: str = "{:.1f}"

    def render(self, value: float) -> str:
        return f"{self.fmt.format(value)} {self.unit}".strip()


FEATURES: tuple[FeatureDef, ...] = (
    FeatureDef("out_pps", "Outbound Packet Rate", "pps"),
    FeatureDef("out_bps", "Outbound Throughput", "KB/s", "{:.1f}"),
    FeatureDef("mean_pkt_size", "Mean Packet Size", "bytes", "{:.0f}"),
    FeatureDef("uniq_dst_ports", "Port Diversity", "ports", "{:.0f}"),
    FeatureDef("uniq_dst_ips", "Destination Diversity", "hosts", "{:.0f}"),
    FeatureDef("syn_rate", "Connection Attempt Rate", "SYN/s"),
    FeatureDef("syn_only_ratio", "SYN-only Ratio", "", "{:.2f}"),
    FeatureDef("rst_ratio", "Reset Ratio", "", "{:.2f}"),
    FeatureDef("udp_share", "UDP Share", "", "{:.2f}"),
    FeatureDef("dns_rate", "DNS Query Rate", "q/s", "{:.2f}"),
    FeatureDef("dns_entropy", "Query Name Entropy", "bits/char", "{:.2f}"),
    FeatureDef("nxdomain_ratio", "NXDOMAIN Ratio", "", "{:.2f}"),
    FeatureDef("in_pps", "Inbound Packet Rate", "pps"),
    FeatureDef("uniq_src_ips", "Source Diversity", "sources", "{:.0f}"),
    FeatureDef("out_in_ratio", "Outbound / Inbound Ratio", ": 1", "{:.1f}"),
)
FEATURE_KEYS = tuple(f.key for f in FEATURES)
FEATURE_BY_KEY = {f.key: f for f in FEATURES}

WINDOW_SEC = 5.0


@dataclass(slots=True)
class PacketRecord:
    ts: float
    src: str
    dst: str
    proto: str  # tcp | udp | icmp | other
    length: int
    sport: int = 0
    dport: int = 0
    syn: bool = False
    ack: bool = False
    rst: bool = False
    dns_query: Optional[str] = None
    dns_rcode: Optional[int] = None


def parse_packet(pkt: Any) -> Optional[PacketRecord]:
    """Reduce a Scapy packet to header fields. Returns None for non-IP traffic."""
    from scapy.layers.dns import DNS
    from scapy.layers.inet import ICMP, IP, TCP, UDP
    from scapy.layers.inet6 import IPv6

    if IP in pkt:
        ip = pkt[IP]
    elif IPv6 in pkt:
        ip = pkt[IPv6]
    else:
        return None
    rec = PacketRecord(ts=float(pkt.time), src=str(ip.src), dst=str(ip.dst), proto="other", length=len(pkt))
    if TCP in pkt:
        tcp = pkt[TCP]
        flags = int(tcp.flags)
        rec.proto, rec.sport, rec.dport = "tcp", int(tcp.sport), int(tcp.dport)
        rec.syn, rec.ack, rec.rst = bool(flags & 0x02), bool(flags & 0x10), bool(flags & 0x04)
    elif UDP in pkt:
        udp = pkt[UDP]
        rec.proto, rec.sport, rec.dport = "udp", int(udp.sport), int(udp.dport)
        if DNS in pkt:
            dns = pkt[DNS]
            try:
                if dns.qr == 0 and dns.qd is not None:
                    name = dns.qd.qname
                    rec.dns_query = name.decode(errors="ignore") if isinstance(name, bytes) else str(name)
                elif dns.qr == 1:
                    rec.dns_rcode = int(dns.rcode)
            except Exception:  # malformed DNS — keep the packet, drop the DNS detail
                pass
    elif ICMP in pkt:
        rec.proto = "icmp"
    return rec


def name_entropy(name: str) -> float:
    """Shannon entropy (bits/char) of the left-most labels — high for DGA / tunnelling names."""
    labels = [p for p in name.strip(".").split(".") if p]
    core = "".join(labels[:-2]) if len(labels) > 2 else (labels[0] if labels else "")
    if not core:
        return 0.0
    counts = Counter(core.lower())
    n = len(core)
    return -sum(c / n * math.log2(c / n) for c in counts.values())


def is_local(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return addr.is_private or addr.is_link_local


@dataclass
class _HostAcc:
    out_pkts: int = 0
    out_bytes: int = 0
    in_pkts: int = 0
    in_bytes: int = 0
    dst_ports: set[int] = field(default_factory=set)
    dst_ips: set[str] = field(default_factory=set)
    src_ips: set[str] = field(default_factory=set)
    tcp_out: int = 0
    syn: int = 0
    syn_only: int = 0
    rst: int = 0
    udp_out: int = 0
    dns_queries: int = 0
    dns_entropy_sum: float = 0.0
    dns_responses: int = 0
    nxdomain: int = 0


def window_features(records: Iterable[PacketRecord], window_sec: float = WINDOW_SEC) -> dict[str, dict[str, float]]:
    """One feature row per host seen in the window (as sender or receiver)."""
    hosts: dict[str, _HostAcc] = defaultdict(_HostAcc)
    for r in records:
        s, d = hosts[r.src], hosts[r.dst]
        s.out_pkts += 1
        s.out_bytes += r.length
        d.in_pkts += 1
        d.in_bytes += r.length
        d.src_ips.add(r.src)
        s.dst_ips.add(r.dst)
        if r.dport:
            s.dst_ports.add(r.dport)
        if r.proto == "tcp":
            s.tcp_out += 1
            if r.syn:
                s.syn += 1
                if not r.ack:
                    s.syn_only += 1
            if r.rst:
                s.rst += 1
        elif r.proto == "udp":
            s.udp_out += 1
        if r.dns_query:
            s.dns_queries += 1
            s.dns_entropy_sum += name_entropy(r.dns_query)
        if r.dns_rcode is not None:
            d.dns_responses += 1
            if r.dns_rcode == 3:
                d.nxdomain += 1

    rows: dict[str, dict[str, float]] = {}
    for ip, h in hosts.items():
        if h.out_pkts == 0 and h.in_pkts < 20:
            continue  # pure receivers with little traffic carry no signal
        rows[ip] = {
            "out_pps": h.out_pkts / window_sec,
            "out_bps": h.out_bytes / window_sec / 1024,
            "mean_pkt_size": h.out_bytes / h.out_pkts if h.out_pkts else 0.0,
            "uniq_dst_ports": float(len(h.dst_ports)),
            "uniq_dst_ips": float(len(h.dst_ips)),
            "syn_rate": h.syn / window_sec,
            "syn_only_ratio": h.syn_only / h.tcp_out if h.tcp_out else 0.0,
            "rst_ratio": h.rst / h.tcp_out if h.tcp_out else 0.0,
            "udp_share": h.udp_out / h.out_pkts if h.out_pkts else 0.0,
            "dns_rate": h.dns_queries / window_sec,
            "dns_entropy": h.dns_entropy_sum / h.dns_queries if h.dns_queries else 0.0,
            "nxdomain_ratio": h.nxdomain / h.dns_responses if h.dns_responses else 0.0,
            "in_pps": h.in_pkts / window_sec,
            "uniq_src_ips": float(len(h.src_ips)),
            "out_in_ratio": (h.out_bytes + 1) / (h.in_bytes + 1),
        }
    return rows


def vector(row: dict[str, float]) -> list[float]:
    return [float(row.get(k, 0.0)) for k in FEATURE_KEYS]
