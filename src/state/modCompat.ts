/**
 * Gear-type → mod-compatibility filtering (pure). Drives both the mod picker
 * (what's offered) and the store guard (what can be equipped), so the rule lives
 * in one place. Stage 2: a gun's category/class selects its mod group. Stage 3
 * adds the `melee` group (melee mods are class-agnostic `Melee`) and **stance**
 * compatibility (gated on the weapon's melee class). Stage 4 adds the `warframe`
 * group (ADR 0003) and makes aura/arcane compatibility gear-type aware, closing
 * the latent leak where every aura/arcane matched every group.
 */
import type { ArcaneData, ModData, WeaponCategory, WeaponClass } from '@engine/model/types';

export type ModGroup = 'rifle' | 'shotgun' | 'pistol' | 'melee' | 'warframe';

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

/** Which mod group a gear compartment accepts. Weapons defer to
 * {@link weaponModGroup}; the Warframe compartment is its own `warframe` group. */
export function gearModGroup(gear: WeaponLike | { category: 'Warframe' }): ModGroup {
  if (gear.category === 'Warframe') return 'warframe';
  return weaponModGroup(gear as WeaponLike);
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
 * Whether a mod is compatible with a gear compartment's mod group (+ class for
 * stances). Aura mods + `WARFRAME`-tagged mods fit **only** the `warframe` group;
 * Stance mods (`slot: 'stance'`) fit only a melee weapon of the matching class;
 * class-tagged `normal`/`exilus` weapon mods match their group via `compat`.
 * This closes the Stage-2 leak where auras matched every group.
 */
export function modMatchesGroup(mod: ModData, group: ModGroup, weaponClass?: WeaponClass): boolean {
  const compat = mod.compat.toLowerCase();

  // Warframe compartment: the Aura slot + WARFRAME-tagged mods.
  if (group === 'warframe') {
    return mod.slot === 'aura' || compat.includes('warframe');
  }

  // Weapon compartments: auras are Warframe-only (Stage 4 removed the gun aura).
  if (mod.slot === 'aura') return false;
  // WARFRAME-tagged mods never fit a weapon.
  if (compat.includes('warframe')) return false;
  if (mod.slot === 'stance') {
    return group === 'melee' && weaponClass != null && stanceMatchesClass(mod, weaponClass);
  }
  if (group === 'melee') return compat.includes('melee');
  if (!compat) return true; // untagged utility
  if (group === 'pistol') return compat.includes('pistol');
  if (group === 'shotgun') return compat.includes('shotgun');
  return compat.includes('rifle');
}

/**
 * Whether an arcane fits a compartment (Stage 4). Frame arcanes (those carrying
 * `frameEffects`, e.g. Molt Augmented) fit **only** the `warframe` group; weapon
 * arcanes (damage `effects`, e.g. Primary Merciless) fit only weapon groups.
 * Closes the leak where every arcane matched every compartment.
 */
export function arcaneMatchesGroup(arcane: ArcaneData, group: ModGroup): boolean {
  const isFrameArcane = (arcane.frameEffects?.length ?? 0) > 0;
  return group === 'warframe' ? isFrameArcane : !isFrameArcane;
}
