/**
 * Authored mod/arcane effect descriptors + slot kinds.
 *
 * `@wfcd/items` only gives human-readable stat strings (e.g. "+165% Damage"), so
 * the structured `{ bucket, value, ... }` descriptors are authored here by hand
 * and cross-checked against the wiki (see `docs/warframe/mechanics/damage.md`).
 * Values are at **max rank**; the engine scales them by the equipped rank.
 *
 * Additive-vs-multiplicative (Goal.md requirement) is encoded by the bucket:
 * members of a bucket add together; buckets multiply across each other.
 */
import type { EffectDescriptor, FrameEffect, ModSlotKind } from '@engine/model/types';

export interface AuthoredMod {
  slot: ModSlotKind;
  effects: EffectDescriptor[];
  /** Custom-effect registry key (Stage 3/4): context-dependent mods route here. */
  customEffectId?: string;
  /** Frame-stat effects (Stage 4): Warframe mods feed the frame resolver. */
  frameEffects?: FrameEffect[];
  /** Set id (Stage 4, ADR 0004): tallied for set bonuses (e.g. `umbral`). */
  set?: string;
}

/** Authored arcane: weapon-damage effects and/or frame-stat effects (Stage 4). */
export interface AuthoredArcane {
  effects?: EffectDescriptor[];
  frameEffects?: FrameEffect[];
}

/** Keyed by curated mod `id` (slug of the name). */
export const MOD_DESCRIPTORS: Record<string, AuthoredMod> = {
  // Base-damage bucket (additive with Rifle Amp): multiplies base + elemental subtotal.
  serration: { slot: 'normal', effects: [{ bucket: 'baseDamage', value: 1.65 }] },
  // Multishot bucket: scales pellet count.
  'split-chamber': { slot: 'normal', effects: [{ bucket: 'multishot', value: 0.9 }] },
  // Critical chance bucket.
  'point-strike': { slot: 'normal', effects: [{ bucket: 'critChance', value: 1.5 }] },
  // Critical damage bucket.
  'vital-sense': { slot: 'normal', effects: [{ bucket: 'critDamage', value: 1.2 }] },
  // Status chance bucket.
  'rifle-aptitude': { slot: 'normal', effects: [{ bucket: 'statusChance', value: 0.9 }] },
  // Elemental bucket — Toxin (+ Electricity → Corrosive after combination).
  'infected-clip': {
    slot: 'normal',
    effects: [{ bucket: 'elemental', element: 'toxin', value: 0.9 }],
  },
  // Elemental bucket — Electricity.
  stormbringer: {
    slot: 'normal',
    effects: [{ bucket: 'elemental', element: 'electricity', value: 0.9 }],
  },
  // Fire-rate bucket: DPS only.
  'speed-trigger': { slot: 'normal', effects: [{ bucket: 'fireRate', value: 0.6 }] },
  // Faction multiplier bucket (separate, conditional, ADR 0005): additive with
  // Roar; ×1.3 vs Grineer.
  'bane-of-grineer': {
    slot: 'normal',
    effects: [{ multiplier: 'faction', value: 0.3, condition: 'faction:grineer' }],
  },
  // Aura: Rifle Amp adds rifle damage, additive in the base-damage bucket.
  'rifle-amp': { slot: 'aura', effects: [{ bucket: 'baseDamage', value: 0.27 }] },
  // Exilus utility — no damage contribution (slot demo). Beam range is inert on hitscan.
  'sinister-reach': { slot: 'exilus', effects: [] },

  // ── Secondary (pistol) mod set ──
  // Base-damage bucket (the pistol Serration).
  'hornet-strike': { slot: 'normal', effects: [{ bucket: 'baseDamage', value: 2.2 }] },
  // Multishot bucket.
  'barrel-diffusion': { slot: 'normal', effects: [{ bucket: 'multishot', value: 1.2 }] },
  // Galvanized Diffusion (Madurai): +110% Multishot base, and on kill +30%
  // Multishot per stack up to 4 (→ +120%) for 20s. The per-stack bonus is an
  // additive contribution into the **multishot** bucket, gated on the on-kill
  // stack count (decision 4). Source: docs/warframe/mods/galvanized-diffusion.md.
  'galvanized-diffusion': {
    slot: 'normal',
    effects: [
      { bucket: 'multishot', value: 1.1 },
      {
        bucket: 'multishot',
        value: 0.3,
        perStack: true,
        maxStacks: 4,
        condition: 'mod:galvanized-diffusion',
      },
    ],
  },
  // Dual-stat: +60% Multishot, +60% Fire Rate (two buckets, both additive within their own).
  'lethal-torrent': {
    slot: 'normal',
    effects: [
      { bucket: 'multishot', value: 0.6 },
      { bucket: 'fireRate', value: 0.6 },
    ],
  },
  // Critical chance bucket.
  'pistol-gambit': { slot: 'normal', effects: [{ bucket: 'critChance', value: 1.2 }] },
  // Elemental — Electricity.
  convulsion: {
    slot: 'normal',
    effects: [{ bucket: 'elemental', element: 'electricity', value: 0.9 }],
  },
  // Elemental — Toxin.
  'pathogen-rounds': {
    slot: 'normal',
    effects: [{ bucket: 'elemental', element: 'toxin', value: 0.9 }],
  },
  // Status chance bucket.
  'sure-shot': { slot: 'normal', effects: [{ bucket: 'statusChance', value: 0.9 }] },
  // Fire-rate bucket.
  gunslinger: { slot: 'normal', effects: [{ bucket: 'fireRate', value: 0.72 }] },

  // ── Shotgun mod set ──
  // Base-damage bucket (the shotgun Serration).
  'point-blank': { slot: 'normal', effects: [{ bucket: 'baseDamage', value: 0.9 }] },
  // Multishot bucket — adds pellets.
  'hell-s-chamber': { slot: 'normal', effects: [{ bucket: 'multishot', value: 1.2 }] },
  // Critical chance bucket.
  blunderbuss: { slot: 'normal', effects: [{ bucket: 'critChance', value: 0.9 }] },
  // Elemental — Electricity.
  'charged-shell': {
    slot: 'normal',
    effects: [{ bucket: 'elemental', element: 'electricity', value: 0.9 }],
  },
  // Elemental — Toxin.
  'contagious-spread': {
    slot: 'normal',
    effects: [{ bucket: 'elemental', element: 'toxin', value: 0.9 }],
  },
  // Status chance bucket (per pellet on shotguns).
  'shotgun-savvy': { slot: 'normal', effects: [{ bucket: 'statusChance', value: 0.9 }] },

  // ── Melee mod set (Stage 3). Values are @wfcd max-rank stats, verified vs the
  //    wiki (docs/warframe/mods/*). Melee mods are class-agnostic (`compat: Melee`)
  //    except stances, which gate on weapon class. ──
  // Base-damage bucket (the melee Serration).
  'primed-pressure-point': { slot: 'normal', effects: [{ bucket: 'baseDamage', value: 1.65 }] },
  'pressure-point': { slot: 'normal', effects: [{ bucket: 'baseDamage', value: 0.8 }] },
  // Critical damage bucket.
  'organ-shatter': { slot: 'normal', effects: [{ bucket: 'critDamage', value: 0.6 }] },
  // Critical chance bucket. (The "×2 for Heavy Attacks" nuance is deferred.)
  'true-steel': { slot: 'normal', effects: [{ bucket: 'critChance', value: 0.8 }] },
  // Status chance bucket.
  'melee-prowess': { slot: 'normal', effects: [{ bucket: 'statusChance', value: 0.6 }] },
  // Elemental bucket.
  'fever-strike': { slot: 'normal', effects: [{ bucket: 'elemental', element: 'toxin', value: 0.6 }] },
  'molten-impact': { slot: 'normal', effects: [{ bucket: 'elemental', element: 'heat', value: 0.6 }] },
  'north-wind': { slot: 'normal', effects: [{ bucket: 'elemental', element: 'cold', value: 0.6 }] },
  'shocking-touch': {
    slot: 'normal',
    effects: [{ bucket: 'elemental', element: 'electricity', value: 0.6 }],
  },
  // Attack-speed (fire-rate) bucket.
  fury: { slot: 'normal', effects: [{ bucket: 'fireRate', value: 0.2 }] },
  // Corrupted dual-stat: +100% Melee Damage, −20% Attack Speed.
  'spoiled-strike': {
    slot: 'normal',
    effects: [
      { bucket: 'baseDamage', value: 1.0 },
      { bucket: 'fireRate', value: -0.2 },
    ],
  },
  // Reach: range is multi-target metadata (reach→enemy-count is Stage 5) — no
  // single-target damage contribution this stage.
  'primed-reach': { slot: 'normal', effects: [] },
  // Combo-scaling mods routed through the custom-effect registry (ADR 0002).
  'blood-rush': { slot: 'normal', effects: [], customEffectId: 'blood-rush' },
  'weeping-wounds': { slot: 'normal', effects: [], customEffectId: 'weeping-wounds' },
  'condition-overload': { slot: 'normal', effects: [], customEffectId: 'condition-overload' },

  // ── Stances. They unlock Combo Strings (sourced from combos.json); no flat
  //    stat effects modeled here. ──
  'gemini-cross': { slot: 'stance', effects: [] },
  'sovereign-outcast': { slot: 'stance', effects: [] },
  'tempo-royale': { slot: 'stance', effects: [] },
  'cleaving-whirlwind': { slot: 'stance', effects: [] },

  // ── Warframe mods (Stage 4). Frame mods carry `frameEffects` (not weapon
  //    `effects`), feeding the frame-stat resolver. Values are @wfcd max-rank
  //    stats, verified vs the wiki (docs/warframe/mods/*). The four ability
  //    attributes and survivability stats are all additive within their stat. ──
  // Ability-attribute mods (normal slot).
  intensify: { slot: 'normal', effects: [], frameEffects: [{ stat: 'abilityStrength', value: 0.3 }] },
  'transient-fortitude': {
    slot: 'normal',
    effects: [],
    frameEffects: [
      { stat: 'abilityStrength', value: 0.55 },
      { stat: 'abilityDuration', value: -0.275 },
    ],
  },
  'blind-rage': {
    slot: 'normal',
    effects: [],
    frameEffects: [
      { stat: 'abilityStrength', value: 0.99 },
      { stat: 'abilityEfficiency', value: -0.55 },
    ],
  },
  overextended: {
    slot: 'normal',
    effects: [],
    frameEffects: [
      { stat: 'abilityRange', value: 0.9 },
      { stat: 'abilityStrength', value: -0.6 },
    ],
  },
  streamline: { slot: 'normal', effects: [], frameEffects: [{ stat: 'abilityEfficiency', value: 0.3 }] },
  'fleeting-expertise': {
    slot: 'normal',
    effects: [],
    frameEffects: [
      { stat: 'abilityEfficiency', value: 0.6 },
      { stat: 'abilityDuration', value: -0.6 },
    ],
  },
  'narrow-minded': {
    slot: 'normal',
    effects: [],
    frameEffects: [
      { stat: 'abilityDuration', value: 0.99 },
      { stat: 'abilityRange', value: -0.66 },
    ],
  },
  stretch: { slot: 'normal', effects: [], frameEffects: [{ stat: 'abilityRange', value: 0.45 }] },
  continuity: { slot: 'normal', effects: [], frameEffects: [{ stat: 'abilityDuration', value: 0.3 }] },
  // Drift mods are exilus.
  'power-drift': { slot: 'exilus', effects: [], frameEffects: [{ stat: 'abilityStrength', value: 0.15 }] },
  'cunning-drift': { slot: 'exilus', effects: [], frameEffects: [{ stat: 'abilityRange', value: 0.15 }] },
  // Umbral set — base stat + count-scaled set bonus via the registry (ADR 0004).
  // The base stat lives in the custom-effect fn (set bonus needs `setCounts`).
  'umbral-intensify': { slot: 'normal', effects: [], customEffectId: 'umbral-intensify', set: 'umbral' },
  'umbral-vitality': { slot: 'normal', effects: [], customEffectId: 'umbral-vitality', set: 'umbral' },
  'umbral-fiber': { slot: 'normal', effects: [], customEffectId: 'umbral-fiber', set: 'umbral' },
  // Survivability mods.
  vitality: { slot: 'normal', effects: [], frameEffects: [{ stat: 'health', value: 1.0 }] },
  'steel-fiber': { slot: 'normal', effects: [], frameEffects: [{ stat: 'armor', value: 1.0 }] },
  redirection: { slot: 'normal', effects: [], frameEffects: [{ stat: 'shield', value: 1.0 }] },
  // Aura — Corrosive Projection strips enemy armor (enemy-facing → Stage 5); no
  // frame-stat effect, but it occupies the Aura slot and grants capacity.
  'corrosive-projection': { slot: 'aura', effects: [] },
};

/** Keyed by curated arcane `id`. */
export const ARCANE_DESCRIPTORS: Record<string, AuthoredArcane> = {
  // +30% Damage per stack, up to 12 (on kill). Direct-damage multiplier bucket (ADR 0005).
  'primary-merciless': {
    effects: [
      {
        multiplier: 'directDamage',
        value: 0.3,
        perStack: true,
        maxStacks: 12,
        condition: 'arcane:primary-merciless',
      },
    ],
  },
  // +120% Damage per stack, up to 3 (on headshot kill). Direct-damage multiplier bucket.
  'primary-deadhead': {
    effects: [
      {
        multiplier: 'directDamage',
        value: 1.2,
        perStack: true,
        maxStacks: 3,
        condition: 'arcane:primary-deadhead',
      },
    ],
  },
  // Frame arcane: Molt Augmented — +0.24% Ability Strength per stack, up to 250
  // (on kill) → +60% at max stacks. Modeled as a per-stack frame-stat effect; the
  // stack count is a combat-state input (`arcane:molt-augmented`), like the weapon
  // arcanes' per-stack damage.
  'molt-augmented': {
    frameEffects: [
      {
        stat: 'abilityStrength',
        value: 0.0024,
        perStack: true,
        maxStacks: 250,
        condition: 'arcane:molt-augmented',
      },
    ],
  },
};
