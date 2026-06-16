import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DamageResult } from '@engine';
import { DamageSummary } from './DamageSummary';
import { ContributionList } from './ContributionList';
import { PipelineChain } from './PipelineChain';

const RESULT: DamageResult = {
  perType: { impact: 4.64, puncture: 32.46, slash: 55.65, corrosive: 166.95 },
  perPelletAverage: 259.7,
  multishot: 1.9,
  critChance: 0.3,
  critMultiplier: 4.4,
  avgCritMultiplier: 2.02,
  statusChancePerPellet: 0.494,
  avgProcsPerShot: 0.9386,
  fireRate: 15.33,
  avgHitPerShot: 996.7,
  burstDps: 15283,
  sustainedDps: 10617,
  chain: [
    { id: 'base', label: 'Base + Elemental', detail: '× (1 + 1.65) base damage; elements combined' },
    { id: 'multishot', label: 'Multishot', detail: '1 × (1 + 0.90) = 1.900 pellets' },
    { id: 'dps', label: 'DPS', detail: 'burst 15283 → sustained 10617' },
  ],
  contributions: [
    { sourceId: 'serration', label: 'Serration', dpsDelta: 6000, fraction: 0.39 },
    { sourceId: 'split-chamber', label: 'Split Chamber', dpsDelta: 7200, fraction: 0.47 },
  ],
};

describe('DamageSummary', () => {
  it('renders headline DPS and per-type damage', () => {
    render(<DamageSummary result={RESULT} />);
    expect(screen.getByText('Burst DPS')).toBeInTheDocument();
    expect(screen.getByText('15,283')).toBeInTheDocument();
    expect(screen.getByText('Sustained DPS')).toBeInTheDocument();
    expect(screen.getByText('Corrosive')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument(); // crit chance
  });

  it('lists the achievable crit tiers with per-pellet damage and odds', () => {
    render(<DamageSummary result={RESULT} />);
    expect(screen.getByLabelText('crit tiers')).toBeInTheDocument();
    // 30% crit chance → tier 0 (non-crit, 70%) and tier 1 (crit, 30%); no orange/red.
    expect(screen.getByText('Non-crit')).toBeInTheDocument();
    expect(screen.getByText('Crit')).toBeInTheDocument();
    expect(screen.queryByText('Orange crit')).not.toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    // tier 0 per pellet = 259.7 / 2.02 ≈ 128.6; tier 1 = ×4.4 ≈ 565.7.
    expect(screen.getByText('128.6')).toBeInTheDocument();
    expect(screen.getByText('565.7')).toBeInTheDocument();
  });

  it('renders the beam panel for a continuous weapon', () => {
    const beam: DamageResult = {
      ...RESULT,
      multishot: 1,
      ammoPerShot: 0.5,
      beam: { tickRate: 12, perTickDamage: 33.06, procsPerSecond: 4.56, rampStartPct: 0.2, rampSeconds: 0.6 },
    };
    render(<DamageSummary result={beam} />);
    expect(screen.getByLabelText('beam stats')).toBeInTheDocument();
    expect(screen.getByText('Per-tick Dmg')).toBeInTheDocument();
    expect(screen.getByText('Tick Rate')).toBeInTheDocument(); // fire-rate relabeled
    expect(screen.getByText(/ramps from 20% to 100%/i)).toBeInTheDocument();
  });

  it('renders the AoE panel with center/rim for a radial weapon', () => {
    const aoe: DamageResult = {
      ...RESULT,
      multishot: 1,
      components: [
        { name: 'Direct', role: 'direct', delivery: 'projectile', perType: { puncture: 103 }, perPelletAverage: 103 },
        { name: 'Radial', role: 'radial', delivery: 'aoe', perType: { blast: 894 }, perPelletAverage: 894 },
      ],
      aoe: {
        falloffStart: 0,
        radius: 7,
        centerAverage: 893.75,
        rimAverage: 625.6,
        centerPerType: { blast: 893.75 },
        rimPerType: { blast: 625.6 },
      },
    };
    render(<DamageSummary result={aoe} />);
    expect(screen.getByLabelText('aoe stats')).toBeInTheDocument();
    expect(screen.getByText('Center')).toBeInTheDocument();
    expect(screen.getByText('Edge (rim)')).toBeInTheDocument();
    expect(screen.getByText('Direct hit')).toBeInTheDocument();
  });
});

describe('ContributionList', () => {
  it('lists each mod with its delta and the honest sum caveat', () => {
    render(<ContributionList contributions={RESULT.contributions!} />);
    expect(screen.getByText('Serration')).toBeInTheDocument();
    expect(screen.getByText('Split Chamber')).toBeInTheDocument();
    expect(screen.getByText('+6,000')).toBeInTheDocument();
    expect(screen.getByText(/need not sum to 100%/i)).toBeInTheDocument();
  });
});

describe('PipelineChain', () => {
  it('is collapsed by default and expands to show stages', async () => {
    const user = userEvent.setup();
    render(<PipelineChain result={RESULT} />);
    expect(screen.queryByText('Base + Elemental')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /pipeline breakdown/i }));
    expect(screen.getByText('Base + Elemental')).toBeInTheDocument();
    expect(screen.getByText('Multishot')).toBeInTheDocument();
  });
});
