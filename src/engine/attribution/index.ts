import type { AttributionInput, AttributionStrategy } from './strategy';
import type { Contribution } from '../model/result';
import { createMemoizedCalc } from './memo';
import { leaveOneOut } from './leave-one-out';

export type { AttributionStrategy, AttributionInput, CalcFn } from './strategy';
export { leaveOneOut } from './leave-one-out';
export { createMemoizedCalc } from './memo';

/**
 * Attribute a build's per-source contributions. Defaults to leave-one-out with a
 * fresh memoized calculator (so the N recomputes reuse cached evaluations).
 */
export function attributeBuild(
  input: AttributionInput,
  strategy: AttributionStrategy = leaveOneOut,
  calc = createMemoizedCalc(),
): Contribution[] {
  return strategy.attribute(input, calc);
}
