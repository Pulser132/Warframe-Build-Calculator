/**
 * Derived selectors. `useDamageResult` runs the engine (calculate + attribution)
 * and recomputes only when the build, combat state, or dataset change identity —
 * a single shared memoized calculator keeps recomputes cheap.
 */
import { useMemo } from 'react';
import { createMemoizedCalc } from '@engine';
import type { DamageResult } from '@engine';
import type { WeaponData } from '@engine/model/types';
import { useBuildStore } from './store';
import { computeResult } from './resolve';
import { computeCapacity, type CapacityInfo } from './capacity';

const sharedCalc = createMemoizedCalc(128);

export function useDamageResult(): DamageResult | null {
  const build = useBuildStore((s) => s.build);
  const combat = useBuildStore((s) => s.combat);
  const dataset = useBuildStore((s) => s.dataset);
  const activeMode = useBuildStore((s) => s.activeMode);
  return useMemo(
    () => (dataset ? computeResult(build, combat, dataset, activeMode, sharedCalc) : null),
    [build, combat, dataset, activeMode],
  );
}

/** The currently-equipped weapon's curated data (or null). */
export function useWeapon(): WeaponData | null {
  const build = useBuildStore((s) => s.build);
  const dataset = useBuildStore((s) => s.dataset);
  return useMemo(
    () => dataset?.weapons.find((w) => w.id === build.weaponId) ?? null,
    [build.weaponId, dataset],
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
