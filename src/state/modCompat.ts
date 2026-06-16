/**
 * Weapon-type → mod-compatibility filtering (pure). Drives both the mod picker
 * (what's offered) and the store guard (what can be equipped), so the rule lives
 * in one place. Stage 2: a gun's category/class selects its mod group.
 */
import type { ModData, WeaponCategory, WeaponClass } from '@engine/model/types';

export type ModGroup = 'rifle' | 'shotgun' | 'pistol';

export interface WeaponLike {
  category: WeaponCategory;
  weaponClass: WeaponClass;
}

/** Which mod group a weapon accepts (secondary → pistol, shotgun → shotgun,
 * every other primary → rifle, matching in-game compatibility). */
export function weaponModGroup(weapon: WeaponLike): ModGroup {
  if (weapon.category === 'Secondary') return 'pistol';
  if (weapon.weaponClass === 'shotgun') return 'shotgun';
  return 'rifle';
}

/**
 * Whether a mod is compatible with a weapon's mod group. Aura/arcane items are
 * not class-specific here (Stage 1 aura simplification); class-tagged mods
 * (`normal`/`exilus`) must match the weapon's group via their `compat` tag.
 */
export function modMatchesGroup(mod: ModData, group: ModGroup): boolean {
  if (mod.slot === 'aura' || mod.slot === 'arcane') return true;
  const compat = mod.compat.toLowerCase();
  if (!compat) return true; // untagged utility
  if (group === 'pistol') return compat.includes('pistol');
  if (group === 'shotgun') return compat.includes('shotgun');
  return compat.includes('rifle');
}
