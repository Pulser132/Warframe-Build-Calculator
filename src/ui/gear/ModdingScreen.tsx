import { useState } from 'react';
import type { Polarity } from '@engine/model/types';
import { useBuildStore, useCapacity, useActiveGear, weaponModGroup, gearModGroup } from '@state';
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
  // Melee classes (Stage 3).
  sword: 'Sword',
  'heavy-blade': 'Heavy Blade',
  nikana: 'Nikana',
  tonfa: 'Tonfa',
  dagger: 'Dagger',
  'dual-swords': 'Dual Swords',
  polearm: 'Polearm',
  staff: 'Staff',
  hammer: 'Hammer',
  scythe: 'Scythe',
  whip: 'Whip',
  fist: 'Fist',
  rapier: 'Rapier',
  glaive: 'Glaive',
  machete: 'Machete',
  claws: 'Claws',
  gunblade: 'Gunblade',
  warfan: 'War Fan',
  nunchaku: 'Nunchaku',
  melee: 'Melee',
};

/**
 * In-game-style modding screen. A compartment switcher (Warframe | Weapon)
 * selects the active gear (ADR 0003); the screen then renders that compartment's
 * item picker, (for a weapon) fire-mode + combo-string switchers, and its slot
 * layout — header slots (aura/stance/exilus), the normal grid, and arcanes —
 * driven by the gear's own `slots`, not hard-coded indices.
 */
export function ModdingScreen() {
  const dataset = useBuildStore((s) => s.dataset);
  const build = useBuildStore((s) => s.build);
  const activeCompartment = useBuildStore((s) => s.activeCompartment);
  const setActiveCompartment = useBuildStore((s) => s.setActiveCompartment);
  const activeMode = useBuildStore((s) => s.activeMode);
  const selectWeapon = useBuildStore((s) => s.selectWeapon);
  const selectWarframe = useBuildStore((s) => s.selectWarframe);
  const setMode = useBuildStore((s) => s.setMode);
  const activeComboString = useBuildStore((s) => s.activeComboString);
  const setComboString = useBuildStore((s) => s.setComboString);
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
  const gear = useActiveGear();

  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  if (!dataset) return null;
  const onWarframe = activeCompartment === 'warframe';

  const weapon = dataset.weapons.find((w) => w.id === build.weapon.itemId);
  const modGroup = onWarframe
    ? gearModGroup({ category: 'Warframe' })
    : weapon
      ? weaponModGroup(weapon)
      : 'rifle';

  const modes = onWarframe ? [] : (weapon?.fireModes ?? []);
  const currentMode = activeMode ?? modes[0]?.name ?? null;
  const isNormalMode = (modes.find((m) => m.name === currentMode) ?? modes[0])?.trigger === 'melee';
  const equippedStances = new Set(
    build.weapon.slots
      .filter((s) => s.kind === 'stance' && s.itemId)
      .map((s) => dataset.mods.find((m) => m.id === s.itemId)?.name)
      .filter((n): n is string => !!n),
  );
  const comboStrings = (weapon?.comboStrings ?? []).filter(
    (c) => equippedStances.size === 0 || equippedStances.has(c.stance),
  );

  const subLabel = onWarframe
    ? 'Warframe'
    : weapon
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

  const slots = gear?.slots ?? [];
  const headerIdx = slots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.kind === 'aura' || s.kind === 'stance' || s.kind === 'exilus')
    .map(({ i }) => i);
  const normalIdx = slots.map((s, i) => ({ s, i })).filter(({ s }) => s.kind === 'normal').map(({ i }) => i);
  const arcaneIdx = slots.map((s, i) => ({ s, i })).filter(({ s }) => s.kind === 'arcane').map(({ i }) => i);

  const renderSlot = (index: number) => {
    const slot = slots[index];
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
      <div className={styles.modes} role="tablist" aria-label="gear compartment">
        {(['warframe', 'weapon'] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={activeCompartment === c}
            className={`${styles.modeTab} ${activeCompartment === c ? styles.modeTabActive : ''}`}
            onClick={() => setActiveCompartment(c)}
          >
            {c === 'warframe' ? 'Warframe' : 'Weapon'}
          </button>
        ))}
      </div>

      <header className={styles.bar}>
        <div className={styles.title}>
          {onWarframe ? (
            <select
              className={styles.weaponSelect}
              value={build.warframe?.itemId ?? ''}
              onChange={(e) => selectWarframe(e.target.value || null)}
              aria-label="select warframe"
            >
              <option value="">— No Warframe —</option>
              {dataset.warframes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              className={styles.weaponSelect}
              value={build.weapon.itemId}
              onChange={(e) => selectWeapon(e.target.value)}
              aria-label="select weapon"
            >
              {dataset.weapons.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
          <span className={styles.sub}>{subLabel}</span>
        </div>
        <div className={styles.controls}>
          {capacity && <CapacityBar used={capacity.used} total={capacity.total} over={capacity.over} />}
          <label className={styles.reactor}>
            <input
              type="checkbox"
              checked={gear?.reactor ?? true}
              disabled={!gear}
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

      {!onWarframe && isNormalMode && comboStrings.length > 0 && (
        <div className={styles.modes} aria-label="combo string">
          <label className={styles.sub} htmlFor="combo-string-select">
            Combo String
          </label>
          <select
            id="combo-string-select"
            className={styles.weaponSelect}
            value={activeComboString ?? ''}
            onChange={(e) => setComboString(e.target.value || null)}
            aria-label="select combo string"
          >
            <option value="">Neutral (single swing)</option>
            {comboStrings.map((c) => (
              <option key={c.name} value={c.name}>
                {c.stance} — {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {gear ? (
        <div className={styles.layout}>
          <div className={styles.main}>
            <div className={styles.topRow}>{headerIdx.map((i) => renderSlot(i))}</div>
            <div className={styles.grid}>{normalIdx.map((i) => renderSlot(i))}</div>
          </div>
          <aside className={styles.arcanes} aria-label="arcane slots">
            {arcaneIdx.map((i) => renderSlot(i))}
          </aside>
        </div>
      ) : (
        <p className={styles.sub}>No Warframe equipped — pick one above to mod it.</p>
      )}

      {pickerSlot !== null && gear && (
        <ModPicker
          slotIndex={pickerSlot}
          slotKind={slots[pickerSlot].kind}
          mods={dataset.mods}
          arcanes={dataset.arcanes}
          modGroup={modGroup}
          weaponClass={onWarframe ? undefined : weapon?.weaponClass}
          onAssign={assignMod}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </section>
  );
}
