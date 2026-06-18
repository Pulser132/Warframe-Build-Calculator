import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadDataset, type Dataset } from '../../data/loaders';
import { useBuildStore } from '@state';
import { computeResult } from '@state';
import { ConfigMenu } from './ConfigMenu';

let dataset: Dataset;
const store = () => useBuildStore.getState();
const dps = () => computeResult(store().build, store().combat, dataset)!.burstDps;

beforeAll(async () => {
  dataset = await loadDataset();
});
beforeEach(() => {
  store().initFromDataset(dataset);
});

describe('ConfigMenu', () => {
  it('renders the registry-driven external buff (Roar)', () => {
    render(<ConfigMenu />);
    expect(screen.getByText(/Roar/i)).toBeInTheDocument();
    expect(screen.getByText(/Enemy faction: Grineer/i)).toBeInTheDocument();
  });

  it('toggling the faction conditional changes the computed DPS when Bane is equipped', async () => {
    const user = userEvent.setup();
    store().assignMod(2, 'bane-of-grineer');
    render(<ConfigMenu />);
    const before = dps();
    await user.click(screen.getByRole('checkbox', { name: /Enemy faction: Grineer/i }));
    expect(store().combat.conditions['faction:grineer']).toBe(true);
    expect(dps()).toBeCloseTo(before * 1.3, 0);
  });

  it('enabling Roar raises DPS through the engine', async () => {
    const user = userEvent.setup();
    render(<ConfigMenu />);
    const before = dps();
    await user.click(screen.getByRole('checkbox', { name: /Roar/i }));
    expect(store().combat.buffs.some((b) => b.id === 'roar')).toBe(true);
    expect(dps()).toBeGreaterThan(before);
  });

  it('shows a stacks slider when a stacking arcane is equipped', () => {
    store().assignMod(10, 'primary-merciless'); // arcane slot
    render(<ConfigMenu />);
    expect(screen.getByLabelText(/Primary Merciless stacks/i)).toBeInTheDocument();
  });

  it('shows a stacks slider for a per-stack frame arcane (Molt Augmented)', () => {
    store().setActiveCompartment('warframe');
    store().assignMod(10, 'molt-augmented'); // frame arcane slot
    render(<ConfigMenu />);
    expect(screen.getByLabelText(/Molt Augmented stacks/i)).toBeInTheDocument();
  });

  it('Molt Augmented stacks raise the frame-derived Roar through the engine', async () => {
    const user = userEvent.setup();
    store().setActiveCompartment('warframe');
    store().assignMod(10, 'molt-augmented');
    render(<ConfigMenu />);
    await user.click(screen.getByRole('checkbox', { name: /Roar/i })); // toggle Roar on
    const before = dps();
    store().setStacks('arcane:molt-augmented', 250); // +60% strength → bigger Roar
    expect(dps()).toBeGreaterThan(before);
  });
});
