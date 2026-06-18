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
import type { EffectDescriptor } from './model/types';
import { STATE_REGISTRY, type BuffEntry } from './state';

/**
 * Back-compat alias: a `BuffDef` is a `buff`-kind {@link BuffEntry} from the
 * unified `STATE_REGISTRY` (ADR 0005 / Stage 5). The catalog itself now lives in
 * `engine/state`; this module keeps the buff-facing helpers (`getBuffDef`,
 * `listBuffs`, `buffEffects`) that `resolve.ts`/UI consume.
 */
export type BuffDef = BuffEntry;

export function getBuffDef(id: string): BuffDef | undefined {
  const entry = STATE_REGISTRY[id];
  return entry?.kind === 'buff' ? entry : undefined;
}

export function listBuffs(): BuffDef[] {
  return Object.values(STATE_REGISTRY).filter((e): e is BuffEntry => e.kind === 'buff');
}

/** Build the effect descriptors a buff contributes at the given magnitude. A
 * buff feeds its declared `multiplier` bucket (ADR 0005). */
export function buffEffects(def: BuffDef, magnitude: number): EffectDescriptor[] {
  return [{ multiplier: def.multiplier, value: magnitude }];
}
