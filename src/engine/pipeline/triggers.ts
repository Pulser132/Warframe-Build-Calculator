/**
 * Trigger-type → effective fire rate (pure). Converts a fire mode's **modified**
 * fire rate (base × (1 + Σ fire-rate mods)) into the **effective** rate of
 * attacks per second that drives DPS, per the locked formulas in
 * `docs/warframe/mechanics/triggers.md`.
 *
 * Each function takes plain numbers so it is trivially unit-testable.
 */
import type { PipelineStage } from '../model/result';
import type { TriggerType, BurstSpec } from '../model/firemode';

/** Global fire-rate floor: never slower than one shot per 20 s. */
export const FIRE_RATE_FLOOR = 0.05;
/** Semi-automatic effective-rate cap (rps). */
export const SEMI_AUTO_CAP = 10;
/** Charge time cannot exceed 10× the base charge time (≥ −90% fire-rate bonus). */
export const MAX_CHARGE_MULTIPLE = 10;

export interface TriggerInput {
  trigger: TriggerType;
  /** Modified fire rate (base × (1 + Σ fire-rate mods)). In-burst rate for burst. */
  modifiedFireRate: number;
  /** Sum of fire-rate mod bonuses (for charge-time scaling). */
  fireRateBonus: number;
  /** Base (unmodified) fire rate — needed for the burst/charge floors. */
  baseFireRate: number;
  burst?: BurstSpec;
  /** Full-charge time (s) at base — for `charge` trigger. */
  chargeTime?: number;
  /** Bows use `1/chargeTime`; other charge weapons add a `1/fireRate` recovery. */
  bow?: boolean;
}

/**
 * Effective fire rate (attacks/s) after the trigger conversion + global limits.
 *
 * - **auto / held**: modified rate directly (floor only).
 * - **semi**: modified rate, capped at {@link SEMI_AUTO_CAP}.
 * - **burst**: `count / (1/FR + (count−1)·delay)`; mods scale the in-burst rate only.
 * - **charge**: `modChargeTime = baseCharge / (1 + bonus)` (capped at 10×);
 *   bows → `1/modChargeTime`, others → `1/(modChargeTime + 1/modFR)`.
 */
export function effectiveFireRate(input: TriggerInput): number {
  const { trigger, modifiedFireRate, fireRateBonus, baseFireRate, burst, chargeTime, bow } = input;

  switch (trigger) {
    case 'auto':
    case 'held':
      return Math.max(modifiedFireRate, FIRE_RATE_FLOOR);

    case 'semi':
      return Math.min(Math.max(modifiedFireRate, FIRE_RATE_FLOOR), SEMI_AUTO_CAP);

    case 'burst': {
      const count = burst?.count ?? 1;
      const delay = burst?.delay ?? 0;
      const fr = Math.max(modifiedFireRate, FIRE_RATE_FLOOR);
      if (count <= 1) return Math.max(fr, FIRE_RATE_FLOOR);
      const seconds = 1 / fr + (count - 1) * delay;
      return seconds > 0 ? count / seconds : FIRE_RATE_FLOOR;
    }

    case 'charge': {
      const base = chargeTime ?? (baseFireRate > 0 ? 1 / baseFireRate : 1);
      const maxTime = base * MAX_CHARGE_MULTIPLE;
      const modChargeTime = Math.min(base / (1 + fireRateBonus), maxTime);
      if (bow) {
        return modChargeTime > 0 ? 1 / modChargeTime : FIRE_RATE_FLOOR;
      }
      const recovery = modifiedFireRate > 0 ? 1 / modifiedFireRate : 0;
      const cycle = modChargeTime + recovery;
      return cycle > 0 ? 1 / cycle : FIRE_RATE_FLOOR;
    }

    default:
      return Math.max(modifiedFireRate, FIRE_RATE_FLOOR);
  }
}

/** A labeled chain stage for the effective fire rate (used by the calculator). */
export function effectiveFireRateStage(
  input: TriggerInput,
): { fireRate: number; stage: PipelineStage } {
  const fireRate = effectiveFireRate(input);
  const detail = describeTrigger(input, fireRate);
  return {
    fireRate,
    stage: { id: 'fireRate', label: 'Fire Rate', detail, value: fireRate },
  };
}

function describeTrigger(input: TriggerInput, eff: number): string {
  switch (input.trigger) {
    case 'burst': {
      const c = input.burst?.count ?? 1;
      return `burst ×${c} @ ${input.modifiedFireRate.toFixed(2)} in-burst → ${eff.toFixed(2)}/s effective`;
    }
    case 'charge': {
      const base = input.chargeTime ?? 0;
      const mod = base / (1 + input.fireRateBonus);
      return `charge ${mod.toFixed(2)}s${input.bow ? ' (bow)' : ''} → ${eff.toFixed(2)}/s`;
    }
    case 'held':
      return `${eff.toFixed(2)} ticks/s (continuous)`;
    case 'semi':
      return `${input.modifiedFireRate.toFixed(2)}/s${eff < input.modifiedFireRate ? ` (capped ${SEMI_AUTO_CAP})` : ''}`;
    default:
      return `${eff.toFixed(2)}/s`;
  }
}
