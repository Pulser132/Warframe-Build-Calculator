/**
 * Pluggable attribution. Stage 1 ships `leaveOneOut`; the interface leaves room
 * for Shapley / ordered / multiplier-chain strategies in later stages (Overview).
 */
import type { CombatState } from '../model/build';
import type { Contribution, DamageResult } from '../model/result';
import type { ResolvedSource } from '../pipeline/gather';
import type { CalcInput, CalcWeapon } from '../pipeline/calculate';
import type { FireMode } from '../model/firemode';

export interface AttributionInput {
  weapon: CalcWeapon;
  sources: readonly ResolvedSource[];
  combat: CombatState;
  /** Fire mode to attribute against (defaults to the weapon's primary mode). */
  mode?: FireMode;
}

/** A calculator function (injected so strategies can share a memoized calc). */
export type CalcFn = (input: CalcInput) => DamageResult;

export interface AttributionStrategy {
  readonly id: string;
  /**
   * Per-source contributions. NOTE: because buckets multiply, contributions
   * **need not sum to 100%** — this is documented honestly and surfaced in the UI.
   */
  attribute(input: AttributionInput, calc: CalcFn): Contribution[];
}
