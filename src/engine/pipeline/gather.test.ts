import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon, loadMods } from '../../data/loaders';
import type { ModData } from '../model/types';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';
import { createWeapon } from '../gear/factory';
import type { Gun } from '../gear/weapon';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';

/**
 * Source-gathering behavior (rank scaling, conditional gating, per-stack scaling,
 * additive bucket summing) observed through `calculateBuild` — a mod at rank r
 * delivers `(r+1)/(maxRank+1)` of its effect, gated effects only count when their
 * condition is active, and per-stack effects scale with (and clamp to) the stack
 * count. Asserted on the headline numbers those rules drive on the Vulkar Wraith.
 */

let gun: Gun;
let modsById: Map<string, ModData>;

beforeAll(async () => {
  gun = createWeapon((await loadWeapon('vulkar-wraith'))!) as Gun;
  modsById = new Map((await loadMods()).map((m) => [m.id, m]));
});

function modAt(id: string, rank: number): ResolvedSource {
  const m = modsById.get(id);
  if (!m) throw new Error(`missing mod ${id}`);
  return { id: m.id, label: m.name, kind: 'mod', rank, maxRank: m.maxRank, effects: m.effects };
}

/** Pre-crit base+elemental subtotal (the base-damage bucket's observable output). */
function baseValue(sources: ResolvedSource[], combat: CombatState = EMPTY_COMBAT_STATE) {
  return calculateBuild({ weapon: gun, sources, combat }).chain.find((s) => s.id === 'base')!.value!;
}
function burst(sources: ResolvedSource[], combat: CombatState = EMPTY_COMBAT_STATE) {
  return calculateBuild({ weapon: gun, sources, combat }).burstDps;
}

describe('rank scaling — a mod gives (rank+1)/(maxRank+1) of its max effect', () => {
  it('an unranked Serration delivers 1/11 of its +165% base damage (+15%)', () => {
    expect(baseValue([modAt('serration', 0)])).toBeCloseTo(273 * (1 + 1.65 / 11), 2);
  });

  it('scales linearly with rank up to the max', () => {
    expect(baseValue([modAt('serration', 5)])).toBeCloseTo(273 * (1 + 1.65 * (6 / 11)), 2);
    expect(baseValue([modAt('serration', 10)])).toBeCloseTo(273 * 2.65, 2);
  });

  it('clamps ranks above the maximum', () => {
    expect(baseValue([modAt('serration', 99)])).toBeCloseTo(baseValue([modAt('serration', 10)]), 6);
  });
});

describe('conditional gating — a gated effect counts only when its condition is active', () => {
  it('Bane of Grineer is inert until the Grineer faction is toggled on', () => {
    const bane = [modAt('bane-of-grineer', modsById.get('bane-of-grineer')!.maxRank)];
    const grineer: CombatState = { ...EMPTY_COMBAT_STATE, conditions: { 'faction:grineer': true } };
    expect(burst(bane)).toBeCloseTo(burst([]), 6); // off → no contribution
    expect(burst(bane, grineer) / burst([], grineer)).toBeCloseTo(1.3, 6); // on → +30%
  });
});

describe('per-stack scaling — a per-stack effect scales with, and clamps to, the stack count', () => {
  // Primary Merciless: +30% direct damage per stack, capped at 12 stacks.
  const merciless: ResolvedSource = {
    id: 'primary-merciless', label: 'Primary Merciless', kind: 'arcane', rank: 0, maxRank: 0,
    effects: [{ bucket: 'directDamage', value: 0.3, perStack: true, maxStacks: 12, condition: 'arcane:primary-merciless' }],
  };
  const withStacks = (n: number): CombatState => ({ ...EMPTY_COMBAT_STATE, stacks: { 'arcane:primary-merciless': n } });

  it('is inert at zero stacks', () => {
    expect(burst([merciless], withStacks(0))).toBeCloseTo(burst([]), 6);
  });

  it('scales by the stack count (8 stacks → +240% direct damage)', () => {
    expect(burst([merciless], withStacks(8)) / burst([])).toBeCloseTo(1 + 0.3 * 8, 6); // ×3.4
  });

  it('clamps to maxStacks (99 → 12 stacks → +360%)', () => {
    expect(burst([merciless], withStacks(99)) / burst([])).toBeCloseTo(1 + 0.3 * 12, 6); // ×4.6
  });
});

describe('additive bucket summing — same-bucket effects add before applying', () => {
  it('two base-damage sources sum into one multiplier', () => {
    const extra: ResolvedSource = {
      id: 'extra-base', label: 'extra', kind: 'mod', rank: 0, maxRank: 0,
      effects: [{ bucket: 'baseDamage', value: 0.35 }],
    };
    // Serration +1.65 and +0.35 → ×(1 + 2.0) = ×3.0 on the base subtotal.
    expect(baseValue([modAt('serration', 10), extra])).toBeCloseTo(273 * 3.0, 2);
  });
});
