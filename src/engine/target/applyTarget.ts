/**
 * `applyTarget` — the post-intrinsic Target layer (Stage 5, Phase B, decisions
 * 9–11). Pure: takes the **untouched** intrinsic `DamageResult` and a Target,
 * and returns effective damage / DPS / direct-TTK / enemy-EHP / status figures.
 *
 * Routing (decision 10), depleting pools **Overguard → Shield → Health**:
 *  - **Overguard** absorbs first, at **face value**, armor-ignored (decision 11).
 *    Its damage-type quirks (Void/Magnetic amplification, faction/DoT) are deferred.
 *  - **Shield** takes face value, **no armor**, **no faction-type modifiers**.
 *    **Toxin bypasses shields** (→ health). (The Magnetic-vs-shield bonus is a
 *    *status* effect, so it rides with the deferred status-DoT work, not direct.)
 *  - **Health** applies **faction modifiers** per type, then **armor mitigation**
 *    (net armor after strip). A **min-1-per-type** floor applies on each layer.
 *
 * TTK is **direct damage only** (status DoT excluded — surfaced separately and
 * labelled by the UI). Status *application* (procs/sec, type weights) is reported
 * but never folded into TTK.
 */
import type { DamageResult, DamageMap } from '../model/result';
import type { DamageType } from '../model/types';
import { factionModifier } from './factions';
import { armorDamageMultiplier, enemyArmorDR, scaleEnemy } from './scaling';
import type { EnemyData, ScaledEnemy, TargetResult, TargetState } from './types';

const FLOOR = 1; // min damage per type per hit

function damageTypes(map: DamageMap): DamageType[] {
  return (Object.keys(map) as DamageType[]).filter((t) => (map[t] ?? 0) > 0);
}

/** Resolve the base enemy a Target points at (custom block or the dataset record). */
export function resolveBaseEnemy(target: TargetState, dataEnemy: EnemyData | null): EnemyData | null {
  if (target.enemyId === 'custom' || !dataEnemy) {
    const c = target.custom ?? {};
    return {
      id: 'custom',
      name: c.name ?? 'Custom target',
      faction: c.faction ?? target.factionOverride ?? 'Other',
      baseLevel: c.baseLevel ?? 1,
      health: c.health ?? 0,
      shield: c.shield ?? 0,
      armor: c.armor ?? 0,
      armorType: c.armorType,
    };
  }
  return dataEnemy;
}

export function applyTarget(
  intrinsic: DamageResult,
  target: TargetState,
  dataEnemy: EnemyData | null,
): TargetResult {
  const base = resolveBaseEnemy(target, dataEnemy)!;
  const scaled: ScaledEnemy = scaleEnemy(base, {
    level: target.level,
    steelPath: target.steelPath,
    armorStripPct: target.armorStripPct,
    overguard: target.overguard,
    faction: target.factionOverride ?? base.faction,
  });

  // Per-shot per-type damage (intrinsic.perType is per pellet → × multishot).
  const shot: DamageMap = {};
  for (const t of damageTypes(intrinsic.perType)) {
    shot[t] = (intrinsic.perType[t] ?? 0) * intrinsic.multishot;
  }
  const types = damageTypes(shot);
  const avgHit = intrinsic.avgHitPerShot;
  const effectiveRate = avgHit > 0 ? intrinsic.sustainedDps / avgHit : 0;

  const armorMult = armorDamageMultiplier(scaled.netArmor);

  // ── Per-layer effective damage of one shot ──
  // Overguard: face value, armor-ignored, no faction modifiers.
  let ogPerHit = 0;
  // Shield: face value, no armor/faction; toxin bypasses (→ health).
  let shieldPerHit = 0;
  // Health: faction modifier × armor mitigation, per type, floored.
  const perTypeEffective: DamageMap = {};
  let healthPerHit = 0;
  let toxinHealthPerHit = 0;

  for (const t of types) {
    const raw = shot[t] ?? 0;
    ogPerHit += Math.max(FLOOR, raw);
    if (t !== 'toxin') shieldPerHit += Math.max(FLOOR, raw);

    const eff = Math.max(FLOOR, raw * factionModifier(scaled.faction, t) * armorMult);
    perTypeEffective[t] = eff;
    healthPerHit += eff;
    if (t === 'toxin') toxinHealthPerHit = eff;
  }

  // ── Deplete pools in order; count hits (fractional). ──
  const ogHits = scaled.overguard > 0 && ogPerHit > 0 ? scaled.overguard / ogPerHit : 0;
  const shieldHits = scaled.shield > 0 && shieldPerHit > 0 ? scaled.shield / shieldPerHit : 0;
  // Toxin bypasses the shield, so it chips health during the shield phase.
  const toxinDuringShield = toxinHealthPerHit * shieldHits;
  const healthRemaining = Math.max(0, scaled.health - toxinDuringShield);
  const healthHits = healthPerHit > 0 ? healthRemaining / healthPerHit : 0;

  const ogRaw = ogHits * avgHit;
  const shieldRaw = shieldHits * avgHit;
  const healthRaw = healthHits * avgHit;
  const totalHits = ogHits + shieldHits + healthHits;

  const ttkSeconds = effectiveRate > 0 ? totalHits / effectiveRate : Infinity;
  const effectiveHitAverage = healthPerHit;
  const effectiveDps = effectiveHitAverage * effectiveRate;

  return {
    perTypeEffective,
    effectiveHitAverage,
    effectiveDps,
    ttkSeconds,
    enemyEhp: {
      overguard: ogRaw,
      shield: shieldRaw,
      health: healthRaw,
      armor: enemyArmorDR(scaled.netArmor),
      total: ogRaw + shieldRaw + healthRaw,
    },
    statusApplication: {
      procsPerSecond: (intrinsic.avgProcsPerShot ?? 0) * effectiveRate,
      weights: intrinsic.procTypeWeights ?? {},
    },
    scaled,
  };
}
