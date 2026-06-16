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

/** Weapons with multiple fire modes (e.g. Torid alt-fire). Stage 2. */
export interface MultiMode {
  readonly modeNames: string[];
  readonly activeMode: string;
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
