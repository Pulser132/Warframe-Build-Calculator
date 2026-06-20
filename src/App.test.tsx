import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /warframe build calculator/i })).toBeInTheDocument();
  });

  it('defaults to the Build readout, with Combat State + Target always in the sidebar', async () => {
    render(<App />);
    const build = await screen.findByLabelText('build output');
    expect(within(build).getByRole('heading', { name: /^damage$/i })).toBeInTheDocument();
    // The vs-Target-only extras block is absent in Build mode.
    expect(screen.queryByLabelText('target extras')).not.toBeInTheDocument();
    // Sidebar shows both config panels regardless of the toggle.
    expect(screen.getByRole('heading', { name: /combat state/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^target$/i })).toBeInTheDocument();
  });

  it('the "vs Target" switch swaps to the effective readout (same DamageSummary + TargetExtras)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText('build output');
    await user.click(screen.getByRole('switch', { name: /vs target/i }));
    const vs = await screen.findByLabelText('vs target output');
    // The same DamageSummary renders the effective view…
    expect(within(vs).getByRole('heading', { name: /^damage$/i })).toBeInTheDocument();
    // …with the target-only extras appended, and the Build readout gone.
    expect(screen.getByLabelText('target extras')).toBeInTheDocument();
    expect(screen.queryByLabelText('build output')).not.toBeInTheDocument();
  });
});
