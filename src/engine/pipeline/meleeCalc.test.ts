/**
 * Stage 3 end-to-end melee reference builds, anchored to hand-verified wiki/@wfcd
 * numbers (docs/warframe/weapons/{kronen,gram}-prime.md, mechanics/*).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon, loadMods } from '../../data/loaders';
import type { ModData } from '../model/types';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';
import { createWeapon } from '../gear/factory';
import { Melee } from '../gear/melee';
import { calculateBuild } from './calculate';
import { followThroughTotal } from './melee';
import type { ResolvedSource } from './gather';

let modsById: Map<string, ModData>;

beforeAll(async () => {
  modsById = new Map((await loadMods()).map((m) => [m.id, m]));
});

async function meleeFor(id: string): Promise<Melee> {
  return createWeapon((await loadWeapon(id))!) as Melee;
}
function mod(id: string): ResolvedSource {
  const m = modsById.get(id);
  if (!m) throw new Error(`missing mod ${id}`);
  return {
    id: m.id,
    label: m.name,
    kind: 'mod',
    rank: m.maxRank,
    maxRank: m.maxRank,
    effects: m.effects,
    customEffectId: m.customEffectId,
  };
}
/** Combat state with a given raw Combo Count. */
function cs(count: number, statusCount = 0): CombatState {
  return { ...EMPTY_COMBAT_STATE, stacks: { combo: count, 'status:count': statusCount } };
}

describe('Melee gear class', () => {
  it('Kronen Prime is a Melee with the right metadata + slot layout', async () => {
    const k = await meleeFor('kronen-prime');
    expect(k.kind).toBe('melee');
    expect(k.hasSlam).toBe(true);
    expect(k.comboDuration).toBe(5);
    expect(k.range).toBeCloseTo(2.5, 4);
    expect(k.followThrough).toBeCloseTo(0.6, 4);
    expect(k.stancePolarity).toBe('madurai');
    expect(k.slotLayout[0]).toBe('stance');
    expect(k.modeNames).toEqual([
      'Normal Attack',
      'Heavy Attack',
      'Slam Attack',
      'Heavy Slam Attack',
    ]);
  });
});

describe('Normal attack (Kronen Prime)', () => {
  it('no combo multiplier; sustained = burst (no reload)', async () => {
    const k = await meleeFor('kronen-prime');
    const r = calculateBuild({ weapon: k, sources: [], combat: cs(0) });
    expect(r.trigger).toBe('melee');
    expect(r.comboMultiplier).toBeUndefined();
    expect(r.sustainedDps).toBeCloseTo(r.burstDps, 6);
  });

  it('uses attack-speed (fire-rate) mods', async () => {
    const k = await meleeFor('kronen-prime');
    const base = calculateBuild({ weapon: k, sources: [], combat: cs(0) });
    const fast = calculateBuild({ weapon: k, sources: [mod('fury')], combat: cs(0) });
    expect(fast.fireRate).toBeCloseTo(base.fireRate * 1.2, 4); // Fury +20% attack speed
  });
});

describe('Heavy attack (Kronen Prime)', () => {
  it('applies Combo Multiplier (heavy only) and burst rate = 1/windUp', async () => {
    const k = await meleeFor('kronen-prime');
    const heavy = k.fireMode('Heavy Attack');
    const r0 = calculateBuild({ weapon: k, sources: [], combat: cs(0), mode: heavy });
    const r3 = calculateBuild({ weapon: k, sources: [], combat: cs(60), mode: heavy }); // 4x
    expect(r0.comboMultiplier).toBe(1);
    expect(r3.comboMultiplier).toBe(4);
    expect(r3.avgHitPerShot).toBeCloseTo(r0.avgHitPerShot * 4, 4);
    expect(r0.fireRate).toBeCloseTo(1 / 0.69999999, 4); // 1/windUp
  });

  it('wind-up is NOT reduced by attack speed (Fury)', async () => {
    const k = await meleeFor('kronen-prime');
    const heavy = k.fireMode('Heavy Attack');
    const r = calculateBuild({ weapon: k, sources: [mod('fury')], combat: cs(0), mode: heavy });
    expect(r.fireRate).toBeCloseTo(1 / 0.69999999, 4);
  });

  it('heavy per-hit = normal × heavyMultiplier (Kronen ×4) at combo 0', async () => {
    const k = await meleeFor('kronen-prime');
    const normal = calculateBuild({ weapon: k, sources: [], combat: cs(0) });
    const heavy = calculateBuild({
      weapon: k,
      sources: [],
      combat: cs(0),
      mode: k.fireMode('Heavy Attack'),
    });
    expect(heavy.avgHitPerShot).toBeCloseTo(normal.avgHitPerShot * 4, 2);
  });
});

describe('Slam attacks (Kronen Prime)', () => {
  it('Slam has direct + radial(lifted) components and AoE reporting; no combo mult', async () => {
    const k = await meleeFor('kronen-prime');
    const r = calculateBuild({ weapon: k, sources: [], combat: cs(0), mode: k.fireMode('Slam Attack') });
    expect(r.trigger).toBe('slam');
    expect(r.comboMultiplier).toBeUndefined();
    const radial = r.components?.find((c) => c.role === 'radial');
    expect(radial?.forcedProcs).toContain('lifted');
    expect(r.aoe).toBeDefined();
    expect(r.aoe?.radius).toBeCloseTo(8, 4);
  });

  it('Heavy Slam applies the Combo Multiplier', async () => {
    const k = await meleeFor('kronen-prime');
    const hs = k.fireMode('Heavy Slam Attack');
    const hs0 = calculateBuild({ weapon: k, sources: [], combat: cs(0), mode: hs });
    const hs3 = calculateBuild({ weapon: k, sources: [], combat: cs(60), mode: hs });
    expect(hs0.comboMultiplier).toBe(1);
    expect(hs3.comboMultiplier).toBe(4);
    expect(hs3.avgHitPerShot).toBeCloseTo(hs0.avgHitPerShot * 4, 4);
  });
});

describe('Follow-through extra (Kronen Prime)', () => {
  it('emits a multi-target total when targetCount > 1; reach is metadata', async () => {
    const k = await meleeFor('kronen-prime');
    const r = calculateBuild({ weapon: k, sources: [], combat: cs(0), targetCount: 3 });
    expect(r.followThrough?.targetCount).toBe(3);
    expect(r.followThrough?.factor).toBeCloseTo(0.6, 4);
    expect(r.followThrough?.total).toBeCloseTo(followThroughTotal(r.avgHitPerShot, 0.6, 3), 4);
    expect(r.reach).toBeCloseTo(2.5, 4);
  });

  it('no follow-through extra for a single target', async () => {
    const k = await meleeFor('kronen-prime');
    const r = calculateBuild({ weapon: k, sources: [], combat: cs(0) });
    expect(r.followThrough).toBeUndefined();
  });
});

describe('Combo string (Kronen Prime / Gemini Cross)', () => {
  it('computes a per-hit breakdown on the Normal mode', async () => {
    const k = await meleeFor('kronen-prime');
    const combo = k.data.comboStrings?.find((c) => c.name === 'Vagrant Blight');
    expect(combo).toBeDefined();
    const normal = k.fireMode('Normal Attack');
    const r = calculateBuild({
      weapon: k,
      sources: [],
      combat: cs(0),
      mode: { ...normal, comboString: combo },
    });
    expect(r.comboString?.name).toBe('Vagrant Blight');
    expect(r.comboString?.stance).toBe('Gemini Cross');
    expect(r.comboString!.hitCount).toBeGreaterThan(0);
    expect(r.comboString?.forcedProcs).toContain('slash');
  });
});

describe('Kronen Prime reference build (crit/status hybrid)', () => {
  it('Blood Rush + Weeping Wounds + Condition Overload + combo tier (wiki-verified)', async () => {
    const k = await meleeFor('kronen-prime');
    const sources = [
      mod('primed-pressure-point'),
      mod('true-steel'),
      mod('organ-shatter'),
      mod('melee-prowess'),
      mod('blood-rush'),
      mod('weeping-wounds'),
      mod('condition-overload'),
    ];
    const combat = cs(60, 4); // tier 3 (4x), 4 unique statuses
    const mode = k.fireMode('Normal Attack');
    const r = calculateBuild({ weapon: k, sources, combat, mode });

    // Crit: 0.22 × (1 + 0.8 True Steel + 1.2 Blood Rush[tier 3]) = 0.22 × 3.0 = 0.66.
    expect(r.critChance).toBeCloseTo(0.66, 4);
    // Status: 0.34 × (1 + 0.6 Melee Prowess + 1.2 Weeping Wounds) = 0.34 × 2.8 = 0.952.
    expect(r.statusChancePerPellet).toBeCloseTo(0.952, 4);

    // Condition Overload (+0.8 × 4 = +3.2 in the base-damage bucket, additive with
    // Primed Pressure Point +1.65): base mult 5.85 vs 2.65 without CO.
    const noCO = calculateBuild({
      weapon: k,
      sources: sources.filter((s) => s.id !== 'condition-overload'),
      combat,
      mode,
    });
    expect(r.avgHitPerShot / noCO.avgHitPerShot).toBeCloseTo(5.85 / 2.65, 1);
  });
});

describe('Gram Prime reference build (heavy/slam)', () => {
  it('heavy multiplier ×6; combo multiplier applies to heavy', async () => {
    const g = await meleeFor('gram-prime');
    expect(g.heavyMultiplier).toBe(6);
    const heavy = g.fireMode('Heavy Attack');
    const r0 = calculateBuild({ weapon: g, sources: [], combat: cs(0), mode: heavy });
    const rMax = calculateBuild({ weapon: g, sources: [], combat: cs(220), mode: heavy }); // 12x
    expect(rMax.comboMultiplier).toBe(12);
    expect(rMax.avgHitPerShot).toBeCloseTo(r0.avgHitPerShot * 12, 4);

    const normal = calculateBuild({ weapon: g, sources: [], combat: cs(0) });
    expect(r0.avgHitPerShot).toBeCloseTo(normal.avgHitPerShot * 6, 2);
  });

  it('Heavy Slam radial is Blast with forced Lifted', async () => {
    const g = await meleeFor('gram-prime');
    const r = calculateBuild({
      weapon: g,
      sources: [],
      combat: cs(60),
      mode: g.fireMode('Heavy Slam Attack'),
    });
    const radial = r.components?.find((c) => c.role === 'radial');
    expect(radial?.forcedProcs).toContain('lifted');
    expect(radial?.perType.blast).toBeGreaterThan(0);
  });
});
