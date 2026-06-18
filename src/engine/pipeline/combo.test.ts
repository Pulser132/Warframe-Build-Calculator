import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';
import { createWeapon } from '../gear/factory';
import { Melee } from '../gear/melee';
import { calculateBuild } from './calculate';

/**
 * Combo Multiplier behavior, observed through `calculateBuild` on the Kronen Prime
 * Heavy attack: the multiplier follows the wiki breakpoints (1 + floor(count/20),
 * capped at 12×), multiplies Heavy damage only — never Normal — and is reported
 * alongside the raw Combo Count it derived from.
 */

let kronen: Melee;

beforeAll(async () => {
  kronen = createWeapon((await loadWeapon('kronen-prime'))!) as Melee;
});

/** Combat state with a given raw Combo Count. */
function cs(count: number): CombatState {
  return { ...EMPTY_COMBAT_STATE, stacks: { combo: count } };
}

/** Combo Multiplier reported for a Heavy attack at the given Combo Count. */
function heavyMult(count: number): number {
  const r = calculateBuild({ weapon: kronen, sources: [], combat: cs(count), mode: kronen.fireMode('Heavy Attack') });
  return r.comboMultiplier!;
}

describe('Combo Multiplier (Heavy attacks)', () => {
  it('is 1 + floor(count/20) across the wiki breakpoints', () => {
    // docs/warframe/mechanics/melee-combo.md: 20→2×, 40→3×, 60→4×, 100→6×, 220→12×.
    expect(heavyMult(0)).toBe(1);
    expect(heavyMult(20)).toBe(2);
    expect(heavyMult(40)).toBe(3);
    expect(heavyMult(60)).toBe(4);
    expect(heavyMult(100)).toBe(6);
    expect(heavyMult(220)).toBe(12);
  });

  it('caps at 12× for 220+ hits', () => {
    expect(heavyMult(220)).toBe(12);
    expect(heavyMult(500)).toBe(12);
  });

  it('clamps negative and fractional counts', () => {
    expect(heavyMult(-5)).toBe(1); // count floored to 0 → tier 0
    expect(heavyMult(25.9)).toBe(2); // floor 25 → tier 1
  });

  it('reports the raw Combo Count it derived the multiplier from', () => {
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs(60), mode: kronen.fireMode('Heavy Attack') });
    expect(r.comboCount).toBe(60);
  });

  it('multiplies Heavy damage by the multiplier', () => {
    const at0 = calculateBuild({ weapon: kronen, sources: [], combat: cs(0), mode: kronen.fireMode('Heavy Attack') });
    const at60 = calculateBuild({ weapon: kronen, sources: [], combat: cs(60), mode: kronen.fireMode('Heavy Attack') });
    expect(at60.avgHitPerShot).toBeCloseTo(at0.avgHitPerShot * 4, 4);
  });

  it('never applies to Normal attacks', () => {
    const normal = calculateBuild({ weapon: kronen, sources: [], combat: cs(60) });
    expect(normal.comboMultiplier).toBeUndefined();
    expect(normal.comboCount).toBeUndefined();
  });
});
