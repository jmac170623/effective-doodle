// Deterministic per-business variant selection: the same business always
// regenerates the same pick, but different businesses spread across a pool
// instead of all looking/sounding identical. Callers seed with a
// discriminator suffix (e.g. `${businessName}|hero`, `${businessName}|palette`)
// so independent choices land independently — picking a hero copy variant
// doesn't correlate with which palette or layout gets picked for the same
// business, which is what actually keeps the combined space from colliding
// as fast as any single pool's own size would suggest.
export function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function pickVariant<T>(variants: T[], seed: string): T {
  return variants[hashString(seed) % variants.length];
}
