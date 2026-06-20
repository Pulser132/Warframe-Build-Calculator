/**
 * Target / Enemy domain types (Stage 5, Phase B). The modern Damage 3.0 (U36+)
 * model only: four Health Layers (Health / Shield / Armor / Overguard) +
 * **faction-based** damage-type modifiers (decision 6). No legacy 13-health-type
 * modelling.
 */
import type {
  DamageMap,
  AoeResult,
  BeamResult,
  ComponentResult,
  FollowThroughResult,
  HeavyLoopResultRef,
  ComboStringResultRef,
} from '../model/result';

/** Canonical factions the modifier table is keyed on (`Other` = no modifiers). */
export type Faction = 'Grineer' | 'Corpus' | 'Infested' | 'Orokin' | 'Sentient' | 'Other';

/** A generated enemy record (`src/data/generated/enemies.json`, all base level 1). */
export interface EnemyData {
  id: string;
  name: string;
  faction: Faction | string;
  /** The enemy level the base stats represent (1 — confirmed vs wiki). */
  baseLevel: number;
  health: number;
  shield: number;
  armor: number;
  /** Armor subtype (from `resistances[]`); affects only display this stage. */
  armorType?: 'Ferrite' | 'Alloy';
}

/** The serializable Target configuration (store sibling of `CombatState`). */
export interface TargetState {
  /** Selected enemy id, or `'custom'` for the manual stat block. */
  enemyId: string;
  /** Target level (1–9999). Base stats scale from `baseLevel` to this. */
  level: number;
  /** Steel Path: +100 levels and the SP stat multipliers. */
  steelPath: boolean;
  /** Armor strip fraction (0..1): `netArmor = baseArmor × (1 − strip)`. */
  armorStripPct: number;
  /** Override the enemy's faction (drives only the modifier table, not stats). */
  factionOverride?: Faction | string;
  /** Eximus / Overguard toggle (adds an Overguard pool depleted first). */
  overguard: boolean;
  /** Advanced manual stat block (used when `enemyId === 'custom'`). */
  custom?: Partial<EnemyData>;
}

/** The scaled, strip-adjusted enemy the routing runs against. */
export interface ScaledEnemy {
  faction: Faction | string;
  level: number;
  health: number;
  shield: number;
  armor: number;
  /** Armor after the strip control. */
  netArmor: number;
  /** Overguard pool (0 when the toggle is off). */
  overguard: number;
}

/** `applyTarget` output — a post-intrinsic layer; the intrinsic result is untouched. */
export interface TargetResult {
  /** Effective per-type damage on the health layer (faction + armor + min-1 floor). */
  perTypeEffective: DamageMap;
  /** Sum of `perTypeEffective` — effective damage of one shot vs the body. */
  effectiveHitAverage: number;
  /** Effective sustained DPS vs the health layer. */
  effectiveDps: number;
  /** Effective **burst** DPS — the burst twin of `effectiveDps` (decision 6). */
  effectiveBurstDps: number;
  /** Per-hit effective ratio (`effectiveHitAverage / avgHitPerShot`, 0-guarded). */
  effectiveScale: number;
  /** Direct-damage TTK in seconds (excludes status DoT) — deplete OG→Shield→Health. */
  ttkSeconds: number;
  /** Raw intrinsic damage required to clear each layer (an EHP view). */
  enemyEhp: {
    overguard: number;
    shield: number;
    health: number;
    /** Armor damage-reduction fraction applied to the health layer (0..1). */
    armor: number;
    total: number;
  };
  /** Status *application* vs the target (informational; NOT folded into TTK). */
  statusApplication: {
    procsPerSecond: number;
    weights: DamageMap;
  };
  /** The scaled enemy the routing used (for the UI readout). */
  scaled: ScaledEnemy;

  // ── Effective mechanic sub-results (ADR-0006) — present only when the
  //    intrinsic result carries the corresponding field. Same shapes as the
  //    intrinsic `DamageResult` so the UI can feed them to `DamageSummary`. ──

  /** Effective AoE center/rim (per-type routed; radius/falloff unchanged). */
  aoe?: AoeResult;
  /** Effective per-component damage (each `perType` routed; role/delivery kept). */
  components?: ComponentResult[];
  /** Effective beam per-tick (= `effectiveHitAverage`; tickRate/ramp unchanged). */
  beam?: BeamResult;
  /** Effective sustained heavy loop (hits/DPS × `effectiveScale`). */
  heavyLoop?: HeavyLoopResultRef;
  /** Effective follow-through (single/total/per-target × `effectiveScale`). */
  followThrough?: FollowThroughResult;
  /** Effective combo string (totals/per-hit × `effectiveScale`; forced-proc DoT deferred). */
  comboString?: ComboStringResultRef;
}
