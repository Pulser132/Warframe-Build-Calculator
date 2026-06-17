/**
 * Capability interfaces for gear. Gear classes implement the ones they support;
 * the pipeline/UI can feature-detect via these. `MultiMode` and `HasIncarnon`
 * are defined now (Stage 1 seams) and implemented in later stages.
 */

export interface HasCrit {
  readonly baseCritChance: number;
  readonly baseCritMultiplier: number;
}

export interface HasStatus {
  readonly baseStatusChance: number;
}

/** Weapons with multiple selectable fire modes (e.g. Stradavar, Hind). Stage 2. */
export interface MultiMode {
  /** Names of every selectable fire mode, in declaration order. */
  readonly modeNames: string[];
  /** Whether more than one mode is available. */
  readonly isMultiMode: boolean;
}

/** Feature-detect a multi-mode weapon. */
export function isMultiMode(gear: object): gear is MultiMode {
  return 'modeNames' in gear && 'isMultiMode' in gear;
}

/** Weapons with Incarnon evolutions. Stage 6. */
export interface HasIncarnon {
  readonly incarnonForms: string[];
  readonly incarnonActive: boolean;
}

export function hasCrit(gear: object): gear is HasCrit {
  return 'baseCritChance' in gear && 'baseCritMultiplier' in gear;
}

export function hasStatus(gear: object): gear is HasStatus {
  return 'baseStatusChance' in gear;
}

// ── Melee capability interfaces (Stage 3) ──

/** A weapon with a Combo Counter (raw count → tier → multiplier). */
export interface HasCombo {
  /** Combo-counter duration in seconds (decay deferred to Stage 5). */
  readonly comboDuration: number;
}

/** A weapon with a Heavy Attack mode (consumes combo; × Combo Multiplier). */
export interface HasHeavy {
  /** Heavy multiplier (`heavyAttackDamage / normalBaseDamage`). */
  readonly heavyMultiplier: number;
}

/** A weapon with Slam / Heavy Slam attacks (direct + radial + forced Lifted). */
export interface HasSlam {
  readonly hasSlam: true;
}

/** A weapon with a Stance slot (melee). */
export interface HasStance {
  /** Innate Stance-slot polarity. */
  readonly stancePolarity: import('../model/types').Polarity;
}

/** A weapon with Follow-Through + Reach metadata (melee multi-target). */
export interface HasReach {
  /** Reach / swing distance (m). */
  readonly range: number;
  /** Follow-Through factor (per-target multiplier `FT^(n-1)`). */
  readonly followThrough: number;
}

export function hasCombo(gear: object): gear is HasCombo {
  return 'comboDuration' in gear;
}
export function hasHeavy(gear: object): gear is HasHeavy {
  return 'heavyMultiplier' in gear;
}
export function hasSlam(gear: object): gear is HasSlam {
  return 'hasSlam' in gear;
}
export function hasStance(gear: object): gear is HasStance {
  return 'stancePolarity' in gear;
}
export function hasReach(gear: object): gear is HasReach {
  return 'range' in gear && 'followThrough' in gear;
}
