/**
 * Emitted-Buff **catalog** (Stage 4).
 *
 * A buff in the catalog describes what an ability can emit: its label, the damage
 * **bucket** its magnitude feeds, and the authored **ability** that produces it.
 * The magnitude itself is no longer a manual slider — it is derived from the
 * equipped frame's Ability Strength (see `engine/warframe`), with a manual
 * fallback when no equipped frame provides the buff (a squadmate's Roar).
 *
 * Roar shares the **faction** bucket (so Roar and Bane add together before
 * multiplying), per `docs/warframe/mechanics/damage.md`.
 */
import type { Bucket, EffectDescriptor } from './model/types';

export interface BuffDef {
  id: string;
  label: string;
  description: string;
  /** Damage bucket this buff's magnitude feeds. */
  bucket: Bucket;
  /** Authored ability that emits this buff (frame-derived magnitude). */
  abilityId: string;
  /** Manual magnitude (fraction, e.g. 0.5 = +50%) used only when no equipped
   * frame emits the buff. */
  defaultMagnitude: number;
}

export const BUFF_REGISTRY: Record<string, BuffDef> = {
  roar: {
    id: 'roar',
    label: 'Roar (Rhino)',
    description:
      'Ability damage buff. Shares the faction bucket — adds with Bane, then multiplies. Magnitude = 0.5 × Ability Strength.',
    bucket: 'faction',
    abilityId: 'roar',
    defaultMagnitude: 0.5,
  },
};

export function getBuffDef(id: string): BuffDef | undefined {
  return BUFF_REGISTRY[id];
}

export function listBuffs(): BuffDef[] {
  return Object.values(BUFF_REGISTRY);
}

/** Build the effect descriptors a buff contributes at the given magnitude. */
export function buffEffects(def: BuffDef, magnitude: number): EffectDescriptor[] {
  return [{ bucket: def.bucket, value: magnitude }];
}
