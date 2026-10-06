"""
Detection models for live traffic — real, trained on this machine.

* Isolation Forest — unsupervised anomaly detector fitted on benign windows.
* XGBoost — multi-class classifier (benign + four attack classes).
* SHAP TreeExplainer — per-feature attributions for every detection.

Models persist under backend/models/ so a restart does not need retraining.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import joblib
import numpy as np

from .features import FEATURE_KEYS
from .synthetic import CLASSES, generic_benign, training_set

log = logging.getLogger("nexus.live.models")
MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MIN_REAL_WINDOWS = 120  # ≈ 10 minutes of host-windows before trusting the real baseline


@dataclass
class ModelInfo:
    trained_at: float = 0.0
    benign_source: str = "synthetic"  # 'live' once trained on captured windows
    benign_rows: int = 0
    holdout_accuracy: float = 0.0
    holdout_macro_f1: float = 0.0
    classes: tuple[str, ...] = CLASSES
    baseline: dict[str, float] = field(default_factory=dict)


@dataclass
class Prediction:
    label: str
    confidence: float  # 0–1
    anomaly: float  # 0–1 calibrated (0.72 ≈ 99th percentile of benign)
    contributions: list[tuple[str, float]]  # SHAP (feature, value), sorted by |value|


class DetectionModels:
    def __init__(self, model_dir: Path = MODEL_DIR) -> None:
        self.model_dir = model_dir
        self.iso = None
        self.clf = None
        self._clf_explainer = None
        self._iso_explainer = None
        self._calib = (0.0, 1.0)  # raw-score p50, p99 of benign
        self.info = ModelInfo()

    @property
    def ready(self) -> bool:
        return self.iso is not None and self.clf is not None

    # ------------------------------------------------------------ training

    def train(self, real_benign: Optional[np.ndarray] = None, seed: int = 7, n_estimators: int = 160) -> ModelInfo:
        from sklearn.ensemble import IsolationForest
        from sklearn.metrics import accuracy_score, f1_score
        from sklearn.model_selection import train_test_split
        from xgboost import XGBClassifier

        rng = np.random.default_rng(seed)
        use_real = real_benign is not None and len(real_benign) >= MIN_REAL_WINDOWS
        benign = real_benign if use_real else generic_benign(1500, rng)
        assert benign is not None

        iso = IsolationForest(n_estimators=200, contamination="auto", random_state=seed)
        iso.fit(benign)
        raw = -iso.score_samples(benign)
        self._calib = (float(np.percentile(raw, 50)), float(np.percentile(raw, 99)))

        x, y = training_set(benign, per_class=max(300, len(benign) // 2), rng=rng)
        x_tr, x_te, y_tr, y_te = train_test_split(x, y, test_size=0.25, random_state=seed, stratify=y)
        clf = XGBClassifier(n_estimators=n_estimators, max_depth=5, learning_rate=0.15, subsample=0.9, colsample_bytree=0.9, eval_metric="mlogloss", random_state=seed)
        clf.fit(x_tr, y_tr)
        pred = clf.predict(x_te)

        self.iso, self.clf = iso, clf
        self._clf_explainer = None
        self._iso_explainer = None
        self.info = ModelInfo(
            trained_at=time.time(),
            benign_source="live" if use_real else "synthetic",
            benign_rows=len(benign),
            holdout_accuracy=float(accuracy_score(y_te, pred)),
            holdout_macro_f1=float(f1_score(y_te, pred, average="macro")),
            baseline={k: float(np.median(benign[:, i])) for i, k in enumerate(FEATURE_KEYS)},
        )
        log.info("models trained on %d %s benign windows — holdout accuracy %.3f", len(benign), self.info.benign_source, self.info.holdout_accuracy)
        return self.info

    # ------------------------------------------------------------ persistence

    def save(self) -> None:
        self.model_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump({"iso": self.iso, "clf": self.clf, "calib": self._calib}, self.model_dir / "live_models.joblib")
        (self.model_dir / "live_models.json").write_text(json.dumps(self.info.__dict__, default=list, indent=2))

    def load(self) -> bool:
        path = self.model_dir / "live_models.joblib"
        meta = self.model_dir / "live_models.json"
        if not path.exists() or not meta.exists():
            return False
        try:
            blob = joblib.load(path)
            self.iso, self.clf, self._calib = blob["iso"], blob["clf"], tuple(blob["calib"])
            data = json.loads(meta.read_text())
            data["classes"] = tuple(data.get("classes", CLASSES))
            self.info = ModelInfo(**data)
            return True
        except Exception:
            log.exception("could not load saved models — retraining")
            return False

    # ------------------------------------------------------------ inference

    def anomaly_scores(self, x: np.ndarray) -> np.ndarray:
        assert self.iso is not None
        raw = -self.iso.score_samples(x)
        p50, p99 = self._calib
        span = max(p99 - p50, 1e-6)
        return np.clip(0.15 + (raw - p50) / span * (0.72 - 0.15), 0, 1)

    def predict(self, x: np.ndarray) -> list[Prediction]:
        assert self.clf is not None
        probs = self.clf.predict_proba(x)
        anomalies = self.anomaly_scores(x)
        out = []
        for i in range(len(x)):
            k = int(np.argmax(probs[i]))
            out.append(Prediction(label=CLASSES[k], confidence=float(probs[i][k]), anomaly=float(anomalies[i]), contributions=[]))
        return out

    def explain(self, row: np.ndarray, label: str) -> list[tuple[str, float]]:
        """SHAP attributions toward `label` (classifier) or toward 'anomalous' (isolation forest)."""
        import shap

        x = row.reshape(1, -1)
        if label == "unknown_anomaly":
            if self._iso_explainer is None:
                self._iso_explainer = shap.TreeExplainer(self.iso)
            values = -np.asarray(self._iso_explainer.shap_values(x))[0]  # longer paths = normal → flip sign
        else:
            if self._clf_explainer is None:
                self._clf_explainer = shap.TreeExplainer(self.clf)
            sv = np.asarray(self._clf_explainer.shap_values(x))
            k = CLASSES.index(label)
            values = sv[0, :, k] if sv.ndim == 3 else sv[k][0]
        pairs = [(FEATURE_KEYS[i], float(values[i])) for i in range(len(FEATURE_KEYS))]
        return sorted(pairs, key=lambda p: -abs(p[1]))
