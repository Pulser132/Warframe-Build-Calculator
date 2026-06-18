/**
 * Gear class hierarchy root: `Weapon` (abstract) → `Gun` → `Primary`.
 *
 * Goal.md: "Many weapons are similar, use inheritance and interfaces to make
 * development more modular." Only `Primary` is concrete in Stage 1; the seams for
 * Secondary/Melee/Warframe are designed here.
 */
import type { DamageType, ModSlotKind, WeaponData } from '../model/types';
import type { DamageMap } from '../model/result';
import type { FireMode } from '../model/firemode';
import { synthesizeFireMode } from '../model/firemode';

/** The 11-slot in-game gun layout: exilus, 8× normal, 2× arcane. Guns have **no
 * Aura slot** in-game (Stage 4 removed the Stage 1 simplification); `'aura'` is
 * now Warframe-only. Primary and Secondary share this layout — only mod
 * *compatibility* differs, not the slot count. (Melee keeps its Stance slot.) */
export const GUN_SLOT_LAYOUT: readonly ModSlotKind[] = [
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

/** @deprecated Stage 1 name; kept as an alias of {@link GUN_SLOT_LAYOUT}. */
export const PRIMARY_SLOT_LAYOUT = GUN_SLOT_LAYOUT;

/** The 12-slot melee layout: stance, exilus, 8× normal, 2× arcane. The Stance
 * slot is the melee analogue of a gun's Aura slot (Stage 3). */
export const MELEE_SLOT_LAYOUT: readonly ModSlotKind[] = [
  'stance',
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
  private _fireModes?: readonly FireMode[];

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

  /**
   * The weapon's fire modes (Stage 2). Uses curated `data.fireModes` when present
   * and otherwise synthesizes a single mode from the top-level stats (Stage 1
   * back-compat). Memoized. Shared by `Gun` and `Melee` (each exposes its attacks
   * as fire modes — guns by trigger, melee by Normal/Heavy/Slam/Heavy Slam).
   */
  get fireModes(): readonly FireMode[] {
    if (!this._fireModes) {
      this._fireModes =
        this.data.fireModes && this.data.fireModes.length > 0
          ? this.data.fireModes
          : [synthesizeFireMode(this.data)];
    }
    return this._fireModes;
  }

  /** The default (first) fire mode. */
  get primaryFireMode(): FireMode {
    return this.fireModes[0];
  }

  /** Names of every fire mode, in declaration order. */
  get modeNames(): string[] {
    return this.fireModes.map((m) => m.name);
  }

  /** Whether this weapon exposes more than one selectable fire mode. */
  get isMultiMode(): boolean {
    return this.fireModes.length > 1;
  }

  /** Look up a fire mode by name (falls back to the primary mode). */
  fireMode(name: string): FireMode {
    return this.fireModes.find((m) => m.name === name) ?? this.primaryFireMode;
  }

  /** Whether a damage type is one this weapon deals at base (helper for UI). */
  dealsBaseType(type: DamageType): boolean {
    return (this.data.damage[type] ?? 0) > 0;
  }

  /** Slot layout for this weapon's modding screen. */
  abstract get slotLayout(): readonly ModSlotKind[];
  /** Discriminant for feature-detection / UI. */
  abstract get kind(): string;
}

/**
 * A gun: hitscan/projectile/AoE with fire rate, magazine, reload, crit & status.
 *
 * Shared firearm behavior lives here (ammo/reload/magazine, fire-mode access,
 * crit/status capability). `Primary` and `Secondary` are thin subclasses that
 * differ only in slot/mod-compatibility metadata (`kind`, `slotLayout`).
 */
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
}
