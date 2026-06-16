/**
 * The ordered damage-pipeline stages, each a **pure function** of plain numbers
 * (no gear/store), so every one is trivially unit-testable. Each returns its
 * computed value(s) plus a labeled `PipelineStage` snapshot for the chain view.
 *
 * Order and formulas verified against `docs/warframe/mechanics/damage.md`.
 */
import type { DamageType } from '../model/types';
import type { DamageMap, PipelineStage } from '../model/result';
import type { BucketSums } from './gather';
import { combineElements } from './elements';

export function sumDamage(map: DamageMap): number {
  let total = 0;
  for (const v of Object.values(map)) total += v ?? 0;
  return total;
}

/**
 * Stage 1 — base + elemental subtotal.
 * `(base IPS + physical mods + elemental additions) × (1 + Σ base-damage mods)`.
 * Elementals are added as a fraction of base total, then combined, then the whole
 * subtotal is multiplied by the base-damage bucket (so Serration scales elements).
 */
export function baseElementalStage(
  baseDamage: DamageMap,
  baseTotal: number,
  sums: BucketSums,
): { perType: DamageMap; stage: PipelineStage } {
  const perType: DamageMap = { ...baseDamage };

  // Physical-type mods add a fraction of that type's base damage.
  for (const [type, pct] of Object.entries(sums.physical) as [DamageType, number][]) {
    const basePhys = baseDamage[type] ?? 0;
    perType[type] = (perType[type] ?? 0) + basePhys * pct;
  }

  // Elemental mods add `fraction × baseTotal`, in load order, then combine.
  const elementDamage = combineElements(
    sums.elements.map((e) => ({ type: e.type, amount: e.amount * baseTotal })),
  );
  for (const [type, amount] of Object.entries(elementDamage) as [DamageType, number][]) {
    perType[type] = (perType[type] ?? 0) + amount;
  }

  // Base-damage bucket multiplies the whole subtotal (physical + elemental).
  const baseMult = 1 + sums.baseDamage;
  for (const type of Object.keys(perType) as DamageType[]) {
    perType[type] = (perType[type] ?? 0) * baseMult;
  }

  return {
    perType,
    stage: {
      id: 'base',
      label: 'Base + Elemental',
      detail: `× (1 + ${sums.baseDamage.toFixed(2)}) base damage; elements combined`,
      perType: { ...perType },
      value: sumDamage(perType),
    },
  };
}

/** Stage 2 — multishot: pellet count = baseMultishot × (1 + Σ multishot). */
export function multishotStage(
  baseMultishot: number,
  sums: BucketSums,
): { multishot: number; stage: PipelineStage } {
  const multishot = baseMultishot * (1 + sums.multishot);
  return {
    multishot,
    stage: {
      id: 'multishot',
      label: 'Multishot',
      detail: `${baseMultishot} × (1 + ${sums.multishot.toFixed(2)}) = ${multishot.toFixed(3)} pellets`,
      value: multishot,
    },
  };
}

/**
 * Stage 3 — critical (average). `avgCrit = 1 + cc × (cd − 1)` is the exact
 * expected multiplier for ALL crit chances, including > 100% (orange/red tiers).
 */
export function critStage(
  baseCritChance: number,
  baseCritMultiplier: number,
  sums: BucketSums,
): { critChance: number; critMultiplier: number; avgCritMultiplier: number; stage: PipelineStage } {
  const critChance = baseCritChance * (1 + sums.critChance);
  const critMultiplier = baseCritMultiplier * (1 + sums.critDamage);
  const avgCritMultiplier = 1 + critChance * (critMultiplier - 1);
  return {
    critChance,
    critMultiplier,
    avgCritMultiplier,
    stage: {
      id: 'crit',
      label: 'Critical (avg)',
      detail: `cc ${(critChance * 100).toFixed(1)}% × cd ${critMultiplier.toFixed(2)}× → avg ${avgCritMultiplier.toFixed(3)}×`,
      value: avgCritMultiplier,
    },
  };
}

/** Stage 4 — status: per-pellet chance and expected procs per shot. */
export function statusStage(
  baseStatusChance: number,
  multishot: number,
  sums: BucketSums,
): { statusChancePerPellet: number; avgProcsPerShot: number; stage: PipelineStage } {
  const statusChancePerPellet = baseStatusChance * (1 + sums.statusChance);
  const avgProcsPerShot = multishot * statusChancePerPellet;
  return {
    statusChancePerPellet,
    avgProcsPerShot,
    stage: {
      id: 'status',
      label: 'Status',
      detail: `${(statusChancePerPellet * 100).toFixed(1)}%/pellet → ${avgProcsPerShot.toFixed(2)} procs/shot`,
      value: statusChancePerPellet,
    },
  };
}

/** Stage 5 — fire rate: shots per second. */
export function fireRateStage(
  baseFireRate: number,
  sums: BucketSums,
): { fireRate: number; stage: PipelineStage } {
  const fireRate = baseFireRate * (1 + sums.fireRate);
  return {
    fireRate,
    stage: {
      id: 'fireRate',
      label: 'Fire Rate',
      detail: `${baseFireRate.toFixed(2)} × (1 + ${sums.fireRate.toFixed(2)}) = ${fireRate.toFixed(2)}/s`,
      value: fireRate,
    },
  };
}

/**
 * Stage 6 — conditional multipliers (faction + direct/arcane). Each bucket is
 * additive within itself and applied as a separate multiplier: `1 + Σ`.
 */
export function conditionalMultiplierStage(sums: BucketSums): {
  factionMultiplier: number;
  directMultiplier: number;
  stage: PipelineStage;
} {
  const factionMultiplier = 1 + sums.faction;
  const directMultiplier = 1 + sums.directDamage;
  return {
    factionMultiplier,
    directMultiplier,
    stage: {
      id: 'conditional',
      label: 'Faction / Direct',
      detail: `faction ×${factionMultiplier.toFixed(2)}, direct ×${directMultiplier.toFixed(2)}`,
      value: factionMultiplier * directMultiplier,
    },
  };
}
