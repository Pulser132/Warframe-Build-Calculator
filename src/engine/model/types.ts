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
   * Used for Condition Overload / Blood Rush / Weeping Wounds, and (Stage 4) the
   * Umbral set-bonus mods. See ADR 0002 / ADR 0004.
   */
  customEffectId?: string;
  /**
   * Frame-stat effects (Stage 4): a Warframe mod's contribution to the four
   * ability attributes / survivability stats. Distinct from weapon-damage
   * `effects` so the frame resolver and the damage pipeline never cross. Custom
   * frame mods (Umbral) leave this empty and route through `customEffectId`.
   */
  frameEffects?: FrameEffect[];
  /**
   * Set id (Stage 4, ADR 0004): mods sharing a `set` are tallied into
   * `ctx.setCounts[set]` so a set-bonus registry function can read how many are
   * equipped (e.g. `umbral`).
   */
  set?: string;
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
  /** Frame-stat effects (Stage 4): a Warframe arcane's contribution to the frame
   * resolver (e.g. Molt Augmented +60% Strength at max stacks). */
  frameEffects?: FrameEffect[];
}

// ── Warframe (Stage 4) ───────────────────────────────────────────────────────

/**
 * Frame-stat buckets (Stage 4). A separate taxonomy from the damage `Bucket`s:
 * members of a frame-stat bucket combine **additively** (the four ability
 * attributes and the base survivability stats are all additive mod stacks). The
 * frame resolver sums these; it is **not** the weapon damage pipeline.
 */
export type FrameStat =
  | 'abilityStrength'
  | 'abilityDuration'
  | 'abilityRange'
  | 'abilityEfficiency'
  | 'health'
  | 'shield'
  | 'armor'
  | 'energy'
  | 'sprintSpeed';

/**
 * A single declarative frame-stat effect (Stage 4). Authored at **max rank**;
 * the resolver scales `value` by the equipped rank. All frame-stat mods are
 * additive within their stat (e.g. `abilityStrength += 0.3` for Intensify).
 *
 * `condition`/`perStack` mirror {@link EffectDescriptor}: a `condition`-gated
 * effect applies only when that combat toggle is active, and a `perStack` effect
 * multiplies `value` by the current stack count (e.g. Molt Augmented's
 * +0.24% Strength per stack, up to 250).
 */
export interface FrameEffect {
  stat: FrameStat;
  /** Fraction at max rank (0.3 = +30%, or per stack when `perStack`); negative for trade-offs. */
  value: number;
  /** Condition/stack key (e.g. `arcane:molt-augmented`); applies only when active/stacked. */
  condition?: string;
  /** If set, `value` is multiplied by the stack count from combat state. */
  perStack?: boolean;
  /** Max stacks (display + clamp) when `perStack`. */
  maxStacks?: number;
}

/** One ability's authored metadata (Stage 4). Names/descriptions from `@wfcd`;
 * numeric scaling merged from the offline scraper (`abilities.json`). */
export interface AbilityMeta {
  /** Slug of the ability name (e.g. `roar`). */
  id: string;
  name: string;
  description: string;
}

/** Curated Warframe stats (normalized from `@wfcd/items` by `build-data.mjs`). */
export interface WarframeData {
  id: string;
  uniqueName: string;
  name: string;
  /** Base survivability + utility stats. */
  health: number;
  shield: number;
  armor: number;
  /** Energy pool (`@wfcd power`). */
  energy: number;
  sprintSpeed: number;
  masteryReq: number;
  passiveDescription: string;
  /** Ability roster (names/descriptions only; numeric scaling lives in `abilities.json`). */
  abilities: AbilityMeta[];
  /** Aura-slot innate polarity (`none` when `@wfcd` does not populate it). */
  auraPolarity: Polarity | null;
  /** Exilus-slot innate polarity. */
  exilusPolarity: Polarity | null;
  /** Innate normal-slot polarities. */
  polarities: Polarity[];
}

/**
 * Scaled ability numbers (Stage 4 scraper → `abilities.json`). Per ability:
 * each output's base magnitude and the attribute it scales on. The engine
 * **mapping** (which output feeds which damage bucket) is authored in TS.
 */
export interface AbilityScaling {
  /** Ability slug (matches `AbilityMeta.id`). */
  id: string;
  /** Display name (for the scraper's reviewable output). */
  name: string;
  /** Base damage-bonus magnitude at 100% Strength (Roar: 0.5 = +50%). */
  strengthBase?: number;
  /** Base duration in seconds at 100% Duration. */
  durationBase?: number;
  /** Base range in metres at 100% Range. */
  rangeBase?: number;
  /** Flagged when the scrape was uncertain and needs manual review. */
  lowConfidence?: boolean;
}
