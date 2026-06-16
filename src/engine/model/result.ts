/**
 * The rich output object `calculateBuild` returns.
 *
 * It carries the final numbers, the per-damage-type breakdown, the labeled
 * pipeline **chain** (so the UI can render additive-vs-multiplicative steps and
 * the attribution layer can diff stages), and — once attributed — the per-source
 * contribution breakdown.
 */
import type { DamageType } from './types';

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
}
