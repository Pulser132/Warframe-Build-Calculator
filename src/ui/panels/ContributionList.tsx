import type { Contribution } from '@engine';
import { fmt, pct } from '../util';
import styles from './ContributionList.module.css';

interface Props {
  contributions: Contribution[];
}

/**
 * Per-mod damage contribution (leave-one-out). Bars are scaled to the biggest
 * contributor. Honest note: contributions need NOT sum to 100% (multipliers
 * interact), so this is a relative ranking, not a partition.
 */
export function ContributionList({ contributions }: Props) {
  const max = Math.max(1, ...contributions.map((c) => Math.abs(c.dpsDelta)));

  return (
    <section className={styles.panel} aria-label="mod contributions">
      <h3 className={styles.heading}>Per-mod contribution</h3>
      <ul className={styles.list}>
        {contributions.map((c) => (
          <li key={c.sourceId} className={styles.row}>
            <span className={styles.name}>{c.label}</span>
            <span className={styles.bar}>
              <span
                className={styles.fill}
                style={{ width: `${(Math.abs(c.dpsDelta) / max) * 100}%` }}
              />
            </span>
            <span className={styles.delta}>+{fmt(c.dpsDelta)}</span>
            <span className={styles.frac}>{pct(c.fraction)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        Leave-one-out marginal DPS. Values need not sum to 100% — buckets multiply, so
        mods amplify each other.
      </p>
    </section>
  );
}
