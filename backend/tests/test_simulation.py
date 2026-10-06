"""Attack simulator — the primary demo flow (spec §35) runs end to end."""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.engine.service import NexusService, ServiceError
from app.schemas import AssistantRequest, DefenseSettingsPatch, ResponseDecisionRequest, SimulationRequest

FAST = 0.02  # 25 s scenario → 0.5 s


def run(coro):
    return asyncio.run(coro)


async def _wait_until(predicate, timeout: float = 5.0) -> None:
    deadline = asyncio.get_running_loop().time() + timeout
    while not predicate():
        if asyncio.get_running_loop().time() > deadline:
            raise TimeoutError
        await asyncio.sleep(0.01)


def _stage_sequence(service: NexusService) -> list[str]:
    _, messages, _ = service.bus.since(0, limit=100_000)
    seen: list[str] = []
    for m in messages:
        if m["type"] == "simulation.update":
            stage = m["simulation"]["currentStage"]
            if not seen or seen[-1] != stage:
                seen.append(stage)
    return seen


def test_port_scan_autonomous_demo_flow() -> None:
    async def scenario() -> NexusService:
        svc = NexusService(simulation_time_scale=FAST)
        sim = svc.simulate(SimulationRequest(attack="port_scan"))
        assert sim.status == "running" and sim.target_device_id == "pc-07" and sim.mode == "autonomous"
        assert svc._simulation_task is not None
        await asyncio.wait_for(svc._simulation_task, timeout=5)
        return svc

    svc = run(scenario())
    sim_run = svc.simulation
    assert sim_run and sim_run.sim.status == "completed" and sim_run.record
    t = sim_run.record.threat
    assert (t.name, t.confidence, t.risk_score, t.severity, t.status, t.response_time_ms) == ("Port Scan", 96.4, 89, "high", "quarantined", 142)
    assert [f.contribution for f in t.features] == [0.31, 0.24, 0.18, 0.12, 0.08]
    assert [a.label for a in t.actions] == ["Source IP blocked", "Device quarantined", "Firewall rule updated", "Administrator notified"]
    assert all(a.status == "done" for a in t.actions)
    assert "73 unique destination ports" in t.explanation and "isolated the device" in t.explanation

    pc07 = next(d for d in svc.devices() if d.id == "pc-07")
    assert pc07.status == "quarantined" and pc07.risk_score == 89
    assert next(n for n in svc.network().nodes if n.id == "pc-07").status == "blocked"

    assert _stage_sequence(svc) == ["normal", "traffic_spike", "anomaly_detected", "classified", "risk_assessed", "threat_mapped", "responding", "blocked", "recovered"]

    detail = svc.threat_detail(t.id)
    assert detail.response.message == "Threat detected. Mitigation automatically executed."
    assert detail.replay is not None and detail.timeline[-1].label == "Network recovered"

    answer = svc.ask(AssistantRequest(message="Why was PC-07 blocked?"))
    assert "PC-07 (192.168.1.44) was quarantined" in answer.content
    assert "89/100" in answer.content and "73 unique destination ports" in answer.content and "142 ms" in answer.content


def test_manual_mode_waits_for_approval() -> None:
    async def scenario() -> tuple[NexusService, str]:
        svc = NexusService(simulation_time_scale=FAST)
        svc.update_settings(DefenseSettingsPatch(autonomous_mode=False))
        svc.simulate(SimulationRequest(attack="port_scan"))
        await _wait_until(lambda: bool(svc.simulation and svc.simulation.awaiting))
        assert svc.simulation and svc.simulation.record
        threat = svc.simulation.record.threat
        assert threat.status == "awaiting_approval" and all(a.status == "pending" for a in threat.actions if a.kind != "notify_admin")
        await asyncio.sleep(0.2)  # nothing proceeds without a decision
        assert svc.simulation.awaiting
        response = svc.decide(ResponseDecisionRequest(threat_id=threat.id, decision="approve"))
        assert response.decided_by == "administrator" and response.state == "completed"
        assert svc._simulation_task is not None
        await asyncio.wait_for(svc._simulation_task, timeout=5)
        return svc, threat.id

    svc, threat_id = run(scenario())
    t = svc.state.by_id[threat_id].threat
    assert t.status == "quarantined" and t.response_time_ms is not None and t.response_time_ms > 142
    assert "administrator approved" in t.explanation
    assert "awaiting_approval" in _stage_sequence(svc)


def test_manual_mode_reject_keeps_monitoring() -> None:
    async def scenario() -> NexusService:
        svc = NexusService(simulation_time_scale=FAST)
        svc.update_settings(DefenseSettingsPatch(autonomous_mode=False))
        svc.simulate(SimulationRequest(attack="malware"))
        await _wait_until(lambda: bool(svc.simulation and svc.simulation.awaiting))
        assert svc.simulation and svc.simulation.record
        svc.decide(ResponseDecisionRequest(threat_id=svc.simulation.record.threat.id, decision="reject"))
        assert svc._simulation_task is not None
        await asyncio.wait_for(svc._simulation_task, timeout=5)
        return svc

    svc = run(scenario())
    assert svc.simulation and svc.simulation.record
    t = svc.simulation.record.threat
    assert t.status == "monitoring" and all(a.status in ("skipped", "done") for a in t.actions)
    assert "rejected containment" in t.explanation


def test_only_one_simulation_at_a_time() -> None:
    async def scenario() -> None:
        svc = NexusService(simulation_time_scale=FAST)
        svc.simulate(SimulationRequest(attack="ddos"))
        with pytest.raises(ServiceError) as err:
            svc.simulate(SimulationRequest(attack="port_scan"))
        assert err.value.status == 409
        await svc.shutdown()

    run(scenario())


def test_ddos_attack_path_and_health() -> None:
    async def scenario() -> NexusService:
        svc = NexusService(simulation_time_scale=FAST)
        svc.simulate(SimulationRequest(attack="ddos"))
        await _wait_until(lambda: bool(svc.simulation and svc.simulation.sim.current_stage == "threat_mapped"))
        links = {link.id: link.status for link in svc.network().links}
        assert links["internet->fw-01"] == "attack" and links["sw-srv->server-01"] == "attack"
        svc.heartbeat()
        assert svc.state.network_health < 93
        dash = svc.dashboard()
        assert dash.status == "under_attack" and dash.metrics.active_threats == 4
        assert svc._simulation_task is not None
        await asyncio.wait_for(svc._simulation_task, timeout=5)
        return svc

    svc = run(scenario())
    assert svc.simulation and svc.simulation.record
    t = svc.simulation.record.threat
    assert (t.severity, t.status, t.response_time_ms) == ("critical", "blocked", 104)
    assert all(link.status in ("normal", "suspicious") for link in svc.network().links if link.id.startswith(("internet", "fw-01", "rtr-01->sw-srv")))
    assert svc.dashboard().status == "operational"


def test_unknown_anomaly_is_monitored_not_blocked() -> None:
    async def scenario() -> NexusService:
        svc = NexusService(simulation_time_scale=FAST)
        svc.simulate(SimulationRequest(attack="unknown_anomaly"))
        assert svc._simulation_task is not None
        await asyncio.wait_for(svc._simulation_task, timeout=5)
        return svc

    svc = run(scenario())
    assert svc.simulation and svc.simulation.record
    t = svc.simulation.record.threat
    assert (t.risk_score, t.severity, t.status) == (55, "medium", "monitoring")
    assert "below the auto-response threshold" in t.explanation


def test_websocket_streams_sequenced_messages(client: TestClient) -> None:
    with client.websocket_connect("/ws/events") as ws:
        hello = ws.receive_json()
        assert hello["messages"] == []
        client.patch("/api/settings", json={"notifyAdministrator": False})
        frame = ws.receive_json()
        assert frame["seq"] > hello["seq"] and frame["messages"][0]["type"] == "settings.update"
    with client.websocket_connect(f"/ws/events?after={hello['seq']}") as ws:
        backlog = ws.receive_json()
        assert any(m["type"] == "settings.update" for m in backlog["messages"])
    client.patch("/api/settings", json={"notifyAdministrator": True})


def test_simulate_endpoint(client: TestClient) -> None:
    res = client.post("/api/simulate", json={"attack": "brute_force"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "running" and body["targetDeviceId"] == "server-02" and len(body["stages"]) == 9
    again = client.post("/api/simulate", json={"attack": "port_scan"})
    assert again.status_code == 409
