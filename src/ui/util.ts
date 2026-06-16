/** Small presentational helpers shared across UI components. */
import type { DamageType, Polarity } from '@engine/model/types';

const POLARITY_GLYPH: Record<Polarity, string> = {
  madurai: 'V',
  vazarin: 'D',
  naramon: '—',
  zenurik: '=',
  unairu: 'r',
  penjaga: 'O',
  umbra: 'U',
  none: '·',
};

export function polarityGlyph(p: Polarity): string {
  return POLARITY_GLYPH[p] ?? '·';
}

export function polarityColorVar(p: Polarity): string {
  return `var(--pol-${p})`;
}

/** Compact number formatting for damage/DPS readouts. */
export function fmt(n: number, digits = 0): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Title-case a damage type for display. */
export function damageLabel(type: DamageType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Strip `@wfcd` color/markup tags (e.g. `<DT_POISON_COLOR>`) and newlines. */
export function cleanStat(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}
