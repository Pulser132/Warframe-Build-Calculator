import type { ModSlotKind, WeaponData } from '../model/types';
import { Gun, PRIMARY_SLOT_LAYOUT } from './weapon';
import type { HasCrit, HasStatus } from './interfaces';

/** A primary weapon. The only concrete gear class in Stage 1. */
export class Primary extends Gun implements HasCrit, HasStatus {
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
    return PRIMARY_SLOT_LAYOUT;
  }
}
