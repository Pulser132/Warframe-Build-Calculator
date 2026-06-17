import type { WeaponData } from '../model/types';
import { Primary } from './primary';
import { Secondary } from './secondary';
import { Melee } from './melee';
import type { Weapon } from './weapon';

/**
 * Instantiate the right gear class from curated data. The single branch point for
 * gear-type dispatch (Stage 1 seam). Stage 3 adds the Melee sibling.
 */
export function createWeapon(data: WeaponData): Weapon {
  switch (data.category) {
    case 'Primary':
      return Primary.from(data);
    case 'Secondary':
      return Secondary.from(data);
    case 'Melee':
      return Melee.from(data);
    default:
      throw new Error(`Unsupported weapon category: ${String(data.category)}`);
  }
}
