import { useEffect, useState } from 'react';
import { loadDataset } from '@data/loaders';
import { useBuildStore, useDamageResult } from '@state';
import { ModdingScreen, DamageSummary, ContributionList, PipelineChain, ConfigMenu } from '@ui';
import styles from './App.module.css';

export function App() {
  const initFromDataset = useBuildStore((s) => s.initFromDataset);
  const dataset = useBuildStore((s) => s.dataset);
  const [error, setError] = useState<string | null>(null);
  const result = useDamageResult();

  useEffect(() => {
    let cancelled = false;
    loadDataset()
      .then((ds) => {
        if (!cancelled) initFromDataset(ds);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [initFromDataset]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Warframe <span className={styles.accent}>Build Calculator</span>
        </h1>
        <p className={styles.tagline}>
          Mod a rifle as in-game and see exactly where your damage comes from.
        </p>
      </header>

      {error && <p className={styles.error}>Failed to load data: {error}</p>}
      {!dataset && !error && <p className={styles.loading}>Loading arsenal…</p>}

      {dataset && (
        <main className={styles.main}>
          <ModdingScreen />
          <div className={styles.results}>
            <div className={styles.resultsMain}>
              {result && <DamageSummary result={result} />}
              {result && <PipelineChain result={result} />}
              {result?.contributions && <ContributionList contributions={result.contributions} />}
            </div>
            <aside className={styles.sidebar}>
              <ConfigMenu />
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
