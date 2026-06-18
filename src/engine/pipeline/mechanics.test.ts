import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon, loadMods } from '../../data/loaders';
import type { ModData } from '../model/types';
import { EMPTY_COMBAT_STATE } from '../model/build';
import { createWeapon } from '../gear/factory';
import type { Gun } from '../gear/weapon';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';
import { falloffFactor, rimFactor } from './mechanics';
import type { FalloffSpec } from '../model/firemode';

let modsById: Map<string, ModData>;

beforeAll(async () => {
  modsById = new Map((await loadMods()).map((m) => [m.id, m]));
});

async function gunFor(id: string): Promise<Gun> {
  return createWeapon((await loadWeapon(id))!) as Gun;
}
function mod(id: string): ResolvedSource {
  const m = modsById.get(id);
  if (!m) throw new Error(`missing mod ${id}`);
  return { id: m.id, label: m.name, kind: 'mod', rank: m.maxRank, maxRank: m.maxRank, effects: m.effects };
}

describe('status proc probability — surfaced as result.statusProcChance', () => {
  it('rises toward 1 as the pellet count grows (Vaykor Hek + Hell’s Chamber)', async () => {
    const hek = await gunFor('vaykor-hek');
    const base = calculateBuild({ weapon: hek, sources: [], combat: EMPTY_COMBAT_STATE });
    const more = calculateBuild({ weapon: hek, sources: [mod('hell-s-chamber')], combat: EMPTY_COMBAT_STATE });
    // P(≥1) = 1 − (1 − s)^N at s = 0.107, N = 7 then 15.4.
    expect(base.statusProcChance).toBeCloseTo(1 - Math.pow(1 - 0.107, 7), 4);
    expect(more.statusProcChance).toBeCloseTo(1 - Math.pow(1 - 0.107, 15.4), 4);
    expect(more.statusProcChance).toBeGreaterThan(base.statusProcChance!);
  });

  it('per-pellet status ≥ 100% guarantees a proc (probability clamps to 1)', async () => {
    const hek = await gunFor('vaykor-hek');
    // Synthetic +1000% status → per-pellet 0.107 × 11 = 1.177 (> 1).
    const overload: ResolvedSource = {
      id: 'x', label: 'x', kind: 'mod', rank: 0, maxRank: 0,
      effects: [{ bucket: 'statusChance', value: 10 }],
    };
    const r = calculateBuild({ weapon: hek, sources: [overload], combat: EMPTY_COMBAT_STATE });
    expect(r.statusChancePerPellet).toBeGreaterThan(1);
    expect(r.statusProcChance).toBe(1);
  });
});

describe('proc-type weighting — surfaced as result.procTypeWeights', () => {
  it('weights each damage type by its share of total damage and sums to 1', async () => {
    const hek = await gunFor('vaykor-hek');
    const r = calculateBuild({ weapon: hek, sources: [], combat: EMPTY_COMBAT_STATE });
    const weights = r.procTypeWeights!;
    const sum = Object.values(weights).reduce((a, v) => a + (v ?? 0), 0);
    expect(sum).toBeCloseTo(1, 6);
    // Vaykor Hek is puncture-heavy, so puncture carries the largest weight.
    const largest = Object.entries(weights).sort((a, b) => b[1]! - a[1]!)[0][0];
    expect(largest).toBe('puncture');
  });
});

describe('AoE falloff — published distance utility (engine API)', () => {
  // `calculateBuild` only reports the two endpoints it needs — center (d ≤ start)
  // and rim (d ≥ end), verified end-to-end on Tonkor in weapons.test.ts. The
  // arbitrary-distance interpolation between them is exposed only by `falloffFactor`
  // (an `@engine` export with no internal consumer), so it is pinned directly here.
  const radial: FalloffSpec = { start: 0, end: 5, maxReduction: 0.9 };

  it('is full at/below the start distance', () => {
    expect(falloffFactor(radial, 0)).toBeCloseTo(1, 6);
  });

  it('interpolates linearly across the band (2.5m → 0.55)', () => {
    expect(falloffFactor(radial, 2.5)).toBeCloseTo(0.55, 6);
  });

  it('floors at the rim at/beyond the end distance (5m and 8m → 0.10)', () => {
    expect(falloffFactor(radial, 5)).toBeCloseTo(0.1, 6);
    expect(falloffFactor(radial, 8)).toBeCloseTo(0.1, 6);
  });

  it('handles an offset band (projectile 10–30m, 80% reduction)', () => {
    const proj: FalloffSpec = { start: 10, end: 30, maxReduction: 0.8 };
    expect(falloffFactor(proj, 15)).toBeCloseTo(0.8, 6);
    expect(falloffFactor(proj, 20)).toBeCloseTo(0.6, 6);
  });

  it('rimFactor is the floor multiplier 1 − maxReduction (Tonkor radial 0.3 → 0.7)', () => {
    expect(rimFactor({ start: 0, end: 7, maxReduction: 0.3 })).toBeCloseTo(0.7, 6);
  });
});
