import styles from './CapacityBar.module.css';

interface Props {
  used: number;
  total: number;
  over: boolean;
}

/** Mod-capacity readout with a fill bar; soft-warns (does not block) when over. */
export function CapacityBar({ used, total, over }: Props) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className={styles.wrap} title="mod capacity">
      <div className={styles.label}>
        <span>Capacity</span>
        <span className={`${styles.value} ${over ? styles.over : ''}`}>
          {used} / {total}
          {over && <span className={styles.warn}> ⚠ over capacity</span>}
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${over ? styles.fillOver : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
