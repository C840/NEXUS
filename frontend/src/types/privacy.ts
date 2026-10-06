import type { ISODateString } from './common'

export type FederatedClientKind = 'hospital' | 'university' | 'bank'

export interface FederatedClient {
  id: string
  name: string
  kind: FederatedClientKind
  /** Flow records that stay on-premises. */
  localSamples: number
  /** Percent. */
  localAccuracy: number
  status: 'training' | 'uploading' | 'idle' | 'synced'
  lastUpdate: ISODateString
  /** Size of the last model update sent. */
  updateSizeMb: number
  /** Differential-privacy budget consumed so far. */
  epsilonSpent: number
}

export interface DifferentialPrivacyConfig {
  enabled: boolean
  mechanism: string
  epsilon: number
  delta: number
  noiseMultiplier: number
  clippingNorm: number
}

export interface RoundAccuracy {
  round: number
  global: number
  hospital: number
  university: number
  bank: number
}

export interface PrivacyStatus {
  isSimulated: boolean
  clients: FederatedClient[]
  trainingRounds: number
  /** Percent. */
  globalAccuracy: number
  rawTrafficSharedGb: number
  modelUpdatesSharedMb: number
  aggregation: string
  secureAggregation: boolean
  differentialPrivacy: DifferentialPrivacyConfig
  accuracyByRound: RoundAccuracy[]
}
