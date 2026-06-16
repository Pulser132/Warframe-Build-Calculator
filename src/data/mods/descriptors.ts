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
import type { EffectDescriptor, ModSlotKind } from '@engine/model/types';

export interface AuthoredMod {
  slot: ModSlotKind;
  effects: EffectDescriptor[];
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
  // Faction bucket (separate, conditional): additive with Roar; ×1.3 vs Grineer.
  'bane-of-grineer': {
    slot: 'normal',
    effects: [{ bucket: 'faction', value: 0.3, condition: 'faction:grineer' }],
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
};

/** Keyed by curated arcane `id`. */
export const ARCANE_DESCRIPTORS: Record<string, EffectDescriptor[]> = {
  // +30% Damage per stack, up to 12 (on kill). Separate conditional multiplier.
  'primary-merciless': [
    {
      bucket: 'directDamage',
      value: 0.3,
      perStack: true,
      maxStacks: 12,
      condition: 'arcane:primary-merciless',
    },
  ],
  // +120% Damage per stack, up to 3 (on headshot kill). Separate conditional multiplier.
  'primary-deadhead': [
    {
      bucket: 'directDamage',
      value: 1.2,
      perStack: true,
      maxStacks: 3,
      condition: 'arcane:primary-deadhead',
    },
  ],
};
