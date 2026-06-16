import { describe, it, expect } from 'vitest';
import {
  effectiveFireRate,
  SEMI_AUTO_CAP,
  FIRE_RATE_FLOOR,
} from './triggers';
import type { TriggerInput } from './triggers';

function input(partial: Partial<TriggerInput> & { trigger: TriggerInput['trigger'] }): TriggerInput {
  return {
    modifiedFireRate: partial.modifiedFireRate ?? 1,
    fireRateBonus: partial.fireRateBonus ?? 0,
    baseFireRate: partial.baseFireRate ?? 1,
    ...partial,
  };
}

describe('effectiveFireRate — trigger conversions (vs docs/warframe/mechanics/triggers.md)', () => {
  it('auto: passes modified fire rate through', () => {
    expect(effectiveFireRate(input({ trigger: 'auto', modifiedFireRate: 15 }))).toBeCloseTo(15, 6);
  });

  it('semi: caps at 10 rps', () => {
    expect(effectiveFireRate(input({ trigger: 'semi', modifiedFireRate: 8 }))).toBeCloseTo(8, 6);
    expect(effectiveFireRate(input({ trigger: 'semi', modifiedFireRate: 12 }))).toBe(SEMI_AUTO_CAP);
  });

  it('floor: never below 0.05 rps', () => {
    expect(effectiveFireRate(input({ trigger: 'auto', modifiedFireRate: 0.001 }))).toBe(FIRE_RATE_FLOOR);
  });

  it('burst worked example: 3 rounds, 6 rps in-burst, 0.3s delay → 3.913 rps', () => {
    const eff = effectiveFireRate(
      input({ trigger: 'burst', modifiedFireRate: 6, burst: { count: 3, delay: 0.3 } }),
    );
    expect(eff).toBeCloseTo(3.913, 3);
  });

  it('burst with +60% in-burst fire rate → 4.260 rps (delay dominates)', () => {
    const eff = effectiveFireRate(
      input({ trigger: 'burst', modifiedFireRate: 9.6, burst: { count: 3, delay: 0.3 } }),
    );
    expect(eff).toBeCloseTo(4.26, 2);
  });

  it('1-round "burst" degenerates to the in-burst rate', () => {
    const eff = effectiveFireRate(
      input({ trigger: 'burst', modifiedFireRate: 6, burst: { count: 1, delay: 0.3 } }),
    );
    expect(eff).toBeCloseTo(6, 6);
  });

  it('charge bow: 1.0s base, +60% → 0.625s → 1.6 rps', () => {
    const eff = effectiveFireRate(
      input({ trigger: 'charge', chargeTime: 1, fireRateBonus: 0.6, bow: true, modifiedFireRate: 0 }),
    );
    expect(eff).toBeCloseTo(1.6, 4);
  });

  it('charge (non-bow) with zero fire rate behaves like a bow (no recovery term)', () => {
    // Lanka: base charge 1s, fireRate 0 → recovery 1/0 is treated as 0.
    const eff = effectiveFireRate(
      input({ trigger: 'charge', chargeTime: 1, fireRateBonus: 0, bow: false, modifiedFireRate: 0 }),
    );
    expect(eff).toBeCloseTo(1.0, 4);
  });

  it('charge (non-bow) adds a 1/fireRate recovery term', () => {
    // base charge 1s, no mods, fireRate 2 → cycle = 1 + 0.5 = 1.5 → 0.667 rps.
    const eff = effectiveFireRate(
      input({ trigger: 'charge', chargeTime: 1, fireRateBonus: 0, bow: false, modifiedFireRate: 2 }),
    );
    expect(eff).toBeCloseTo(1 / 1.5, 4);
  });

  it('charge time is capped at 10× base at extreme negative fire rate', () => {
    // bonus −0.95 would give 1/0.05 = 20s; capped at 10s → 0.1 rps.
    const eff = effectiveFireRate(
      input({ trigger: 'charge', chargeTime: 1, fireRateBonus: -0.95, bow: true, modifiedFireRate: 0 }),
    );
    expect(eff).toBeCloseTo(0.1, 4);
  });
});
