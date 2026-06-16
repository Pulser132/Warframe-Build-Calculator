/**
 * `calculateBuild` — assemble the ordered stages into a full `DamageResult`.
 *
 * Pure: consumes a `Gun` (+ an optional fire mode) + resolved sources + combat
 * state and returns numbers + the labeled chain. The store resolves a `Build`
 * into these inputs; the engine never touches the data loaders or the store.
 *
 * Stage 2: the calculator runs on an explicit `FireMode`. Crit/status/fire-rate
 * are mode-level; base damage + quantization run **per simultaneous component**
 * (AoE weapons have a direct + a radial component), then the components combine
 * into the headline numbers. Trigger type converts the modified fire rate into an
 * effective rate (`triggers.ts`). Beams, shotguns, and AoE add extra report
 * fields without changing the Stage 1 chain — so the Vulkar Wraith slice is
 * byte-identical.
 */
import type { CombatState } from '../model/build';
import type {
  DamageMap,
  DamageResult,
  ComponentResult,
  PipelineStage,
} from '../model/result';
import type { DamageType } from '../model/types';
import type { FireMode, DamageComponent } from '../model/firemode';
import type { Gun } from '../gear/weapon';
import { gatherBuckets, type ResolvedSource, type BucketSums } from './gather';
import {
  baseElementalStage,
  quantizeStage,
  multishotStage,
  critStage,
  statusStage,
  conditionalMultiplierStage,
  sumDamage,
} from './stages';
import { effectiveFireRateStage } from './triggers';
import { probAtLeastOneProc, procTypeWeights, rimFactor } from './mechanics';

export interface CalcInput {
  weapon: Gun;
  /** Equipped mods + arcanes + active external buffs, in load order. */
  sources: readonly ResolvedSource[];
  combat: CombatState;
  /** Which fire mode to compute (defaults to the weapon's primary mode). */
  mode?: FireMode;
}

/** Run base+elemental then quantization for a single component. */
function computeComponent(
  component: DamageComponent,
  sums: BucketSums,
): { quantized: DamageMap; subtotal: DamageMap } {
  const { perType: subtotal } = baseElementalStage(component.damage, component.totalBaseDamage, sums);
  const quantum = (component.totalBaseDamage / 32) * (1 + sums.baseDamage);
  const { perType: quantized } = quantizeStage(subtotal, quantum);
  return { quantized, subtotal };
}

/** Scale a per-type map by a scalar. */
function scaleMap(map: DamageMap, factor: number): DamageMap {
  const out: DamageMap = {};
  for (const type of Object.keys(map) as DamageType[]) out[type] = (map[type] ?? 0) * factor;
  return out;
}

/** Add `src` into `acc` (mutating `acc`). */
function addInto(acc: DamageMap, src: DamageMap): void {
  for (const type of Object.keys(src) as DamageType[]) acc[type] = (acc[type] ?? 0) + (src[type] ?? 0);
}

export function calculateBuild(input: CalcInput): DamageResult {
  const { weapon, sources, combat } = input;
  const mode = input.mode ?? weapon.primaryFireMode;
  const sums = gatherBuckets(sources, combat);

  // ── Mode-level stages ──────────────────────────────────────────────────────
  const { multishot, stage: msStage } = multishotStage(mode.baseMultishot, sums);
  const { critChance, critMultiplier, avgCritMultiplier, stage: critS } = critStage(
    mode.criticalChance,
    mode.criticalMultiplier,
    sums,
  );
  const { statusChancePerPellet, avgProcsPerShot, stage: statusS } = statusStage(
    mode.statusChance,
    multishot,
    sums,
  );

  const modifiedFireRate = mode.fireRate * (1 + sums.fireRate);
  const { fireRate, stage: frStage } = effectiveFireRateStage({
    trigger: mode.trigger,
    modifiedFireRate,
    fireRateBonus: sums.fireRate,
    baseFireRate: mode.fireRate,
    burst: mode.burst,
    chargeTime: mode.chargeTime,
    bow: mode.bow,
  });

  const { factionMultiplier, directMultiplier, stage: condStage } =
    conditionalMultiplierStage(sums);
  const finalMult = avgCritMultiplier * factionMultiplier * directMultiplier;

  // ── Per-component base + quantization ──────────────────────────────────────
  const combinedSubtotal: DamageMap = {};
  const combinedQuantized: DamageMap = {};
  const combinedPerType: DamageMap = {};
  const components: ComponentResult[] = [];

  for (const component of mode.components) {
    const { quantized, subtotal } = computeComponent(component, sums);
    addInto(combinedSubtotal, subtotal);
    addInto(combinedQuantized, quantized);

    const perType = scaleMap(quantized, finalMult);
    addInto(combinedPerType, perType);
    const perPelletAverage = sumDamage(perType);

    const result: ComponentResult = {
      name: component.name,
      role: component.role,
      delivery: component.delivery,
      perType,
      perPelletAverage,
      falloff: component.falloff,
    };
    if (component.falloff) {
      result.rimPerPelletAverage = perPelletAverage * rimFactor(component.falloff);
    }
    components.push(result);
  }

  // Chain stages for base + quantize use the **combined** snapshot (identical to
  // the single component for non-AoE weapons → Stage 1 byte-compatible).
  const baseStage: PipelineStage = {
    id: 'base',
    label: 'Base + Elemental',
    detail: `× (1 + ${sums.baseDamage.toFixed(2)}) base damage; elements combined`,
    perType: { ...combinedSubtotal },
    value: sumDamage(combinedSubtotal),
  };
  const quantStage: PipelineStage = {
    id: 'quantize',
    label: 'Quantization',
    detail: `each type rounded to nearest base/32 × base-dmg mult`,
    perType: { ...combinedQuantized },
    value: sumDamage(combinedQuantized),
  };

  // ── Headline numbers (combined across components) ──────────────────────────
  const perType = combinedPerType;
  const perPelletAverage = sumDamage(perType);
  const avgHitPerShot = perPelletAverage * multishot;
  const burstDps = avgHitPerShot * fireRate;

  // Sustained DPS folds in reload. Beams consume 0.5 ammo per tick, so a magazine
  // lasts twice as many ticks.
  const ammoPerShot = mode.beam?.ammoPerTick ?? 1;
  const shotsPerMag = ammoPerShot > 0 ? weapon.magazine / ammoPerShot : weapon.magazine;
  const magTime = fireRate > 0 ? shotsPerMag / fireRate : 0;
  const cycle = magTime + weapon.reload;
  const sustainedDps = cycle > 0 ? burstDps * (magTime / cycle) : burstDps;

  // ── Stage 2 extras ─────────────────────────────────────────────────────────
  const statusProcChance = probAtLeastOneProc(statusChancePerPellet, multishot);
  const weights = procTypeWeights(perType);

  const result: DamageResult = {
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
    modeName: mode.name,
    trigger: mode.trigger,
    delivery: mode.components[0].delivery,
    ammoPerShot,
    components,
    statusProcChance,
    procTypeWeights: weights,
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

  // Beam reporting.
  if (mode.beam) {
    result.beam = {
      tickRate: fireRate,
      perTickDamage: avgHitPerShot,
      procsPerSecond: avgProcsPerShot * fireRate,
      rampStartPct: mode.beam.rampStartPct,
      rampSeconds: mode.beam.rampSeconds,
    };
  }

  // AoE reporting (first radial component).
  const radial = components.find((c) => c.role === 'radial' && c.falloff);
  if (radial && radial.falloff) {
    const factor = rimFactor(radial.falloff);
    result.aoe = {
      falloffStart: radial.falloff.start,
      radius: radial.falloff.end,
      centerAverage: radial.perPelletAverage,
      rimAverage: radial.perPelletAverage * factor,
      centerPerType: radial.perType,
      rimPerType: scaleMap(radial.perType, factor),
    };
  }

  return result;
}
