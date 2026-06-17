/**
 * Stage 2 end-to-end reference builds: one weapon per new mechanic, each anchored
 * to its hand-verified wiki/fixture numbers (docs/warframe/weapons/*.md).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadWeapon, loadMods } from '../../data/loaders';
import type { ModData } from '../model/types';
import { EMPTY_COMBAT_STATE } from '../model/build';
import { createWeapon } from '../gear/factory';
import { Secondary } from '../gear/secondary';
import type { Gun } from '../gear/weapon';
import { calculateBuild } from './calculate';
import type { ResolvedSource } from './gather';

let modsById: Map<string, ModData>;

beforeAll(async () => {
  modsById = new Map((await loadMods()).map((m) => [m.id, m]));
});

async function gunFor(id: string): Promise<Gun> {
  return createWeapon((await loadWeapon(id))!) as Gun;
}
function mod(id: string): ResolvedSource {
  const m = modsById.get(id);
  if (!m) throw new Error(`missing mod ${id}`);
  return { id: m.id, label: m.name, kind: 'mod', rank: m.maxRank, maxRank: m.maxRank, effects: m.effects };
}
const COMBAT = EMPTY_COMBAT_STATE;

describe('Phase 4 — beam (Glaxion Vandal)', () => {
  it('models per-tick damage, peak DPS, and FULL per-tick status (no 0.6×)', async () => {
    const glax = await gunFor('glaxion-vandal');
    const r = calculateBuild({ weapon: glax, sources: [], combat: COMBAT });

    expect(r.trigger).toBe('held');
    expect(r.ammoPerShot).toBe(0.5); // 0.5 ammo per tick
    expect(r.fireRate).toBeCloseTo(12, 4); // tick rate = fire rate
    // 29 Cold × avgCrit (1 + 0.14×1) = 33.06 per tick.
    expect(r.beam?.perTickDamage).toBeCloseTo(33.06, 2);
    expect(r.beam?.tickRate).toBeCloseTo(12, 4);
    // Full status: 0.38 × 12 = 4.56 procs/sec (NOT ×0.6 = 2.736).
    expect(r.beam?.procsPerSecond).toBeCloseTo(4.56, 2);
    expect(r.statusChancePerPellet).toBeCloseTo(0.38, 4);
    expect(r.beam?.rampStartPct).toBeCloseTo(0.2, 4);
    // Peak (post-ramp) DPS = per-tick × tick rate.
    expect(r.burstDps).toBeCloseTo(396.7, 0);
  });

  it('merges multishot into one tick instance (× multishot, may exceed 100%)', async () => {
    const glax = await gunFor('glaxion-vandal');
    // Split Chamber (+90% MS) — rifle-class beam takes rifle mods.
    const r = calculateBuild({ weapon: glax, sources: [mod('split-chamber')], combat: COMBAT });
    expect(r.multishot).toBeCloseTo(1.9, 4);
    expect(r.statusChancePerPellet * r.multishot).toBeCloseTo(0.722, 3); // merged 72.2%/tick
    expect(r.beam?.perTickDamage).toBeCloseTo(33.06 * 1.9, 1);
  });
});

describe('Phase 5 — shotgun (Vaykor Hek)', () => {
  it('treats status & crit per pellet; exposes procs/shot and P(≥1)', async () => {
    const hek = await gunFor('vaykor-hek');
    const r = calculateBuild({ weapon: hek, sources: [], combat: COMBAT });

    expect(r.multishot).toBe(7); // base pellet count
    expect(r.statusChancePerPellet).toBeCloseTo(0.107, 3);
    expect(r.avgProcsPerShot).toBeCloseTo(7 * 0.107, 3);
    expect(r.statusProcChance).toBeCloseTo(1 - Math.pow(1 - 0.107, 7), 4); // P(≥1)
    // Per-pellet 75 base × avgCrit 1.25 = 93.75; × 7 pellets = 656.25 per shot.
    expect(r.avgHitPerShot).toBeCloseTo(656.25, 1);
    // Puncture dominates the proc-type weighting (~48.75 / 75, post-quantization).
    expect(r.procTypeWeights?.puncture).toBeCloseTo(0.65, 1);
  });

  it('multishot mods add pellets (Hell’s Chamber +120% → 15.4)', async () => {
    const hek = await gunFor('vaykor-hek');
    const r = calculateBuild({ weapon: hek, sources: [mod('hell-s-chamber')], combat: COMBAT });
    expect(r.multishot).toBeCloseTo(15.4, 3); // 7 × 2.2
    expect(r.avgProcsPerShot).toBeCloseTo(15.4 * 0.107, 3);
  });
});

describe('Phase 6 — projectile + AoE & falloff (Tonkor)', () => {
  it('splits direct + radial, applies linear falloff (center vs rim)', async () => {
    const tonkor = await gunFor('tonkor');
    const r = calculateBuild({ weapon: tonkor, sources: [], combat: COMBAT });

    expect(r.components).toHaveLength(2);
    const direct = r.components!.find((c) => c.role === 'direct')!;
    const radial = r.components!.find((c) => c.role === 'radial')!;
    expect(direct.delivery).toBe('projectile');
    expect(radial.delivery).toBe('aoe');

    // Direct 75 Puncture × avgCrit 1.375 = 103.125.
    expect(direct.perPelletAverage).toBeCloseTo(103.125, 1);
    expect(direct.perType.puncture).toBeGreaterThan(0);

    // Radial 650 Blast × 1.375 = 893.75 at center; rim = ×0.7 = 625.625.
    expect(r.aoe?.centerAverage).toBeCloseTo(893.75, 1);
    expect(r.aoe?.rimAverage).toBeCloseTo(625.625, 1);
    expect(r.aoe?.radius).toBe(7);
    // Convention: @wfcd reduction 0.7 = remaining multiplier → rim = center × 0.7.
    expect(r.aoe!.rimAverage / r.aoe!.centerAverage).toBeCloseTo(0.7, 4);
  });

  it('carries hitscan/projectile delivery without changing damage', async () => {
    const tonkor = await gunFor('tonkor');
    const r = calculateBuild({ weapon: tonkor, sources: [], combat: COMBAT });
    expect(r.delivery).toBe('projectile'); // headline component
    // On-target hit = direct + radial centre.
    expect(r.avgHitPerShot).toBeCloseTo(103.125 + 893.75, 0);
  });
});

describe('Phase 3 — burst & charge triggers', () => {
  it('Hind burst mode: 5-round burst → ~4.31 effective rps', async () => {
    const hind = await gunFor('hind');
    const burst = hind.fireMode('Burst Mode');
    const r = calculateBuild({ weapon: hind, sources: [], combat: COMBAT, mode: burst });
    expect(r.trigger).toBe('burst');
    expect(r.fireRate).toBeCloseTo(4.31, 2); // 5 / (1/6.25 + 4×0.25)
  });

  it('Lanka charge: ~1.0 rps base, scales to ~1.6 with +60% fire rate', async () => {
    const lanka = await gunFor('lanka');
    const base = calculateBuild({ weapon: lanka, sources: [], combat: COMBAT });
    const fast = calculateBuild({ weapon: lanka, sources: [mod('speed-trigger')], combat: COMBAT });
    expect(base.trigger).toBe('charge');
    expect(base.fireRate).toBeCloseTo(1.0, 3);
    expect(fast.fireRate).toBeCloseTo(1.6, 3);
    expect(fast.burstDps / base.burstDps).toBeCloseTo(1.6, 3); // damage unchanged, only rate
  });
});

describe('Phase 2/7 — secondary class & multi-mode weapons', () => {
  it('Lex Prime instantiates as a Secondary and scales with pistol mods', async () => {
    const lex = await gunFor('lex-prime');
    expect(lex).toBeInstanceOf(Secondary);
    expect(lex.kind).toBe('secondary');
    const base = calculateBuild({ weapon: lex, sources: [], combat: COMBAT });
    const modded = calculateBuild({ weapon: lex, sources: [mod('hornet-strike')], combat: COMBAT });
    expect(base.avgHitPerShot).toBeCloseTo(225, 1); // 180 × 1.25
    expect(modded.avgHitPerShot).toBeCloseTo(720, 1); // 180 × 3.2 × 1.25
  });

  it('Stradavar Prime exposes two modes with independent stats', async () => {
    const strad = await gunFor('stradavar-prime');
    expect(strad.isMultiMode).toBe(true);
    expect(strad.modeNames).toEqual(['Full Auto Mode', 'Semi-Auto Mode']);

    const auto = calculateBuild({ weapon: strad, sources: [], combat: COMBAT, mode: strad.fireMode('Full Auto Mode') });
    const semi = calculateBuild({ weapon: strad, sources: [], combat: COMBAT, mode: strad.fireMode('Semi-Auto Mode') });

    expect(auto.trigger).toBe('auto');
    expect(auto.fireRate).toBeCloseTo(10, 3);
    expect(auto.critChance).toBeCloseTo(0.24, 4);
    expect(semi.trigger).toBe('semi');
    expect(semi.fireRate).toBeCloseTo(3.33, 3);
    expect(semi.critChance).toBeCloseTo(0.3, 4);
    // Semi mode hits much harder per shot (80 vs 30 base).
    expect(semi.avgHitPerShot).toBeGreaterThan(auto.avgHitPerShot * 2);
  });

  it('a shared loadout applies to each mode independently', async () => {
    const strad = await gunFor('stradavar-prime');
    const sources = [mod('serration')];
    const auto = calculateBuild({ weapon: strad, sources, combat: COMBAT, mode: strad.fireMode('Full Auto Mode') });
    const autoBase = calculateBuild({ weapon: strad, sources: [], combat: COMBAT, mode: strad.fireMode('Full Auto Mode') });
    expect(auto.avgHitPerShot / autoBase.avgHitPerShot).toBeCloseTo(1 + 1.65, 3); // Serration on the auto mode
  });
});
