import type { WarframeStats } from '@engine';
import { fmt, pct } from '../util';
import styles from './DamageSummary.module.css';

interface Props {
  frameName: string;
  stats: WarframeStats;
}

/**
 * Warframe panel (Stage 4) — the frame analogue of the damage summary: the four
 * ability attributes, the generic EHP breakdown (armor DR%, health-EHP, shield,
 * total), and each ability's emitted/strength-scaled output (e.g. Roar's bonus).
 */
export function FramePanel({ frameName, stats }: Props) {
  const { ehp } = stats;
  const roar = stats.emittedBuffs['roar'];

  return (
    <section className={styles.panel} aria-label="warframe summary">
      <h3 className={styles.heading}>Warframe — {frameName}</h3>

      <div className={styles.grid} aria-label="ability attributes">
        <Stat label="Ability Strength" value={pct(stats.abilityStrength)} accent />
        <Stat label="Ability Duration" value={pct(stats.abilityDuration)} />
        <Stat label="Ability Range" value={pct(stats.abilityRange)} />
        <Stat label="Ability Efficiency" value={pct(stats.abilityEfficiency)} />
      </div>

      <div className={styles.mech} aria-label="effective health">
        <div className={styles.mechTitle}>Effective Health (generic)</div>
        <div className={styles.grid}>
          <Stat label="Health" value={fmt(stats.health, 0)} />
          <Stat label="Shield" value={fmt(stats.shield, 0)} />
          <Stat label="Armor" value={fmt(stats.armor, 0)} />
          <Stat label="Armor DR" value={pct(ehp.armorDamageReduction)} />
          <Stat label="Health EHP" value={fmt(ehp.healthEhp, 0)} />
          <Stat label="Total EHP" value={fmt(ehp.total, 0)} accent />
        </div>
        <p className={styles.mechNote}>
          Armor gives health a {pct(ehp.armorDamageReduction)} damage reduction (armor/(armor+300)).
          Generic — no incoming damage type (Stage 5).
        </p>
      </div>

      {roar != null && (
        <div className={styles.mech} aria-label="emitted buff">
          <div className={styles.mechTitle}>Emitted Buff — Roar</div>
          <div className={styles.grid}>
            <Stat label="Damage bonus" value={`+${pct(roar)}`} accent />
          </div>
          <p className={styles.mechNote}>
            0.5 × Ability Strength · shares the faction bucket (adds with Bane). Toggle it on in
            Combat State to apply it to the weapon.
          </p>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${accent ? styles.accent : ''}`}>{value}</span>
    </div>
  );
}
