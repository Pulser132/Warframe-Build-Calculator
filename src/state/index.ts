/**
 * State public API: the Zustand store, derived selectors, and the pure
 * resolve/capacity helpers.
 */
export { useBuildStore, modFromStore } from './store';
export type { BuildStore } from './store';
export { useDamageResult, useCapacity } from './selectors';
export { computeResult, resolveSources, getGun } from './resolve';
export { computeCapacity, modCost } from './capacity';
export type { CapacityInfo } from './capacity';
export { makeInitialBuild } from './initialBuild';
export { slotAccepts } from './slotRules';
