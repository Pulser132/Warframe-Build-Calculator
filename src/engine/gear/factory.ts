import type { WeaponData } from '../model/types';
import { Primary } from './primary';
import type { Weapon } from './weapon';

/**
 * Instantiate the right gear class from curated data. Stage 1 only knows
 * `Primary`; later stages add Secondary/Melee/etc. branches here.
 */
export function createWeapon(data: WeaponData): Weapon {
  switch (data.category) {
    case 'Primary':
      return Primary.from(data);
    default:
      throw new Error(`Unsupported weapon category: ${String(data.category)}`);
  }
}
