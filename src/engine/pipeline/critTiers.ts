/**
 * Crit-tier breakdown — the discrete damage numbers a build can actually roll.
 *
 * A pellet crits in integer "tiers": tier 0 is a non-crit (×1), tier 1 a normal
 * crit (×CM), tier 2 (×1 + 2(CM−1)), and so on. For a modded crit chance `cc`, a
 * pellet lands at tier `floor(cc)` with probability `1 − frac(cc)` and one tier
 * higher with probability `frac(cc)` — so a build only ever rolls one or two
 * adjacent tiers, never the whole ladder. (In-game colours: white / yellow /
 * orange / red as the tier climbs.)
 */
import type { DamageResult } from '../model/result';

export interface CritTier {
  /** 0 = non-crit, 1 = normal crit, 2 = orange, 3 = red, … */
  tier: number;
  /** Damage multiplier at this tier: `1 + tier × (critMultiplier − 1)`. */
  multiplier: number;
  /** Per-pellet damage at this tier (conditional multipliers already folded in). */
  perPellet: number;
  /** Probability a given pellet lands at exactly this tier. */
  probability: number;
}

const EPS = 1e-9;

type CritFields = Pick<
  DamageResult,
  'critChance' | 'critMultiplier' | 'avgCritMultiplier' | 'perPelletAverage'
>;

/** The crit tiers a build can roll, low→high, each with per-pellet damage + odds. */
export function critTiers(result: CritFields): CritTier[] {
  const { critChance, critMultiplier, avgCritMultiplier, perPelletAverage } = result;
  // Per-pellet damage at tier 0 (×1): undo the crit weighting baked into the
  // average, leaving conditional (faction/arcane) multipliers in place.
  const tier0 = avgCritMultiplier > 0 ? perPelletAverage / avgCritMultiplier : perPelletAverage;
  const step = critMultiplier - 1;

  const cc = Math.max(0, critChance);
  const floorTier = Math.floor(cc + EPS);
  const frac = cc - floorTier;

  const make = (tier: number, probability: number): CritTier => {
    const multiplier = 1 + tier * step;
    return { tier, multiplier, perPellet: tier0 * multiplier, probability };
  };

  // A (near-)integer crit chance lands on a single guaranteed tier.
  if (frac < EPS) return [make(floorTier, 1)];
  return [make(floorTier, 1 - frac), make(floorTier + 1, frac)];
}
