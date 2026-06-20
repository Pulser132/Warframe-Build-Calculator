import type { DamageType } from '@engine/model/types';
import type { TargetResult } from '@engine';
import { fmt, pct, damageLabel } from '../util';
import styles from './TargetExtras.module.css';

interface Props {
  result: TargetResult;
}

/**
 * Target-only readouts that have **no** intrinsic counterpart, appended below the
 * effective `DamageSummary` in vs-Target mode (decision 5): direct-only TTK, the
 * enemy EHP layers (overguard / shield / health / net armor / raw-to-kill), and
 * status *application* vs this target. The effective DPS / per-type / crit tiers
 * live in the shared `DamageSummary` (fed the effective projection), so they are
 * intentionally absent here.
 */
export function TargetExtras({ result }: Props) {
  const weightTypes = (Object.entries(result.statusApplication.weights) as [DamageType, number][])
    .filter(([, v]) => (v ?? 0) > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <section className={styles.panel} aria-label="target extras">
      <div className={styles.headline}>
        <Stat
          label="TTK (direct)"
          value={isFinite(result.ttkSeconds) ? `${fmt(result.ttkSeconds, 2)} s` : '—'}
          accent
        />
        <Stat label="Lvl / Armor DR" value={`${fmt(result.scaled.level, 0)} · ${pct(result.enemyEhp.armor, 0)}`} />
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
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${accent ? styles.accent : ''}`}>{value}</span>
    </div>
  );
}
