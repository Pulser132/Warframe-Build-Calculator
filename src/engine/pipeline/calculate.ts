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
import { comboCount, comboMultiplier } from './combo';
import { followThroughTotal, comboStringBreakdown } from './melee';
// Side-effect import: registers the Stage 3 custom effects (Blood Rush, Weeping
// Wounds, Condition Overload) into the global registry that `gather` consults.
import './customEffects';

/**
 * The minimal weapon shape the calculator needs (Stage 3 generalization).
 * Guns supply `magazine`/`reload`; melee omits them (→ sustained DPS = burst DPS).
 * Melee additionally supplies Follow-Through / Reach metadata for the extras.
 */
export interface CalcWeapon {
  readonly id: string;
  readonly primaryFireMode: FireMode;
  readonly magazine?: number;
  readonly reload?: number;
  /** Follow-Through factor (melee). */
  readonly followThrough?: number;
  /** Reach / swing distance (melee). */
  readonly range?: number;
}

export interface CalcInput {
  weapon: CalcWeapon;
  /** Equipped mods + arcanes + active external buffs, in load order. */
  sources: readonly ResolvedSource[];
  combat: CombatState;
  /** Which fire mode to compute (defaults to the weapon's primary mode). */
  mode?: FireMode;
  /** Number of targets in a melee swing arc (Follow-Through extra). Default 1. */
  targetCount?: number;
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
    windUp: mode.windUp,
  });

  const { factionMultiplier, directMultiplier, stage: condStage } =
    conditionalMultiplierStage(sums);

  // Combo Multiplier — an intrinsic step applied to Heavy / Heavy-Slam modes only
  // (never Normal/Slam). Reads the raw Combo Count from combat state.
  const count = comboCount(combat);
  const combo = mode.comboScaled ? comboMultiplier(count) : 1;
  const finalMult = avgCritMultiplier * factionMultiplier * directMultiplier * combo;

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
      forcedProcs: component.forcedProcs,
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
  // lasts twice as many ticks. Melee has no magazine/reload (both 0) → sustained
  // DPS equals burst DPS.
  const magazine = weapon.magazine ?? 0;
  const reload = weapon.reload ?? 0;
  const ammoPerShot = mode.beam?.ammoPerTick ?? 1;
  const shotsPerMag = ammoPerShot > 0 ? magazine / ammoPerShot : magazine;
  const magTime = fireRate > 0 ? shotsPerMag / fireRate : 0;
  const cycle = magTime + reload;
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
      ...(mode.comboScaled
        ? [
            {
              id: 'combo',
              label: 'Combo Multiplier',
              detail: `${count} hits → ×${combo} (Heavy attacks only)`,
              value: combo,
            } satisfies PipelineStage,
          ]
        : []),
      {
        id: 'dps',
        label: 'DPS',
        detail: `burst ${burstDps.toFixed(0)} → sustained ${sustainedDps.toFixed(0)} (reload ${reload.toFixed(2)}s)`,
        value: burstDps,
      },
    ],
  };

  // ── Stage 3 melee extras ───────────────────────────────────────────────────
  if (mode.comboScaled) {
    result.comboMultiplier = combo;
    result.comboCount = count;
  }
  if (weapon.range != null) result.reach = weapon.range;

  // Follow-Through: a multi-target extra (single-target output is unchanged).
  const targetCount = input.targetCount ?? combat.targetCount ?? 1;
  if (weapon.followThrough != null && targetCount > 1) {
    const ft = weapon.followThrough;
    const total = followThroughTotal(avgHitPerShot, ft, targetCount);
    const perTarget = Array.from({ length: targetCount }, (_, k) => avgHitPerShot * Math.pow(ft, k));
    result.followThrough = {
      factor: ft,
      targetCount,
      singleTarget: avgHitPerShot,
      total,
      perTarget,
    };
  }

  // Combo String: a per-hit breakdown extra for the Normal mode.
  if (mode.comboString) {
    result.comboString = comboStringBreakdown(mode.comboString, avgHitPerShot, fireRate);
  }

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
