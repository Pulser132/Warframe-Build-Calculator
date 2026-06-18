import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadDataset, type Dataset } from '../../data/loaders';
import { useBuildStore } from '@state';
import { ModdingScreen } from './ModdingScreen';

let dataset: Dataset;

beforeAll(async () => {
  dataset = await loadDataset();
});

beforeEach(() => {
  useBuildStore.getState().initFromDataset(dataset);
});

describe('ModdingScreen', () => {
  it('renders the 11-slot gun layout with the weapon picker', () => {
    render(<ModdingScreen />);
    const picker = screen.getByLabelText('select weapon') as HTMLSelectElement;
    const selected = picker.options[picker.selectedIndex];
    expect(selected.textContent).toBe('Vulkar Wraith');
    // exilus + 8 normal + 2 arcane = 11 slot buttons (guns have no aura — Stage 4).
    const slots = screen.getAllByRole('button').filter((b) => {
      const label = b.getAttribute('aria-label') ?? '';
      return /slot/i.test(label) && !/polarize/i.test(label);
    });
    expect(slots.length).toBe(11);
  });

  it('assigns a mod through the picker and shows it in the slot', async () => {
    const user = userEvent.setup();
    render(<ModdingScreen />);

    // Open the first normal mod slot.
    const emptyNormal = screen.getAllByRole('button', { name: /empty Mod slot/i })[0];
    await user.click(emptyNormal);

    // Picker dialog opens; search and pick Serration.
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('search mods'), 'serration');
    await user.click(within(dialog).getByRole('button', { name: /Serration/i }));

    // The slot now shows Serration assigned at max rank.
    const filled = screen.getByLabelText('Mod slot: Serration');
    expect(within(filled).getByText('Serration')).toBeInTheDocument();
    expect(within(filled).getByLabelText('rank 10 of 10')).toBeInTheDocument();
  });

  it('removes a mod via the slot clear button', async () => {
    const user = userEvent.setup();
    useBuildStore.getState().assignMod(2, 'serration');
    render(<ModdingScreen />);
    expect(screen.getByText('Serration')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove mod/i }));
    expect(screen.queryByText('Serration')).not.toBeInTheDocument();
  });

  it('switches weapons via the picker and updates the type label', async () => {
    const user = userEvent.setup();
    render(<ModdingScreen />);
    await user.selectOptions(screen.getByLabelText('select weapon'), 'lex-prime');
    // The type label reflects the newly selected secondary.
    expect(screen.getByText(/Secondary · Pistol/)).toBeInTheDocument();
  });

  it('filters the mod picker by weapon class (pistol mods on a secondary)', async () => {
    const user = userEvent.setup();
    useBuildStore.getState().selectWeapon('lex-prime');
    render(<ModdingScreen />);
    const emptyNormal = screen.getAllByRole('button', { name: /empty Mod slot/i })[0];
    await user.click(emptyNormal);
    const dialog = screen.getByRole('dialog');
    // Hornet Strike (pistol) is offered; Serration (rifle) is not.
    expect(within(dialog).getByRole('button', { name: /Hornet Strike/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^Serration/i })).not.toBeInTheDocument();
  });

  it('shows a fire-mode switcher for multi-mode weapons and switches modes', async () => {
    const user = userEvent.setup();
    useBuildStore.getState().selectWeapon('stradavar-prime');
    render(<ModdingScreen />);
    const tablist = screen.getByRole('tablist', { name: /fire modes/i });
    const semi = within(tablist).getByRole('tab', { name: 'Semi-Auto Mode' });
    // Full Auto is selected by default; clicking selects Semi-Auto.
    expect(within(tablist).getByRole('tab', { name: 'Full Auto Mode' })).toHaveAttribute('aria-selected', 'true');
    await user.click(semi);
    expect(semi).toHaveAttribute('aria-selected', 'true');
    expect(within(tablist).getByRole('tab', { name: 'Full Auto Mode' })).toHaveAttribute('aria-selected', 'false');
  });

  it('hides the fire-mode switcher for single-mode weapons', () => {
    useBuildStore.getState().selectWeapon('lex-prime');
    render(<ModdingScreen />);
    expect(screen.queryByRole('tablist', { name: /fire modes/i })).not.toBeInTheDocument();
  });

  it('switches to the Warframe compartment and shows the frame layout + aura slot', async () => {
    const user = userEvent.setup();
    render(<ModdingScreen />);
    const switcher = screen.getByRole('tablist', { name: /gear compartment/i });
    const frameTab = within(switcher).getByRole('tab', { name: 'Warframe' });
    await user.click(frameTab);
    expect(frameTab).toHaveAttribute('aria-selected', 'true');
    // The frame picker shows the reference frame; the frame keeps its aura slot.
    const picker = screen.getByLabelText('select warframe') as HTMLSelectElement;
    expect(picker.options[picker.selectedIndex].textContent).toBe('Rhino Prime');
    const slots = screen.getAllByRole('button').filter((b) => {
      const label = b.getAttribute('aria-label') ?? '';
      return /slot/i.test(label) && !/polarize/i.test(label);
    });
    expect(slots.length).toBe(12); // aura + exilus + 8 normal + 2 arcane
  });

  it('offers only Warframe mods in the frame mod picker', async () => {
    const user = userEvent.setup();
    render(<ModdingScreen />);
    await user.click(
      within(screen.getByRole('tablist', { name: /gear compartment/i })).getByRole('tab', {
        name: 'Warframe',
      }),
    );
    // Open a normal frame slot.
    const emptyNormal = screen.getAllByRole('button', { name: /empty Mod slot/i })[0];
    await user.click(emptyNormal);
    const dialog = screen.getByRole('dialog');
    // Warframe mods are offered (Intensify + Umbral Intensify both match)…
    expect(within(dialog).getAllByRole('button', { name: /Intensify/i }).length).toBeGreaterThan(0);
    // …and weapon mods are not.
    expect(within(dialog).queryByRole('button', { name: /^Serration/i })).not.toBeInTheDocument();
  });
});
