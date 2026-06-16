/**
 * Small pure mechanic helpers shared by the calculator: shotgun proc
 * probability, proc-type weighting, and AoE linear falloff. Formulas locked in
 * `docs/warframe/mechanics/shotguns.md` and `aoe-falloff.md`.
 */
import type { DamageType } from '../model/types';
import type { DamageMap } from '../model/result';
import type { FalloffSpec } from '../model/firemode';

/**
 * Probability of **at least one** status proc on a shot of `n` independent
 * pellets each at per-pellet chance `s`: `1 − (1 − s)^n`. For `s ≥ 1` every
 * pellet forces a proc, so the result is 1.
 */
export function probAtLeastOneProc(statusPerPellet: number, pelletCount: number): number {
  const n = Math.max(0, pelletCount);
  if (n === 0) return 0;
  const s = Math.max(0, Math.min(statusPerPellet, 1));
  return 1 - Math.pow(1 - s, n);
}

/**
 * Proc-type weighting: when a status proc occurs, the chance it is of a given
 * element is that element's share of total damage (`elementDamage / totalDamage`).
 */
export function procTypeWeights(perType: DamageMap): Partial<Record<DamageType, number>> {
  let total = 0;
  for (const v of Object.values(perType)) total += v ?? 0;
  const out: Partial<Record<DamageType, number>> = {};
  if (total <= 0) return out;
  for (const [type, value] of Object.entries(perType) as [DamageType, number][]) {
    out[type] = (value ?? 0) / total;
  }
  return out;
}

/**
 * Linear falloff factor at distance `d`:
 * `1` for `d ≤ start`, `1 − maxReduction` for `d ≥ end`, linear between.
 */
export function falloffFactor(spec: FalloffSpec, d: number): number {
  if (d <= spec.start) return 1;
  if (d >= spec.end) return 1 - spec.maxReduction;
  const span = spec.end - spec.start;
  if (span <= 0) return 1 - spec.maxReduction;
  return 1 - ((d - spec.start) / span) * spec.maxReduction;
}

/** The rim/min factor (`1 − maxReduction`) for a radial component. */
export function rimFactor(spec: FalloffSpec): number {
  return 1 - spec.maxReduction;
}
