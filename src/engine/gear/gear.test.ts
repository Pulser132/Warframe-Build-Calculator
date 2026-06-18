import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { createWeapon } from './index';
import type { Gun } from './weapon';
import { EMPTY_COMBAT_STATE } from '../model/build';
import { calculateBuild } from '../pipeline/calculate';

/**
 * A weapon's curated base stats, observed through an unmodded calculation — the
 * numbers the gear class feeds the pipeline (IPS split, crit, status, multishot).
 * The class hierarchy/slot layout that carries them is exercised behaviorally
 * elsewhere: the gun's 11-slot layout in `state/store.test.ts`, and the
 * Secondary/Melee factory dispatch in `weapons`/`meleeCalc` tests.
 */

let gun: Gun;

beforeAll(async () => {
  gun = createWeapon((await loadWeapon('vulkar-wraith'))!) as Gun;
});

const unmodded = () => calculateBuild({ weapon: gun, sources: [], combat: EMPTY_COMBAT_STATE });

describe('Vulkar Wraith base stats (via an unmodded calculation)', () => {
  it('carries the wiki IPS split — Impact 245.7 / Puncture 27.3, no Slash', () => {
    const base = unmodded().chain.find((s) => s.id === 'base')!;
    expect(base.value).toBeCloseTo(273, 4); // total base damage
    expect(base.perType!.impact).toBeCloseTo(245.7, 4);
    expect(base.perType!.puncture).toBeCloseTo(27.3, 4);
    expect(base.perType!.slash).toBeUndefined(); // Slash/Puncture not transposed (@wfcd note)
  });

  it('exposes its base crit, status, and multishot', () => {
    const r = unmodded();
    expect(r.critChance).toBeCloseTo(0.2, 5);
    expect(r.critMultiplier).toBe(2);
    expect(r.avgCritMultiplier).toBeCloseTo(1.2, 5); // 1 + 0.2 × (2 − 1)
    expect(r.statusChancePerPellet).toBeCloseTo(0.25, 4);
    expect(r.multishot).toBe(1);
  });
});
