/**
 * Enemy stat scaling, armor mitigation, and Overguard — all pure numeric
 * functions. Formulas verified 2026-06-18 vs the wiki and cached in
 * `docs/warframe/mechanics/enemy-damage-modifiers.md` + `overguard.md`.
 *
 * IMPORTANT: this is the **enemy** armor curve, deliberately distinct from the
 * player `ARMOR_K` EHP path in `engine/warframe/ehp.ts` (decision 12) — enemy
 * armor is linear `DR = 0.9 × netArmor/2700` (capped at 90%), not the player
 * `armor/(armor+300)` hyperbola.
 */
import type { EnemyData, Faction, ScaledEnemy } from './types';

/** Net armor for DR purposes caps at 2700 (→ 90% reduction). */
export const ARMOR_DR_CAP = 2700;

/** Enemy armor damage **reduction** fraction (0..0.9) for a given net armor. */
export function enemyArmorDR(netArmor: number): number {
  if (netArmor <= 0) return 0;
  return 0.9 * (Math.min(netArmor, ARMOR_DR_CAP) / ARMOR_DR_CAP);
}

/** Damage multiplier from enemy armor (`1 − DR`); 1.0 at zero armor, 0.1 at cap. */
export function armorDamageMultiplier(netArmor: number): number {
  return 1 - enemyArmorDR(netArmor);
}

/** Net armor after the strip control: `base × (1 − strip)` (strip clamped 0..1). */
export function netArmorAfterStrip(baseArmor: number, stripPct: number): number {
  const s = Math.max(0, Math.min(1, stripPct));
  return baseArmor * (1 - s);
}

// ── Level scaling ────────────────────────────────────────────────────────────
// `Stat = base × (1 + coeff × LD^exp)`, `LD = currentLevel − baseLevel`, with a
// smoothstep blend of the low/high pieces across LD 70→80.

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Blend a low-LD piece into a high-LD piece across LD 70..80. */
function piecewise(ld: number, low: (ld: number) => number, high: (ld: number) => number): number {
  if (ld <= 70) return low(ld);
  if (ld >= 80) return high(ld);
  const s = smoothstep((ld - 70) / 10);
  return low(ld) * (1 - s) + high(ld) * s;
}

export function healthScale(faction: Faction | string, ld: number): number {
  if (ld <= 0) return 1;
  if (faction === 'Corpus') {
    return piecewise(ld, (x) => 1 + 0.015 * x ** 2.12, (x) => 1 + 13.4165 * x ** 0.55);
  }
  // Grineer/Infested/Orokin/Sentient/Other share the Grineer health curve.
  return piecewise(ld, (x) => 1 + 0.015 * x ** 2.12, (x) => 1 + 10.7332 * x ** 0.72);
}

export function shieldScale(faction: Faction | string, ld: number): number {
  if (ld <= 0) return 1;
  if (faction === 'Corpus') {
    return piecewise(ld, (x) => 1 + 0.02 * x ** 1.76, (x) => 1 + 2 * x ** 0.76);
  }
  // Grineer/Sentient/other share the lower-coefficient shield curve.
  return piecewise(ld, (x) => 1 + 0.02 * x ** 1.75, (x) => 1 + 1.6 * x ** 0.75);
}

/** Armor scaling is faction-agnostic. */
export function armorScale(ld: number): number {
  if (ld <= 0) return 1;
  return piecewise(ld, (x) => 1 + 0.005 * x ** 1.75, (x) => 1 + 0.4 * x ** 0.75);
}

// ── Steel Path (decision 13) ─────────────────────────────────────────────────
export const STEEL_PATH = {
  levelOffset: 100,
  healthMult: 2.5,
  shieldMult: 2.5,
  armorMult: 1.0, // armor unchanged on Steel Path (corrected U36)
} as const;

// ── Overguard (decision 11) ──────────────────────────────────────────────────
/** Base Overguard for an Eximus unit. */
export const OVERGUARD_BASE = 12;

/**
 * Overguard pool at a given level (`12 × multiplier`). Piecewise per the wiki
 * transcription (`docs/warframe/mechanics/overguard.md`), smoothstep-blended
 * across levels 46..50. The coefficients are from the wiki and isolated here so
 * a future correction is one edit (Overguard's damage-type quirks are deferred).
 */
export function overguardLevelScale(level: number): number {
  const n = Math.max(0, level - 1);
  const low = (x: number) => 1 + 0.0015 * x ** 4;
  const high = (x: number) => 1 + 260 * x ** 0.9;
  let mult: number;
  if (n < 45) mult = low(n);
  else if (n > 50) mult = high(n);
  else mult = low(n) * (1 - smoothstep((n - 45) / 5)) + high(n) * smoothstep((n - 45) / 5);
  return OVERGUARD_BASE * mult;
}

// ── Compose the scaled enemy ─────────────────────────────────────────────────

export interface ScaleOptions {
  level: number;
  steelPath: boolean;
  armorStripPct: number;
  overguard: boolean;
  /** Faction override (drives only the modifier table downstream, not stats). */
  faction?: Faction | string;
}

/**
 * Scale a base enemy to a target level + Steel Path, apply the armor strip, and
 * (optionally) add an Overguard pool. Stat = base × levelScale × spMult; all
 * multiplicative, so the SP-multiplier/level-scale order is irrelevant.
 */
export function scaleEnemy(base: EnemyData, opts: ScaleOptions): ScaledEnemy {
  const faction = opts.faction ?? base.faction;
  const effLevel = opts.level + (opts.steelPath ? STEEL_PATH.levelOffset : 0);
  const ld = Math.max(0, effLevel - base.baseLevel);

  const spH = opts.steelPath ? STEEL_PATH.healthMult : 1;
  const spS = opts.steelPath ? STEEL_PATH.shieldMult : 1;
  const spA = opts.steelPath ? STEEL_PATH.armorMult : 1;

  const health = base.health * healthScale(faction, ld) * spH;
  const shield = base.shield * shieldScale(faction, ld) * spS;
  const armor = base.armor * armorScale(ld) * spA;
  const netArmor = netArmorAfterStrip(armor, opts.armorStripPct);
  const overguard = opts.overguard ? overguardLevelScale(effLevel) : 0;

  return { faction, level: effLevel, health, shield, armor, netArmor, overguard };
}
