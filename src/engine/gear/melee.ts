/**
 * `Melee` — a melee weapon (Stage 3). A sibling of `Gun` under `Weapon`: it
 * reuses the fire-mode machinery (a melee weapon exposes its attacks as Fire
 * Modes — Normal / Heavy / Slam / Heavy Slam) but has **no magazine or reload**,
 * so sustained DPS equals burst DPS (the generalized `CalcInput.weapon` treats
 * magazine/reload as optional).
 *
 * It implements the gun capability interfaces (`HasCrit`, `HasStatus`,
 * `MultiMode`) plus the melee ones (`HasCombo`, `HasHeavy`, `HasSlam`,
 * `HasStance`, `HasReach`) so the pipeline/UI can feature-detect.
 */
import type { ModSlotKind, Polarity, WeaponData } from '../model/types';
import type { FireMode } from '../model/firemode';
import { Weapon, MELEE_SLOT_LAYOUT } from './weapon';
import type {
  HasCrit,
  HasStatus,
  MultiMode,
  HasCombo,
  HasHeavy,
  HasSlam,
  HasStance,
  HasReach,
} from './interfaces';

export class Melee
  extends Weapon
  implements HasCrit, HasStatus, MultiMode, HasCombo, HasHeavy, HasSlam, HasStance, HasReach
{
  constructor(data: WeaponData) {
    super(data);
  }

  static from(data: WeaponData): Melee {
    return new Melee(data);
  }

  get kind(): string {
    return 'melee';
  }

  get slotLayout(): readonly ModSlotKind[] {
    return MELEE_SLOT_LAYOUT;
  }

  // ── HasCrit / HasStatus ──
  get baseCritChance(): number {
    return this.data.criticalChance;
  }
  get baseCritMultiplier(): number {
    return this.data.criticalMultiplier;
  }
  get baseStatusChance(): number {
    return this.data.statusChance;
  }

  /** Attack speed (the melee analogue of fire rate). */
  get attackSpeed(): number {
    return this.data.fireRate;
  }

  // ── HasCombo / HasReach / HasStance ──
  get comboDuration(): number {
    return this.data.comboDuration ?? 5;
  }
  get range(): number {
    return this.data.range ?? 0;
  }
  get followThrough(): number {
    return this.data.followThrough ?? 1;
  }
  get stancePolarity(): Polarity {
    return this.data.stancePolarity ?? 'none';
  }

  // ── HasSlam ──
  readonly hasSlam = true as const;

  // ── HasHeavy ──
  /** Heavy multiplier derived from the Heavy Attack mode (vs the Normal hit). */
  get heavyMultiplier(): number {
    const heavy = this.fireModes.find((m) => m.heavyMultiplier != null);
    return heavy?.heavyMultiplier ?? 1;
  }

  /** The Heavy Attack mode, if present. */
  get heavyMode(): FireMode | undefined {
    return this.fireModes.find((m) => m.trigger === 'heavy');
  }
}
