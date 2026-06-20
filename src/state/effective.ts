/**
 * The **effective projection** (decision 9 / ADR-0006): a synthetic intrinsic
 * `DamageResult` whose target-dependent fields are overridden with the effective
 * (vs-Target) numbers from a `TargetResult`. Feeding this to the **same**
 * `DamageSummary` renders the vs-Target view in a layout identical to the Build
 * view — no parallel effective-summary component.
 *
 * Pure: a function of `(intrinsic, result)` only, so it is trivially testable.
 */
import type { DamageResult, DamageMap, TargetResult } from '@engine';

/** Scale a per-type map by a scalar (effective per-shot → per-pellet). */
function scaleMap(map: DamageMap, factor: number): DamageMap {
  const out: DamageMap = {};
  for (const [type, value] of Object.entries(map)) out[type as keyof DamageMap] = (value ?? 0) * factor;
  return out;
}

/**
 * Build the effective projection: spread the intrinsic result, then override the
 * headline (burst/sustained/avg-hit), the per-type spread + per-pellet average
 * (so the shared crit-tier breakdown rolls effective numbers), and every
 * effective mechanic sub-result the `TargetResult` carries.
 */
export function buildEffectiveProjection(intrinsic: DamageResult, result: TargetResult): DamageResult {
  const multishot = intrinsic.multishot;
  const perPelletAverage = multishot > 0 ? result.effectiveHitAverage / multishot : 0;
  // perType is the per-pellet effective spread (perTypeEffective is per-shot) so
  // the chips sum to perPelletAverage, matching the intrinsic convention.
  const perType = multishot > 0 ? scaleMap(result.perTypeEffective, 1 / multishot) : result.perTypeEffective;

  const projection: DamageResult = {
    ...intrinsic,
    perType,
    perPelletAverage,
    avgHitPerShot: result.effectiveHitAverage,
    burstDps: result.effectiveBurstDps,
    sustainedDps: result.effectiveDps,
  };

  // Effective mechanic sub-results replace the intrinsic ones the projection
  // spread in (each is present iff the intrinsic carried the corresponding field).
  if (result.aoe) projection.aoe = result.aoe;
  if (result.components) projection.components = result.components;
  if (result.beam) projection.beam = result.beam;
  if (result.heavyLoop) projection.heavyLoop = result.heavyLoop;
  if (result.followThrough) projection.followThrough = result.followThrough;
  if (result.comboString) projection.comboString = result.comboString;

  return projection;
}
