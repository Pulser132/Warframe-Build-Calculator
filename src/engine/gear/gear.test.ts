import { describe, it, expect } from 'vitest';
import { loadWeapon } from '../../data/loaders';
import { createWeapon, Primary, hasCrit, hasStatus } from './index';
import { Gun, Weapon } from './weapon';

describe('gear hierarchy — Primary from curated data', () => {
  it('instantiates the slice rifle and exposes base stats', async () => {
    const data = await loadWeapon('braton-prime');
    const weapon = createWeapon(data!);

    expect(weapon).toBeInstanceOf(Primary);
    expect(weapon).toBeInstanceOf(Gun);
    expect(weapon).toBeInstanceOf(Weapon);
    expect(weapon.kind).toBe('primary');
    expect(weapon.name).toBe('Braton Prime');
    expect(weapon.totalBaseDamage).toBe(35);
    expect(weapon.baseDamage()).toEqual({ impact: 1.75, puncture: 12.25, slash: 21 });

    // Capability interfaces are implemented by Gun/Primary.
    expect(hasCrit(weapon)).toBe(true);
    expect(hasStatus(weapon)).toBe(true);
    const gun = weapon as Primary;
    expect(gun.baseCritChance).toBeCloseTo(0.12, 5);
    expect(gun.baseCritMultiplier).toBe(2);
    expect(gun.baseStatusChance).toBeCloseTo(0.26, 4);
    expect(gun.baseMultishot).toBe(1);
  });

  it('exposes the 12-slot in-game layout', async () => {
    const data = await loadWeapon('braton-prime');
    const weapon = createWeapon(data!);
    const layout = weapon.slotLayout;
    expect(layout).toHaveLength(12);
    expect(layout[0]).toBe('aura');
    expect(layout[1]).toBe('exilus');
    expect(layout.filter((s) => s === 'normal')).toHaveLength(8);
    expect(layout.filter((s) => s === 'arcane')).toHaveLength(2);
  });

  it('baseDamage() returns a fresh copy each call', async () => {
    const data = await loadWeapon('braton-prime');
    const weapon = createWeapon(data!);
    const a = weapon.baseDamage();
    a.slash = 999;
    expect(weapon.baseDamage().slash).toBe(21);
  });
});
