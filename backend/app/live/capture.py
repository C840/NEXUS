"""
Live packet capture with Scapy (requires Npcap on Windows / libpcap elsewhere).

Only header fields are kept (see features.PacketRecord); payloads are never
stored. Packets are handed to the engine through a bounded thread-safe deque.
"""

from __future__ import annotations

import logging
import os
import sys
import threading
import time
from collections import deque
from typing import Optional

from .features import PacketRecord, parse_packet

log = logging.getLogger("nexus.live.capture")


def capture_available() -> tuple[bool, Optional[str]]:
    """Whether a packet-capture driver is present, and why not if it isn't."""
    if sys.platform == "win32":
        dll = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32", "Npcap", "wpcap.dll")
        if not os.path.exists(dll):
            return False, "Npcap is not installed. Install it from https://npcap.com (tick “WinPcap API-compatible mode”), then restart the backend."
    try:
        import scapy.all  # noqa: F401
    except Exception as exc:  # pragma: no cover - environment specific
        return False, f"Scapy could not load: {exc}"
    return True, None


def list_interfaces() -> list[str]:
    try:
        from scapy.all import conf

        return sorted({str(i.name) for i in conf.ifaces.values() if getattr(i, "name", None)})
    except Exception:
        return []


class PacketCapture:
    def __init__(self, interface: str, max_buffer: int = 200_000) -> None:
        self.interface = interface
        self.buffer: deque[PacketRecord] = deque(maxlen=max_buffer)
        self.packets = 0
        self.bytes = 0
        self.dropped = 0
        self.started_at: Optional[float] = None
        self.error: Optional[str] = None
        self._sniffer = None
        self._lock = threading.Lock()

    @property
    def running(self) -> bool:
        return self._sniffer is not None and bool(getattr(self._sniffer, "running", False))

    def _on_packet(self, pkt: object) -> None:
        try:
            rec = parse_packet(pkt)
        except Exception:
            self.dropped += 1
            return
        if rec is None:
            return
        rec.ts = time.time()
        with self._lock:
            self.packets += 1
            self.bytes += rec.length
            self.buffer.append(rec)

    def drain(self) -> list[PacketRecord]:
        with self._lock:
            items = list(self.buffer)
            self.buffer.clear()
        return items

    def start(self) -> None:
        from scapy.all import AsyncSniffer

        self.error = None
        self._sniffer = AsyncSniffer(iface=self.interface, prn=self._on_packet, store=False)
        try:
            self._sniffer.start()
        except Exception as exc:
            self._sniffer = None
            self.error = f"Capture on '{self.interface}' failed: {exc}"
            raise
        self.started_at = time.time()
        log.info("capturing on %s", self.interface)

    def stop(self) -> None:
        sniffer, self._sniffer = self._sniffer, None
        if sniffer is not None:
            try:
                sniffer.stop()
            except Exception:  # already stopped / thread died
                pass
