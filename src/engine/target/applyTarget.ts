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
import type {
  DamageResult,
  DamageMap,
  AoeResult,
  BeamResult,
  ComponentResult,
  FollowThroughResult,
  HeavyLoopResultRef,
  ComboStringResultRef,
} from '../model/result';
import type { DamageType } from '../model/types';
import { factionModifier } from './factions';
import { armorDamageMultiplier, enemyArmorDR, scaleEnemy } from './scaling';
import type { EnemyData, ScaledEnemy, TargetResult, TargetState } from './types';

const FLOOR = 1; // min damage per type per hit

function damageTypes(map: DamageMap): DamageType[] {
  return (Object.keys(map) as DamageType[]).filter((t) => (map[t] ?? 0) > 0);
}

/**
 * Route a per-type damage map onto the **Health** layer (faction modifier ×
 * armor mitigation, floored at `FLOOR` per type, summed). The single source of
 * truth for intrinsic-per-type → effective health-layer damage —
 * `effectiveHitAverage` is just `routeToHealth(shot).total` (ADR-0006). Reused
 * directly for AoE/components, whose per-type composition differs from the main
 * hit.
 */
export function routeToHealth(
  perType: DamageMap,
  scaled: Pick<ScaledEnemy, 'faction' | 'netArmor'>,
): { perType: DamageMap; total: number } {
  const armorMult = armorDamageMultiplier(scaled.netArmor);
  const out: DamageMap = {};
  let total = 0;
  for (const t of damageTypes(perType)) {
    const eff = Math.max(FLOOR, (perType[t] ?? 0) * factionModifier(scaled.faction, t) * armorMult);
    out[t] = eff;
    total += eff;
  }
  return { perType: out, total };
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

  // ── Per-layer effective damage of one shot ──
  // Overguard: face value, armor-ignored, no faction modifiers.
  let ogPerHit = 0;
  // Shield: face value, no armor/faction; toxin bypasses (→ health).
  let shieldPerHit = 0;
  for (const t of types) {
    const raw = shot[t] ?? 0;
    ogPerHit += Math.max(FLOOR, raw);
    if (t !== 'toxin') shieldPerHit += Math.max(FLOOR, raw);
  }

  // Health: faction modifier × armor mitigation, per type, floored — via the
  // shared routing helper (decision 10 / ADR-0006).
  const health = routeToHealth(shot, scaled);
  const perTypeEffective = health.perType;
  const healthPerHit = health.total;
  const toxinHealthPerHit = perTypeEffective.toxin ?? 0;

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
  // Burst twin of `effectiveDps`: scale the intrinsic burst by the per-hit
  // effective ratio (≡ effectiveDps × burstDps / sustainedDps). Div-by-zero guarded.
  const effectiveBurstDps = avgHit > 0 ? effectiveHitAverage * (intrinsic.burstDps / avgHit) : 0;
  // Per-hit scale for same-composition mechanics (beam/heavy/follow-through/combo
  // string) — exact because routing is linear per type (ADR-0006).
  const effectiveScale = avgHit > 0 ? effectiveHitAverage / avgHit : 0;

  const result: TargetResult = {
    perTypeEffective,
    effectiveHitAverage,
    effectiveDps,
    effectiveBurstDps,
    effectiveScale,
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

  // ── Effective mechanic sub-results (only when the intrinsic carries them) ──
  // AoE / components carry their own per-type maps (composition differs from the
  // main hit), so they route per-type. Beam/heavy/follow-through/combo string
  // share the main hit's composition, so the exact `effectiveScale` applies.
  if (intrinsic.aoe) {
    const center = routeToHealth(intrinsic.aoe.centerPerType, scaled);
    const rim = routeToHealth(intrinsic.aoe.rimPerType, scaled);
    result.aoe = {
      falloffStart: intrinsic.aoe.falloffStart,
      radius: intrinsic.aoe.radius,
      centerAverage: center.total,
      rimAverage: rim.total,
      centerPerType: center.perType,
      rimPerType: rim.perType,
    } satisfies AoeResult;
  }

  if (intrinsic.components) {
    result.components = intrinsic.components.map((c): ComponentResult => {
      const routed = routeToHealth(c.perType, scaled);
      const eff: ComponentResult = { ...c, perType: routed.perType, perPelletAverage: routed.total };
      if (c.rimPerPelletAverage != null) {
        const ratio = c.perPelletAverage > 0 ? c.rimPerPelletAverage / c.perPelletAverage : 0;
        eff.rimPerPelletAverage = routed.total * ratio;
      }
      return eff;
    });
  }

  if (intrinsic.beam) {
    result.beam = { ...intrinsic.beam, perTickDamage: effectiveHitAverage } satisfies BeamResult;
  }

  if (intrinsic.heavyLoop) {
    const h = intrinsic.heavyLoop;
    result.heavyLoop = {
      ...h,
      sustainedDps: h.sustainedDps * effectiveScale,
      normalHit: h.normalHit * effectiveScale,
      heavyHit: h.heavyHit * effectiveScale,
    } satisfies HeavyLoopResultRef;
  }

  if (intrinsic.followThrough) {
    const f = intrinsic.followThrough;
    result.followThrough = {
      ...f,
      singleTarget: f.singleTarget * effectiveScale,
      total: f.total * effectiveScale,
      perTarget: f.perTarget.map((v) => v * effectiveScale),
    } satisfies FollowThroughResult;
  }

  if (intrinsic.comboString) {
    const c = intrinsic.comboString;
    result.comboString = {
      ...c,
      totalDamage: c.totalDamage * effectiveScale,
      averagePerHit: c.averagePerHit * effectiveScale,
      dps: c.dps * effectiveScale,
      perHit: c.perHit.map((v) => v * effectiveScale),
    } satisfies ComboStringResultRef;
  }

  return result;
}
