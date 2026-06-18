import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon, loadMods } from '../../data/loaders';
import type { ModData } from '../model/types';
import type { CombatState } from '../model/build';
import { EMPTY_COMBAT_STATE } from '../model/build';
import { createWeapon } from '../gear/factory';
import type { Gun } from '../gear/weapon';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';

/**
 * Each damage-pipeline stage, isolated by equipping a SINGLE mod on the Vulkar
 * Wraith and asserting the headline field (or labeled chain stage) it drives.
 * These exercise the same hand-verified game math the old per-`*Stage` unit tests
 * pinned, but through the public `calculateBuild` interface — so they survive any
 * internal reshuffle of the stage functions. (Full-slice integration lives in
 * `calculate.test.ts`; this file covers one mechanic at a time.)
 *
 * Vulkar Wraith base stats the expected numbers derive from (see gear/data):
 *   base damage 273 (Impact 245.7 / Puncture 27.3), crit 0.20 ×2.0, status 0.25,
 *   multishot 1, fire rate 2.0.
 */

let gun: Gun;
let modsById: Map<string, ModData>;

beforeAll(async () => {
  gun = createWeapon((await loadWeapon('vulkar-wraith'))!) as Gun;
  modsById = new Map((await loadMods()).map((m) => [m.id, m]));
});

function modSource(id: string): ResolvedSource {
  const m = modsById.get(id);
  if (!m) throw new Error(`missing mod ${id}`);
  return { id: m.id, label: m.name, kind: 'mod', rank: m.maxRank, maxRank: m.maxRank, effects: m.effects };
}

function calc(modIds: string[], combat: CombatState = EMPTY_COMBAT_STATE) {
  return calculateBuild({ weapon: gun, sources: modIds.map(modSource), combat });
}

const stage = (r: ReturnType<typeof calc>, id: string) => r.chain.find((s) => s.id === id)!;

describe('base + elemental stage', () => {
  it('a base-damage mod multiplies the whole subtotal (Serration → ×2.65 pre-crit)', () => {
    const base = stage(calc(['serration']), 'base');
    // 273 × (1 + 1.65) = 723.45; Impact 245.7×2.65, Puncture 27.3×2.65.
    expect(base.value).toBeCloseTo(723.45, 2);
    expect(base.perType!.impact).toBeCloseTo(651.105, 2);
    expect(base.perType!.puncture).toBeCloseTo(72.345, 2);
  });

  it('an elemental mod adds damage as a fraction of base total (Stormbringer +90% Electric)', () => {
    const base = stage(calc(['stormbringer']), 'base');
    // Electric = 0.90 × 273 = 245.7 added on top of physical; no base-damage mult.
    expect(base.perType!.electricity).toBeCloseTo(245.7, 2);
    expect(base.value).toBeCloseTo(518.7, 2); // 245.7 + 27.3 + 245.7
  });
});

describe('quantization stage', () => {
  it('rounds each type to the nearest base/32 step (Vulkar + Stormbringer → 520)', () => {
    // quantum = 273/32 = 8.53125 → Impact 29×, Puncture 3×, Electric 29× steps.
    const quant = stage(calc(['stormbringer']), 'quantize');
    expect(quant.perType!.impact).toBeCloseTo(247.40625, 4);
    expect(quant.perType!.puncture).toBeCloseTo(25.59375, 4);
    expect(quant.perType!.electricity).toBeCloseTo(247.40625, 4);
    expect(quant.value).toBeCloseTo(520.40625, 4); // reads as 520 in the Arsenal
  });
});

describe('multishot stage', () => {
  it('scales the base pellet count (Split Chamber +90% → 1.9)', () => {
    expect(calc(['split-chamber']).multishot).toBeCloseTo(1.9, 6);
  });
});

describe('critical stage', () => {
  it('crit-chance and crit-damage mods feed the average crit multiplier', () => {
    const r = calc(['point-strike', 'vital-sense']);
    expect(r.critChance).toBeCloseTo(0.5, 6); // 0.20 × (1 + 1.5)
    expect(r.critMultiplier).toBeCloseTo(4.4, 6); // 2.0 × (1 + 1.2)
    expect(r.avgCritMultiplier).toBeCloseTo(2.7, 6); // 1 + 0.5 × (4.4 − 1)
  });

  it('uses the expectation formula for crit chance over 100% (orange crits)', () => {
    // Synthetic +800% crit chance → 0.20 × 9 = 1.80 (180%); base crit mult 2.0.
    const superCrit: ResolvedSource = {
      id: 'x', label: 'x', kind: 'mod', rank: 0, maxRank: 0,
      effects: [{ bucket: 'critChance', value: 8 }],
    };
    const r = calculateBuild({ weapon: gun, sources: [superCrit], combat: EMPTY_COMBAT_STATE });
    expect(r.critChance).toBeCloseTo(1.8, 6);
    expect(r.avgCritMultiplier).toBeCloseTo(1 + 1.8 * (2 - 1), 6); // 2.80
  });
});

describe('status stage', () => {
  it('raises per-pellet status chance and procs per shot (Rifle Aptitude +90%)', () => {
    const r = calc(['rifle-aptitude']);
    expect(r.statusChancePerPellet).toBeCloseTo(0.475, 6); // 0.25 × (1 + 0.9)
    expect(r.avgProcsPerShot).toBeCloseTo(0.475, 6); // × 1 pellet
  });
});

describe('fire-rate stage', () => {
  it('scales fire rate additively (Speed Trigger +60% → 3.2/s)', () => {
    expect(calc(['speed-trigger']).fireRate).toBeCloseTo(3.2, 3); // 2.0 × 1.6
  });
});

describe('conditional-multiplier stage', () => {
  it('applies no multiplier when no conditional is active', () => {
    // Bane equipped but its faction toggle is OFF → identical to no Bane.
    expect(calc(['bane-of-grineer']).burstDps).toBeCloseTo(calc([]).burstDps, 6);
  });

  it('adds within the faction bucket then multiplies (Bane +30% + Roar +50% = ×1.8)', () => {
    const roar: ResolvedSource = {
      id: 'roar', label: 'Roar', kind: 'buff', rank: 0, maxRank: 0,
      effects: [{ bucket: 'faction', value: 0.5 }],
    };
    const grineer: CombatState = { ...EMPTY_COMBAT_STATE, conditions: { 'faction:grineer': true } };
    const off = calculateBuild({ weapon: gun, sources: [], combat: EMPTY_COMBAT_STATE });
    const on = calculateBuild({
      weapon: gun,
      sources: [modSource('bane-of-grineer'), roar],
      combat: grineer,
    });
    expect(on.burstDps / off.burstDps).toBeCloseTo(1.8, 6);
  });
});
