/**
 * Curated dataset loaders.
 *
 * Each loader lazily imports the generated JSON (so Vite can code-split it) and
 * merges it with the authored effect descriptors / slot kinds from
 * `mods/descriptors.ts`, producing fully-typed domain objects. Results are
 * memoized per module load.
 */
import type { WeaponData, ModData, ArcaneData } from '@engine/model/types';
import { MOD_DESCRIPTORS, ARCANE_DESCRIPTORS } from './mods/descriptors';

/** Generated stat record (mods.json) — curated stats without effects/slot. */
type GeneratedMod = Omit<ModData, 'slot' | 'effects'>;
/** Generated stat record (arcanes.json) — curated stats without effects. */
type GeneratedArcane = Omit<ArcaneData, 'effects'>;

let weaponsPromise: Promise<WeaponData[]> | undefined;
let modsPromise: Promise<ModData[]> | undefined;
let arcanesPromise: Promise<ArcaneData[]> | undefined;

export function loadWeapons(): Promise<WeaponData[]> {
  weaponsPromise ??= import('./generated/weapons.json').then(
    (m) => m.default as unknown as WeaponData[],
  );
  return weaponsPromise;
}

export function loadMods(): Promise<ModData[]> {
  modsPromise ??= import('./generated/mods.json').then((m) => {
    const generated = m.default as unknown as GeneratedMod[];
    return generated.map((g): ModData => {
      const authored = MOD_DESCRIPTORS[g.id];
      if (!authored) {
        throw new Error(`No authored descriptor for mod "${g.id}". Add it to mods/descriptors.ts.`);
      }
      return { ...g, slot: authored.slot, effects: authored.effects };
    });
  });
  return modsPromise;
}

export function loadArcanes(): Promise<ArcaneData[]> {
  arcanesPromise ??= import('./generated/arcanes.json').then((m) => {
    const generated = m.default as unknown as GeneratedArcane[];
    return generated.map((g): ArcaneData => ({
      ...g,
      effects: ARCANE_DESCRIPTORS[g.id] ?? [],
    }));
  });
  return arcanesPromise;
}

export interface Dataset {
  weapons: WeaponData[];
  mods: ModData[];
  arcanes: ArcaneData[];
}

/** Load the full curated dataset (all categories) at once. */
export async function loadDataset(): Promise<Dataset> {
  const [weapons, mods, arcanes] = await Promise.all([
    loadWeapons(),
    loadMods(),
    loadArcanes(),
  ]);
  return { weapons, mods, arcanes };
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
