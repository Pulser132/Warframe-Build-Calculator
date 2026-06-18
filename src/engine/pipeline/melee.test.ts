import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';
import { createWeapon } from '../gear/factory';
import { Melee } from '../gear/melee';
import { calculateBuild, type CalcWeapon } from './calculate';
import type { ComboString } from '../model/firemode';

/**
 * Melee multi-target / stance-sequence extras observed through `calculateBuild`:
 * Follow-Through's geometric falloff across a swing arc (`result.followThrough`)
 * and the Combo String per-hit breakdown on the Normal mode (`result.comboString`).
 */

let kronen: Melee;

beforeAll(async () => {
  kronen = createWeapon((await loadWeapon('kronen-prime'))!) as Melee;
});

const cs = (count = 0): CombatState => ({ ...EMPTY_COMBAT_STATE, stacks: { combo: count } });

describe('Follow-Through across a swing arc', () => {
  it('falls off geometrically by the Follow-Through factor (Kronen 0.6, 3 targets)', () => {
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs(), targetCount: 3 });
    const ft = r.followThrough!;
    expect(ft.factor).toBeCloseTo(0.6, 4);
    // total = hit × (1 + 0.6 + 0.36) = 1.96 × singleTarget; per-target = hit × 0.6^k.
    expect(ft.total / ft.singleTarget).toBeCloseTo(1 + 0.6 + 0.36, 6);
    expect(ft.perTarget[1] / ft.singleTarget).toBeCloseTo(0.6, 6);
    expect(ft.perTarget[2] / ft.singleTarget).toBeCloseTo(0.36, 6);
  });

  it('with no reduction (FT = 1) every target takes the full hit', () => {
    const weapon: CalcWeapon = { id: kronen.id, primaryFireMode: kronen.fireMode('Normal Attack'), followThrough: 1 };
    const r = calculateBuild({ weapon, sources: [], combat: cs(), targetCount: 4 });
    expect(r.followThrough!.total / r.followThrough!.singleTarget).toBeCloseTo(4, 6);
  });

  it('with total reduction (FT = 0) only the first target is hit', () => {
    const weapon: CalcWeapon = { id: kronen.id, primaryFireMode: kronen.fireMode('Normal Attack'), followThrough: 0 };
    const r = calculateBuild({ weapon, sources: [], combat: cs(), targetCount: 4 });
    expect(r.followThrough!.total).toBeCloseTo(r.followThrough!.singleTarget, 6);
  });

  it('no Follow-Through extra for a single target', () => {
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs(), targetCount: 1 });
    expect(r.followThrough).toBeUndefined();
  });
});

describe('Combo String breakdown (Normal mode)', () => {
  const combo: ComboString = {
    name: 'Test Combo',
    stance: 'Test Stance',
    hits: [
      { damageMultiplier: 2.0 },
      { damageMultiplier: 0.5, hits: 2 },
      { damageMultiplier: 3.0, forcedProcs: ['impact'] },
    ],
  };

  it('expands repeated hits and scales each by the Normal hit', () => {
    const normal = kronen.fireMode('Normal Attack');
    const plain = calculateBuild({ weapon: kronen, sources: [], combat: cs(), mode: normal });
    const baseHit = plain.avgHitPerShot;

    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs(), mode: { ...normal, comboString: combo } });
    const cb = r.comboString!;
    expect(cb.hitCount).toBe(4); // 1 + 2 (repeated) + 1
    // Per hit = baseHit × the hit's multiplier, in order [2, 0.5, 0.5, 3].
    [2, 0.5, 0.5, 3].forEach((m, i) => expect(cb.perHit[i] / baseHit).toBeCloseTo(m, 6));
    expect(cb.totalDamage / baseHit).toBeCloseTo(6, 6); // 2 + 0.5 + 0.5 + 3
    expect(cb.averagePerHit / baseHit).toBeCloseTo(6 / 4, 6);
  });

  it('derives duration and DPS from the attack speed', () => {
    const normal = kronen.fireMode('Normal Attack');
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs(), mode: { ...normal, comboString: combo } });
    const cb = r.comboString!;
    expect(cb.durationSeconds).toBeCloseTo(4 / r.fireRate, 6); // hitCount / attacks-per-sec
    expect(cb.dps).toBeCloseTo(cb.totalDamage / cb.durationSeconds, 4);
  });

  it('collects forced procs across the sequence', () => {
    const normal = kronen.fireMode('Normal Attack');
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs(), mode: { ...normal, comboString: combo } });
    expect(r.comboString!.forcedProcs).toContain('impact');
  });
});
