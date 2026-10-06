"""Analytics aggregated from the threat history — docs/SIMULATED_DATASET.md §4 and §8."""

from __future__ import annotations

from datetime import datetime, timedelta

from app.schemas import (
    AnalyticsData,
    AnalyticsRange,
    AnalyticsSummary,
    ApproachComparison,
    AttacksOverTimePoint,
    ConfidenceBucket,
    CountBySeverity,
    CountByType,
    Device,
    MaliciousSource,
    ModelMetrics,
    ModelPerformance,
    RatePoint,
    ResponseTimePoint,
    RocPoint,
    TargetedDevice,
)

from .rng import js_round, local, parse_iso, round1
from .threats import ThreatRecord

TYPE_LABEL = {
    "port_scan": "Port Scan",
    "brute_force": "Brute Force",
    "ddos": "DDoS",
    "dns_anomaly": "DNS Anomaly",
    "malware": "Malware Behavior",
    "unknown_anomaly": "Unknown Anomaly",
}
SEVERITIES = ("critical", "high", "medium", "low")
CONTAINED = frozenset({"blocked", "quarantined", "resolved"})


def _roc_curve(auc: float) -> list[RocPoint]:
    """ROC points for tpr = 1 − (1 − fpr)^k, whose area is k / (k + 1)."""
    k = auc / (1 - auc)
    xs = (0, 0.002, 0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.06, 0.08, 0.1, 0.13, 0.17, 0.22, 0.3, 0.4, 0.5, 0.65, 0.8, 1)
    return [RocPoint(fpr=x, tpr=round((1 - (1 - x) ** k) * 10000) / 10000) for x in xs]


# Simulated evaluation (§8). Metrics are macro-averaged over the six classes of
# the confusion matrix, which is constructed so they are all consistent.
MODEL_PERFORMANCE = ModelPerformance(
    is_simulated=True,
    disclaimer=(
        "Prototype metrics from a simulated evaluation — not results from real experiments. Replace with measured results after "
        "training on a labelled dataset (e.g. CIC-IDS2017)."
    ),
    metrics=ModelMetrics(accuracy=96.7, precision=95.8, recall=94.9, f1=95.3),
    comparison=[
        ApproachComparison(approach="Traditional detection", description="Signature / rule matching only", accuracy=91.4, precision=93.1, recall=84.6, f1=88.6),
        ApproachComparison(approach="Anomaly detection", description="Isolation Forest only", accuracy=87.2, precision=81.4, recall=90.3, f1=85.6),
        ApproachComparison(approach="Hybrid NEXUS", description="Classifier + anomaly detector + risk engine", accuracy=96.7, precision=95.8, recall=94.9, f1=95.3),
    ],
    confusion_labels=["Benign", "DDoS", "Port Scan", "Brute Force", "DNS Anomaly", "Malware"],
    confusion_matrix=[
        [4935, 4, 20, 13, 15, 13],
        [3, 893, 4, 0, 0, 0],
        [38, 0, 1528, 12, 10, 12],
        [37, 0, 15, 1040, 0, 8],
        [44, 0, 0, 0, 626, 30],
        [20, 0, 6, 0, 30, 644],
    ],
    roc_curve=_roc_curve(0.987),
    auc=0.987,
)


def _buckets(range_key: AnalyticsRange, now: int) -> list[tuple[int, int]]:
    today = local(now).replace(hour=0, minute=0, second=0, microsecond=0)
    if range_key == "today":
        out = []
        start = today
        while start.timestamp() * 1000 <= now:
            nxt = start + timedelta(hours=1)
            out.append((int(start.timestamp() * 1000), int(nxt.timestamp() * 1000)))
            start = nxt
        return out
    days = 7 if range_key == "7d" else 30
    out = []
    for i in range(days - 1, -1, -1):
        day: datetime = today - timedelta(days=i)
        out.append((int(day.timestamp() * 1000), int((day + timedelta(days=1)).timestamp() * 1000)))
    return out


def _mean(xs: list[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0


def _p95(xs: list[int]) -> int:
    if not xs:
        return 0
    ordered = sorted(xs)
    return ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))]


def compute_analytics(range_key: AnalyticsRange, records: list[ThreatRecord], devices: list[Device], now: int) -> AnalyticsData:
    buckets = _buckets(range_key, now)
    start = buckets[0][0]
    stamped = [(parse_iso(r.threat.timestamp), r) for r in records]
    in_range = [(ts, r) for ts, r in stamped if start <= ts <= now]
    detections = [(ts, r) for ts, r in in_range if r.threat.status != "dismissed"]
    contained = [(ts, r) for ts, r in detections if r.threat.status in CONTAINED and r.threat.response_time_ms is not None]

    def in_bucket(b: tuple[int, int], rows: list[tuple[int, ThreatRecord]]) -> list[ThreatRecord]:
        return [r for ts, r in rows if b[0] <= ts < b[1]]

    attacks_over_time = []
    for b in buckets:
        rows = in_bucket(b, detections)
        counts = {s: sum(1 for r in rows if r.threat.severity == s) for s in SEVERITIES}
        attacks_over_time.append(AttacksOverTimePoint(t=b[0], **counts))

    by_type: dict[str, int] = {}
    for _, r in detections:
        by_type[r.threat.type] = by_type.get(r.threat.type, 0) + 1
    attacks_by_type = sorted(
        (CountByType(type=t, label=label, count=by_type.get(t, 0)) for t, label in TYPE_LABEL.items()),  # type: ignore[arg-type]
        key=lambda c: -c.count,
    )
    attacks_by_severity = [CountBySeverity(severity=s, count=sum(1 for _, r in detections if r.threat.severity == s)) for s in SEVERITIES]  # type: ignore[arg-type]

    device_by_id = {d.id: d for d in devices}
    targets: dict[str, int] = {}
    for _, r in detections:
        if r.target.device_id:
            targets[r.target.device_id] = targets.get(r.target.device_id, 0) + 1
    top_targeted = [
        TargetedDevice(device_id=k, hostname=device_by_id[k].hostname if k in device_by_id else k, ip=device_by_id[k].ip if k in device_by_id else "", count=v)
        for k, v in sorted(targets.items(), key=lambda kv: -kv[1])[:6]
    ]

    sources: dict[str, dict[str, object]] = {}
    for _, r in detections:
        if r.source.internal:
            continue
        cur = sources.setdefault(r.threat.source_ip, {"label": r.source.label.replace("External · ", ""), "count": 0, "listed": False})
        cur["count"] = int(cur["count"]) + 1  # type: ignore[call-overload]
        cur["listed"] = bool(cur["listed"]) or "threat_intel" in r.threat.detected_by
    top_sources = [
        MaliciousSource(ip=ip, label=str(v["label"]), count=int(v["count"]), reputation="malicious" if v["listed"] else "suspicious")  # type: ignore[call-overload]
        for ip, v in sorted(sources.items(), key=lambda kv: -int(kv[1]["count"]))[:6]  # type: ignore[call-overload]
    ]

    response_time = []
    last_avg, last_p95 = 142, 210
    for b in buckets:
        times = [r.threat.response_time_ms or 0 for r in in_bucket(b, contained)]
        if times:
            last_avg, last_p95 = js_round(_mean(times)), _p95(times)
        response_time.append(ResponseTimePoint(t=b[0], avg_ms=last_avg, p95_ms=last_p95))

    run_total = run_fp = 0
    fp_trend = []
    for b in buckets:
        rows = in_bucket(b, in_range)
        fp = sum(1 for r in rows if r.threat.status == "dismissed")
        if range_key == "today":
            run_total += len(rows)
            run_fp += fp
            fp_trend.append(RatePoint(t=b[0], value=round1(run_fp / run_total * 100) if run_total else 0))
        else:
            fp_trend.append(RatePoint(t=b[0], value=round1(fp / len(rows) * 100) if rows else 0))

    conf_buckets = (("0–60", 0, 60), ("60–70", 60, 70), ("70–80", 70, 80), ("80–90", 80, 90), ("90–100", 90, 101))
    detection_confidence = [ConfidenceBucket(bucket=label, count=sum(1 for _, r in detections if lo <= r.threat.confidence < hi)) for label, lo, hi in conf_buckets]

    summary = AnalyticsSummary(
        total_attacks=len(detections),
        blocked=sum(1 for _, r in detections if r.threat.status in CONTAINED),
        avg_response_ms=js_round(_mean([r.threat.response_time_ms or 0 for _, r in contained])),
        false_positive_rate=round1((len(in_range) - len(detections)) / len(in_range) * 100) if in_range else 0,
        mean_confidence=round1(_mean([r.threat.confidence for _, r in detections])),
    )

    return AnalyticsData(
        range=range_key,
        summary=summary,
        attacks_over_time=attacks_over_time,
        attacks_by_type=attacks_by_type,
        attacks_by_severity=attacks_by_severity,
        top_targeted_devices=top_targeted,
        top_malicious_sources=top_sources,
        response_time=response_time,
        false_positive_trend=fp_trend,
        detection_confidence=detection_confidence,
        model_performance=MODEL_PERFORMANCE,
    )
