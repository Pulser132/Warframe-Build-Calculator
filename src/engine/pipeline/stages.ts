/**
 * The ordered damage-pipeline stages, each a **pure function** of plain numbers
 * (no gear/store), so every one is trivially unit-testable. Each returns its
 * computed value(s) plus a labeled `PipelineStage` snapshot for the chain view.
 *
 * Order and formulas verified against `docs/warframe/mechanics/damage.md`.
 */
import type { DamageType } from '../model/types';
import type { DamageMap, PipelineStage } from '../model/result';
import { MULTIPLIER_BUCKETS, MULTIPLIER_BUCKET_ORDER } from '../model/buckets';
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

/**
 * Stage 1b — quantization. Warframe rounds each damage type to the nearest
 * **1/32 of the weapon's unmodded base damage** *before* multiplying further
 * (multishot/crit/faction). Source: `Damage/Calculation` (wiki), cached in
 * `docs/warframe/mechanics/quantization.md`.
 *
 * The wiki rounds the elemental/physical values that sit *inside* the base-damage
 * factor, i.e. before the `× (1 + Σ base-damage)` (Serration) multiply. We round
 * `baseElementalStage`'s output (which already includes that multiply) against a
 * quantum scaled the same way — `quantum = (baseTotal / 32) × (1 + Σ base-damage)`
 * — which is exactly equivalent: `round(x/q)·q` then `×m` equals rounding `x·m`
 * to multiples of `q·m`. So the caller passes the already-scaled `quantum`.
 */
export function quantizeStage(
  perType: DamageMap,
  quantum: number,
): { perType: DamageMap; stage: PipelineStage } {
  const out: DamageMap = {};
  for (const [type, value] of Object.entries(perType) as [DamageType, number][]) {
    out[type] = quantum > 0 ? Math.round((value ?? 0) / quantum) * quantum : (value ?? 0);
  }
  return {
    perType: out,
    stage: {
      id: 'quantize',
      label: 'Quantization',
      detail: `each type rounded to nearest ${quantum.toFixed(3)} (base/32 × base-dmg mult)`,
      perType: { ...out },
      value: sumDamage(out),
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
 * Stage 6 — conditional multipliers (ADR 0005). Iterates the **declared**
 * `MULTIPLIER_BUCKETS` in order: each bucket is additive within itself and
 * applied as a separate multiplier `× (1 + Σ)`; the buckets multiply across each
 * other. `combined` is the product fed into the final multiplier. A new
 * independent multiplier category is a `MULTIPLIER_BUCKETS` entry — no change
 * here.
 */
export function conditionalMultiplierStage(sums: BucketSums): {
  /** Per-bucket `(1 + Σ)` factor, keyed by bucket id. */
  multipliers: Record<string, number>;
  /** Product of every multiplier bucket. */
  combined: number;
  stage: PipelineStage;
} {
  const multipliers: Record<string, number> = {};
  let combined = 1;
  const parts: string[] = [];
  for (const id of MULTIPLIER_BUCKET_ORDER) {
    const factor = 1 + (sums.multipliers[id] ?? 0);
    multipliers[id] = factor;
    combined *= factor;
    if (factor !== 1) parts.push(`${MULTIPLIER_BUCKETS[id].label} ×${factor.toFixed(2)}`);
  }
  return {
    multipliers,
    combined,
    stage: {
      id: 'conditional',
      label: 'Conditional Multipliers',
      detail: parts.length ? parts.join(', ') : 'none active',
      value: combined,
    },
  };
}
