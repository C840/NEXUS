"""Invariants of the simulated environment — docs/SIMULATED_DATASET.md."""

from __future__ import annotations

from app.engine.rng import js_round
from app.engine.service import NexusService
from app.schemas import AssistantRequest, DefenseSettingsPatch


def level(score: int) -> str:
    return "critical" if score >= 90 else "high" if score >= 70 else "medium" if score >= 40 else "low"


def test_headline_metrics(service: NexusService) -> None:
    d = service.dashboard()
    assert d.metrics.devices_protected == 42
    assert d.metrics.active_threats == 3
    assert d.metrics.threats_blocked == 127
    assert d.metrics.avg_response_ms == 142
    assert d.metrics.security_score == d.security_score.score == 94
    assert abs(d.metrics.network_health - 98.2) < 0.15
    assert d.status == "operational"
    assert d.latest_response is not None and d.latest_response.threat_name == "DDoS Attack" and d.latest_response.response_time_ms == 118
    assert [i.ip for i in d.featured_intel] == ["185.23.xx.xx", "45.155.xx.xx", "103.75.xx.xx"]


def test_device_story(service: NexusService) -> None:
    devices = {d.id: d for d in service.devices()}
    assert devices["pc-07"].status == "safe" and devices["pc-07"].risk_score == 12 and devices["pc-07"].ip == "192.168.1.44"
    for suspicious in ("pc-03", "iot-04", "server-03"):
        assert devices[suspicious].status == "suspicious"
    assert sorted(d.status for d in devices.values()).count("safe") == 39


def test_featured_threats_exact(service: NexusService) -> None:
    threats = service.threats(limit=5000)
    ddos = next(t for t in threats if t.source_ip == "185.23.xx.xx")
    assert (ddos.confidence, ddos.risk_score, ddos.severity, ddos.status, ddos.response_time_ms) == (98.1, 94, "critical", "blocked", 118)
    dns = next(t for t in threats if t.type == "dns_anomaly" and t.device_id == "pc-03" and t.status == "monitoring")
    assert (dns.confidence, dns.risk_score, dns.severity) == (81.2, 47, "medium")
    brute = next(t for t in threats if t.source_ip == "45.155.xx.xx")
    assert (brute.risk_score, brute.severity, brute.response_time_ms) == (78, "high", 156)
    assert [f.contribution for f in ddos.features] == [0.34, 0.22, 0.15, 0.09, 0.07]


def test_risk_engine_consistency(service: NexusService) -> None:
    threats = service.threats(limit=5000)
    assert 3000 < len(threats) < 4500
    for t in threats[::7][:400]:
        detail = service.threat_detail(t.id)
        assert js_round(sum(f.value * f.weight for f in detail.risk_factors)) == detail.risk_score
        assert level(detail.risk_score) == detail.severity
        assert len(detail.timeline) >= 7


def test_ddos_replay(service: NexusService) -> None:
    ddos = next(t for t in service.threats(limit=5000) if t.source_ip == "185.23.xx.xx")
    detail = service.threat_detail(ddos.id)
    assert detail.replay is not None and detail.replay.duration_sec == 25 and len(detail.replay.markers) == 8
    peak = max(f.pps for f in detail.replay.frames)
    assert abs(peak - 182_400) < 182_400 * 0.03
    assert detail.response.message == "Threat detected. Mitigation automatically executed."


def test_analytics_totals_agree(service: NexusService) -> None:
    for rng in ("today", "7d", "30d"):
        a = service.analytics(rng)  # type: ignore[arg-type]
        over_time = sum(p.critical + p.high + p.medium + p.low for p in a.attacks_over_time)
        assert over_time == a.summary.total_attacks == sum(c.count for c in a.attacks_by_type) == sum(c.count for c in a.attacks_by_severity)


def test_model_metrics_derive_from_confusion_matrix(service: NexusService) -> None:
    m = service.analytics("30d").model_performance
    cm = m.confusion_matrix
    total = sum(map(sum, cm))
    accuracy = sum(cm[i][i] for i in range(len(cm))) / total * 100
    recall = sum(cm[i][i] / sum(cm[i]) for i in range(len(cm))) / len(cm) * 100
    precision = sum(cm[j][j] / sum(row[j] for row in cm) for j in range(len(cm))) / len(cm) * 100
    assert (round(accuracy, 1), round(precision, 1), round(recall, 1)) == (m.metrics.accuracy, m.metrics.precision, m.metrics.recall)
    assert m.is_simulated and "simulated" in m.disclaimer.lower()


def test_traffic_ranges(service: NexusService) -> None:
    sizes = {"live": 120, "1h": 60, "6h": 72, "24h": 96, "7d": 84}
    for rng, n in sizes.items():
        series = service.traffic(rng)  # type: ignore[arg-type]
        assert len(series.points) == n and all(p.pps > 0 for p in series.points)
    hour = service.traffic("1h")
    spike = max(hour.points, key=lambda p: p.pps)
    assert spike.pps > 2 * spike.baseline_pps and spike.anomaly


def test_topology(service: NexusService) -> None:
    net = service.network()
    assert len(net.nodes) == 43 and len(net.links) == 42
    assert sum(1 for n in net.nodes if n.status == "suspicious") == 3


def test_privacy(service: NexusService) -> None:
    p = service.privacy()
    assert (len(p.clients), p.training_rounds, p.global_accuracy, p.raw_traffic_shared_gb) == (3, 27, 96.2, 0)
    assert p.accuracy_by_round[-1].global_ == 96.2


def test_assistant_answers_spec_questions(service: NexusService) -> None:
    for q in (
        "Why was PC-07 blocked?",
        "What is today's highest-risk threat?",
        "Which device is most vulnerable?",
        "Explain the latest DDoS attack.",
        "What actions did NEXUS take?",
        "What changed in the network today?",
    ):
        reply = service.ask(AssistantRequest(message=q))
        assert not reply.content.startswith("I can investigate") and len(reply.content) > 80, q
    pc07 = service.ask(AssistantRequest(message="Why was PC-07 blocked?"))
    assert "has not been blocked" in pc07.content


def test_manual_mode_lowers_score(fresh_service: NexusService) -> None:
    fresh_service.update_settings(DefenseSettingsPatch(autonomous_mode=False))
    assert fresh_service.dashboard().security_score.score == 92
    fresh_service.update_settings(DefenseSettingsPatch(autonomous_mode=True))
    assert fresh_service.dashboard().security_score.score == 94
