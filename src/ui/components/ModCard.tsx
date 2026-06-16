import type { Polarity } from '@engine/model/types';
import { PolarityBadge } from './PolarityBadge';
import styles from './ModCard.module.css';

interface Props {
  name: string;
  polarity?: Polarity;
  drain?: number;
  rarity?: string;
  /** Human-readable stat lines (already cleaned). */
  stats: string[];
  onClick?: () => void;
}

/** A row in the mod picker: name + polarity + drain + max-rank stats. */
export function ModCard({ name, polarity, drain, rarity, stats, onClick }: Props) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.top}>
        {polarity && <PolarityBadge polarity={polarity} size="sm" />}
        <span className={styles.name}>{name}</span>
        {typeof drain === 'number' && (
          <span className={styles.drain} title="base drain">
            {drain < 0 ? `+${-drain}` : drain}
          </span>
        )}
      </div>
      <div className={styles.stats}>
        {stats.map((s, i) => (
          <span key={i} className={styles.stat}>
            {s}
          </span>
        ))}
      </div>
      {rarity && <span className={`${styles.rarity} ${styles[rarity.toLowerCase()] ?? ''}`}>{rarity}</span>}
    </button>
  );
}
