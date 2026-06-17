import type { SlotState } from '@engine/model/build';
import type { Polarity } from '@engine/model/types';
import { PolarityBadge } from './PolarityBadge';
import { RankSelector } from './RankSelector';
import { polarityColorVar } from '../util';
import styles from './ModSlot.module.css';

const KIND_LABEL: Record<SlotState['kind'], string> = {
  aura: 'Aura',
  stance: 'Stance',
  exilus: 'Exilus',
  normal: 'Mod',
  arcane: 'Arcane',
};

/** Polarities a user can cycle a slot through via "forma". */
const FORMA_POLARITIES: Polarity[] = ['none', 'madurai', 'vazarin', 'naramon', 'zenurik'];

interface Props {
  slot: SlotState;
  index: number;
  /** Display name of the equipped item (mod or arcane), if any. */
  itemName?: string;
  maxRank?: number;
  /** Capacity cost of the equipped mod (negative = grants). */
  cost?: number;
  onPick: (index: number) => void;
  onClear: (index: number) => void;
  onRank: (index: number, rank: number) => void;
  onForma: (index: number, polarity: Polarity) => void;
}

export function ModSlot({ slot, index, itemName, maxRank = 0, cost, onPick, onClear, onRank, onForma }: Props) {
  const filled = !!slot.itemId;

  const cyclePolarity = (e: React.MouseEvent) => {
    e.stopPropagation();
    const i = FORMA_POLARITIES.indexOf(slot.polarity);
    const next = FORMA_POLARITIES[(i + 1) % FORMA_POLARITIES.length];
    onForma(index, next);
  };

  return (
    <div
      className={`${styles.slot} ${filled ? styles.filled : ''} ${styles[slot.kind]}`}
      style={{ borderColor: slot.polarity !== 'none' ? polarityColorVar(slot.polarity) : undefined }}
      role="button"
      tabIndex={0}
      aria-label={
        filled ? `${KIND_LABEL[slot.kind]} slot: ${itemName}` : `empty ${KIND_LABEL[slot.kind]} slot`
      }
      onClick={() => onPick(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(index);
        }
      }}
    >
      <div className={styles.header}>
        <span className={styles.kind}>{KIND_LABEL[slot.kind]}</span>
        <button
          type="button"
          className={styles.forma}
          title="Polarize slot (forma)"
          aria-label="polarize slot"
          onClick={cyclePolarity}
        >
          <PolarityBadge polarity={slot.polarity} size="sm" />
        </button>
      </div>

      {filled ? (
        <>
          <div className={styles.name} title={itemName}>
            {itemName}
          </div>
          <div className={styles.footer}>
            {slot.kind !== 'arcane' && typeof cost === 'number' && (
              <span className={styles.cost} title="capacity cost">
                {cost < 0 ? `+${-cost}` : cost}
              </span>
            )}
            <RankSelector rank={slot.rank} maxRank={maxRank} onChange={(r) => onRank(index, r)} />
            <button
              type="button"
              className={styles.clear}
              aria-label="remove mod"
              title="remove"
              onClick={(e) => {
                e.stopPropagation();
                onClear(index);
              }}
            >
              ✕
            </button>
          </div>
        </>
      ) : (
        <div className={styles.empty}>＋</div>
      )}
    </div>
  );
}
