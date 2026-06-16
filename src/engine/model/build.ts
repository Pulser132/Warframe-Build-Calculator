/**
 * The build document + combat state the engine computes against.
 *
 * A `Build` is the equipped gear and slot assignments; `CombatState` holds the
 * toggleable conditionals/buffs (Stage 1's seed of the Stage 5 config menu).
 * Both are plain serializable data — the store owns mutation, the engine only reads.
 */
import type { ModSlotKind, Polarity } from './types';

/** One modding slot: its kind, forma polarity, and what's assigned. */
export interface SlotState {
  kind: ModSlotKind;
  /** Forma/innate polarity on the slot (`none` = unpolarized). */
  polarity: Polarity;
  /** Mod id (aura/exilus/normal) or arcane id (arcane slots); `null` = empty. */
  itemId: string | null;
  /** Current rank of the assigned item. */
  rank: number;
}

export interface Build {
  weaponId: string;
  /** Ordered slots: aura, exilus, 8× normal, 2× arcane (12 total). */
  slots: SlotState[];
  /** Orokin Reactor doubles base capacity (theorycrafting default: true). */
  reactor: boolean;
  /** Base mod capacity before reactor/aura (a maxed weapon = 30). */
  baseCapacity: number;
}

/** A registry-driven external buff (e.g. Roar) — see `engine/buffs`. */
export interface BuffState {
  /** Registry buff id (e.g. `roar`). */
  id: string;
  /** Buff strength, 0..1+ (e.g. 0.5 = +50%). Interpreted by the registry entry. */
  strength: number;
}

export interface CombatState {
  /** Conditional toggles, e.g. `faction:grineer` → true. */
  conditions: Record<string, boolean>;
  /** Stack counts for stacking sources, e.g. `arcane:primary-merciless` → 8. */
  stacks: Record<string, number>;
  /** Active external buffs (Roar-style), data-driven via the buff registry. */
  buffs: BuffState[];
}

export const EMPTY_COMBAT_STATE: CombatState = {
  conditions: {},
  stacks: {},
  buffs: [],
};
