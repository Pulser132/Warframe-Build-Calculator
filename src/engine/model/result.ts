/**
 * The rich output object `calculateBuild` returns.
 *
 * It carries the final numbers, the per-damage-type breakdown, the labeled
 * pipeline **chain** (so the UI can render additive-vs-multiplicative steps and
 * the attribution layer can diff stages), and — once attributed — the per-source
 * contribution breakdown.
 */
import type { DamageType } from './types';
import type { TriggerType, DeliveryType, FalloffSpec } from './firemode';

export type DamageMap = Partial<Record<DamageType, number>>;

/** A labeled snapshot emitted by one pipeline stage (renderable + diffable). */
export interface PipelineStage {
  /** Stable stage id (e.g. `base`, `elemental`, `multishot`). */
  id: string;
  label: string;
  /** Human-readable summary of what this stage did. */
  detail: string;
  /** Per-type damage snapshot after this stage (when relevant). */
  perType?: DamageMap;
  /** Scalar snapshot after this stage (e.g. multishot, avg crit, DPS). */
  value?: number;
}

/** One source's marginal contribution (leave-one-out), from the attribution layer. */
export interface Contribution {
  /** Source id — mod/arcane id or a buff/condition key. */
  sourceId: string;
  label: string;
  /** Burst-DPS delta vs. the build without this source. */
  dpsDelta: number;
  /** Delta as a fraction of total burst DPS (need not sum to 1 — multipliers interact). */
  fraction: number;
}

export interface DamageResult {
  /** Average per-type damage of a single pellet (incl. crit + conditional mults). */
  perType: DamageMap;
  /** Average total damage of a single pellet (sum of `perType`). */
  perPelletAverage: number;
  /** Pellets per shot (base × (1 + multishot)). */
  multishot: number;

  critChance: number;
  critMultiplier: number;
  avgCritMultiplier: number;

  /** Per-pellet status chance after status mods. */
  statusChancePerPellet: number;
  /** Expected status procs per shot (multishot × per-pellet status). */
  avgProcsPerShot: number;

  fireRate: number;
  /** Average damage of one full shot (all pellets, crit-weighted, conditionals on). */
  avgHitPerShot: number;

  burstDps: number;
  sustainedDps: number;

  /** Labeled stage-by-stage chain. */
  chain: PipelineStage[];
  /** Per-source contributions (filled by the attribution layer; optional). */
  contributions?: Contribution[];

  // ── Stage 2 fire-mode / delivery metadata (optional; absent on bare Stage 1 calls) ──

  /** Name of the fire mode this result was computed for. */
  modeName?: string;
  /** Trigger type (auto/semi/burst/charge/held). */
  trigger?: TriggerType;
  /** Primary delivery (hitscan/projectile/aoe) — metadata for Stage 5 TTK. */
  delivery?: DeliveryType;
  /** Ammo consumed per shot/tick (beams = 0.5; otherwise 1). */
  ammoPerShot?: number;

  /** Per-component breakdown (AoE direct/radial, etc.). `>1` only for AoE modes. */
  components?: ComponentResult[];

  /** Probability of ≥1 status proc per shot (`1 − (1 − s)^N`). */
  statusProcChance?: number;
  /** Proc-type weighting (element share of total damage). */
  procTypeWeights?: DamageMap;

  /** Beam (held-continuous) extras. */
  beam?: BeamResult;
  /** AoE (radial falloff) extras: center vs rim. */
  aoe?: AoeResult;

  // ── Stage 3 melee extras (optional; absent on guns) ──

  /** Combo Multiplier applied to this result (Heavy / Heavy Slam modes; else 1). */
  comboMultiplier?: number;
  /** Raw Combo Count the multiplier was derived from. */
  comboCount?: number;
  /** Follow-Through multi-target extra (present when `targetCount > 1`). */
  followThrough?: FollowThroughResult;
  /** Reach / swing distance (m) — display-only metadata this stage. */
  reach?: number;
  /** Reach-derived swing target count (Stage 5; present when an enemy spacing is set). */
  reachTargets?: { count: number; spacing: number; reach: number };
  /** Sustained heavy-attack DPS via the combo-rebuild loop (Stage 5; heavy modes). */
  heavyLoop?: HeavyLoopResultRef;
  /** Combo String breakdown (Normal mode with a selected combo string). */
  comboString?: ComboStringResultRef;
}

/** Sustained heavy-attack loop result (computed by `pipeline/melee.sustainedHeavyLoop`). */
export interface HeavyLoopResultRef {
  sustainedDps: number;
  comboConsumed: number;
  rebuildHits: number;
  loopSeconds: number;
  normalHit: number;
  heavyHit: number;
}

/** The combo-string result shape (computed by `pipeline/melee.comboStringBreakdown`). */
export interface ComboStringResultRef {
  name: string;
  stance: string;
  totalDamage: number;
  hitCount: number;
  averagePerHit: number;
  durationSeconds: number;
  dps: number;
  perHit: number[];
  forcedProcs: DamageType[];
  lowConfidence?: boolean;
}

/** Follow-Through multi-target reporting (melee). */
export interface FollowThroughResult {
  /** Follow-Through factor used. */
  factor: number;
  /** Number of targets assumed in the swing arc. */
  targetCount: number;
  /** Single-target average hit (`avgHitPerShot`). */
  singleTarget: number;
  /** Total damage across all targets (`hit × (1 − FT^n)/(1 − FT)`). */
  total: number;
  /** Per-target damage, in order (`hit × FT^(k)`). */
  perTarget: number[];
}

/** One simultaneous component's averaged result (crit-weighted, conditionals on). */
export interface ComponentResult {
  name: string;
  role: 'normal' | 'direct' | 'radial';
  delivery: DeliveryType;
  /** Average per-type damage of one pellet of this component. */
  perType: DamageMap;
  /** Average total of one pellet of this component (sum of `perType`). */
  perPelletAverage: number;
  /** Radial floor (rim) average = center × (1 − maxReduction). */
  rimPerPelletAverage?: number;
  falloff?: FalloffSpec;
  /** Forced status types this component always applies (e.g. `['lifted']`). */
  forcedProcs?: string[];
}

/** Beam continuous-fire reporting. */
export interface BeamResult {
  /** Ticks per second (= effective fire rate). */
  tickRate: number;
  /** Merged per-tick damage (one pellet × multishot). */
  perTickDamage: number;
  /** Status procs per second (per-tick status × tick rate). */
  procsPerSecond: number;
  /** Damage ramp starting fraction and duration (peak DPS is reported as DPS). */
  rampStartPct: number;
  rampSeconds: number;
}

/** AoE center/rim reporting (radial component). */
export interface AoeResult {
  falloffStart: number;
  radius: number;
  /** Average damage at the blast center (full). */
  centerAverage: number;
  /** Average damage at the rim (`center × (1 − maxReduction)`). */
  rimAverage: number;
  centerPerType: DamageMap;
  rimPerType: DamageMap;
}
