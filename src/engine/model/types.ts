/**
 * Core domain types shared across the engine and consumed by the data layer.
 *
 * These are framework-agnostic, pure data shapes. The data layer (`src/data`)
 * imports these types and supplies the concrete values; the engine never imports
 * the data layer, so the dependency direction stays `data -> engine`.
 */

// Type-only import for `WeaponData.fireModes`; the `types ↔ firemode` cycle is
// erased at compile time and therefore safe.
import type { FireMode } from './firemode';

/** In-game mod/slot polarities. `none` = unpolarized slot. */
export type Polarity =
  | 'madurai'
  | 'vazarin'
  | 'naramon'
  | 'zenurik'
  | 'unairu'
  | 'penjaga'
  | 'umbra'
  | 'none';

/** Every damage type the engine can carry. */
export type DamageType =
  | 'impact'
  | 'puncture'
  | 'slash'
  | 'heat'
  | 'cold'
  | 'electricity'
  | 'toxin'
  | 'blast'
  | 'radiation'
  | 'gas'
  | 'magnetic'
  | 'viral'
  | 'corrosive'
  | 'void'
  | 'true';

export const PHYSICAL_TYPES: readonly DamageType[] = ['impact', 'puncture', 'slash'];
export const BASE_ELEMENTS: readonly DamageType[] = ['heat', 'cold', 'electricity', 'toxin'];

/** Which physical kind of slot a mod occupies in the modding UI. `stance` is the
 * melee-only analogue of a gun's `aura` slot (holds a Stance mod). */
export type ModSlotKind = 'normal' | 'exilus' | 'aura' | 'arcane' | 'stance';

/**
 * Modifier buckets. Members of a bucket combine **additively**; buckets combine
 * **multiplicatively** with each other (see `docs/warframe/mechanics/damage.md`).
 */
export type Bucket =
  /** +%Damage (Serration, Rifle Amp). Multiplies the base+elemental subtotal. */
  | 'baseDamage'
  /** +%Element of base (Infected Clip, Stormbringer). Inside the base mult. */
  | 'elemental'
  /** +%Physical of that type. Inside the base mult. */
  | 'physical'
  /** +%Multishot (Split Chamber). Scales pellet count. */
  | 'multishot'
  /** +%Critical chance (Point Strike). */
  | 'critChance'
  /** +%Critical damage (Vital Sense). */
  | 'critDamage'
  /** +%Status chance (Rifle Aptitude). */
  | 'statusChance'
  /** +%Fire rate (Speed Trigger). DPS only. */
  | 'fireRate'
  /** Faction/ability multiplier (Bane, Roar) — a separate conditional multiplier. */
  | 'faction'
  /** Generic separate conditional multiplier (arcanes like Primary Merciless). */
  | 'directDamage';

/**
 * A single declarative effect. Authored at **max rank**; the engine scales the
 * value by the equipped rank. Effects with a `condition` only apply when that
 * condition is active in the combat state; `perStack` effects multiply `value`
 * by the current stack count.
 */
export interface EffectDescriptor {
  bucket: Bucket;
  /** Value at max rank (or per stack when `perStack`). E.g. 1.65 = +165%. */
  value: number;
  /** Required for `elemental` / `physical` buckets. */
  element?: DamageType;
  /** Condition key (e.g. `faction:grineer`); applies only when active. */
  condition?: string;
  /** If set, `value` is multiplied by the stack count from combat state. */
  perStack?: boolean;
  /** Max stacks (display + clamp) when `perStack`. */
  maxStacks?: number;
}

/** Weapon category — drives the gear class chosen by `createWeapon`. */
export type WeaponCategory = 'Primary' | 'Secondary' | 'Melee';
/**
 * Coarse weapon class used for mod-compatibility filtering in the UI. Gun classes
 * gate rifle/shotgun/pistol mods; melee classes gate **stance** compatibility
 * (every other melee mod is class-agnostic `Melee`).
 */
export type WeaponClass =
  | 'rifle'
  | 'shotgun'
  | 'pistol'
  | 'sniper'
  | 'bow'
  | 'launcher'
  | 'beam'
  // ── Melee classes (Stage 3) ──
  | 'sword'
  | 'heavy-blade'
  | 'nikana'
  | 'tonfa'
  | 'dagger'
  | 'dual-swords'
  | 'polearm'
  | 'staff'
  | 'hammer'
  | 'scythe'
  | 'whip'
  | 'fist'
  | 'rapier'
  | 'glaive'
  | 'machete'
  | 'claws'
  | 'gunblade'
  | 'warfan'
  | 'nunchaku'
  | 'melee';

/** Curated weapon stats (normalized from `@wfcd/items` by `build-data.mjs`). */
export interface WeaponData {
  id: string;
  uniqueName: string;
  name: string;
  category: WeaponCategory;
  weaponClass: WeaponClass;
  /** Raw `@wfcd` trigger string (normalized per fire mode in `fireModes`). */
  trigger: string;
  /**
   * Headline fire mode's per-type base damage. Mirrors `fireModes[0]`'s primary
   * component; kept top-level for back-compat with Stage 1 callers.
   */
  damage: Partial<Record<DamageType, number>>;
  totalBaseDamage: number;
  criticalChance: number;
  criticalMultiplier: number;
  statusChance: number;
  fireRate: number;
  magazine: number;
  reload: number;
  multishot: number;
  masteryReq: number;
  disposition: number;
  exilusPolarity: Polarity | null;
  /** Innate slot polarities on the normal slots (Vulkar Wraith ships one Madurai). */
  polarities: Polarity[];
  /**
   * The weapon's fire modes (Stage 2). Single-mode weapons have exactly one.
   * Optional for back-compat: when absent, the gear class synthesizes one mode
   * from the top-level stats (`synthesizeFireMode`).
   */
  fireModes?: FireMode[];

  // ── Melee-only metadata (Stage 3; absent on guns) ──

  /** Reach / swing distance in metres (melee). Display-only this stage. */
  range?: number;
  /** Follow-Through factor (melee): per-target multiplier `FT^(n-1)`. */
  followThrough?: number;
  /** Combo-counter duration in seconds (melee); decay deferred to Stage 5. */
  comboDuration?: number;
  /** Innate Stance-slot polarity (melee). */
  stancePolarity?: Polarity | null;
  /** Available stance Combo Strings (merged from `combos.json` by the loader). */
  comboStrings?: import('./firemode').ComboString[];
}

/** Curated mod stats + authored effect descriptors. */
export interface ModData {
  id: string;
  uniqueName: string;
  name: string;
  polarity: Polarity;
  /** Drain at rank 0; drain at rank r = baseDrain + r (auras: baseDrain is negative). */
  baseDrain: number;
  maxRank: number;
  rarity: string;
  /** `@wfcd` compatibility tag (e.g. `Rifle`). */
  compat: string;
  slot: ModSlotKind;
  description: string;
  /** Human-readable max-rank stat strings from `@wfcd` (UI/reference). */
  rawMaxStats: string[];
  /** Authored structured effects (max-rank values). */
  effects: EffectDescriptor[];
  /**
   * Custom-effect registry key (Stage 3). When set, the mod's context-dependent
   * effects come from `CUSTOM_EFFECTS[customEffectId](ctx)` — which returns
   * **final, self-scaled** descriptors — instead of (or in addition to) `effects`.
   * Used for Condition Overload / Blood Rush / Weeping Wounds. See ADR 0002.
   */
  customEffectId?: string;
}

/** Curated arcane stats + authored effect descriptors. */
export interface ArcaneData {
  id: string;
  uniqueName: string;
  name: string;
  rarity: string;
  maxRank: number;
  description: string;
  /** Human-readable max-rank stat strings from `@wfcd` (UI/reference). */
  rawMaxStats: string[];
  effects: EffectDescriptor[];
}
