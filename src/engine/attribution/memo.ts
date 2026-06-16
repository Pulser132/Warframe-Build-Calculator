/**
 * A memoized `calculateBuild`. Attribution recomputes the build N times
 * (once per equipped source removed), and the store recomputes on every change;
 * caching by a stable signature keeps those evaluations cheap.
 */
import type { DamageResult } from '../model/result';
import { calculateBuild, type CalcInput } from '../pipeline/calculate';
import type { CalcFn } from './strategy';

function signature(input: CalcInput): string {
  const sources = input.sources
    .map((s) => `${s.id}@${s.rank}`)
    .join(',');
  const conditions = Object.entries(input.combat.conditions)
    .filter(([, on]) => on)
    .map(([k]) => k)
    .sort()
    .join(',');
  const stacks = Object.entries(input.combat.stacks)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}:${n}`)
    .sort()
    .join(',');
  const buffs = input.combat.buffs
    .map((b) => `${b.id}:${b.strength}`)
    .sort()
    .join(',');
  return `${input.weapon.id}|${sources}|${conditions}|${stacks}|${buffs}`;
}

/** Create a calc function backed by an LRU-ish bounded cache. */
export function createMemoizedCalc(maxEntries = 64): CalcFn {
  const cache = new Map<string, DamageResult>();
  return (input: CalcInput): DamageResult => {
    const key = signature(input);
    const hit = cache.get(key);
    if (hit) return hit;
    const result = calculateBuild(input);
    cache.set(key, result);
    if (cache.size > maxEntries) {
      // Evict the oldest insertion.
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return result;
  };
}
