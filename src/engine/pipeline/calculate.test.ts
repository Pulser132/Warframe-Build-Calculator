import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon, loadMods } from '../../data/loaders';
import type { ModData } from '../model/types';
import type { CombatState } from '../model/build';
import { EMPTY_COMBAT_STATE } from '../model/build';
import { createWeapon } from '../gear/factory';
import type { Gun } from '../gear/weapon';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';

/** The 9 damage-relevant slice mods (matches docs/warframe/mechanics/damage.md). */
const SLICE_MOD_IDS = [
  'serration',
  'split-chamber',
  'point-strike',
  'vital-sense',
  'rifle-aptitude',
  'infected-clip',
  'stormbringer',
  'speed-trigger',
  'bane-of-grineer',
];

let gun: Gun;
let modsById: Map<string, ModData>;

beforeAll(async () => {
  const data = await loadWeapon('braton-prime');
  gun = createWeapon(data!) as Gun;
  modsById = new Map((await loadMods()).map((m) => [m.id, m]));
});

function sourceFromMod(id: string, rank?: number): ResolvedSource {
  const m = modsById.get(id);
  if (!m) throw new Error(`missing mod ${id}`);
  return {
    id: m.id,
    label: m.name,
    kind: 'mod',
    rank: rank ?? m.maxRank,
    maxRank: m.maxRank,
    effects: m.effects,
  };
}

function sliceSources(): ResolvedSource[] {
  return SLICE_MOD_IDS.map((id) => sourceFromMod(id));
}

describe('calculateBuild — Braton Prime slice (hand-verified vs wiki)', () => {
  it('computes the intermediate stats correctly', () => {
    const r = calculateBuild({ weapon: gun, sources: sliceSources(), combat: EMPTY_COMBAT_STATE });
    expect(r.multishot).toBeCloseTo(1.9, 4);
    expect(r.critChance).toBeCloseTo(0.3, 4);
    expect(r.critMultiplier).toBeCloseTo(4.4, 4);
    expect(r.avgCritMultiplier).toBeCloseTo(2.02, 4);
    expect(r.statusChancePerPellet).toBeCloseTo(0.494, 4);
    expect(r.avgProcsPerShot).toBeCloseTo(0.9386, 3);
    expect(r.fireRate).toBeCloseTo(15.3333, 3);
    // Pre-crit subtotal lives in the first chain stage.
    expect(r.chain[0].value).toBeCloseTo(259.7, 1);
    expect(r.perType.corrosive).toBeDefined();
  });

  it('matches headline DPS with the faction conditional OFF', () => {
    const r = calculateBuild({ weapon: gun, sources: sliceSources(), combat: EMPTY_COMBAT_STATE });
    expect(r.avgHitPerShot).toBeCloseTo(996.7, 0);
    expect(r.burstDps).toBeCloseTo(15283, -1); // within ~10
    expect(r.sustainedDps).toBeCloseTo(10617, -1);
  });

  it('applies the Bane faction multiplier when toggled ON', () => {
    const grineer: CombatState = { ...EMPTY_COMBAT_STATE, conditions: { 'faction:grineer': true } };
    const off = calculateBuild({ weapon: gun, sources: sliceSources(), combat: EMPTY_COMBAT_STATE });
    const on = calculateBuild({ weapon: gun, sources: sliceSources(), combat: grineer });
    expect(on.burstDps / off.burstDps).toBeCloseTo(1.3, 3); // +30% vs Grineer
    expect(on.burstDps).toBeCloseTo(19868, -1);
  });

  it('renders a labeled pipeline chain', () => {
    const r = calculateBuild({ weapon: gun, sources: sliceSources(), combat: EMPTY_COMBAT_STATE });
    expect(r.chain.map((s) => s.id)).toEqual([
      'base',
      'multishot',
      'crit',
      'status',
      'fireRate',
      'conditional',
      'dps',
    ]);
    for (const s of r.chain) expect(s.label.length).toBeGreaterThan(0);
  });
});

describe('calculateBuild — edge cases', () => {
  it('an unmodded weapon uses pure base stats', () => {
    const r = calculateBuild({ weapon: gun, sources: [], combat: EMPTY_COMBAT_STATE });
    expect(r.multishot).toBe(1);
    expect(r.avgCritMultiplier).toBeCloseTo(1.12, 4); // 1 + 0.12×(2−1)
    expect(r.perPelletAverage).toBeCloseTo(35 * 1.12, 2);
    expect(r.burstDps).toBeCloseTo(35 * 1.12 * 9.583334, 0);
  });

  it('handles crit chance over 100% (orange crits) via the average formula', () => {
    const superCrit: ResolvedSource = {
      id: 'x',
      label: 'x',
      kind: 'mod',
      rank: 0,
      maxRank: 0,
      effects: [{ bucket: 'critChance', value: 8 }], // 0.12 × 9 = 1.08 → 108%
    };
    const r = calculateBuild({ weapon: gun, sources: [superCrit], combat: EMPTY_COMBAT_STATE });
    expect(r.critChance).toBeCloseTo(1.08, 4);
    expect(r.avgCritMultiplier).toBeCloseTo(1 + 1.08 * (2 - 1), 4); // 2.08
  });

  it('combines two elements into Corrosive and excludes the raw elements', () => {
    const sources = [sourceFromMod('infected-clip'), sourceFromMod('stormbringer')];
    const r = calculateBuild({ weapon: gun, sources, combat: EMPTY_COMBAT_STATE });
    expect(r.perType.corrosive).toBeDefined();
    expect(r.perType.toxin).toBeUndefined();
    expect(r.perType.electricity).toBeUndefined();
  });
});
