/**
 * Elemental combination (https://wiki.warframe.com/w/Damage, "Elemental Damage").
 *
 * Two base elements combine into a secondary element following the weapon's mod
 * **load order**: the earliest pair that forms a valid combination merges, its
 * components are removed, and their damage is summed into the combined type. The
 * slice only ever has Toxin + Electricity → Corrosive (unambiguous), but the
 * algorithm generalizes to any set of base elements.
 */
import type { DamageType } from '../model/types';

/** Unordered pair of base elements → combined type. */
const COMBINATIONS: ReadonlyArray<[DamageType, DamageType, DamageType]> = [
  ['heat', 'cold', 'blast'],
  ['heat', 'toxin', 'gas'],
  ['heat', 'electricity', 'radiation'],
  ['cold', 'toxin', 'viral'],
  ['cold', 'electricity', 'magnetic'],
  ['electricity', 'toxin', 'corrosive'],
];

function combinedType(a: DamageType, b: DamageType): DamageType | null {
  for (const [x, y, result] of COMBINATIONS) {
    if ((a === x && b === y) || (a === y && b === x)) return result;
  }
  return null;
}

export interface ElementContribution {
  type: DamageType;
  amount: number;
}

/**
 * Resolve base-element contributions (in load order) into final elemental
 * damages — combining pairs where possible. Returns a `type → amount` map.
 */
export function combineElements(
  contributions: readonly ElementContribution[],
): Partial<Record<DamageType, number>> {
  const pending: ElementContribution[] = [];
  const result: Partial<Record<DamageType, number>> = {};

  const addResult = (type: DamageType, amount: number) => {
    result[type] = (result[type] ?? 0) + amount;
  };

  for (const contrib of contributions) {
    if (contrib.amount === 0) continue;
    // Try to combine with the earliest pending element that forms a valid pair.
    let combined = false;
    for (let i = 0; i < pending.length; i++) {
      const other = pending[i];
      const result_type = combinedType(other.type, contrib.type);
      if (result_type) {
        addResult(result_type, other.amount + contrib.amount);
        pending.splice(i, 1);
        combined = true;
        break;
      }
    }
    if (!combined) pending.push({ ...contrib });
  }

  // Any uncombined base elements deal their own damage.
  for (const leftover of pending) addResult(leftover.type, leftover.amount);
  return result;
}
