/**
 * The glue between the build document and the pure engine.
 *
 * `resolveSources` turns a compartment's equipped slots + active buffs into the
 * engine's `ResolvedSource[]`. `resolveFrameStats` runs the Warframe stat
 * resolver for the frame compartment (ADR 0003). `computeResult` runs
 * `calculateBuild` + leave-one-out attribution and returns a `DamageResult` with
 * `contributions` attached. All are pure functions of (build, combat, dataset)
 * so they are straightforward to unit-test.
 *
 * The frame→weapon buff link lives here (Stage 4): an active Emitted-Buff toggle
 * reads its magnitude from the equipped frame's `WarframeStats.emittedBuffs`,
 * falling back to a manual magnitude when no equipped frame provides it.
 */
import {
  createWeapon,
  attributeBuild,
  createMemoizedCalc,
  getBuffDef,
  buffEffects,
  resolveWarframe,
  type Weapon,
  type ResolvedSource,
  type DamageResult,
  type WarframeStats,
  type FrameSource,
} from '@engine';
import type { FireMode } from '@engine/model/firemode';
import type { Build, GearBuild, CombatState } from '@engine/model/build';
import { EMPTY_COMBAT_STATE } from '@engine/model/build';
import type { Dataset } from '@data/loaders';

/** Resolve the frame compartment's stats (ability attributes / EHP / buffs).
 * `combat` supplies stack counts for per-stack frame arcanes (e.g. Molt Augmented). */
export function resolveFrameStats(
  warframe: GearBuild | null,
  dataset: Dataset,
  combat: CombatState = EMPTY_COMBAT_STATE,
): WarframeStats | null {
  if (!warframe) return null;
  const frame = dataset.warframes.find((f) => f.id === warframe.itemId);
  if (!frame) return null;
  const modsById = new Map(dataset.mods.map((m) => [m.id, m]));
  const arcanesById = new Map(dataset.arcanes.map((a) => [a.id, a]));

  const sources: FrameSource[] = [];
  for (const slot of warframe.slots) {
    if (!slot.itemId) continue;
    if (slot.kind === 'arcane') {
      const arcane = arcanesById.get(slot.itemId);
      if (arcane?.frameEffects?.length) {
        sources.push({
          id: arcane.id,
          label: arcane.name,
          rank: slot.rank,
          maxRank: arcane.maxRank,
          frameEffects: arcane.frameEffects,
        });
      }
    } else {
      const mod = modsById.get(slot.itemId);
      if (mod && (mod.frameEffects?.length || mod.customEffectId)) {
        sources.push({
          id: mod.id,
          label: mod.name,
          rank: slot.rank,
          maxRank: mod.maxRank,
          frameEffects: mod.frameEffects,
          customEffectId: mod.customEffectId,
          set: mod.set,
        });
      }
    }
  }

  return resolveWarframe({
    base: {
      health: frame.health,
      shield: frame.shield,
      armor: frame.armor,
      energy: frame.energy,
      abilities: frame.abilities,
    },
    sources,
    abilityScaling: dataset.abilities,
    combat,
  });
}

export function resolveSources(
  weapon: GearBuild,
  combat: CombatState,
  dataset: Dataset,
  frameStats: WarframeStats | null = null,
): ResolvedSource[] {
  const modsById = new Map(dataset.mods.map((m) => [m.id, m]));
  const arcanesById = new Map(dataset.arcanes.map((a) => [a.id, a]));
  const sources: ResolvedSource[] = [];

  for (const slot of weapon.slots) {
    if (!slot.itemId) continue;
    if (slot.kind === 'arcane') {
      const arcane = arcanesById.get(slot.itemId);
      if (arcane) {
        sources.push({
          id: arcane.id,
          label: arcane.name,
          kind: 'arcane',
          rank: slot.rank,
          maxRank: arcane.maxRank,
          effects: arcane.effects,
        });
      }
    } else {
      const mod = modsById.get(slot.itemId);
      if (mod) {
        sources.push({
          id: mod.id,
          label: mod.name,
          kind: 'mod',
          rank: slot.rank,
          maxRank: mod.maxRank,
          effects: mod.effects,
          customEffectId: mod.customEffectId,
          set: mod.set,
        });
      }
    }
  }

  // Emitted Buffs (Roar): an active toggle's magnitude is frame-derived (from the
  // equipped frame's WarframeStats), with a manual fallback when no frame emits it.
  for (const buff of combat.buffs) {
    const def = getBuffDef(buff.id);
    if (!def) continue;
    const frameMagnitude = frameStats?.emittedBuffs[def.id];
    const magnitude = frameMagnitude ?? buff.manualMagnitude ?? def.defaultMagnitude;
    sources.push({
      id: `buff:${buff.id}`,
      label: def.label,
      kind: 'buff',
      rank: 0,
      maxRank: 0,
      effects: buffEffects(def, magnitude),
    });
  }

  return sources;
}

export function getWeapon(build: Build, dataset: Dataset): Weapon | null {
  const weapon = dataset.weapons.find((w) => w.id === build.weapon.itemId);
  return weapon ? createWeapon(weapon) : null;
}

/** @deprecated Use {@link getWeapon}; kept as an alias for back-compat. */
export const getGun = getWeapon;

/** Compute the full damage result + per-source contributions for a build.
 * `modeName` selects a fire mode (multi-mode weapons); `null` = the primary.
 * `comboStringName` selects a stance Combo String for the Normal mode (melee). */
export function computeResult(
  build: Build,
  combat: CombatState,
  dataset: Dataset,
  modeName: string | null = null,
  calc = createMemoizedCalc(),
  comboStringName: string | null = null,
): DamageResult | null {
  const weapon = getWeapon(build, dataset);
  if (!weapon) return null;
  const frameStats = resolveFrameStats(build.warframe, dataset, combat);
  const sources = resolveSources(build.weapon, combat, dataset, frameStats);
  const base = modeName ? weapon.fireMode(modeName) : weapon.primaryFireMode;

  // Attach a selected Combo String to the (Normal) mode, when chosen + available.
  let mode: FireMode = base;
  if (comboStringName && base.trigger === 'melee') {
    const combo = weapon.data.comboStrings?.find((c) => c.name === comboStringName);
    if (combo) mode = { ...base, comboString: combo };
  }

  const input = { weapon, sources, combat, mode, targetCount: combat.targetCount };
  const result = calc(input);
  const contributions = attributeBuild(input, undefined, calc);
  return { ...result, contributions };
}
