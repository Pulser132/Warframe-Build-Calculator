/**
 * Stage 3 custom-effect registry functions (the registry, wired for real).
 *
 * These three melee mods scale on **build/combat context** that a static
 * `EffectDescriptor` can't express on its own, so they're implemented as registry
 * functions to battle-test the seam before harder mods (Galvanized, set bonuses)
 * arrive (see ADR 0002).
 *
 * **Contract:** each function returns **final, rank-scaled** descriptors; `gather`
 * folds them in **without** re-applying `rankFactor`/`perStack`. So each function
 * owns its own rank scaling here.
 *
 * Values verified vs the wiki (`docs/warframe/mods/{blood-rush,weeping-wounds,
 * condition-overload}.md`).
 */
import { registerCustomEffects, type CustomEffectContext } from '../model/registry';
import type { EffectDescriptor } from '../model/types';
import { rankFactor } from './gather';
import { comboTierFromState } from './combo';

/** Combat-state key carrying the count of unique status types on the target. */
export const STATUS_COUNT_KEY = 'status:count';

/** Per-rank max bonuses (verified vs wiki). */
export const BLOOD_RUSH_PER_TIER = 0.4; // +40% crit chance per combo tier at max rank
export const WEEPING_WOUNDS_PER_TIER = 0.4; // +40% status chance per combo tier at max rank
export const CONDITION_OVERLOAD_PER_STATUS = 0.8; // +80% melee damage per status type
/** Practical cap on unique status types (Lifted/knockdown cancel). */
export const CONDITION_OVERLOAD_MAX_STATUS = 16;

/**
 * Blood Rush — `+0.4 × tier` into the **critChance** bucket (additive with Point
 * Strike / True Steel, then ×base crit). `tier = ComboMultiplier − 1`.
 */
export function bloodRush(ctx: CustomEffectContext): EffectDescriptor[] {
  const tier = comboTierFromState(ctx.combat);
  if (tier <= 0) return [];
  const value = BLOOD_RUSH_PER_TIER * rankFactor(ctx.rank, ctx.maxRank) * tier;
  return [{ bucket: 'critChance', value }];
}

/**
 * Weeping Wounds — `+0.4 × tier` into the **statusChance** bucket (additive with
 * other status mods, then ×base status).
 */
export function weepingWounds(ctx: CustomEffectContext): EffectDescriptor[] {
  const tier = comboTierFromState(ctx.combat);
  if (tier <= 0) return [];
  const value = WEEPING_WOUNDS_PER_TIER * rankFactor(ctx.rank, ctx.maxRank) * tier;
  return [{ bucket: 'statusChance', value }];
}

/**
 * Condition Overload — `+0.8 × n` into the **baseDamage** bucket, where `n` is the
 * number of unique status types on the target (capped at 16). Additive with
 * Pressure Point in the same base-damage bucket.
 */
export function conditionOverload(ctx: CustomEffectContext): EffectDescriptor[] {
  const raw = ctx.combat.stacks[STATUS_COUNT_KEY] ?? 0;
  const n = Math.min(Math.max(0, Math.floor(raw)), CONDITION_OVERLOAD_MAX_STATUS);
  if (n <= 0) return [];
  const value = CONDITION_OVERLOAD_PER_STATUS * rankFactor(ctx.rank, ctx.maxRank) * n;
  return [{ bucket: 'baseDamage', value }];
}

/** The Stage 3 custom-effect entries, keyed by `ModData.customEffectId`. */
export const MELEE_CUSTOM_EFFECTS = {
  'blood-rush': bloodRush,
  'weeping-wounds': weepingWounds,
  'condition-overload': conditionOverload,
};

// Self-register at import so any module graph that reaches the custom effects (via
// `calculate` or a direct import) populates the global registry deterministically.
registerCustomEffects(MELEE_CUSTOM_EFFECTS);
