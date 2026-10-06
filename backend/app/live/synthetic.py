"""
Synthetic attack profiles for training the live classifier.

No labelled dataset is installed, so attack rows are synthesized by injecting
each attack's signature into *real* benign windows captured from this network
(or generic benign rows before enough real traffic has been seen). This is
stated wherever the model is shown. Drop a labelled dataset in later and the
same training entry point can use it instead.
"""

from __future__ import annotations

import numpy as np

from .features import FEATURE_KEYS

CLASSES = ("benign", "port_scan", "brute_force", "dns_anomaly", "ddos")
IDX = {k: i for i, k in enumerate(FEATURE_KEYS)}


def generic_benign(n: int, rng: np.random.Generator) -> np.ndarray:
    """Plausible office/home host behavior — used only until real baseline windows exist."""
    x = np.zeros((n, len(FEATURE_KEYS)))
    x[:, IDX["out_pps"]] = rng.lognormal(1.5, 1.0, n)
    x[:, IDX["mean_pkt_size"]] = rng.uniform(80, 1200, n)
    x[:, IDX["out_bps"]] = x[:, IDX["out_pps"]] * x[:, IDX["mean_pkt_size"]] / 1024
    x[:, IDX["uniq_dst_ips"]] = rng.integers(1, 12, n)
    x[:, IDX["uniq_dst_ports"]] = np.minimum(x[:, IDX["uniq_dst_ips"]] + rng.integers(0, 4, n), 15)
    x[:, IDX["syn_rate"]] = rng.exponential(0.3, n)
    x[:, IDX["syn_only_ratio"]] = rng.beta(1, 25, n)
    x[:, IDX["rst_ratio"]] = rng.beta(1, 40, n)
    x[:, IDX["udp_share"]] = rng.beta(2, 5, n)
    x[:, IDX["dns_rate"]] = rng.exponential(0.15, n)
    x[:, IDX["dns_entropy"]] = np.where(x[:, IDX["dns_rate"]] > 0.02, rng.normal(2.9, 0.35, n), 0)
    x[:, IDX["nxdomain_ratio"]] = rng.beta(1, 30, n)
    x[:, IDX["in_pps"]] = x[:, IDX["out_pps"]] * rng.uniform(0.5, 2.5, n)
    x[:, IDX["uniq_src_ips"]] = rng.integers(1, 10, n)
    x[:, IDX["out_in_ratio"]] = rng.lognormal(-0.4, 0.8, n)
    return np.clip(x, 0, None)


def _inject(base: np.ndarray, label: str, rng: np.random.Generator) -> np.ndarray:
    x = base.copy()
    n = len(x)

    def put(key: str, values: np.ndarray) -> None:
        x[:, IDX[key]] = values

    if label == "port_scan":
        ports = rng.integers(25, 1500, n)
        put("uniq_dst_ports", ports)
        put("syn_rate", ports / 5 * rng.uniform(0.7, 1.2, n))
        put("out_pps", x[:, IDX["out_pps"]] + ports / 5 * rng.uniform(1, 2.5, n))
        put("syn_only_ratio", rng.uniform(0.55, 0.99, n))
        put("rst_ratio", rng.uniform(0.0, 0.5, n))
        put("mean_pkt_size", rng.uniform(54, 80, n))
        put("uniq_dst_ips", rng.integers(1, 40, n))
    elif label == "brute_force":
        attempts = rng.uniform(2, 40, n)
        put("syn_rate", attempts)
        put("uniq_dst_ports", rng.integers(1, 3, n))
        put("uniq_dst_ips", rng.integers(1, 3, n))
        put("out_pps", attempts * rng.uniform(6, 14, n))
        put("rst_ratio", rng.uniform(0.08, 0.45, n))
        put("syn_only_ratio", rng.uniform(0.05, 0.3, n))
        put("mean_pkt_size", rng.uniform(90, 200, n))
    elif label == "dns_anomaly":
        put("dns_rate", rng.uniform(1.5, 30, n))
        put("dns_entropy", rng.uniform(3.8, 5.2, n))
        put("nxdomain_ratio", rng.uniform(0.12, 0.7, n))
        put("udp_share", rng.uniform(0.7, 1.0, n))
        put("out_pps", x[:, IDX["out_pps"]] + x[:, IDX["dns_rate"]] * rng.uniform(1, 2, n))
    elif label == "ddos":
        put("in_pps", rng.uniform(800, 120_000, n))
        put("uniq_src_ips", rng.integers(40, 5000, n))
        put("out_in_ratio", rng.uniform(0.001, 0.2, n))
    x[:, IDX["out_bps"]] = x[:, IDX["out_pps"]] * x[:, IDX["mean_pkt_size"]] / 1024
    return np.clip(x, 0, None)


def training_set(benign: np.ndarray, per_class: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Benign rows + synthetic attacks injected into resampled benign rows."""
    xs, ys = [benign], [np.zeros(len(benign), dtype=int)]
    for label_idx, label in enumerate(CLASSES[1:], start=1):
        base = benign[rng.integers(0, len(benign), per_class)]
        xs.append(_inject(base, label, rng))
        ys.append(np.full(per_class, label_idx))
    return np.vstack(xs), np.concatenate(ys)
