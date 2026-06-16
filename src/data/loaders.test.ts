import { describe, it, expect } from 'vitest';
import { loadWeapon, loadMod, loadArcane, loadMods, loadDataset } from './loaders';

describe('data transform — curated weapon', () => {
  it('normalizes Vulkar Wraith to the curated schema with correct IPS', async () => {
    const w = await loadWeapon('vulkar-wraith');
    expect(w).toBeDefined();
    // IPS comes from damagePerShot order; only nonzero types are kept (no Slash).
    expect(w!.damage.impact).toBeCloseTo(245.7, 4);
    expect(w!.damage.puncture).toBeCloseTo(27.3, 4);
    expect(w!.damage.slash).toBeUndefined();
    expect(w!.totalBaseDamage).toBe(273);
    expect(w!.criticalChance).toBeCloseTo(0.2, 5);
    expect(w!.criticalMultiplier).toBe(2);
    expect(w!.statusChance).toBeCloseTo(0.25, 4);
    expect(w!.fireRate).toBeCloseTo(2, 5);
    expect(w!.magazine).toBe(8);
    expect(w!.reload).toBeCloseTo(3, 4);
    expect(w!.multishot).toBe(1);
    expect(w!.weaponClass).toBe('rifle');
    expect(w!.exilusPolarity).toBe('madurai');
  });
});

describe('mod mapping — curated stats + authored descriptors', () => {
  it('maps Serration to an additive base-damage effect', async () => {
    const m = await loadMod('serration');
    expect(m).toBeDefined();
    expect(m!.polarity).toBe('madurai');
    expect(m!.maxRank).toBe(10);
    expect(m!.slot).toBe('normal');
    expect(m!.effects).toEqual([{ bucket: 'baseDamage', value: 1.65 }]);
  });

  it('maps the two elementals to their damage types', async () => {
    const toxin = await loadMod('infected-clip');
    const elec = await loadMod('stormbringer');
    expect(toxin!.effects[0]).toMatchObject({ bucket: 'elemental', element: 'toxin', value: 0.9 });
    expect(elec!.effects[0]).toMatchObject({
      bucket: 'elemental',
      element: 'electricity',
      value: 0.9,
    });
  });

  it('maps Bane of Grineer to a conditional faction multiplier', async () => {
    const m = await loadMod('bane-of-grineer');
    expect(m!.effects).toEqual([
      { bucket: 'faction', value: 0.3, condition: 'faction:grineer' },
    ]);
  });

  it('assigns aura and exilus slot kinds', async () => {
    const aura = await loadMod('rifle-amp');
    const exilus = await loadMod('sinister-reach');
    expect(aura!.slot).toBe('aura');
    expect(aura!.effects).toEqual([{ bucket: 'baseDamage', value: 0.27 }]);
    expect(exilus!.slot).toBe('exilus');
    expect(exilus!.effects).toEqual([]); // utility, no damage contribution
  });

  it('loads every slice mod with an authored descriptor', async () => {
    const mods = await loadMods();
    expect(mods).toHaveLength(11);
    for (const m of mods) {
      expect(m.slot).toBeDefined();
      expect(Array.isArray(m.effects)).toBe(true);
    }
  });
});

describe('arcane mapping', () => {
  it('maps Primary Merciless to a per-stack directDamage effect', async () => {
    const a = await loadArcane('primary-merciless');
    expect(a).toBeDefined();
    expect(a!.effects[0]).toMatchObject({
      bucket: 'directDamage',
      value: 0.3,
      perStack: true,
      maxStacks: 12,
    });
  });
});

describe('loadDataset', () => {
  it('returns all categories', async () => {
    const ds = await loadDataset();
    expect(ds.weapons).toHaveLength(1);
    expect(ds.mods).toHaveLength(11);
    expect(ds.arcanes).toHaveLength(2);
  });
});
