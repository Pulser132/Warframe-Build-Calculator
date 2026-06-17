/**
 * Melee-specific pipeline helpers (pure) — Stage 3.
 *
 *  - **Follow-Through**: the multi-target total when one swing hits `n` enemies in
 *    its arc, `hit × Σ_{k=0}^{n−1} FT^k = hit × (1 − FT^n)/(1 − FT)` (the n-th
 *    target takes `FT^(n−1)`). Single-target output is unchanged; this is an
 *    **extra** (mirrors the Stage 2 AoE center/rim extras). Source:
 *    `docs/warframe/mechanics/follow-through.md`.
 *  - **Combo String**: a stance attack sequence — per-hit damage = baseHit ×
 *    `hit.damageMultiplier`; the combo's total / average-per-hit / DPS follow from
 *    the expanded hit list and the attack speed. Forced procs are surfaced for the
 *    status model.
 */
import type { DamageType } from '../model/types';
import type { ComboString } from '../model/firemode';

/**
 * Multi-target total damage across `n` enemies in one swing's arc.
 * `FT = 1` (no reduction) → `n × hit`; `FT = 0` → just `hit`.
 */
export function followThroughTotal(hit: number, followThrough: number, n: number): number {
  const targets = Math.max(0, Math.floor(n));
  if (targets <= 1) return hit * Math.min(targets, 1);
  const ft = Math.max(0, Math.min(followThrough, 1));
  if (ft >= 1) return hit * targets;
  return hit * ((1 - Math.pow(ft, targets)) / (1 - ft));
}

/** A computed Combo String breakdown (an extra result field on the Normal mode). */
export interface ComboStringResult {
  name: string;
  stance: string;
  /** Total damage dealt over one full combo (all hits). */
  totalDamage: number;
  /** Number of individual hits in the combo. */
  hitCount: number;
  /** Average damage per hit over the combo. */
  averagePerHit: number;
  /** Combo duration in seconds (`hitCount / attackSpeed`). */
  durationSeconds: number;
  /** Combo DPS (`totalDamage / durationSeconds`). */
  dps: number;
  /** Per-hit damage values, in order (for the UI breakdown). */
  perHit: number[];
  /** Union of forced status types the combo always applies. */
  forcedProcs: DamageType[];
  /** Whether the underlying scraped data was flagged low-confidence. */
  lowConfidence?: boolean;
}

/**
 * Compute a Combo String breakdown. `baseHit` is the Normal Attack's average
 * damage per hit (crit-weighted, conditionals on); `attackSpeed` is the modified
 * attacks/second (each hit takes `1/attackSpeed`).
 */
export function comboStringBreakdown(
  combo: ComboString,
  baseHit: number,
  attackSpeed: number,
): ComboStringResult {
  const perHit: number[] = [];
  const forced = new Set<DamageType>();
  for (const hit of combo.hits) {
    const repeats = Math.max(1, Math.floor(hit.hits ?? 1));
    for (let i = 0; i < repeats; i++) perHit.push(baseHit * hit.damageMultiplier);
    for (const p of hit.forcedProcs ?? []) forced.add(p);
  }
  const totalDamage = perHit.reduce((s, v) => s + v, 0);
  const hitCount = perHit.length;
  const durationSeconds = attackSpeed > 0 ? hitCount / attackSpeed : 0;
  return {
    name: combo.name,
    stance: combo.stance,
    totalDamage,
    hitCount,
    averagePerHit: hitCount > 0 ? totalDamage / hitCount : 0,
    durationSeconds,
    dps: durationSeconds > 0 ? totalDamage / durationSeconds : 0,
    perHit,
    forcedProcs: [...forced],
    lowConfidence: combo.lowConfidence,
  };
}
