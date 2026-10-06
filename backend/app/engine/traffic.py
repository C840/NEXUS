"""
Traffic model (docs/SIMULATED_DATASET.md §6): diurnal baseline + smooth
deterministic noise + incident overlays. Every value is a pure function of
time, so live ticks and historical ranges always agree.

A real deployment replaces this module with aggregates computed from captured
flows (Scapy / CICFlowMeter) — the TrafficPoint shape stays the same.
"""

from __future__ import annotations

import bisect
import math
from dataclasses import dataclass
from typing import Optional

from app.schemas import AttackType, TrafficPoint, TrafficRange, TrafficSeries

from .rng import hash_noise, js_round, local, round1

MEAN_PACKET_BYTES = 420

RANGE_SPEC: dict[str, tuple[int, int]] = {
    "live": (120, 1),
    "1h": (60, 60),
    "6h": (72, 300),
    "24h": (96, 900),
    "7d": (84, 7200),
}


@dataclass(eq=False)
class TrafficOverlay:
    attack: AttackType
    detected_at: int
    start: int
    mitigation_start: float
    end: float
    peak_multiplier: float
    packet_bytes: int
    anomaly_peak: float
    contained: bool


def baseline_pps(t: float) -> float:
    """Learned normal packet rate: ≈ 8k pps at 04:00 → ≈ 15.5k at 16:00, weekends × 0.7."""
    d = local(t)
    hour = d.hour + d.minute / 60
    shape = 0.5 - 0.5 * math.cos((2 * math.pi * (hour - 4)) / 24)
    weekend = 0.7 if d.weekday() >= 5 else 1.0
    return (8000 + 7500 * shape**1.15) * weekend


def _smoothstep(x: float) -> float:
    return x * x * (3 - 2 * x)


def _noise(t: float) -> float:
    s = t / 1000
    k = math.floor(s / 10)
    f = s / 10 - k
    a = hash_noise(k)
    b = hash_noise(k + 1)
    slow = a + (b - a) * _smoothstep(f)
    jitter = hash_noise(math.floor(s) * 7919)
    return (slow - 0.5) * 0.05 + (jitter - 0.5) * 0.02


def _background_anomaly(t: float) -> float:
    return 0.04 + hash_noise(math.floor(t / 1000) * 31) * 0.14


def overlay_factor(o: TrafficOverlay, t: float) -> float:
    """Overlay intensity 0–1 at time t: ramp up → hold → decay."""
    if t < o.start or t > o.end:
        return 0.0
    if t < o.detected_at:
        return _smoothstep((t - o.start) / max(1, o.detected_at - o.start))
    if t <= o.mitigation_start:
        return 1.0
    return 1 - _smoothstep((t - o.mitigation_start) / max(1, o.end - o.mitigation_start))


class OverlayIndex:
    """Overlays sorted by start for windowed lookup."""

    def __init__(self, overlays: list[TrafficOverlay] | None = None) -> None:
        self._items: list[TrafficOverlay] = []
        self._starts: list[int] = []
        self._max_span = 0.0
        for o in overlays or []:
            self.add(o)

    def add(self, o: TrafficOverlay) -> None:
        i = bisect.bisect_right(self._starts, o.start)
        self._items.insert(i, o)
        self._starts.insert(i, o.start)
        self._max_span = max(self._max_span, o.end - o.start)

    def remove(self, o: TrafficOverlay) -> None:
        for i, item in enumerate(self._items):
            if item is o:
                del self._items[i]
                del self._starts[i]
                return

    def between(self, lo: float, hi: float) -> list[TrafficOverlay]:
        out: list[TrafficOverlay] = []
        i = bisect.bisect_right(self._starts, hi) - 1
        while i >= 0:
            o = self._items[i]
            if o.start < lo - self._max_span:
                break
            if o.end >= lo:
                out.append(o)
            i -= 1
        return out


def traffic_point(t: int, overlays: OverlayIndex, threshold: float) -> TrafficPoint:
    """Exact sample at time t (live resolution)."""
    base = baseline_pps(t)
    observed_base = base * (1 + _noise(t))
    extra_pps = 0.0
    extra_bytes = 0.0
    anomaly = _background_anomaly(t)
    attack: Optional[AttackType] = None
    phase = None
    strongest = 0.0
    for o in overlays.between(t, t):
        f = overlay_factor(o, t)
        if f <= 0:
            continue
        extra = base * (o.peak_multiplier - 1) * f
        extra_pps += extra
        extra_bytes += extra * o.packet_bytes
        anomaly = max(anomaly, 0.1 + (o.anomaly_peak - 0.1) * min(1.0, f * 1.25))
        if o.contained and f > 0.05 and f >= strongest:
            strongest = f
            attack = o.attack
            phase = "attack" if t <= o.mitigation_start else "mitigation"
    return TrafficPoint(
        t=int(t),
        pps=js_round(observed_base + extra_pps),
        mbps=round1(((observed_base * MEAN_PACKET_BYTES + extra_bytes) * 8) / 1e6),
        baseline_pps=js_round(base),
        baseline_mbps=round1((base * MEAN_PACKET_BYTES * 8) / 1e6),
        anomaly_score=js_round(anomaly * 100) / 100,
        anomaly=anomaly >= threshold,
        attack=attack,
        phase=phase,
    )


def _bucket_point(start: int, step_ms: int, overlays: OverlayIndex, threshold: float) -> TrafficPoint:
    """Mean over a bucket; short incidents contribute in proportion to their duration."""
    samples = 12
    base_sum = 0.0
    observed_sum = 0.0
    anomaly = 0.0
    for s in range(samples):
        t = start + ((s + 0.5) / samples) * step_ms
        b = baseline_pps(t)
        base_sum += b
        observed_sum += b * (1 + _noise(t))
        anomaly = max(anomaly, _background_anomaly(t))
    base = base_sum / samples
    observed_base = observed_sum / samples
    extra_pps = 0.0
    extra_bytes = 0.0
    attack: Optional[AttackType] = None
    strongest = 0.0
    for o in overlays.between(start, start + step_ms):
        lo = max(start, o.start)
        hi = min(start + step_ms, o.end)
        steps = min(4000, max(1, js_round((hi - lo) / 1000)))
        dt = (hi - lo) / steps
        integral = sum(overlay_factor(o, lo + (k + 0.5) * dt) * dt for k in range(steps))
        share = integral / step_ms
        extra = baseline_pps(o.detected_at) * (o.peak_multiplier - 1) * share
        extra_pps += extra
        extra_bytes += extra * o.packet_bytes
        anomaly = max(anomaly, o.anomaly_peak)
        if o.contained and o.peak_multiplier >= 1.3 and extra >= strongest:
            strongest = extra
            attack = o.attack
    return TrafficPoint(
        t=int(start),
        pps=js_round(observed_base + extra_pps),
        mbps=round1(((observed_base * MEAN_PACKET_BYTES + extra_bytes) * 8) / 1e6),
        baseline_pps=js_round(base),
        baseline_mbps=round1((base * MEAN_PACKET_BYTES * 8) / 1e6),
        anomaly_score=js_round(anomaly * 100) / 100,
        anomaly=anomaly >= threshold,
        attack=attack,
        phase="attack" if attack else None,
    )


def traffic_series(rng_key: TrafficRange, now: int, overlays: OverlayIndex, threshold: float) -> TrafficSeries:
    count, step_sec = RANGE_SPEC[rng_key]
    step_ms = step_sec * 1000
    if rng_key == "live":
        end = (now // 1000) * 1000
        points = [traffic_point(end - i * 1000, overlays, threshold) for i in range(count - 1, -1, -1)]
    else:
        end = (now // step_ms) * step_ms
        points = [_bucket_point(end - i * step_ms, step_ms, overlays, threshold) for i in range(count - 1, -1, -1)]
    return TrafficSeries(range=rng_key, resolution_sec=step_sec, points=points)
