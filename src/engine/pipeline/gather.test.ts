import { describe, it, expect } from 'vitest';
import { EMPTY_COMBAT_STATE } from '../model/build';
import type { CombatState } from '../model/build';
import {
  rankFactor,
  isEffectActive,
  scaledValue,
  gatherBuckets,
  type ResolvedSource,
} from './gather';

describe('rankFactor', () => {
  it('is 1 at max rank and (r+1)/(maxRank+1) below', () => {
    expect(rankFactor(10, 10)).toBe(1);
    expect(rankFactor(0, 10)).toBeCloseTo(1 / 11, 6); // Serration rank 0 = +15%
    expect(rankFactor(5, 5)).toBe(1);
    expect(rankFactor(2, 5)).toBeCloseTo(3 / 6, 6);
  });
  it('clamps out-of-range ranks and handles maxRank 0', () => {
    expect(rankFactor(99, 10)).toBe(1);
    expect(rankFactor(0, 0)).toBe(1);
  });
});

describe('isEffectActive / scaledValue conditionals', () => {
  const src: ResolvedSource = {
    id: 's',
    label: 'S',
    kind: 'mod',
    rank: 5,
    maxRank: 5,
    effects: [],
  };

  it('includes unconditional effects', () => {
    expect(isEffectActive({ bucket: 'baseDamage', value: 1 }, EMPTY_COMBAT_STATE)).toBe(true);
  });

  it('gates a faction effect on the condition toggle', () => {
    const eff = { bucket: 'faction' as const, value: 0.3, condition: 'faction:grineer' };
    expect(isEffectActive(eff, EMPTY_COMBAT_STATE)).toBe(false);
    const on: CombatState = { ...EMPTY_COMBAT_STATE, conditions: { 'faction:grineer': true } };
    expect(isEffectActive(eff, on)).toBe(true);
    expect(scaledValue(src, eff, on)).toBeCloseTo(0.3, 6);
    expect(scaledValue(src, eff, EMPTY_COMBAT_STATE)).toBeNull();
  });

  it('scales a per-stack effect by the stack count', () => {
    const eff = {
      bucket: 'directDamage' as const,
      value: 0.3,
      perStack: true,
      maxStacks: 12,
      condition: 'arcane:primary-merciless',
    };
    const s8: CombatState = {
      ...EMPTY_COMBAT_STATE,
      stacks: { 'arcane:primary-merciless': 8 },
    };
    expect(scaledValue(src, eff, s8)).toBeCloseTo(2.4, 6); // 0.3 × 8
    // Clamps to maxStacks.
    const s99: CombatState = { ...EMPTY_COMBAT_STATE, stacks: { 'arcane:primary-merciless': 99 } };
    expect(scaledValue(src, eff, s99)).toBeCloseTo(3.6, 6); // 0.3 × 12
    expect(scaledValue(src, eff, EMPTY_COMBAT_STATE)).toBeNull();
  });
});

describe('gatherBuckets', () => {
  it('sums additive buckets and preserves element load order', () => {
    const sources: ResolvedSource[] = [
      { id: 'ser', label: 'Serration', kind: 'mod', rank: 10, maxRank: 10, effects: [{ bucket: 'baseDamage', value: 1.65 }] },
      { id: 'tox', label: 'Toxin', kind: 'mod', rank: 5, maxRank: 5, effects: [{ bucket: 'elemental', element: 'toxin', value: 0.9 }] },
      { id: 'ele', label: 'Elec', kind: 'mod', rank: 5, maxRank: 5, effects: [{ bucket: 'elemental', element: 'electricity', value: 0.9 }] },
    ];
    const sums = gatherBuckets(sources, EMPTY_COMBAT_STATE);
    expect(sums.baseDamage).toBeCloseTo(1.65, 6);
    expect(sums.elements.map((e) => e.type)).toEqual(['toxin', 'electricity']);
    expect(sums.elements[0].amount).toBeCloseTo(0.9, 6);
  });
});
