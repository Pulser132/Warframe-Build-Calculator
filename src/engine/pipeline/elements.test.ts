import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { EMPTY_COMBAT_STATE } from '../model/build';
import { createWeapon } from '../gear/factory';
import type { Gun } from '../gear/weapon';
import type { DamageType } from '../model/types';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';

/**
 * Elemental combination, observed through `calculateBuild`'s `perType` output:
 * two base elements fuse into their compound (in mod load order), and the raw
 * components disappear from the breakdown. Driven with elemental sources on the
 * Vulkar Wraith so the rule is asserted where the user actually sees it.
 */

let gun: Gun;

beforeAll(async () => {
  gun = createWeapon((await loadWeapon('vulkar-wraith'))!) as Gun;
});

/** A +element source contributing `amount × base` of one base element. */
function element(type: DamageType, amount = 0.5): ResolvedSource {
  return {
    id: `+${type}`, label: type, kind: 'mod', rank: 0, maxRank: 0,
    effects: [{ bucket: 'elemental', element: type, value: amount }],
  };
}

function perTypeOf(...sources: ResolvedSource[]) {
  return calculateBuild({ weapon: gun, sources, combat: EMPTY_COMBAT_STATE }).perType;
}

describe('elemental combination (via perType)', () => {
  it('fuses Toxin + Electricity into Corrosive and drops the raw elements', () => {
    const pt = perTypeOf(element('toxin'), element('electricity'));
    expect(pt.corrosive).toBeDefined();
    expect(pt.toxin).toBeUndefined();
    expect(pt.electricity).toBeUndefined();
  });

  it('leaves a lone base element uncombined', () => {
    const pt = perTypeOf(element('toxin'));
    expect(pt.toxin).toBeDefined();
    expect(pt.corrosive).toBeUndefined();
  });

  it('combines each documented base-element pair into its compound', () => {
    const pairs: [DamageType, DamageType, DamageType][] = [
      ['heat', 'cold', 'blast'],
      ['heat', 'toxin', 'gas'],
      ['heat', 'electricity', 'radiation'],
      ['cold', 'toxin', 'viral'],
      ['cold', 'electricity', 'magnetic'],
      ['electricity', 'toxin', 'corrosive'],
    ];
    for (const [a, b, compound] of pairs) {
      const pt = perTypeOf(element(a), element(b));
      expect(pt[compound], `${a}+${b}→${compound}`).toBeDefined();
      expect(pt[a], `${a} consumed`).toBeUndefined();
      expect(pt[b], `${b} consumed`).toBeUndefined();
    }
  });

  it('respects load order: the earliest valid pair fuses, the extra stays single', () => {
    // Toxin then Electricity fuse to Corrosive first; the trailing Cold is left raw.
    const pt = perTypeOf(element('toxin'), element('electricity'), element('cold'));
    expect(pt.corrosive).toBeDefined();
    expect(pt.cold).toBeDefined();
    expect(pt.viral).toBeUndefined(); // would appear only if Cold+Toxin fused first
  });

  it('conserves total damage — the compound carries the sum of its parts', () => {
    // Corrosive (Toxin+Electricity) and a same-magnitude pair of Toxin sources both
    // add 2 × 0.5 × base of elemental damage, so the headline average matches.
    const fused = calculateBuild({
      weapon: gun, sources: [element('toxin'), element('electricity')], combat: EMPTY_COMBAT_STATE,
    });
    const uncombined = calculateBuild({
      weapon: gun, sources: [element('toxin'), element('toxin')], combat: EMPTY_COMBAT_STATE,
    });
    expect(fused.perType.corrosive).toBeDefined();
    expect(fused.perPelletAverage).toBeCloseTo(uncombined.perPelletAverage, 6);
  });

  it('a zero-amount contribution never appears in the breakdown', () => {
    const pt = perTypeOf(element('toxin', 0));
    expect(pt.toxin).toBeUndefined();
  });
});
