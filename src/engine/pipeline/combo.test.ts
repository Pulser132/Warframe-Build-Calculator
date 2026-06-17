import { describe, it, expect } from 'vitest';
import {
  comboTier,
  comboMultiplier,
  comboCount,
  comboTierFromState,
  comboMultiplierFromState,
  MAX_COMBO_MULTIPLIER,
  MAX_COMBO_TIER,
} from './combo';
import { EMPTY_COMBAT_STATE } from '../model/build';

describe('combo counter math', () => {
  it('tier is floor(count / 20)', () => {
    expect(comboTier(0)).toBe(0);
    expect(comboTier(19)).toBe(0);
    expect(comboTier(20)).toBe(1);
    expect(comboTier(39)).toBe(1);
    expect(comboTier(40)).toBe(2);
    expect(comboTier(60)).toBe(3);
    expect(comboTier(100)).toBe(5);
  });

  it('multiplier is 1 + tier, matching the wiki breakpoints', () => {
    // docs/warframe/mechanics/melee-combo.md: 20→2x, 40→3x, 60→4x, 100→6x, 220→12x.
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(20)).toBe(2);
    expect(comboMultiplier(40)).toBe(3);
    expect(comboMultiplier(60)).toBe(4);
    expect(comboMultiplier(100)).toBe(6);
    expect(comboMultiplier(220)).toBe(12);
  });

  it('caps the multiplier at 12x (tier at 11) for 220+ hits', () => {
    expect(comboTier(220)).toBe(MAX_COMBO_TIER);
    expect(comboTier(500)).toBe(MAX_COMBO_TIER);
    expect(comboMultiplier(220)).toBe(MAX_COMBO_MULTIPLIER);
    expect(comboMultiplier(1000)).toBe(MAX_COMBO_MULTIPLIER);
  });

  it('clamps negative / fractional counts', () => {
    expect(comboTier(-5)).toBe(0);
    expect(comboMultiplier(-5)).toBe(1);
    expect(comboTier(25.9)).toBe(1);
  });

  it('reads the count from combat state stacks.combo', () => {
    const combat = { ...EMPTY_COMBAT_STATE, stacks: { combo: 60 } };
    expect(comboCount(combat)).toBe(60);
    expect(comboTierFromState(combat)).toBe(3);
    expect(comboMultiplierFromState(combat)).toBe(4);
    expect(comboCount(EMPTY_COMBAT_STATE)).toBe(0);
  });
});
