import { useEffect, useState } from 'react';
import { loadDataset } from '@data/loaders';
import {
  useBuildStore,
  useDamageResult,
  useEffectiveResult,
  useWarframe,
  useWarframeStats,
} from '@state';
import {
  ModdingScreen,
  DamageSummary,
  ContributionList,
  PipelineChain,
  ConfigMenu,
  FramePanel,
  TargetControls,
  TargetExtras,
} from '@ui';
import styles from './App.module.css';

export function App() {
  const initFromDataset = useBuildStore((s) => s.initFromDataset);
  const dataset = useBuildStore((s) => s.dataset);
  const [error, setError] = useState<string | null>(null);
  // The results readout: Build (intrinsic) vs vs-Target (effective). Ephemeral
  // local state, default Build (decision 11); the sidebar Target config is always
  // visible regardless of this toggle.
  const [vsTarget, setVsTarget] = useState(false);
  const result = useDamageResult();
  const effective = useEffectiveResult();
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
              <div className={styles.viewHeader}>
                <span className={styles.viewName}>{vsTarget ? 'vs Target' : 'Build'}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={vsTarget}
                  aria-label="vs Target"
                  className={`${styles.switch} ${vsTarget ? styles.switchOn : ''}`}
                  onClick={() => setVsTarget((v) => !v)}
                >
                  <span className={styles.switchTrack}>
                    <span className={styles.switchThumb} />
                  </span>
                  vs Target
                </button>
              </div>

              {!vsTarget ? (
                <div className={styles.viewPanel} aria-label="build output">
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
                <div className={styles.viewPanel} aria-label="vs target output">
                  {effective && <DamageSummary result={effective.projection} />}
                  {effective && <TargetExtras result={effective.result} />}
                  {warframe && frameStats && (
                    <FramePanel frameName={warframe.name} stats={frameStats} />
                  )}
                  {result && <PipelineChain result={result} />}
                  {effective?.contributions && (
                    <ContributionList contributions={effective.contributions} />
                  )}
                </div>
              )}
            </div>
            <aside className={styles.sidebar}>
              <ConfigMenu />
              <TargetControls />
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
