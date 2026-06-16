import { useState } from 'react';
import type { Polarity } from '@engine/model/types';
import { useBuildStore, useCapacity, weaponModGroup } from '@state';
import { ModSlot, ModPicker, CapacityBar } from '../components';
import styles from './ModdingScreen.module.css';

const CLASS_LABEL: Record<string, string> = {
  rifle: 'Rifle',
  shotgun: 'Shotgun',
  pistol: 'Pistol',
  sniper: 'Sniper',
  bow: 'Bow',
  launcher: 'Launcher',
  beam: 'Beam',
};

/**
 * In-game-style modding screen: a weapon picker + (for multi-mode weapons) a
 * fire-mode switcher, then aura + exilus, 8 mod slots, and 2 arcane slots —
 * generalized across every primary and secondary gun.
 */
export function ModdingScreen() {
  const dataset = useBuildStore((s) => s.dataset);
  const build = useBuildStore((s) => s.build);
  const activeMode = useBuildStore((s) => s.activeMode);
  const selectWeapon = useBuildStore((s) => s.selectWeapon);
  const setMode = useBuildStore((s) => s.setMode);
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
  const modGroup = weapon ? weaponModGroup(weapon) : 'rifle';
  const modes = weapon?.fireModes ?? [];
  const currentMode = activeMode ?? modes[0]?.name ?? null;
  const subLabel = weapon
    ? `${weapon.category} · ${CLASS_LABEL[weapon.weaponClass] ?? weapon.weaponClass}`
    : 'Weapon';

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
          <select
            className={styles.weaponSelect}
            value={build.weaponId}
            onChange={(e) => selectWeapon(e.target.value)}
            aria-label="select weapon"
          >
            {dataset.weapons.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <span className={styles.sub}>{subLabel}</span>
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

      {modes.length > 1 && (
        <div className={styles.modes} role="tablist" aria-label="fire modes">
          {modes.map((m) => (
            <button
              key={m.name}
              type="button"
              role="tab"
              aria-selected={m.name === currentMode}
              className={`${styles.modeTab} ${m.name === currentMode ? styles.modeTabActive : ''}`}
              onClick={() => setMode(m.name)}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

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
          modGroup={modGroup}
          onAssign={assignMod}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </section>
  );
}
