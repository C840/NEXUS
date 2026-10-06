"""
LiveEngine — real detection on captured traffic.

    Scapy capture → 1 s traffic ticks → 5 s host windows → features
      → Isolation Forest (anomaly) + XGBoost (class) → SHAP (why)
      → risk engine → NEXUS threat / event / response (same views as the simulator)

Warm-up: the first windows are treated as this network's normal baseline
(no alerts), then both models are retrained on that real traffic.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from collections import deque
from pathlib import Path
from typing import TYPE_CHECKING, Optional

import numpy as np

from app.engine.catalog import Outcome, Party
from app.engine.events import detection_event
from app.engine.rng import iso, js_round
from app.engine.state import add_record, next_threat_id
from app.engine.threats import RecordSpec, explicit_actions, make_record
from app.realtime import message
from app.schemas import DataSourceInfo, FeatureContribution, TrafficPoint

from .capture import PacketCapture, capture_available, list_interfaces
from .features import FEATURE_BY_KEY, FEATURE_KEYS, WINDOW_SEC, PacketRecord, is_local, vector, window_features
from .models import MIN_REAL_WINDOWS, DetectionModels

if TYPE_CHECKING:
    from app.engine.service import NexusService

log = logging.getLogger("nexus.live")
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
BASELINE_FILE = DATA_DIR / "live_baseline.npy"

NAMES = {"port_scan": "Port Scan", "brute_force": "Brute Force", "dns_anomaly": "DNS Anomaly", "ddos": "DDoS Attack", "unknown_anomaly": "Unknown Anomaly"}
BEHAVIORAL = {"port_scan": 75, "brute_force": 70, "dns_anomaly": 62, "ddos": 88, "unknown_anomaly": 45}
ALERT_CONFIDENCE = 0.9
ALERT_ANOMALY = 0.6
UNKNOWN_ANOMALY = 0.92
DEBOUNCE_SEC = 120


class LiveEngine:
    def __init__(self, service: NexusService) -> None:
        self.service = service
        self.interface = os.getenv("NEXUS_CAPTURE_IFACE", "Wi-Fi")
        self.models = DetectionModels()
        self.capture: Optional[PacketCapture] = None
        self.error: Optional[str] = None
        self.phase = "stopped"  # stopped | training | warming_up | detecting
        self.windows = 0
        self.detections: list[str] = []
        self.hosts: dict[str, dict[str, float]] = {}
        self._window: list[PacketRecord] = []
        self._window_started = time.time()
        self._baseline_rows: list[list[float]] = self._load_baseline()
        self._last_alert: dict[tuple[str, str], float] = {}
        self._pps_baseline: Optional[float] = None
        self._last_point: Optional[TrafficPoint] = None
        self._recent_anomaly = deque(maxlen=10)
        self._task: Optional[asyncio.Task[None]] = None

    # ------------------------------------------------------------ status

    @property
    def running(self) -> bool:
        return self.capture is not None and self.capture.running

    def data_source(self) -> Optional[DataSourceInfo]:
        if not self.running:
            return None
        return DataSourceInfo(
            mode="live_capture",
            label=f"Live capture · {self.interface}",
            description="Traffic, anomaly scores and live detections come from packets captured on this machine. Devices, history and the attack simulator remain simulated for demonstration.",
        )

    def status(self) -> dict[str, object]:
        available, reason = capture_available()
        cap = self.capture
        info = self.models.info
        hosts = sorted(self.hosts.items(), key=lambda kv: -(kv[1].get("out_pps", 0) + kv[1].get("in_pps", 0)))[:12]
        return {
            "available": available,
            "reason": reason or self.error,
            "running": self.running,
            "phase": self.phase,
            "interface": self.interface,
            "interfaces": list_interfaces() if available else [],
            "startedAt": iso(cap.started_at * 1000) if cap and cap.started_at else None,
            "packets": cap.packets if cap else 0,
            "bytes": cap.bytes if cap else 0,
            "pps": self._last_point.pps if self._last_point and self.running else 0,
            "windows": self.windows,
            "baselineWindows": len(self._baseline_rows),
            "requiredWindows": MIN_REAL_WINDOWS,
            "hosts": [
                {
                    "ip": ip,
                    "local": is_local(ip),
                    "outPps": round(row.get("out_pps", 0), 1),
                    "inPps": round(row.get("in_pps", 0), 1),
                    "uniqDstPorts": int(row.get("uniq_dst_ports", 0)),
                    "uniqDstIps": int(row.get("uniq_dst_ips", 0)),
                    "dnsRate": round(row.get("dns_rate", 0), 2),
                    "anomaly": round(row.get("_anomaly", 0), 2),
                    "label": row.get("_label", "benign"),
                }
                for ip, row in hosts
            ],
            "model": {
                "ready": self.models.ready,
                "trainedAt": iso(info.trained_at * 1000) if info.trained_at else None,
                "benignSource": info.benign_source,
                "benignRows": info.benign_rows,
                "holdoutAccuracy": round(info.holdout_accuracy * 100, 1),
                "holdoutMacroF1": round(info.holdout_macro_f1 * 100, 1),
                "classes": list(info.classes),
            },
            "detections": list(reversed(self.detections[-20:])),
        }

    # ------------------------------------------------------------ lifecycle

    async def ensure_models(self) -> None:
        if self.models.ready:
            return
        if not self.models.load():
            self.phase = "training"
            await asyncio.get_running_loop().run_in_executor(None, self.models.train, self._real_baseline())
            self.models.save()

    async def start(self, interface: Optional[str] = None) -> None:
        if self.running:
            return
        available, reason = capture_available()
        if not available:
            self.error = reason
            raise RuntimeError(reason)
        self.interface = interface or self.interface
        await self.ensure_models()
        self.capture = PacketCapture(self.interface)
        try:
            self.capture.start()
        except Exception as exc:
            self.error = str(exc)
            self.capture = None
            raise RuntimeError(self.error) from exc
        self.error = None
        self.phase = "detecting" if self.models.info.benign_source == "live" else "warming_up"
        self._window, self._window_started = [], time.time()
        self._task = asyncio.get_running_loop().create_task(self._loop())
        self._publish_source()

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None
        if self.capture:
            self.capture.stop()
        self.capture = None
        self.phase = "stopped"
        self._last_point = None
        self._publish_source()

    async def retrain(self) -> None:
        self.phase = "training"
        await asyncio.get_running_loop().run_in_executor(None, self.models.train, self._real_baseline())
        self.models.save()
        self.phase = "detecting" if self.models.info.benign_source == "live" else ("warming_up" if self.running else "stopped")

    def _publish_source(self) -> None:
        source = self.data_source() or self.service.static_data_source()
        self.service.bus.publish(message("datasource.update", dataSource=source))

    # ------------------------------------------------------------ baseline

    def _load_baseline(self) -> list[list[float]]:
        try:
            if BASELINE_FILE.exists():
                arr = np.load(BASELINE_FILE)
                if arr.ndim == 2 and arr.shape[1] == len(FEATURE_KEYS):
                    return arr.tolist()
        except Exception:
            log.warning("ignoring unreadable baseline file")
        return []

    def _real_baseline(self) -> Optional[np.ndarray]:
        return np.asarray(self._baseline_rows) if len(self._baseline_rows) >= MIN_REAL_WINDOWS else None

    def _save_baseline(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        np.save(BASELINE_FILE, np.asarray(self._baseline_rows[-20_000:]))

    # ------------------------------------------------------------ loop

    async def _loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(1.0)
                self._tick()
                if time.time() - self._window_started >= WINDOW_SEC:
                    await self._close_window()
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("live loop iteration failed")

    def _tick(self) -> None:
        assert self.capture
        records = self.capture.drain()
        self._window.extend(records)
        now = time.time()
        pps = len(records)
        mbps = sum(r.length for r in records) * 8 / 1e6
        if self._pps_baseline is None:
            self._pps_baseline = float(pps)
        alpha = 0.02 if self.phase == "detecting" else 0.1
        self._pps_baseline = (1 - alpha) * self._pps_baseline + alpha * pps
        anomaly = max(self._recent_anomaly, default=0.05)
        self._last_point = TrafficPoint(
            t=int(now) * 1000,
            pps=pps,
            mbps=round(mbps, 2),
            baseline_pps=js_round(self._pps_baseline),
            baseline_mbps=round(self._pps_baseline * (mbps / pps if pps else 0.0), 2),
            anomaly_score=round(anomaly, 2),
            anomaly=anomaly >= self.service.state.settings.anomaly_threshold,
            attack=None,
            phase=None,
        )

    def live_point(self) -> Optional[TrafficPoint]:
        return self._last_point if self.running else None

    async def _close_window(self) -> None:
        records, self._window = self._window, []
        self._window_started = time.time()
        rows = window_features(records, WINDOW_SEC)
        self.windows += 1
        if not rows:
            return
        ips = list(rows)
        x = np.asarray([vector(rows[ip]) for ip in ips])
        preds = self.models.predict(x) if self.models.ready else []
        self._recent_anomaly.append(max((p.anomaly for p in preds), default=0.05))
        self.hosts = {}
        for ip, p in zip(ips, preds):
            rows[ip]["_anomaly"] = p.anomaly
            rows[ip]["_label"] = p.label  # type: ignore[assignment]
            self.hosts[ip] = rows[ip]

        if self.phase == "warming_up":
            self._baseline_rows.extend(x.tolist())
            if len(self._baseline_rows) % 20 < len(ips):
                self._save_baseline()
            if len(self._baseline_rows) >= MIN_REAL_WINDOWS:
                log.info("baseline complete (%d windows) — retraining on live traffic", len(self._baseline_rows))
                self._save_baseline()
                await self.retrain()
            return
        if self.phase != "detecting":
            return

        for i, (ip, p) in enumerate(zip(ips, preds)):
            label: Optional[str] = None
            if p.label != "benign" and p.confidence >= ALERT_CONFIDENCE and p.anomaly >= ALERT_ANOMALY:
                label = p.label
            elif p.label == "benign" and p.anomaly >= UNKNOWN_ANOMALY:
                label = "unknown_anomaly"
            if label is None:
                continue
            key = (ip, label)
            if time.time() - self._last_alert.get(key, 0) < DEBOUNCE_SEC:
                continue
            self._last_alert[key] = time.time()
            self._raise(ip, label, rows[ip], x[i], p.confidence if label != "unknown_anomaly" else max(0.5, p.anomaly * 0.8), p.anomaly)

    # ------------------------------------------------------------ detections

    def _contributions(self, row: np.ndarray, label: str, confidence: float) -> list[FeatureContribution]:
        raw = self.models.explain(row, label)[:5]
        total = sum(abs(v) for _, v in raw) or 1.0
        base = self.models.info.baseline
        out = []
        for key, value in raw:
            fd = FEATURE_BY_KEY[key]
            out.append(
                FeatureContribution(
                    key=key,
                    label=fd.label,
                    contribution=round(value / total * confidence, 2),
                    observed=fd.render(float(row[FEATURE_KEYS.index(key)])),
                    baseline=f"≈ {fd.render(base.get(key, 0.0))}",
                )
            )
        return out

    def _raise(self, ip: str, label: str, row: dict[str, float], vec: np.ndarray, confidence: float, anomaly: float) -> None:
        s = self.service.state
        settings = s.settings
        features = self._contributions(vec, label, confidence)
        conf_pct = round(confidence * 100, 1)
        factors = (conf_pct, float(round(anomaly * 100)), float(BEHAVIORAL[label]), 5.0)
        risk = js_round(sum(factors) / 4)
        local = is_local(ip)

        if label == "ddos":
            source = Party(ip=f"{int(row['uniq_src_ips'])} sources", label=f"External · {int(row['uniq_src_ips'])} sources", internal=False)
            target = Party(ip=ip, label=f"Live host {ip}", internal=local)
        else:
            source = Party(ip=ip, label=f"Live host {ip}", internal=local)
            target_label = {
                "port_scan": f"{int(row['uniq_dst_ips'])} hosts · {int(row['uniq_dst_ports'])} ports",
                "brute_force": "Authentication service",
                "dns_anomaly": "DNS resolvers",
                "unknown_anomaly": "Multiple destinations",
            }[label]
            target = Party(ip="multiple", label=target_label, internal=True)

        if risk < settings.auto_response_threshold:
            outcome: Outcome = "monitoring"
        elif not settings.autonomous_mode:
            outcome = "awaiting_approval"
        else:
            outcome = "blocked"
        now = int(time.time() * 1000)
        if outcome == "monitoring":
            rows = [("increase_monitoring", "Host placed under watch", ip, "done", None), ("notify_admin", "Administrator notified", "SOC on-call", "done", None)]
        else:
            status = "pending" if outcome == "awaiting_approval" else "done"
            rows = [
                ("block_ip", "Source IP blocked", ip, status, "Enforcement simulated — no firewall integration in the prototype"),
                ("notify_admin", "Administrator notified", "SOC on-call", "done", None),
            ]
        top = features[:2]
        details = " and ".join(f"{f.label.lower()} {f.observed} ({f.baseline.replace('≈ ', 'baseline ≈ ')})" for f in top)
        if label == "unknown_anomaly":
            explanation = (
                f"The Isolation Forest flagged live host {ip}: its traffic deviates from this network's learned baseline — {details}. "
                f"No attack class matched with high confidence, so NEXUS labelled it an unknown anomaly (anomaly score {anomaly:.2f})."
            )
        else:
            explanation = (
                f"NEXUS flagged live host {ip} for probable {NAMES[label].lower()} behavior: {details}. "
                f"The XGBoost classifier (trained on this network's baseline plus synthetic attack profiles) assigned {conf_pct:.1f}% confidence; "
                f"the Isolation Forest anomaly score was {anomaly:.2f}. Attributions are normalized SHAP values."
            )
        if outcome == "blocked":
            explanation += f" Risk {risk} exceeded the auto-response threshold ({settings.auto_response_threshold}); enforcement is simulated in this prototype."
        elif outcome == "monitoring":
            explanation += f" Risk {risk} is below the auto-response threshold ({settings.auto_response_threshold}), so NEXUS is monitoring the host."

        s.rule_no += 1
        spec = RecordSpec(
            attack=label,  # type: ignore[arg-type]
            timestamp=now,
            source=source,
            target=target,
            factors=factors,
            features=features,
            explanation=explanation,
            signal=f"{features[0].label}: {features[0].observed}" if features else "Live anomaly",
            outcome=outcome,
            response_time_ms=None if outcome != "blocked" else 120,
            rule_no=s.rule_no,
            related_event_count=1,
            mode="autonomous" if settings.autonomous_mode else "manual",
            actions=explicit_actions(f"live-{now}", now, 120, rows),  # type: ignore[arg-type]
            detected_by=("anomaly",) if label == "unknown_anomaly" else ("classifier", "anomaly"),
        )
        record = make_record(spec, next_threat_id(s))
        record.extra["live"] = True
        add_record(s, record)
        self.detections.append(record.threat.id)
        self.service.bus.publish(message("threat.upsert", threat=record.threat))
        self.service.publish_event(detection_event(record.threat))
        self.service.publish_metrics()
        log.info("live detection %s: %s from %s (conf %.2f, anomaly %.2f, risk %d)", record.threat.id, label, ip, confidence, anomaly, risk)
