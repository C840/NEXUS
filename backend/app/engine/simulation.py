"""
Attack simulation runner.

Plays one scenario (scenarios.py) against the live backend state:

    Normal → Traffic spike → Anomaly detected → AI classification → Risk assessed
    → Threat mapped → Response (autonomous) | Awaiting approval (manual)
    → Blocked → Recovered

Every stage mutates real state — traffic overlay, devices, links, the threat
record, the response execution, metrics — and publishes realtime messages, so
every view (traffic chart, feed, topology, investigation, assistant) reacts
exactly as it would to a real detection. Stage timing is human-scale for the
demo; the reported response time is the engine's compute latency.
"""

from __future__ import annotations

import asyncio
import itertools
import logging
from typing import TYPE_CHECKING, Callable, Literal, Optional

from app.realtime import message
from app.schemas import SimulationStage, SimulationStageKey, SimulationState

from .catalog import ATTACK_INFO, Outcome, Party, risk_from_factors
from .events import detection_event, response_event, system_event
from .rng import iso, js_round, now_ms, parse_iso
from .scenarios import PEAK_PPS, SCENARIOS, Scenario
from .state import device_by_id, next_threat_id, sync_device_threats
from .threats import RecordSpec, ThreatRecord, build_response, level_of, make_record
from .traffic import TrafficOverlay, baseline_pps

if TYPE_CHECKING:
    from .service import NexusService

log = logging.getLogger("nexus.simulation")

#: Seconds from launch at which each stage begins (response branch shares a slot).
STAGE_AT: dict[str, float] = {
    "normal": 0,
    "traffic_spike": 2.5,
    "anomaly_detected": 6,
    "classified": 8.5,
    "risk_assessed": 10.5,
    "threat_mapped": 12.5,
    "responding": 14.5,
    "awaiting_approval": 14.5,
    "blocked": 17,
    "recovered": 25,
}
FAR_FUTURE_MS = 15 * 60_000
_ids = itertools.count(1)

Decision = Literal["approve", "reject"]


def _stage(key: SimulationStageKey, label: str, description: str) -> SimulationStage:
    return SimulationStage(key=key, label=label, description=description, status="pending")


class SimulationRun:
    def __init__(self, service: NexusService, scenario: Scenario, time_scale: float = 1.0) -> None:
        self.service = service
        self.time_scale = time_scale
        self.state = service.state
        self.sc = scenario
        self.started = now_ms()
        self.autonomous = self.state.settings.autonomous_mode
        self.record: Optional[ThreatRecord] = None
        self.overlay: Optional[TrafficOverlay] = None
        self.decision: Optional[Decision] = None
        self._decided = asyncio.Event()
        self._victim_before: Optional[tuple[str, int]] = None
        self.risk = risk_from_factors(scenario.factors)
        self.outcome: Outcome = self._planned_outcome()
        response_key: SimulationStageKey = "responding" if self.autonomous or self.outcome == "monitoring" else "awaiting_approval"
        self.sim = SimulationState(
            id=f"SIM-{next(_ids):03d}",
            attack=scenario.attack,
            label=scenario.label,
            status="running",
            current_stage="normal",
            stages=[
                _stage("normal", "Normal traffic", f"Baseline traffic — {self._victim_name()} behaving normally"),
                _stage("traffic_spike", "Traffic spike", scenario.spike_label),
                _stage("anomaly_detected", "Anomaly detected", f"Isolation Forest score {scenario.factors[1] / 100:.2f} > threshold {self.state.settings.anomaly_threshold:.2f}"),
                _stage("classified", "AI classification", self._classification_text()),
                _stage("risk_assessed", "Risk assessment", f"Risk {self.risk}/100 · {level_of(self.risk)} — {self._policy_text()}"),
                _stage("threat_mapped", "Threat mapped", f"{self._victim_name()} flagged on the network map"),
                _stage(response_key, *self._response_stage_text(response_key)),
                _stage("blocked", *self._blocked_stage_text()),
                _stage("recovered", "Network recovered", "Traffic back to its learned baseline"),
            ],
            started_at=iso(self.started),
            mode="autonomous" if self.autonomous else "manual",
            target_device_id=scenario.victim,
        )

    # ------------------------------------------------------------ text helpers

    def _victim_name(self) -> str:
        device = device_by_id(self.state, self.sc.victim)
        return device.hostname if device else self.sc.victim

    def _classification_text(self) -> str:
        info = ATTACK_INFO[self.sc.attack]
        if self.sc.attack == "unknown_anomaly":
            return "No known class matched — labelled Unknown Anomaly"
        return f"XGBoost: {info.name} · {self.sc.factors[0]:.1f}% confidence"

    def _planned_outcome(self) -> Outcome:
        s = self.state.settings
        if self.risk < s.auto_response_threshold:
            return "monitoring"
        if self.sc.internal_source and self.risk >= s.quarantine_threshold:
            return "quarantined"
        return "blocked"

    def _policy_text(self) -> str:
        s = self.state.settings
        if self.outcome == "monitoring":
            return f"below the auto-response threshold ({s.auto_response_threshold}) → monitor"
        if self.outcome == "quarantined":
            return f"≥ quarantine threshold ({s.quarantine_threshold}) → isolate device"
        return f"≥ auto-response threshold ({s.auto_response_threshold}) → contain"

    def _response_stage_text(self, key: SimulationStageKey) -> tuple[str, str]:
        if key == "awaiting_approval":
            return "Awaiting approval", "Manual mode — containment waits for an administrator decision"
        if self.outcome == "monitoring":
            return "Policy response", "Risk below threshold — enhanced monitoring instead of blocking"
        return "Autonomous response", "NEXUS executes the response playbook automatically"

    def _blocked_stage_text(self) -> tuple[str, str]:
        if self.outcome == "monitoring":
            return "Under observation", "Monitoring, packet capture and an administrator notice — no blocking required"
        if self.outcome == "quarantined":
            return "Threat contained", f"{self._victim_name()} quarantined · source blocked"
        return "Threat blocked", "Source blocked at the perimeter"

    def _outcome_sentence(self) -> str:
        s = self.state.settings
        if self.decision == "reject":
            return " An administrator rejected containment; NEXUS continues to monitor the activity."
        if self.decision == "approve":
            return " NEXUS recommended containment and an administrator approved it."
        if self.outcome == "monitoring":
            return f" Risk {self.risk} is below the auto-response threshold ({s.auto_response_threshold}), so NEXUS is monitoring rather than blocking."
        if self.outcome == "quarantined":
            return f" Risk {self.risk} exceeded the quarantine threshold ({s.quarantine_threshold}), so NEXUS isolated the device."
        return f" Risk {self.risk} exceeded the auto-response threshold ({s.auto_response_threshold}), so NEXUS blocked the source automatically."

    # ------------------------------------------------------------ publishing

    def publish_sim(self) -> None:
        self.service.bus.publish(message("simulation.update", simulation=self.sim))

    def advance(self, key: SimulationStageKey) -> None:
        now = iso(now_ms())
        for stage in self.sim.stages:
            if stage.key == key:
                stage.status = "active"
                stage.at = now
                break
            if stage.status != "done":
                stage.status = "done"
                stage.at = stage.at or now
        self.sim.current_stage = key
        self.publish_sim()

    def finish(self) -> None:
        for stage in self.sim.stages:
            stage.status = "done"
            stage.at = stage.at or iso(now_ms())
        self.sim.status = "completed"
        self.sim.current_stage = "recovered"
        self.publish_sim()

    def _set_links(self, statuses: dict[str, str]) -> None:
        s = self.state
        overrides = s.link_overrides
        for link_id, status in statuses.items():
            if status == "normal":
                overrides.pop(link_id, None)
            else:
                overrides[link_id] = status  # type: ignore[assignment]
        now = now_ms()
        touched = {link_id.split("->")[1] for link_id in statuses}
        for device_id in touched:
            device = device_by_id(s, device_id)
            if device:
                self.service.publish_device(device, now)

    def _update_victim(self, status: str, risk: int) -> None:
        device = device_by_id(self.state, self.sc.victim)
        if not device:
            return
        if self._victim_before is None:
            self._victim_before = (device.status, device.risk_score)
        device.status = status  # type: ignore[assignment]
        device.risk_score = risk
        device.last_seen = iso(now_ms())
        sync_device_threats(self.state, now_ms())
        self.service.publish_device(device, now_ms())

    def _set_actions(self, status: str, only_pending: bool = True) -> None:
        assert self.record
        t = self.record.threat
        now = iso(now_ms())
        t.actions = [
            a.model_copy(update={"status": status, "timestamp": now if status == "done" else a.timestamp})
            if (a.status in ("pending", "executing") or not only_pending)
            else a
            for a in t.actions
        ]

    def _publish_threat(self) -> None:
        assert self.record
        self.service.bus.publish(message("threat.upsert", threat=self.record.threat))
        response = build_response(self.record, self.state.settings)
        self.state.latest_response = response
        self.service.bus.publish(message("response.update", response=response))

    # ------------------------------------------------------------ stages

    def _start_traffic(self) -> None:
        now = now_ms()
        base = baseline_pps(now)
        peak = 1 + (PEAK_PPS[self.sc.attack] - 13_200) / base if self.sc.attack in PEAK_PPS else self.sc.peak_multiplier
        self.overlay = TrafficOverlay(
            attack=self.sc.attack,
            detected_at=now + js_round((STAGE_AT["classified"] - STAGE_AT["traffic_spike"]) * 1000),
            start=now,
            mitigation_start=now + FAR_FUTURE_MS,
            end=now + FAR_FUTURE_MS + 7000,
            peak_multiplier=peak,
            packet_bytes=self.sc.packet_bytes,
            anomaly_peak=self.sc.factors[1] / 100,
            contained=True,
        )
        self.state.overlays.add(self.overlay)
        self.state.health_penalty = self.sc.health_penalty
        self.service.publish_metrics()

    def _anomaly(self) -> None:
        device = device_by_id(self.state, self.sc.victim)
        self._update_victim("suspicious", max(45, device.risk_score if device else 45))
        self._set_links(self.sc.attack_path)
        self.service.publish_event(
            system_event(
                "Traffic anomaly",
                f"{self._victim_name()} · anomaly score {self.sc.factors[1] / 100:.2f} > {self.state.settings.anomaly_threshold:.2f}",
                now_ms(),
                "anomaly",
            )
        )
        self.service.publish_metrics()

    def _classify(self) -> None:
        s = self.state
        sc = self.sc
        victim = device_by_id(s, sc.victim)
        detected_at = now_ms()
        if sc.internal_source and victim:
            source = Party(ip=victim.ip, label=victim.hostname, internal=True, device_id=victim.id)
            target = Party(ip=sc.target[0], label=sc.target[1], internal=False)
        else:
            assert sc.external
            source = Party(ip=sc.external[0], label=sc.external[1], internal=False)
            target = Party(ip=sc.target[0], label=sc.target[1], internal=True, device_id=victim.id if victim else None)
        s.rule_no += 1
        intel = next((r.intel for r in s.records if r.intel and r.intel.ip == sc.intel_ip), None) if sc.intel_ip else None
        spec = RecordSpec(
            attack=sc.attack,
            timestamp=detected_at,
            source=source,
            target=target,
            factors=sc.factors,
            features=list(sc.features),
            explanation=sc.explanation,
            signal=sc.signal,
            outcome=self.outcome if self.autonomous or self.outcome == "monitoring" else "awaiting_approval",
            response_time_ms=sc.response_time_ms,
            rule_no=s.rule_no,
            related_event_count=3,
            mode="autonomous" if self.autonomous else "manual",
            intel=intel.model_copy(update={"last_observed": iso(detected_at), "related_events": intel.related_events + 1}) if intel else None,
            detected_by=sc.detected_by,
        )
        record = make_record(spec, next_threat_id(s))
        # The record starts life as a fresh detection; containment comes later.
        record.threat.status = "detected"
        record.threat.response_time_ms = None
        record.threat.actions = [a.model_copy(update={"status": "pending", "timestamp": None}) for a in record.threat.actions]
        record.overlay = self.overlay
        if self.overlay:
            record.replay_peak_multiplier = self.overlay.peak_multiplier
        s.records.append(record)
        s.by_id[record.threat.id] = record
        self.record = record
        self.sim.threat_id = record.threat.id
        sync_device_threats(s, detected_at)
        self._publish_threat()
        self.service.publish_event(detection_event(record.threat))

    def _assess(self) -> None:
        if self.sc.internal_source:
            self._update_victim("compromised" if self.outcome != "monitoring" else "suspicious", self.risk)
        else:
            device = device_by_id(self.state, self.sc.victim)
            self._update_victim("suspicious", max(device.risk_score if device else 0, js_round(self.risk * 0.6)))
        self.service.publish_metrics()

    def _respond_autonomous(self) -> None:
        assert self.record
        if self.outcome == "monitoring":
            self.record.threat.status = "monitoring"
            self._set_actions("done")
        else:
            self.record.threat.status = "mitigating"
            self._set_actions("executing")
            self.service.publish_event(response_event(self.record.threat, "Autonomous response initiated", f"{len(self.record.threat.actions)} actions · {self.record.threat.name}", now_ms()))
        self._publish_threat()

    def _await_approval(self) -> None:
        assert self.record
        self.sim.status = "awaiting_approval"
        self.record.threat.status = "awaiting_approval"
        self._publish_threat()
        self.service.publish_event(response_event(self.record.threat, "Approval required", f"Containment of {self.record.threat.name} waits for an administrator", now_ms()))
        self.publish_sim()

    def _contain(self) -> None:
        """Containment executed (autonomously or after approval) — or monitoring settled."""
        assert self.record
        t = self.record.threat
        now = now_ms()
        if self.decision == "reject":
            t.status = "monitoring"
            self._set_actions("skipped")
        elif self.outcome == "monitoring":
            t.status = "monitoring"
        else:
            t.status = "quarantined" if self.outcome == "quarantined" else "blocked"
            self._set_actions("done")
            t.response_time_ms = self.sc.response_time_ms if self.decision is None else now - parse_iso(t.timestamp)
            if self.decision == "approve":
                self.record.decided_by = "administrator"
        t.explanation = self.sc.explanation + self._outcome_sentence()
        self._publish_threat()

        if self.overlay and t.status in ("blocked", "quarantined"):
            self.overlay.mitigation_start = now
            self.overlay.end = now + 7000
        elif self.overlay:
            # Unblocked activity winds down on its own.
            self.overlay.mitigation_start = now + 4000
            self.overlay.end = now + 12_000

        if t.status in ("blocked", "quarantined"):
            what = next((a for a in t.actions if a.kind in ("quarantine_device", "block_ip")), None)
            label = f"{what.label} · {what.target}" if what else "Containment applied"
            latency = f"{t.response_time_ms} ms" if t.response_time_ms is not None else ""
            self.service.publish_event(response_event(t, "Mitigation executed", f"{label} · {latency}", now))

        # Victim device after the response.
        if self.sc.internal_source:
            self._update_victim("quarantined" if t.status == "quarantined" else "suspicious", self.risk)
        else:
            before = self._victim_before or ("safe", 10)
            self._update_victim(before[0] if before[0] != "suspicious" else "safe", min(before[1] + 6, 40))

        # Attack path: blocked at the edge for a moment, then back to normal.
        if t.status in ("blocked", "quarantined"):
            edge = next(iter(self.sc.attack_path), None)
            statuses = {link_id: "normal" for link_id in self.sc.attack_path}
            if not self.sc.internal_source and edge:
                statuses[edge] = "blocked"
            self._set_links(statuses)
        self.state.health_penalty = self.sc.health_penalty * 0.3
        self.service.publish_metrics()

    def _recover(self) -> None:
        self._set_links({link_id: "normal" for link_id in self.sc.attack_path})
        self.state.health_penalty = 0
        if self.record:
            self.service.publish_event(system_event("Network recovered", f"Traffic back to baseline after {self.record.threat.name}", now_ms(), "recovery"))
        self.service.publish_metrics()
        self.finish()

    # ------------------------------------------------------------ driver

    @property
    def awaiting(self) -> bool:
        return self.sim.status == "awaiting_approval"

    def apply_decision(self, decision: Decision) -> None:
        """Administrator decision in manual mode — executes (or skips) containment now."""
        self.decision = decision
        self.sim.status = "running"
        self._contain()
        self.advance("blocked")
        self._decided.set()

    async def _at(self, key: str) -> None:
        delay = self.started / 1000 + STAGE_AT[key] * self.time_scale - now_ms() / 1000
        if delay > 0:
            await asyncio.sleep(delay)

    async def run(self) -> None:
        steps: list[tuple[SimulationStageKey, Callable[[], None]]] = [
            ("traffic_spike", self._start_traffic),
            ("anomaly_detected", self._anomaly),
            ("classified", self._classify),
            ("risk_assessed", self._assess),
            ("threat_mapped", lambda: None),
        ]
        try:
            self.advance("normal")
            for key, action in steps:
                await self._at(key)
                action()
                self.advance(key)

            await self._at("responding")
            if self.autonomous or self.outcome == "monitoring":
                self._respond_autonomous()
                self.advance("responding")
                await self._at("blocked")
                self._contain()
                self.advance("blocked")
            else:
                self._await_approval()
                self.advance("awaiting_approval")
                await self._decided.wait()  # apply_decision() contains and advances

            recover_at = max(STAGE_AT["recovered"] - STAGE_AT["blocked"], 6)
            await asyncio.sleep(recover_at * self.time_scale)
            self._recover()
        except asyncio.CancelledError:
            self.sim.status = "cancelled"
            self.publish_sim()
            raise
        except Exception:
            log.exception("simulation %s failed", self.sim.id)
            self.sim.status = "cancelled"
            self.publish_sim()

