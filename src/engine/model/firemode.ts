/**
 * `FireMode` — the calculable unit the damage pipeline runs on (Stage 2).
 *
 * Stage 1 computed a single implicit fire mode straight off a `Gun`'s top-level
 * stats. Stage 2 makes the fire mode explicit: a weapon owns one or more
 * `FireMode`s, and every trigger/delivery mechanic (auto/semi/burst/charge/beam,
 * hitscan/projectile/AoE, shotgun pellets) is expressed as data on a mode — so
 * the gear classes stay thin (no per-mechanic subclasses).
 *
 * These are framework-agnostic, serializable plain shapes. The data layer emits
 * them (`scripts/build-data.mjs`); the engine reads them.
 */
import type { DamageType } from './types';
import type { DamageMap } from './result';

/** How the trigger converts fire rate into an effective rate of attacks. */
export type TriggerType = 'auto' | 'semi' | 'burst' | 'charge' | 'held';

/** How a shot reaches the target. Stage 2 damage is delivery-agnostic; this is
 * carried as metadata for Stage 5 (time-to-target / TTK). `aoe` additionally
 * drives radial falloff. */
export type DeliveryType = 'hitscan' | 'projectile' | 'aoe';

/**
 * Linear damage falloff. **Convention:** `maxReduction` is the fraction of damage
 * *removed* at `end` (so the rim/min factor is `1 − maxReduction`). The `@wfcd`
 * `falloff.reduction` field is the *remaining* multiplier at max distance
 * (Vulkar 0.5, Vaykor 0.7333) — the data transform converts it with
 * `maxReduction = 1 − reduction` (see `scripts/build-data.mjs`).
 */
export interface FalloffSpec {
  /** Distance (m) up to which damage is 100%. */
  start: number;
  /** Distance (m) at/after which damage is the floor (`1 − maxReduction`). */
  end: number;
  /** Fraction removed at `end` (0.3 = 30% removed → 70% remains at the rim). */
  maxReduction: number;
}

/** Burst-trigger parameters (not present in the `@wfcd` dump — see TRIGGER_META). */
export interface BurstSpec {
  /** Rounds fired per trigger pull. */
  count: number;
  /** Fixed delay (s) between bursts (unaffected by net-negative fire-rate mods). */
  delay: number;
}

/** Beam (held-continuous) parameters. */
export interface BeamSpec {
  /** Damage ramp starting fraction (most beams 0.2; Phage 0.7) → ramps to 1.0 over 0.6s. */
  rampStartPct: number;
  /** Seconds to ramp from `rampStartPct` to 100%. */
  rampSeconds: number;
  /** Ammo consumed per tick (beams = 0.5). */
  ammoPerTick: number;
}

/**
 * One simultaneous damage component of a shot. Most modes have a single
 * `normal` component; AoE weapons (Tonkor) have a `direct` projectile component
 * plus a `radial` AoE component that both land on one trigger pull.
 */
export interface DamageComponent {
  /** Display label, e.g. `Normal`, `Direct`, `Radial`. */
  name: string;
  /** Role discriminant for the pipeline / UI. */
  role: 'normal' | 'direct' | 'radial';
  delivery: DeliveryType;
  /** Base per-type damage (only nonzero types present). */
  damage: DamageMap;
  totalBaseDamage: number;
  /** Radial falloff (present on `radial` components). */
  falloff?: FalloffSpec;
}

/** The calculable fire mode: everything the pipeline needs for one mode. */
export interface FireMode {
  /** Mode label (e.g. `Normal Attack`, `Full Auto Mode`). Unique within a weapon. */
  name: string;
  trigger: TriggerType;
  criticalChance: number;
  criticalMultiplier: number;
  statusChance: number;
  /** Base fire rate (rps). For burst this is the **in-burst** rate; for charge it
   * is unused (charge time governs); for beam it is the tick rate. */
  fireRate: number;
  /** Base multishot / pellet count (rifles 1, shotguns the pellet count e.g. 7). */
  baseMultishot: number;
  /** Simultaneous damage components (>=1). `components[0]` is the headline hit. */
  components: DamageComponent[];
  /** Charge time (s) at full charge — present for `charge` trigger. */
  chargeTime?: number;
  /** Whether this charge weapon is a bow (affects effective fire-rate formula). */
  bow?: boolean;
  /** Burst parameters — present for `burst` trigger. */
  burst?: BurstSpec;
  /** Beam parameters — present for `held` trigger. */
  beam?: BeamSpec;
}

/** The headline component of a mode (first `direct`/`radial`/`normal`). */
export function headlineComponent(mode: FireMode): DamageComponent {
  return mode.components[0];
}

/** Sum of base damage across all of a mode's components. */
export function modeTotalBaseDamage(mode: FireMode): number {
  return mode.components.reduce((s, c) => s + c.totalBaseDamage, 0);
}

/**
 * Synthesize a single `FireMode` from legacy top-level weapon stats. Used for
 * back-compat when curated data predates the `fireModes` field (and to keep the
 * Stage 1 Vulkar Wraith path byte-identical). Maps the raw `@wfcd` trigger string
 * to a `TriggerType`.
 */
export function synthesizeFireMode(stats: {
  damage: DamageMap;
  totalBaseDamage: number;
  criticalChance: number;
  criticalMultiplier: number;
  statusChance: number;
  fireRate: number;
  multishot: number;
  trigger: string;
}): FireMode {
  return {
    name: 'Normal Attack',
    trigger: normalizeTrigger(stats.trigger),
    criticalChance: stats.criticalChance,
    criticalMultiplier: stats.criticalMultiplier,
    statusChance: stats.statusChance,
    fireRate: stats.fireRate,
    baseMultishot: stats.multishot,
    components: [
      {
        name: 'Normal',
        role: 'normal',
        delivery: 'hitscan',
        damage: { ...stats.damage },
        totalBaseDamage: stats.totalBaseDamage,
      },
    ],
  };
}

/** Map a raw `@wfcd` trigger string to the engine `TriggerType`. */
export function normalizeTrigger(raw: string): TriggerType {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('held') || t.includes('continuous') || t.includes('beam')) return 'held';
  if (t.includes('burst')) return 'burst';
  if (t.includes('charge')) return 'charge';
  if (t.includes('semi')) return 'semi';
  return 'auto';
}

/** Re-export for callers that build component maps. */
export type { DamageType };
