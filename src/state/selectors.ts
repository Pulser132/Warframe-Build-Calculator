/**
 * Derived selectors. `useDamageResult` runs the engine (calculate + attribution)
 * and recomputes only when the build, combat state, or dataset change identity —
 * a single shared memoized calculator keeps recomputes cheap. `useWarframeStats`
 * runs the frame resolver for the equipped Warframe compartment (Stage 4).
 */
import { useMemo } from 'react';
import { createMemoizedCalc } from '@engine';
import type { DamageResult, WarframeStats, TargetResult, Contribution, EnemyData } from '@engine';
import type { GearBuild } from '@engine/model/build';
import type { WarframeData, WeaponData } from '@engine/model/types';
import { useBuildStore } from './store';
import { computeResult, computeTargetResult, resolveFrameStats } from './resolve';
import { buildEffectiveProjection } from './effective';
import { computeCapacity, type CapacityInfo } from './capacity';

const sharedCalc = createMemoizedCalc(128);

export function useDamageResult(): DamageResult | null {
  const build = useBuildStore((s) => s.build);
  const combat = useBuildStore((s) => s.combat);
  const dataset = useBuildStore((s) => s.dataset);
  const activeMode = useBuildStore((s) => s.activeMode);
  const activeComboString = useBuildStore((s) => s.activeComboString);
  return useMemo(
    () =>
      dataset
        ? computeResult(build, combat, dataset, activeMode, sharedCalc, activeComboString)
        : null,
    [build, combat, dataset, activeMode, activeComboString],
  );
}

/**
 * The post-intrinsic Target result (effective dmg / DPS / TTK / EHP). When
 * `withAttribution` is true, also returns the vs-target contributions.
 */
export function useTargetResult(withAttribution = false): {
  intrinsic: DamageResult;
  result: TargetResult;
  contributions?: Contribution[];
} | null {
  const build = useBuildStore((s) => s.build);
  const combat = useBuildStore((s) => s.combat);
  const target = useBuildStore((s) => s.target);
  const dataset = useBuildStore((s) => s.dataset);
  const activeMode = useBuildStore((s) => s.activeMode);
  const activeComboString = useBuildStore((s) => s.activeComboString);
  return useMemo(
    () =>
      dataset
        ? computeTargetResult(
            build,
            combat,
            target,
            dataset,
            activeMode,
            sharedCalc,
            activeComboString,
            withAttribution,
          )
        : null,
    [build, combat, target, dataset, activeMode, activeComboString, withAttribution],
  );
}

/**
 * The vs-Target readout: the post-intrinsic `TargetResult`, its vs-target
 * contributions, and the **effective projection** (decision 9) — a synthetic
 * `DamageResult` the shared `DamageSummary` renders for the effective view.
 */
export function useEffectiveResult(): {
  projection: DamageResult;
  result: TargetResult;
  contributions?: Contribution[];
} | null {
  const data = useTargetResult(true);
  return useMemo(() => {
    if (!data) return null;
    return {
      projection: buildEffectiveProjection(data.intrinsic, data.result),
      result: data.result,
      contributions: data.contributions,
    };
  }, [data]);
}

/** The loaded enemy dataset (for the Target picker). */
export function useEnemies(): EnemyData[] {
  const dataset = useBuildStore((s) => s.dataset);
  return dataset?.enemies ?? [];
}

/** The currently-equipped weapon's curated data (or null). */
export function useWeapon(): WeaponData | null {
  const build = useBuildStore((s) => s.build);
  const dataset = useBuildStore((s) => s.dataset);
  return useMemo(
    () => dataset?.weapons.find((w) => w.id === build.weapon.itemId) ?? null,
    [build.weapon.itemId, dataset],
  );
}

/** The currently-equipped Warframe's curated data (or null when none). */
export function useWarframe(): WarframeData | null {
  const build = useBuildStore((s) => s.build);
  const dataset = useBuildStore((s) => s.dataset);
  return useMemo(
    () => dataset?.warframes.find((f) => f.id === build.warframe?.itemId) ?? null,
    [build.warframe?.itemId, dataset],
  );
}

/** The active compartment's gear build (`null` for an empty warframe). */
export function useActiveGear(): GearBuild | null {
  const build = useBuildStore((s) => s.build);
  const activeCompartment = useBuildStore((s) => s.activeCompartment);
  return activeCompartment === 'weapon' ? build.weapon : build.warframe;
}

/** Resolved frame stats (ability attributes / EHP / emitted buffs), or null.
 * Depends on combat state — per-stack frame arcanes (Molt Augmented) read it. */
export function useWarframeStats(): WarframeStats | null {
  const build = useBuildStore((s) => s.build);
  const combat = useBuildStore((s) => s.combat);
  const dataset = useBuildStore((s) => s.dataset);
  return useMemo(
    () => (dataset ? resolveFrameStats(build.warframe, dataset, combat) : null),
    [build.warframe, combat, dataset],
  );
}

/** Mod capacity for the **active** compartment. */
export function useCapacity(): CapacityInfo | null {
  const dataset = useBuildStore((s) => s.dataset);
  const gear = useActiveGear();
  return useMemo(() => {
    if (!dataset || !gear) return null;
    const modsById = new Map(dataset.mods.map((m) => [m.id, m]));
    return computeCapacity(gear, modsById);
  }, [gear, dataset]);
}
