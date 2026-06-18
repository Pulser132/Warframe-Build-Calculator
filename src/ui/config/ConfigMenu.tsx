import { useMemo, useState } from 'react';
import {
  listStateEntries,
  discoverStackEntries,
  reachTargetCount,
  STATE_GROUPS,
  STATE_GROUP_ORDER,
  type StateEntry,
  type StackEntry,
  type BuffEntry,
  type StateGroup,
  type StackSourceInput,
} from '@engine';
import { useBuildStore, useWarframeStats } from '@state';
import styles from './ConfigMenu.module.css';

/**
 * The full Stage 5 combat-state menu — **registry-driven** (decision 5). Every
 * row comes from the unified `STATE_REGISTRY` (plus stacks discovered from
 * equipped gear), so adding a buff/toggle/stack is a registry entry only
 * (Goal.md "easily expandable"). Rows are bucketed into **collapsible groups**, a
 * **text filter** narrows by label/description, and each `kind` renders its own
 * **control** (toggle → checkbox, buff → checkbox + manual slider, stack →
 * stepper, except Combo Count which stays a slider). `visibleWhen` predicates
 * (declared on the entries) replace the old inline `usesStatusCount`/melee logic.
 */
export function ConfigMenu() {
  const dataset = useBuildStore((s) => s.dataset);
  const build = useBuildStore((s) => s.build);
  const combat = useBuildStore((s) => s.combat);
  const toggleCondition = useBuildStore((s) => s.toggleCondition);
  const setStacks = useBuildStore((s) => s.setStacks);
  const toggleBuff = useBuildStore((s) => s.toggleBuff);
  const setBuffManual = useBuildStore((s) => s.setBuffManual);
  const setTargetCount = useBuildStore((s) => s.setTargetCount);
  const setEnemySpacing = useBuildStore((s) => s.setEnemySpacing);
  const frameStats = useWarframeStats();
  const [filter, setFilter] = useState('');

  const weaponSlots = build.weapon.slots;
  const frameBuild = build.warframe;
  const weapon = dataset?.weapons.find((w) => w.id === build.weapon.itemId);
  const isMelee = weapon?.category === 'Melee';
  const reach = weapon?.range;

  // A mod that consumes the "status types on target" count is equipped (the
  // visibility predicate for that registry entry — decision 5).
  const usesStatusCount = weaponSlots.some((slot) => {
    if (!slot.itemId) return false;
    return dataset?.mods.find((m) => m.id === slot.itemId)?.customEffectId === 'condition-overload';
  });

  // Static registry entries (filtered by their `visibleWhen`) + stacks discovered
  // from equipped gear (weapon arcanes/mods + frame arcanes carrying a per-stack,
  // condition-keyed effect — Primary Merciless, Galvanized Diffusion, Molt
  // Augmented). Both flow through the same `StateEntry` shape.
  const discovered = useMemo<StackEntry[]>(() => {
    if (!dataset) return [];
    const inputs: StackSourceInput[] = [];
    for (const slot of weaponSlots) {
      if (!slot.itemId) continue;
      if (slot.kind === 'arcane') {
        const a = dataset.arcanes.find((x) => x.id === slot.itemId);
        if (a) inputs.push({ id: a.id, label: a.name, effects: a.effects });
      } else {
        const m = dataset.mods.find((x) => x.id === slot.itemId);
        if (m) inputs.push({ id: m.id, label: m.name, effects: m.effects });
      }
    }
    for (const slot of frameBuild?.slots ?? []) {
      if (slot.kind !== 'arcane' || !slot.itemId) continue;
      const a = dataset.arcanes.find((x) => x.id === slot.itemId);
      if (a) inputs.push({ id: a.id, label: a.name, frameEffects: a.frameEffects });
    }
    return discoverStackEntries(inputs);
  }, [dataset, weaponSlots, frameBuild]);

  const entries = useMemo<StateEntry[]>(
    () => [...listStateEntries({ isMelee, usesStatusCount }), ...discovered],
    [isMelee, usesStatusCount, discovered],
  );

  const q = filter.trim().toLowerCase();
  const matches = (e: { label: string; description?: string }) =>
    !q || e.label.toLowerCase().includes(q) || (e.description?.toLowerCase().includes(q) ?? false);

  // Melee multi-target controls (non-registry, special): an enemy-spacing slider
  // that, when set, derives the swing target count from Reach (decision 19),
  // superseding the manual "Targets in swing" slider.
  const showMeleeExtras = isMelee && matches({ label: 'Targets in swing enemy spacing reach' });
  const spacing = combat.enemySpacing ?? 0;
  const derivedTargets = spacing > 0 ? reachTargetCount(reach, spacing) : null;

  const byGroup = (group: StateGroup) => entries.filter((e) => e.group === group && matches(e));

  const anyVisible = entries.some((e) => matches(e)) || showMeleeExtras;

  return (
    <section className={styles.panel} aria-label="combat configuration">
      <h3 className={styles.heading}>Combat State</h3>

      <input
        type="search"
        className={styles.filter}
        placeholder="Filter buffs, stacks, conditionals…"
        aria-label="filter combat state"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {!anyVisible && <p className={styles.empty}>No matching combat-state options.</p>}

      {STATE_GROUP_ORDER.map((group) => {
        const groupEntries = byGroup(group);
        const isMeleeGroup = group === 'melee-state';
        const hasContent = groupEntries.length > 0 || (isMeleeGroup && showMeleeExtras);
        if (!hasContent) return null;
        return (
          // Open by default (user-collapsible). Remounting on filter change
          // re-applies the open state so a search force-expands every group.
          <details key={`${group}${q ? '-f' : ''}`} className={styles.groupDetails} open>
            <summary className={styles.groupSummary}>{STATE_GROUPS[group].label}</summary>
            <div className={styles.groupBody}>
              {groupEntries.map((entry) => (
                <EntryControl
                  key={entry.id}
                  entry={entry}
                  combat={combat}
                  frameStats={frameStats}
                  onToggleCondition={toggleCondition}
                  onSetStacks={setStacks}
                  onToggleBuff={toggleBuff}
                  onSetBuffManual={setBuffManual}
                />
              ))}
              {isMeleeGroup && showMeleeExtras && (
                <>
                  <div className={styles.slider}>
                    <span className={styles.sliderLabel}>
                      Enemy spacing{' '}
                      <span className={styles.value}>{spacing > 0 ? `${spacing} m` : 'off'}</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.5}
                      value={spacing}
                      aria-label="enemy spacing"
                      onChange={(e) => setEnemySpacing(Number(e.target.value) || null)}
                    />
                  </div>
                  {derivedTargets != null ? (
                    <div className={styles.slider}>
                      <span className={styles.sliderLabel}>
                        Targets in swing <span className={styles.value}>{derivedTargets}</span>
                      </span>
                      <span className={styles.hint}>
                        from reach {reach != null ? `${reach} m` : '—'} ÷ spacing
                      </span>
                    </div>
                  ) : (
                    <div className={styles.slider}>
                      <span className={styles.sliderLabel}>
                        Targets in swing{' '}
                        <span className={styles.value}>{combat.targetCount ?? 1}</span>
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={combat.targetCount ?? 1}
                        aria-label="targets in swing"
                        onChange={(e) => setTargetCount(Number(e.target.value))}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </details>
        );
      })}
    </section>
  );
}

interface EntryControlProps {
  entry: StateEntry;
  combat: ReturnType<typeof useBuildStore.getState>['combat'];
  frameStats: ReturnType<typeof useWarframeStats>;
  onToggleCondition: (key: string, on: boolean) => void;
  onSetStacks: (key: string, n: number) => void;
  onToggleBuff: (id: string, on: boolean) => void;
  onSetBuffManual: (id: string, manual: number | null) => void;
}

/** Render one registry entry with the control its `kind` declares. */
function EntryControl({
  entry,
  combat,
  frameStats,
  onToggleCondition,
  onSetStacks,
  onToggleBuff,
  onSetBuffManual,
}: EntryControlProps) {
  if (entry.kind === 'toggle') {
    return (
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={combat.conditions[entry.id] ?? false}
          aria-label={entry.label}
          onChange={(e) => onToggleCondition(entry.id, e.target.checked)}
        />
        {entry.label}
        {entry.description && <span className={styles.hint}>{entry.description}</span>}
      </label>
    );
  }

  if (entry.kind === 'buff') {
    return (
      <BuffControl
        entry={entry}
        combat={combat}
        frameStats={frameStats}
        onToggleBuff={onToggleBuff}
        onSetBuffManual={onSetBuffManual}
      />
    );
  }

  // kind === 'stack'
  return <StackControl entry={entry} combat={combat} onSetStacks={onSetStacks} />;
}

function StackControl({
  entry,
  combat,
  onSetStacks,
}: {
  entry: StackEntry;
  combat: EntryControlProps['combat'];
  onSetStacks: EntryControlProps['onSetStacks'];
}) {
  const value = combat.stacks[entry.id] ?? 0;
  const min = entry.min ?? 0;
  const step = entry.step ?? 1;

  // Combo Count uses a slider (a 12-notch stepper is clumsy); other stacks use a
  // − / value / + stepper with a directly-editable number input (decision 5).
  if (entry.control === 'slider') {
    return (
      <div className={styles.slider}>
        <span className={styles.sliderLabel}>
          {entry.label} <span className={styles.value}>{value}</span>
        </span>
        <input
          type="range"
          min={min}
          max={entry.max}
          step={step}
          value={value}
          aria-label={entry.label}
          onChange={(e) => onSetStacks(entry.id, Number(e.target.value))}
        />
      </div>
    );
  }

  return (
    <div className={styles.slider}>
      <span className={styles.sliderLabel}>{entry.label}</span>
      <div className={styles.stepper}>
        <button
          type="button"
          aria-label={`decrease ${entry.label}`}
          disabled={value <= min}
          onClick={() => onSetStacks(entry.id, Math.max(min, value - step))}
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={entry.max}
          step={step}
          value={value}
          aria-label={`${entry.label} stacks`}
          onChange={(e) =>
            onSetStacks(entry.id, Math.max(min, Math.min(entry.max, Number(e.target.value))))
          }
        />
        <button
          type="button"
          aria-label={`increase ${entry.label}`}
          disabled={value >= entry.max}
          onClick={() => onSetStacks(entry.id, Math.min(entry.max, value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}

function BuffControl({
  entry,
  combat,
  frameStats,
  onToggleBuff,
  onSetBuffManual,
}: {
  entry: BuffEntry;
  combat: EntryControlProps['combat'];
  frameStats: EntryControlProps['frameStats'];
  onToggleBuff: EntryControlProps['onToggleBuff'];
  onSetBuffManual: EntryControlProps['onSetBuffManual'];
}) {
  const active = combat.buffs.find((b) => b.id === entry.id);
  // Magnitude is frame-derived when the equipped frame emits this buff; otherwise
  // the user supplies a manual fallback (a squadmate's Roar / un-modeled Eclipse).
  const frameMagnitude = frameStats?.emittedBuffs[entry.id];
  const fromFrame = frameMagnitude != null;
  const magnitude = frameMagnitude ?? active?.manualMagnitude ?? entry.defaultMagnitude;
  return (
    <div className={styles.buff}>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={!!active}
          aria-label={`${entry.label} active`}
          onChange={(e) => onToggleBuff(entry.id, e.target.checked)}
        />
        {entry.label}
        <span className={styles.value}> +{Math.round(magnitude * 100)}%</span>
      </label>
      {fromFrame ? (
        <span className={styles.hint}>from equipped frame (Ability Strength)</span>
      ) : (
        <div className={styles.slider}>
          <label className={styles.sliderLabel} htmlFor={`buff-manual-${entry.id}`}>
            Manual magnitude <span className={styles.hint}>(no frame source)</span>
          </label>
          <input
            id={`buff-manual-${entry.id}`}
            type="number"
            min={0}
            step={0.05}
            value={active?.manualMagnitude ?? entry.defaultMagnitude}
            disabled={!active}
            aria-label={`${entry.label} manual magnitude`}
            onChange={(e) =>
              onSetBuffManual(entry.id, e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </div>
      )}
    </div>
  );
}
