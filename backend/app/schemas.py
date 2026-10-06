"""
NEXUS API schemas — a one-to-one mirror of `frontend/src/types`.

Python attributes are snake_case; JSON is camelCase (alias generator).
Optional TypeScript fields (`field?: T`) use `Opt[...]`, which is omitted from
JSON when unset; nullable fields (`field: T | null`) always serialize, as null.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")

# Optional field omitted from JSON when None (TypeScript `field?: T`).
Opt = Annotated[Optional[T], Field(default=None, exclude_if=lambda v: v is None)]


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, serialize_by_alias=True)


ISODateString = str
Severity = Literal["critical", "high", "medium", "low"]
EventSeverity = Literal["critical", "high", "medium", "low", "info"]


class EntityRef(Model):
    kind: Literal["threat", "device", "event", "node"]
    id: str
    label: str


# ------------------------------------------------------------------ response

ResponseMode = Literal["autonomous", "manual"]
ResponseActionKind = Literal[
    "block_ip",
    "quarantine_device",
    "update_firewall",
    "notify_admin",
    "rate_limit",
    "sinkhole_dns",
    "lock_account",
    "capture_pcap",
    "increase_monitoring",
]
ActionStatus = Literal["pending", "executing", "done", "skipped", "failed"]
ResponsePhaseKey = Literal["detect", "decide", "respond", "recover"]
ResponseState = Literal["awaiting_approval", "executing", "completed", "monitoring", "rejected"]


class ResponseAction(Model):
    id: str
    kind: ResponseActionKind
    label: str
    target: str
    status: ActionStatus
    timestamp: Opt[ISODateString]
    detail: Opt[str]


class ResponsePhase(Model):
    key: ResponsePhaseKey
    label: str
    status: Literal["done", "active", "pending", "skipped"]
    timestamp: Opt[ISODateString]
    detail: str


class ResponseExecution(Model):
    id: str
    threat_id: str
    threat_name: str
    mode: ResponseMode
    state: ResponseState
    phases: list[ResponsePhase]
    actions: list[ResponseAction]
    response_time_ms: Optional[int]
    message: str
    decided_by: Optional[Literal["nexus", "administrator"]]
    timestamp: ISODateString


class ResponseDecisionRequest(Model):
    threat_id: str
    decision: Literal["approve", "reject"]


# ------------------------------------------------------------------ threats

AttackType = Literal["ddos", "port_scan", "brute_force", "dns_anomaly", "malware", "unknown_anomaly"]
ThreatStatus = Literal[
    "detected",
    "awaiting_approval",
    "mitigating",
    "blocked",
    "quarantined",
    "monitoring",
    "investigating",
    "resolved",
    "dismissed",
]
DetectionSource = Literal["classifier", "anomaly", "signature", "threat_intel"]
RiskFactorKey = Literal["detection_confidence", "anomaly_score", "behavioral_risk", "threat_intelligence"]
TimelineKind = Literal["normal", "anomaly", "detection", "analysis", "response", "recovery"]


class FeatureContribution(Model):
    key: str
    label: str
    contribution: float
    observed: str
    baseline: str


class RiskFactor(Model):
    key: RiskFactorKey
    label: str
    value: float
    weight: float
    description: str


class TimelineStep(Model):
    key: str
    label: str
    detail: str
    timestamp: ISODateString
    offset_ms: int
    kind: TimelineKind


class ThreatIntel(Model):
    ip: str
    reputation: Literal["malicious", "suspicious", "unknown", "clean"]
    threat_type: str
    confidence: float
    first_observed: ISODateString
    last_observed: ISODateString
    related_events: int
    tags: list[str]
    source: str


class MitreTechnique(Model):
    id: str
    name: str
    tactic: str


class ReplayFrame(Model):
    t: float
    pps: int
    baseline_pps: int
    anomaly_score: float
    risk: int


class ReplayMarker(Model):
    t: float
    label: str
    kind: TimelineKind


class IncidentReplay(Model):
    duration_sec: int
    frames: list[ReplayFrame]
    markers: list[ReplayMarker]


class Threat(Model):
    id: str
    type: AttackType
    name: str
    severity: Severity
    source_ip: str
    source_label: str
    target_ip: str
    target_label: str
    confidence: float
    risk_score: int
    status: ThreatStatus
    timestamp: ISODateString
    explanation: str
    features: list[FeatureContribution]
    actions: list[ResponseAction]
    device_id: Opt[str]
    mitre: Opt[MitreTechnique]
    detected_by: list[DetectionSource]
    response_time_ms: Optional[int]
    related_event_count: int


class ModelLabels(Model):
    classifier: str
    anomaly_detector: str
    explainer: str


class ThreatDetail(Threat):
    risk_factors: list[RiskFactor]
    timeline: list[TimelineStep]
    response: ResponseExecution
    intel: Opt[ThreatIntel]
    replay: Opt[IncidentReplay]
    models: ModelLabels


# ------------------------------------------------------------------ devices & network

DeviceType = Literal["workstation", "laptop", "server", "camera", "iot_sensor", "printer", "mobile", "network"]
DeviceStatus = Literal["safe", "suspicious", "compromised", "quarantined"]
NetworkSegment = Literal["edge", "core", "servers", "workstations", "iot"]


class Device(Model):
    id: str
    hostname: str
    ip: str
    mac: str
    type: DeviceType
    os: str
    vendor: str
    segment: NetworkSegment
    status: DeviceStatus
    risk_score: int
    connections: int
    last_seen: ISODateString
    threat_ids: list[str]
    bytes_in24h: int = Field(alias="bytesIn24h")
    bytes_out24h: int = Field(alias="bytesOut24h")
    open_ports: list[int]
    role: str


NodeType = Literal["internet", "firewall", "router", "switch", "server", "workstation", "iot"]
NodeStatus = Literal["normal", "suspicious", "compromised", "blocked"]
LinkStatus = Literal["normal", "suspicious", "attack", "blocked"]


class NetworkNode(Model):
    id: str
    label: str
    ip: str
    type: NodeType
    status: NodeStatus
    risk: int
    segment: NetworkSegment
    device_id: Opt[str]
    connections: int
    last_activity: ISODateString
    threats: list[str]


class NetworkLink(Model):
    id: str
    source: str
    target: str
    status: LinkStatus
    throughput_mbps: float


class NetworkTopology(Model):
    nodes: list[NetworkNode]
    links: list[NetworkLink]
    updated_at: ISODateString


# ------------------------------------------------------------------ events & traffic

EventType = Literal["detection", "response", "anomaly", "intel", "recovery", "system"]


class SecurityEvent(Model):
    id: str
    type: EventType
    title: str
    message: str
    severity: EventSeverity
    timestamp: ISODateString
    related_threat: Opt[str]
    source_ip: Opt[str]
    device_id: Opt[str]
    outcome: Opt[str]


TrafficRange = Literal["live", "1h", "6h", "24h", "7d"]


class TrafficPoint(Model):
    t: int
    pps: int
    mbps: float
    baseline_pps: int
    baseline_mbps: float
    anomaly_score: float
    anomaly: bool
    attack: Optional[AttackType]
    phase: Optional[Literal["attack", "mitigation"]]


class TrafficSeries(Model):
    range: TrafficRange
    resolution_sec: int
    points: list[TrafficPoint]


# ------------------------------------------------------------------ settings & system

DetectionSensitivity = Literal["conservative", "balanced", "aggressive"]


class DefenseSettings(Model):
    autonomous_mode: bool
    auto_response_threshold: int
    quarantine_threshold: int
    anomaly_threshold: float
    notify_administrator: bool
    detection_sensitivity: DetectionSensitivity


class DefenseSettingsPatch(Model):
    autonomous_mode: Optional[bool] = None
    auto_response_threshold: Optional[int] = None
    quarantine_threshold: Optional[int] = None
    anomaly_threshold: Optional[float] = None
    notify_administrator: Optional[bool] = None
    detection_sensitivity: Optional[DetectionSensitivity] = None


ModuleStatus = Literal["simulated", "active", "ready", "planned"]


class EngineModule(Model):
    key: str
    name: str
    stage: str
    technology: str
    status: ModuleStatus
    description: str


class DataSourceInfo(Model):
    mode: Literal["simulation", "live_capture"]
    label: str
    description: str


class SystemInfo(Model):
    version: str
    data_source: DataSourceInfo
    modules: list[EngineModule]


# ------------------------------------------------------------------ dashboard

SystemStatus = Literal["operational", "elevated", "under_attack", "degraded"]


class DashboardMetrics(Model):
    security_score: int
    active_threats: int
    threats_blocked: int
    devices_protected: int
    network_health: float
    avg_response_ms: int


class ScoreComponent(Model):
    key: Literal["threat_detection", "network_health", "device_security", "response_readiness", "privacy"]
    label: str
    value: int
    weight: float


class SecurityScore(Model):
    score: int
    components: list[ScoreComponent]
    delta24h: int = Field(alias="delta24h")


class DashboardSummary(Model):
    status: SystemStatus
    metrics: DashboardMetrics
    security_score: SecurityScore
    latest_response: Optional[ResponseExecution]
    featured_intel: list[ThreatIntel]
    settings: DefenseSettings
    data_source: DataSourceInfo


# ------------------------------------------------------------------ analytics

AnalyticsRange = Literal["today", "7d", "30d"]


class AttacksOverTimePoint(Model):
    t: int
    critical: int
    high: int
    medium: int
    low: int


class CountByType(Model):
    type: AttackType
    label: str
    count: int


class CountBySeverity(Model):
    severity: Severity
    count: int


class TargetedDevice(Model):
    device_id: str
    hostname: str
    ip: str
    count: int


class MaliciousSource(Model):
    ip: str
    label: str
    count: int
    reputation: Literal["malicious", "suspicious", "unknown"]


class ResponseTimePoint(Model):
    t: int
    avg_ms: int
    p95_ms: int


class RatePoint(Model):
    t: int
    value: float


class ConfidenceBucket(Model):
    bucket: str
    count: int


class ModelMetrics(Model):
    accuracy: float
    precision: float
    recall: float
    f1: float


class ApproachComparison(Model):
    approach: str
    description: str
    accuracy: float
    precision: float
    recall: float
    f1: float


class RocPoint(Model):
    fpr: float
    tpr: float


class ModelPerformance(Model):
    is_simulated: bool
    disclaimer: str
    metrics: ModelMetrics
    comparison: list[ApproachComparison]
    confusion_labels: list[str]
    confusion_matrix: list[list[int]]
    roc_curve: list[RocPoint]
    auc: float


class AnalyticsSummary(Model):
    total_attacks: int
    blocked: int
    avg_response_ms: int
    false_positive_rate: float
    mean_confidence: float


class AnalyticsData(Model):
    range: AnalyticsRange
    summary: AnalyticsSummary
    attacks_over_time: list[AttacksOverTimePoint]
    attacks_by_type: list[CountByType]
    attacks_by_severity: list[CountBySeverity]
    top_targeted_devices: list[TargetedDevice]
    top_malicious_sources: list[MaliciousSource]
    response_time: list[ResponseTimePoint]
    false_positive_trend: list[RatePoint]
    detection_confidence: list[ConfidenceBucket]
    model_performance: ModelPerformance


# ------------------------------------------------------------------ privacy

FederatedClientKind = Literal["hospital", "university", "bank"]


class FederatedClient(Model):
    id: str
    name: str
    kind: FederatedClientKind
    local_samples: int
    local_accuracy: float
    status: Literal["training", "uploading", "idle", "synced"]
    last_update: ISODateString
    update_size_mb: float
    epsilon_spent: float


class DifferentialPrivacyConfig(Model):
    enabled: bool
    mechanism: str
    epsilon: float
    delta: float
    noise_multiplier: float
    clipping_norm: float


class RoundAccuracy(Model):
    round: int
    global_: float = Field(alias="global")
    hospital: float
    university: float
    bank: float


class PrivacyStatus(Model):
    is_simulated: bool
    clients: list[FederatedClient]
    training_rounds: int
    global_accuracy: float
    raw_traffic_shared_gb: float
    model_updates_shared_mb: float
    aggregation: str
    secure_aggregation: bool
    differential_privacy: DifferentialPrivacyConfig
    accuracy_by_round: list[RoundAccuracy]


# ------------------------------------------------------------------ assistant

class EvidenceItem(Model):
    label: str
    value: str
    tone: Opt[Literal["critical", "high", "medium", "low", "safe", "info"]]


class AssistantReply(Model):
    id: str
    content: str
    evidence: list[EvidenceItem]
    actions_taken: list[str]
    recommendations: list[str]
    references: list[EntityRef]
    follow_ups: list[str]
    generated_by: str
    timestamp: ISODateString


class AssistantTurn(Model):
    role: Literal["user", "assistant"]
    content: str


class AssistantRequest(Model):
    message: str = Field(min_length=1, max_length=2000)
    history: Optional[list[AssistantTurn]] = None


# ------------------------------------------------------------------ simulation

SimulationStageKey = Literal[
    "normal",
    "traffic_spike",
    "anomaly_detected",
    "classified",
    "risk_assessed",
    "threat_mapped",
    "responding",
    "awaiting_approval",
    "blocked",
    "recovered",
]


class SimulationStage(Model):
    key: SimulationStageKey
    label: str
    description: str
    status: Literal["pending", "active", "done"]
    at: Opt[ISODateString]


class AttackScenario(Model):
    type: AttackType
    label: str
    description: str
    severity: Severity
    target_label: str
    expected_signals: list[str]
    duration_sec: int


class SimulationState(Model):
    id: str
    attack: AttackType
    label: str
    status: Literal["running", "awaiting_approval", "completed", "cancelled"]
    current_stage: SimulationStageKey
    stages: list[SimulationStage]
    started_at: ISODateString
    mode: ResponseMode
    threat_id: Opt[str]
    target_device_id: Opt[str]


class SimulationRequest(Model):
    attack: AttackType


# ------------------------------------------------------------------ realtime

class RealtimeEnvelope(Model):
    """One message on the realtime channel; `seq` orders messages for resume / polling."""

    seq: int
    message: dict[str, Any]


class RealtimePoll(Model):
    seq: int
    messages: list[dict[str, Any]]
