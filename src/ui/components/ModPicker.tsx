import { useEffect, useMemo, useState } from 'react';
import type { ModData, ArcaneData, ModSlotKind, Polarity } from '@engine/model/types';
import { slotAccepts } from '@state';
import { ModCard } from './ModCard';
import { cleanStat } from '../util';
import styles from './ModPicker.module.css';

interface Props {
  slotIndex: number;
  slotKind: ModSlotKind;
  mods: ModData[];
  arcanes: ArcaneData[];
  onAssign: (slotIndex: number, itemId: string) => void;
  onClose: () => void;
}

interface Candidate {
  id: string;
  name: string;
  stats: string[];
  rarity: string;
  polarity?: Polarity;
  drain?: number;
}

/** Searchable, slot-aware picker overlay. Click an item to assign it. */
export function ModPicker({ slotIndex, slotKind, mods, arcanes, onAssign, onClose }: Props) {
  const [query, setQuery] = useState('');

  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const candidates = useMemo<Candidate[]>(() => {
    const q = query.trim().toLowerCase();
    if (slotKind === 'arcane') {
      return arcanes
        .filter((a) => a.name.toLowerCase().includes(q))
        .map((a) => ({ id: a.id, name: a.name, stats: a.rawMaxStats.map(cleanStat), rarity: a.rarity }));
    }
    return mods
      .filter((m) => slotAccepts(slotKind, m.slot))
      .filter((m) => m.name.toLowerCase().includes(q))
      .map((m) => ({
        id: m.id,
        name: m.name,
        polarity: m.polarity,
        drain: m.baseDrain,
        rarity: m.rarity,
        stats: m.rawMaxStats.map(cleanStat),
      }));
  }, [query, slotKind, mods, arcanes]);

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a ${slotKind} for slot ${slotIndex + 1}`}
      >
        <div className={styles.head}>
          <input
            autoFocus
            className={styles.search}
            placeholder={`Search ${slotKind} mods…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="search mods"
          />
          <button type="button" className={styles.close} onClick={onClose} aria-label="close picker">
            ✕
          </button>
        </div>
        <div className={styles.list}>
          {candidates.length === 0 && <p className={styles.empty}>No matching mods.</p>}
          {candidates.map((c) => (
            <ModCard
              key={c.id}
              name={c.name}
              polarity={c.polarity}
              drain={c.drain}
              rarity={c.rarity}
              stats={c.stats}
              onClick={() => {
                onAssign(slotIndex, c.id);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
