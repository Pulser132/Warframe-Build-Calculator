/**
 * The single Zustand build store: the current `Build` (gear compartments) +
 * `CombatState`, the loaded dataset, mutation actions, and hand-rolled undo/redo.
 *
 * The store owns all mutation; the engine only reads (via `resolve.ts`). Build
 * mutations are **compartment-addressed** (ADR 0003): they act on the
 * `activeCompartment` (`weapon` | `warframe`), so the modding-screen UI stays
 * compartment-agnostic. Each mutating action snapshots {build, combat} onto an
 * undo stack and clears redo.
 */
import { create } from 'zustand';
import type { Build, GearBuild, CombatState, SlotState, Compartment } from '@engine/model/build';
import { EMPTY_COMBAT_STATE } from '@engine/model/build';
import type { ModData, Polarity } from '@engine/model/types';
import type { TargetState } from '@engine/target/types';
import type { Dataset } from '@data/loaders';

/** Default Target (Stage 5): a Charger — pure health, the clean baseline. */
export const DEFAULT_TARGET_STATE: TargetState = {
  enemyId: 'charger',
  level: 1,
  steelPath: false,
  armorStripPct: 0,
  overguard: false,
};
import { makeInitialBuild, makeWarframeBuild } from './initialBuild';
import { slotAccepts } from './slotRules';
import { gearModGroup, modMatchesGroup, arcaneMatchesGroup } from './modCompat';

interface Snapshot {
  build: Build;
  combat: CombatState;
  target: TargetState;
}

export interface BuildStore {
  dataset: Dataset | null;
  build: Build;
  combat: CombatState;
  /** Target / Enemy configuration (Stage 5, Phase B). Serializable for Stage 8. */
  target: TargetState;
  /** Which compartment the modding screen edits (ADR 0003). */
  activeCompartment: Compartment;
  /** Active fire-mode name (`null` = the weapon's primary mode). */
  activeMode: string | null;
  past: Snapshot[];
  future: Snapshot[];

  /** Active stance Combo String name (melee Normal mode; `null` = none). */
  activeComboString: string | null;

  initFromDataset: (dataset: Dataset) => void;
  /** Switch the active modding compartment. */
  setActiveCompartment: (compartment: Compartment) => void;
  /** Switch the equipped weapon, rebuilding the weapon compartment's slots. */
  selectWeapon: (weaponId: string) => void;
  /** Switch (or clear, with `null`) the equipped Warframe. */
  selectWarframe: (warframeId: string | null) => void;
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
  /** Toggle an Emitted Buff on/off (magnitude is frame-derived). */
  toggleBuff: (id: string, on?: boolean) => void;
  /** Set a buff's manual-magnitude fallback (used when no frame emits it). */
  setBuffManual: (id: string, manualMagnitude: number | null) => void;
  /** Set the melee Follow-Through target count (1 = single-target). */
  setTargetCount: (n: number) => void;
  /** Set the enemy-spacing assumption (m); 0/undefined → manual target count
   * is used instead of the reach-derived count (Stage 5, decision 19). */
  setEnemySpacing: (m: number | null) => void;

  // ── Target / Enemy (Stage 5, Phase B) ──
  /** Select the targeted enemy (or `'custom'` for the manual block). */
  selectEnemy: (enemyId: string) => void;
  /** Set the target enemy level (1–9999). */
  setTargetLevel: (level: number) => void;
  /** Toggle Steel Path (+100 levels + SP stat multipliers). */
  setSteelPath: (on: boolean) => void;
  /** Set the armor-strip fraction (0..1). */
  setArmorStrip: (pct: number) => void;
  /** Override (or clear, with `null`) the target's faction. */
  setFactionOverride: (faction: string | null) => void;
  /** Toggle the Eximus / Overguard pool. */
  toggleOverguard: (on?: boolean) => void;
  /** Patch the custom (manual) target stat block. */
  setCustomTarget: (patch: Partial<TargetState['custom']>) => void;
  /** Apply a featured-preset Target in one shot (enemy + overrides). */
  applyTargetPreset: (preset: Partial<TargetState> & { enemyId: string }) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const EMPTY_GEAR: GearBuild = { itemId: '', slots: [], reactor: true, baseCapacity: 30 };
const EMPTY_BUILD: Build = { weapon: EMPTY_GEAR, warframe: null };

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
  /** Apply a build/combat/target mutation, snapshotting current state for undo. */
  const commit = (next: Partial<Snapshot>) => {
    const { build, combat, target, past } = get();
    set({
      past: [...past, { build, combat, target }],
      future: [],
      build: next.build ?? build,
      combat: next.combat ?? combat,
      target: next.target ?? target,
    });
  };

  /** The gear of the active compartment (or `null` for an empty warframe). */
  const activeGear = (): GearBuild | null => {
    const { build, activeCompartment } = get();
    return activeCompartment === 'weapon' ? build.weapon : build.warframe;
  };

  /** Commit a replacement gear into the active compartment. */
  const commitActiveGear = (gear: GearBuild) => {
    const { build, activeCompartment } = get();
    commit({ build: { ...build, [activeCompartment]: gear } });
  };

  const updateSlot = (slotIndex: number, patch: Partial<SlotState>) => {
    const gear = activeGear();
    if (!gear) return;
    const slots = gear.slots.map((s, i) => (i === slotIndex ? { ...s, ...patch } : s));
    commitActiveGear({ ...gear, slots });
  };

  return {
    dataset: null,
    build: EMPTY_BUILD,
    combat: EMPTY_COMBAT_STATE,
    target: DEFAULT_TARGET_STATE,
    activeCompartment: 'weapon',
    activeMode: null,
    activeComboString: null,
    past: [],
    future: [],

    initFromDataset: (dataset) => {
      const weapon = dataset.weapons[0];
      const frame = dataset.warframes[0] ?? null;
      set({
        dataset,
        build: weapon ? makeInitialBuild(weapon, frame) : EMPTY_BUILD,
        combat: EMPTY_COMBAT_STATE,
        target: DEFAULT_TARGET_STATE,
        activeCompartment: 'weapon',
        activeMode: null,
        activeComboString: null,
        past: [],
        future: [],
      });
    },

    setActiveCompartment: (compartment) => set({ activeCompartment: compartment }),

    selectWeapon: (weaponId) => {
      const { dataset, build } = get();
      if (!dataset || weaponId === build.weapon.itemId) return;
      const weapon = dataset.weapons.find((w) => w.id === weaponId);
      if (!weapon) return;
      // A weapon swap discards the old weapon loadout; mode/combo reset.
      commit({ build: { ...build, weapon: makeInitialBuild(weapon).weapon } });
      set({ activeMode: null, activeComboString: null });
    },

    selectWarframe: (warframeId) => {
      const { dataset, build } = get();
      if (!dataset) return;
      if (warframeId === null) {
        if (!build.warframe) return;
        commit({ build: { ...build, warframe: null } });
        return;
      }
      if (warframeId === build.warframe?.itemId) return;
      const frame = dataset.warframes.find((f) => f.id === warframeId);
      if (!frame) return;
      commit({ build: { ...build, warframe: makeWarframeBuild(frame) } });
    },

    setMode: (modeName) => set({ activeMode: modeName }),

    setComboString: (name) => set({ activeComboString: name }),

    assignMod: (slotIndex, itemId) => {
      const { dataset, activeCompartment } = get();
      if (!dataset) return;
      const gear = activeGear();
      const slot = gear?.slots[slotIndex];
      if (!gear || !slot) return;
      const itemKind = itemKindOf(itemId, dataset);
      if (!itemKind || !slotAccepts(slot.kind, itemKind)) return; // incompatible slot — ignore

      // Gear-type compatibility guard (a Pistol mod can't go on a rifle; a
      // weapon mod can't go on the frame; a frame arcane can't go on a weapon).
      const group =
        activeCompartment === 'warframe'
          ? gearModGroup({ category: 'Warframe' })
          : gearModGroup(dataset.weapons.find((w) => w.id === gear.itemId)!);
      const weaponClass = dataset.weapons.find((w) => w.id === gear.itemId)?.weaponClass;
      if (itemKind === 'arcane') {
        const arcane = dataset.arcanes.find((a) => a.id === itemId);
        if (arcane && !arcaneMatchesGroup(arcane, group)) return;
      } else {
        const mod = dataset.mods.find((m) => m.id === itemId);
        if (mod && !modMatchesGroup(mod, group, weaponClass)) return;
      }
      updateSlot(slotIndex, { itemId, rank: defaultRankFor(itemId, slot.kind, dataset) });
    },

    clearSlot: (slotIndex) => updateSlot(slotIndex, { itemId: null, rank: 0 }),

    setRank: (slotIndex, rank) => updateSlot(slotIndex, { rank: Math.max(0, rank) }),

    setSlotPolarity: (slotIndex, polarity) => updateSlot(slotIndex, { polarity }),

    setReactor: (on) => {
      const gear = activeGear();
      if (!gear) return;
      commitActiveGear({ ...gear, reactor: on });
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

    toggleBuff: (id, on) => {
      const { combat } = get();
      const active = combat.buffs.some((b) => b.id === id);
      const next = on ?? !active;
      const buffs = combat.buffs.filter((b) => b.id !== id);
      if (next) buffs.push({ id });
      commit({ combat: { ...combat, buffs } });
    },

    setBuffManual: (id, manualMagnitude) => {
      const { combat } = get();
      const buffs = combat.buffs.map((b) =>
        b.id === id
          ? manualMagnitude === null
            ? { id: b.id }
            : { id: b.id, manualMagnitude }
          : b,
      );
      commit({ combat: { ...combat, buffs } });
    },

    setTargetCount: (n) => {
      const { combat } = get();
      commit({ combat: { ...combat, targetCount: Math.max(1, Math.floor(n)) } });
    },

    setEnemySpacing: (m) => {
      const { combat } = get();
      const next = { ...combat };
      if (m === null || m <= 0) delete next.enemySpacing;
      else next.enemySpacing = m;
      commit({ combat: next });
    },

    // ── Target / Enemy (Stage 5, Phase B) ──
    selectEnemy: (enemyId) => {
      const { target } = get();
      commit({ target: { ...target, enemyId } });
    },

    setTargetLevel: (level) => {
      const { target } = get();
      commit({ target: { ...target, level: Math.max(1, Math.min(9999, Math.floor(level))) } });
    },

    setSteelPath: (on) => {
      const { target } = get();
      commit({ target: { ...target, steelPath: on } });
    },

    setArmorStrip: (pct) => {
      const { target } = get();
      commit({ target: { ...target, armorStripPct: Math.max(0, Math.min(1, pct)) } });
    },

    setFactionOverride: (faction) => {
      const { target } = get();
      const next = { ...target };
      if (faction === null) delete next.factionOverride;
      else next.factionOverride = faction;
      commit({ target: next });
    },

    toggleOverguard: (on) => {
      const { target } = get();
      commit({ target: { ...target, overguard: on ?? !target.overguard } });
    },

    setCustomTarget: (patch) => {
      const { target } = get();
      commit({ target: { ...target, custom: { ...target.custom, ...patch } } });
    },

    applyTargetPreset: (preset) => {
      const { target } = get();
      // A preset replaces the enemy + its overrides but keeps the level/strip the
      // user dialed in unless the preset states them.
      commit({
        target: {
          ...target,
          steelPath: false,
          overguard: false,
          armorStripPct: target.armorStripPct,
          factionOverride: undefined,
          ...preset,
        },
      });
    },

    undo: () => {
      const { past, future, build, combat, target } = get();
      if (past.length === 0) return;
      const prev = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        future: [{ build, combat, target }, ...future],
        build: prev.build,
        combat: prev.combat,
        target: prev.target,
      });
    },

    redo: () => {
      const { past, future, build, combat, target } = get();
      if (future.length === 0) return;
      const next = future[0];
      set({
        past: [...past, { build, combat, target }],
        future: future.slice(1),
        build: next.build,
        combat: next.combat,
        target: next.target,
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
