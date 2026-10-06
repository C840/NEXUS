"""Deterministic randomness for the simulated environment (mulberry32, seed "NEXU")."""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import datetime, timezone
from typing import TypeVar

T = TypeVar("T")

DATASET_SEED = 0x4E455855  # "NEXU"
MASK32 = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    return ((a & MASK32) * (b & MASK32)) & MASK32


class Random:
    """mulberry32 — the same generator (and call semantics) as the original TypeScript mock."""

    def __init__(self, seed: int = DATASET_SEED) -> None:
        self._a = seed & MASK32

    def next(self) -> float:
        self._a = (self._a + 0x6D2B79F5) & MASK32
        a = self._a
        t = _imul(a ^ (a >> 15), 1 | a)
        t = ((t + _imul(t ^ (t >> 7), 61 | t)) & MASK32) ^ t
        return ((t ^ (t >> 14)) & MASK32) / 4294967296

    def float(self, lo: float, hi: float) -> float:
        return lo + (hi - lo) * self.next()

    def int(self, lo: int, hi: int) -> int:
        return math.floor(lo + (hi - lo + 1) * self.next())

    def pick(self, items: Sequence[T]) -> T:
        return items[math.floor(self.next() * len(items))]

    def weighted(self, entries: Sequence[tuple[T, float]]) -> T:
        total = sum(w for _, w in entries)
        r = self.next() * total
        for value, w in entries:
            r -= w
            if r <= 0:
                return value
        return entries[-1][0]

    def chance(self, p: float) -> bool:
        return self.next() < p

    def normal(self, mean: float, sd: float) -> float:
        u = max(self.next(), 1e-9)
        v = self.next()
        return mean + sd * math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)


def hash_noise(key: int) -> float:
    """Stateless hash noise in [0, 1) for an integer key — time-indexed noise."""
    k = key & MASK32
    h = _imul(k ^ 0x9E3779B9, 0x85EBCA6B)
    h ^= h >> 13
    h = _imul(h, 0xC2B2AE35)
    h ^= h >> 16
    return (h & MASK32) / 4294967296


def clamp(v: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, v))


def round1(v: float) -> float:
    return math.floor(v * 10 + 0.5) / 10


def js_round(v: float) -> int:
    """JavaScript Math.round semantics (halves round up), unlike Python's banker's rounding."""
    return math.floor(v + 0.5)


# ------------------------------------------------------------------ time

def now_ms() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp() * 1000)


def iso(ms: float) -> str:
    """Epoch ms → '2026-10-06T12:41:03.000Z' (identical to JavaScript toISOString)."""
    dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def parse_iso(value: str) -> int:
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)


def local(ms: float) -> datetime:
    """Local wall-clock time for diurnal patterns and 'today' buckets."""
    return datetime.fromtimestamp(ms / 1000)
