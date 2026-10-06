"""
Simulated federated-learning deployment — docs/SIMULATED_DATASET.md §9.
A Flower / FedAvg server with Opacus DP-SGD clients would report the same shape.
"""

from __future__ import annotations

import math

from app.schemas import DifferentialPrivacyConfig, FederatedClient, PrivacyStatus, RoundAccuracy

from .rng import iso, round1

ROUNDS = 27
UPDATE_MB = 4.2

CLIENTS = (
    dict(id="fl-hospital", name="Hospital", kind="hospital", local_samples=1_840_000, local_accuracy=94.1, status="synced", update_size_mb=UPDATE_MB, epsilon_spent=1.6),
    dict(id="fl-university", name="University", kind="university", local_samples=2_310_000, local_accuracy=93.6, status="training", update_size_mb=UPDATE_MB, epsilon_spent=1.6),
    dict(id="fl-bank", name="Bank", kind="bank", local_samples=3_020_000, local_accuracy=95.2, status="synced", update_size_mb=UPDATE_MB, epsilon_spent=1.6),
)


def _curve(start: float, end: float, tau: float, rnd: int) -> float:
    """Saturating curve from `start` (round 1) to exactly `end` (round 27)."""
    norm = 1 - math.exp(-(ROUNDS - 1) / tau)
    return start + ((end - start) * (1 - math.exp(-(rnd - 1) / tau))) / norm


def _accuracy_by_round() -> list[RoundAccuracy]:
    return [
        RoundAccuracy(
            round=r,
            global_=round1(_curve(78, 96.2, 5.2, r)),
            hospital=round1(_curve(76.5, 94.1, 4, r)),
            university=round1(_curve(75.8, 93.6, 4, r)),
            bank=round1(_curve(77.1, 95.2, 4, r)),
        )
        for r in range(1, ROUNDS + 1)
    ]


def privacy_status(boot_ms: int) -> PrivacyStatus:
    return PrivacyStatus(
        is_simulated=True,
        clients=[FederatedClient(**c, last_update=iso(boot_ms - (2 * 3_600_000 - i * 95_000))) for i, c in enumerate(CLIENTS)],  # type: ignore[arg-type]
        training_rounds=ROUNDS,
        global_accuracy=96.2,
        raw_traffic_shared_gb=0,
        model_updates_shared_mb=round1(ROUNDS * len(CLIENTS) * UPDATE_MB),
        aggregation="FedAvg",
        secure_aggregation=True,
        differential_privacy=DifferentialPrivacyConfig(enabled=True, mechanism="Gaussian mechanism (DP-SGD)", epsilon=1.8, delta=1e-5, noise_multiplier=1.1, clipping_norm=1.0),
        accuracy_by_round=_accuracy_by_round(),
    )
