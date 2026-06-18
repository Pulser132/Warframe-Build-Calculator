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

  // ── Stage 5: registry-driven groups, filter, kinds ──

  it('groups rows into collapsible sections from the registry', () => {
    render(<ConfigMenu />);
    // The buff group + the enemy-conditional group are always present.
    expect(screen.getByText(/Frame & ability buffs/i)).toBeInTheDocument();
    expect(screen.getByText(/Enemy & conditionals/i)).toBeInTheDocument();
    // Both render inside a collapsible <details>.
    expect(screen.getByText(/Frame & ability buffs/i).closest('details')).toBeInTheDocument();
  });

  it('renders Eclipse as an independent-multiplier buff (new ADR-0005 bucket)', () => {
    render(<ConfigMenu />);
    expect(screen.getByRole('checkbox', { name: /Eclipse.*active/i })).toBeInTheDocument();
  });

  it('text filter narrows the visible rows', async () => {
    const user = userEvent.setup();
    render(<ConfigMenu />);
    expect(screen.getByRole('checkbox', { name: /Roar.*active/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/filter combat state/i), 'eclipse');
    // Roar is filtered out; Eclipse remains.
    expect(screen.queryByRole('checkbox', { name: /Roar.*active/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Eclipse.*active/i })).toBeInTheDocument();
  });

  it('shows a manual-magnitude input for a buff with no frame source (Eclipse)', () => {
    // No Mirage / eclipse scaling in the dataset → Eclipse is manual-magnitude.
    render(<ConfigMenu />);
    expect(screen.getByLabelText(/Eclipse.*manual magnitude/i)).toBeInTheDocument();
    // Roar IS frame-derived (Rhino Prime) → no manual input, shows the frame hint.
    expect(screen.queryByLabelText(/Roar.*manual magnitude/i)).not.toBeInTheDocument();
  });

  it('renders discovered stacks as a stepper (Primary Merciless)', async () => {
    const user = userEvent.setup();
    store().assignMod(10, 'primary-merciless');
    render(<ConfigMenu />);
    const input = screen.getByLabelText(/Primary Merciless stacks/i) as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'number');
    await user.click(screen.getByRole('button', { name: /increase Primary Merciless/i }));
    expect(Number(input.value)).toBe(1);
  });
});
