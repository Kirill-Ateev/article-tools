export function normalizeToSum(xs: number[], targetSum: number): number[] {
  const s = xs.reduce((a, b) => a + b, 0);
  if (s === 0) return xs.map((_) => targetSum / xs.length);
  const k = targetSum / s;
  return xs.map((x) => x * k);
}

export function samplePareto(
  n: number,
  alpha: number,
  rng: () => number
): number[] {
  // xm = 1; X = xm / U^(1/alpha); heavy-tailed
  const xs = Array.from({ length: n }, () => {
    const u = Math.max(rng(), 1e-12);
    return 1 / Math.pow(u, 1 / alpha);
  });
  return xs;
}

export function sampleUniform(n: number): number[] {
  return Array.from({ length: n }, () => 1);
}

export function sampleLogNormal(
  n: number,
  mu: number,
  sigma: number,
  rng: () => number
): number[] {
  // Box-Muller
  const res: number[] = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.max(rng(), 1e-12);
    const u2 = Math.max(rng(), 1e-12);
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const x = Math.exp(mu + sigma * z0);
    res.push(x);
  }
  return res;
}

export function giniFromNonNegative(xs: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let cum = 0;
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    cum += sorted[i];
    weightedSum += cum;
  }
  // Gini using Lorenz curve area
  // G = 1 - 2 * (area under Lorenz curve)
  const lorenzArea = weightedSum / (n * sum);
  return 1 - 2 * (0.5 - (lorenzArea - 0.5 / n));
}
