"""
Topology per docs/SIMULATED_DATASET.md §2 — always derived from device state.
A NetworkX graph analysis (planned) would consume exactly these nodes and links.
"""

from __future__ import annotations

from typing import Optional

from app.schemas import Device, LinkStatus, NetworkLink, NetworkNode, NetworkTopology, NodeStatus, NodeType, Threat

from .rng import iso

SWITCH_FOR_SEGMENT = {"servers": "sw-srv", "workstations": "sw-ws", "iot": "sw-iot"}
SEGMENT_SHARE = {"sw-srv": 0.45, "sw-ws": 0.4, "sw-iot": 0.15}

NODE_STATUS: dict[str, NodeStatus] = {"safe": "normal", "suspicious": "suspicious", "compromised": "compromised", "quarantined": "blocked"}
LINK_STATUS: dict[str, LinkStatus] = {"safe": "normal", "suspicious": "suspicious", "compromised": "attack", "quarantined": "blocked"}

DEVICE_LINK_MBPS = {"network": 0.0, "server": 4.2, "workstation": 0.9, "laptop": 0.6, "mobile": 0.25, "camera": 2.4, "iot_sensor": 0.05, "printer": 0.1}


def node_type(device: Device) -> NodeType:
    if device.type == "network":
        if device.id == "fw-01":
            return "firewall"
        if device.id == "rtr-01":
            return "router"
        return "switch"
    if device.type == "server":
        return "server"
    if device.type in ("camera", "iot_sensor", "printer"):
        return "iot"
    return "workstation"


def parent_of(device: Device) -> Optional[str]:
    if device.id == "fw-01":
        return "internet"
    if device.id == "rtr-01":
        return "fw-01"
    if device.id.startswith("sw-"):
        return "rtr-01"
    return SWITCH_FOR_SEGMENT.get(device.segment)


def device_node(device: Device, active_threats: list[Threat]) -> NetworkNode:
    names = list(dict.fromkeys(t.name for t in active_threats if t.device_id == device.id))
    return NetworkNode(
        id=device.id,
        label=device.hostname,
        ip=device.ip,
        type=node_type(device),
        status=NODE_STATUS[device.status],
        risk=device.risk_score,
        segment=device.segment,
        device_id=device.id,
        connections=device.connections,
        last_activity=device.last_seen,
        threats=names,
    )


def device_link(device: Device, parent: str, total_mbps: float, status: Optional[LinkStatus] = None) -> NetworkLink:
    if device.id == "fw-01":
        throughput = total_mbps
    elif device.id == "rtr-01":
        throughput = total_mbps * 0.98
    elif device.id.startswith("sw-"):
        throughput = total_mbps * SEGMENT_SHARE.get(device.id, 0.1)
    else:
        throughput = DEVICE_LINK_MBPS[device.type] * (0.8 + (device.connections % 7) / 15)
    return NetworkLink(
        id=f"{parent}->{device.id}",
        source=parent,
        target=device.id,
        status=status or LINK_STATUS[device.status],
        throughput_mbps=round(throughput * 10) / 10,
    )


def build_topology(devices: list[Device], active_threats: list[Threat], total_mbps: float, now: int, link_overrides: Optional[dict[str, LinkStatus]] = None) -> NetworkTopology:
    fw = next((d for d in devices if d.id == "fw-01"), None)
    nodes = [
        NetworkNode(
            id="internet",
            label="Internet",
            ip="0.0.0.0/0",
            type="internet",
            status="normal",
            risk=0,
            segment="edge",
            connections=fw.connections if fw else 0,
            last_activity=iso(now),
            threats=[],
        ),
        *(device_node(d, active_threats) for d in devices),
    ]
    overrides = link_overrides or {}
    links = []
    for d in devices:
        parent = parent_of(d)
        if parent:
            links.append(device_link(d, parent, total_mbps, overrides.get(f"{parent}->{d.id}")))
    return NetworkTopology(nodes=nodes, links=links, updated_at=iso(now))
