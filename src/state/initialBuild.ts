/**
 * Constructs the default empty `Build` for a weapon: one `SlotState` per slot in
 * the weapon's layout, with the weapon's innate polarities applied (e.g. Vulkar
 * Wraith's Madurai exilus slot, a melee weapon's Stance-slot polarity).
 * Theorycrafting defaults: reactor on, 30 capacity. The layout is chosen by the
 * weapon's gear class (guns use the aura layout, melee the stance layout).
 */
import type { Build, SlotState } from '@engine/model/build';
import type { Polarity, WeaponData } from '@engine/model/types';
import { createWeapon } from '@engine';

export function makeInitialBuild(weapon: WeaponData): Build {
  const layout = createWeapon(weapon).slotLayout;
  const slots: SlotState[] = layout.map((kind): SlotState => {
    let polarity: Polarity = 'none';
    if (kind === 'exilus' && weapon.exilusPolarity) polarity = weapon.exilusPolarity;
    if (kind === 'stance' && weapon.stancePolarity) polarity = weapon.stancePolarity;
    return { kind, polarity, itemId: null, rank: 0 };
  });
  return {
    weaponId: weapon.id,
    slots,
    reactor: true,
    baseCapacity: 30,
  };
}
