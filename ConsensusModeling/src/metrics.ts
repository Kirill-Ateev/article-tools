// src/metrics.ts
import { Agent } from './types';

export function aggregateStakeByEntity(agents: Agent[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of agents) {
    m.set(a.entityId, (m.get(a.entityId) ?? 0) + a.stake);
  }
  return m;
}

// Целочисленный индекс Накамото (> threshold)
export function nakamotoIndexByEntities(
  agents: Agent[],
  threshold = 0.5
): number {
  const entityStake = Array.from(aggregateStakeByEntity(agents).values());
  const total = entityStake.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  const sorted = entityStake.sort((a, b) => b - a);
  let acc = 0;
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i];
    if (acc > threshold * total) return i + 1;
  }
  return sorted.length;
}

// Фракционный Накамото: линейная интерполяция внутри "решающей" сущности
export function fractionalNakamotoIndexByEntities(
  agents: Agent[],
  threshold = 0.5
): number {
  const entityStake = Array.from(aggregateStakeByEntity(agents).values());
  const total = entityStake.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  const sorted = entityStake.sort((a, b) => b - a);
  const T = threshold * total;
  let acc = 0;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (acc + s > T) {
      if (s <= 1e-12) return i + 1; // защита от нулевых
      const frac = (T - acc) / s; // в (0,1]
      return i + frac + 0; // т.к. i — 0-базный, i+frac — уже фракционный индекс
    }
    acc += s;
  }
  return sorted.length;
}

export function top1EntityShare(agents: Agent[]): number {
  const entityStake = Array.from(aggregateStakeByEntity(agents).values());
  const total = entityStake.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const max = Math.max(...entityStake);
  return max / total;
}

export function giniByEntities(agents: Agent[]): number {
  const entityStake = Array.from(aggregateStakeByEntity(agents).values());
  const n = entityStake.length;
  if (n === 0) return 0;
  const sorted = [...entityStake].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let sum_i_xi = 0;
  for (let i = 0; i < n; i++) sum_i_xi += (i + 1) * sorted[i];
  return (2 * sum_i_xi) / (n * sum) - (n + 1) / n;
}

// Наклон линейной регрессии
export function slopeLinear(times: number[], values: number[]): number {
  const n = times.length;
  if (n < 2) return 0;
  const meanT = times.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    const dt = times[i] - meanT;
    num += dt * (values[i] - meanY);
    den += dt * dt;
  }
  return den === 0 ? 0 : num / den;
}
