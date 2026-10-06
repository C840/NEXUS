"""
REST API — the contract the frontend's NexusApi implements against
(frontend/src/services/api/types.ts).
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request

from app.engine.service import NexusService
from app.schemas import (
    AnalyticsData,
    AnalyticsRange,
    AssistantReply,
    AssistantRequest,
    AttackScenario,
    AttackType,
    DashboardSummary,
    DefenseSettings,
    DefenseSettingsPatch,
    Device,
    EventSeverity,
    NetworkTopology,
    PrivacyStatus,
    RealtimePoll,
    ResponseDecisionRequest,
    ResponseExecution,
    SecurityEvent,
    Severity,
    SimulationRequest,
    SimulationState,
    SystemInfo,
    Threat,
    ThreatDetail,
    ThreatStatus,
    TrafficRange,
    TrafficSeries,
)

router = APIRouter(prefix="/api")


def get_service(request: Request) -> NexusService:
    return request.app.state.service


Service = Depends(get_service)


@router.get("/health", tags=["system"])
async def health(service: NexusService = Service) -> dict[str, object]:
    return {"status": "ok", "threats": len(service.state.records), "devices": len(service.state.devices), "seq": service.bus.seq}


@router.get("/dashboard", response_model=DashboardSummary, tags=["dashboard"])
async def dashboard(service: NexusService = Service) -> DashboardSummary:
    return service.dashboard()


@router.get("/threats", response_model=list[Threat], tags=["threats"])
async def threats(
    severity: Optional[Severity] = None,
    status: Optional[ThreatStatus] = None,
    type: Optional[AttackType] = None,  # noqa: A002 — mirrors the query parameter name
    search: Optional[str] = Query(default=None, max_length=200),
    limit: int = Query(default=250, ge=1, le=5000),
    service: NexusService = Service,
) -> list[Threat]:
    return service.threats(severity, status, type, search, limit)


@router.get("/threats/{threat_id}", response_model=ThreatDetail, tags=["threats"])
async def threat_detail(threat_id: str, service: NexusService = Service) -> ThreatDetail:
    return service.threat_detail(threat_id)


@router.get("/devices", response_model=list[Device], tags=["devices"])
async def devices(service: NexusService = Service) -> list[Device]:
    return service.devices()


@router.get("/network", response_model=NetworkTopology, tags=["network"])
async def network(service: NexusService = Service) -> NetworkTopology:
    return service.network()


@router.get("/events", response_model=list[SecurityEvent], tags=["events"])
async def events(severity: Optional[EventSeverity] = None, limit: int = Query(default=100, ge=1, le=500), service: NexusService = Service) -> list[SecurityEvent]:
    return service.events(severity, limit)


@router.get("/traffic", response_model=TrafficSeries, tags=["traffic"])
async def traffic(range: TrafficRange = "live", service: NexusService = Service) -> TrafficSeries:  # noqa: A002
    return service.traffic(range)


@router.get("/analytics", response_model=AnalyticsData, tags=["analytics"])
async def analytics(range: AnalyticsRange = "7d", service: NexusService = Service) -> AnalyticsData:  # noqa: A002
    return service.analytics(range)


@router.get("/privacy", response_model=PrivacyStatus, tags=["privacy"])
async def privacy(service: NexusService = Service) -> PrivacyStatus:
    return service.privacy()


@router.get("/simulate/scenarios", response_model=list[AttackScenario], tags=["simulation"])
async def scenarios(service: NexusService = Service) -> list[AttackScenario]:
    return service.scenarios()


@router.post("/simulate", response_model=SimulationState, tags=["simulation"])
async def simulate(body: SimulationRequest, service: NexusService = Service) -> SimulationState:
    return service.simulate(body)


@router.post("/response", response_model=ResponseExecution, tags=["response"])
async def respond(body: ResponseDecisionRequest, service: NexusService = Service) -> ResponseExecution:
    return service.decide(body)


@router.post("/assistant", response_model=AssistantReply, tags=["assistant"])
async def assistant(body: AssistantRequest, service: NexusService = Service) -> AssistantReply:
    return await service.ask_async(body)


@router.get("/settings", response_model=DefenseSettings, tags=["settings"])
async def get_settings(service: NexusService = Service) -> DefenseSettings:
    return service.settings()


@router.patch("/settings", response_model=DefenseSettings, tags=["settings"])
async def update_settings(body: DefenseSettingsPatch, service: NexusService = Service) -> DefenseSettings:
    return service.update_settings(body)


@router.get("/system", response_model=SystemInfo, tags=["system"])
async def system(service: NexusService = Service) -> SystemInfo:
    return service.system()


@router.get("/realtime/poll", response_model=RealtimePoll, tags=["realtime"])
async def realtime_poll(after: Optional[int] = Query(default=None, ge=0), service: NexusService = Service) -> RealtimePoll:
    """Polling transport for the realtime event log. Omit `after` to get the current cursor."""
    if after is None:
        return RealtimePoll(seq=service.bus.seq, messages=[])
    seq, messages, _gap = service.bus.since(after)
    return RealtimePoll(seq=seq, messages=messages)


# ------------------------------------------------------------------ live capture


@router.get("/live/status", tags=["live"])
async def live_status(service: NexusService = Service) -> dict[str, object]:
    return service.live.status()


@router.post("/live/start", tags=["live"])
async def live_start(body: Optional[dict[str, str]] = Body(default=None), service: NexusService = Service) -> dict[str, object]:
    try:
        await service.live.start((body or {}).get("interface"))
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return service.live.status()


@router.post("/live/stop", tags=["live"])
async def live_stop(service: NexusService = Service) -> dict[str, object]:
    await service.live.stop()
    return service.live.status()


@router.post("/live/train", tags=["live"])
async def live_train(service: NexusService = Service) -> dict[str, object]:
    await service.live.retrain()
    return service.live.status()
