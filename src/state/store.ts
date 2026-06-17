/**
 * The single Zustand build store: the current `Build` + `CombatState`, the loaded
 * dataset, mutation actions, and hand-rolled undo/redo history.
 *
 * The store owns all mutation; the engine only reads (via `resolve.ts`). Each
 * mutating action snapshots {build, combat} onto an undo stack and clears redo.
 */
import { create } from 'zustand';
import type { Build, CombatState, SlotState } from '@engine/model/build';
import { EMPTY_COMBAT_STATE } from '@engine/model/build';
import type { ModData, Polarity } from '@engine/model/types';
import type { Dataset } from '@data/loaders';
import { makeInitialBuild } from './initialBuild';
import { slotAccepts } from './slotRules';
import { weaponModGroup, modMatchesGroup } from './modCompat';

interface Snapshot {
  build: Build;
  combat: CombatState;
}

export interface BuildStore {
  dataset: Dataset | null;
  build: Build;
  combat: CombatState;
  /** Active fire-mode name (`null` = the weapon's primary mode). */
  activeMode: string | null;
  past: Snapshot[];
  future: Snapshot[];

  /** Active stance Combo String name (melee Normal mode; `null` = none). */
  activeComboString: string | null;

  initFromDataset: (dataset: Dataset) => void;
  /** Switch the equipped weapon, rebuilding the slots for its layout. */
  selectWeapon: (weaponId: string) => void;
  /** Switch the active fire mode (multi-mode weapons). */
  setMode: (modeName: string | null) => void;
  /** Select a stance Combo String (melee Normal mode). */
  setComboString: (name: string | null) => void;

  assignMod: (slotIndex: number, itemId: string) => void;
  clearSlot: (slotIndex: number) => void;
  setRank: (slotIndex: number, rank: number) => void;
  setSlotPolarity: (slotIndex: number, polarity: Polarity) => void;
  setReactor: (on: boolean) => void;

  toggleCondition: (key: string, on?: boolean) => void;
  setStacks: (key: string, n: number) => void;
  setBuff: (id: string, strength: number | null) => void;
  /** Set the melee Follow-Through target count (1 = single-target). */
  setTargetCount: (n: number) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const EMPTY_BUILD: Build = { weaponId: '', slots: [], reactor: true, baseCapacity: 30 };

/** The max rank to assign a freshly-equipped item at (theorycrafting default). */
function defaultRankFor(itemId: string, slotKind: SlotState['kind'], dataset: Dataset): number {
  if (slotKind === 'arcane') {
    return dataset.arcanes.find((a) => a.id === itemId)?.maxRank ?? 0;
  }
  return dataset.mods.find((m) => m.id === itemId)?.maxRank ?? 0;
}

function itemKindOf(itemId: string, dataset: Dataset): SlotState['kind'] | null {
  const mod = dataset.mods.find((m) => m.id === itemId);
  if (mod) return mod.slot;
  if (dataset.arcanes.some((a) => a.id === itemId)) return 'arcane';
  return null;
}

export const useBuildStore = create<BuildStore>((set, get) => {
  /** Apply a build/combat mutation, snapshotting current state for undo. */
  const commit = (next: Partial<Snapshot>) => {
    const { build, combat, past } = get();
    set({
      past: [...past, { build, combat }],
      future: [],
      build: next.build ?? build,
      combat: next.combat ?? combat,
    });
  };

  const updateSlot = (slotIndex: number, patch: Partial<SlotState>) => {
    const { build } = get();
    const slots = build.slots.map((s, i) => (i === slotIndex ? { ...s, ...patch } : s));
    commit({ build: { ...build, slots } });
  };

  return {
    dataset: null,
    build: EMPTY_BUILD,
    combat: EMPTY_COMBAT_STATE,
    activeMode: null,
    activeComboString: null,
    past: [],
    future: [],

    initFromDataset: (dataset) => {
      const weapon = dataset.weapons[0];
      set({
        dataset,
        build: weapon ? makeInitialBuild(weapon) : EMPTY_BUILD,
        combat: EMPTY_COMBAT_STATE,
        activeMode: null,
        activeComboString: null,
        past: [],
        future: [],
      });
    },

    selectWeapon: (weaponId) => {
      const { dataset, build } = get();
      if (!dataset || weaponId === build.weaponId) return;
      const weapon = dataset.weapons.find((w) => w.id === weaponId);
      if (!weapon) return;
      // A weapon swap discards the old loadout; mode/combo reset.
      commit({ build: makeInitialBuild(weapon) });
      set({ activeMode: null, activeComboString: null });
    },

    setMode: (modeName) => set({ activeMode: modeName }),

    setComboString: (name) => set({ activeComboString: name }),

    assignMod: (slotIndex, itemId) => {
      const { build, dataset } = get();
      if (!dataset) return;
      const slot = build.slots[slotIndex];
      if (!slot) return;
      const itemKind = itemKindOf(itemId, dataset);
      if (!itemKind || !slotAccepts(slot.kind, itemKind)) return; // incompatible slot — ignore
      // Class-compatibility guard (e.g. a Pistol mod cannot go on a rifle).
      const mod = dataset.mods.find((m) => m.id === itemId);
      const weapon = dataset.weapons.find((w) => w.id === build.weaponId);
      if (mod && weapon && !modMatchesGroup(mod, weaponModGroup(weapon), weapon.weaponClass)) return;
      updateSlot(slotIndex, { itemId, rank: defaultRankFor(itemId, slot.kind, dataset) });
    },

    clearSlot: (slotIndex) => updateSlot(slotIndex, { itemId: null, rank: 0 }),

    setRank: (slotIndex, rank) => updateSlot(slotIndex, { rank: Math.max(0, rank) }),

    setSlotPolarity: (slotIndex, polarity) => updateSlot(slotIndex, { polarity }),

    setReactor: (on) => {
      const { build } = get();
      commit({ build: { ...build, reactor: on } });
    },

    toggleCondition: (key, on) => {
      const { combat } = get();
      const next = on ?? !combat.conditions[key];
      commit({ combat: { ...combat, conditions: { ...combat.conditions, [key]: next } } });
    },

    setStacks: (key, n) => {
      const { combat } = get();
      commit({ combat: { ...combat, stacks: { ...combat.stacks, [key]: Math.max(0, n) } } });
    },

    setBuff: (id, strength) => {
      const { combat } = get();
      const buffs = combat.buffs.filter((b) => b.id !== id);
      if (strength !== null) buffs.push({ id, strength });
      commit({ combat: { ...combat, buffs } });
    },

    setTargetCount: (n) => {
      const { combat } = get();
      commit({ combat: { ...combat, targetCount: Math.max(1, Math.floor(n)) } });
    },

    undo: () => {
      const { past, future, build, combat } = get();
      if (past.length === 0) return;
      const prev = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        future: [{ build, combat }, ...future],
        build: prev.build,
        combat: prev.combat,
      });
    },

    redo: () => {
      const { past, future, build, combat } = get();
      if (future.length === 0) return;
      const next = future[0];
      set({
        past: [...past, { build, combat }],
        future: future.slice(1),
        build: next.build,
        combat: next.combat,
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
});

/** Look up an equipped mod's curated data from the loaded dataset. */
export function modFromStore(dataset: Dataset | null, itemId: string | null): ModData | undefined {
  if (!dataset || !itemId) return undefined;
  return dataset.mods.find((m) => m.id === itemId);
}
