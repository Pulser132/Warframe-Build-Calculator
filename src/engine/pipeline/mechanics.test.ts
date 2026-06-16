import { describe, it, expect } from 'vitest';
import { probAtLeastOneProc, procTypeWeights, falloffFactor, rimFactor } from './mechanics';
import type { FalloffSpec } from '../model/firemode';

describe('probAtLeastOneProc — P(≥1) = 1 − (1 − s)^N', () => {
  it('matches the shotguns.md worked example (N=19, s=0.30 → ~0.999)', () => {
    expect(probAtLeastOneProc(0.3, 19)).toBeCloseTo(0.9989, 3);
  });

  it('Vaykor Hek unmodded (N=7, s=0.107)', () => {
    expect(probAtLeastOneProc(0.107, 7)).toBeCloseTo(1 - Math.pow(0.893, 7), 6);
  });

  it('s ≥ 1 guarantees a proc', () => {
    expect(probAtLeastOneProc(1.2, 5)).toBe(1);
  });

  it('zero pellets → zero', () => {
    expect(probAtLeastOneProc(0.5, 0)).toBe(0);
  });
});

describe('procTypeWeights — element share of total damage', () => {
  it('weights each type by its damage fraction', () => {
    const w = procTypeWeights({ slash: 75, blast: 25 });
    expect(w.slash).toBeCloseTo(0.75, 6);
    expect(w.blast).toBeCloseTo(0.25, 6);
  });

  it('empty map → empty weights', () => {
    expect(procTypeWeights({})).toEqual({});
  });
});

describe('falloffFactor — linear interpolation (vs aoe-falloff.md)', () => {
  // Grenade: center 100%, radius 5m, default 90% reduction.
  const radial: FalloffSpec = { start: 0, end: 5, maxReduction: 0.9 };

  it('full at/below the start distance', () => {
    expect(falloffFactor(radial, 0)).toBeCloseTo(1, 6);
  });

  it('half-radius interpolation (2.5m → 0.55)', () => {
    expect(falloffFactor(radial, 2.5)).toBeCloseTo(0.55, 6);
  });

  it('rim floor at/beyond the end distance (5m → 0.10)', () => {
    expect(falloffFactor(radial, 5)).toBeCloseTo(0.1, 6);
    expect(falloffFactor(radial, 8)).toBeCloseTo(0.1, 6);
  });

  it('projectile example: 200 base, 10–30m, 80% reduction', () => {
    const proj: FalloffSpec = { start: 10, end: 30, maxReduction: 0.8 };
    expect(falloffFactor(proj, 15)).toBeCloseTo(0.8, 6);
    expect(falloffFactor(proj, 20)).toBeCloseTo(0.6, 6);
  });

  it('rimFactor = 1 − maxReduction (Tonkor radial 0.3 → 0.7)', () => {
    expect(rimFactor({ start: 0, end: 7, maxReduction: 0.3 })).toBeCloseTo(0.7, 6);
  });
});
