import { describe, it, expect } from 'vitest';
import { applyTarget, critTiers, type DamageResult, type EnemyData, type TargetState } from '@engine';
import { buildEffectiveProjection } from './effective';

/**
 * The effective projection (decision 9): a synthetic `DamageResult` carrying the
 * vs-Target numbers, so the shared `DamageSummary` renders both views. We assert
 * the headline/per-type/per-pellet overrides and the mech sub-result swaps; the
 * routing math itself is covered in `engine/target/target.test.ts`.
 */

const charger: EnemyData = { id: 'charger', name: 'Charger', faction: 'Infested', baseLevel: 1, health: 1e9, shield: 0, armor: 0 };
const target: TargetState = { enemyId: 'charger', level: 1, steelPath: false, armorStripPct: 0, overguard: false };

function intrinsic(over: Partial<DamageResult> = {}): DamageResult {
  // multishot 2; per-pellet 50 Slash + 50 Impact → avgHit 200.
  return {
    perType: { slash: 50, impact: 50 },
    perPelletAverage: 100,
    multishot: 2,
    critChance: 0.3,
    critMultiplier: 2,
    avgCritMultiplier: 1.3,
    statusChancePerPellet: 0.2,
    avgProcsPerShot: 0.4,
    fireRate: 5,
    avgHitPerShot: 200,
    burstDps: 1000,
    sustainedDps: 700,
    procTypeWeights: {},
    chain: [],
    ...over,
  };
}

describe('buildEffectiveProjection', () => {
  it('overrides the headline with effective burst/sustained/avg-hit', () => {
    const base = intrinsic();
    const result = applyTarget(base, target, charger);
    const proj = buildEffectiveProjection(base, result);
    expect(proj.avgHitPerShot).toBe(result.effectiveHitAverage);
    expect(proj.sustainedDps).toBe(result.effectiveDps);
    expect(proj.burstDps).toBe(result.effectiveBurstDps);
    // Untouched intrinsic fields carry through.
    expect(proj.multishot).toBe(2);
    expect(proj.critChance).toBe(0.3);
  });

  it('projects per-pellet effective so the shared crit tiers roll effective numbers', () => {
    const base = intrinsic();
    const result = applyTarget(base, target, charger);
    const proj = buildEffectiveProjection(base, result);
    // Infested Slash ×1.5: effHit = (50×1.5 + 50)×2 = 250; perPellet = 125.
    expect(result.effectiveHitAverage).toBeCloseTo(250, 6);
    expect(proj.perPelletAverage).toBeCloseTo(125, 6);
    const sum = Object.values(proj.perType).reduce((s, v) => s + (v ?? 0), 0);
    expect(sum).toBeCloseTo(proj.perPelletAverage, 6); // chips agree with per-pellet
    // The shared crit-tier helper reads the projected per-pellet average.
    const tiers = critTiers(proj);
    expect(tiers[0].perPellet).toBeCloseTo(125 / 1.3, 4); // tier-0 = perPellet ÷ avgCrit
  });

  it('swaps in the effective mechanic sub-results (beam)', () => {
    const base = intrinsic({
      beam: { tickRate: 5, perTickDamage: 200, procsPerSecond: 2, rampStartPct: 0.2, rampSeconds: 0.6 },
    });
    const result = applyTarget(base, target, charger);
    const proj = buildEffectiveProjection(base, result);
    expect(proj.beam).toBe(result.beam);
    expect(proj.beam?.perTickDamage).toBeCloseTo(result.effectiveHitAverage, 6); // effective, not 200
  });
});
