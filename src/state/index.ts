/**
 * State public API: the Zustand store, derived selectors, and the pure
 * resolve/capacity helpers.
 */
export { useBuildStore, modFromStore, DEFAULT_TARGET_STATE } from './store';
export type { BuildStore } from './store';
export {
  useDamageResult,
  useTargetResult,
  useEffectiveResult,
  useEnemies,
  useCapacity,
  useWeapon,
  useWarframe,
  useWarframeStats,
  useActiveGear,
} from './selectors';
export { buildEffectiveProjection } from './effective';
export {
  computeResult,
  computeTargetResult,
  findEnemy,
  resolveSources,
  resolveFrameStats,
  getWeapon,
  getGun,
} from './resolve';
export { computeCapacity, modCost } from './capacity';
export type { CapacityInfo } from './capacity';
export { makeInitialBuild, makeWeaponBuild, makeWarframeBuild } from './initialBuild';
export { slotAccepts } from './slotRules';
export {
  weaponModGroup,
  gearModGroup,
  modMatchesGroup,
  arcaneMatchesGroup,
  stanceMatchesClass,
} from './modCompat';
export type { ModGroup, WeaponLike } from './modCompat';
