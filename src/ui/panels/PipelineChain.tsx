import { useState } from 'react';
import type { DamageResult } from '@engine';
import styles from './PipelineChain.module.css';

interface Props {
  result: DamageResult;
}

/** Expandable stage-by-stage view of the damage pipeline (additive vs multiplicative). */
export function PipelineChain({ result }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.panel} aria-label="pipeline chain">
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.caret}>{open ? '▾' : '▸'}</span>
        Pipeline breakdown
        <span className={styles.hint}>{open ? 'hide' : 'show'} {result.chain.length} stages</span>
      </button>
      {open && (
        <ol className={styles.steps}>
          {result.chain.map((stage) => (
            <li key={stage.id} className={styles.step}>
              <span className={styles.label}>{stage.label}</span>
              <span className={styles.detail}>{stage.detail}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
