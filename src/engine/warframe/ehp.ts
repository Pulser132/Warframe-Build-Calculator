/**
 * Effective-Health (EHP) math (Stage 4 — generic, no incoming damage type).
 *
 * Verified against the wiki armor/health model (cached in
 * `docs/warframe/mechanics/ehp.md`):
 *  - armor damage-reduction = `armor / (armor + 300)`
 *  - effective health from armor = `health × (1 + armor/300)`
 *  - generic total = health-EHP + shield (shields are largely armor-independent).
 *
 * Damage-type-specific EHP and shield-gating are deferred to Stage 5.
 */
import type { EhpBreakdown } from './types';

/** Armor constant in the reduction formula (`armor/(armor+ARMOR_K)`). */
export const ARMOR_K = 300;

export function computeEhp(health: number, shield: number, armor: number): EhpBreakdown {
  const armorDamageReduction = armor / (armor + ARMOR_K);
  const healthEhp = health * (1 + armor / ARMOR_K);
  return {
    armorDamageReduction,
    healthEhp,
    shield,
    total: healthEhp + shield,
  };
}
