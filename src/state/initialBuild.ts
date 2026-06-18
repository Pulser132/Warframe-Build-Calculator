/**
 * Constructs the default empty gear compartments (ADR 0003).
 *
 * A compartment (`GearBuild`) is one `SlotState` per slot in the gear's layout,
 * with the gear's innate polarities applied (e.g. Vulkar Wraith's Madurai exilus
 * slot, a melee weapon's Stance-slot polarity, a frame's Aura polarity).
 * Theorycrafting defaults: reactor on, 30 capacity. The layout is chosen by the
 * gear class (guns use the gun layout, melee the stance layout, frames the aura
 * layout).
 */
import type { Build, GearBuild, SlotState } from '@engine/model/build';
import type { Polarity, WarframeData, WeaponData } from '@engine/model/types';
import { createWeapon, createWarframe } from '@engine';

function buildSlots(
  layout: readonly SlotState['kind'][],
  polarities: { exilus?: Polarity | null; stance?: Polarity | null; aura?: Polarity | null },
): SlotState[] {
  return layout.map((kind): SlotState => {
    let polarity: Polarity = 'none';
    if (kind === 'exilus' && polarities.exilus) polarity = polarities.exilus;
    if (kind === 'stance' && polarities.stance) polarity = polarities.stance;
    if (kind === 'aura' && polarities.aura) polarity = polarities.aura;
    return { kind, polarity, itemId: null, rank: 0 };
  });
}

/** The default weapon compartment for a weapon. */
export function makeWeaponBuild(weapon: WeaponData): GearBuild {
  const layout = createWeapon(weapon).slotLayout;
  return {
    itemId: weapon.id,
    slots: buildSlots(layout, { exilus: weapon.exilusPolarity, stance: weapon.stancePolarity }),
    reactor: true,
    baseCapacity: 30,
  };
}

/** The default Warframe compartment for a frame. */
export function makeWarframeBuild(frame: WarframeData): GearBuild {
  const layout = createWarframe(frame).slotLayout;
  return {
    itemId: frame.id,
    slots: buildSlots(layout, { exilus: frame.exilusPolarity, aura: frame.auraPolarity }),
    reactor: true,
    baseCapacity: 30,
  };
}

/** The default full build: a weapon compartment + (optionally) a frame. */
export function makeInitialBuild(weapon: WeaponData, frame?: WarframeData | null): Build {
  return {
    weapon: makeWeaponBuild(weapon),
    warframe: frame ? makeWarframeBuild(frame) : null,
  };
}
