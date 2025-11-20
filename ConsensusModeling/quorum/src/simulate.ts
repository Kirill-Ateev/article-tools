// src/simulate.ts
import { quorumStep } from './consensus';
import {
  fractionalNakamotoIndexByEntities,
  giniByEntities,
  nakamotoIndexByEntities,
  slopeLinear,
  top1EntityShare,
} from './metrics';
import {
  Agent,
  ScenarioParams,
  ScenarioResult,
  SimulationState,
} from './types';

export function runScenario(
  params: ScenarioParams,
  baseAgents: Agent[],
  rng: () => number
): ScenarioResult {
  const agents: Agent[] = baseAgents.map((a) => ({ ...a }));
  const state: SimulationState = {
    round: 0,
    agents,
    totalStake: agents.reduce((a, b) => a + b.stake, 0),
    rng,
  };

  const nakamotoFracSeries: number[] = [];
  const timeSeries: number[] = [];
  const roundsData: any[] = [];
  let finalizedCount = 0;
  const thr = params.nakamotoThreshold ?? 0.5;

  // EMA по фракционному N
  const alpha = 0.02;
  let ema = 0;

  for (let r = 1; r <= params.rounds; r++) {
    state.round = r;
    const res = quorumStep(state, params.consensus);

    if (res.finalized) {
      finalizedCount++;
      for (const [id, reward] of res.rewards) {
        const ag = state.agents.find((a) => a.id === id)!;
        ag.stake += reward;
      }
      state.totalStake = state.agents.reduce((a, b) => a + b.stake, 0);
    }

    const nInt = nakamotoIndexByEntities(state.agents, thr);
    const nFrac = fractionalNakamotoIndexByEntities(state.agents, thr);
    ema = r === 1 ? nFrac : alpha * nFrac + (1 - alpha) * ema;

    const top1 = top1EntityShare(state.agents);
    const gini = giniByEntities(state.agents);

    nakamotoFracSeries.push(nFrac);
    timeSeries.push(r);

    roundsData.push({
      round: r,
      finalized: res.finalized,
      nakamoto: nInt,
      nakamotoFrac: nFrac,
      nakamotoEma: ema,
      top1EntityShare: top1,
      gini,
    });
  }

  const slope = slopeLinear(timeSeries, nakamotoFracSeries);
  const result: ScenarioResult = {
    scenario: params,
    rounds: roundsData,
    summary: {
      initialNakamoto: roundsData[0].nakamoto,
      finalNakamoto: roundsData[roundsData.length - 1].nakamoto,
      initialNakamotoFrac: roundsData[0].nakamotoFrac,
      finalNakamotoFrac: roundsData[roundsData.length - 1].nakamotoFrac,
      successRate: finalizedCount / params.rounds,
      slopeNakamotoFrac: slope,
    },
  };
  return result;
}
