import { useEffect, useState } from 'react';
import { loadDataset } from '@data/loaders';
import { useBuildStore, useDamageResult, useWarframe, useWarframeStats } from '@state';
import {
  ModdingScreen,
  DamageSummary,
  ContributionList,
  PipelineChain,
  ConfigMenu,
  FramePanel,
  TargetPanel,
} from '@ui';
import styles from './App.module.css';

type ResultsTab = 'build' | 'target';

export function App() {
  const initFromDataset = useBuildStore((s) => s.initFromDataset);
  const dataset = useBuildStore((s) => s.dataset);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ResultsTab>('build');
  const result = useDamageResult();
  const warframe = useWarframe();
  const frameStats = useWarframeStats();

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
          Mod any weapon or Warframe as in-game and see exactly where your damage comes from.
        </p>
      </header>

      {error && <p className={styles.error}>Failed to load data: {error}</p>}
      {!dataset && !error && <p className={styles.loading}>Loading arsenal…</p>}

      {dataset && (
        <main className={styles.main}>
          <ModdingScreen />
          <div className={styles.results}>
            <div className={styles.resultsMain}>
              <div className={styles.tabs} role="tablist" aria-label="results view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'build'}
                  className={`${styles.tab} ${tab === 'build' ? styles.tabActive : ''}`}
                  onClick={() => setTab('build')}
                >
                  Build
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'target'}
                  className={`${styles.tab} ${tab === 'target' ? styles.tabActive : ''}`}
                  onClick={() => setTab('target')}
                >
                  vs Target
                </button>
              </div>

              {tab === 'build' ? (
                <div className={styles.tabPanel} role="tabpanel" aria-label="build output">
                  {result && <DamageSummary result={result} />}
                  {warframe && frameStats && (
                    <FramePanel frameName={warframe.name} stats={frameStats} />
                  )}
                  {result && <PipelineChain result={result} />}
                  {result?.contributions && (
                    <ContributionList contributions={result.contributions} />
                  )}
                </div>
              ) : (
                <div className={styles.tabPanel} role="tabpanel" aria-label="vs target">
                  <TargetPanel />
                </div>
              )}
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
