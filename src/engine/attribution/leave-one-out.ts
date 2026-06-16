/**
 * Leave-one-out (marginal) attribution — the Stage 1 default.
 *
 * For each equipped source, recompute the build with that source removed; its
 * contribution is `totalDPS − totalDPS_without`, exposed as a burst-DPS delta and
 * a fraction of total. Sorted biggest-first.
 *
 * ⚠️ Contributions **need not sum to 100%**: buckets multiply, so the marginal
 * value of each source depends on the others (e.g. crit and base damage amplify
 * each other). This is intentional and surfaced honestly in the UI.
 */
import type { Contribution } from '../model/result';
import type { AttributionStrategy, AttributionInput, CalcFn } from './strategy';

export const leaveOneOut: AttributionStrategy = {
  id: 'leave-one-out',
  attribute(input: AttributionInput, calc: CalcFn): Contribution[] {
    const { weapon, sources, combat, mode } = input;
    const total = calc({ weapon, sources, combat, mode }).burstDps;

    const contributions = sources.map((source): Contribution => {
      const without = sources.filter((s) => s !== source);
      const withoutDps = calc({ weapon, sources: without, combat, mode }).burstDps;
      const dpsDelta = total - withoutDps;
      return {
        sourceId: source.id,
        label: source.label,
        dpsDelta,
        fraction: total > 0 ? dpsDelta / total : 0,
      };
    });

    return contributions.sort((a, b) => b.dpsDelta - a.dpsDelta);
  },
};
