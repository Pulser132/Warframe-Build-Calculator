import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadDataset, type Dataset } from '../../data/loaders';
import { useBuildStore } from '@state';
import { ConfigMenu } from './ConfigMenu';

/**
 * ConfigMenu tests assert what the user observes in this panel: which toggles
 * exist, that they flip, which stack sliders appear, and the frame-derived buff
 * magnitude it displays. The DPS consequences of these toggles (Bane ×1.3, Roar
 * +50%, Molt Augmented strength) are engine behavior verified at the store level
 * in `state/store.test.ts` / `state/warframe.test.ts` — not re-asserted here.
 */

let dataset: Dataset;
const store = () => useBuildStore.getState();

beforeAll(async () => {
  dataset = await loadDataset();
});
beforeEach(() => {
  store().initFromDataset(dataset);
});

/** The Roar buff row's displayed magnitude (e.g. "+50%"), as a number. */
function roarMagnitudePct(): number {
  const checkbox = screen.getByRole('checkbox', { name: /Roar.*active/i });
  const row = checkbox.closest('label')!;
  const match = row.textContent!.match(/\+(\d+)%/);
  if (!match) throw new Error(`no magnitude in Roar row: "${row.textContent}"`);
  return Number(match[1]);
}

describe('ConfigMenu', () => {
  it('renders the registry-driven external buff (Roar) and the faction conditional', () => {
    render(<ConfigMenu />);
    expect(screen.getByText(/Roar/i)).toBeInTheDocument();
    expect(screen.getByText(/Enemy faction: Grineer/i)).toBeInTheDocument();
  });

  it('toggles the enemy-faction conditional', async () => {
    const user = userEvent.setup();
    render(<ConfigMenu />);
    const checkbox = screen.getByRole('checkbox', { name: /Enemy faction: Grineer/i });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('toggles the Roar ability buff and shows its frame-derived magnitude', async () => {
    const user = userEvent.setup();
    render(<ConfigMenu />);
    const checkbox = screen.getByRole('checkbox', { name: /Roar.*active/i });
    expect(checkbox).not.toBeChecked();
    // Rhino Prime emits Roar at +50% (0.5 × 100% strength) — shown from the frame.
    expect(roarMagnitudePct()).toBe(50);
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
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

  it('raising Molt Augmented stacks increases the displayed frame-derived Roar magnitude', () => {
    store().setActiveCompartment('warframe');
    store().assignMod(10, 'molt-augmented');
    render(<ConfigMenu />);

    const before = roarMagnitudePct(); // 50% at 0 stacks (base strength)
    const slider = screen.getByLabelText(/Molt Augmented stacks/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: slider.max } }); // full strength stacks
    expect(roarMagnitudePct()).toBeGreaterThan(before);
  });
});
