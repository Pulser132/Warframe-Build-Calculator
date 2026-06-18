import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';
import { createWeapon } from '../gear/factory';
import type { Gun } from '../gear/weapon';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';

/**
 * Data-driven multiplier buckets (ADR 0005 / Stage 5). Stacking semantics are
 * expressed purely by **which bucket id** an effect names: same id ⇒ members add
 * within the bucket; different id ⇒ an independent multiplier. These are the
 * reference cases that pin both behaviours and validate that a brand-new
 * multiplier category (Eclipse) needs only a bucket declaration + the entry —
 * no engine change.
 *
 * Eclipse value (+100% at 100% Strength, own independent multiplier, no
 * damage-side cap) and Galvanized Diffusion (+110% base, +30%/stack ×4 on kill)
 * are wiki-sourced — docs/warframe/abilities/eclipse.md,
 * docs/warframe/mods/galvanized-diffusion.md.
 */

let gun: Gun;
let secondary: Gun;

beforeAll(async () => {
  gun = createWeapon((await loadWeapon('vulkar-wraith'))!) as Gun;
  secondary = createWeapon((await loadWeapon('lex'))!) as Gun;
});

function burst(weapon: Gun, sources: ResolvedSource[], combat: CombatState = EMPTY_COMBAT_STATE) {
  return calculateBuild({ weapon, sources, combat }).burstDps;
}

const src = (id: string, effects: ResolvedSource['effects']): ResolvedSource => ({
  id,
  label: id,
  kind: 'buff',
  rank: 0,
  maxRank: 0,
  effects,
});

describe('same bucket id ⇒ members add within the bucket', () => {
  it('Roar (+50%) + Bane (+30%) both feed faction → ×1.8, not ×1.3 × ×1.5', () => {
    const grineer: CombatState = { ...EMPTY_COMBAT_STATE, conditions: { 'faction:grineer': true } };
    const sources = [
      src('roar', [{ multiplier: 'faction', value: 0.5 }]),
      src('bane', [{ multiplier: 'faction', value: 0.3, condition: 'faction:grineer' }]),
    ];
    expect(burst(gun, sources, grineer) / burst(gun, [])).toBeCloseTo(1.8, 6);
  });
});

describe('different bucket id ⇒ an independent multiplier (Eclipse)', () => {
  it('Eclipse (+100%, eclipse bucket) multiplies independently of faction (Bane +30%)', () => {
    const grineer: CombatState = { ...EMPTY_COMBAT_STATE, conditions: { 'faction:grineer': true } };
    const sources = [
      src('bane', [{ multiplier: 'faction', value: 0.3, condition: 'faction:grineer' }]),
      src('eclipse', [{ multiplier: 'eclipse', value: 1.0 }]),
    ];
    // Independent: ×1.3 × ×2.0 = ×2.6 (additive-in-one-bucket would be ×2.3).
    expect(burst(gun, sources, grineer) / burst(gun, [])).toBeCloseTo(2.6, 6);
  });

  it('Eclipse alone is exactly its own ×(1 + magnitude)', () => {
    const sources = [src('eclipse', [{ multiplier: 'eclipse', value: 1.0 }])];
    expect(burst(gun, sources) / burst(gun, [])).toBeCloseTo(2.0, 6);
  });
});

describe('Galvanized Diffusion → per-stack into the multishot bucket (secondary)', () => {
  // +110% base multishot, +30% per on-kill stack up to 4. On a base-multishot-1
  // pistol (Lex): pellets = 1 × (1 + 1.1 + 0.3·stacks); burst scales with pellets.
  const galv: ResolvedSource = {
    id: 'galvanized-diffusion',
    label: 'Galvanized Diffusion',
    kind: 'mod',
    rank: 0,
    maxRank: 0,
    effects: [
      { bucket: 'multishot', value: 1.1 },
      { bucket: 'multishot', value: 0.3, perStack: true, maxStacks: 4, condition: 'mod:galvanized-diffusion' },
    ],
  };
  const stacks = (n: number): CombatState => ({
    ...EMPTY_COMBAT_STATE,
    stacks: { 'mod:galvanized-diffusion': n },
  });

  it('base +110% multishot with no kills → ×2.1 pellets/DPS', () => {
    expect(burst(secondary, [galv], stacks(0)) / burst(secondary, [])).toBeCloseTo(2.1, 6);
  });

  it('4 on-kill stacks add +120% on top → ×3.3', () => {
    expect(burst(secondary, [galv], stacks(4)) / burst(secondary, [])).toBeCloseTo(3.3, 6);
  });

  it('clamps to maxStacks (99 → 4 stacks)', () => {
    expect(burst(secondary, [galv], stacks(99))).toBeCloseTo(burst(secondary, [galv], stacks(4)), 6);
  });
});
