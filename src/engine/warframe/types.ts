/**
 * Frame-stat resolver output types (Stage 4).
 *
 * `WarframeStats` is the analogue of `DamageResult` for the Warframe compartment:
 * the four ability attributes (as multipliers, `1.0` = 100%), the final
 * survivability stats, a generic EHP breakdown, per-ability outputs, and the
 * Emitted Buff magnitudes the weapon calc consumes. Produced by `resolveWarframe`
 * — **not** the weapon damage pipeline.
 */
import type { AbilityScaling, FrameEffect, FrameStat } from '../model/types';

/** One equipped frame mod resolved into frame-stat effects (Stage 4). */
export interface FrameSource {
  id: string;
  label: string;
  rank: number;
  maxRank: number;
  /** Static frame-stat effects (scaled by rank in the resolver). */
  frameEffects?: FrameEffect[];
  /** Custom-effect registry key (Umbral set bonuses → FrameEffect[]). */
  customEffectId?: string;
  /** Set id (ADR 0004) tallied into `setCounts`. */
  set?: string;
}

/** Generic EHP breakdown (no incoming damage type — Stage 4 scope). */
export interface EhpBreakdown {
  /** Armor → damage-reduction fraction `armor/(armor+300)` (0..1). */
  armorDamageReduction: number;
  /** Effective health from armor: `health × (1 + armor/300)`. */
  healthEhp: number;
  /** Shield pool (largely armor-independent → added flat). */
  shield: number;
  /** Generic total: `healthEhp + shield`. */
  total: number;
}

/** One ability's strength/duration/range-scaled outputs (display + buffs). */
export interface AbilityOutput {
  id: string;
  name: string;
  /** Strength-scaled damage-bonus magnitude (Roar: `0.5 × strength`). */
  strengthMagnitude?: number;
  /** Duration-scaled seconds. */
  durationSeconds?: number;
  /** Range-scaled metres. */
  rangeMetres?: number;
  /** Scrape was uncertain — flagged for manual review. */
  lowConfidence?: boolean;
}

export interface WarframeStats {
  /** Ability attributes as multipliers (`1.0` = 100%). */
  abilityStrength: number;
  abilityDuration: number;
  abilityRange: number;
  /** Capped at 1.75 (175%). */
  abilityEfficiency: number;
  /** Final survivability + utility stats (base × mod multipliers). */
  health: number;
  shield: number;
  armor: number;
  energy: number;
  ehp: EhpBreakdown;
  /** Per-ability outputs (every authored ability, for display). */
  abilities: AbilityOutput[];
  /** Emitted Buff magnitudes by buff id, e.g. `{ roar: 0.885 }`. */
  emittedBuffs: Record<string, number>;
}

/** Per-stat additive sums (before applying base/cap). */
export type FrameStatSums = Record<FrameStat, number>;

/** Ability scaling lookup, keyed by ability id (merged from `abilities.json`). */
export type AbilityScalingMap = Record<string, AbilityScaling>;
