import styles from './RankSelector.module.css';

interface Props {
  rank: number;
  maxRank: number;
  onChange: (rank: number) => void;
}

/** Compact rank stepper (R{n}/{max}) shown on an equipped mod. */
export function RankSelector({ rank, maxRank, onChange }: Props) {
  return (
    <div className={styles.wrap} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={styles.btn}
        aria-label="decrease rank"
        disabled={rank <= 0}
        onClick={() => onChange(rank - 1)}
      >
        −
      </button>
      <span className={styles.value} aria-label={`rank ${rank} of ${maxRank}`}>
        R{rank}
        <span className={styles.max}>/{maxRank}</span>
      </span>
      <button
        type="button"
        className={styles.btn}
        aria-label="increase rank"
        disabled={rank >= maxRank}
        onClick={() => onChange(rank + 1)}
      >
        +
      </button>
    </div>
  );
}
