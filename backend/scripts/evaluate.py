"""
Reproducible evaluation of the NEXUS live-detection pipeline.

Run from backend/:  .venv/Scripts/python.exe scripts/evaluate.py
Writes eval_results.json next to this script and prints a summary.

Experiments
  E1  in-distribution holdout (real benign + synthetic attacks), 5 seeds
  E2  cross-domain: train on generic benign, test on real-network benign (+ attacks)
  E3  false-alert rate on held-out REAL benign windows (5-fold), full alert rule
  E4  low-intensity attacks below the training ranges
  E5  alert-rule ablation: classifier only / anomaly only / combined
  E6  explanation fidelity: do SHAP top-3 features include an injected feature?
  E7  latency: feature extraction, inference, SHAP
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support  # noqa: E402

from app.live.features import FEATURE_KEYS, PacketRecord, vector, window_features  # noqa: E402
import app.live.models as live_models  # noqa: E402
from app.live.models import DetectionModels  # noqa: E402

# Evaluation only: allow training on a fold of the real baseline (the shipped minimum is 120 windows).
live_models.MIN_REAL_WINDOWS = 60
from app.live.synthetic import CLASSES, IDX, _inject, generic_benign  # noqa: E402

ALERT_CONF, ALERT_ANOM, UNKNOWN_ANOM = 0.9, 0.6, 0.92
INJECTED = {
    "port_scan": {"uniq_dst_ports", "syn_rate", "out_pps", "syn_only_ratio", "rst_ratio", "mean_pkt_size", "uniq_dst_ips", "out_bps"},
    "brute_force": {"syn_rate", "uniq_dst_ports", "uniq_dst_ips", "out_pps", "rst_ratio", "syn_only_ratio", "mean_pkt_size", "out_bps"},
    "dns_anomaly": {"dns_rate", "dns_entropy", "nxdomain_ratio", "udp_share", "out_pps", "out_bps"},
    "ddos": {"in_pps", "uniq_src_ips", "out_in_ratio"},
}


def real_benign() -> np.ndarray:
    arr = np.load(ROOT / "data" / "live_baseline.npy")
    return arr


def attack_set(base: np.ndarray, per_class: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    xs, ys = [], []
    for i, label in enumerate(CLASSES[1:], start=1):
        b = base[rng.integers(0, len(base), per_class)]
        xs.append(_inject(b, label, rng))
        ys.append(np.full(per_class, i))
    return np.vstack(xs), np.concatenate(ys)


def alerts(models: DetectionModels, x: np.ndarray, rule: str = "combined") -> np.ndarray:
    preds = models.predict(x)
    out = []
    for p in preds:
        cls = p.label != "benign" and p.confidence >= ALERT_CONF
        anom = p.anomaly >= ALERT_ANOM
        if rule == "classifier":
            out.append(cls)
        elif rule == "anomaly":
            out.append(p.anomaly >= UNKNOWN_ANOM or anom and p.label != "benign")
        else:
            out.append((cls and anom) or (p.label == "benign" and p.anomaly >= UNKNOWN_ANOM))
    return np.array(out)


def per_class(y_true, y_pred) -> dict:
    p, r, f, s = precision_recall_fscore_support(y_true, y_pred, labels=range(len(CLASSES)), zero_division=0)
    return {c: {"precision": round(float(p[i]), 4), "recall": round(float(r[i]), 4), "f1": round(float(f[i]), 4), "support": int(s[i])} for i, c in enumerate(CLASSES)}


def main() -> None:
    real = real_benign()
    results: dict = {"real_benign_windows": int(len(real)), "features": list(FEATURE_KEYS)}
    print(f"real benign windows: {len(real)}")

    # ---------------- E1: in-distribution, 5 seeds (train with the shipped train())
    accs, f1s, pcs, cms = [], [], [], []
    for seed in range(5):
        m = DetectionModels(model_dir=ROOT / "models_test_tmp")
        rng = np.random.default_rng(1000 + seed)
        idx = rng.permutation(len(real))
        cut = int(len(real) * 0.75)
        m.train(real[idx[:cut]], seed=seed)
        test_benign = real[idx[cut:]]
        xa, ya = attack_set(real[idx[cut:]], 150, rng)
        x = np.vstack([test_benign, xa])
        y = np.concatenate([np.zeros(len(test_benign), int), ya])
        pred = np.array([CLASSES.index(p.label) for p in m.predict(x)])
        accs.append(accuracy_score(y, pred))
        f1s.append(f1_score(y, pred, average="macro"))
        pcs.append(per_class(y, pred))
        cms.append(confusion_matrix(y, pred, labels=range(len(CLASSES))).tolist())
    results["E1_in_distribution"] = {
        "note": "train() on 75% of real benign windows; test = the held-out 25% of real benign + synthetic attacks injected into those held-out windows",
        "accuracy_mean": round(float(np.mean(accs)), 4), "accuracy_sd": round(float(np.std(accs)), 4),
        "macro_f1_mean": round(float(np.mean(f1s)), 4), "macro_f1_sd": round(float(np.std(f1s)), 4),
        "per_class_seed0": pcs[0], "confusion_seed0": cms[0],
    }
    print("E1", results["E1_in_distribution"]["accuracy_mean"], results["E1_in_distribution"]["macro_f1_mean"])

    # ---------------- E2: cross-domain (generic benign -> this network)
    m_gen = DetectionModels(model_dir=ROOT / "models_test_tmp")
    m_gen.train(None, seed=0)  # generic benign profile
    rng = np.random.default_rng(7)
    xa, ya = attack_set(real, 150, rng)
    x = np.vstack([real, xa]); y = np.concatenate([np.zeros(len(real), int), ya])
    pred = np.array([CLASSES.index(p.label) for p in m_gen.predict(x)])
    fa_gen = float(alerts(m_gen, real).mean())
    m_real = DetectionModels(model_dir=ROOT / "models_test_tmp")
    m_real.train(real, seed=0)
    fa_real_in = float(alerts(m_real, real).mean())
    results["E2_cross_domain"] = {
        "trained_on": "generic synthetic benign", "tested_on": "real benign of this network + attacks injected into it",
        "accuracy": round(float(accuracy_score(y, pred)), 4), "macro_f1": round(float(f1_score(y, pred, average="macro")), 4),
        "benign_recall": per_class(y, pred)["benign"]["recall"],
        "alert_rate_on_real_benign_generic_model": round(fa_gen, 4),
        "alert_rate_on_real_benign_network_model_in_sample": round(fa_real_in, 4),
    }
    print("E2", results["E2_cross_domain"])

    # ---------------- E3: false alerts on held-out real benign, 5-fold
    folds = np.array_split(np.random.default_rng(3).permutation(len(real)), 5)
    fa, anom_rates = [], []
    for k, held in enumerate(folds):
        train_idx = np.setdiff1d(np.arange(len(real)), held)
        tr = real[train_idx]
        m = DetectionModels(model_dir=ROOT / "models_test_tmp")
        m.train(tr, seed=k)
        fa.append(float(alerts(m, real[held]).mean()))
        anom_rates.append(float((m.anomaly_scores(real[held]) >= 0.72).mean()))
    results["E3_false_alerts_heldout_real"] = {
        "windows_tested": int(len(real)), "alert_rate_mean": round(float(np.mean(fa)), 4), "alert_rate_per_fold": [round(v, 4) for v in fa],
        "share_above_anomaly_threshold_0.72": round(float(np.mean(anom_rates)), 4),
    }
    print("E3", results["E3_false_alerts_heldout_real"])

    # ---------------- E4: low-intensity attacks (below training ranges)
    rng = np.random.default_rng(11)
    n = 300
    base = real[rng.integers(0, len(real), n)]
    low = {}
    ps = _inject(base, "port_scan", rng); ports = rng.integers(5, 25, n)
    ps[:, IDX["uniq_dst_ports"]] = ports; ps[:, IDX["syn_rate"]] = ports / 5; ps[:, IDX["out_pps"]] = base[:, IDX["out_pps"]] + ports / 5
    bf = _inject(base, "brute_force", rng); att = rng.uniform(0.3, 2, n)
    bf[:, IDX["syn_rate"]] = att; bf[:, IDX["out_pps"]] = att * 8
    dd = _inject(base, "ddos", rng); dd[:, IDX["in_pps"]] = rng.uniform(150, 800, n); dd[:, IDX["uniq_src_ips"]] = rng.integers(10, 40, n)
    dn = _inject(base, "dns_anomaly", rng); dn[:, IDX["dns_rate"]] = rng.uniform(0.4, 1.5, n)
    for name, xs in {"port_scan_5_to_25_ports": ps, "brute_force_0.3_to_2_attempts_per_s": bf, "ddos_150_to_800_pps_10_to_40_sources": dd, "dns_0.4_to_1.5_queries_per_s": dn}.items():
        a = alerts(m_real, xs)
        preds = m_real.predict(xs)
        low[name] = {"alert_recall": round(float(a.mean()), 4), "classified_as_attack": round(float(np.mean([p.label != "benign" for p in preds])), 4)}
    results["E4_low_intensity"] = low
    print("E4", low)

    # ---------------- E5: alert rule ablation on held-out mix
    rng = np.random.default_rng(21)
    xa, _ = attack_set(real, 200, rng)
    abl = {}
    for rule in ("classifier", "anomaly", "combined"):
        abl[rule] = {"attack_alert_recall": round(float(alerts(m_real, xa, rule).mean()), 4), "benign_alert_rate_in_sample": round(float(alerts(m_real, real, rule).mean()), 4),
                     "generic_model_benign_alert_rate_on_real": round(float(alerts(m_gen, real, rule).mean()), 4)}
    rng = np.random.default_rng(22)
    per = {}
    for i, label in enumerate(CLASSES[1:], start=1):
        xs = _inject(real[rng.integers(0, len(real), 200)], label, rng)
        per[label] = {r: round(float(alerts(m_real, xs, r).mean()), 4) for r in ("classifier", "combined")}
        per[label]["mean_anomaly_score"] = round(float(np.mean(m_real.anomaly_scores(xs))), 3)
    abl["per_class_alert_recall"] = per
    results["E5_rule_ablation"] = abl
    print("E5", abl)

    # ---------------- E6: explanation fidelity
    rng = np.random.default_rng(31)
    fid = {}
    for label in CLASSES[1:]:
        xs = _inject(real[rng.integers(0, len(real), 40)], label, rng)
        hits = []
        for row in xs:
            top = [k for k, _ in m_real.explain(row, label)[:3]]
            hits.append(bool(set(top) & INJECTED[label]))
        fid[label] = round(float(np.mean(hits)), 4)
    results["E6_shap_top3_includes_injected_feature"] = fid
    print("E6", fid)

    # ---------------- E7: latency
    recs = []
    for h in range(20):
        for i in range(250):
            recs.append(PacketRecord(i * 0.02, f"192.168.1.{10 + h}", f"10.0.0.{i % 50}", "tcp", 600, 40000 + i, 443, ack=True))
    t0 = time.perf_counter()
    for _ in range(20):
        rows = window_features(recs)
    t_feat = (time.perf_counter() - t0) / 20
    x = np.asarray([vector(r) for r in rows.values()])
    t0 = time.perf_counter()
    for _ in range(50):
        m_real.predict(x)
    t_pred = (time.perf_counter() - t0) / 50
    m_real.explain(x[0], "port_scan")
    t0 = time.perf_counter()
    for i in range(20):
        m_real.explain(x[i % len(x)], "port_scan")
    t_shap = (time.perf_counter() - t0) / 20
    t0 = time.perf_counter()
    DetectionModels(model_dir=ROOT / "models_test_tmp").train(real, seed=0)
    t_train = time.perf_counter() - t0
    results["E7_latency_ms"] = {
        "feature_extraction_5000_packets_20_hosts": round(t_feat * 1000, 2), "inference_20_host_windows": round(t_pred * 1000, 2),
        "shap_one_detection": round(t_shap * 1000, 2), "full_training": round(t_train * 1000, 1),
    }
    print("E7", results["E7_latency_ms"])

    out = Path(__file__).with_name("eval_results.json")
    out.write_text(json.dumps(results, indent=2))
    print("wrote", out)


if __name__ == "__main__":
    main()
