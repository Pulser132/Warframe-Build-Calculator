import { describe, it, expect } from 'vitest';
import { resolveWarframe, EFFICIENCY_CAP } from './resolve';
import { computeEhp } from './ehp';
import type { FrameSource, AbilityScalingMap } from './types';

// Rhino Prime base stats (verified @wfcd: docs/warframe/warframes/rhino-prime.md).
const RHINO_BASE = {
  health: 270,
  shield: 455,
  armor: 290,
  energy: 100,
  abilities: [{ id: 'roar', name: 'Roar', description: '' }],
};
const SCALING: AbilityScalingMap = {
  roar: { id: 'roar', name: 'Roar', strengthBase: 0.5, durationBase: 30, rangeBase: 25 },
};

function resolve(sources: FrameSource[]) {
  return resolveWarframe({ base: RHINO_BASE, sources, abilityScaling: SCALING });
}

describe('resolveWarframe — base (no mods)', () => {
  const stats = resolve([]);

  it('defaults the four ability attributes to 100%', () => {
    expect(stats.abilityStrength).toBe(1);
    expect(stats.abilityDuration).toBe(1);
    expect(stats.abilityRange).toBe(1);
    expect(stats.abilityEfficiency).toBe(1);
  });

  it('computes generic EHP (armor DR, health-EHP, total)', () => {
    // armor 290 → DR = 290/590 = 0.4915; healthEhp = 270×(1+290/300) = 531;
    // total = 531 + 455 shield = 986.
    expect(stats.ehp.armorDamageReduction).toBeCloseTo(290 / 590, 6);
    expect(stats.ehp.healthEhp).toBeCloseTo(531, 3);
    expect(stats.ehp.total).toBeCloseTo(986, 3);
  });

  it('emits Roar at 0.5 × 100% strength = +50%', () => {
    expect(stats.emittedBuffs.roar).toBeCloseTo(0.5, 6);
    const roar = stats.abilities.find((a) => a.id === 'roar')!;
    expect(roar.strengthMagnitude).toBeCloseTo(0.5, 6);
    expect(roar.durationSeconds).toBeCloseTo(30, 6);
    expect(roar.rangeMetres).toBeCloseTo(25, 6);
  });
});

describe('resolveWarframe — ability-attribute mods (additive)', () => {
  it('Intensify adds +30% strength → Roar +65%', () => {
    const stats = resolve([
      { id: 'intensify', label: 'Intensify', rank: 5, maxRank: 5, frameEffects: [{ stat: 'abilityStrength', value: 0.3 }] },
    ]);
    expect(stats.abilityStrength).toBeCloseTo(1.3, 6);
    expect(stats.emittedBuffs.roar).toBeCloseTo(0.65, 6);
  });

  it('caps Ability Efficiency at 175%', () => {
    const stats = resolve([
      { id: 'streamline', label: 'Streamline', rank: 5, maxRank: 5, frameEffects: [{ stat: 'abilityEfficiency', value: 0.3 }] },
      { id: 'fleeting', label: 'Fleeting Expertise', rank: 5, maxRank: 5, frameEffects: [{ stat: 'abilityEfficiency', value: 0.6 }, { stat: 'abilityDuration', value: -0.6 }] },
    ]);
    // 1 + 0.30 + 0.60 = 1.90 → clamped to 1.75.
    expect(stats.abilityEfficiency).toBe(EFFICIENCY_CAP);
    // Duration trade-off still applies: 1 − 0.60 = 0.40.
    expect(stats.abilityDuration).toBeCloseTo(0.4, 6);
  });

  it('trade-off mods net correctly (Overextended +range/−strength)', () => {
    const stats = resolve([
      { id: 'overextended', label: 'Overextended', rank: 5, maxRank: 5, frameEffects: [{ stat: 'abilityRange', value: 0.9 }, { stat: 'abilityStrength', value: -0.6 }] },
    ]);
    expect(stats.abilityRange).toBeCloseTo(1.9, 6);
    expect(stats.abilityStrength).toBeCloseTo(0.4, 6);
  });
});

describe('resolveWarframe — Umbral set bonus (ADR 0004) at 1/2/3 members', () => {
  const intensify: FrameSource = { id: 'umbral-intensify', label: 'Umbral Intensify', rank: 10, maxRank: 10, customEffectId: 'umbral-intensify', set: 'umbral' };
  const vitality: FrameSource = { id: 'umbral-vitality', label: 'Umbral Vitality', rank: 10, maxRank: 10, customEffectId: 'umbral-vitality', set: 'umbral' };
  const fiber: FrameSource = { id: 'umbral-fiber', label: 'Umbral Fiber', rank: 10, maxRank: 10, customEffectId: 'umbral-fiber', set: 'umbral' };

  it('1 member: base stat only (no set bonus)', () => {
    const stats = resolve([intensify]);
    expect(stats.abilityStrength).toBeCloseTo(1.44, 6); // +44%
  });

  it('2 members: +25%/+30% set bonus on the mod stat', () => {
    const stats = resolve([intensify, vitality]);
    // Intensify: 0.44 × (1+0.25) = 0.55 → strength 1.55.
    expect(stats.abilityStrength).toBeCloseTo(1.55, 6);
    // Vitality: 1.0 × (1+0.30) = 1.30 → health 270 × 2.30 = 621.
    expect(stats.health).toBeCloseTo(621, 3);
  });

  it('3 members: full set bonus (Intensify +77%, Vitality/Fiber +180%)', () => {
    const stats = resolve([intensify, vitality, fiber]);
    expect(stats.abilityStrength).toBeCloseTo(1.77, 6); // 0.44 × 1.75
    expect(stats.health).toBeCloseTo(756, 3); // 270 × (1 + 1.80)
    expect(stats.armor).toBeCloseTo(812, 3); // 290 × (1 + 1.80)
    expect(stats.emittedBuffs.roar).toBeCloseTo(0.885, 6); // 0.5 × 1.77
  });
});

describe('computeEhp', () => {
  it('matches the wiki armor/health model', () => {
    const ehp = computeEhp(100, 0, 300);
    expect(ehp.armorDamageReduction).toBeCloseTo(0.5, 6); // 300/600
    expect(ehp.healthEhp).toBeCloseTo(200, 6); // 100 × (1+300/300)
    expect(ehp.total).toBeCloseTo(200, 6);
  });
});
