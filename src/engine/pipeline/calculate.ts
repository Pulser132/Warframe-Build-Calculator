/**
 * `calculateBuild` — assemble the ordered stages into a full `DamageResult`.
 *
 * Pure: consumes a `Gun` (gear instance) + resolved sources + combat state and
 * returns numbers + the labeled chain. The store resolves a `Build` into these
 * inputs; the engine never touches the data loaders or the store.
 */
import type { CombatState } from '../model/build';
import type { DamageMap, DamageResult } from '../model/result';
import type { DamageType } from '../model/types';
import type { Gun } from '../gear/weapon';
import { gatherBuckets, type ResolvedSource } from './gather';
import {
  baseElementalStage,
  quantizeStage,
  multishotStage,
  critStage,
  statusStage,
  fireRateStage,
  conditionalMultiplierStage,
  sumDamage,
} from './stages';

export interface CalcInput {
  weapon: Gun;
  /** Equipped mods + arcanes + active external buffs, in load order. */
  sources: readonly ResolvedSource[];
  combat: CombatState;
}

export function calculateBuild(input: CalcInput): DamageResult {
  const { weapon, sources, combat } = input;
  const sums = gatherBuckets(sources, combat);

  // Stage 1 — base + elemental subtotal (pre-crit, pre-conditional).
  const { perType: subtotalPerType, stage: baseStage } = baseElementalStage(
    weapon.baseDamage(),
    weapon.totalBaseDamage,
    sums,
  );

  // Stage 1b — quantization. Round each type to base/32 (scaled by the base-damage
  // multiply already folded into the subtotal) before any further multipliers.
  const quantum = (weapon.totalBaseDamage / 32) * (1 + sums.baseDamage);
  const { perType: quantizedPerType, stage: quantStage } = quantizeStage(subtotalPerType, quantum);

  // Stage 2 — multishot.
  const { multishot, stage: msStage } = multishotStage(weapon.baseMultishot, sums);

  // Stage 3 — critical (average).
  const { critChance, critMultiplier, avgCritMultiplier, stage: critS } = critStage(
    weapon.baseCritChance,
    weapon.baseCritMultiplier,
    sums,
  );

  // Stage 4 — status.
  const { statusChancePerPellet, avgProcsPerShot, stage: statusS } = statusStage(
    weapon.baseStatusChance,
    multishot,
    sums,
  );

  // Stage 5 — fire rate.
  const { fireRate, stage: frStage } = fireRateStage(weapon.fireRate, sums);

  // Stage 6 — conditional multipliers.
  const { factionMultiplier, directMultiplier, stage: condStage } =
    conditionalMultiplierStage(sums);

  // Assemble final per-type average (crit-weighted + conditional multipliers).
  const finalMult = avgCritMultiplier * factionMultiplier * directMultiplier;
  const perType: DamageMap = {};
  for (const type of Object.keys(quantizedPerType) as DamageType[]) {
    perType[type] = (quantizedPerType[type] ?? 0) * finalMult;
  }

  const perPelletAverage = sumDamage(perType);
  const avgHitPerShot = perPelletAverage * multishot;
  const burstDps = avgHitPerShot * fireRate;

  // Sustained DPS folds in reload: burst × (magTime / (magTime + reload)).
  const magTime = fireRate > 0 ? weapon.magazine / fireRate : 0;
  const cycle = magTime + weapon.reload;
  const sustainedDps = cycle > 0 ? burstDps * (magTime / cycle) : burstDps;

  return {
    perType,
    perPelletAverage,
    multishot,
    critChance,
    critMultiplier,
    avgCritMultiplier,
    statusChancePerPellet,
    avgProcsPerShot,
    fireRate,
    avgHitPerShot,
    burstDps,
    sustainedDps,
    chain: [
      baseStage,
      quantStage,
      msStage,
      critS,
      statusS,
      frStage,
      condStage,
      {
        id: 'dps',
        label: 'DPS',
        detail: `burst ${burstDps.toFixed(0)} → sustained ${sustainedDps.toFixed(0)} (reload ${weapon.reload.toFixed(2)}s)`,
        value: burstDps,
      },
    ],
  };
}
