import { shuffleInPlace, weightedPermutation } from './random';
import { Agent, QuorumParams, SimulationState } from './types';

export interface StepResult {
  finalized: boolean;
  signers: string[]; // agent ids
  rewards: Map<string, number>;
}

export function quorumStep(
  state: SimulationState,
  params: QuorumParams
): StepResult {
  const {
    quorumThreshold,
    perRoundReward,
    selectionPolicy,
    rewardPolicy = 'perSignerEqual',
  } = params;

  // 1) онлайн-агенты
  const online = state.agents.filter((a) => state.rng() < a.reliability);

  // 2) план формирования кворума
  const totalStake = state.totalStake; // относительно полного стейка системы
  const target = quorumThreshold * totalStake;

  if (online.length === 0) {
    return { finalized: false, signers: [], rewards: new Map() };
  }

  let ordered: Agent[];
  if (selectionPolicy === 'greedy') {
    ordered = [...online].sort((a, b) => b.stake - a.stake);
  } else if (selectionPolicy === 'weighted') {
    const weights = online.map((a) => a.stake);
    ordered = weightedPermutation(online, weights, state.rng);
  } else {
    ordered = [...online];
    shuffleInPlace(ordered, state.rng);
  }

  // 3) набираем кворум
  let acc = 0;
  const signers: Agent[] = [];
  for (const a of ordered) {
    signers.push(a);
    acc += a.stake;
    if (acc >= target) break;
  }

  const finalized = acc >= target;
  if (!finalized) {
    return { finalized: false, signers: [], rewards: new Map() };
  }

  // 4) распределение наград
  const rewards = new Map<string, number>();
  if (rewardPolicy === 'perSignerEqual') {
    const r = perRoundReward / signers.length;
    for (const s of signers) rewards.set(s.id, r);
  } else {
    // пропорционально stake в подписантах
    const sumSignerStake = signers.reduce((a, b) => a + b.stake, 0);
    for (const s of signers) {
      const r =
        sumSignerStake > 0 ? (perRoundReward * s.stake) / sumSignerStake : 0;
      rewards.set(s.id, r);
    }
  }

  return { finalized: true, signers: signers.map((s) => s.id), rewards };
}
