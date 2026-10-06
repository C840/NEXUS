"""
Mutable state of the simulated backend — an in-memory repository.

`records`, `devices` and `events` are what a PostgreSQL event store would hold
(see db/schema.sql); the service layer only touches state through this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.schemas import DefenseSettings, Device, LinkStatus, ResponseExecution, SecurityEvent, Threat

from .devices import create_devices
from .events import seed_events
from .metrics import is_active
from .rng import Random, parse_iso
from .system import default_settings
from .threats import ThreatRecord, build_response, featured_specs, history_specs, materialize
from .traffic import OverlayIndex

SIX_HOURS = 6 * 3_600_000
EVENT_CAP = 500


@dataclass
class BackendState:
    boot_time: int
    devices: list[Device]
    records: list[ThreatRecord]  # chronological (oldest first)
    by_id: dict[str, ThreatRecord]
    events: list[SecurityEvent]  # newest first
    settings: DefenseSettings
    network_health: float
    overlays: OverlayIndex
    latest_response: Optional[ResponseExecution]
    next_threat_number: int
    live: Random  # randomness for live activity (separate from the dataset seed)
    rule_no: int = 4130
    # Links forced into a state by an in-progress simulation (link id → status).
    link_overrides: dict[str, LinkStatus] = field(default_factory=dict)
    # Network-health points lost while a simulated attack is active.
    health_penalty: float = 0.0


def create_state(now: int) -> BackendState:
    devices = create_devices(now)
    featured = featured_specs(now, devices)
    records = materialize([*featured, *history_specs(now, devices, featured)])
    settings = default_settings()
    latest_ddos = next((r for r in reversed(records) if r.threat.type == "ddos"), None)
    state = BackendState(
        boot_time=now,
        devices=devices,
        records=records,
        by_id={r.threat.id: r for r in records},
        events=seed_events([r.threat for r in records], now),
        settings=settings,
        network_health=98.2,
        overlays=OverlayIndex([r.overlay for r in records if r.overlay]),
        latest_response=build_response(latest_ddos, settings) if latest_ddos else None,
        next_threat_number=1001 + len(records),
        live=Random(now & 0x7FFFFFFF),
    )
    sync_device_threats(state, now)
    return state


def sync_device_threats(state: BackendState, now: int) -> None:
    """Device.threat_ids = active threats + detections from the last 6 h, newest first (max 8)."""
    by_device: dict[str, list[str]] = {}
    for record in reversed(state.records):
        t = record.threat
        if not t.device_id:
            continue
        if not is_active(t) and parse_iso(t.timestamp) < now - SIX_HOURS:
            continue
        ids = by_device.setdefault(t.device_id, [])
        if len(ids) < 8:
            ids.append(t.id)
    for d in state.devices:
        d.threat_ids = by_device.get(d.id, [])


def active_threats(state: BackendState) -> list[Threat]:
    return [r.threat for r in state.records if is_active(r.threat)]


def add_record(state: BackendState, record: ThreatRecord) -> None:
    state.records.append(record)
    state.by_id[record.threat.id] = record
    if record.overlay:
        state.overlays.add(record.overlay)


def add_event(state: BackendState, event: SecurityEvent) -> None:
    state.events = [event, *state.events][:EVENT_CAP]


def next_threat_id(state: BackendState) -> str:
    threat_id = f"THR-{state.next_threat_number}"
    state.next_threat_number += 1
    return threat_id


def device_by_id(state: BackendState, device_id: str) -> Optional[Device]:
    return next((d for d in state.devices if d.id == device_id), None)
