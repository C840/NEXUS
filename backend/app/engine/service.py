"""
NexusService — the application layer behind the REST API.

It owns the backend state and the realtime event log. Queries build response
models from state; commands mutate state and publish RealtimeMessages. The
live loop advances the simulated environment (traffic ticks, heartbeats,
background perimeter detections).
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import time
from typing import Optional

from app.realtime import EventBus, message
from app.schemas import (
    AnalyticsData,
    AnalyticsRange,
    AssistantReply,
    AssistantRequest,
    AttackScenario,
    DashboardSummary,
    DataSourceInfo,
    DefenseSettings,
    DefenseSettingsPatch,
    Device,
    EventSeverity,
    NetworkTopology,
    PrivacyStatus,
    ResponseDecisionRequest,
    ResponseExecution,
    SecurityEvent,
    SimulationRequest,
    SimulationState,
    SystemInfo,
    Threat,
    ThreatDetail,
    TrafficRange,
    TrafficSeries,
)

from .analytics import compute_analytics
from .assistant import answer_question
from .events import detection_event, response_event, system_event
from .metrics import compute_metrics
from .llm import GroqNarrator
from .privacy import privacy_status
from .scenarios import SCENARIOS as SCENARIO_SPECS
from .simulation import SimulationRun
from .rng import clamp, iso, js_round, now_ms, parse_iso
from .state import BackendState, active_threats, add_event, add_record, create_state, device_by_id, next_threat_id, sync_device_threats
from .system import DATA_SOURCE, system_info
from .threats import build_response, build_threat_detail, intel_for_source, make_record, perimeter_spec
from .topology import build_topology, device_link, device_node, parent_of
from .traffic import traffic_point, traffic_series

log = logging.getLogger("nexus.engine")

FEATURED_INTEL_IPS = ("185.23.xx.xx", "45.155.xx.xx", "103.75.xx.xx")

SCENARIOS = [
    AttackScenario(type="ddos", label="DDoS", description="Volumetric UDP flood from a botnet against the public web server.", severity="critical", target_label="Server-01 (192.168.1.5)", expected_signals=["Packet-rate surge", "Source IP entropy", "Tiny UDP packets"], duration_sec=25),
    AttackScenario(type="port_scan", label="Port Scan", description="A compromised workstation sweeps the internal network for open services.", severity="high", target_label="PC-07 (192.168.1.44)", expected_signals=["Port diversity", "Connection rate", "High SYN ratio"], duration_sec=25),
    AttackScenario(type="brute_force", label="Brute Force", description="Automated password guessing against the database server over SSH.", severity="high", target_label="Server-02 (192.168.1.6)", expected_signals=["Failed-login burst", "Many usernames", "Machine-regular cadence"], duration_sec=25),
    AttackScenario(type="dns_anomaly", label="Suspicious DNS", description="High-entropy DNS queries consistent with tunnelling or a DGA.", severity="medium", target_label="PC-03 (192.168.1.21)", expected_signals=["Query entropy", "NXDOMAIN ratio", "Long subdomains"], duration_sec=25),
    AttackScenario(type="malware", label="Malware Behavior", description="An IoT camera beacons to a first-seen host on a fixed interval.", severity="high", target_label="IoT-04 (192.168.1.71)", expected_signals=["Beacon periodicity", "Destination rarity", "Outbound ratio"], duration_sec=25),
    AttackScenario(type="unknown_anomaly", label="Unknown Anomaly", description="Behavior that deviates from the baseline but matches no known class.", severity="medium", target_label="Server-03 (192.168.1.7)", expected_signals=["Baseline deviation", "Unusual volume", "No class match"], duration_sec=25),
]

HOUSEKEEPING = (
    ("Flow baseline updated", "system"),
    ("Threat-intel feed synchronized", "intel"),
    ("Model heartbeat", "system"),
    ("DNS sinkhole check", "system"),
)


class ServiceError(Exception):
    def __init__(self, status: int, message_: str) -> None:
        super().__init__(message_)
        self.status = status
        self.message = message_


class NexusService:
    def __init__(self, bus: Optional[EventBus] = None, now: Optional[int] = None, simulation_time_scale: float = 1.0) -> None:
        started = time.perf_counter()
        self.simulation_time_scale = simulation_time_scale
        self.state: BackendState = create_state(now if now is not None else now_ms())
        self.bus = bus or EventBus()
        self._analytics_cache: dict[str, tuple[int, AnalyticsData]] = {}
        self.simulation: Optional[SimulationRun] = None
        self._simulation_task: Optional[asyncio.Task[None]] = None
        from app.live.engine import LiveEngine  # heavy ML imports stay out of module import time

        self.live = LiveEngine(self)
        key = os.getenv("GROQ_API_KEY", "").strip()
        self.narrator: Optional[GroqNarrator] = GroqNarrator(key, os.getenv("NEXUS_LLM_MODEL", "openai/gpt-oss-120b")) if key else None
        log.info("Simulated environment ready: %d threats, %d devices (%.2fs)", len(self.state.records), len(self.state.devices), time.perf_counter() - started)

    # ------------------------------------------------------------ helpers

    def _threats(self) -> list[Threat]:
        return [r.threat for r in self.state.records]

    def _snapshot(self, now: Optional[int] = None):
        s = self.state
        return compute_metrics(self._threats(), s.devices, s.settings, s.network_health, now or now_ms())

    def _current_mbps(self, now: int) -> float:
        return traffic_point((now // 1000) * 1000, self.state.overlays, self.state.settings.anomaly_threshold).mbps

    def publish_metrics(self) -> None:
        metrics, score, status = self._snapshot()
        self.bus.publish(message("metrics.update", metrics=metrics, securityScore=score, status=status))

    def publish_device(self, device: Device, now: int) -> None:
        s = self.state
        self.bus.publish(message("device.update", device=device))
        self.bus.publish(message("node.update", node=device_node(device, active_threats(s))))
        parent = parent_of(device)
        if parent:
            link_id = f"{parent}->{device.id}"
            self.bus.publish(message("link.update", link=device_link(device, parent, self._current_mbps(now), s.link_overrides.get(link_id))))

    def publish_event(self, event: SecurityEvent) -> None:
        add_event(self.state, event)
        self.bus.publish(message("event.new", event=event))

    # ------------------------------------------------------------ queries

    def dashboard(self) -> DashboardSummary:
        metrics, score, status = self._snapshot()
        intel = []
        for ip in FEATURED_INTEL_IPS:
            match = next((r.intel for r in self.state.records if r.intel and r.intel.ip == ip), None)
            if match:
                intel.append(match)
        return DashboardSummary(
            status=status,
            metrics=metrics,
            security_score=score,
            latest_response=self.state.latest_response,
            featured_intel=intel,
            settings=self.state.settings,
            data_source=self.live.data_source() or DATA_SOURCE,
        )

    def threats(self, severity: Optional[str] = None, status: Optional[str] = None, attack: Optional[str] = None, search: Optional[str] = None, limit: int = 250) -> list[Threat]:
        q = (search or "").strip().lower()
        out: list[Threat] = []
        for record in reversed(self.state.records):
            t = record.threat
            if severity and t.severity != severity:
                continue
            if status and t.status != status:
                continue
            if attack and t.type != attack:
                continue
            if q and not any(q in v.lower() for v in (t.id, t.name, t.source_ip, t.target_ip, t.source_label, t.target_label)):
                continue
            out.append(t)
            if len(out) >= limit:
                break
        return out

    def threat_detail(self, threat_id: str) -> ThreatDetail:
        record = self.state.by_id.get(threat_id)
        if not record:
            raise ServiceError(404, f"Threat {threat_id} not found")
        detail = build_threat_detail(record, self.state.settings)
        if detail.intel is None and not record.source.internal:
            detail.intel = intel_for_source(self.state.records, record.threat.source_ip, "threat_intel" in record.threat.detected_by, record.source.label.replace("External · ", ""))
        return detail

    def static_data_source(self) -> DataSourceInfo:
        return DATA_SOURCE

    def devices(self) -> list[Device]:
        return self.state.devices

    def network(self) -> NetworkTopology:
        now = now_ms()
        return build_topology(self.state.devices, active_threats(self.state), self._current_mbps(now), now, self.state.link_overrides)

    def events(self, severity: Optional[EventSeverity] = None, limit: int = 100) -> list[SecurityEvent]:
        return [e for e in self.state.events if not severity or e.severity == severity][:limit]

    def traffic(self, range_key: TrafficRange) -> TrafficSeries:
        if range_key == "live" and self.live.running and self.live.history:
            # Real packets: don't splice simulated history in front of live capture.
            return TrafficSeries(range="live", resolution_sec=1, points=list(self.live.history))
        return traffic_series(range_key, now_ms(), self.state.overlays, self.state.settings.anomaly_threshold)

    def analytics(self, range_key: AnalyticsRange) -> AnalyticsData:
        now = now_ms()
        cached = self._analytics_cache.get(range_key)
        if cached and now - cached[0] < 15_000:
            return cached[1]
        data = compute_analytics(range_key, self.state.records, self.state.devices, now)
        self._analytics_cache[range_key] = (now, data)
        return data

    def privacy(self) -> PrivacyStatus:
        return privacy_status(self.state.boot_time)

    def scenarios(self) -> list[AttackScenario]:
        return SCENARIOS

    def settings(self) -> DefenseSettings:
        return self.state.settings

    def system(self) -> SystemInfo:
        return system_info(live=self.live, llm=self.narrator)

    def ask(self, request: AssistantRequest) -> AssistantReply:
        return answer_question(request.message, self.state, now_ms())

    async def ask_async(self, request: AssistantRequest) -> AssistantReply:
        """Rule-based facts first; the LLM (when configured) only re-narrates them."""
        draft = self.ask(request)
        if not self.narrator:
            return draft
        live_ids = set(self.live.detections)
        context = {
            "metrics": self._snapshot()[0].model_dump(),
            "autonomous_mode": self.state.settings.autonomous_mode,
            "data_source": (self.live.data_source() or DATA_SOURCE).model_dump(),
            "active_threats": [
                {"id": t.id, "name": t.name, "risk": t.risk_score, "severity": t.severity, "status": t.status, "from_live_capture": t.id in live_ids}
                for t in active_threats(self.state)
            ],
        }
        text = await self.narrator.narrate(request.message, draft, context)
        if text:
            draft = draft.model_copy(update={"content": text, "generated_by": self.narrator.label})
        return draft

    # ------------------------------------------------------------ commands

    def update_settings(self, patch: DefenseSettingsPatch) -> DefenseSettings:
        current = self.state.settings.model_dump()
        changes = patch.model_dump(exclude_none=True, by_alias=False)
        merged = DefenseSettings.model_validate({**self.state.settings.model_dump(by_alias=False), **changes})
        merged.auto_response_threshold = int(clamp(merged.auto_response_threshold, 0, 100))
        merged.quarantine_threshold = int(clamp(merged.quarantine_threshold, 0, 100))
        merged.anomaly_threshold = round(clamp(merged.anomaly_threshold, 0.05, 0.99), 2)
        self.state.settings = merged
        self._analytics_cache.clear()
        if merged.model_dump() != current:
            self.bus.publish(message("settings.update", settings=merged))
            self.publish_metrics()
        return merged

    def simulate(self, request: SimulationRequest) -> SimulationState:
        run = self.simulation
        if run and run.sim.status in ("running", "awaiting_approval"):
            raise ServiceError(409, f"A {run.sim.label} simulation is already in progress.")
        run = SimulationRun(self, SCENARIO_SPECS[request.attack], self.simulation_time_scale)
        self.simulation = run
        self._simulation_task = asyncio.get_running_loop().create_task(run.run())
        log.info("simulation %s started: %s (%s mode)", run.sim.id, run.sim.label, run.sim.mode)
        return run.sim.model_copy(deep=True)

    def current_simulation(self) -> Optional[SimulationState]:
        return self.simulation.sim if self.simulation else None

    async def mark_false_positive(self, threat_id: str) -> dict[str, object]:
        record = self.state.by_id.get(threat_id)
        if record is None:
            raise ServiceError(404, f"Threat {threat_id} not found")
        result: dict[str, object] = {"host": None, "allowlisted": False, "learned": False}
        if record.extra.get("live"):
            result = await self.live.mark_false_positive(record)
        record.threat = record.threat.model_copy(update={"status": "dismissed"})
        now = now_ms()
        self.bus.publish(message("threat.upsert", threat=record.threat))
        self.publish_event(system_event("Marked as false positive", f"{record.threat.name} · {record.threat.source_label} dismissed by the analyst", now))
        self.publish_metrics()
        return {**result, "threat": record.threat.model_dump()}

    async def shutdown(self) -> None:
        await self.live.stop()
        if self._simulation_task and not self._simulation_task.done():
            self._simulation_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._simulation_task

    def decide(self, request: ResponseDecisionRequest) -> ResponseExecution:
        s = self.state
        run = self.simulation
        if run and run.record and run.record.threat.id == request.threat_id:
            if not run.awaiting:
                raise ServiceError(409, f"{request.threat_id} is not awaiting approval")
            run.apply_decision(request.decision)
            assert s.latest_response is not None
            return s.latest_response
        record = s.by_id.get(request.threat_id)
        if not record:
            raise ServiceError(404, f"Threat {request.threat_id} not found")
        t = record.threat
        if t.status != "awaiting_approval":
            raise ServiceError(409, f"{t.id} is not awaiting approval")
        now = now_ms()
        approve = request.decision == "approve"
        quarantine = approve and record.source.internal and t.risk_score >= s.settings.quarantine_threshold
        record.decided_by = "administrator"
        actions = []
        for a in t.actions:
            if a.status == "pending":
                a = a.model_copy(update={"status": "done" if approve else "skipped", "detail": "Approved by administrator" if approve else "Rejected by administrator"})
                if approve:
                    a.timestamp = iso(now)
            actions.append(a)
        record.threat = t.model_copy(
            update={
                "status": ("quarantined" if quarantine else "blocked") if approve else "monitoring",
                "response_time_ms": now - parse_iso(t.timestamp) if approve else None,
                "actions": actions,
            }
        )
        response = build_response(record, s.settings)
        s.latest_response = response
        self.bus.publish(message("threat.upsert", threat=record.threat))
        self.bus.publish(message("response.update", response=response))
        self.publish_event(response_event(record.threat, "Mitigation approved" if approve else "Containment rejected", f"{t.name} · {t.source_label}", now))
        device = device_by_id(s, t.device_id) if t.device_id else None
        if device and quarantine:
            device.status = "quarantined"
            sync_device_threats(s, now)
            self.publish_device(device, now)
        self.publish_metrics()
        return response

    # ------------------------------------------------------------ live loop

    def tick(self, t: int) -> None:
        live = self.live.live_point()
        point = live if live is not None else traffic_point(t, self.state.overlays, self.state.settings.anomaly_threshold)
        self.bus.publish(message("traffic.tick", point=point))

    def heartbeat(self) -> None:
        s = self.state
        now = now_ms()
        s.network_health = js_round((98.2 - s.health_penalty + (s.live.next() - 0.5) * 0.2) * 10) / 10
        for _ in range(3):
            device = s.devices[s.live.int(0, len(s.devices) - 1)]
            if device.status == "quarantined":
                continue
            device.last_seen = iso(now)
            device.connections = max(1, js_round(device.connections * (1 + (s.live.next() - 0.5) * 0.08)))
            self.publish_device(device, now)
        self.publish_metrics()

    def ambient_threat(self) -> None:
        s = self.state
        now = now_ms()
        s.rule_no += 1
        record = make_record(perimeter_spec(s.live, now, s.devices, s.rule_no), next_threat_id(s))
        add_record(s, record)
        sync_device_threats(s, now)
        self.bus.publish(message("threat.upsert", threat=record.threat))
        self.publish_event(detection_event(record.threat))
        self.publish_metrics()

    def ambient_info(self) -> None:
        s = self.state
        title, kind = s.live.pick(HOUSEKEEPING)
        detail = {
            "Flow baseline updated": f"{s.live.pick(['Servers', 'Workstations', 'IoT'])} segment · {s.live.int(180, 960)} flows profiled",
            "Threat-intel feed synchronized": f"Simulated feed · {s.live.int(2, 19)} new indicators",
            "Model heartbeat": f"Classifier p95 inference {3 + s.live.next() * 2:.1f} ms · anomaly detector healthy",
            "DNS sinkhole check": "No sinkhole hits in the last 5 minutes",
        }[title]
        self.publish_event(system_event(title, detail, now_ms(), kind))

    async def run_live(self) -> None:
        """Advance the simulated environment forever (cancelled on shutdown)."""
        s = self.state
        now = now_ms()
        last_tick = 0
        next_heartbeat = now + 5000
        next_threat = now + s.live.int(90, 180) * 1000
        next_info = now + s.live.int(60, 120) * 1000
        while True:
            try:
                now = now_ms()
                second = (now // 1000) * 1000
                if second != last_tick:
                    last_tick = second
                    self.tick(second)
                if now >= next_heartbeat:
                    next_heartbeat = now + 5000
                    self.heartbeat()
                if now >= next_threat:
                    next_threat = now + s.live.int(90, 180) * 1000
                    self.ambient_threat()
                if now >= next_info:
                    next_info = now + s.live.int(60, 120) * 1000
                    self.ambient_info()
            except Exception:  # never let one bad tick stop the environment
                log.exception("live loop iteration failed")
            await asyncio.sleep(0.25)

