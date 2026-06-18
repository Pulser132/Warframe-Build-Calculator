import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';
import { createWeapon } from '../gear/factory';
import { Melee } from '../gear/melee';
import { calculateBuild } from './calculate';
import { sustainedHeavyLoop, reachTargetCount } from './melee';

/**
 * Stage 5 melee carry-overs (decisions 18–19): the sustained heavy-attack
 * combo-rebuild loop and reach→enemy-count, both observed through the public
 * pipeline plus the pure helpers.
 */

let kronen: Melee;
beforeAll(async () => {
  kronen = createWeapon((await loadWeapon('kronen-prime'))!) as Melee;
});
const cs = (over: Partial<CombatState> = {}): CombatState => ({ ...EMPTY_COMBAT_STATE, ...over });

describe('sustainedHeavyLoop — combo-rebuild loop (pure)', () => {
  it('at Combo 0 reduces to the Stage-3 burst (heavyHit ÷ windUp)', () => {
    const r = sustainedHeavyLoop({
      heavyHit: 1000,
      normalHit: 100,
      attackSpeed: 2,
      windUp: 0.7,
      comboCount: 0,
      comboCost: 1,
      heavyEfficiency: 0,
    });
    expect(r.rebuildHits).toBe(0);
    expect(r.loopSeconds).toBeCloseTo(0.7, 6);
    expect(r.sustainedDps).toBeCloseTo(1000 / 0.7, 6);
  });

  it('models build + heavy: loopTime = hits/speed + windUp, dmg = hits×normal + heavy', () => {
    // comboCount 200, comboCost 1, eff 0 → consume 200 combo → rebuild 200 hits.
    const r = sustainedHeavyLoop({
      heavyHit: 5000,
      normalHit: 100,
      attackSpeed: 4,
      windUp: 0.6,
      comboCount: 200,
      comboCost: 1,
      heavyEfficiency: 0,
    });
    expect(r.comboConsumed).toBe(200);
    expect(r.rebuildHits).toBe(200);
    expect(r.loopSeconds).toBeCloseTo(200 / 4 + 0.6, 6); // 50.6 s
    const dmg = 200 * 100 + 5000; // 25000
    expect(r.sustainedDps).toBeCloseTo(dmg / (200 / 4 + 0.6), 6);
  });

  it('Heavy Attack Efficiency cuts the combo consumed (and rebuild hits)', () => {
    const full = sustainedHeavyLoop({ heavyHit: 5000, normalHit: 100, attackSpeed: 4, windUp: 0.6, comboCount: 200, comboCost: 1, heavyEfficiency: 0 });
    const eff = sustainedHeavyLoop({ heavyHit: 5000, normalHit: 100, attackSpeed: 4, windUp: 0.6, comboCount: 200, comboCost: 1, heavyEfficiency: 0.5 });
    expect(eff.rebuildHits).toBeCloseTo(100, 6); // half consumed
    expect(eff.sustainedDps).toBeGreaterThan(full.sustainedDps); // less rebuild downtime
  });
});

describe('heavy loop integrated into calculateBuild', () => {
  it('a heavy mode reports a heavyLoop; at combo 0 sustained = heavyHit ÷ windUp', () => {
    const heavy = kronen.fireMode('Heavy Attack');
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs(), mode: heavy });
    expect(r.heavyLoop).toBeDefined();
    expect(r.heavyLoop!.sustainedDps).toBeCloseTo(r.avgHitPerShot / heavy.windUp!, 4);
  });

  it('the Normal mode has no heavy loop', () => {
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs() });
    expect(r.heavyLoop).toBeUndefined();
  });
});

describe('reachTargetCount — reach → enemy-count (pure)', () => {
  it('is floor(reach / spacing) + 1, clamped to ≥1', () => {
    expect(reachTargetCount(2.5, 1.5)).toBe(2); // floor(1.66)+1
    expect(reachTargetCount(6, 1.5)).toBe(5); // floor(4)+1
    expect(reachTargetCount(0, 1.5)).toBe(1);
    expect(reachTargetCount(undefined, 1.5)).toBe(1);
  });
});

describe('reach→count integrated into Follow-Through', () => {
  it('derives the swing target count from reach when an enemy spacing is set', () => {
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs({ enemySpacing: 1 }) });
    // Kronen reach 2.5 ÷ 1 m → floor(2.5)+1 = 3 targets.
    expect(r.reachTargets).toEqual({ count: 3, spacing: 1, reach: 2.5 });
    expect(r.followThrough?.targetCount).toBe(3);
  });

  it('without an enemy spacing there is no auto-derivation (single target)', () => {
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs() });
    expect(r.reachTargets).toBeUndefined();
    expect(r.followThrough).toBeUndefined();
  });

  it('an explicit targetCount still overrides the reach-derived count', () => {
    const r = calculateBuild({ weapon: kronen, sources: [], combat: cs({ enemySpacing: 1 }), targetCount: 5 });
    expect(r.followThrough?.targetCount).toBe(5);
  });
});
