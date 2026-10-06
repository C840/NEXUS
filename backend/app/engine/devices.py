"""Inventory per docs/SIMULATED_DATASET.md §1 — 42 devices."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.schemas import Device, DeviceStatus, DeviceType, NetworkSegment

from .rng import Random, iso, js_round


@dataclass(frozen=True)
class DeviceSeed:
    hostname: str
    ip: str
    type: DeviceType
    segment: NetworkSegment
    role: str
    os: str
    vendor: str
    open_ports: tuple[int, ...]
    connections: tuple[int, int]
    status: Optional[DeviceStatus] = None
    risk: Optional[int] = None


WS = (135, 445)
NET = (22, 443)

SEEDS: tuple[DeviceSeed, ...] = (
    DeviceSeed("FW-01", "192.168.1.1", "network", "edge", "Perimeter firewall", "NGFW OS 7.4", "Generic OEM", NET, (1750, 1850), risk=22),
    DeviceSeed("RTR-01", "192.168.1.2", "network", "core", "Core router", "RouterOS 7", "Generic OEM", NET, (1150, 1250)),
    DeviceSeed("SW-SRV", "192.168.1.3", "network", "core", "Server VLAN switch", "Switch OS 9.3", "Generic OEM", NET, (520, 700)),
    DeviceSeed("SW-WS", "192.168.1.4", "network", "core", "Workstation VLAN switch", "Switch OS 9.3", "Generic OEM", NET, (420, 560)),
    DeviceSeed("SW-IOT", "192.168.1.67", "network", "core", "IoT VLAN switch", "Switch OS 9.3", "Generic OEM", NET, (300, 380)),
    DeviceSeed("Server-01", "192.168.1.5", "server", "servers", "Web / application server", "Ubuntu 22.04 LTS", "Dell", (22, 80, 443), (380, 480), risk=18),
    DeviceSeed("Server-02", "192.168.1.6", "server", "servers", "Database server (PostgreSQL)", "Ubuntu 22.04 LTS", "Dell", (22, 5432), (160, 240), risk=15),
    DeviceSeed("Server-03", "192.168.1.7", "server", "servers", "File & backup server", "Ubuntu 22.04 LTS", "HP", (22, 445, 8443), (120, 180), status="suspicious", risk=31),
    DeviceSeed("DNS-01", "192.168.1.8", "server", "servers", "Internal DNS resolver", "Debian 12", "HP", (53,), (300, 420)),
    DeviceSeed("MAIL-01", "192.168.1.9", "server", "servers", "Mail relay", "Debian 12", "HP", (25, 587, 993), (140, 220)),
    DeviceSeed("DC-01", "192.168.1.10", "server", "servers", "Directory / authentication", "Windows Server 2022", "Dell", (88, 389, 636), (260, 360)),
    DeviceSeed("PC-01", "192.168.1.12", "workstation", "workstations", "Finance workstation", "Windows 11 Pro", "Dell", WS, (12, 30)),
    DeviceSeed("PC-02", "192.168.1.14", "workstation", "workstations", "Finance workstation", "Windows 11 Pro", "Dell", WS, (10, 28)),
    DeviceSeed("PC-03", "192.168.1.21", "workstation", "workstations", "Engineering workstation", "Windows 11 Pro", "Lenovo", WS, (24, 40), status="suspicious", risk=47),
    DeviceSeed("PC-04", "192.168.1.23", "workstation", "workstations", "Engineering workstation", "Windows 11 Pro", "Lenovo", WS, (14, 36)),
    DeviceSeed("PC-05", "192.168.1.27", "workstation", "workstations", "Engineering workstation", "Ubuntu 24.04 LTS", "Lenovo", (22,), (16, 38)),
    DeviceSeed("PC-06", "192.168.1.31", "workstation", "workstations", "HR workstation", "Windows 11 Pro", "HP", WS, (8, 22)),
    DeviceSeed("PC-07", "192.168.1.44", "workstation", "workstations", "Research workstation", "Windows 11 Pro", "Dell", WS, (15, 19), risk=12),
    DeviceSeed("PC-08", "192.168.1.46", "workstation", "workstations", "Research workstation", "Ubuntu 24.04 LTS", "Dell", (22,), (12, 30)),
    DeviceSeed("PC-09", "192.168.1.48", "workstation", "workstations", "Operations workstation", "Windows 11 Pro", "HP", WS, (10, 26)),
    DeviceSeed("PC-10", "192.168.1.52", "workstation", "workstations", "Operations workstation", "Windows 11 Pro", "HP", WS, (10, 24)),
    DeviceSeed("PC-11", "192.168.1.53", "workstation", "workstations", "Support workstation", "Windows 11 Pro", "Lenovo", WS, (9, 22)),
    DeviceSeed("PC-12", "192.168.1.54", "workstation", "workstations", "Reception workstation", "Windows 11 Pro", "Lenovo", WS, (8, 16)),
    DeviceSeed("LT-01", "192.168.1.60", "laptop", "workstations", "Staff laptop", "macOS 15", "Apple", (), (8, 24)),
    DeviceSeed("LT-02", "192.168.1.61", "laptop", "workstations", "Staff laptop", "Windows 11 Pro", "Lenovo", WS, (8, 24)),
    DeviceSeed("LT-03", "192.168.1.62", "laptop", "workstations", "Staff laptop", "Ubuntu 24.04 LTS", "Dell", (22,), (8, 24)),
    DeviceSeed("LT-04", "192.168.1.63", "laptop", "workstations", "Staff laptop", "Windows 11 Pro", "HP", WS, (6, 20)),
    DeviceSeed("LT-05", "192.168.1.64", "laptop", "workstations", "Staff laptop", "macOS 15", "Apple", (), (6, 20)),
    DeviceSeed("LT-06", "192.168.1.65", "laptop", "workstations", "Staff laptop", "Windows 11 Pro", "Dell", WS, (6, 20)),
    DeviceSeed("LT-07", "192.168.1.66", "laptop", "workstations", "Staff laptop", "Windows 11 Pro", "Lenovo", WS, (6, 20)),
    DeviceSeed("IoT-01", "192.168.1.68", "iot_sensor", "iot", "Smart thermostat", "Embedded Linux", "Generic OEM", (8883,), (2, 4)),
    DeviceSeed("IoT-02", "192.168.1.69", "camera", "iot", "Parking camera", "Embedded Linux", "Generic OEM", (80, 554), (3, 6)),
    DeviceSeed("IoT-03", "192.168.1.70", "iot_sensor", "iot", "Badge reader", "Embedded RTOS", "Generic OEM", (8883,), (2, 4)),
    DeviceSeed("IoT-04", "192.168.1.71", "camera", "iot", "Lobby camera", "Embedded Linux", "Generic OEM", (80, 554), (5, 6), status="suspicious", risk=54),
    DeviceSeed("IoT-05", "192.168.1.72", "iot_sensor", "iot", "Conference display", "Android TV", "Generic OEM", (8008,), (2, 5)),
    DeviceSeed("IoT-06", "192.168.1.73", "iot_sensor", "iot", "HVAC controller", "Embedded RTOS", "Generic OEM", (502,), (2, 4)),
    DeviceSeed("IoT-07", "192.168.1.75", "camera", "iot", "Server room camera", "Embedded Linux", "Generic OEM", (80, 554), (3, 6)),
    DeviceSeed("IoT-08", "192.168.1.76", "iot_sensor", "iot", "Environmental sensor", "Embedded RTOS", "Generic OEM", (8883,), (2, 3)),
    DeviceSeed("PRN-01", "192.168.1.80", "printer", "iot", "Office printer, floor 1", "Printer firmware", "Generic OEM", (631, 9100), (2, 6)),
    DeviceSeed("PRN-02", "192.168.1.81", "printer", "iot", "Office printer, floor 2", "Printer firmware", "Generic OEM", (631, 9100), (2, 6)),
    DeviceSeed("MOB-01", "192.168.1.90", "mobile", "workstations", "Managed tablet", "iPadOS 18", "Apple", (), (3, 12)),
    DeviceSeed("MOB-02", "192.168.1.91", "mobile", "workstations", "Managed tablet", "Android 15", "Generic OEM", (), (3, 12)),
)

# Typical daily traffic per device type (bytes in, bytes out).
DAILY_BYTES: dict[str, tuple[float, float]] = {
    "network": (380e9, 360e9),
    "server": (42e9, 61e9),
    "workstation": (3.2e9, 0.9e9),
    "laptop": (2.4e9, 0.7e9),
    "mobile": (0.9e9, 0.2e9),
    "camera": (0.05e9, 6.5e9),
    "iot_sensor": (0.02e9, 0.03e9),
    "printer": (0.4e9, 0.02e9),
}


def device_id_for(hostname: str) -> str:
    return hostname.lower()


def create_devices(now: int) -> list[Device]:
    rng = Random(0x0DE71CE)
    devices: list[Device] = []
    for i, seed in enumerate(SEEDS):
        bytes_in, bytes_out = DAILY_BYTES[seed.type]
        octet = seed.ip.split(".")[3].rjust(2, "0")
        devices.append(
            Device(
                id=device_id_for(seed.hostname),
                hostname=seed.hostname,
                ip=seed.ip,
                mac=f"02:4e:58:{i + 16:02x}:{rng.int(16, 255):x}:{octet[-2:]}",
                type=seed.type,
                os=seed.os,
                vendor=seed.vendor,
                segment=seed.segment,
                status=seed.status or "safe",
                risk_score=seed.risk if seed.risk is not None else rng.int(3, 14),
                connections=rng.int(seed.connections[0], seed.connections[1]),
                last_seen=iso(now - rng.int(1, 55) * 1000),
                threat_ids=[],
                bytes_in24h=js_round(bytes_in * rng.float(0.75, 1.25)),
                bytes_out24h=js_round(bytes_out * rng.float(0.75, 1.25)),
                open_ports=list(seed.open_ports),
                role=seed.role,
            )
        )
    return devices
