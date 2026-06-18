import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadDataset, type Dataset } from '../data/loaders';
import { useBuildStore } from './store';
import { computeResult } from './resolve';

let dataset: Dataset;

beforeAll(async () => {
  dataset = await loadDataset();
});

beforeEach(() => {
  useBuildStore.getState().initFromDataset(dataset);
});

const store = () => useBuildStore.getState();

describe('melee build via the store (Kronen Prime)', () => {
  beforeEach(() => {
    store().selectWeapon('kronen-prime');
  });

  it('equips a melee mod, rejects a rifle mod', () => {
    store().assignMod(2, 'pressure-point'); // melee mod → fits a melee normal slot
    expect(store().build.weapon.slots[2].itemId).toBe('pressure-point');
    store().assignMod(2, 'serration'); // rifle mod → rejected, leaves the melee mod
    expect(store().build.weapon.slots[2].itemId).toBe('pressure-point');
  });

  it('uses the stance slot layout with the innate stance polarity', () => {
    const { build } = store();
    expect(build.weapon.itemId).toBe('kronen-prime');
    expect(build.weapon.slots[0].kind).toBe('stance');
    expect(build.weapon.slots[0].polarity).toBe('madurai'); // Kronen Prime stancePolarity
    expect(build.weapon.slots).toHaveLength(12); // melee keeps its stance slot
  });

  it('equips a compatible Tonfa stance, rejects a Heavy Blade stance', () => {
    store().assignMod(0, 'gemini-cross'); // Tonfa stance → fits Kronen
    expect(store().build.weapon.slots[0].itemId).toBe('gemini-cross');
    store().assignMod(0, 'tempo-royale'); // Heavy Blade stance → rejected
    expect(store().build.weapon.slots[0].itemId).toBe('gemini-cross');
  });

  it('Blood Rush raises crit chance once a combo is built', () => {
    store().assignMod(2, 'blood-rush');
    const noCombo = computeResult(store().build, store().combat, dataset, 'Normal Attack')!;
    store().setStacks('combo', 60); // tier 3
    const withCombo = computeResult(store().build, store().combat, dataset, 'Normal Attack')!;
    expect(withCombo.critChance).toBeGreaterThan(noCombo.critChance);
  });

  it('selecting a combo string surfaces a per-hit breakdown', () => {
    store().setComboString('Vagrant Blight');
    const r = computeResult(
      store().build,
      store().combat,
      dataset,
      'Normal Attack',
      undefined,
      store().activeComboString,
    )!;
    expect(r.comboString?.name).toBe('Vagrant Blight');
  });
});
