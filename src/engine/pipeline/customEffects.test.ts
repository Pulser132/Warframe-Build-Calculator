import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon, loadMods } from '../../data/loaders';
import type { ModData } from '../model/types';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';
import { createWeapon } from '../gear/factory';
import { Melee } from '../gear/melee';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';

/**
 * Stage 3 custom-effect mods (Blood Rush, Weeping Wounds, Condition Overload),
 * exercised through `calculateBuild` on the Kronen Prime Normal attack — each
 * isolated so its combat-state scaling shows up in the headline numbers it drives.
 *
 * The end-to-end reference build (all three together, wiki-verified) lives in
 * `meleeCalc.test.ts`; this file pins one mod's behavior at a time plus the
 * critical invariant that a custom effect's self-scaled output is folded **once**
 * (gather must NOT re-apply rankFactor — ADR 0002).
 *
 * Kronen Prime base crit 0.22, base status 0.34.
 */

let modsById: Map<string, ModData>;
let kronen: Melee;

beforeAll(async () => {
  modsById = new Map((await loadMods()).map((m) => [m.id, m]));
  kronen = createWeapon((await loadWeapon('kronen-prime'))!) as Melee;
});

function mod(id: string, rank?: number): ResolvedSource {
  const m = modsById.get(id);
  if (!m) throw new Error(`missing mod ${id}`);
  return {
    id: m.id,
    label: m.name,
    kind: 'mod',
    rank: rank ?? m.maxRank,
    maxRank: m.maxRank,
    effects: m.effects,
    customEffectId: m.customEffectId,
  };
}

/** Combat state with a raw Combo Count and a unique-status count. */
function cs(count: number, statusCount = 0): CombatState {
  return { ...EMPTY_COMBAT_STATE, stacks: { combo: count, 'status:count': statusCount } };
}

/** Normal-attack result for the given sources/combat. */
function normal(sources: ResolvedSource[], combat: CombatState) {
  return calculateBuild({ weapon: kronen, sources, combat });
}

describe('Blood Rush — crit chance scales on combo tier', () => {
  it('raises crit chance by 0.4 × tier (combo 60 = tier 3 → ×2.2)', () => {
    const r = normal([mod('blood-rush')], cs(60));
    expect(r.critChance).toBeCloseTo(0.22 * 2.2, 4); // 0.22 × (1 + 1.2) = 0.484
  });

  it('contributes nothing below tier 1 (combo < 20)', () => {
    const below = normal([mod('blood-rush')], cs(19));
    const none = normal([], cs(19));
    expect(below.critChance).toBeCloseTo(none.critChance, 6);
    expect(below.critChance).toBeCloseTo(0.22, 6);
  });

  it('scales with mod rank (rank 5/10 at tier 1 → 0.4 × 6/11)', () => {
    const r = normal([mod('blood-rush', 5)], cs(20));
    expect(r.critChance).toBeCloseTo(0.22 * (1 + 0.4 * (6 / 11)), 6);
  });

  it('folds additively with a static crit mod in the same bucket (Blood Rush + True Steel)', () => {
    const r = normal([mod('blood-rush'), mod('true-steel')], cs(60));
    // 0.22 × (1 + 0.8 True Steel + 1.2 Blood Rush) = 0.22 × 3.0 = 0.66.
    expect(r.critChance).toBeCloseTo(0.66, 4);
  });
});

describe('Weeping Wounds — status chance scales on combo tier', () => {
  it('raises per-pellet status chance by 0.4 × tier (combo 60 = tier 3 → ×2.2)', () => {
    const r = normal([mod('weeping-wounds')], cs(60));
    expect(r.statusChancePerPellet).toBeCloseTo(0.34 * 2.2, 4); // 0.748
  });
});

describe('Condition Overload — base damage scales on unique status count', () => {
  it('adds 0.8 × n to the base-damage multiplier (4 statuses → ×4.2)', () => {
    const co = normal([mod('condition-overload')], cs(0, 4));
    const none = normal([mod('condition-overload')], cs(0, 0));
    expect(co.avgHitPerShot / none.avgHitPerShot).toBeCloseTo(4.2, 1); // (1 + 3.2) / 1
  });

  it('caps at 16 unique statuses', () => {
    const at15 = normal([mod('condition-overload')], cs(0, 15));
    const at16 = normal([mod('condition-overload')], cs(0, 16));
    const at99 = normal([mod('condition-overload')], cs(0, 99));
    expect(at99.avgHitPerShot).toBeCloseTo(at16.avgHitPerShot, 4); // clamped
    expect(at16.avgHitPerShot).toBeGreaterThan(at15.avgHitPerShot); // still rising before the cap
  });

  it('does nothing with no statuses', () => {
    const co = normal([mod('condition-overload')], cs(0, 0));
    const none = normal([], cs(0));
    expect(co.avgHitPerShot).toBeCloseTo(none.avgHitPerShot, 6);
  });
});

describe('custom output is self-scaled exactly once (no double rankFactor)', () => {
  it('an unranked Blood Rush yields its own 1/11 scaling, not (1/11)²', () => {
    // tier 2 (combo 40); rank 0 of 10 → rankFactor 1/11 applied once inside the mod.
    const r = normal([mod('blood-rush', 0)], cs(40));
    expect(r.critChance).toBeCloseTo(0.22 * (1 + 0.4 * (1 / 11) * 2), 6);
  });
});
