import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { EMPTY_COMBAT_STATE } from '../model/build';
import { createWeapon } from '../gear/factory';
import type { Gun } from '../gear/weapon';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';
import { effectiveFireRate, SEMI_AUTO_CAP, FIRE_RATE_FLOOR } from './triggers';
import type { TriggerInput } from './triggers';

let vulkar: Gun; // auto
let stradavar: Gun; // multi-mode (semi + auto)
let lanka: Gun; // charge

beforeAll(async () => {
  vulkar = createWeapon((await loadWeapon('vulkar-wraith'))!) as Gun;
  stradavar = createWeapon((await loadWeapon('stradavar-prime'))!) as Gun;
  lanka = createWeapon((await loadWeapon('lanka'))!) as Gun;
});

/** A synthetic ±fire-rate source (lets us push a fire mode to its trigger limits). */
function fireRate(bonus: number): ResolvedSource {
  return { id: 'fr', label: 'fr', kind: 'mod', rank: 0, maxRank: 0, effects: [{ bucket: 'fireRate', value: bonus }] };
}
function rateOf(weapon: Gun, sources: ResolvedSource[] = [], modeName?: string) {
  const mode = modeName ? weapon.fireMode(modeName) : undefined;
  return calculateBuild({ weapon, sources, combat: EMPTY_COMBAT_STATE, mode }).fireRate;
}

describe('trigger conversions surface as result.fireRate', () => {
  it('auto passes the modified fire rate straight through (Vulkar Wraith)', () => {
    expect(rateOf(vulkar)).toBeCloseTo(2.0, 4); // base attack rate, no conversion
  });

  it('semi-auto caps at 10 rps (Stradavar Semi-Auto under heavy fire rate)', () => {
    expect(rateOf(stradavar, [], 'Semi-Auto Mode')).toBeCloseTo(3.33, 2); // uncapped base
    // 3.33 × (1 + 3) = 13.3 → clamped to the semi cap.
    expect(rateOf(stradavar, [fireRate(3)], 'Semi-Auto Mode')).toBeCloseTo(SEMI_AUTO_CAP, 6);
  });

  it('never drops below the fire-rate floor (Vulkar at −99.9% fire rate)', () => {
    expect(rateOf(vulkar, [fireRate(-0.999)])).toBeCloseTo(FIRE_RATE_FLOOR, 6);
  });

  it('caps charge time at 10× base (Lanka at −95% fire rate → 0.1 rps)', () => {
    // modChargeTime = 1 / 0.05 = 20s, clamped to 10s → 1/10 = 0.1 rps.
    expect(rateOf(lanka, [fireRate(-0.95)])).toBeCloseTo(0.1, 4);
  });
});

describe('trigger-conversion worked examples the weapon set does not exercise (engine API)', () => {
  // No fixture weapon is a 3-round burst or a non-bow charge with a recovery term,
  // so these documented conversions (docs/warframe/mechanics/triggers.md) are pinned
  // on the pure `effectiveFireRate` utility directly. The conversions that fixtures
  // DO exercise are asserted end-to-end in weapons.test.ts (Hind burst 4.31, Lanka
  // charge 1.0→1.6, Glaxion held 12, Stradavar semi 3.33).
  function input(partial: Partial<TriggerInput> & { trigger: TriggerInput['trigger'] }): TriggerInput {
    return {
      modifiedFireRate: partial.modifiedFireRate ?? 1,
      fireRateBonus: partial.fireRateBonus ?? 0,
      baseFireRate: partial.baseFireRate ?? 1,
      ...partial,
    };
  }

  it('burst: 3 rounds, 6 rps in-burst, 0.3s delay → 3.913 rps', () => {
    expect(effectiveFireRate(input({ trigger: 'burst', modifiedFireRate: 6, burst: { count: 3, delay: 0.3 } }))).toBeCloseTo(3.913, 3);
  });

  it('burst: mods scale the in-burst rate only (+60% → 4.26; delay dominates)', () => {
    expect(effectiveFireRate(input({ trigger: 'burst', modifiedFireRate: 9.6, burst: { count: 3, delay: 0.3 } }))).toBeCloseTo(4.26, 2);
  });

  it('burst: a 1-round burst degenerates to the in-burst rate', () => {
    expect(effectiveFireRate(input({ trigger: 'burst', modifiedFireRate: 6, burst: { count: 1, delay: 0.3 } }))).toBeCloseTo(6, 6);
  });

  it('charge (non-bow) adds a 1/fireRate recovery term (charge 1s, FR 2 → 0.667 rps)', () => {
    expect(effectiveFireRate(input({ trigger: 'charge', chargeTime: 1, fireRateBonus: 0, bow: false, modifiedFireRate: 2 }))).toBeCloseTo(1 / 1.5, 4);
  });

  it('charge (bow) uses 1/chargeTime with no recovery term (1s, +60% → 1.6 rps)', () => {
    expect(effectiveFireRate(input({ trigger: 'charge', chargeTime: 1, fireRateBonus: 0.6, bow: true, modifiedFireRate: 0 }))).toBeCloseTo(1.6, 4);
  });
});
