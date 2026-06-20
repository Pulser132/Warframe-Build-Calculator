import { describe, it, expect } from 'vitest';
import type { DamageResult, DamageMap } from '../model/result';
import {
  applyTarget,
  routeToHealth,
  enemyArmorDR,
  armorDamageMultiplier,
  netArmorAfterStrip,
  scaleEnemy,
  healthScale,
  shieldScale,
  armorScale,
  overguardLevelScale,
  factionModifier,
  type EnemyData,
  type TargetState,
} from './index';

/**
 * The Target / Enemy layer (Stage 5, Phase B). Numbers are hand-computed from the
 * wiki-verified formulas (docs/warframe/mechanics/enemy-damage-modifiers.md):
 * enemy armor DR = 0.9 × netArmor/2700; faction ×1.5 vulnerabilities; min-1 floor.
 * The two reference cases are evaluated at base level (no scaling) to isolate the
 * routing math.
 */

/** Build a minimal intrinsic result with a known per-shot per-type spread. */
function makeIntrinsic(opts: {
  perType: DamageMap;
  multishot?: number;
  avgProcsPerShot?: number;
  procTypeWeights?: DamageMap;
}): DamageResult {
  const multishot = opts.multishot ?? 1;
  const perPelletAverage = Object.values(opts.perType).reduce((s, v) => s + (v ?? 0), 0);
  const avgHitPerShot = perPelletAverage * multishot;
  return {
    perType: opts.perType,
    perPelletAverage,
    multishot,
    critChance: 0,
    critMultiplier: 1,
    avgCritMultiplier: 1,
    statusChancePerPellet: 0,
    avgProcsPerShot: opts.avgProcsPerShot ?? 0,
    fireRate: 1,
    avgHitPerShot,
    burstDps: avgHitPerShot, // rate 1/s
    sustainedDps: avgHitPerShot, // effectiveRate = sustainedDps/avgHit = 1
    procTypeWeights: opts.procTypeWeights ?? {},
    chain: [],
  };
}

const target = (over: Partial<TargetState> = {}): TargetState => ({
  enemyId: 'x',
  level: 1,
  steelPath: false,
  armorStripPct: 0,
  overguard: false,
  ...over,
});

// ── Scaling primitives ───────────────────────────────────────────────────────

describe('enemy armor DR (distinct from the player armor curve)', () => {
  it('is linear 0.9 × netArmor/2700, multiplier 1 − DR', () => {
    expect(enemyArmorDR(500)).toBeCloseTo(0.16667, 5);
    expect(armorDamageMultiplier(500)).toBeCloseTo(0.83333, 5);
  });
  it('caps at 90% reduction (netArmor ≥ 2700)', () => {
    expect(enemyArmorDR(2700)).toBeCloseTo(0.9, 6);
    expect(enemyArmorDR(99999)).toBeCloseTo(0.9, 6);
    expect(armorDamageMultiplier(99999)).toBeCloseTo(0.1, 6);
  });
  it('is 1.0 (no reduction) at zero armor', () => {
    expect(armorDamageMultiplier(0)).toBe(1);
  });
});

describe('armor strip control', () => {
  it('nets base × (1 − strip), clamped 0..1', () => {
    expect(netArmorAfterStrip(500, 0.5)).toBe(250);
    expect(netArmorAfterStrip(500, 1)).toBe(0);
    expect(netArmorAfterStrip(500, 2)).toBe(0); // clamped
  });
});

describe('level scaling', () => {
  it('is identity at the base level (LD = 0)', () => {
    expect(healthScale('Grineer', 0)).toBe(1);
    expect(shieldScale('Corpus', 0)).toBe(1);
    expect(armorScale(0)).toBe(1);
  });
  it('grows monotonically and health ≫ armor at high level', () => {
    const h = healthScale('Grineer', 99);
    const a = armorScale(99);
    expect(h).toBeGreaterThan(a);
    expect(healthScale('Grineer', 120)).toBeGreaterThan(h);
  });
  it('uses a distinct high-LD health curve for Corpus vs Grineer', () => {
    expect(healthScale('Corpus', 150)).not.toBeCloseTo(healthScale('Grineer', 150), 1);
  });
});

describe('Steel Path', () => {
  const base: EnemyData = { id: 'b', name: 'B', faction: 'Grineer', baseLevel: 1, health: 100, shield: 0, armor: 100 };
  it('adds +100 levels and ×2.5 health, armor unchanged by the multiplier', () => {
    const normal = scaleEnemy(base, { level: 1, steelPath: false, armorStripPct: 0, overguard: false });
    const sp = scaleEnemy(base, { level: 1, steelPath: false, armorStripPct: 0, overguard: false, faction: 'Grineer' });
    expect(normal.health).toBe(100);
    expect(sp.health).toBe(100);
    const spOn = scaleEnemy(base, { level: 1, steelPath: true, armorStripPct: 0, overguard: false });
    expect(spOn.level).toBe(101);
    // health = 100 × levelScale(LD=100) × 2.5 ; armor = 100 × levelScale(LD=100) × 1.0
    expect(spOn.health).toBeGreaterThan(100 * 2.5); // also level-scaled
    expect(spOn.health / spOn.armor).toBeCloseTo((healthScale('Grineer', 100) * 2.5) / armorScale(100), 4);
  });
});

describe('Overguard', () => {
  it('is the base 12 at level 1', () => {
    expect(overguardLevelScale(1)).toBe(12);
  });
  it('grows with level', () => {
    expect(overguardLevelScale(100)).toBeGreaterThan(overguardLevelScale(50));
  });
});

describe('faction modifiers', () => {
  it('tags each faction’s ×1.5 vulnerabilities and ×0.5 resistances', () => {
    expect(factionModifier('Infested', 'slash')).toBe(1.5);
    expect(factionModifier('Grineer', 'corrosive')).toBe(1.5);
    expect(factionModifier('Corpus', 'magnetic')).toBe(1.5);
    expect(factionModifier('Sentient', 'corrosive')).toBe(0.5);
    expect(factionModifier('Grineer', 'slash')).toBe(1); // neutral
  });
});

// ── Reference cases (hand-computed) ──────────────────────────────────────────

describe('Reference: Vulkar Wraith vs Charger (pure health, Infested)', () => {
  const charger: EnemyData = { id: 'charger', name: 'Charger', faction: 'Infested', baseLevel: 1, health: 80, shield: 0, armor: 0 };
  // 100 Slash + 100 Impact per shot; rate 1/s.
  const intrinsic = makeIntrinsic({ perType: { slash: 100, impact: 100 } });

  it('applies the Infested Slash ×1.5 (Impact neutral), no armor/shield', () => {
    const r = applyTarget(intrinsic, target({ enemyId: 'charger' }), charger);
    expect(r.perTypeEffective.slash).toBeCloseTo(150, 6); // 100 × 1.5
    expect(r.perTypeEffective.impact).toBeCloseTo(100, 6); // neutral
    expect(r.effectiveHitAverage).toBeCloseTo(250, 6);
    expect(r.effectiveDps).toBeCloseTo(250, 6); // × rate 1
  });

  it('TTK = health ÷ effective DPS (80 ÷ 250 = 0.32 s)', () => {
    const r = applyTarget(intrinsic, target({ enemyId: 'charger' }), charger);
    expect(r.ttkSeconds).toBeCloseTo(0.32, 6);
    expect(r.enemyEhp.shield).toBe(0);
    expect(r.enemyEhp.overguard).toBe(0);
  });
});

describe('Reference: Kronen Prime vs Bombard (health + Alloy armor, Grineer)', () => {
  const bombard: EnemyData = { id: 'bombard', name: 'Bombard', faction: 'Grineer', baseLevel: 1, health: 300, shield: 0, armor: 500, armorType: 'Alloy' };
  // 100 Slash + 100 Impact per shot; rate 1/s. Grineer: Impact ×1.5, Slash neutral.
  const intrinsic = makeIntrinsic({ perType: { slash: 100, impact: 100 } });

  it('mitigates by armor (×0.8333) and boosts Impact ×1.5 → 208.33 effective/hit', () => {
    const r = applyTarget(intrinsic, target({ enemyId: 'bombard' }), bombard);
    expect(r.perTypeEffective.slash).toBeCloseTo(83.333, 3); // 100 × 1 × 0.8333
    expect(r.perTypeEffective.impact).toBeCloseTo(125, 3); // 100 × 1.5 × 0.8333
    expect(r.effectiveHitAverage).toBeCloseTo(208.333, 3);
    expect(r.enemyEhp.armor).toBeCloseTo(0.16667, 5);
  });

  it('full armor strip removes mitigation (faster TTK)', () => {
    const withArmor = applyTarget(intrinsic, target({ enemyId: 'bombard' }), bombard);
    const stripped = applyTarget(intrinsic, target({ enemyId: 'bombard', armorStripPct: 1 }), bombard);
    // stripped: 100×1 + 100×1.5 = 250/hit → ttk 300/250 = 1.2 s
    expect(stripped.effectiveHitAverage).toBeCloseTo(250, 6);
    expect(stripped.ttkSeconds).toBeCloseTo(1.2, 6);
    expect(withArmor.ttkSeconds).toBeGreaterThan(stripped.ttkSeconds);
  });
});

describe('min-1-per-type floor', () => {
  it('floors each damage type to ≥1 against heavy armor', () => {
    const weak: EnemyData = { id: 'w', name: 'W', faction: 'Grineer', baseLevel: 1, health: 10, shield: 0, armor: 2700 };
    // 2 Slash + 2 Impact, armorMult 0.1 → slash 0.2, impact 0.3 → both floor to 1.
    const r = applyTarget(makeIntrinsic({ perType: { slash: 2, impact: 2 } }), target({ enemyId: 'w' }), weak);
    expect(r.perTypeEffective.slash).toBe(1);
    expect(r.perTypeEffective.impact).toBe(1);
    expect(r.effectiveHitAverage).toBe(2);
  });
});

describe('shields: face value, Toxin bypass', () => {
  const crewman: EnemyData = { id: 'crewman', name: 'Crewman', faction: 'Corpus', baseLevel: 1, health: 60, shield: 150, armor: 0 };

  it('non-toxin damage depletes shields at face value (no faction modifier on shield)', () => {
    // 100 Impact only. Corpus impact is neutral on health, but shields ignore
    // faction entirely → shield hits = 150/100 = 1.5.
    const r = applyTarget(makeIntrinsic({ perType: { impact: 100 } }), target({ enemyId: 'crewman' }), crewman);
    expect(r.enemyEhp.shield).toBeCloseTo(150, 6); // raw to clear shield
  });

  it('Toxin bypasses the shield and chips health directly', () => {
    // Pure toxin: shield never depletes by it; health falls via bypass.
    const r = applyTarget(makeIntrinsic({ perType: { toxin: 100 } }), target({ enemyId: 'crewman' }), crewman);
    expect(r.enemyEhp.shield).toBe(0); // toxin does not register against shield
    expect(r.ttkSeconds).toBeLessThan(Infinity);
    expect(r.ttkSeconds).toBeCloseTo(60 / 100, 6); // health 60 ÷ 100 toxin/hit
  });
});

// ── Effective layer for the vs-Target view (routeToHealth + effective scalars) ──

const bombard: EnemyData = { id: 'bombard', name: 'Bombard', faction: 'Grineer', baseLevel: 1, health: 1e9, shield: 0, armor: 500, armorType: 'Alloy' };
const charger: EnemyData = { id: 'charger', name: 'Charger', faction: 'Infested', baseLevel: 1, health: 1e9, shield: 0, armor: 0 };

describe('routeToHealth (extracted health-layer routing helper)', () => {
  it('is the single source of truth for effectiveHitAverage (faction × armor × floor)', () => {
    const scaled = scaleEnemy(bombard, { level: 1, steelPath: false, armorStripPct: 0, overguard: false });
    // Grineer: Impact ×1.5, Slash neutral; armorMult 0.8333.
    const routed = routeToHealth({ slash: 100, impact: 100 }, scaled);
    expect(routed.perType.slash).toBeCloseTo(83.333, 3);
    expect(routed.perType.impact).toBeCloseTo(125, 3);
    expect(routed.total).toBeCloseTo(208.333, 3);
    // It is exactly what applyTarget reports as effectiveHitAverage.
    const r = applyTarget(makeIntrinsic({ perType: { slash: 100, impact: 100 } }), target({ enemyId: 'bombard' }), bombard);
    expect(r.effectiveHitAverage).toBeCloseTo(routed.total, 9);
  });
});

describe('effectiveBurstDps (burst twin of effectiveDps)', () => {
  it('preserves the intrinsic burst/sustained ratio', () => {
    const base = makeIntrinsic({ perType: { slash: 100, impact: 100 } });
    const intrinsic = { ...base, burstDps: 500, sustainedDps: 250 }; // ratio 2
    const r = applyTarget(intrinsic, target({ enemyId: 'bombard' }), bombard);
    expect(r.effectiveBurstDps / r.effectiveDps).toBeCloseTo(500 / 250, 9);
    expect(r.effectiveBurstDps).toBeCloseTo(r.effectiveHitAverage * (500 / base.avgHitPerShot), 6);
  });

  it('guards div-by-zero (empty shot → 0 burst/scale)', () => {
    const r = applyTarget(makeIntrinsic({ perType: {} }), target({ enemyId: 'charger' }), charger);
    expect(r.effectiveBurstDps).toBe(0);
    expect(r.effectiveScale).toBe(0);
  });
});

describe('effectiveScale (exact for same-composition mechanics, ADR-0006)', () => {
  it('equals per-type routing — beam per-tick and heavy hit both land on effectiveHitAverage', () => {
    const base = makeIntrinsic({ perType: { slash: 100, impact: 100 } }); // avgHit 200
    const intrinsic = {
      ...base,
      beam: { tickRate: 1, perTickDamage: 200, procsPerSecond: 0, rampStartPct: 0.2, rampSeconds: 0.6 },
      heavyLoop: { sustainedDps: 400, comboConsumed: 5, rebuildHits: 10, loopSeconds: 2, normalHit: 50, heavyHit: 200 },
      followThrough: { factor: 0.5, targetCount: 2, singleTarget: 200, total: 300, perTarget: [200, 100] },
      comboString: { name: 'Slot', stance: 'St', totalDamage: 600, hitCount: 3, averagePerHit: 200, durationSeconds: 1, dps: 600, perHit: [200, 200, 200], forcedProcs: [] },
    };
    const r = applyTarget(intrinsic, target({ enemyId: 'bombard' }), bombard);
    const s = r.effectiveScale;
    expect(s).toBeCloseTo(25 / 24, 9); // effHit 1250/6 ÷ avgHit 200
    // Beam per-tick = effectiveHitAverage directly; heavy hit = avgHit × scale —
    // both equal, proving the exact-scale path equals direct routing.
    expect(r.beam?.perTickDamage).toBeCloseTo(r.effectiveHitAverage, 9);
    expect(r.heavyLoop?.heavyHit).toBeCloseTo(r.effectiveHitAverage, 9);
    expect(r.heavyLoop?.sustainedDps).toBeCloseTo(400 * s, 9);
    expect(r.heavyLoop?.normalHit).toBeCloseTo(50 * s, 9);
    expect(r.followThrough?.total).toBeCloseTo(300 * s, 9);
    expect(r.followThrough?.perTarget[1]).toBeCloseTo(100 * s, 9);
    expect(r.comboString?.dps).toBeCloseTo(600 * s, 9);
    expect(r.comboString?.perHit[0]).toBeCloseTo(200 * s, 9);
  });
});

describe('effective AoE / components routed per-type (composition differs)', () => {
  it('routes a Blast radial and a Slash direct hit by their own type (Infested)', () => {
    const base = makeIntrinsic({ perType: { blast: 100, slash: 100 } });
    const intrinsic = {
      ...base,
      components: [
        { name: 'Direct', role: 'direct' as const, delivery: 'projectile' as const, perType: { slash: 100 }, perPelletAverage: 100 },
        { name: 'Radial', role: 'radial' as const, delivery: 'aoe' as const, perType: { blast: 100 }, perPelletAverage: 100, rimPerPelletAverage: 70, falloff: { start: 0, end: 7, maxReduction: 0.3 } },
      ],
      aoe: { falloffStart: 0, radius: 7, centerAverage: 100, rimAverage: 70, centerPerType: { blast: 100 }, rimPerType: { blast: 70 } },
    };
    const r = applyTarget(intrinsic, target({ enemyId: 'charger' }), charger);
    // Infested: Blast neutral, Slash ×1.5, no armor.
    expect(r.aoe?.centerAverage).toBeCloseTo(100, 6); // blast neutral
    expect(r.aoe?.rimAverage).toBeCloseTo(70, 6);
    expect(r.aoe?.centerPerType.blast).toBeCloseTo(100, 6);
    const direct = r.components?.find((c) => c.role === 'direct');
    const radial = r.components?.find((c) => c.role === 'radial');
    expect(direct?.perPelletAverage).toBeCloseTo(150, 6); // slash ×1.5 — differs from the blast center
    expect(radial?.perPelletAverage).toBeCloseTo(100, 6);
    expect(radial?.rimPerPelletAverage).toBeCloseTo(70, 6); // rim ratio preserved
  });
});
