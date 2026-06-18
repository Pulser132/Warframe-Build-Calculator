import { describe, it, expect } from 'vitest';
import {
  STATE_REGISTRY,
  STATE_GROUP_ORDER,
  listStateEntries,
  discoverStackEntries,
} from './index';
import { listBuffs, getBuffDef, buffEffects } from '../buffs';

/**
 * The unified `STATE_REGISTRY` (Stage 5, decision 2): every combat-state input is
 * one declarative entry with a `kind` discriminator. Toggles map to
 * `conditions[]`, stacks to `stacks[]`, buffs to a multiplier bucket (ADR 0005).
 */
describe('STATE_REGISTRY — unified, data-driven combat-state catalog', () => {
  it('declares the Grineer faction toggle as data (no longer inline JSX)', () => {
    const grineer = STATE_REGISTRY['faction:grineer'];
    expect(grineer.kind).toBe('toggle');
    expect(grineer.control).toBe('toggle');
    expect(grineer.group).toBe('enemy-conditionals');
  });

  it('declares Combo Count + status-types as stacks with their own controls', () => {
    expect(STATE_REGISTRY['combo']).toMatchObject({
      kind: 'stack',
      control: 'slider', // a 12-notch stepper would be clumsy
      group: 'melee-state',
      max: 220,
    });
    expect(STATE_REGISTRY['status:count']).toMatchObject({
      kind: 'stack',
      control: 'stepper',
      group: 'melee-state',
      max: 16,
    });
  });

  it('every group id used by an entry is in the declared display order', () => {
    for (const entry of Object.values(STATE_REGISTRY)) {
      expect(STATE_GROUP_ORDER).toContain(entry.group);
    }
  });
});

describe('visibleWhen — declared predicates replace inline visibility logic', () => {
  it('hides Combo Count off-melee and status-types unless a consumer is equipped', () => {
    const gun = listStateEntries({ isMelee: false, usesStatusCount: false });
    expect(gun.map((e) => e.id)).not.toContain('combo');
    expect(gun.map((e) => e.id)).not.toContain('status:count');

    const melee = listStateEntries({ isMelee: true, usesStatusCount: true });
    expect(melee.map((e) => e.id)).toContain('combo');
    expect(melee.map((e) => e.id)).toContain('status:count');
  });

  it('always shows entries without a predicate (the Grineer toggle, the buffs)', () => {
    const ids = listStateEntries({ isMelee: false, usesStatusCount: false }).map((e) => e.id);
    expect(ids).toContain('faction:grineer');
    expect(ids).toContain('roar');
    expect(ids).toContain('eclipse');
  });
});

describe('buff entries — generalized BUFF_REGISTRY (ADR 0005 multiplier buckets)', () => {
  it('Roar feeds the faction bucket (adds with Bane); Eclipse its own eclipse bucket', () => {
    expect(getBuffDef('roar')).toMatchObject({ kind: 'buff', multiplier: 'faction' });
    expect(getBuffDef('eclipse')).toMatchObject({ kind: 'buff', multiplier: 'eclipse' });
  });

  it('listBuffs returns only the buff-kind entries', () => {
    const ids = listBuffs().map((b) => b.id).sort();
    expect(ids).toEqual(['eclipse', 'roar']);
  });

  it('buffEffects targets the buff’s declared multiplier bucket', () => {
    const roar = getBuffDef('roar')!;
    expect(buffEffects(roar, 0.5)).toEqual([{ multiplier: 'faction', value: 0.5 }]);
  });
});

describe('discoverStackEntries — equipped per-stack gear surfaces as stacks', () => {
  it('finds a weapon arcane’s per-stack condition key + maxStacks', () => {
    const entries = discoverStackEntries([
      {
        id: 'primary-merciless',
        label: 'Primary Merciless',
        effects: [
          { multiplier: 'directDamage', value: 0.3, perStack: true, maxStacks: 12, condition: 'arcane:primary-merciless' },
        ],
      },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'arcane:primary-merciless',
      kind: 'stack',
      group: 'weapon-stacks',
      max: 12,
    });
  });

  it('finds Galvanized Diffusion’s on-kill multishot stack (perStack into multishot)', () => {
    const entries = discoverStackEntries([
      {
        id: 'galvanized-diffusion',
        label: 'Galvanized Diffusion',
        effects: [
          { bucket: 'multishot', value: 1.1 },
          { bucket: 'multishot', value: 0.3, perStack: true, maxStacks: 4, condition: 'mod:galvanized-diffusion' },
        ],
      },
    ]);
    expect(entries[0]).toMatchObject({ id: 'mod:galvanized-diffusion', max: 4 });
  });

  it('finds a frame arcane’s per-stack frameEffect (Molt Augmented)', () => {
    const entries = discoverStackEntries([
      {
        id: 'molt-augmented',
        label: 'Molt Augmented',
        frameEffects: [
          { stat: 'abilityStrength', value: 0.0024, perStack: true, maxStacks: 250, condition: 'arcane:molt-augmented' },
        ],
      },
    ]);
    expect(entries[0]).toMatchObject({ id: 'arcane:molt-augmented', max: 250 });
  });

  it('de-dupes repeated condition keys', () => {
    const src = {
      id: 'x',
      label: 'X',
      effects: [{ bucket: 'multishot' as const, value: 0.3, perStack: true, maxStacks: 4, condition: 'k' }],
    };
    expect(discoverStackEntries([src, src])).toHaveLength(1);
  });
});
