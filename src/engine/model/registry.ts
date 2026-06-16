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
  build: Build;
  combat: CombatState;
  /** Equipped mod/arcane rank that triggered this custom effect. */
  rank: number;
  /** The source's max rank (for scaling). */
  maxRank: number;
}

export type CustomEffectFn = (ctx: CustomEffectContext) => EffectDescriptor[];

export type CustomEffectRegistry = Record<string, CustomEffectFn>;

/** The active registry. Empty in Stage 1; later stages register entries. */
export const CUSTOM_EFFECTS: CustomEffectRegistry = {};
