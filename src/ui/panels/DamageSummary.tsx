import type { DamageResult } from '@engine';
import { critTiers } from '@engine';
import type { DamageType } from '@engine/model/types';
import { fmt, pct, damageLabel } from '../util';
import styles from './DamageSummary.module.css';

interface Props {
  result: DamageResult;
}

/** Display label + colour class per crit tier (0 = non-crit, then yellow/orange/red). */
const TIER_META = [
  { label: 'Non-crit', cls: styles.tierWhite },
  { label: 'Crit', cls: styles.tierYellow },
  { label: 'Orange crit', cls: styles.tierOrange },
  { label: 'Red crit', cls: styles.tierRed },
];
function tierMeta(tier: number) {
  return TIER_META[tier] ?? { label: `Tier ${tier} crit`, cls: styles.tierRed };
}

/** Headline damage panel: per-type damage, average hit, burst/sustained DPS, status. */
export function DamageSummary({ result }: Props) {
  const types = Object.entries(result.perType) as [DamageType, number][];
  types.sort((a, b) => b[1] - a[1]);

  const tiers = critTiers(result);

  return (
    <section className={styles.panel} aria-label="damage summary">
      <h3 className={styles.heading}>Damage</h3>

      <div className={styles.headline}>
        <Stat label="Burst DPS" value={fmt(result.burstDps)} big accent />
        <Stat label="Sustained DPS" value={fmt(result.sustainedDps)} big />
        <Stat label="Avg Hit / shot" value={fmt(result.avgHitPerShot)} />
      </div>

      <div className={styles.chips} aria-label="per-type damage">
        {types.map(([type, value]) => (
          <span key={type} className={styles.chip}>
            <span className={styles.chipType}>{damageLabel(type)}</span>
            <span className={styles.chipValue}>{fmt(value, 1)}</span>
          </span>
        ))}
      </div>

      <div className={styles.tiers} aria-label="crit tiers">
        <div className={styles.tiersHead}>
          <span className={styles.tiersTitle}>Crit Tiers</span>
          <span className={styles.tiersHint}>per pellet · chance</span>
        </div>
        <ul className={styles.tierList}>
          {tiers.map((t) => {
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

      <div className={styles.grid}>
        <Stat label="Multishot" value={`${fmt(result.multishot, 2)}×`} />
        <Stat label="Crit Chance" value={pct(result.critChance)} />
        <Stat label="Crit Mult" value={`${fmt(result.critMultiplier, 2)}×`} />
        <Stat label="Avg Crit" value={`${fmt(result.avgCritMultiplier, 2)}×`} />
        <Stat label="Status / pellet" value={pct(result.statusChancePerPellet)} />
        <Stat label="Procs / shot" value={fmt(result.avgProcsPerShot, 2)} />
        <Stat label="Fire Rate" value={`${fmt(result.fireRate, 2)}/s`} />
        <Stat label="Avg Pellet" value={fmt(result.perPelletAverage, 1)} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  big,
  accent,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`${styles.stat} ${big ? styles.big : ''}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${accent ? styles.accent : ''}`}>{value}</span>
    </div>
  );
}
