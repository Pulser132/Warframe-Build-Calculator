/**
 * Custom-effect registry shape (Stage 1 seam).
 *
 * Most mods are fully described by static `EffectDescriptor`s. Special-case mods
 * whose effect depends on build/combat context (e.g. Condition Overload scaling
 * with active status types, set bonuses) register a named function here instead.
 * The pipeline consults this registry when a mod declares a `customEffectId`.
 *
 * Stage 1 ships no custom effects — the registry exists so later stages add a
 * data entry + a small function without touching the pipeline or UI (Goal.md).
 */
import type { EffectDescriptor, FrameEffect } from './types';
import type { Build, CombatState } from './build';

export interface CustomEffectContext {
  /** Combat state (combo count, active status count, conditions, stacks). */
  combat: CombatState;
  /** Equipped mod/arcane rank that triggered this custom effect. */
  rank: number;
  /** The source's max rank (for scaling). */
  maxRank: number;
  /** The build, when available (optional — the Stage 3 fns don't need it). */
  build?: Build;
  /**
   * Precomputed per-set tally (ADR 0004): count of equipped mods per `set` id in
   * the current compartment, e.g. `{ umbral: 3 }`. Computed once per resolve and
   * threaded into both the weapon `gather` ctx and the frame resolver ctx so a
   * set-bonus function reads `ctx.setCounts['umbral']` without re-scanning the
   * loadout. Empty when no set mods are equipped.
   */
  setCounts: Record<string, number>;
}

/**
 * A registry function returns **already-computed, rank-scaled** effects. The
 * `gather` stage folds damage descriptors into the bucket sums and the frame
 * resolver folds frame-stat effects into the frame-stat sums — each **without**
 * re-applying `rankFactor`/`perStack` (see ADR 0002 / ADR 0004). A function
 * returns whichever kind suits its mod (weapon-damage mods → `EffectDescriptor`;
 * Warframe set-bonus mods → `FrameEffect`); a `'bucket' in e` / `'stat' in e`
 * guard at each call site narrows the union.
 */
export type CustomEffectFn = (ctx: CustomEffectContext) => (EffectDescriptor | FrameEffect)[];

export type CustomEffectRegistry = Record<string, CustomEffectFn>;

/**
 * The active registry. Populated by `registerCustomEffects` (the engine
 * registers the Stage 3 melee mods at import; see `pipeline/customEffects`).
 */
export const CUSTOM_EFFECTS: CustomEffectRegistry = {};

/** Register custom-effect functions (merges into {@link CUSTOM_EFFECTS}). */
export function registerCustomEffects(entries: CustomEffectRegistry): void {
  Object.assign(CUSTOM_EFFECTS, entries);
}
