export type DetectionSensitivity = 'conservative' | 'balanced' | 'aggressive'

export interface DefenseSettings {
  /** AUTONOMOUS MODE (true) vs MANUAL MODE (false). */
  autonomousMode: boolean
  /** Minimum risk score for an automated containment response. */
  autoResponseThreshold: number
  /** Minimum risk score for quarantining an internal device. */
  quarantineThreshold: number
  /** Isolation-forest style anomaly threshold, 0–1. */
  anomalyThreshold: number
  notifyAdministrator: boolean
  detectionSensitivity: DetectionSensitivity
}

/** Status of a pipeline module — makes simulated vs real components explicit. */
export type ModuleStatus = 'simulated' | 'active' | 'ready' | 'planned'

export interface EngineModule {
  key: string
  name: string
  /** Pipeline stage the module serves: "AI Threat Detection". */
  stage: string
  /** Target technology: "XGBoost", "Scapy", "SHAP". */
  technology: string
  status: ModuleStatus
  description: string
}

export interface DataSourceInfo {
  mode: 'simulation' | 'live_capture'
  label: string
  description: string
}

export interface SystemInfo {
  version: string
  dataSource: DataSourceInfo
  modules: EngineModule[]
}
