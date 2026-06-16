import { useMemo } from 'react';
import { listBuffs } from '@engine';
import { useBuildStore } from '@state';
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
  const setBuff = useBuildStore((s) => s.setBuff);

  // Discover stackable sources from equipped arcanes.
  const stackSources = useMemo(() => {
    if (!dataset) return [];
    const out: { key: string; label: string; max: number }[] = [];
    for (const slot of build.slots) {
      if (slot.kind !== 'arcane' || !slot.itemId) continue;
      const arcane = dataset.arcanes.find((a) => a.id === slot.itemId);
      const eff = arcane?.effects.find((e) => e.perStack && e.condition);
      if (arcane && eff?.condition) {
        out.push({ key: eff.condition, label: arcane.name, max: eff.maxStacks ?? 1 });
      }
    }
    return out;
  }, [dataset, build.slots]);

  const buffs = listBuffs();

  return (
    <section className={styles.panel} aria-label="combat configuration">
      <h3 className={styles.heading}>Combat State</h3>

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
        <span className={styles.groupLabel}>External buffs</span>
        {buffs.map((def) => {
          const active = combat.buffs.find((b) => b.id === def.id);
          const strength = active?.strength ?? def.defaultStrength;
          return (
            <div key={def.id} className={styles.buff}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={!!active}
                  onChange={(e) => setBuff(def.id, e.target.checked ? strength : null)}
                />
                {def.label}
              </label>
              <div className={styles.slider}>
                <input
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={strength}
                  disabled={!active}
                  aria-label={`${def.label} strength`}
                  onChange={(e) => setBuff(def.id, Number(e.target.value))}
                />
                <span className={styles.value}>+{Math.round(strength * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
