/**
 * Authored ability → Emitted-Buff mapping (Stage 4).
 *
 * The numeric **scaling** of an ability (its base magnitudes, e.g. Roar's +50%)
 * comes from the offline scraper (`abilities.json`); the **mapping** of which
 * ability emits which buff and how it scales is authored here in TS — exactly as
 * mod → effect descriptors are authored, not scraped (decision 9).
 *
 * Only buff-emitting abilities appear here. Damage / survivability abilities
 * (Rhino Stomp, Iron Skin) are display-only this stage (decision 6).
 */

/** How an ability's emitted-buff magnitude scales on a frame attribute. */
export type BuffScaling = 'strength';

export interface AbilityBuffMapping {
  /** Ability slug (matches `AbilityMeta.id` / `abilities.json`). */
  abilityId: string;
  /** Buff catalog id the ability emits (`engine/buffs`). */
  buffId: string;
  /** Which frame attribute the magnitude scales on. Roar: Ability Strength. */
  scaling: BuffScaling;
}

export const ABILITY_BUFFS: readonly AbilityBuffMapping[] = [
  { abilityId: 'roar', buffId: 'roar', scaling: 'strength' },
];

/** Buff mappings emitted by an ability id. */
export function buffMappingsFor(abilityId: string): AbilityBuffMapping[] {
  return ABILITY_BUFFS.filter((m) => m.abilityId === abilityId);
}
