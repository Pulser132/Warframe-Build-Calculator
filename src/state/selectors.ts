/**
 * Derived selectors. `useDamageResult` runs the engine (calculate + attribution)
 * and recomputes only when the build, combat state, or dataset change identity —
 * a single shared memoized calculator keeps recomputes cheap.
 */
import { useMemo } from 'react';
import { createMemoizedCalc } from '@engine';
import type { DamageResult } from '@engine';
import { useBuildStore } from './store';
import { computeResult } from './resolve';
import { computeCapacity, type CapacityInfo } from './capacity';

const sharedCalc = createMemoizedCalc(128);

export function useDamageResult(): DamageResult | null {
  const build = useBuildStore((s) => s.build);
  const combat = useBuildStore((s) => s.combat);
  const dataset = useBuildStore((s) => s.dataset);
  return useMemo(
    () => (dataset ? computeResult(build, combat, dataset, sharedCalc) : null),
    [build, combat, dataset],
  );
}

export function useCapacity(): CapacityInfo | null {
  const build = useBuildStore((s) => s.build);
  const dataset = useBuildStore((s) => s.dataset);
  return useMemo(() => {
    if (!dataset) return null;
    const modsById = new Map(dataset.mods.map((m) => [m.id, m]));
    return computeCapacity(build, modsById);
  }, [build, dataset]);
}
