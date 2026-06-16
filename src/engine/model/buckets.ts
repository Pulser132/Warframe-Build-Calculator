/**
 * Bucket taxonomy + combine rules.
 *
 * Verified against https://wiki.warframe.com/w/Damage/Calculation and cached in
 * `docs/warframe/mechanics/damage.md`. **Within a bucket, members add; buckets
 * multiply across each other.** The metadata here drives the pipeline and the
 * UI chain view, and documents each bucket's behavior in one place.
 */
import type { Bucket } from './types';

export interface BucketMeta {
  bucket: Bucket;
  label: string;
  /** Conditional buckets only apply when their condition/stack is active. */
  conditional: boolean;
  /** How this bucket folds into the damage pipeline. */
  note: string;
}

export const BUCKETS: Record<Bucket, BucketMeta> = {
  baseDamage: {
    bucket: 'baseDamage',
    label: 'Base Damage',
    conditional: false,
    note: 'Additive (Serration + Rifle Amp). Multiplies the base+elemental subtotal.',
  },
  elemental: {
    bucket: 'elemental',
    label: 'Elemental',
    conditional: false,
    note: 'Additive per element as a fraction of base; elements then combine. Inside base mult.',
  },
  physical: {
    bucket: 'physical',
    label: 'Physical',
    conditional: false,
    note: 'Additive per physical type as a fraction of base. Inside base mult.',
  },
  multishot: {
    bucket: 'multishot',
    label: 'Multishot',
    conditional: false,
    note: 'Additive (Split Chamber). Scales pellet count: baseMS × (1 + Σ).',
  },
  critChance: {
    bucket: 'critChance',
    label: 'Critical Chance',
    conditional: false,
    note: 'Additive (Point Strike). cc = baseCC × (1 + Σ).',
  },
  critDamage: {
    bucket: 'critDamage',
    label: 'Critical Damage',
    conditional: false,
    note: 'Additive (Vital Sense). cd = baseCD × (1 + Σ).',
  },
  statusChance: {
    bucket: 'statusChance',
    label: 'Status Chance',
    conditional: false,
    note: 'Additive (Rifle Aptitude). sc = baseSC × (1 + Σ).',
  },
  fireRate: {
    bucket: 'fireRate',
    label: 'Fire Rate',
    conditional: false,
    note: 'Additive (Speed Trigger). fr = baseFR × (1 + Σ). DPS only.',
  },
  faction: {
    bucket: 'faction',
    label: 'Faction / Ability',
    conditional: true,
    note: 'Separate conditional multiplier. Bane + Roar add together: × (1 + Σ).',
  },
  directDamage: {
    bucket: 'directDamage',
    label: 'Direct Damage',
    conditional: true,
    note: 'Separate conditional multiplier (arcanes): × (1 + Σ).',
  },
};

/** Buckets applied as separate post-subtotal multipliers (conditional). */
export const MULTIPLIER_BUCKETS: readonly Bucket[] = ['faction', 'directDamage'];

export function isConditionalBucket(bucket: Bucket): boolean {
  return BUCKETS[bucket].conditional;
}
