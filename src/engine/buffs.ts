/**
 * Data-driven external-buff registry (combat state).
 *
 * A buff turns a single strength value into effect descriptors that feed a
 * bucket. Adding a new buff (Stage 5 and beyond) is **just a registry entry** —
 * no UI or pipeline changes (Goal.md: "Make sure this is easily expandable").
 *
 * Stage 1 ships one buff — Roar — which shares the *faction* bucket (so Roar and
 * Bane add together before multiplying), per `docs/warframe/mechanics/damage.md`.
 */
import type { EffectDescriptor } from './model/types';

export interface BuffDef {
  id: string;
  label: string;
  description: string;
  /** Build the effect descriptors this buff contributes at the given strength. */
  toEffects: (strength: number) => EffectDescriptor[];
  /** UI slider bounds + default (strength is a fraction, e.g. 0.5 = +50%). */
  defaultStrength: number;
  min: number;
  max: number;
  step: number;
}

export const BUFF_REGISTRY: Record<string, BuffDef> = {
  roar: {
    id: 'roar',
    label: 'Roar (Rhino)',
    description: 'Ability damage buff. Shares the faction bucket — adds with Bane, then multiplies.',
    toEffects: (strength) => [{ bucket: 'faction', value: strength }],
    defaultStrength: 0.5,
    min: 0,
    max: 1.5,
    step: 0.05,
  },
};

export function getBuffDef(id: string): BuffDef | undefined {
  return BUFF_REGISTRY[id];
}

export function listBuffs(): BuffDef[] {
  return Object.values(BUFF_REGISTRY);
}
