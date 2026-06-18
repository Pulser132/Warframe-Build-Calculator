/**
 * Stage 4 frame set-bonus custom effects (the Umbral set) — ADR 0004.
 *
 * Umbral mods give a base frame stat **plus** a set bonus that grows with how
 * many Umbral mods are equipped (`ctx.setCounts['umbral']`). That dependency on
 * the rest of the loadout can't be expressed by a static `FrameEffect`, so each
 * Umbral mod routes through the **shared** custom-effect registry (the same one
 * the weapon `gather` uses) and returns a FINAL, self-scaled `FrameEffect`.
 *
 * **Contract:** like the Stage 3 melee fns, each returns rank-scaled effects; the
 * frame resolver folds them in **without** re-applying `rankFactor`.
 *
 * Set-bonus fractions are the `@wfcd modSetValues` (verified vs the lookup
 * script): index `[count-2]` for `count ≥ 2` members. The bonus multiplies the
 * mod's own (rank-scaled) base stat — e.g. Umbral Intensify at a full 3-set:
 * `0.44 × (1 + 0.75) = 0.77` Ability Strength.
 */
import { registerCustomEffects, type CustomEffectContext } from '../model/registry';
import type { FrameEffect, FrameStat } from '../model/types';
import { rankFactor } from '../pipeline/gather';

export const UMBRAL_SET = 'umbral';

/** `@wfcd modSetValues` per Umbral mod (index 0 = 2 members, index 1 = 3). */
const UMBRAL_STRENGTH_SET = [0.25, 0.75]; // Umbral Intensify
const UMBRAL_SURVIVE_SET = [0.3, 0.8]; // Umbral Vitality / Fiber

/** Set-bonus fraction for `count` equipped members (0 below the 2-member floor). */
export function umbralSetBonus(count: number, values: readonly number[]): number {
  if (count < 2) return 0;
  return values[Math.min(count - 2, values.length - 1)];
}

/** Build an Umbral mod's frame effect: rank-scaled base × (1 + set bonus). */
function umbralEffect(
  ctx: CustomEffectContext,
  stat: FrameStat,
  base: number,
  setValues: readonly number[],
): FrameEffect[] {
  const count = ctx.setCounts[UMBRAL_SET] ?? 0;
  const scaled = base * rankFactor(ctx.rank, ctx.maxRank);
  const value = scaled * (1 + umbralSetBonus(count, setValues));
  return [{ stat, value }];
}

/** Umbral Intensify — +44% Strength base, set-boosted (str set values). */
export function umbralIntensify(ctx: CustomEffectContext): FrameEffect[] {
  return umbralEffect(ctx, 'abilityStrength', 0.44, UMBRAL_STRENGTH_SET);
}

/** Umbral Vitality — +100% Health base, set-boosted (survive set values). */
export function umbralVitality(ctx: CustomEffectContext): FrameEffect[] {
  return umbralEffect(ctx, 'health', 1.0, UMBRAL_SURVIVE_SET);
}

/** Umbral Fiber — +100% Armor base, set-boosted (survive set values). */
export function umbralFiber(ctx: CustomEffectContext): FrameEffect[] {
  return umbralEffect(ctx, 'armor', 1.0, UMBRAL_SURVIVE_SET);
}

export const FRAME_CUSTOM_EFFECTS = {
  'umbral-intensify': umbralIntensify,
  'umbral-vitality': umbralVitality,
  'umbral-fiber': umbralFiber,
};

// Self-register at import (mirrors the Stage 3 melee custom effects).
registerCustomEffects(FRAME_CUSTOM_EFFECTS);
