import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadDataset, type Dataset } from '../data/loaders';
import { useBuildStore } from './store';
import { computeResult } from './resolve';
import { computeCapacity } from './capacity';

let dataset: Dataset;

beforeAll(async () => {
  dataset = await loadDataset();
});

beforeEach(() => {
  useBuildStore.getState().initFromDataset(dataset);
});

const store = () => useBuildStore.getState();
const result = () => computeResult(store().build, store().combat, dataset);

describe('build store — initialization', () => {
  it('creates a 12-slot Braton Prime build with the Naramon exilus polarity', () => {
    const { build } = store();
    expect(build.weaponId).toBe('braton-prime');
    expect(build.slots).toHaveLength(12);
    expect(build.slots[0].kind).toBe('aura');
    expect(build.slots[1].kind).toBe('exilus');
    expect(build.slots[1].polarity).toBe('naramon');
  });
});

describe('build store — mod actions update the derived result', () => {
  it('assigning Serration at max rank raises DPS', () => {
    const before = result()!.burstDps;
    store().assignMod(2, 'serration'); // first normal slot
    expect(store().build.slots[2].itemId).toBe('serration');
    expect(store().build.slots[2].rank).toBe(10); // assigned at max rank
    expect(result()!.burstDps).toBeGreaterThan(before);
  });

  it('lowering a mod rank lowers its effect', () => {
    store().assignMod(2, 'serration');
    const maxed = result()!.burstDps;
    store().setRank(2, 0); // unranked Serration = +15%
    expect(result()!.burstDps).toBeLessThan(maxed);
  });

  it('rejects an incompatible assignment (aura mod into a normal slot)', () => {
    store().assignMod(2, 'rifle-amp'); // rifle-amp is an aura
    expect(store().build.slots[2].itemId).toBeNull();
    // ...but it fits the aura slot.
    store().assignMod(0, 'rifle-amp');
    expect(store().build.slots[0].itemId).toBe('rifle-amp');
  });

  it('clearing a slot removes its contribution', () => {
    store().assignMod(2, 'serration');
    const withMod = result()!.burstDps;
    store().clearSlot(2);
    expect(result()!.burstDps).toBeLessThan(withMod);
    expect(store().build.slots[2].itemId).toBeNull();
  });
});

describe('build store — combat state flows through', () => {
  it('toggling the Bane faction conditional changes DPS once Bane is equipped', () => {
    store().assignMod(2, 'bane-of-grineer');
    const off = result()!.burstDps;
    store().toggleCondition('faction:grineer', true);
    expect(result()!.burstDps).toBeCloseTo(off * 1.3, 0);
  });

  it('an external Roar buff raises DPS', () => {
    const before = result()!.burstDps;
    store().setBuff('roar', 0.5);
    expect(result()!.burstDps).toBeCloseTo(before * 1.5, 0);
    store().setBuff('roar', null);
    expect(result()!.burstDps).toBeCloseTo(before, 0);
  });
});

describe('build store — undo/redo', () => {
  it('undoes and redoes a mod assignment', () => {
    expect(store().canUndo()).toBe(false);
    store().assignMod(2, 'serration');
    expect(store().build.slots[2].itemId).toBe('serration');
    expect(store().canUndo()).toBe(true);

    store().undo();
    expect(store().build.slots[2].itemId).toBeNull();
    expect(store().canRedo()).toBe(true);

    store().redo();
    expect(store().build.slots[2].itemId).toBe('serration');
  });

  it('a new action clears the redo stack', () => {
    store().assignMod(2, 'serration');
    store().undo();
    store().assignMod(3, 'point-strike');
    expect(store().canRedo()).toBe(false);
  });
});

describe('capacity', () => {
  it('matching polarity halves a normal mod cost; aura grants capacity', () => {
    store().assignMod(0, 'rifle-amp'); // aura, madurai, grants capacity
    store().assignMod(2, 'serration'); // normal slot, no polarity → full drain 14
    const modsById = new Map(dataset.mods.map((m) => [m.id, m]));
    const cap = computeCapacity(store().build, modsById);
    expect(cap.total).toBeGreaterThan(60); // base 30 ×2 reactor + aura bonus
    expect(cap.used).toBe(14); // Serration full drain in an unpolarized slot

    // Forma the slot to Madurai → Serration cost halves to 7.
    store().setSlotPolarity(2, 'madurai');
    const cap2 = computeCapacity(store().build, modsById);
    expect(cap2.used).toBe(7);
  });
});
