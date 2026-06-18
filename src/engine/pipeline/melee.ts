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

/** Default enemy-spacing assumption (m between bodies in a swing arc). */
export const DEFAULT_ENEMY_SPACING = 1.5;

/**
 * Reach → enemy-count (Stage 5, decision 19). Derive how many enemies a single
 * swing hits from the weapon's **Reach** and an **enemy-spacing** assumption:
 * `floor(reach / spacing) + 1` (the wielder's own target + one per spacing of
 * reach), clamped to ≥1. Feeds the Follow-Through multi-target total, replacing
 * the manual target count when a spacing is supplied.
 */
export function reachTargetCount(reach: number | undefined, spacing = DEFAULT_ENEMY_SPACING): number {
  if (!reach || reach <= 0 || spacing <= 0) return 1;
  return Math.max(1, Math.floor(reach / spacing) + 1);
}

/** Inputs to the sustained heavy-attack combo-rebuild loop (decision 18). */
export interface HeavyLoopParams {
  /** Avg heavy-attack damage at the operating Combo Count (× heavy mult × combo). */
  heavyHit: number;
  /** Avg Normal-attack damage per hit (rebuilds combo between heavies). */
  normalHit: number;
  /** Modified attack speed (attacks/s) — Normal hits rebuild combo at this rate. */
  attackSpeed: number;
  /** Heavy-attack wind-up (s) gating each heavy (attack speed does NOT reduce it). */
  windUp: number;
  /** Operating Combo Count C the heavy is spent at. */
  comboCount: number;
  /** Fraction of the Combo Count a heavy consumes (1 = the whole counter). */
  comboCost: number;
  /** Heavy Attack Efficiency (0..0.9) refunding part of the consumed combo. */
  heavyEfficiency: number;
}

export interface HeavyLoopResult {
  /** Sustained heavy DPS across the rebuild→heavy loop. */
  sustainedDps: number;
  /** Combo points consumed per heavy (after efficiency). */
  comboConsumed: number;
  /** Normal hits needed to rebuild that combo (1 combo / hit). */
  rebuildHits: number;
  /** Seconds for one rebuild + heavy loop. */
  loopSeconds: number;
  normalHit: number;
  heavyHit: number;
}

/**
 * Sustained heavy-attack DPS via the combo-rebuild loop (Stage 5, decision 18).
 * Stage 3 modelled only the heavy per-hit + a `1/windUp` burst and deferred the
 * loop here. One loop = rebuild the combo the last heavy consumed (Normal hits at
 * attack speed) + one wind-up-gated heavy:
 *   loopTime    = rebuildHits / attackSpeed + windUp
 *   loopDamage  = rebuildHits × normalHit  + heavyHit
 *   sustainedDPS = loopDamage / loopTime
 * At Combo 0 this reduces to the Stage-3 burst (`heavyHit / windUp`).
 */
export function sustainedHeavyLoop(p: HeavyLoopParams): HeavyLoopResult {
  const eff = Math.max(0, Math.min(0.9, p.heavyEfficiency));
  const comboConsumed = Math.max(0, p.comboCount) * Math.max(0, p.comboCost) * (1 - eff);
  const rebuildHits = comboConsumed; // 1 combo point per Normal hit
  const buildTime = p.attackSpeed > 0 ? rebuildHits / p.attackSpeed : 0;
  const loopSeconds = buildTime + Math.max(0, p.windUp);
  const loopDamage = rebuildHits * p.normalHit + p.heavyHit;
  const sustainedDps = loopSeconds > 0 ? loopDamage / loopSeconds : 0;
  return { sustainedDps, comboConsumed, rebuildHits, loopSeconds, normalHit: p.normalHit, heavyHit: p.heavyHit };
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
