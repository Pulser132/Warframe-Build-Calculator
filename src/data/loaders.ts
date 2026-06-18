/**
 * Curated dataset loaders.
 *
 * Each loader lazily imports the generated JSON (so Vite can code-split it) and
 * merges it with the authored effect descriptors / slot kinds from
 * `mods/descriptors.ts`, producing fully-typed domain objects. Results are
 * memoized per module load.
 */
import type {
  WeaponData,
  WarframeData,
  ModData,
  ArcaneData,
  AbilityScaling,
} from '@engine/model/types';
import type { ComboString } from '@engine/model/firemode';
import { MOD_DESCRIPTORS, ARCANE_DESCRIPTORS } from './mods/descriptors';

/** Generated stat record (mods.json) — curated stats without effects/slot. */
type GeneratedMod = Omit<ModData, 'slot' | 'effects'>;
/** Generated stat record (arcanes.json) — curated stats without effects. */
type GeneratedArcane = Omit<ArcaneData, 'effects'>;
/** Committed combo-string dataset (scripts/scrape-combos.mjs → combos.json). */
type CombosFile = Record<string, ComboString[]>;
/** Committed ability-scaling dataset (scripts/scrape-abilities.mjs → abilities.json). */
type AbilitiesFile = Record<string, AbilityScaling>;

let weaponsPromise: Promise<WeaponData[]> | undefined;
let warframesPromise: Promise<WarframeData[]> | undefined;
let abilitiesPromise: Promise<AbilitiesFile> | undefined;
let modsPromise: Promise<ModData[]> | undefined;
let arcanesPromise: Promise<ArcaneData[]> | undefined;

export function loadWeapons(): Promise<WeaponData[]> {
  weaponsPromise ??= Promise.all([
    import('./generated/weapons.json'),
    import('./generated/combos.json'),
  ]).then(([w, c]) => {
    const weapons = w.default as unknown as WeaponData[];
    const combos = c.default as unknown as CombosFile;
    // Merge the committed combo strings (by weapon id) onto melee weapons. The
    // build/app read ONLY this committed file — no build-time network (ADR 0001).
    for (const weapon of weapons) {
      const strings = combos[weapon.id];
      if (strings && strings.length) weapon.comboStrings = strings;
    }
    return weapons;
  });
  return weaponsPromise;
}

/** Load the curated Warframe roster (base stats + ability metadata). */
export function loadWarframes(): Promise<WarframeData[]> {
  warframesPromise ??= import('./generated/warframes.json').then(
    (m) => m.default as unknown as WarframeData[],
  );
  return warframesPromise;
}

/** Load committed ability scaling (the only source the app reads — ADR 0001). */
export function loadAbilities(): Promise<AbilitiesFile> {
  abilitiesPromise ??= import('./generated/abilities.json').then(
    (m) => m.default as unknown as AbilitiesFile,
  );
  return abilitiesPromise;
}

export function loadMods(): Promise<ModData[]> {
  modsPromise ??= import('./generated/mods.json').then((m) => {
    const generated = m.default as unknown as GeneratedMod[];
    return generated.map((g): ModData => {
      const authored = MOD_DESCRIPTORS[g.id];
      if (!authored) {
        throw new Error(`No authored descriptor for mod "${g.id}". Add it to mods/descriptors.ts.`);
      }
      return {
        ...g,
        slot: authored.slot,
        effects: authored.effects,
        ...(authored.customEffectId ? { customEffectId: authored.customEffectId } : {}),
        ...(authored.frameEffects ? { frameEffects: authored.frameEffects } : {}),
        ...(authored.set ? { set: authored.set } : {}),
      };
    });
  });
  return modsPromise;
}

export function loadArcanes(): Promise<ArcaneData[]> {
  arcanesPromise ??= import('./generated/arcanes.json').then((m) => {
    const generated = m.default as unknown as GeneratedArcane[];
    return generated.map((g): ArcaneData => {
      const authored = ARCANE_DESCRIPTORS[g.id];
      return {
        ...g,
        effects: authored?.effects ?? [],
        ...(authored?.frameEffects ? { frameEffects: authored.frameEffects } : {}),
      };
    });
  });
  return arcanesPromise;
}

export interface Dataset {
  weapons: WeaponData[];
  warframes: WarframeData[];
  abilities: AbilitiesFile;
  mods: ModData[];
  arcanes: ArcaneData[];
}

/** Load the full curated dataset (all categories) at once. */
export async function loadDataset(): Promise<Dataset> {
  const [weapons, warframes, abilities, mods, arcanes] = await Promise.all([
    loadWeapons(),
    loadWarframes(),
    loadAbilities(),
    loadMods(),
    loadArcanes(),
  ]);
  return { weapons, warframes, abilities, mods, arcanes };
}

export async function loadWeapon(id: string): Promise<WeaponData | undefined> {
  return (await loadWeapons()).find((w) => w.id === id);
}

export async function loadMod(id: string): Promise<ModData | undefined> {
  return (await loadMods()).find((m) => m.id === id);
}

export async function loadArcane(id: string): Promise<ArcaneData | undefined> {
  return (await loadArcanes()).find((a) => a.id === id);
}
