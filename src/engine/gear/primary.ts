import type { ModSlotKind, WeaponData } from '../model/types';
import { Gun, GUN_SLOT_LAYOUT } from './weapon';
import type { HasCrit, HasStatus, MultiMode } from './interfaces';

/** A primary weapon. */
export class Primary extends Gun implements HasCrit, HasStatus, MultiMode {
  constructor(data: WeaponData) {
    super(data);
  }

  static from(data: WeaponData): Primary {
    return new Primary(data);
  }

  get kind(): string {
    return 'primary';
  }

  get slotLayout(): readonly ModSlotKind[] {
    return GUN_SLOT_LAYOUT;
  }
}
