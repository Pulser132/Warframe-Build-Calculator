/**
 * Core domain types shared across the engine and consumed by the data layer.
 *
 * These are framework-agnostic, pure data shapes. The data layer (`src/data`)
 * imports these types and supplies the concrete values; the engine never imports
 * the data layer, so the dependency direction stays `data -> engine`.
 */

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

/** Which physical kind of slot a mod occupies in the modding UI. */
export type ModSlotKind = 'normal' | 'exilus' | 'aura' | 'arcane';

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

/** Curated weapon stats (normalized from `@wfcd/items` by `build-data.mjs`). */
export interface WeaponData {
  id: string;
  uniqueName: string;
  name: string;
  category: 'Primary';
  weaponClass: 'rifle';
  trigger: string;
  /** Base per-shot damage by type (only nonzero types present). */
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
