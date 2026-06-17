/**
 * The glue between the build document and the pure engine.
 *
 * `resolveSources` turns equipped slots + active buffs into the engine's
 * `ResolvedSource[]` (in load order: slots first, then buffs). `computeResult`
 * runs `calculateBuild` + leave-one-out attribution and returns a `DamageResult`
 * with `contributions` attached. Both are pure functions of (build, combat,
 * dataset) so they are straightforward to unit-test.
 */
import {
  createWeapon,
  attributeBuild,
  createMemoizedCalc,
  getBuffDef,
  type Weapon,
  type ResolvedSource,
  type DamageResult,
} from '@engine';
import type { FireMode } from '@engine/model/firemode';
import type { Build, CombatState } from '@engine/model/build';
import type { Dataset } from '@data/loaders';

export function resolveSources(
  build: Build,
  combat: CombatState,
  dataset: Dataset,
): ResolvedSource[] {
  const modsById = new Map(dataset.mods.map((m) => [m.id, m]));
  const arcanesById = new Map(dataset.arcanes.map((a) => [a.id, a]));
  const sources: ResolvedSource[] = [];

  for (const slot of build.slots) {
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
        });
      }
    }
  }

  // External buffs (Roar) resolve from the registry into 'buff' sources.
  for (const buff of combat.buffs) {
    const def = getBuffDef(buff.id);
    if (!def) continue;
    sources.push({
      id: `buff:${buff.id}`,
      label: def.label,
      kind: 'buff',
      rank: 0,
      maxRank: 0,
      effects: def.toEffects(buff.strength),
    });
  }

  return sources;
}

export function getWeapon(build: Build, dataset: Dataset): Weapon | null {
  const weapon = dataset.weapons.find((w) => w.id === build.weaponId);
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
  const sources = resolveSources(build, combat, dataset);
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
