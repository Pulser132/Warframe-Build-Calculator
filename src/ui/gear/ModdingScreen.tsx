import { useState } from 'react';
import type { Polarity } from '@engine/model/types';
import { useBuildStore, useCapacity } from '@state';
import { ModSlot, ModPicker, CapacityBar } from '../components';
import styles from './ModdingScreen.module.css';

/**
 * In-game-style rifle modding screen: aura + exilus up top, 8 mod slots in a
 * grid below, 2 arcane slots on the right (matching Goal.md's arrangement).
 */
export function ModdingScreen() {
  const dataset = useBuildStore((s) => s.dataset);
  const build = useBuildStore((s) => s.build);
  const assignMod = useBuildStore((s) => s.assignMod);
  const clearSlot = useBuildStore((s) => s.clearSlot);
  const setRank = useBuildStore((s) => s.setRank);
  const setSlotPolarity = useBuildStore((s) => s.setSlotPolarity);
  const setReactor = useBuildStore((s) => s.setReactor);
  const undo = useBuildStore((s) => s.undo);
  const redo = useBuildStore((s) => s.redo);
  const canUndo = useBuildStore((s) => s.past.length > 0);
  const canRedo = useBuildStore((s) => s.future.length > 0);
  const capacity = useCapacity();

  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  if (!dataset) return null;
  const weapon = dataset.weapons.find((w) => w.id === build.weaponId);

  const nameFor = (itemId: string | null, isArcane: boolean): string | undefined => {
    if (!itemId) return undefined;
    return isArcane
      ? dataset.arcanes.find((a) => a.id === itemId)?.name
      : dataset.mods.find((m) => m.id === itemId)?.name;
  };
  const maxRankFor = (itemId: string | null, isArcane: boolean): number => {
    if (!itemId) return 0;
    return (
      (isArcane
        ? dataset.arcanes.find((a) => a.id === itemId)?.maxRank
        : dataset.mods.find((m) => m.id === itemId)?.maxRank) ?? 0
    );
  };

  const renderSlot = (index: number) => {
    const slot = build.slots[index];
    const isArcane = slot.kind === 'arcane';
    return (
      <ModSlot
        key={index}
        slot={slot}
        index={index}
        itemName={nameFor(slot.itemId, isArcane)}
        maxRank={maxRankFor(slot.itemId, isArcane)}
        cost={capacity?.perSlot[index]}
        onPick={setPickerSlot}
        onClear={clearSlot}
        onRank={setRank}
        onForma={(i: number, p: Polarity) => setSlotPolarity(i, p)}
      />
    );
  };

  return (
    <section className={styles.screen} aria-label="modding screen">
      <header className={styles.bar}>
        <div className={styles.title}>
          <h2>{weapon?.name ?? 'Weapon'}</h2>
          <span className={styles.sub}>Primary · Rifle</span>
        </div>
        <div className={styles.controls}>
          {capacity && <CapacityBar used={capacity.used} total={capacity.total} over={capacity.over} />}
          <label className={styles.reactor}>
            <input
              type="checkbox"
              checked={build.reactor}
              onChange={(e) => setReactor(e.target.checked)}
            />
            Reactor
          </label>
          <div className={styles.history}>
            <button type="button" onClick={undo} disabled={!canUndo} aria-label="undo" title="undo">
              ↶
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} aria-label="redo" title="redo">
              ↷
            </button>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.topRow}>
            {renderSlot(0) /* aura */}
            {renderSlot(1) /* exilus */}
          </div>
          <div className={styles.grid}>
            {[2, 3, 4, 5, 6, 7, 8, 9].map((i) => renderSlot(i))}
          </div>
        </div>
        <aside className={styles.arcanes} aria-label="arcane slots">
          {[10, 11].map((i) => renderSlot(i))}
        </aside>
      </div>

      {pickerSlot !== null && (
        <ModPicker
          slotIndex={pickerSlot}
          slotKind={build.slots[pickerSlot].kind}
          mods={dataset.mods}
          arcanes={dataset.arcanes}
          onAssign={assignMod}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </section>
  );
}
