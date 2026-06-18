/**
 * Bucket taxonomy + combine rules.
 *
 * Verified against https://wiki.warframe.com/w/Damage/Calculation and cached in
 * `docs/warframe/mechanics/damage.md`. **Within a bucket, members add; buckets
 * multiply across each other.** The metadata here drives the pipeline and the
 * UI chain view, and documents each bucket's behavior in one place.
 *
 * Two families (ADR 0005):
 *  - the **additive core** (`BUCKETS`) is a typed, closed `Bucket` union;
 *  - the **multiplier buckets** (`MULTIPLIER_BUCKETS`) are a **declared map** of
 *    `MultiplierBucketDef`. Each is an independent post-subtotal multiplier;
 *    members named by `EffectDescriptor.multiplier` add within the bucket, and
 *    the buckets multiply across each other in declared `order`. A brand-new
 *    multiplier category (e.g. Eclipse) is a map entry — no engine-type change.
 */
import type { Bucket } from './types';

export interface BucketMeta {
  bucket: Bucket;
  label: string;
  /** How this bucket folds into the damage pipeline. */
  note: string;
}

export const BUCKETS: Record<Bucket, BucketMeta> = {
  baseDamage: {
    bucket: 'baseDamage',
    label: 'Base Damage',
    note: 'Additive (Serration + Rifle Amp). Multiplies the base+elemental subtotal.',
  },
  elemental: {
    bucket: 'elemental',
    label: 'Elemental',
    note: 'Additive per element as a fraction of base; elements then combine. Inside base mult.',
  },
  physical: {
    bucket: 'physical',
    label: 'Physical',
    note: 'Additive per physical type as a fraction of base. Inside base mult.',
  },
  multishot: {
    bucket: 'multishot',
    label: 'Multishot',
    note: 'Additive (Split Chamber). Scales pellet count: baseMS × (1 + Σ).',
  },
  critChance: {
    bucket: 'critChance',
    label: 'Critical Chance',
    note: 'Additive (Point Strike). cc = baseCC × (1 + Σ).',
  },
  critDamage: {
    bucket: 'critDamage',
    label: 'Critical Damage',
    note: 'Additive (Vital Sense). cd = baseCD × (1 + Σ).',
  },
  statusChance: {
    bucket: 'statusChance',
    label: 'Status Chance',
    note: 'Additive (Rifle Aptitude). sc = baseSC × (1 + Σ).',
  },
  fireRate: {
    bucket: 'fireRate',
    label: 'Fire Rate',
    note: 'Additive (Speed Trigger). fr = baseFR × (1 + Σ). DPS only.',
  },
};

/**
 * A declared multiplier bucket (ADR 0005). Each is applied as a separate
 * post-subtotal multiplier `× (1 + Σ members)`. **Same id ⇒ members add;
 * different id ⇒ an independent multiplier.** `order` fixes the multiply-in
 * sequence (display only — multiplication commutes).
 */
export interface MultiplierBucketDef {
  id: string;
  label: string;
  /** Multiply-in order in the pipeline / chain view. */
  order: number;
  /** Chain-view note. */
  note: string;
}

/**
 * The declared multiplier buckets. A buff/mod names one via
 * `EffectDescriptor.multiplier`. Adding a new independent multiplier category is
 * a single entry here + a buff registry entry — no `Bucket`-union/`gather`
 * changes (ADR 0005).
 */
export const MULTIPLIER_BUCKETS: Record<string, MultiplierBucketDef> = {
  faction: {
    id: 'faction',
    label: 'Faction / Ability',
    order: 10,
    note: 'Bane + Roar add together, then multiply: × (1 + Σ).',
  },
  directDamage: {
    id: 'directDamage',
    label: 'Direct Damage',
    order: 20,
    note: 'Arcanes (Primary Merciless/Deadhead) add together: × (1 + Σ).',
  },
  eclipse: {
    id: 'eclipse',
    label: 'Eclipse (Damage)',
    order: 30,
    note: 'Mirage Eclipse — its own independent multiplier (ADR 0005): × (1 + Σ).',
  },
};

/** Multiplier-bucket ids in declared multiply-in order. */
export const MULTIPLIER_BUCKET_ORDER: readonly string[] = Object.values(MULTIPLIER_BUCKETS)
  .sort((a, b) => a.order - b.order)
  .map((d) => d.id);
