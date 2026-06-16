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
  type Gun,
  type ResolvedSource,
  type DamageResult,
} from '@engine';
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

export function getGun(build: Build, dataset: Dataset): Gun | null {
  const weapon = dataset.weapons.find((w) => w.id === build.weaponId);
  return weapon ? (createWeapon(weapon) as Gun) : null;
}

/** Compute the full damage result + per-source contributions for a build. */
export function computeResult(
  build: Build,
  combat: CombatState,
  dataset: Dataset,
  calc = createMemoizedCalc(),
): DamageResult | null {
  const weapon = getGun(build, dataset);
  if (!weapon) return null;
  const sources = resolveSources(build, combat, dataset);
  const result = calc({ weapon, sources, combat });
  const contributions = attributeBuild({ weapon, sources, combat }, undefined, calc);
  return { ...result, contributions };
}
