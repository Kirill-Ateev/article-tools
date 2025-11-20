// src/random.ts
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Weighted random permutation without replacement (Efraimidis–Spirakis)
export function weightedPermutation<T>(
  items: T[],
  weights: number[],
  rng: () => number
): T[] {
  const keys = items.map((it, i) => {
    const w = Math.max(weights[i], 1e-12);
    const u = Math.max(rng(), 1e-12);
    // key = u^(1/w) — sort desc
    const key = Math.pow(u, 1 / w);
    return { it, key };
  });
  keys.sort((a, b) => b.key - a.key);
  return keys.map((k) => k.it);
}
