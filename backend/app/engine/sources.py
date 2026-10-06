"""
Simulated external parties. Generated sources use documentation / benchmarking
address space (RFC 5737, RFC 2544) with the last octet masked, so no real host
is ever implied to be malicious.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.schemas import Device

from .catalog import Party
from .rng import Random

SourceKind = Literal["scanner", "credential", "botnet"]

KIND_LABEL: dict[str, str] = {"scanner": "Mass scanner", "credential": "Credential attacker", "botnet": "Botnet node"}

PREFIXES = (
    "203.0.113", "198.51.100", "192.0.2", "198.18.4", "198.18.17", "198.18.23", "198.18.42", "198.18.58",
    "198.18.77", "198.18.91", "198.18.103", "198.18.126", "198.19.12", "198.19.40", "198.19.66", "198.19.81",
    "198.19.118", "198.19.140", "198.19.152", "198.19.169", "198.19.181", "198.19.203", "198.19.216", "198.19.233",
)
KIND_CYCLE: tuple[SourceKind, ...] = ("scanner", "credential", "scanner", "botnet", "credential", "scanner")


@dataclass(frozen=True)
class ExternalSource:
    key: str
    ip: str
    kind: SourceKind
    label: str
    listed: bool
    weight: float


EXTERNAL_SOURCES: tuple[ExternalSource, ...] = tuple(
    ExternalSource(
        key=f"ext-{i}",
        ip=f"{prefix}.xx",
        kind=KIND_CYCLE[i % len(KIND_CYCLE)],
        label=KIND_LABEL[KIND_CYCLE[i % len(KIND_CYCLE)]],
        listed=i < 10 or i % 3 == 0,
        weight=1 / (i + 1) ** 1.1,
    )
    for i, prefix in enumerate(PREFIXES)
)

# First-seen destinations used by beaconing / exfiltration-like anomalies.
RARE_HOSTS = ("198.51.100.xx", "203.0.113.xx", "192.0.2.xx", "198.18.200.xx", "198.19.7.xx")


def pick_external(rng: Random, kinds: tuple[SourceKind, ...]) -> ExternalSource:
    pool = [s for s in EXTERNAL_SOURCES if s.kind in kinds]
    return rng.weighted([(s, s.weight) for s in pool])


def external_party(source: ExternalSource) -> Party:
    return Party(ip=source.ip, label=f"External · {source.label}", internal=False)


def device_party(device: Device, label: str | None = None) -> Party:
    return Party(ip=device.ip, label=label or device.hostname, internal=True, device_id=device.id)
