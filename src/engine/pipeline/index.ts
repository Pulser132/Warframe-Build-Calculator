export { calculateBuild } from './calculate';
export type { CalcInput } from './calculate';
export { gatherBuckets, rankFactor, scaledValue, isEffectActive } from './gather';
export type { ResolvedSource, BucketSums } from './gather';
export { combineElements } from './elements';
export type { ElementContribution } from './elements';
export { critTiers } from './critTiers';
export type { CritTier } from './critTiers';
export * from './stages';
export {
  effectiveFireRate,
  effectiveFireRateStage,
  FIRE_RATE_FLOOR,
  SEMI_AUTO_CAP,
  MAX_CHARGE_MULTIPLE,
} from './triggers';
export type { TriggerInput } from './triggers';
export { probAtLeastOneProc, procTypeWeights, falloffFactor, rimFactor } from './mechanics';
