// src/types.ts
export type ID = string;

export interface Agent {
  id: ID;
  entityId: ID;
  stake: number;
  reliability: number;
}

export interface SimulationState {
  round: number;
  agents: Agent[];
  totalStake: number;
  rng: () => number;
}

export type SelectionPolicy = 'greedy' | 'weighted' | 'uniform';

export interface QuorumParams {
  quorumThreshold: number;
  selectionPolicy: SelectionPolicy;
  perRoundReward: number;
  rewardPolicy?: 'perSignerEqual' | 'perStakeInSigner';
}

export interface ScenarioParams {
  name: string;
  seed: number;
  rounds: number;

  numEntities: number;
  sybilsPerEntity: number;
  totalStake: number;
  initialDistribution: 'pareto' | 'uniform' | 'lognormal';
  paretoAlpha?: number;
  lognormal?: { mu: number; sigma: number };

  reliabilityModel: 'constant' | 'twoTier' | 'uniform';
  reliability: {
    p?: number;
    hi?: number;
    lo?: number;
    shareHi?: number;
    min?: number;
    max?: number;
  };

  consensus: QuorumParams;
  nakamotoThreshold?: number;
}

export interface RoundMetrics {
  round: number;
  finalized: boolean;
  nakamoto: number; // целочисленный N
  nakamotoFrac: number; // фракционный N
  nakamotoEma: number; // EMA(fractional N)
  top1EntityShare: number;
  gini: number;
}

export interface ScenarioResult {
  scenario: ScenarioParams;
  rounds: RoundMetrics[];
  summary: {
    initialNakamoto: number;
    finalNakamoto: number;
    initialNakamotoFrac: number;
    finalNakamotoFrac: number;
    successRate: number;
    slopeNakamotoFrac: number;
  };
}
