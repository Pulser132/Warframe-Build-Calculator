import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadDataset, type Dataset } from '../data/loaders';
import { useBuildStore } from './store';
import { computeResult } from './resolve';
import { modMatchesGroup, weaponModGroup, stanceMatchesClass } from './modCompat';
import type { ModData } from '@engine/model/types';

let dataset: Dataset;

beforeAll(async () => {
  dataset = await loadDataset();
});

beforeEach(() => {
  useBuildStore.getState().initFromDataset(dataset);
});

const store = () => useBuildStore.getState();
const modById = (id: string) => dataset.mods.find((m) => m.id === id) as ModData;

describe('melee mod compatibility', () => {
  it('a melee weapon takes the melee mod group', () => {
    expect(weaponModGroup({ category: 'Melee', weaponClass: 'tonfa' })).toBe('melee');
  });

  it('melee mods match the melee group; rifle mods do not', () => {
    expect(modMatchesGroup(modById('pressure-point'), 'melee')).toBe(true);
    expect(modMatchesGroup(modById('blood-rush'), 'melee')).toBe(true);
    expect(modMatchesGroup(modById('serration'), 'melee')).toBe(false);
  });

  it('stances gate on weapon class', () => {
    // Gemini Cross is a Tonfa stance; Tempo Royale is Heavy Blade.
    expect(stanceMatchesClass(modById('gemini-cross'), 'tonfa')).toBe(true);
    expect(stanceMatchesClass(modById('gemini-cross'), 'heavy-blade')).toBe(false);
    expect(stanceMatchesClass(modById('tempo-royale'), 'heavy-blade')).toBe(true);
    expect(modMatchesGroup(modById('tempo-royale'), 'melee', 'heavy-blade')).toBe(true);
    expect(modMatchesGroup(modById('tempo-royale'), 'melee', 'tonfa')).toBe(false);
  });
});

describe('melee build via the store (Kronen Prime)', () => {
  beforeEach(() => {
    store().selectWeapon('kronen-prime');
  });

  it('uses the stance slot layout with the innate stance polarity', () => {
    const { build } = store();
    expect(build.weaponId).toBe('kronen-prime');
    expect(build.slots[0].kind).toBe('stance');
    expect(build.slots[0].polarity).toBe('madurai'); // Kronen Prime stancePolarity
    expect(build.slots).toHaveLength(12);
  });

  it('equips a compatible Tonfa stance, rejects a Heavy Blade stance', () => {
    store().assignMod(0, 'gemini-cross'); // Tonfa stance → fits Kronen
    expect(store().build.slots[0].itemId).toBe('gemini-cross');
    store().assignMod(0, 'tempo-royale'); // Heavy Blade stance → rejected
    expect(store().build.slots[0].itemId).toBe('gemini-cross');
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
