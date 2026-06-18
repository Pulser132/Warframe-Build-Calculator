/**
 * The build document + combat state the engine computes against.
 *
 * A `Build` is a container of **gear compartments** (ADR 0003): each compartment
 * (`GearBuild`) is one modded piece of gear — its equipped item, slot
 * assignments, and capacity. `CombatState` is shared at the top (it is the
 * cross-gear surface where a frame's Emitted Buff meets the weapon calc). Both
 * are plain serializable data — the store owns mutation, the engine only reads.
 */
import type { ModSlotKind, Polarity } from './types';

/** One modding slot: its kind, forma polarity, and what's assigned. */
export interface SlotState {
  kind: ModSlotKind;
  /** Forma/innate polarity on the slot (`none` = unpolarized). */
  polarity: Polarity;
  /** Mod id (aura/exilus/normal/stance) or arcane id (arcane slots); `null` = empty. */
  itemId: string | null;
  /** Current rank of the assigned item. */
  rank: number;
}

/**
 * One modded gear compartment (ADR 0003): an equipped item + its slots + its
 * capacity. The same shape is used for weapons and warframes (and, later,
 * companions/operator); what differs per compartment is the **slot layout** and
 * the **mod pool**, not this container.
 */
export interface GearBuild {
  /** Equipped item id (weapon id / warframe id). */
  itemId: string;
  /** Ordered slots for the gear's layout. */
  slots: SlotState[];
  /** Orokin Reactor/Catalyst doubles base capacity (theorycrafting default: true). */
  reactor: boolean;
  /** Base mod capacity before reactor/aura (a maxed item = 30). */
  baseCapacity: number;
}

/** Which gear compartment is being modded / addressed. */
export type Compartment = 'weapon' | 'warframe';

/**
 * The build document: a container of gear compartments (ADR 0003). The weapon is
 * always present; the warframe may be absent (`null`). Future compartments
 * (companion, operator — Stage 7) slot in here the same way.
 */
export interface Build {
  weapon: GearBuild;
  warframe: GearBuild | null;
}

/**
 * An active Emitted-Buff toggle (Stage 4). Whether a buff is active is a
 * combat-state toggle; its **magnitude** is derived from the equipped frame's
 * Ability Strength (see `engine/warframe`). When no equipped frame emits the
 * buff, `manualMagnitude` supplies it (a squadmate's Roar / un-modeled source).
 */
export interface BuffState {
  /** Buff catalog id (e.g. `roar`). */
  id: string;
  /**
   * Manual magnitude override (e.g. 0.5 = +50%), used **only** when no equipped
   * frame provides this buff. When the frame emits it, the frame-derived
   * magnitude wins and this is ignored.
   */
  manualMagnitude?: number;
}

export interface CombatState {
  /** Conditional toggles, e.g. `faction:grineer` → true. */
  conditions: Record<string, boolean>;
  /** Stack counts for stacking sources, e.g. `arcane:primary-merciless` → 8.
   * Melee uses `stacks['combo']` (raw Combo Count) and `stacks['status:count']`
   * (unique status types on the target, for Condition Overload). */
  stacks: Record<string, number>;
  /** Active Emitted-Buff toggles (Roar-style); magnitude is frame-derived. */
  buffs: BuffState[];
  /** Number of enemies in a melee swing arc (Follow-Through extra). Default 1.
   * Superseded by the reach-derived count when `enemySpacing` is set (Stage 5). */
  targetCount?: number;
  /** Enemy-spacing assumption (m). When set, the melee swing's target count is
   * derived from Reach (`reachTargetCount`) instead of the manual `targetCount`. */
  enemySpacing?: number;
}

export const EMPTY_COMBAT_STATE: CombatState = {
  conditions: {},
  stacks: {},
  buffs: [],
};
