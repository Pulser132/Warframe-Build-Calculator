import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { WarframeStats } from '@engine';
import { FramePanel } from './FramePanel';

const STATS: WarframeStats = {
  abilityStrength: 1.77,
  abilityDuration: 1,
  abilityRange: 1,
  abilityEfficiency: 1.75,
  health: 756,
  shield: 455,
  armor: 812,
  energy: 100,
  ehp: { armorDamageReduction: 812 / 1112, healthEhp: 756 * (1 + 812 / 300), shield: 455, total: 756 * (1 + 812 / 300) + 455 },
  abilities: [{ id: 'roar', name: 'Roar', strengthMagnitude: 0.885 }],
  emittedBuffs: { roar: 0.885 },
};

describe('FramePanel', () => {
  it('shows the ability attributes (strength capped/efficiency) and emitted Roar', () => {
    render(<FramePanel frameName="Rhino Prime" stats={STATS} />);
    expect(screen.getByText(/Warframe — Rhino Prime/)).toBeInTheDocument();

    const strength = screen.getByText('Ability Strength').parentElement!;
    expect(within(strength).getByText('177.0%')).toBeInTheDocument();
    const efficiency = screen.getByText('Ability Efficiency').parentElement!;
    expect(within(efficiency).getByText('175.0%')).toBeInTheDocument();

    // Emitted Roar magnitude (0.5 × strength).
    expect(screen.getByText('+88.5%')).toBeInTheDocument();
  });

  it('renders the EHP breakdown', () => {
    render(<FramePanel frameName="Rhino Prime" stats={STATS} />);
    const total = screen.getByText('Total EHP').parentElement!;
    // 756 × (1 + 812/300) + 455 ≈ 3257.
    expect(within(total).getByText('3,257')).toBeInTheDocument();
  });
});
