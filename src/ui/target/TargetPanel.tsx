import { critTiers } from '@engine';
import type { DamageType } from '@engine/model/types';
import type { Faction, TargetState } from '@engine/target/types';
import { useBuildStore, useEnemies, useTargetResult } from '@state';
import { ContributionList } from '../panels';
import { fmt, pct, damageLabel } from '../util';
import styles from './TargetPanel.module.css';

/** Crit-tier display label + colour class (white → yellow → orange → red). */
const TIER_META = [
  { label: 'Non-crit', cls: styles.tierWhite },
  { label: 'Crit', cls: styles.tierYellow },
  { label: 'Orange crit', cls: styles.tierOrange },
  { label: 'Red crit', cls: styles.tierRed },
];
const tierMeta = (tier: number) =>
  TIER_META[tier] ?? { label: `Tier ${tier} crit`, cls: styles.tierRed };

/** Featured presets covering every routing path (decision 15). */
const FEATURED: { label: string; note: string; preset: Partial<TargetState> & { enemyId: string } }[] = [
  { label: 'Charger', note: 'health', preset: { enemyId: 'charger' } },
  { label: 'Lancer', note: 'armored', preset: { enemyId: 'lancer' } },
  { label: 'Crewman', note: 'shield', preset: { enemyId: 'crewman' } },
  { label: 'Carrier', note: 'shield + armor', preset: { enemyId: 'carrier' } },
  { label: 'Eximus Lancer', note: 'overguard', preset: { enemyId: 'lancer', overguard: true } },
];

const FACTIONS: Faction[] = ['Grineer', 'Corpus', 'Infested', 'Orokin', 'Sentient', 'Other'];

/**
 * The Target / Enemy panel (Stage 5, Phase B). Featured presets → editable
 * overrides → custom block, with an effective-damage / DPS / direct-TTK /
 * enemy-EHP readout and a status-application panel. TTK is labelled
 * "excludes status DoT" (decision 14). An optional toggle adds the vs-target
 * contribution view (decision 16).
 */
export function TargetPanel() {
  const enemies = useEnemies();
  const target = useBuildStore((s) => s.target);
  const selectEnemy = useBuildStore((s) => s.selectEnemy);
  const setTargetLevel = useBuildStore((s) => s.setTargetLevel);
  const setSteelPath = useBuildStore((s) => s.setSteelPath);
  const setArmorStrip = useBuildStore((s) => s.setArmorStrip);
  const setFactionOverride = useBuildStore((s) => s.setFactionOverride);
  const toggleOverguard = useBuildStore((s) => s.toggleOverguard);
  const setCustomTarget = useBuildStore((s) => s.setCustomTarget);
  const applyTargetPreset = useBuildStore((s) => s.applyTargetPreset);

  // The vs-Target tab is the effective view, so the vs-target leave-one-out
  // contribution list is always computed and shown (no separate toggle — the
  // Build tab carries the intrinsic attribution).
  const data = useTargetResult(true);
  if (!data) return null;
  const { result, intrinsic } = data;
  const isCustom = target.enemyId === 'custom';

  // Effective crit-tier breakdown: reuse the engine's `critTiers`, but on the
  // post-target effective per-pellet damage (health layer) instead of intrinsic —
  // so the rolled numbers are what actually lands on this enemy. Pre-floor, like
  // the intrinsic breakdown in DamageSummary.
  const effPerPellet = intrinsic.multishot > 0 ? result.effectiveHitAverage / intrinsic.multishot : 0;
  const effTiers = critTiers({
    critChance: intrinsic.critChance,
    critMultiplier: intrinsic.critMultiplier,
    avgCritMultiplier: intrinsic.avgCritMultiplier,
    perPelletAverage: effPerPellet,
  });

  const effTypes = (Object.entries(result.perTypeEffective) as [DamageType, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const weightTypes = (Object.entries(result.statusApplication.weights) as [DamageType, number][])
    .filter(([, v]) => (v ?? 0) > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <section className={styles.panel} aria-label="target">
      <h3 className={styles.heading}>Target / Enemy</h3>

      <div className={styles.presets}>
        {FEATURED.map((f) => {
          const active =
            target.enemyId === f.preset.enemyId && !!target.overguard === !!f.preset.overguard;
          return (
            <button
              key={f.label}
              type="button"
              className={`${styles.preset} ${active ? styles.active : ''}`}
              aria-pressed={active}
              onClick={() => applyTargetPreset(f.preset)}
            >
              {f.label}
              <span className={styles.presetNote}>{f.note}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.controls}>
        <label className={styles.control}>
          Enemy
          <select
            aria-label="enemy"
            value={target.enemyId}
            onChange={(e) => selectEnemy(e.target.value)}
          >
            <option value="custom">— Custom —</option>
            {enemies.map((en) => (
              <option key={en.id} value={en.id}>
                {en.name} ({en.faction})
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          Level
          <input
            type="number"
            min={1}
            max={9999}
            value={target.level}
            aria-label="target level"
            onChange={(e) => setTargetLevel(Number(e.target.value))}
          />
        </label>

        <label className={styles.control}>
          Armor strip <span>{pct(target.armorStripPct, 0)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={target.armorStripPct}
            aria-label="armor strip"
            onChange={(e) => setArmorStrip(Number(e.target.value))}
          />
        </label>

        <label className={styles.control}>
          Faction
          <select
            aria-label="faction override"
            value={target.factionOverride ?? ''}
            onChange={(e) => setFactionOverride(e.target.value || null)}
          >
            <option value="">(enemy default)</option>
            {FACTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={target.steelPath}
            aria-label="steel path"
            onChange={(e) => setSteelPath(e.target.checked)}
          />
          Steel Path
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={target.overguard}
            aria-label="overguard"
            onChange={(e) => toggleOverguard(e.target.checked)}
          />
          Eximus / Overguard
        </label>
      </div>

      {isCustom && (
        <div className={styles.controls} aria-label="custom stats">
          {(['health', 'shield', 'armor'] as const).map((stat) => (
            <label key={stat} className={styles.control}>
              {stat[0].toUpperCase() + stat.slice(1)}
              <input
                type="number"
                min={0}
                value={target.custom?.[stat] ?? 0}
                aria-label={`custom ${stat}`}
                onChange={(e) => setCustomTarget({ [stat]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      )}

      <div className={styles.headline}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Effective DPS</span>
          <span className={`${styles.statValue} ${styles.accent}`}>{fmt(result.effectiveDps)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Effective hit</span>
          <span className={styles.statValue}>{fmt(result.effectiveHitAverage, 1)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>TTK (direct)</span>
          <span className={styles.statValue}>
            {isFinite(result.ttkSeconds) ? `${fmt(result.ttkSeconds, 2)} s` : '—'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Lvl / Armor DR</span>
          <span className={styles.statValue}>
            {fmt(result.scaled.level, 0)} · {pct(result.enemyEhp.armor, 0)}
          </span>
        </div>
      </div>

      <div className={styles.chips} aria-label="effective per-type">
        {effTypes.map(([type, value]) => (
          <span key={type} className={styles.chip}>
            <span className={styles.chipType}>{damageLabel(type)}</span>
            <span className={styles.chipValue}>{fmt(value, 1)}</span>
          </span>
        ))}
      </div>

      <div className={styles.tiers} aria-label="effective crit tiers">
        <div className={styles.tiersHead}>
          <span className={styles.tiersTitle}>Effective Crit Tiers</span>
          <span className={styles.tiersHint}>per pellet vs target · chance</span>
        </div>
        <ul className={styles.tierList}>
          {effTiers.map((t) => {
            const meta = tierMeta(t.tier);
            return (
              <li key={t.tier} className={styles.tierRow}>
                <span className={`${styles.tierDot} ${meta.cls}`} aria-hidden="true" />
                <span className={styles.tierName}>{meta.label}</span>
                <span className={styles.tierMult}>{fmt(t.multiplier, 2)}×</span>
                <span className={`${styles.tierDmg} ${meta.cls}`}>{fmt(t.perPellet, 1)}</span>
                <span className={styles.tierProb}>{pct(t.probability, 0)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.ehp} aria-label="enemy ehp">
        <Stat label="Overguard" value={fmt(result.scaled.overguard, 0)} />
        <Stat label="Shield" value={fmt(result.scaled.shield, 0)} />
        <Stat label="Health" value={fmt(result.scaled.health, 0)} />
        <Stat label="Net armor" value={fmt(result.scaled.netArmor, 0)} />
        <Stat label="EHP (raw to kill)" value={fmt(result.enemyEhp.total, 0)} />
      </div>

      <div className={styles.chips} aria-label="status application">
        <span className={styles.chip}>
          <span className={styles.chipType}>Procs / s</span>
          <span className={styles.chipValue}>{fmt(result.statusApplication.procsPerSecond, 2)}</span>
        </span>
        {weightTypes.map(([type, w]) => (
          <span key={type} className={styles.chip}>
            <span className={styles.chipType}>{damageLabel(type)}</span>
            <span className={styles.chipValue}>{pct(w, 0)}</span>
          </span>
        ))}
      </div>

      <p className={styles.note}>
        TTK is <strong>direct-damage only — excludes status DoT</strong> (Slash/Heat/Toxin
        timelines are deferred). Status application above is informational, not folded into TTK.
      </p>

      {data.contributions && <ContributionList contributions={data.contributions} />}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
