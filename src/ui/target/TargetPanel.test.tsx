import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadDataset, type Dataset } from '../../data/loaders';
import { useBuildStore } from '@state';
import { TargetPanel } from './TargetPanel';

/**
 * TargetPanel tests assert what the user observes: the featured presets, the
 * override controls flowing into the store, the effective/TTK readout, and the
 * vs-target attribution toggle. The numeric routing is verified in the engine
 * (`engine/target/target.test.ts`) and store (`state/store.test.ts`).
 */

let dataset: Dataset;
const store = () => useBuildStore.getState();

beforeAll(async () => {
  dataset = await loadDataset();
});
beforeEach(() => {
  store().initFromDataset(dataset);
});

describe('TargetPanel', () => {
  it('renders featured presets and the direct-only TTK caveat', () => {
    render(<TargetPanel />);
    expect(screen.getByRole('button', { name: /Charger/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eximus Lancer/i })).toBeInTheDocument();
    expect(screen.getByText(/excludes status DoT/i)).toBeInTheDocument();
  });

  it('applies a preset to the store', async () => {
    const user = userEvent.setup();
    render(<TargetPanel />);
    await user.click(screen.getByRole('button', { name: /Crewman/i }));
    expect(store().target.enemyId).toBe('crewman');
  });

  it('the armor-strip slider drives the store', () => {
    render(<TargetPanel />);
    const slider = screen.getByLabelText(/armor strip/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(store().target.armorStripPct).toBe(0.5);
  });

  it('the Eximus toggle adds an Overguard pool to the readout', async () => {
    const user = userEvent.setup();
    render(<TargetPanel />);
    await user.click(screen.getByLabelText(/overguard/i));
    expect(store().target.overguard).toBe(true);
  });

  it('reveals the vs-target contribution list when toggled', async () => {
    const user = userEvent.setup();
    store().assignMod(1, 'serration');
    render(<TargetPanel />);
    expect(screen.queryByLabelText(/mod contributions/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/contribution vs this target/i));
    const list = screen.getByLabelText(/mod contributions/i);
    expect(within(list).getByText(/Serration/i)).toBeInTheDocument();
  });

  it('shows an effective crit-tier breakdown', () => {
    // Vulkar Wraith crits (20% / ×2) → the breakdown shows the Non-crit + Crit tiers.
    render(<TargetPanel />);
    const tiers = screen.getByLabelText(/effective crit tiers/i);
    expect(within(tiers).getByText(/Non-crit/i)).toBeInTheDocument();
    expect(within(tiers).getByText(/^Crit$/i)).toBeInTheDocument();
  });

  it('exposes a custom stat block when Custom is selected', async () => {
    const user = userEvent.setup();
    render(<TargetPanel />);
    await user.selectOptions(screen.getByLabelText(/^enemy$/i), 'custom');
    expect(screen.getByLabelText(/custom health/i)).toBeInTheDocument();
  });
});
