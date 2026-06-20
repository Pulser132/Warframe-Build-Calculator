import type { Faction, TargetState } from '@engine/target/types';
import { useBuildStore, useEnemies } from '@state';
import { pct } from '../util';
import styles from './TargetControls.module.css';

/** Featured presets covering every routing path (decision 15). */
const FEATURED: { label: string; note: string; preset: Partial<TargetState> & { enemyId: string } }[] = [
  { label: 'Charger', note: 'health', preset: { enemyId: 'charger' } },
  { label: 'Lancer', note: 'armored', preset: { enemyId: 'lancer' } },
  { label: 'Crewman', note: 'shield', preset: { enemyId: 'crewman' } },
  { label: 'Carrier', note: 'shield + armor', preset: { enemyId: 'carrier' } },
  { label: 'Eximus Lancer', note: 'overguard', preset: { enemyId: 'lancer', overguard: true } },
];

const FACTIONS: Faction[] = ['Grineer', 'Corpus', 'Infested', 'Orokin', 'Sentient', 'Other'];

/**
 * The **Target** sidebar panel — all Target configuration, always visible
 * (vs-Target view, decision 3). Featured presets → editable overrides (enemy,
 * level, armor strip, faction, Steel Path, Overguard) → a custom stat block.
 * Store-only: it drives the Target state and reads no result, so it is
 * independent of the results-header "vs Target" toggle. The effective readout it
 * configures renders in the main column (`DamageSummary` + `TargetExtras`).
 */
export function TargetControls() {
  const enemies = useEnemies();
  const target = useBuildStore((s) => s.target);
  const selectEnemy = useBuildStore((s) => s.selectEnemy);
  const setTargetLevel = useBuildStore((s) => s.setTargetLevel);
  const setSteelPath = useBuildStore((s) => s.setSteelPath);
  const setArmorStrip = useBuildStore((s) => s.setArmorStrip);
  const setFactionOverride = useBuildStore((s) => s.setFactionOverride);
  const toggleOverguard = useBuildStore((s) => s.toggleOverguard);
  const setCustomTarget = useBuildStore((s) => s.setCustomTarget);
  const applyTargetPreset = useBuildStore((s) => s.applyTargetPreset);

  const isCustom = target.enemyId === 'custom';

  return (
    <section className={styles.panel} aria-label="target">
      <h3 className={styles.heading}>Target</h3>

      <div className={styles.presets}>
        {FEATURED.map((f) => {
          const active =
            target.enemyId === f.preset.enemyId && !!target.overguard === !!f.preset.overguard;
          return (
            <button
              key={f.label}
              type="button"
              className={`${styles.preset} ${active ? styles.active : ''}`}
              aria-pressed={active}
              onClick={() => applyTargetPreset(f.preset)}
            >
              {f.label}
              <span className={styles.presetNote}>{f.note}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.controls}>
        <label className={styles.control}>
          Enemy
          <select
            aria-label="enemy"
            value={target.enemyId}
            onChange={(e) => selectEnemy(e.target.value)}
          >
            <option value="custom">— Custom —</option>
            {enemies.map((en) => (
              <option key={en.id} value={en.id}>
                {en.name} ({en.faction})
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          Level
          <input
            type="number"
            min={1}
            max={9999}
            value={target.level}
            aria-label="target level"
            onChange={(e) => setTargetLevel(Number(e.target.value))}
          />
        </label>

        <label className={styles.control}>
          Armor strip <span>{pct(target.armorStripPct, 0)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={target.armorStripPct}
            aria-label="armor strip"
            onChange={(e) => setArmorStrip(Number(e.target.value))}
          />
        </label>

        <label className={styles.control}>
          Faction
          <select
            aria-label="faction override"
            value={target.factionOverride ?? ''}
            onChange={(e) => setFactionOverride(e.target.value || null)}
          >
            <option value="">(enemy default)</option>
            {FACTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={target.steelPath}
            aria-label="steel path"
            onChange={(e) => setSteelPath(e.target.checked)}
          />
          Steel Path
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={target.overguard}
            aria-label="overguard"
            onChange={(e) => toggleOverguard(e.target.checked)}
          />
          Eximus / Overguard
        </label>
      </div>

      {isCustom && (
        <div className={styles.controls} aria-label="custom stats">
          {(['health', 'shield', 'armor'] as const).map((stat) => (
            <label key={stat} className={styles.control}>
              {stat[0].toUpperCase() + stat.slice(1)}
              <input
                type="number"
                min={0}
                value={target.custom?.[stat] ?? 0}
                aria-label={`custom ${stat}`}
                onChange={(e) => setCustomTarget({ [stat]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
