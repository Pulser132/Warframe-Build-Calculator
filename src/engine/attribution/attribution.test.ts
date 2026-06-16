import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon, loadMods } from '../../data/loaders';
import type { ModData } from '../model/types';
import type { CombatState } from '../model/build';
import { EMPTY_COMBAT_STATE } from '../model/build';
import { createWeapon } from '../gear/factory';
import type { Gun } from '../gear/weapon';
import { calculateBuild } from '../pipeline/calculate';
import type { ResolvedSource } from '../pipeline/gather';
import { attributeBuild, leaveOneOut, createMemoizedCalc } from './index';

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
  gun = createWeapon((await loadWeapon('braton-prime'))!) as Gun;
  modsById = new Map((await loadMods()).map((m) => [m.id, m]));
});

function sources(ids: string[]): ResolvedSource[] {
  return ids.map((id) => {
    const m = modsById.get(id)!;
    return { id: m.id, label: m.name, kind: 'mod', rank: m.maxRank, maxRank: m.maxRank, effects: m.effects };
  });
}

describe('leaveOneOut attribution', () => {
  it('returns one contribution per equipped source, sorted by DPS delta', () => {
    const contributions = attributeBuild({
      weapon: gun,
      sources: sources(SLICE_MOD_IDS),
      combat: EMPTY_COMBAT_STATE,
    });
    expect(contributions).toHaveLength(SLICE_MOD_IDS.length);
    // Sorted descending.
    for (let i = 1; i < contributions.length; i++) {
      expect(contributions[i - 1].dpsDelta).toBeGreaterThanOrEqual(contributions[i].dpsDelta);
    }
    // Every source accounted for.
    expect(new Set(contributions.map((c) => c.sourceId))).toEqual(new Set(SLICE_MOD_IDS));
  });

  it("each contribution equals total − total-without (leave-one-out definition)", () => {
    const all = sources(SLICE_MOD_IDS);
    const total = calculateBuild({ weapon: gun, sources: all, combat: EMPTY_COMBAT_STATE }).burstDps;
    const contributions = leaveOneOut.attribute(
      { weapon: gun, sources: all, combat: EMPTY_COMBAT_STATE },
      createMemoizedCalc(),
    );
    for (const c of contributions) {
      const without = all.filter((s) => s.id !== c.sourceId);
      const withoutDps = calculateBuild({ weapon: gun, sources: without, combat: EMPTY_COMBAT_STATE }).burstDps;
      expect(c.dpsDelta).toBeCloseTo(total - withoutDps, 3);
      expect(c.fraction).toBeCloseTo(c.dpsDelta / total, 6);
    }
  });

  it('does not require contributions to sum to 100% (multipliers interact)', () => {
    const contributions = attributeBuild({
      weapon: gun,
      sources: sources(SLICE_MOD_IDS),
      combat: EMPTY_COMBAT_STATE,
    });
    const sum = contributions.reduce((acc, c) => acc + c.fraction, 0);
    // Crit + base damage + multishot all amplify each other → sum exceeds 1.
    expect(sum).toBeGreaterThan(1);
  });

  it('toggling the Bane conditional changes its attribution', () => {
    const ids = SLICE_MOD_IDS;
    const off = attributeBuild({ weapon: gun, sources: sources(ids), combat: EMPTY_COMBAT_STATE });
    const grineer: CombatState = { ...EMPTY_COMBAT_STATE, conditions: { 'faction:grineer': true } };
    const on = attributeBuild({ weapon: gun, sources: sources(ids), combat: grineer });

    const baneOff = off.find((c) => c.sourceId === 'bane-of-grineer')!;
    const baneOn = on.find((c) => c.sourceId === 'bane-of-grineer')!;
    // With the faction off, Bane contributes nothing; on, it's a large chunk.
    expect(baneOff.dpsDelta).toBeCloseTo(0, 3);
    expect(baneOn.dpsDelta).toBeGreaterThan(1000);
  });
});

describe('createMemoizedCalc', () => {
  it('returns identical results to calculateBuild and caches by signature', () => {
    const calc = createMemoizedCalc();
    const input = { weapon: gun, sources: sources(SLICE_MOD_IDS), combat: EMPTY_COMBAT_STATE };
    const a = calc(input);
    const b = calc(input);
    expect(a).toBe(b); // same cached object
    expect(a.burstDps).toBeCloseTo(calculateBuild(input).burstDps, 6);
  });
});
