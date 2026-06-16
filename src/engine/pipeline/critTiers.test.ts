import { describe, it, expect } from 'vitest';
import { critTiers } from './critTiers';

// Vulkar Wraith slice: quantized pre-crit per-pellet 2034.703, crit mult 4.4, avg crit 2.70.
const tier0 = 2034.703125;
const slice = {
  critMultiplier: 4.4,
  avgCritMultiplier: 2.7,
  perPelletAverage: tier0 * 2.7,
};

describe('critTiers', () => {
  it('returns two adjacent tiers for a sub-100% crit chance (50%)', () => {
    const tiers = critTiers({ ...slice, critChance: 0.5 });
    expect(tiers).toHaveLength(2);

    expect(tiers[0]).toMatchObject({ tier: 0, multiplier: 1 });
    expect(tiers[0].perPellet).toBeCloseTo(tier0, 2);
    expect(tiers[0].probability).toBeCloseTo(0.5, 6);

    expect(tiers[1].tier).toBe(1);
    expect(tiers[1].multiplier).toBeCloseTo(4.4, 6);
    expect(tiers[1].perPellet).toBeCloseTo(tier0 * 4.4, 2); // 8952.69
    expect(tiers[1].probability).toBeCloseTo(0.5, 6);
  });

  it('yields a single guaranteed tier for an integer crit chance', () => {
    const tiers = critTiers({ ...slice, critChance: 1, avgCritMultiplier: 4.4 });
    expect(tiers).toHaveLength(1);
    expect(tiers[0]).toMatchObject({ tier: 1, probability: 1 });
  });

  it('climbs to orange (tier 2) once crit chance passes 100%', () => {
    const avg = 1 + 1.2 * (4.4 - 1); // 5.08
    const tiers = critTiers({ ...slice, critChance: 1.2, avgCritMultiplier: avg });
    expect(tiers.map((t) => t.tier)).toEqual([1, 2]);
    expect(tiers[0].probability).toBeCloseTo(0.8, 6);
    expect(tiers[1].probability).toBeCloseTo(0.2, 6);
    expect(tiers[1].multiplier).toBeCloseTo(1 + 2 * (4.4 - 1), 6); // 7.8
  });
});
