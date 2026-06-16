import type { DamageResult } from '@engine';
import type { DamageType } from '@engine/model/types';
import { fmt, pct, damageLabel } from '../util';
import styles from './DamageSummary.module.css';

interface Props {
  result: DamageResult;
}

/** Headline damage panel: per-type damage, average hit, burst/sustained DPS, status. */
export function DamageSummary({ result }: Props) {
  const types = Object.entries(result.perType) as [DamageType, number][];
  types.sort((a, b) => b[1] - a[1]);

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
