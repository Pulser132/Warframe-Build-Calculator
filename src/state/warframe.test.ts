import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadDataset, type Dataset } from '../data/loaders';
import { useBuildStore } from './store';
import { computeResult, resolveFrameStats } from './resolve';
import { gearModGroup, modMatchesGroup, arcaneMatchesGroup } from './modCompat';

let dataset: Dataset;

beforeAll(async () => {
  dataset = await loadDataset();
});

beforeEach(() => {
  useBuildStore.getState().initFromDataset(dataset);
});

const store = () => useBuildStore.getState();
const result = () => computeResult(store().build, store().combat, dataset);
const modById = (id: string) => dataset.mods.find((m) => m.id === id)!;
const arcaneById = (id: string) => dataset.arcanes.find((a) => a.id === id)!;

describe('mod compatibility — gear-type aware (ADR 0003 / closing the leak)', () => {
  it('frame mods fit the warframe group, not weapon groups', () => {
    expect(modMatchesGroup(modById('intensify'), 'warframe')).toBe(true);
    expect(modMatchesGroup(modById('intensify'), 'rifle')).toBe(false);
    expect(modMatchesGroup(modById('vitality'), 'warframe')).toBe(true);
    expect(modMatchesGroup(modById('vitality'), 'pistol')).toBe(false);
  });

  it('the aura is Warframe-only (no longer matches every group)', () => {
    expect(modMatchesGroup(modById('corrosive-projection'), 'warframe')).toBe(true);
    expect(modMatchesGroup(modById('corrosive-projection'), 'rifle')).toBe(false);
  });

  it('weapon mods do not fit the warframe group', () => {
    expect(modMatchesGroup(modById('serration'), 'warframe')).toBe(false);
    expect(modMatchesGroup(modById('serration'), 'rifle')).toBe(true);
  });

  it('arcanes are gear-type aware (frame vs weapon)', () => {
    expect(arcaneMatchesGroup(arcaneById('molt-augmented'), 'warframe')).toBe(true);
    expect(arcaneMatchesGroup(arcaneById('molt-augmented'), 'rifle')).toBe(false);
    expect(arcaneMatchesGroup(arcaneById('primary-merciless'), 'rifle')).toBe(true);
    expect(arcaneMatchesGroup(arcaneById('primary-merciless'), 'warframe')).toBe(false);
  });

  it('gearModGroup distinguishes the warframe compartment', () => {
    expect(gearModGroup({ category: 'Warframe' })).toBe('warframe');
  });
});

describe('Warframe compartment — store mutations + frame resolver', () => {
  function equipFrameMod(slotIndex: number, id: string) {
    store().setActiveCompartment('warframe');
    store().assignMod(slotIndex, id);
  }

  it('rejects a weapon mod on the frame and a frame mod on the weapon', () => {
    // Serration cannot go on the frame.
    equipFrameMod(2, 'serration');
    expect(store().build.warframe!.slots[2].itemId).toBeNull();
    // Intensify cannot go on the weapon.
    store().setActiveCompartment('weapon');
    store().assignMod(1, 'intensify');
    expect(store().build.weapon.slots[1].itemId).toBeNull();
  });

  it('reference build (Rhino Prime, Umbral-inclusive) resolves the wiki numbers', () => {
    // Strength stack: Umbral Intensify(+77% @3-set) + Intensify(+30%) + Power Drift(+15%)
    //   + Molt Augmented(+0.24%/stack, max 250 = +60%).
    equipFrameMod(0, 'corrosive-projection'); // aura
    equipFrameMod(1, 'power-drift'); // exilus, +15% strength
    equipFrameMod(2, 'umbral-intensify');
    equipFrameMod(3, 'umbral-vitality');
    equipFrameMod(4, 'umbral-fiber');
    equipFrameMod(5, 'intensify');
    equipFrameMod(10, 'molt-augmented'); // arcane, per-stack strength

    // Molt Augmented at 0 stacks: 77 + 30 + 15 = +122% → 2.22× strength.
    const base = resolveFrameStats(store().build.warframe, dataset, store().combat)!;
    expect(base.abilityStrength).toBeCloseTo(2.22, 6);
    expect(base.emittedBuffs.roar).toBeCloseTo(1.11, 6); // 0.5 × 2.22

    // Max 250 stacks adds +60% → 2.82× strength.
    store().setStacks('arcane:molt-augmented', 250);
    const stats = resolveFrameStats(store().build.warframe, dataset, store().combat)!;
    expect(stats.abilityStrength).toBeCloseTo(2.82, 6);
    expect(stats.health).toBeCloseTo(756, 3); // Umbral Vitality 3-set: 270 × 2.80
    expect(stats.armor).toBeCloseTo(812, 3); // Umbral Fiber 3-set: 290 × 2.80
    expect(stats.abilityEfficiency).toBe(1); // unchanged
    expect(stats.emittedBuffs.roar).toBeCloseTo(1.41, 6); // 0.5 × 2.82

    // EHP with 812 armor: DR 812/1112; healthEhp 756×(1+812/300); + 455 shield.
    expect(stats.ehp.total).toBeCloseTo(756 * (1 + 812 / 300) + 455, 2);
  });

  it('Molt Augmented stacks scale Ability Strength through combat state', () => {
    store().setActiveCompartment('warframe');
    store().assignMod(10, 'molt-augmented');
    const at0 = resolveFrameStats(store().build.warframe, dataset, store().combat)!;
    expect(at0.abilityStrength).toBeCloseTo(1.0, 6); // 0 stacks → no bonus

    store().setStacks('arcane:molt-augmented', 125); // half stacks → +30%
    const half = resolveFrameStats(store().build.warframe, dataset, store().combat)!;
    expect(half.abilityStrength).toBeCloseTo(1.3, 6);

    store().setStacks('arcane:molt-augmented', 999); // clamps to 250 → +60%
    const max = resolveFrameStats(store().build.warframe, dataset, store().combat)!;
    expect(max.abilityStrength).toBeCloseTo(1.6, 6);
  });
});

describe('cross-compartment buff link (Roar)', () => {
  it('toggling Roar applies the frame-derived magnitude to the weapon faction bucket', () => {
    // Equip Umbral Intensify ×3 on the frame → strength 1.77 → Roar 0.885.
    store().setActiveCompartment('warframe');
    store().assignMod(2, 'umbral-intensify');
    store().assignMod(3, 'umbral-vitality');
    store().assignMod(4, 'umbral-fiber');

    const before = result()!.burstDps;
    store().toggleBuff('roar', true);
    // faction multiplier = 1 + 0.885 = 1.885.
    expect(result()!.burstDps).toBeCloseTo(before * 1.885, 0);

    store().toggleBuff('roar', false);
    expect(result()!.burstDps).toBeCloseTo(before, 0);
  });

  it('adds with Bane in the same faction bucket', () => {
    store().assignMod(1, 'bane-of-grineer'); // weapon normal slot
    store().toggleCondition('faction:grineer', true);
    const baneOnly = result()!.burstDps;
    // No frame mods → Roar 0.5. Faction = 1 + 0.3 (Bane) + 0.5 (Roar) = 1.8.
    store().toggleBuff('roar', true);
    const withRoar = result()!.burstDps;
    // baneOnly already includes ×1.3; with Roar the bucket is ×1.8 → ratio 1.8/1.3.
    expect(withRoar / baneOnly).toBeCloseTo(1.8 / 1.3, 3);
  });

  it('falls back to a manual magnitude when no frame emits the buff', () => {
    store().selectWarframe(null); // no frame → no emitted Roar
    const before = result()!.burstDps;
    store().toggleBuff('roar', true);
    store().setBuffManual('roar', 0.5);
    expect(result()!.burstDps).toBeCloseTo(before * 1.5, 0);
  });
});
