/**
 * Mod-capacity math (pure). Used by the modding UI to show used/total capacity,
 * polarity drain reduction, and soft over-capacity warnings.
 *
 * Rules (current Warframe): a mod's drain at rank r is `baseDrain + r`. A matching
 * slot polarity halves the drain (rounded), a non-matching/empty slot is full
 * cost (the old mismatch penalty was removed). Auras have negative drain and
 * **grant** capacity, doubled by a matching polarity. Arcanes don't use capacity.
 */
import type { GearBuild } from '@engine/model/build';
import type { ModData } from '@engine/model/types';

export interface CapacityInfo {
  used: number;
  total: number;
  over: boolean;
  /** Per-slot effective cost (negative = grants capacity), indexed like `build.slots`. */
  perSlot: number[];
}

/** Effective capacity cost of a mod in a slot. Negative for auras (grants capacity). */
export function modCost(mod: ModData, slotPolarity: string, rank: number): number {
  const magnitude = Math.abs(mod.baseDrain) + Math.max(0, Math.min(rank, mod.maxRank));
  const matches = slotPolarity !== 'none' && slotPolarity === mod.polarity;
  if (mod.baseDrain < 0) {
    // Aura: grants capacity; matching polarity doubles the grant.
    return -(matches ? magnitude * 2 : magnitude);
  }
  // Normal mod: matching polarity halves the cost (rounded).
  return matches ? Math.round(magnitude / 2) : magnitude;
}

export function computeCapacity(gear: GearBuild, modsById: Map<string, ModData>): CapacityInfo {
  let used = 0;
  let auraBonus = 0;
  const perSlot: number[] = [];

  for (const slot of gear.slots) {
    if (slot.kind === 'arcane' || !slot.itemId) {
      perSlot.push(0);
      continue;
    }
    const mod = modsById.get(slot.itemId);
    if (!mod) {
      perSlot.push(0);
      continue;
    }
    const cost = modCost(mod, slot.polarity, slot.rank);
    perSlot.push(cost);
    if (cost < 0) auraBonus += -cost;
    else used += cost;
  }

  const total = gear.baseCapacity * (gear.reactor ? 2 : 1) + auraBonus;
  return { used, total, over: used > total, perSlot };
}
