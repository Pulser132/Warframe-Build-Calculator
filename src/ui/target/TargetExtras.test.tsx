import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { applyTarget, type DamageResult, type EnemyData, type TargetState } from '@engine';
import { TargetExtras } from './TargetExtras';

/**
 * TargetExtras renders the target-only readouts (TTK / enemy EHP / status
 * application) from a `TargetResult`. We feed it a real `applyTarget` output so
 * the labels and the direct-only TTK caveat are asserted against live numbers.
 */

const crewman: EnemyData = { id: 'crewman', name: 'Crewman', faction: 'Corpus', baseLevel: 1, health: 60, shield: 150, armor: 0 };
const target: TargetState = { enemyId: 'crewman', level: 1, steelPath: false, armorStripPct: 0, overguard: false };

const intrinsic: DamageResult = {
  perType: { impact: 100 },
  perPelletAverage: 100,
  multishot: 1,
  critChance: 0,
  critMultiplier: 1,
  avgCritMultiplier: 1,
  statusChancePerPellet: 0.2,
  avgProcsPerShot: 0.2,
  fireRate: 5,
  avgHitPerShot: 100,
  burstDps: 500,
  sustainedDps: 350,
  procTypeWeights: { impact: 1 },
  chain: [],
};

describe('TargetExtras', () => {
  it('shows TTK, the enemy EHP layers, and the direct-only TTK caveat', () => {
    const result = applyTarget(intrinsic, target, crewman);
    render(<TargetExtras result={result} />);
    expect(screen.getByText(/TTK \(direct\)/i)).toBeInTheDocument();
    const ehp = screen.getByLabelText(/enemy ehp/i);
    expect(within(ehp).getByText('Shield')).toBeInTheDocument();
    expect(within(ehp).getByText(/EHP \(raw to kill\)/i)).toBeInTheDocument();
    expect(screen.getByText(/excludes status DoT/i)).toBeInTheDocument();
  });

  it('reports status application vs the target', () => {
    const result = applyTarget(intrinsic, target, crewman);
    render(<TargetExtras result={result} />);
    const status = screen.getByLabelText(/status application/i);
    expect(within(status).getByText(/Procs \/ s/i)).toBeInTheDocument();
  });
});
