import { describe, it, expect } from 'vitest';
import { followThroughTotal, comboStringBreakdown } from './melee';
import type { ComboString } from '../model/firemode';

describe('follow-through multi-target total', () => {
  it('single target is just the hit', () => {
    expect(followThroughTotal(100, 0.6, 1)).toBe(100);
  });

  it('geometric sum for n targets (FT = 0.6)', () => {
    // 100 × (1 + 0.6 + 0.36) = 196 for 3 targets (docs/.../follow-through.md).
    expect(followThroughTotal(100, 0.6, 3)).toBeCloseTo(196, 6);
  });

  it('FT = 1 (no reduction) → n × hit', () => {
    expect(followThroughTotal(50, 1, 4)).toBe(200);
  });

  it('FT = 0 → only the first target', () => {
    expect(followThroughTotal(50, 0, 4)).toBe(50);
  });
});

describe('combo-string breakdown', () => {
  const combo: ComboString = {
    name: 'Test Combo',
    stance: 'Test Stance',
    hits: [
      { damageMultiplier: 2.0 },
      { damageMultiplier: 0.5, hits: 2 },
      { damageMultiplier: 3.0, forcedProcs: ['impact'] },
    ],
  };

  it('expands repeated hits and computes total / average / dps', () => {
    // baseHit 100, attackSpeed 2/s. Hits: 200, 50, 50, 300 = 600 over 4 hits.
    const r = comboStringBreakdown(combo, 100, 2);
    expect(r.hitCount).toBe(4);
    expect(r.perHit).toEqual([200, 50, 50, 300]);
    expect(r.totalDamage).toBe(600);
    expect(r.averagePerHit).toBeCloseTo(150, 6);
    expect(r.durationSeconds).toBeCloseTo(4 / 2, 6); // 2s
    expect(r.dps).toBeCloseTo(600 / 2, 6); // 300
  });

  it('collects forced procs across hits', () => {
    const r = comboStringBreakdown(combo, 100, 2);
    expect(r.forcedProcs).toContain('impact');
  });
});
