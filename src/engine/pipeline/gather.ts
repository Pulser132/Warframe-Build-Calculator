/**
 * Stage 0 — gather descriptors from equipped sources + active conditionals.
 *
 * Each equipped mod/arcane/buff is a `ResolvedSource` carrying its raw max-rank
 * `EffectDescriptor`s. Here we scale each effect by the equipped rank, apply
 * stack counts, drop effects whose condition is inactive, and aggregate the
 * survivors into additive per-bucket sums. Element contributions keep **load
 * order** (the order sources are listed) so combination is deterministic.
 */
import type { DamageType, EffectDescriptor } from '../model/types';
import type { Build, CombatState } from '../model/build';
import { CUSTOM_EFFECTS } from '../model/registry';
import type { ElementContribution } from './elements';

/** One equipped source of effects (a mod, an arcane, or an external buff). */
export interface ResolvedSource {
  id: string;
  label: string;
  kind: 'mod' | 'arcane' | 'buff';
  rank: number;
  maxRank: number;
  effects: EffectDescriptor[];
  /**
   * Custom-effect registry key (Stage 3). When set, `gather` calls
   * `CUSTOM_EFFECTS[id](ctx)` and folds its **final, self-scaled** descriptors
   * into the bucket sums **without** re-applying `rankFactor`/`perStack`.
   */
  customEffectId?: string;
}

/** Additive sums per bucket, plus base-element contributions in load order. */
export interface BucketSums {
  baseDamage: number;
  elements: ElementContribution[];
  physical: Partial<Record<DamageType, number>>;
  multishot: number;
  critChance: number;
  critDamage: number;
  statusChance: number;
  fireRate: number;
  faction: number;
  directDamage: number;
}

/** Linear rank scaling: a mod at rank r gives `(r+1)/(maxRank+1)` of its max value. */
export function rankFactor(rank: number, maxRank: number): number {
  if (maxRank <= 0) return 1;
  const clamped = Math.max(0, Math.min(rank, maxRank));
  return (clamped + 1) / (maxRank + 1);
}

/** Whether a conditional effect is currently active. */
export function isEffectActive(effect: EffectDescriptor, combat: CombatState): boolean {
  if (!effect.condition) return true;
  if (effect.perStack) return (combat.stacks[effect.condition] ?? 0) > 0;
  return combat.conditions[effect.condition] === true;
}

/** Scaled value of an effect (rank × stacks), or `null` if inactive. */
export function scaledValue(
  source: ResolvedSource,
  effect: EffectDescriptor,
  combat: CombatState,
): number | null {
  if (!isEffectActive(effect, combat)) return null;
  let v = effect.value * rankFactor(source.rank, source.maxRank);
  if (effect.perStack && effect.condition) {
    const stacks = Math.min(combat.stacks[effect.condition] ?? 0, effect.maxStacks ?? Infinity);
    v *= stacks;
  }
  return v;
}

export function emptyBucketSums(): BucketSums {
  return {
    baseDamage: 0,
    elements: [],
    physical: {},
    multishot: 0,
    critChance: 0,
    critDamage: 0,
    statusChance: 0,
    fireRate: 0,
    faction: 0,
    directDamage: 0,
  };
}

/** Fold a single (already-scaled) bucket value into the running sums. */
function foldEffect(sums: BucketSums, effect: EffectDescriptor, value: number): void {
  switch (effect.bucket) {
    case 'baseDamage':
      sums.baseDamage += value;
      break;
    case 'elemental':
      if (effect.element) sums.elements.push({ type: effect.element, amount: value });
      break;
    case 'physical':
      if (effect.element)
        sums.physical[effect.element] = (sums.physical[effect.element] ?? 0) + value;
      break;
    case 'multishot':
      sums.multishot += value;
      break;
    case 'critChance':
      sums.critChance += value;
      break;
    case 'critDamage':
      sums.critDamage += value;
      break;
    case 'statusChance':
      sums.statusChance += value;
      break;
    case 'fireRate':
      sums.fireRate += value;
      break;
    case 'faction':
      sums.faction += value;
      break;
    case 'directDamage':
      sums.directDamage += value;
      break;
  }
}

export function gatherBuckets(
  sources: readonly ResolvedSource[],
  combat: CombatState,
  build?: Build,
): BucketSums {
  const sums = emptyBucketSums();
  for (const source of sources) {
    // Static descriptors: scale by rank/stacks, drop inactive conditionals.
    for (const effect of source.effects) {
      const value = scaledValue(source, effect, combat);
      if (value === null || value === 0) continue;
      foldEffect(sums, effect, value);
    }

    // Custom-effect registry: fold FINAL, self-scaled descriptors directly — no
    // re-scaling (ADR 0002). The function owns its own rank/stack scaling.
    if (source.customEffectId) {
      const fn = CUSTOM_EFFECTS[source.customEffectId];
      if (fn) {
        const produced = fn({ rank: source.rank, maxRank: source.maxRank, combat, build });
        for (const effect of produced) {
          if (!effect.value) continue;
          foldEffect(sums, effect, effect.value);
        }
      }
    }
  }
  return sums;
}
