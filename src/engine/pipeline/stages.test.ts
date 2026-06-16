import { describe, it, expect } from 'vitest';
import { emptyBucketSums, type BucketSums } from './gather';
import {
  baseElementalStage,
  multishotStage,
  critStage,
  statusStage,
  fireRateStage,
  conditionalMultiplierStage,
  sumDamage,
} from './stages';

function sums(partial: Partial<BucketSums>): BucketSums {
  return { ...emptyBucketSums(), ...partial };
}

describe('baseElementalStage', () => {
  it('adds elementals as a fraction of base then multiplies the whole subtotal by base damage', () => {
    // base 100 Slash, +100% base damage, +50% Toxin element.
    const { perType, stage } = baseElementalStage(
      { slash: 100 },
      100,
      sums({ baseDamage: 1, elements: [{ type: 'toxin', amount: 0.5 }] }),
    );
    // Toxin = 0.5 × 100 = 50; subtotal {slash 100, toxin 50} × (1 + 1) = {slash 200, toxin 100}.
    expect(perType.slash).toBeCloseTo(200, 6);
    expect(perType.toxin).toBeCloseTo(100, 6);
    expect(stage.value).toBeCloseTo(300, 6);
  });

  it('matches the Braton Prime slice subtotal (259.70) pre-crit', () => {
    const { perType } = baseElementalStage(
      { impact: 1.75, puncture: 12.25, slash: 21 },
      35,
      sums({
        baseDamage: 1.65,
        elements: [
          { type: 'toxin', amount: 0.9 },
          { type: 'electricity', amount: 0.9 },
        ],
      }),
    );
    expect(sumDamage(perType)).toBeCloseTo(259.7, 2);
    expect(perType.corrosive).toBeCloseTo(166.95, 2);
    expect(perType.slash).toBeCloseTo(55.65, 2);
    expect(perType.toxin).toBeUndefined(); // combined away
  });
});

describe('multishotStage', () => {
  it('scales the base pellet count', () => {
    expect(multishotStage(1, sums({ multishot: 0.9 })).multishot).toBeCloseTo(1.9, 6);
  });
});

describe('critStage', () => {
  it('computes average crit for sub-100% chance', () => {
    const r = critStage(0.12, 2, sums({ critChance: 1.5, critDamage: 1.2 }));
    expect(r.critChance).toBeCloseTo(0.3, 6);
    expect(r.critMultiplier).toBeCloseTo(4.4, 6);
    expect(r.avgCritMultiplier).toBeCloseTo(2.02, 6); // 1 + 0.30×3.4
  });

  it('handles crit chance over 100% with the same expectation formula', () => {
    // base 0.3, +300% → cc 1.20 (120%, orange-crit territory); cd 2.
    const r = critStage(0.3, 2, sums({ critChance: 3 }));
    expect(r.critChance).toBeCloseTo(1.2, 6);
    expect(r.avgCritMultiplier).toBeCloseTo(2.2, 6); // 1 + 1.2×(2−1)
  });
});

describe('statusStage', () => {
  it('computes per-pellet status and procs per shot', () => {
    const r = statusStage(0.26, 1.9, sums({ statusChance: 0.9 }));
    expect(r.statusChancePerPellet).toBeCloseTo(0.494, 6);
    expect(r.avgProcsPerShot).toBeCloseTo(0.9386, 4);
  });
});

describe('fireRateStage', () => {
  it('scales fire rate additively', () => {
    expect(fireRateStage(9.583334, sums({ fireRate: 0.6 })).fireRate).toBeCloseTo(15.3333, 3);
  });
});

describe('conditionalMultiplierStage', () => {
  it('is 1× when no conditionals are active', () => {
    const r = conditionalMultiplierStage(emptyBucketSums());
    expect(r.factionMultiplier).toBe(1);
    expect(r.directMultiplier).toBe(1);
  });
  it('adds within the faction bucket (Bane + Roar) then multiplies', () => {
    const r = conditionalMultiplierStage(sums({ faction: 0.3 + 0.5 }));
    expect(r.factionMultiplier).toBeCloseTo(1.8, 6);
  });
});
