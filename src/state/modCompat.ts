/**
 * Weapon-type → mod-compatibility filtering (pure). Drives both the mod picker
 * (what's offered) and the store guard (what can be equipped), so the rule lives
 * in one place. Stage 2: a gun's category/class selects its mod group. Stage 3
 * adds the `melee` group (melee mods are class-agnostic `Melee`) and **stance**
 * compatibility (gated on the weapon's melee class).
 */
import type { ModData, WeaponCategory, WeaponClass } from '@engine/model/types';

export type ModGroup = 'rifle' | 'shotgun' | 'pistol' | 'melee';

export interface WeaponLike {
  category: WeaponCategory;
  weaponClass: WeaponClass;
}

/** Which mod group a weapon accepts. */
export function weaponModGroup(weapon: WeaponLike): ModGroup {
  if (weapon.category === 'Melee') return 'melee';
  if (weapon.category === 'Secondary') return 'pistol';
  if (weapon.weaponClass === 'shotgun') return 'shotgun';
  return 'rifle';
}

/**
 * Melee weapon class → acceptable stance `compat` names (lower-cased, exact).
 * Stance mods carry their class as the `@wfcd` `compatName` (e.g. `Tonfas`,
 * `Heavy Blade`); a stance fits only a weapon of the matching class.
 */
const STANCE_COMPAT: Partial<Record<WeaponClass, string[]>> = {
  sword: ['swords'],
  'heavy-blade': ['heavy blade'],
  tonfa: ['tonfas'],
  'dual-swords': ['dual swords'],
  nikana: ['nikana', 'nikanas'],
  dagger: ['daggers'],
  polearm: ['polearm', 'polearms'],
  staff: ['staves', 'staff'],
  hammer: ['hammer', 'hammers'],
  scythe: ['scythe', 'scythes'],
  whip: ['whip', 'whips'],
  fist: ['fists', 'sparring'],
  rapier: ['rapier', 'rapiers'],
  glaive: ['glaive', 'glaives'],
  machete: ['machete', 'machetes'],
  claws: ['claws'],
  gunblade: ['gunblade', 'gunblades'],
  warfan: ['war fans', 'warfan'],
  nunchaku: ['nunchaku', 'nunchakus'],
};

/** Whether a stance mod fits a weapon of `weaponClass`. */
export function stanceMatchesClass(mod: ModData, weaponClass: WeaponClass): boolean {
  const allowed = STANCE_COMPAT[weaponClass];
  if (!allowed) return false;
  return allowed.includes(mod.compat.toLowerCase().trim());
}

/**
 * Whether a mod is compatible with a weapon's mod group (+ class for stances).
 * Aura/arcane items are not class-specific. Stance mods (`slot: 'stance'`) only
 * fit a melee weapon of the matching class; class-tagged `normal`/`exilus` mods
 * must match the weapon's group via their `compat` tag.
 */
export function modMatchesGroup(mod: ModData, group: ModGroup, weaponClass?: WeaponClass): boolean {
  if (mod.slot === 'aura' || mod.slot === 'arcane') return true;
  if (mod.slot === 'stance') {
    return group === 'melee' && weaponClass != null && stanceMatchesClass(mod, weaponClass);
  }
  const compat = mod.compat.toLowerCase();
  if (group === 'melee') return compat.includes('melee');
  if (!compat) return true; // untagged utility
  if (group === 'pistol') return compat.includes('pistol');
  if (group === 'shotgun') return compat.includes('shotgun');
  return compat.includes('rifle');
}
