/** Warframe stat-resolver public API (Stage 4). */
export { resolveWarframe, EFFICIENCY_CAP, ALL_FRAME_STATS } from './resolve';
export type { FrameBase, FrameResolveInput } from './resolve';
export { computeEhp, ARMOR_K } from './ehp';
export { ABILITY_BUFFS, buffMappingsFor } from './abilities';
export type { BuffScaling, AbilityBuffMapping } from './abilities';
export type {
  WarframeStats,
  FrameSource,
  EhpBreakdown,
  AbilityOutput,
  AbilityScalingMap,
  FrameStatSums,
} from './types';
