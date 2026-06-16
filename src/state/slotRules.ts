/**
 * Slot ↔ item compatibility (pure). Shared by the store guard and the mod picker
 * so the rules live in exactly one place.
 *
 * Stage 1 rules: aura/exilus/arcane slots take their own kind; a normal slot also
 * accepts exilus-eligible (utility) mods, mirroring the game.
 */
import type { ModSlotKind } from '@engine/model/types';

export function slotAccepts(slotKind: ModSlotKind, itemKind: ModSlotKind): boolean {
  switch (slotKind) {
    case 'aura':
      return itemKind === 'aura';
    case 'exilus':
      return itemKind === 'exilus';
    case 'arcane':
      return itemKind === 'arcane';
    case 'normal':
      return itemKind === 'normal' || itemKind === 'exilus';
    default:
      return false;
  }
}
