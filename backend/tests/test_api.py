"""HTTP contract — JSON shapes must match frontend/src/types exactly."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json()["status"] == "ok"


def test_dashboard_is_camel_case(client: TestClient) -> None:
    body = client.get("/api/dashboard").json()
    assert set(body) == {"status", "metrics", "securityScore", "latestResponse", "featuredIntel", "settings", "dataSource"}
    assert body["metrics"] == {
        "securityScore": 94,
        "activeThreats": 3,
        "threatsBlocked": 127,
        "devicesProtected": 42,
        "networkHealth": body["metrics"]["networkHealth"],
        "avgResponseMs": 142,
    }
    assert body["securityScore"]["delta24h"] == 2
    assert body["dataSource"]["mode"] == "simulation"


def test_optional_fields_are_omitted_nullable_fields_are_null(client: TestClient) -> None:
    threats = client.get("/api/threats", params={"limit": 50}).json()
    monitoring = next(t for t in threats if t["status"] == "monitoring")
    assert monitoring["responseTimeMs"] is None  # nullable → present as null
    external = next(t for t in threats if t["sourceIp"].endswith("xx") and t["type"] == "port_scan")
    assert "deviceId" in external  # perimeter target device
    unknown = next((t for t in client.get("/api/threats", params={"type": "unknown_anomaly", "limit": 5}).json()), None)
    assert unknown is not None and "mitre" not in unknown  # optional → omitted


def test_threat_filters(client: TestClient) -> None:
    rows = client.get("/api/threats", params={"severity": "critical", "limit": 20}).json()
    assert rows and all(t["severity"] == "critical" for t in rows)
    assert client.get("/api/threats", params={"search": "185.23"}).json()[0]["sourceIp"] == "185.23.xx.xx"


def test_threat_detail_and_404(client: TestClient) -> None:
    first = client.get("/api/threats", params={"limit": 1}).json()[0]
    detail = client.get(f"/api/threats/{first['id']}").json()
    assert {"riskFactors", "timeline", "response", "models"} <= set(detail)
    missing = client.get("/api/threats/THR-1")
    assert missing.status_code == 404 and "not found" in missing.json()["detail"]


def test_device_bytes_aliases(client: TestClient) -> None:
    device = client.get("/api/devices").json()[0]
    assert "bytesIn24h" in device and "bytesOut24h" in device and "threatIds" in device


def test_privacy_round_alias(client: TestClient) -> None:
    rows = client.get("/api/privacy").json()["accuracyByRound"]
    assert rows[-1]["global"] == 96.2 and "global_" not in rows[-1]


def test_response_conflict_on_non_pending(client: TestClient) -> None:
    first = client.get("/api/threats", params={"status": "blocked", "limit": 1}).json()[0]
    res = client.post("/api/response", json={"threatId": first["id"], "decision": "approve"})
    assert res.status_code == 409


def test_assistant(client: TestClient) -> None:
    body = client.post("/api/assistant", json={"message": "Explain the latest DDoS attack."}).json()
    assert body["generatedBy"].startswith("NEXUS Analyst") and body["references"]
    assert client.post("/api/assistant", json={"message": ""}).status_code == 422


def test_settings_patch_and_clamp(client: TestClient) -> None:
    res = client.patch("/api/settings", json={"autoResponseThreshold": 150})
    assert res.status_code == 200 and res.json()["autoResponseThreshold"] == 100
    client.patch("/api/settings", json={"autoResponseThreshold": 70})


def test_realtime_poll_cursor(client: TestClient) -> None:
    cursor = client.get("/api/realtime/poll").json()
    assert cursor["messages"] == [] and cursor["seq"] >= 0
    client.patch("/api/settings", json={"notifyAdministrator": False})
    after = client.get("/api/realtime/poll", params={"after": cursor["seq"]}).json()
    assert any(m["type"] == "settings.update" for m in after["messages"])
    client.patch("/api/settings", json={"notifyAdministrator": True})


def test_access_token_guards_shared_backend(service) -> None:  # noqa: ANN001
    from fastapi.testclient import TestClient

    from app.config import Config
    from app.main import create_app

    app = create_app(Config(cors_origins=["https://c840.github.io"], live=False, access_token="s3cret"), service=service)
    with TestClient(app) as c:  # TestClient's client host is "testclient": treated as remote
        assert c.get("/api/health").status_code == 200
        assert c.get("/api/dashboard").status_code == 401
        assert c.get("/api/dashboard", headers={"X-Nexus-Token": "wrong"}).status_code == 401
        assert c.get("/api/dashboard", headers={"X-Nexus-Token": "s3cret"}).status_code == 200
        assert c.get("/api/dashboard?token=s3cret").status_code == 200
        pre = c.options("/api/dashboard", headers={"Origin": "https://c840.github.io", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "x-nexus-token"})
        assert pre.status_code == 200
        with c.websocket_connect("/ws/events?token=s3cret") as ws:
            assert "seq" in ws.receive_json()
