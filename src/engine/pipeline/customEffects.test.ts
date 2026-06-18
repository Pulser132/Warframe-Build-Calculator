import { describe, it, expect } from 'vitest';
import { bloodRush, weepingWounds, conditionOverload, STATUS_COUNT_KEY } from './customEffects';
import { gatherBuckets, type ResolvedSource } from './gather';
import { CUSTOM_EFFECTS } from '../model/registry';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';

function withCombo(count: number, extra: Partial<CombatState> = {}): CombatState {
  return { ...EMPTY_COMBAT_STATE, stacks: { combo: count, ...extra.stacks } };
}

describe('Blood Rush (custom effect)', () => {
  it('adds 0.4 × tier to critChance at max rank', () => {
    // combo 60 → tier 3 → +1.2 crit chance bucket (wiki: ×(combo−1)=×3 at 4x).
    const eff = bloodRush({ rank: 10, maxRank: 10, combat: withCombo(60), setCounts: {} });
    expect(eff).toHaveLength(1);
    expect(eff[0].bucket).toBe('critChance');
    expect(eff[0].value).toBeCloseTo(1.2, 6);
  });

  it('is zero at tier 0 (combo < 20)', () => {
    expect(bloodRush({ rank: 10, maxRank: 10, combat: withCombo(19), setCounts: {} })).toEqual([]);
  });

  it('scales linearly with rank', () => {
    // rankFactor(5,10) = 6/11; tier 1 → 0.4 × 6/11.
    const eff = bloodRush({ rank: 5, maxRank: 10, combat: withCombo(20), setCounts: {} });
    expect(eff[0].value).toBeCloseTo(0.4 * (6 / 11), 6);
  });
});

describe('Weeping Wounds (custom effect)', () => {
  it('adds 0.4 × tier to statusChance at max rank', () => {
    const eff = weepingWounds({ rank: 5, maxRank: 5, combat: withCombo(60), setCounts: {} });
    expect(eff).toHaveLength(1);
    expect(eff[0].bucket).toBe('statusChance');
    expect(eff[0].value).toBeCloseTo(1.2, 6);
  });
});

describe('Condition Overload (custom effect)', () => {
  it('adds 0.8 × status count to baseDamage at max rank', () => {
    const eff = conditionOverload({
      rank: 5,
      maxRank: 5,
      combat: { ...EMPTY_COMBAT_STATE, stacks: { [STATUS_COUNT_KEY]: 4 } },
      setCounts: {},
    });
    expect(eff).toHaveLength(1);
    expect(eff[0].bucket).toBe('baseDamage');
    expect(eff[0].value).toBeCloseTo(3.2, 6);
  });

  it('caps at 16 unique statuses', () => {
    const eff = conditionOverload({
      rank: 5,
      maxRank: 5,
      combat: { ...EMPTY_COMBAT_STATE, stacks: { [STATUS_COUNT_KEY]: 99 } },
      setCounts: {},
    });
    expect(eff[0].value).toBeCloseTo(0.8 * 16, 6);
  });

  it('is zero with no statuses', () => {
    expect(conditionOverload({ rank: 5, maxRank: 5, combat: EMPTY_COMBAT_STATE, setCounts: {} })).toEqual([]);
  });
});

describe('gather folds custom effects without re-scaling, additively with static mods', () => {
  it('Blood Rush + a Point-Strike-equivalent sum in the critChance bucket', () => {
    // The registry is auto-populated at import (pipeline/index registers it).
    expect(CUSTOM_EFFECTS['blood-rush']).toBeTypeOf('function');

    const truesteel: ResolvedSource = {
      id: 'true-steel',
      label: 'True Steel',
      kind: 'mod',
      rank: 5,
      maxRank: 5,
      effects: [{ bucket: 'critChance', value: 0.8 }],
    };
    const bloodRushSrc: ResolvedSource = {
      id: 'blood-rush',
      label: 'Blood Rush',
      kind: 'mod',
      rank: 10,
      maxRank: 10,
      effects: [],
      customEffectId: 'blood-rush',
    };
    const sums = gatherBuckets([truesteel, bloodRushSrc], withCombo(60));
    // 0.8 (True Steel, full rank) + 1.2 (Blood Rush tier 3) = 2.0, additive.
    expect(sums.critChance).toBeCloseTo(2.0, 6);
  });

  it('does NOT re-apply rankFactor to the custom output', () => {
    // A custom source at rank 0/maxRank 10 still yields its self-scaled value; if
    // gather re-scaled, the value would be multiplied by 1/11.
    const src: ResolvedSource = {
      id: 'blood-rush',
      label: 'Blood Rush',
      kind: 'mod',
      rank: 0,
      maxRank: 10,
      effects: [],
      customEffectId: 'blood-rush',
    };
    const sums = gatherBuckets([src], withCombo(40)); // tier 2
    // bloodRush self-scales: 0.4 × rankFactor(0,10)=1/11 × 2 = 0.0727…
    expect(sums.critChance).toBeCloseTo(0.4 * (1 / 11) * 2, 6);
  });
});
