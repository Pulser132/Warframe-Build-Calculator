import { describe, it, expect } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { createWeapon, Primary, hasCrit, hasStatus } from './index';
import { Gun, Weapon } from './weapon';

describe('gear hierarchy — Primary from curated data', () => {
  it('instantiates the slice rifle and exposes base stats', async () => {
    const data = await loadWeapon('vulkar-wraith');
    const weapon = createWeapon(data!);

    expect(weapon).toBeInstanceOf(Primary);
    expect(weapon).toBeInstanceOf(Gun);
    expect(weapon).toBeInstanceOf(Weapon);
    expect(weapon.kind).toBe('primary');
    expect(weapon.name).toBe('Vulkar Wraith');
    expect(weapon.totalBaseDamage).toBe(273);
    const dmg = weapon.baseDamage();
    expect(dmg.impact).toBeCloseTo(245.7, 4);
    expect(dmg.slash).toBeCloseTo(27.3, 4); // authoritative @wfcd damage object
    expect(dmg.puncture).toBeUndefined();

    // Capability interfaces are implemented by Gun/Primary.
    expect(hasCrit(weapon)).toBe(true);
    expect(hasStatus(weapon)).toBe(true);
    const gun = weapon as Primary;
    expect(gun.baseCritChance).toBeCloseTo(0.2, 5);
    expect(gun.baseCritMultiplier).toBe(2);
    expect(gun.baseStatusChance).toBeCloseTo(0.25, 4);
    expect(gun.baseMultishot).toBe(1);
  });

  it('exposes the 12-slot in-game layout', async () => {
    const data = await loadWeapon('vulkar-wraith');
    const weapon = createWeapon(data!);
    const layout = weapon.slotLayout;
    expect(layout).toHaveLength(12);
    expect(layout[0]).toBe('aura');
    expect(layout[1]).toBe('exilus');
    expect(layout.filter((s) => s === 'normal')).toHaveLength(8);
    expect(layout.filter((s) => s === 'arcane')).toHaveLength(2);
  });

  it('baseDamage() returns a fresh copy each call', async () => {
    const data = await loadWeapon('vulkar-wraith');
    const weapon = createWeapon(data!);
    const a = weapon.baseDamage();
    a.impact = 999;
    expect(weapon.baseDamage().impact).toBeCloseTo(245.7, 4);
  });
});
