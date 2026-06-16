import type { ModSlotKind, WeaponData } from '../model/types';
import { Gun, GUN_SLOT_LAYOUT } from './weapon';
import type { HasCrit, HasStatus, MultiMode } from './interfaces';

/**
 * A secondary (pistol-class) weapon. Differs from `Primary` only in its `kind`
 * discriminant (which drives mod-compatibility filtering in the UI) — all the
 * firearm behavior is inherited from `Gun`.
 */
export class Secondary extends Gun implements HasCrit, HasStatus, MultiMode {
  constructor(data: WeaponData) {
    super(data);
  }

  static from(data: WeaponData): Secondary {
    return new Secondary(data);
  }

  get kind(): string {
    return 'secondary';
  }

  get slotLayout(): readonly ModSlotKind[] {
    return GUN_SLOT_LAYOUT;
  }
}
