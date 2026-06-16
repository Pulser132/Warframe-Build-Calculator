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
  const isBeam = !!result.beam;
  const isPellet = !isBeam && result.multishot > 1;
  const direct = result.components?.find((c) => c.role === 'direct');

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
        <Stat label={isPellet ? 'Pellets / shot' : 'Multishot'} value={`${fmt(result.multishot, 2)}×`} />
        <Stat label="Crit Chance" value={pct(result.critChance)} />
        <Stat label="Crit Mult" value={`${fmt(result.critMultiplier, 2)}×`} />
        <Stat label="Avg Crit" value={`${fmt(result.avgCritMultiplier, 2)}×`} />
        <Stat label="Status / pellet" value={pct(result.statusChancePerPellet)} />
        <Stat label="Procs / shot" value={fmt(result.avgProcsPerShot, 2)} />
        <Stat
          label="P(≥1 proc)"
          value={result.statusProcChance != null ? pct(result.statusProcChance) : '—'}
        />
        <Stat label={isBeam ? 'Tick Rate' : 'Fire Rate'} value={`${fmt(result.fireRate, 2)}/s`} />
      </div>

      {result.beam && (
        <div className={styles.mech} aria-label="beam stats">
          <div className={styles.mechTitle}>Beam (continuous)</div>
          <div className={styles.grid}>
            <Stat label="Per-tick Dmg" value={fmt(result.beam.perTickDamage, 1)} />
            <Stat label="Ticks / s" value={`${fmt(result.beam.tickRate, 2)}/s`} />
            <Stat label="Procs / s" value={fmt(result.beam.procsPerSecond, 2)} />
            <Stat label="Ammo / tick" value={fmt(result.ammoPerShot ?? 0.5, 2)} />
          </div>
          <p className={styles.mechNote}>
            Damage ramps from {pct(result.beam.rampStartPct, 0)} to 100% over{' '}
            {fmt(result.beam.rampSeconds, 1)}s — DPS shown is peak (post-ramp).
          </p>
        </div>
      )}

      {result.aoe && (
        <div className={styles.mech} aria-label="aoe stats">
          <div className={styles.mechTitle}>Area of Effect ({fmt(result.aoe.radius, 0)} m radius)</div>
          <div className={styles.grid}>
            <Stat label="Center" value={fmt(result.aoe.centerAverage, 1)} accent />
            <Stat label="Edge (rim)" value={fmt(result.aoe.rimAverage, 1)} />
            {direct && <Stat label="Direct hit" value={fmt(direct.perPelletAverage, 1)} />}
          </div>
          <p className={styles.mechNote}>
            Radial damage falls off linearly from center to edge.
          </p>
        </div>
      )}
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
