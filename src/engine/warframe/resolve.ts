/**
 * `resolveWarframe` — the Warframe stat resolver (Stage 4).
 *
 * Sums equipped frame mods into the four ability attributes + survivability
 * stats (all **additive** within a stat), applies the efficiency cap and base
 * multipliers, computes generic EHP, and derives each ability's strength-scaled
 * outputs (including the Emitted Buff magnitudes the weapon calc consumes).
 *
 * It reuses the additive-within-bucket primitive (`rankFactor`) and the shared
 * custom-effect registry (Umbral set bonuses, ADR 0004) but is **not** the
 * weapon damage pipeline — frame-stat buckets never cross into damage buckets.
 */
import type { AbilityMeta, FrameEffect, FrameStat } from '../model/types';
import { CUSTOM_EFFECTS } from '../model/registry';
import { rankFactor, tallySetCounts } from '../pipeline/gather';
import { EMPTY_COMBAT_STATE, type CombatState } from '../model/build';
import { buffMappingsFor } from './abilities';
import { computeEhp } from './ehp';
// Side-effect import: registers the Umbral set-bonus custom effects into the
// shared registry the resolver consults (mirrors the Stage 3 melee pattern).
import './frameCustomEffects';
import type {
  AbilityOutput,
  AbilityScalingMap,
  FrameSource,
  FrameStatSums,
  WarframeStats,
} from './types';

/** Ability Efficiency hard cap (175%), per the wiki. */
export const EFFICIENCY_CAP = 1.75;

const FRAME_STATS: readonly FrameStat[] = [
  'abilityStrength',
  'abilityDuration',
  'abilityRange',
  'abilityEfficiency',
  'health',
  'shield',
  'armor',
  'energy',
  'sprintSpeed',
];

function emptySums(): FrameStatSums {
  return {
    abilityStrength: 0,
    abilityDuration: 0,
    abilityRange: 0,
    abilityEfficiency: 0,
    health: 0,
    shield: 0,
    armor: 0,
    energy: 0,
    sprintSpeed: 0,
  };
}

/** Base survivability + utility stats + ability roster a frame contributes. */
export interface FrameBase {
  health: number;
  shield: number;
  armor: number;
  energy: number;
  abilities: AbilityMeta[];
}

export interface FrameResolveInput {
  base: FrameBase;
  /** Equipped frame mods (auras/exilus/normal), in load order. */
  sources: readonly FrameSource[];
  /** Ability numeric scaling (merged from `abilities.json`), keyed by ability id. */
  abilityScaling: AbilityScalingMap;
  /** Combat state (conditional toggles + stack counts for per-stack frame mods). */
  combat?: CombatState;
}

/**
 * Scaled contribution of a frame effect (rank × stacks), or `null` if an inactive
 * conditional. Mirrors the weapon `scaledValue` so additive-vs-stacked behaves
 * consistently across the two resolvers.
 */
function scaledFrameValue(eff: FrameEffect, rank: number, maxRank: number, combat: CombatState): number | null {
  // A condition-gated, non-stacking effect applies only when its toggle is on.
  if (eff.condition && !eff.perStack && combat.conditions[eff.condition] !== true) return null;
  let v = eff.value * rankFactor(rank, maxRank);
  if (eff.perStack && eff.condition) {
    const stacks = Math.min(combat.stacks[eff.condition] ?? 0, eff.maxStacks ?? Infinity);
    v *= stacks;
  }
  return v;
}

export function resolveWarframe(input: FrameResolveInput): WarframeStats {
  const { base, sources, abilityScaling } = input;
  const combat = input.combat ?? EMPTY_COMBAT_STATE;
  const sums = emptySums();
  const setCounts = tallySetCounts(sources);

  for (const source of sources) {
    // Static frame-stat effects: scale by rank (+ stacks/condition), fold additively.
    for (const eff of source.frameEffects ?? []) {
      const v = scaledFrameValue(eff, source.rank, source.maxRank, combat);
      if (v !== null) sums[eff.stat] += v;
    }
    // Custom-effect registry (Umbral set bonuses): functions return FINAL,
    // self-scaled effects (ADR 0002/0004). Fold only frame-stat effects.
    if (source.customEffectId) {
      const fn = CUSTOM_EFFECTS[source.customEffectId];
      if (fn) {
        const produced = fn({
          rank: source.rank,
          maxRank: source.maxRank,
          combat,
          setCounts,
        });
        for (const e of produced) {
          if ('stat' in e) sums[(e as FrameEffect).stat] += (e as FrameEffect).value;
        }
      }
    }
  }

  // ── Ability attributes (additive; efficiency capped) ──
  const abilityStrength = 1 + sums.abilityStrength;
  const abilityDuration = 1 + sums.abilityDuration;
  const abilityRange = 1 + sums.abilityRange;
  const abilityEfficiency = Math.min(EFFICIENCY_CAP, 1 + sums.abilityEfficiency);

  // ── Survivability + utility (base × additive mod multiplier) ──
  const health = base.health * (1 + sums.health);
  const shield = base.shield * (1 + sums.shield);
  const armor = base.armor * (1 + sums.armor);
  const energy = base.energy * (1 + sums.energy);

  const ehp = computeEhp(health, shield, armor);

  // ── Ability outputs + emitted buffs (strength/duration/range-scaled) ──
  const abilities: AbilityOutput[] = [];
  const emittedBuffs: Record<string, number> = {};
  for (const meta of base.abilities) {
    const scaling = abilityScaling[meta.id];
    const out: AbilityOutput = { id: meta.id, name: meta.name };
    if (scaling) {
      if (scaling.strengthBase != null) out.strengthMagnitude = scaling.strengthBase * abilityStrength;
      if (scaling.durationBase != null) out.durationSeconds = scaling.durationBase * abilityDuration;
      if (scaling.rangeBase != null) out.rangeMetres = scaling.rangeBase * abilityRange;
      if (scaling.lowConfidence) out.lowConfidence = true;

      // Emitted buffs: magnitude from the strength-scaled base.
      for (const mapping of buffMappingsFor(meta.id)) {
        if (mapping.scaling === 'strength' && scaling.strengthBase != null) {
          emittedBuffs[mapping.buffId] = scaling.strengthBase * abilityStrength;
        }
      }
    }
    abilities.push(out);
  }

  return {
    abilityStrength,
    abilityDuration,
    abilityRange,
    abilityEfficiency,
    health,
    shield,
    armor,
    energy,
    ehp,
    abilities,
    emittedBuffs,
  };
}

/** Exported for tests / display. */
export const ALL_FRAME_STATS = FRAME_STATS;
