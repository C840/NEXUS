-- NEXUS event store — PostgreSQL schema.
--
-- Today the backend keeps this data in an in-memory repository
-- (backend/app/engine/state.py). This schema mirrors the same entities so a
-- PostgreSQL repository can replace it without changing the API contract.
-- Column names follow the API models (snake_case here, camelCase in JSON).

CREATE TABLE IF NOT EXISTS devices (
    id              TEXT PRIMARY KEY,                 -- 'pc-07'
    hostname        TEXT NOT NULL,
    ip              INET NOT NULL,
    mac             MACADDR NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('workstation','laptop','server','camera','iot_sensor','printer','mobile','network')),
    os              TEXT NOT NULL,
    vendor          TEXT NOT NULL,
    segment         TEXT NOT NULL CHECK (segment IN ('edge','core','servers','workstations','iot')),
    role            TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('safe','suspicious','compromised','quarantined')),
    risk_score      SMALLINT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    connections     INTEGER NOT NULL DEFAULT 0,
    open_ports      INTEGER[] NOT NULL DEFAULT '{}',
    bytes_in_24h    BIGINT NOT NULL DEFAULT 0,
    bytes_out_24h   BIGINT NOT NULL DEFAULT 0,
    last_seen       TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS threats (
    id                  TEXT PRIMARY KEY,             -- 'THR-4504'
    type                TEXT NOT NULL CHECK (type IN ('ddos','port_scan','brute_force','dns_anomaly','malware','unknown_anomaly')),
    name                TEXT NOT NULL,
    severity            TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
    status              TEXT NOT NULL,
    source_ip           TEXT NOT NULL,                -- may be a masked external address
    source_label        TEXT NOT NULL,
    target_ip           TEXT NOT NULL,
    target_label        TEXT NOT NULL,
    device_id           TEXT REFERENCES devices(id),
    confidence          NUMERIC(5,1) NOT NULL,
    risk_score          SMALLINT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    explanation         TEXT NOT NULL,
    mitre_id            TEXT,
    mitre_name          TEXT,
    mitre_tactic        TEXT,
    detected_by         TEXT[] NOT NULL,
    response_time_ms    INTEGER,
    related_event_count INTEGER NOT NULL DEFAULT 0,
    response_mode       TEXT NOT NULL DEFAULT 'autonomous',
    decided_by          TEXT,
    detected_at         TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS threats_detected_at_idx ON threats (detected_at DESC);
CREATE INDEX IF NOT EXISTS threats_status_idx ON threats (status);
CREATE INDEX IF NOT EXISTS threats_device_idx ON threats (device_id);

-- SHAP-style attributions per detection (explainable AI).
CREATE TABLE IF NOT EXISTS threat_features (
    threat_id     TEXT NOT NULL REFERENCES threats(id) ON DELETE CASCADE,
    key           TEXT NOT NULL,
    label         TEXT NOT NULL,
    contribution  NUMERIC(6,3) NOT NULL,
    observed      TEXT NOT NULL,
    baseline      TEXT NOT NULL,
    PRIMARY KEY (threat_id, key)
);

-- Risk engine inputs (riskScore = Σ value × weight).
CREATE TABLE IF NOT EXISTS risk_factors (
    threat_id  TEXT NOT NULL REFERENCES threats(id) ON DELETE CASCADE,
    key        TEXT NOT NULL CHECK (key IN ('detection_confidence','anomaly_score','behavioral_risk','threat_intelligence')),
    value      NUMERIC(5,1) NOT NULL,
    weight     NUMERIC(4,3) NOT NULL,
    PRIMARY KEY (threat_id, key)
);

CREATE TABLE IF NOT EXISTS response_actions (
    id          TEXT PRIMARY KEY,
    threat_id   TEXT NOT NULL REFERENCES threats(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    label       TEXT NOT NULL,
    target      TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('pending','executing','done','skipped','failed')),
    detail      TEXT,
    executed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS response_actions_threat_idx ON response_actions (threat_id);

CREATE TABLE IF NOT EXISTS security_events (
    id              TEXT PRIMARY KEY,
    type            TEXT NOT NULL CHECK (type IN ('detection','response','anomaly','intel','recovery','system')),
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    severity        TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
    related_threat  TEXT REFERENCES threats(id) ON DELETE SET NULL,
    source_ip       TEXT,
    device_id       TEXT REFERENCES devices(id),
    outcome         TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS security_events_occurred_idx ON security_events (occurred_at DESC);

CREATE TABLE IF NOT EXISTS threat_intel (
    ip              TEXT PRIMARY KEY,
    reputation      TEXT NOT NULL CHECK (reputation IN ('malicious','suspicious','unknown','clean')),
    threat_type     TEXT NOT NULL,
    confidence      NUMERIC(5,1) NOT NULL,
    first_observed  TIMESTAMPTZ NOT NULL,
    last_observed   TIMESTAMPTZ NOT NULL,
    related_events  INTEGER NOT NULL DEFAULT 0,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    source          TEXT NOT NULL
);

-- Single-row defense policy (autonomous vs manual, thresholds).
CREATE TABLE IF NOT EXISTS defense_settings (
    id                        BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    autonomous_mode           BOOLEAN NOT NULL DEFAULT TRUE,
    auto_response_threshold   SMALLINT NOT NULL DEFAULT 70,
    quarantine_threshold      SMALLINT NOT NULL DEFAULT 85,
    anomaly_threshold         NUMERIC(3,2) NOT NULL DEFAULT 0.72,
    notify_administrator      BOOLEAN NOT NULL DEFAULT TRUE,
    detection_sensitivity     TEXT NOT NULL DEFAULT 'balanced'
);
