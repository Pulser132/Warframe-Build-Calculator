import { useMemo } from 'react';
import { listBuffs } from '@engine';
import { useBuildStore, useWarframeStats } from '@state';
import styles from './ConfigMenu.module.css';

/**
 * Minimal combat-state config — the seed of the Stage 5 menu. Drives:
 *  - conditional toggles (e.g. enemy faction for Bane),
 *  - stackable sources discovered from equipped arcanes (e.g. Primary Merciless),
 *  - external buffs from the **data-driven registry** (e.g. Roar).
 *
 * Adding a buff is just a `BUFF_REGISTRY` entry — this UI renders it with no
 * further changes (Goal.md: "Make sure this is easily expandable").
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
  const frameStats = useWarframeStats();

  const weaponSlots = build.weapon.slots;
  const frameBuild = build.warframe;
  const weapon = dataset?.weapons.find((w) => w.id === build.weapon.itemId);
  const isMelee = weapon?.category === 'Melee';

  // The "status types on target" input only feeds Condition Overload — show it
  // only when a mod that consumes it is equipped.
  const usesStatusCount = weaponSlots.some((slot) => {
    if (!slot.itemId) return false;
    return dataset?.mods.find((m) => m.id === slot.itemId)?.customEffectId === 'condition-overload';
  });

  // Discover stackable sources from equipped arcanes — weapon arcanes (per-stack
  // damage `effects`, e.g. Primary Merciless) and frame arcanes (per-stack
  // `frameEffects`, e.g. Molt Augmented). Both surface as a stack slider.
  const stackSources = useMemo(() => {
    if (!dataset) return [];
    const out: { key: string; label: string; max: number }[] = [];
    for (const slot of weaponSlots) {
      if (slot.kind !== 'arcane' || !slot.itemId) continue;
      const arcane = dataset.arcanes.find((a) => a.id === slot.itemId);
      const eff = arcane?.effects.find((e) => e.perStack && e.condition);
      if (arcane && eff?.condition) {
        out.push({ key: eff.condition, label: arcane.name, max: eff.maxStacks ?? 1 });
      }
    }
    for (const slot of frameBuild?.slots ?? []) {
      if (slot.kind !== 'arcane' || !slot.itemId) continue;
      const arcane = dataset.arcanes.find((a) => a.id === slot.itemId);
      const eff = arcane?.frameEffects?.find((e) => e.perStack && e.condition);
      if (arcane && eff?.condition) {
        out.push({ key: eff.condition, label: arcane.name, max: eff.maxStacks ?? 1 });
      }
    }
    return out;
  }, [dataset, weaponSlots, frameBuild]);

  const buffs = listBuffs();

  return (
    <section className={styles.panel} aria-label="combat configuration">
      <h3 className={styles.heading}>Combat State</h3>

      {isMelee && (
        <div className={styles.group}>
          <span className={styles.groupLabel}>
            Melee state <span className={styles.hint}>(Stage-5 seam)</span>
          </span>
          <div className={styles.slider}>
            <span className={styles.sliderLabel}>
              Combo Count <span className={styles.value}>{combat.stacks['combo'] ?? 0}</span>
            </span>
            <input
              type="range"
              min={0}
              max={220}
              step={20}
              value={combat.stacks['combo'] ?? 0}
              aria-label="combo count"
              onChange={(e) => setStacks('combo', Number(e.target.value))}
            />
          </div>
          {usesStatusCount && (
            <div className={styles.slider}>
              <span className={styles.sliderLabel}>
                Status types on target{' '}
                <span className={styles.value}>{combat.stacks['status:count'] ?? 0}</span>
                <span className={styles.hint}> (Condition Overload)</span>
              </span>
              <input
                type="range"
                min={0}
                max={16}
                step={1}
                value={combat.stacks['status:count'] ?? 0}
                aria-label="status types on target"
                onChange={(e) => setStacks('status:count', Number(e.target.value))}
              />
            </div>
          )}
          <div className={styles.slider}>
            <span className={styles.sliderLabel}>
              Targets in swing <span className={styles.value}>{combat.targetCount ?? 1}</span>
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
        </div>
      )}

      <div className={styles.group}>
        <span className={styles.groupLabel}>Conditionals</span>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={combat.conditions['faction:grineer'] ?? false}
            onChange={(e) => toggleCondition('faction:grineer', e.target.checked)}
          />
          Enemy faction: Grineer <span className={styles.hint}>(activates Bane)</span>
        </label>
      </div>

      {stackSources.length > 0 && (
        <div className={styles.group}>
          <span className={styles.groupLabel}>Stacks</span>
          {stackSources.map((s) => {
            const value = combat.stacks[s.key] ?? 0;
            return (
              <div key={s.key} className={styles.slider}>
                <span className={styles.sliderLabel}>
                  {s.label} <span className={styles.value}>×{value}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={s.max}
                  step={1}
                  value={value}
                  aria-label={`${s.label} stacks`}
                  onChange={(e) => setStacks(s.key, Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.group}>
        <span className={styles.groupLabel}>
          Ability buffs <span className={styles.hint}>(frame-derived)</span>
        </span>
        {buffs.map((def) => {
          const active = combat.buffs.find((b) => b.id === def.id);
          // Magnitude is derived from the equipped frame when it emits this buff;
          // otherwise the user supplies a manual fallback (squadmate's Roar).
          const frameMagnitude = frameStats?.emittedBuffs[def.id];
          const fromFrame = frameMagnitude != null;
          const magnitude = frameMagnitude ?? active?.manualMagnitude ?? def.defaultMagnitude;
          return (
            <div key={def.id} className={styles.buff}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={!!active}
                  aria-label={`${def.label} active`}
                  onChange={(e) => toggleBuff(def.id, e.target.checked)}
                />
                {def.label}
                <span className={styles.value}> +{Math.round(magnitude * 100)}%</span>
              </label>
              {fromFrame ? (
                <span className={styles.hint}>from equipped frame (Ability Strength)</span>
              ) : (
                <div className={styles.slider}>
                  <label className={styles.sliderLabel} htmlFor={`buff-manual-${def.id}`}>
                    Manual magnitude <span className={styles.hint}>(no frame source)</span>
                  </label>
                  <input
                    id={`buff-manual-${def.id}`}
                    type="number"
                    min={0}
                    step={0.05}
                    value={active?.manualMagnitude ?? def.defaultMagnitude}
                    disabled={!active}
                    aria-label={`${def.label} manual magnitude`}
                    onChange={(e) =>
                      setBuffManual(def.id, e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
