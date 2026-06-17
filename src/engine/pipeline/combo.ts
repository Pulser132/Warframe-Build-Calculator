/**
 * Melee Combo Counter math (pure) — Stage 3.
 *
 * The canonical combat-state input is the raw **Combo Count** (consecutive hits).
 * From it the engine derives the **Combo Tier** (`floor(count / 20)`) and the
 * **Combo Multiplier** (`1 + tier`, capped at 12× at 220 hits). The multiplier
 * multiplies **Heavy / Heavy-Slam** attack damage only — never Normal attacks
 * (wiki-confirmed; see `docs/warframe/mechanics/melee-combo.md`).
 *
 * Blood Rush / Weeping Wounds scale on the **tier** (their bonus is
 * `0.4 × tier = 0.4 × (multiplier − 1)`).
 */
import type { CombatState } from '../model/build';

/** Combat-state key carrying the raw Combo Count. */
export const COMBO_STACK_KEY = 'combo';

/** Hits per combo tier step. */
export const HITS_PER_TIER = 20;
/** Standard Combo Multiplier cap (12× at 220 hits). */
export const MAX_COMBO_MULTIPLIER = 12;
/** Standard Combo Tier cap (`MAX_COMBO_MULTIPLIER − 1`). */
export const MAX_COMBO_TIER = MAX_COMBO_MULTIPLIER - 1;

/** Combo Tier from a raw Combo Count: `floor(count / 20)`, capped at 11. */
export function comboTier(count: number): number {
  const n = Math.max(0, Math.floor(count));
  return Math.min(Math.floor(n / HITS_PER_TIER), MAX_COMBO_TIER);
}

/** Combo Multiplier from a raw Combo Count: `min(1 + tier, 12)`. */
export function comboMultiplier(count: number): number {
  return Math.min(1 + comboTier(count), MAX_COMBO_MULTIPLIER);
}

/** Raw Combo Count from combat state (`stacks['combo']`, default 0). */
export function comboCount(combat: CombatState): number {
  return Math.max(0, combat.stacks[COMBO_STACK_KEY] ?? 0);
}

/** Convenience: Combo Tier read straight from combat state. */
export function comboTierFromState(combat: CombatState): number {
  return comboTier(comboCount(combat));
}

/** Convenience: Combo Multiplier read straight from combat state. */
export function comboMultiplierFromState(combat: CombatState): number {
  return comboMultiplier(comboCount(combat));
}
