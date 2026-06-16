import type { Polarity } from '@engine/model/types';
import { polarityGlyph, polarityColorVar } from '../util';
import styles from './PolarityBadge.module.css';

interface Props {
  polarity: Polarity;
  size?: 'sm' | 'md';
  title?: string;
}

/** The little polarity glyph chip used on slots and mod cards. */
export function PolarityBadge({ polarity, size = 'md', title }: Props) {
  return (
    <span
      className={`${styles.badge} ${size === 'sm' ? styles.sm : ''}`}
      style={{ color: polarityColorVar(polarity), borderColor: polarityColorVar(polarity) }}
      title={title ?? polarity}
      aria-label={`polarity ${polarity}`}
    >
      {polarityGlyph(polarity)}
    </span>
  );
}
