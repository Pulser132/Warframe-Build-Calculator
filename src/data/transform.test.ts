/**
 * Data-transform contract tests: the generic `attacks[] → fireModes` mapping and
 * the `falloff.reduction` convention, asserted against the cached fixtures (one
 * weapon per mechanic). These pin the `build-data.mjs` output shape.
 */
import { describe, it, expect } from 'vitest';
import { loadWeapon, loadWarframes, loadAbilities } from './loaders';

describe('fire-mode mapping (generic, from @wfcd attacks[])', () => {
  it('single-mode weapon → exactly one mode (Soma Prime; Incarnon dropped)', async () => {
    const soma = await loadWeapon('soma-prime');
    expect(soma!.fireModes).toHaveLength(1);
    expect(soma!.fireModes![0].trigger).toBe('auto');
    // Incarnon Form must NOT appear as a mode.
    expect(soma!.fireModes!.some((m) => /incarnon/i.test(m.name))).toBe(false);
  });

  it('secondary base form only (Lex Prime; Incarnon dropped)', async () => {
    const lex = await loadWeapon('lex-prime');
    expect(lex!.category).toBe('Secondary');
    expect(lex!.fireModes).toHaveLength(1);
    expect(lex!.fireModes![0].components[0].totalBaseDamage).toBeCloseTo(180, 4);
  });

  it('multi-mode weapon → N modes (Stradavar Prime: 2)', async () => {
    const strad = await loadWeapon('stradavar-prime');
    expect(strad!.fireModes!.map((m) => m.name)).toEqual(['Full Auto Mode', 'Semi-Auto Mode']);
    expect(strad!.fireModes![0].trigger).toBe('auto');
    expect(strad!.fireModes![1].trigger).toBe('semi');
  });

  it('burst weapon carries burst spec + in-burst fire rate (Hind)', async () => {
    const hind = await loadWeapon('hind');
    const burst = hind!.fireModes![0];
    expect(burst.trigger).toBe('burst');
    expect(burst.fireRate).toBeCloseTo(6.25, 2); // in-burst rate (Arsenal value)
    expect(burst.burst).toEqual({ count: 5, delay: 0.25 });
  });

  it('charge weapon collapses charge tiers to the full charge (Lanka)', async () => {
    const lanka = await loadWeapon('lanka');
    expect(lanka!.fireModes).toHaveLength(1);
    const mode = lanka!.fireModes![0];
    expect(mode.trigger).toBe('charge');
    expect(mode.chargeTime).toBeCloseTo(1, 4); // full charge, not the 0.3s partial
    expect(mode.components[0].totalBaseDamage).toBeCloseTo(525, 4);
  });

  it('beam weapon carries a beam spec with 0.5 ammo/tick (Glaxion Vandal)', async () => {
    const glax = await loadWeapon('glaxion-vandal');
    const mode = glax!.fireModes![0];
    expect(mode.trigger).toBe('held');
    expect(mode.beam?.ammoPerTick).toBe(0.5);
    expect(mode.beam?.rampStartPct).toBeCloseTo(0.2, 4);
  });
});

describe('shotgun per-pellet damage', () => {
  it('keeps the @wfcd per-pellet damage as-is (Vaykor Hek)', async () => {
    // @wfcd damage is already per-pellet; the pipeline multiplies by multishot to
    // get the per-shot total (75 × 7 = 525, matching the Arsenal). Do NOT divide.
    const hek = await loadWeapon('vaykor-hek');
    expect(hek!.multishot).toBe(7);
    const pellet = hek!.fireModes![0].components[0];
    expect(pellet.totalBaseDamage).toBeCloseTo(75, 4); // per pellet (was wrongly /7)
    expect(pellet.damage.puncture).toBeCloseTo(48.75, 4); // puncture-heavy, per pellet (wiki)
  });
});

describe('AoE split + falloff convention', () => {
  it('splits direct + radial components (Tonkor)', async () => {
    const tonkor = await loadWeapon('tonkor');
    const comps = tonkor!.fireModes![0].components;
    expect(comps.map((c) => c.role)).toEqual(['direct', 'radial']);
    expect(comps[0].damage.puncture).toBeCloseTo(75, 4); // direct
    expect(comps[1].damage.blast).toBeCloseTo(650, 4); // radial
  });

  it('pairs each direct attack with its own trailing AoE into separate modes (Trumna Prime)', async () => {
    // Regression: the alt-fire grenade (Grenade Impact 100 + 1150 blast) must not
    // be folded into the primary fire. The primary "Auto" mode is just the direct
    // hit (85) + its small radial (50) — matching the two in-game hits.
    const trumna = await loadWeapon('trumna-prime');
    expect(trumna!.fireModes!.map((m) => m.name)).toEqual(['Auto', 'Grenade Impact']);
    const auto = trumna!.fireModes![0];
    expect(auto.components.map((c) => c.role)).toEqual(['direct', 'radial']);
    expect(auto.components[0].totalBaseDamage).toBeCloseTo(85, 4);
    expect(auto.components[1].totalBaseDamage).toBeCloseTo(50, 4);
    // The grenade lives in its own mode, not in the primary fire.
    const grenade = trumna!.fireModes![1];
    expect(grenade.components.map((c) => c.totalBaseDamage)).toEqual([100, 1150]);
  });

  it('normalizes @wfcd reduction (remaining multiplier) → maxReduction (fraction removed)', async () => {
    const tonkor = await loadWeapon('tonkor');
    const radial = tonkor!.fireModes![0].components[1];
    // @wfcd reduction 0.7 = 70% remains at the rim → maxReduction = 0.3 removed.
    expect(radial.falloff).toEqual({ start: 0, end: 7, maxReduction: 0.3 });
  });

  it('Vaykor Hek projectile falloff stays as remaining-multiplier metadata (not radial)', async () => {
    // Hek is a hitscan pellet shotgun: its normal component carries no radial
    // falloff (long-range projectile falloff is Stage 5 metadata, not applied here).
    const hek = await loadWeapon('vaykor-hek');
    expect(hek!.fireModes![0].components[0].falloff).toBeUndefined();
  });
});

describe('Warframe transform (Stage 4)', () => {
  it('emits the reference frame first with base stats + ability roster', async () => {
    const frames = await loadWarframes();
    expect(frames.length).toBeGreaterThan(100);
    const rhino = frames[0];
    expect(rhino.name).toBe('Rhino Prime'); // stable reference frame
    expect(rhino.health).toBe(270);
    expect(rhino.shield).toBe(455);
    expect(rhino.armor).toBe(290);
    expect(rhino.energy).toBe(100); // @wfcd `power`
    // Ability names/descriptions present; numeric scaling is NOT in this file.
    expect(rhino.abilities.map((a) => a.id)).toContain('roar');
    expect((rhino.abilities[0] as unknown as { strengthBase?: number }).strengthBase).toBeUndefined();
  });

  it('defaults absent slot polarities to null (verified per frame)', async () => {
    const frames = await loadWarframes();
    const rhino = frames[0];
    // @wfcd does not populate Rhino Prime's aura/exilus polarity.
    expect(rhino.auraPolarity).toBeNull();
    expect(rhino.polarities).toContain('vazarin');
  });

  it('ability scaling lives in the committed abilities.json (Roar verified)', async () => {
    const abilities = await loadAbilities();
    expect(abilities.roar).toMatchObject({ strengthBase: 0.5, durationBase: 30, rangeBase: 25 });
    expect(abilities.roar.lowConfidence).toBeUndefined();
  });
});
