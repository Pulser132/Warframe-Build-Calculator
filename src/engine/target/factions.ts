/**
 * Faction damage-type modifiers (Damage 3.0 / U36+). Verified 2026-06-18 vs
 * https://wiki.warframe.com/w/Damage and cached in
 * `docs/warframe/mechanics/enemy-damage-modifiers.md`.
 *
 * Each faction has ~2 vulnerabilities (×1.5); Orokin/Sentient also carry one
 * ×0.5 resistance. Every unlisted type is neutral (×1.0). These apply to the
 * **health** layer only — shields and Overguard take no faction-type modifier.
 */
import type { DamageType } from '../model/types';
import type { Faction } from './types';

export const FACTION_MODIFIERS: Record<Faction, Partial<Record<DamageType, number>>> = {
  Grineer: { impact: 1.5, corrosive: 1.5 },
  Corpus: { puncture: 1.5, magnetic: 1.5 },
  Infested: { slash: 1.5, heat: 1.5 },
  Orokin: { puncture: 1.5, viral: 1.5, radiation: 0.5 },
  Sentient: { cold: 1.5, radiation: 1.5, corrosive: 0.5 },
  Other: {},
};

/** Faction damage-type multiplier (×1.0 when neutral or faction unknown). */
export function factionModifier(faction: Faction | string, type: DamageType): number {
  const table = FACTION_MODIFIERS[faction as Faction];
  return table?.[type] ?? 1;
}
