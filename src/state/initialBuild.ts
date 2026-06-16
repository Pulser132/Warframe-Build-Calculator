/**
 * Constructs the default empty `Build` for a weapon: one `SlotState` per slot in
 * the weapon's layout, with the weapon's innate polarities applied (e.g. Braton
 * Prime's Naramon exilus slot). Theorycrafting defaults: reactor on, 30 capacity.
 */
import type { Build, SlotState } from '@engine/model/build';
import type { Polarity, WeaponData } from '@engine/model/types';
import { PRIMARY_SLOT_LAYOUT } from '@engine';

export function makeInitialBuild(weapon: WeaponData): Build {
  const slots: SlotState[] = PRIMARY_SLOT_LAYOUT.map((kind): SlotState => {
    let polarity: Polarity = 'none';
    if (kind === 'exilus' && weapon.exilusPolarity) polarity = weapon.exilusPolarity;
    return { kind, polarity, itemId: null, rank: 0 };
  });
  return {
    weaponId: weapon.id,
    slots,
    reactor: true,
    baseCapacity: 30,
  };
}
