import {
  normalizeToSum,
  sampleLogNormal,
  samplePareto,
  sampleUniform,
} from './distributions';
import { mulberry32 } from './random';
import { Agent, ScenarioParams } from './types';

export function buildAgents(params: ScenarioParams): {
  agents: Agent[];
  rng: () => number;
} {
  const rng = mulberry32(params.seed);

  const E = params.numEntities;
  const sybils = params.sybilsPerEntity;
  const totalAgents = E * sybils;

  // 1) Начальное распределение по сущностям
  let entityWeights: number[];
  if (params.initialDistribution === 'pareto') {
    const alpha = params.paretoAlpha ?? 1.1;
    entityWeights = samplePareto(E, alpha, rng);
  } else if (params.initialDistribution === 'lognormal') {
    const mu = params.lognormal?.mu ?? 0;
    const sigma = params.lognormal?.sigma ?? 1;
    entityWeights = sampleLogNormal(E, mu, sigma, rng);
  } else {
    entityWeights = sampleUniform(E);
  }
  entityWeights = normalizeToSum(entityWeights, params.totalStake);

  // 2) Reliability модель
  const reliabOfEntity: number[] = [];
  for (let i = 0; i < E; i++) {
    if (params.reliabilityModel === 'constant') {
      reliabOfEntity[i] = params.reliability.p ?? 0.98;
    } else if (params.reliabilityModel === 'twoTier') {
      const hi = params.reliability.hi ?? 0.99;
      const lo = params.reliability.lo ?? 0.95;
      const shareHi = params.reliability.shareHi ?? 0.2;
      const isHi = rng() < shareHi;
      reliabOfEntity[i] = isHi ? hi : lo;
    } else {
      const min = params.reliability.min ?? 0.9;
      const max = params.reliability.max ?? 0.99;
      reliabOfEntity[i] = min + (max - min) * rng();
    }
  }

  // 3) Сплит сущностей на sybil-агентов
  const agents: Agent[] = [];
  for (let e = 0; e < E; e++) {
    const stakeE = entityWeights[e];
    // можно поровну или немного шумнуть
    const splits = Array.from(
      { length: sybils },
      () => 1 + 0.05 * (rng() - 0.5)
    );
    const weights = normalizeToSum(splits, stakeE);
    for (let s = 0; s < sybils; s++) {
      agents.push({
        id: `a_${e}_${s}`,
        entityId: `ent_${e}`,
        stake: weights[s],
        reliability: reliabOfEntity[e],
      });
    }
  }

  return { agents, rng };
}
