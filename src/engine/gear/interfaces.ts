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
