import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadDataset, type Dataset } from '../data/loaders';
import { useBuildStore } from './store';
import { computeResult, computeTargetResult } from './resolve';
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
  it('creates an 11-slot Vulkar Wraith weapon compartment with the Madurai exilus polarity', () => {
    const { build } = store();
    expect(build.weapon.itemId).toBe('vulkar-wraith');
    expect(build.weapon.slots).toHaveLength(11); // no aura on guns (Stage 4)
    expect(build.weapon.slots[0].kind).toBe('exilus');
    expect(build.weapon.slots[0].polarity).toBe('madurai');
    // The reference Warframe is equipped by default (ADR 0003).
    expect(build.warframe?.itemId).toBe('rhino-prime');
    expect(build.warframe?.slots[0].kind).toBe('aura');
  });
});

describe('build store — mod actions update the derived result', () => {
  it('assigning Serration at max rank raises DPS', () => {
    const before = result()!.burstDps;
    store().assignMod(1, 'serration'); // first normal slot (index 1; exilus is 0)
    expect(store().build.weapon.slots[1].itemId).toBe('serration');
    expect(store().build.weapon.slots[1].rank).toBe(10); // assigned at max rank
    expect(result()!.burstDps).toBeGreaterThan(before);
  });

  it('lowering a mod rank lowers its effect', () => {
    store().assignMod(1, 'serration');
    const maxed = result()!.burstDps;
    store().setRank(1, 0); // unranked Serration = +15%
    expect(result()!.burstDps).toBeLessThan(maxed);
  });

  it('rejects an incompatible assignment (aura mod onto a weapon)', () => {
    store().assignMod(1, 'corrosive-projection'); // aura is Warframe-only now
    expect(store().build.weapon.slots[1].itemId).toBeNull();
    // ...but it fits the Warframe aura slot (compartment-addressed).
    store().setActiveCompartment('warframe');
    store().assignMod(0, 'corrosive-projection');
    expect(store().build.warframe?.slots[0].itemId).toBe('corrosive-projection');
  });

  it('clearing a slot removes its contribution', () => {
    store().assignMod(1, 'serration');
    const withMod = result()!.burstDps;
    store().clearSlot(1);
    expect(result()!.burstDps).toBeLessThan(withMod);
    expect(store().build.weapon.slots[1].itemId).toBeNull();
  });
});

describe('build store — combat state flows through', () => {
  it('toggling the Bane faction conditional changes DPS once Bane is equipped', () => {
    store().assignMod(1, 'bane-of-grineer');
    const off = result()!.burstDps;
    store().toggleCondition('faction:grineer', true);
    expect(result()!.burstDps).toBeCloseTo(off * 1.3, 0);
  });

  it('toggling Roar applies the frame-derived magnitude (Rhino Prime → +50%)', () => {
    const before = result()!.burstDps;
    store().toggleBuff('roar', true); // unmodded Rhino Prime: 0.5 × 100% strength
    expect(result()!.burstDps).toBeCloseTo(before * 1.5, 0);
    store().toggleBuff('roar', false);
    expect(result()!.burstDps).toBeCloseTo(before, 0);
  });
});

describe('build store — undo/redo', () => {
  it('undoes and redoes a mod assignment', () => {
    expect(store().canUndo()).toBe(false);
    store().assignMod(1, 'serration');
    expect(store().build.weapon.slots[1].itemId).toBe('serration');
    expect(store().canUndo()).toBe(true);

    store().undo();
    expect(store().build.weapon.slots[1].itemId).toBeNull();
    expect(store().canRedo()).toBe(true);

    store().redo();
    expect(store().build.weapon.slots[1].itemId).toBe('serration');
  });

  it('a new action clears the redo stack', () => {
    store().assignMod(1, 'serration');
    store().undo();
    store().assignMod(2, 'point-strike');
    expect(store().canRedo()).toBe(false);
  });
});

describe('build store — Target / Enemy (Stage 5, Phase B)', () => {
  const targetResult = () =>
    computeTargetResult(store().build, store().combat, store().target, dataset)!.result;

  it('defaults to the Charger (pure health) target', () => {
    expect(store().target.enemyId).toBe('charger');
    const r = targetResult();
    expect(r.scaled.shield).toBe(0);
    expect(r.scaled.armor).toBe(0);
    expect(isFinite(r.ttkSeconds)).toBe(true);
  });

  it('selecting an armored enemy lowers effective DPS; armor strip raises it back', () => {
    store().selectEnemy('bombard');
    const withArmor = targetResult().effectiveDps;
    store().setArmorStrip(1);
    expect(targetResult().effectiveDps).toBeGreaterThan(withArmor);
  });

  it('raising the level (and Steel Path) scales the enemy and lengthens TTK', () => {
    store().selectEnemy('bombard');
    const baseTtk = targetResult().ttkSeconds;
    store().setTargetLevel(150);
    expect(targetResult().ttkSeconds).toBeGreaterThan(baseTtk);
    const lvlTtk = targetResult().ttkSeconds;
    store().setSteelPath(true);
    expect(targetResult().ttkSeconds).toBeGreaterThan(lvlTtk);
  });

  it('the Eximus / Overguard toggle adds an Overguard pool', () => {
    store().selectEnemy('lancer');
    expect(targetResult().scaled.overguard).toBe(0);
    store().toggleOverguard(true);
    expect(targetResult().scaled.overguard).toBeGreaterThan(0);
  });

  it('a faction override changes the modifier table (not the stats)', () => {
    store().selectEnemy('charger'); // Infested: Slash ×1.5
    const before = targetResult();
    store().setFactionOverride('Grineer'); // Grineer: Slash neutral
    const after = targetResult();
    expect(after.scaled.health).toBe(before.scaled.health); // stats unchanged
    // effective damage differs because the faction modifier table changed
    expect(after.effectiveDps).not.toBeCloseTo(before.effectiveDps, 1);
  });

  it('undo restores the previous Target state', () => {
    store().selectEnemy('bombard');
    store().undo();
    expect(store().target.enemyId).toBe('charger');
  });

  it('TargetState is plain serializable data', () => {
    store().selectEnemy('lancer');
    store().setTargetLevel(120);
    expect(JSON.parse(JSON.stringify(store().target))).toEqual(store().target);
  });
});

describe('capacity', () => {
  it('matching polarity halves a normal mod cost; aura grants capacity (frame)', () => {
    // Weapon compartment: Serration in an unpolarized normal slot → full drain 14.
    store().assignMod(1, 'serration');
    const modsById = new Map(dataset.mods.map((m) => [m.id, m]));
    const cap = computeCapacity(store().build.weapon, modsById);
    expect(cap.used).toBe(14);
    // Forma the slot to Madurai → Serration cost halves to 7.
    store().setSlotPolarity(1, 'madurai');
    const cap2 = computeCapacity(store().build.weapon, modsById);
    expect(cap2.used).toBe(7);

    // Warframe compartment: Corrosive Projection (aura) grants capacity.
    store().setActiveCompartment('warframe');
    store().assignMod(0, 'corrosive-projection');
    const frameCap = computeCapacity(store().build.warframe!, modsById);
    expect(frameCap.total).toBeGreaterThan(60); // base 30 ×2 reactor + aura bonus
  });
});
