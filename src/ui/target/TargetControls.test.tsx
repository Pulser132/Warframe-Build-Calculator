import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadDataset, type Dataset } from '../../data/loaders';
import { useBuildStore } from '@state';
import { TargetControls } from './TargetControls';

/**
 * TargetControls is the sidebar Target config: featured presets and the override
 * controls flowing into the store. It reads no result (the effective readout
 * lives in the main column), so these tests assert only the store wiring. The
 * numeric routing is verified in the engine (`engine/target/target.test.ts`).
 */

let dataset: Dataset;
const store = () => useBuildStore.getState();

beforeAll(async () => {
  dataset = await loadDataset();
});
beforeEach(() => {
  store().initFromDataset(dataset);
});

describe('TargetControls', () => {
  it('renders the featured presets under a "Target" heading', () => {
    render(<TargetControls />);
    expect(screen.getByRole('heading', { name: /^target$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Charger/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eximus Lancer/i })).toBeInTheDocument();
  });

  it('applies a preset to the store', async () => {
    const user = userEvent.setup();
    render(<TargetControls />);
    await user.click(screen.getByRole('button', { name: /Crewman/i }));
    expect(store().target.enemyId).toBe('crewman');
  });

  it('the armor-strip slider drives the store', () => {
    render(<TargetControls />);
    const slider = screen.getByLabelText(/armor strip/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(store().target.armorStripPct).toBe(0.5);
  });

  it('the Eximus / Overguard toggle drives the store', async () => {
    const user = userEvent.setup();
    render(<TargetControls />);
    await user.click(screen.getByLabelText(/overguard/i));
    expect(store().target.overguard).toBe(true);
  });

  it('exposes a custom stat block when Custom is selected', async () => {
    const user = userEvent.setup();
    render(<TargetControls />);
    await user.selectOptions(screen.getByLabelText(/^enemy$/i), 'custom');
    expect(screen.getByLabelText(/custom health/i)).toBeInTheDocument();
  });
});
