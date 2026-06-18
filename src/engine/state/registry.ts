/**
 * `STATE_REGISTRY` — the one unified, data-driven combat-state catalog (Stage 5,
 * decision 2). Every combat-state input is **one entry** carrying a `kind`
 * discriminator (`'toggle' | 'stack' | 'buff'`), the UI **control** to render, the
 * collapsible **group** it belongs to, an optional **`visibleWhen`** predicate,
 * and — for `buff` entries — the multiplier bucket it feeds (ADR 0005).
 *
 * The three `CombatState` fields stay the **serializable runtime values**:
 *  - `toggle` ⇒ `combat.conditions[id]`,
 *  - `stack`  ⇒ `combat.stacks[id]`,
 *  - `buff`   ⇒ presence in `combat.buffs` (magnitude frame-derived, manual
 *    fallback).
 *
 * Their **definitions** all live here, so "new buff = a registry entry only"
 * (Goal.md) is literally true: the inline Grineer faction toggle and the Roar
 * buff are now data, and a brand-new independent multiplier (Eclipse) is a bucket
 * declaration (`MULTIPLIER_BUCKETS`) plus a `buff` entry below — no engine code.
 *
 * Stacks discovered dynamically from equipped gear (Primary Merciless, Galvanized
 * Diffusion, Molt Augmented) are not static entries here; they are resolved at
 * runtime into the same `StackEntry` shape (`discoverStackEntries`).
 */

/** UI-collapsible groups, in display order. */
export const STATE_GROUPS = {
  'frame-buffs': { id: 'frame-buffs', label: 'Frame & ability buffs', order: 10 },
  'squad-buffs': { id: 'squad-buffs', label: 'Squad / external buffs', order: 20 },
  'weapon-stacks': { id: 'weapon-stacks', label: 'Weapon & arcane stacks', order: 30 },
  'enemy-conditionals': { id: 'enemy-conditionals', label: 'Enemy & conditionals', order: 40 },
  'melee-state': { id: 'melee-state', label: 'Melee state', order: 50 },
} as const;

export type StateGroup = keyof typeof STATE_GROUPS;

/** Group ids in declared display order. */
export const STATE_GROUP_ORDER: readonly StateGroup[] = (
  Object.values(STATE_GROUPS) as { id: StateGroup; order: number }[]
)
  .sort((a, b) => a.order - b.order)
  .map((g) => g.id);

export type StateKind = 'toggle' | 'stack' | 'buff';
export type StateControl = 'toggle' | 'stepper' | 'slider';

/** Predicate context a `visibleWhen` entry is evaluated against. */
export interface StateVisibilityContext {
  /** The equipped weapon is a melee. */
  isMelee: boolean;
  /** A mod that consumes the "status types on target" count is equipped (Condition Overload). */
  usesStatusCount: boolean;
}

interface StateEntryBase {
  /** Runtime key: `conditions[id]` (toggle) / `stacks[id]` (stack) / buff id (buff). */
  id: string;
  label: string;
  description?: string;
  group: StateGroup;
  control: StateControl;
  /** When set, the entry is shown only if the predicate holds (replaces the
   * inline `usesStatusCount` JSX logic). Absent ⇒ always shown. */
  visibleWhen?: (ctx: StateVisibilityContext) => boolean;
}

/** A boolean conditional toggle (e.g. enemy faction for Bane). */
export interface ToggleEntry extends StateEntryBase {
  kind: 'toggle';
  control: 'toggle';
}

/** A stacking count (combo, status-types, per-stack arcanes). */
export interface StackEntry extends StateEntryBase {
  kind: 'stack';
  control: 'stepper' | 'slider';
  /** Minimum value (default 0). */
  min?: number;
  /** Maximum value (UI clamp). */
  max: number;
  /** Step increment (default 1). */
  step?: number;
}

/** An emitted ability buff (Roar/Eclipse) feeding a multiplier bucket (ADR 0005). */
export interface BuffEntry extends StateEntryBase {
  kind: 'buff';
  control: 'toggle';
  /** Multiplier bucket id this buff's magnitude feeds (`MULTIPLIER_BUCKETS`). */
  multiplier: string;
  /** Authored ability that emits this buff (frame-derived magnitude). */
  abilityId: string;
  /** Manual magnitude (fraction; 0.5 = +50%) used when no equipped frame emits it. */
  defaultMagnitude: number;
}

export type StateEntry = ToggleEntry | StackEntry | BuffEntry;

export const STATE_REGISTRY: Record<string, StateEntry> = {
  // ── Frame & ability buffs (ADR 0005 multiplier buckets) ──
  roar: {
    id: 'roar',
    kind: 'buff',
    control: 'toggle',
    label: 'Roar (Rhino)',
    description:
      'Ability damage buff. Feeds the faction bucket — adds with Bane, then multiplies. Magnitude = 0.5 × Ability Strength.',
    group: 'frame-buffs',
    multiplier: 'faction',
    abilityId: 'roar',
    defaultMagnitude: 0.5,
  },
  eclipse: {
    id: 'eclipse',
    kind: 'buff',
    control: 'toggle',
    label: 'Eclipse (Mirage)',
    description:
      'Solar Eclipse weapon-damage buff. Its OWN independent multiplier (separate from faction/Roar). +100% weapon damage at 100% Ability Strength (no damage-side cap). Source: wiki/Eclipse.',
    group: 'frame-buffs',
    multiplier: 'eclipse',
    abilityId: 'eclipse',
    defaultMagnitude: 1.0,
  },

  // ── Enemy & conditionals ──
  'faction:grineer': {
    id: 'faction:grineer',
    kind: 'toggle',
    control: 'toggle',
    label: 'Enemy faction: Grineer',
    description: 'Activates faction-conditional mods (Bane of Grineer).',
    group: 'enemy-conditionals',
  },

  // ── Melee state ──
  combo: {
    id: 'combo',
    kind: 'stack',
    control: 'slider', // a 12-notch stepper for Combo Count is clumsy (decision 5)
    label: 'Combo Count',
    description: 'Raw melee Combo Count; drives the Heavy-attack Combo Multiplier.',
    group: 'melee-state',
    min: 0,
    max: 220,
    step: 20,
    visibleWhen: (ctx) => ctx.isMelee,
  },
  'status:count': {
    id: 'status:count',
    kind: 'stack',
    control: 'stepper',
    label: 'Status types on target',
    description: 'Unique status types on the target (Condition Overload).',
    group: 'melee-state',
    min: 0,
    max: 16,
    step: 1,
    visibleWhen: (ctx) => ctx.usesStatusCount,
  },
};

/**
 * Deferred buff/state catalog (Stage 5, decision 4) — recorded so it is not
 * forgotten. The reference catalog above intentionally exercises every `kind`
 * and both stacking behaviours (faction-additive Roar+Bane, independent Eclipse,
 * per-stack Galvanized Diffusion into multishot, the Combo Count stack) and then
 * stops; completeness grows as data forever after. Each of these is "add a
 * registry entry" (+ a multiplier-bucket declaration when it's a new independent
 * category) — no engine change (ADR 0005):
 *  - Nourish (Viral damage / Toxin) — Grendel.
 *  - Arcane Avenger (on-hit crit-chance) / Arcane Fury (on-crit melee damage).
 *  - Volt's Electric Shield (passes-through bonus + Electricity).
 *  - The full Galvanized set (Aptitude, Chamber, Hell, Scope, Crosshairs, …).
 *  - Squad arcanes / external squad buffs (Vigorous Swap, Dare, …).
 *  - Eximus/utility states beyond the Target's Overguard toggle (Phase B).
 */
export const DEFERRED_BUFF_CATALOG: readonly string[] = [
  'nourish',
  'arcane-avenger',
  'arcane-fury',
  'volt-electric-shield',
  'galvanized-aptitude',
  'galvanized-chamber',
  'galvanized-hell',
  'galvanized-scope',
  'galvanized-crosshairs',
  'squad-arcanes',
];

/** All registry entries (optionally filtered by a `visibleWhen` context). */
export function listStateEntries(ctx?: StateVisibilityContext): StateEntry[] {
  const all = Object.values(STATE_REGISTRY);
  if (!ctx) return all;
  return all.filter((e) => !e.visibleWhen || e.visibleWhen(ctx));
}
