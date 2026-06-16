/**
 * Gear class hierarchy root: `Weapon` (abstract) → `Gun` → `Primary`.
 *
 * Goal.md: "Many weapons are similar, use inheritance and interfaces to make
 * development more modular." Only `Primary` is concrete in Stage 1; the seams for
 * Secondary/Melee/Warframe are designed here.
 */
import type { DamageType, ModSlotKind, WeaponData } from '../model/types';
import type { DamageMap } from '../model/result';

/** The 12-slot in-game layout: aura, exilus, 8× normal, 2× arcane. */
export const PRIMARY_SLOT_LAYOUT: readonly ModSlotKind[] = [
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

export abstract class Weapon {
  protected constructor(readonly data: WeaponData) {}

  get id(): string {
    return this.data.id;
  }
  get name(): string {
    return this.data.name;
  }

  /** Base per-shot damage by type (copy; callers may mutate freely). */
  baseDamage(): DamageMap {
    return { ...this.data.damage };
  }
  get totalBaseDamage(): number {
    return this.data.totalBaseDamage;
  }

  /** Slot layout for this weapon's modding screen. */
  abstract get slotLayout(): readonly ModSlotKind[];
  /** Discriminant for feature-detection / UI. */
  abstract get kind(): string;
}

/** A gun: hitscan/projectile with fire rate, magazine, reload, crit & status. */
export abstract class Gun extends Weapon {
  get baseCritChance(): number {
    return this.data.criticalChance;
  }
  get baseCritMultiplier(): number {
    return this.data.criticalMultiplier;
  }
  get baseStatusChance(): number {
    return this.data.statusChance;
  }
  get fireRate(): number {
    return this.data.fireRate;
  }
  get magazine(): number {
    return this.data.magazine;
  }
  get reload(): number {
    return this.data.reload;
  }
  get baseMultishot(): number {
    return this.data.multishot;
  }
  /** Whether a damage type is one this gun deals at base (helper for UI). */
  dealsBaseType(type: DamageType): boolean {
    return (this.data.damage[type] ?? 0) > 0;
  }
}
