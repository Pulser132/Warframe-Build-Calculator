import type { WeaponData } from '../model/types';
import { Primary } from './primary';
import { Secondary } from './secondary';
import type { Weapon } from './weapon';

/**
 * Instantiate the right gear class from curated data. The single branch point for
 * gear-type dispatch (Stage 1 seam). Stage 3+ add Melee and other siblings here.
 */
export function createWeapon(data: WeaponData): Weapon {
  switch (data.category) {
    case 'Primary':
      return Primary.from(data);
    case 'Secondary':
      return Secondary.from(data);
    default:
      throw new Error(`Unsupported weapon category: ${String(data.category)}`);
  }
}
