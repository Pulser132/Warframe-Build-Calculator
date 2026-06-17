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
import type { EffectDescriptor } from './types';
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
}

/**
 * A registry function returns **already-computed, rank-scaled** effect
 * descriptors. The `gather` stage folds them into the bucket sums **without**
 * re-applying `rankFactor`/`perStack` (see ADR 0002).
 */
export type CustomEffectFn = (ctx: CustomEffectContext) => EffectDescriptor[];

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
