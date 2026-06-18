/**
 * `Warframe` — the player's character gear (Stage 4). A **sibling** of `Weapon`
 * in the gear hierarchy, not a subclass: it carries base stats and abilities but
 * has no fire modes, so it does not run the weapon damage pipeline. Its modding
 * screen reuses the shared slot primitives; what differs is the slot layout and
 * the mod pool.
 *
 * It implements the frame capability interfaces (`HasAura`, `HasAbilities`) so
 * the resolver / UI can feature-detect.
 */
import type { ModSlotKind, Polarity, WarframeData, AbilityMeta } from '../model/types';
import type { HasAura, HasAbilities } from './interfaces';

/** The 12-slot Warframe layout: aura, exilus, 8× normal, 2× arcane. The Aura
 * slot is Warframe-only (the melee Stance slot is its weapon analogue). */
export const WARFRAME_SLOT_LAYOUT: readonly ModSlotKind[] = [
  'aura',
  'exilus',
  'normal',
  'normal',
  'normal',
  'normal',
  'normal',
  'normal',
  'normal',
  'normal',
  'arcane',
  'arcane',
];

export class Warframe implements HasAura, HasAbilities {
  constructor(readonly data: WarframeData) {}

  static from(data: WarframeData): Warframe {
    return new Warframe(data);
  }

  get id(): string {
    return this.data.id;
  }
  get name(): string {
    return this.data.name;
  }
  get kind(): string {
    return 'warframe';
  }

  get slotLayout(): readonly ModSlotKind[] {
    return WARFRAME_SLOT_LAYOUT;
  }

  // ── Base stats ──
  get baseHealth(): number {
    return this.data.health;
  }
  get baseShield(): number {
    return this.data.shield;
  }
  get baseArmor(): number {
    return this.data.armor;
  }
  get baseEnergy(): number {
    return this.data.energy;
  }

  // ── HasAura ──
  get auraPolarity(): Polarity {
    return this.data.auraPolarity ?? 'none';
  }

  // ── HasAbilities ──
  get abilities(): AbilityMeta[] {
    return this.data.abilities;
  }
}
