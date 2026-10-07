"""Phase 4: live feature extraction, trained models, detection pipeline and LLM fallback.

No packets are captured here — PacketRecords are synthesized and fed to the
same code paths the sniffer uses.
"""

from __future__ import annotations

import asyncio
import copy
from pathlib import Path

import numpy as np
import pytest

from app.engine.llm import GroqNarrator
from app.engine.service import NexusService
from app.live.features import FEATURE_KEYS, PacketRecord, name_entropy, vector, window_features
from app.live.models import DetectionModels
from app.schemas import AssistantRequest

SCANNER = "192.168.1.66"


def benign_records(t0: float = 0.0) -> list[PacketRecord]:
    out = []
    for i in range(40):
        out.append(PacketRecord(t0 + i * 0.1, "192.168.1.10", "142.250.1.1", "tcp", 900, 50000 + i % 3, 443, ack=True))
        out.append(PacketRecord(t0 + i * 0.1, "142.250.1.1", "192.168.1.10", "tcp", 1400, 443, 50000, ack=True))
    out.append(PacketRecord(t0, "192.168.1.10", "192.168.1.1", "udp", 80, 53000, 53, dns_query="www.example.com"))
    return out


def scan_records(t0: float = 0.0) -> list[PacketRecord]:
    return [PacketRecord(t0 + i * 0.004, SCANNER, f"192.168.1.{20 + i % 30}", "tcp", 60, 41000, 1 + i, syn=True) for i in range(1200)]


@pytest.fixture(scope="module")
def models(tmp_path_factory: pytest.TempPathFactory) -> DetectionModels:
    m = DetectionModels(model_dir=Path(tmp_path_factory.mktemp("models")))
    m.train(n_estimators=60)
    return m


def test_window_features_capture_scan_shape() -> None:
    rows = window_features(benign_records() + scan_records())
    scan, normal = rows[SCANNER], rows["192.168.1.10"]
    assert scan["uniq_dst_ports"] >= 1000 and scan["syn_only_ratio"] > 0.95
    assert normal["uniq_dst_ports"] <= 2 and normal["syn_rate"] == 0
    assert len(vector(scan)) == len(FEATURE_KEYS) == 15
    assert name_entropy("x7f3kq9z2w8v.example.com") > name_entropy("www.example.com")


def test_models_train_persist_and_classify(models: DetectionModels) -> None:
    assert models.ready and models.info.holdout_accuracy > 0.95
    rows = window_features(benign_records() + scan_records())
    x = np.asarray([vector(rows[SCANNER]), vector(rows["192.168.1.10"])])
    scan, normal = models.predict(x)
    assert scan.label == "port_scan" and scan.confidence > 0.9 and scan.anomaly > normal.anomaly
    assert normal.label == "benign"
    top = [k for k, _ in models.explain(x[0], "port_scan")[:4]]
    assert {"uniq_dst_ports", "syn_only_ratio", "syn_rate", "out_pps"} & set(top)

    models.save()
    clone = DetectionModels(model_dir=models.model_dir)
    assert clone.load() and clone.predict(x)[0].label == "port_scan"


def test_engine_raises_explained_live_detection(models: DetectionModels) -> None:
    service = NexusService()
    engine = service.live
    engine.models = models
    engine.phase = "detecting"
    before = len(service.state.records)

    engine._window = benign_records() + scan_records()
    asyncio.run(engine._close_window())

    assert len(service.state.records) == before + 1
    threat = service.threats(limit=1)[0]
    assert threat.id in engine.detections and threat.type == "port_scan"
    detail = service.threat_detail(threat.id)
    assert detail.features and all(f.key in FEATURE_KEYS for f in detail.features)
    assert SCANNER in detail.explanation
    assert engine.status()["hosts"][0]["ip"] == SCANNER

    # Debounced: the same host/class does not re-alert within the window.
    engine._window = scan_records(5.0)
    asyncio.run(engine._close_window())
    assert len(service.state.records) == before + 1


def test_live_status_route_without_capture(client) -> None:  # noqa: ANN001
    res = client.get("/api/live/status")
    assert res.status_code == 200
    body = res.json()
    assert body["running"] is False and body["phase"] == "stopped"
    assert {"available", "reason", "model", "hosts", "detections"} <= body.keys()


def test_narrator_falls_back_to_rule_based_answer(monkeypatch: pytest.MonkeyPatch) -> None:
    service = NexusService()
    request = AssistantRequest(message="Why was PC-07 quarantined?")
    rule_based = service.ask(request)

    async def failing(self, question, draft, context):  # noqa: ANN001, ANN202
        return None

    async def narrating(self, question, draft, context):  # noqa: ANN001, ANN202
        assert "active_threats" in context and "metrics" in context
        return "Narrated answer."

    service.narrator = GroqNarrator("test-key")
    monkeypatch.setattr(GroqNarrator, "narrate", failing)
    reply = asyncio.run(service.ask_async(request))
    assert reply.content == rule_based.content and reply.generated_by == rule_based.generated_by

    monkeypatch.setattr(GroqNarrator, "narrate", narrating)
    reply = asyncio.run(service.ask_async(request))
    assert reply.content == "Narrated answer." and "Groq" in reply.generated_by
    assert reply.evidence == rule_based.evidence


def test_ignored_virtual_networks_never_alert(models: DetectionModels) -> None:
    service = NexusService()
    engine = service.live
    engine.models = models
    engine.phase = "detecting"
    before = len(service.state.records)
    docker = "172.17.44.108"
    engine._window = [PacketRecord(i * 0.004, docker, f"192.168.1.{20 + i % 30}", "tcp", 60, 41000, 1 + i, syn=True) for i in range(1200)]
    asyncio.run(engine._close_window())
    assert len(service.state.records) == before
    assert docker in engine.hosts  # still scored and visible


def test_replay_test_raises_explained_detection_without_network(models: DetectionModels) -> None:
    service = NexusService()
    service.live.models = models
    threat_id = asyncio.run(service.live.replay_test("port_scan"))
    detail = service.threat_detail(threat_id)
    assert detail.type == "port_scan" and detail.explanation.startswith("Test replay")
    assert "192.0.2.66" in detail.source_ip or "192.0.2.66" in detail.explanation


def test_false_positive_allowlists_host_and_dismisses(models: DetectionModels) -> None:
    service = NexusService()
    engine = service.live
    engine.models = copy.deepcopy(models)  # false-positive feedback retrains the model
    engine.phase = "detecting"
    engine._window = scan_records()
    asyncio.run(engine._close_window())
    threat_id = engine.detections[-1]
    result = asyncio.run(service.mark_false_positive(threat_id))
    assert result["allowlisted"] and result["host"] == SCANNER
    assert service.state.by_id[threat_id].threat.status == "dismissed"
    assert SCANNER in engine.allowed and any(r["ip"] == SCANNER for r in engine.store.allowlist())
    # The same host no longer alerts, even after the debounce window.
    engine._last_alert.clear()
    before = len(service.state.records)
    engine._window = scan_records(10.0)
    asyncio.run(engine._close_window())
    assert len(service.state.records) == before


def test_live_detections_survive_restart(models: DetectionModels, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NEXUS_DB_FILE", str(tmp_path / "nexus.db"))
    first = NexusService()
    first.live.models = copy.deepcopy(models)
    first.live.phase = "detecting"
    first.live._window = scan_records()
    asyncio.run(first.live._close_window())
    asyncio.run(first.mark_false_positive(first.live.detections[-1]))
    first.live.store.close()

    second = NexusService()
    assert len(second.live.detections) == 1
    restored = second.state.by_id[second.live.detections[0]]
    assert restored.threat.type == "port_scan" and restored.threat.status == "dismissed"
    assert SCANNER in second.live.allowed
