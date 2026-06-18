/**
 * Dynamic stack discovery (Stage 5). Some stacking inputs aren't fixed catalog
 * entries — they're discovered from **equipped gear**: a weapon arcane/mod or a
 * frame arcane that carries a `perStack`, condition-keyed effect (Primary
 * Merciless, Galvanized Diffusion, Molt Augmented). Each surfaces as a stepper in
 * the 'weapon-stacks' group, using the effect's `condition` as the runtime
 * `stacks[]` key and `maxStacks` as the clamp.
 *
 * This keeps decision 2's "the registry can also declare standalone stacks" while
 * still rendering equipped per-stack sources through the same `StackEntry` shape.
 */
import type { EffectDescriptor, FrameEffect } from '../model/types';
import type { StackEntry } from './registry';

export interface StackSourceInput {
  id: string;
  label: string;
  /** Weapon-damage per-stack effects (arcanes/mods: Primary Merciless, Galvanized Diffusion). */
  effects?: readonly EffectDescriptor[];
  /** Frame per-stack effects (frame arcanes: Molt Augmented). */
  frameEffects?: readonly FrameEffect[];
}

export function discoverStackEntries(sources: readonly StackSourceInput[]): StackEntry[] {
  const out: StackEntry[] = [];
  const seen = new Set<string>();
  for (const s of sources) {
    const eff =
      s.effects?.find((e) => e.perStack && e.condition) ??
      s.frameEffects?.find((e) => e.perStack && e.condition);
    if (!eff?.condition || seen.has(eff.condition)) continue;
    seen.add(eff.condition);
    out.push({
      id: eff.condition,
      kind: 'stack',
      control: 'stepper',
      label: s.label,
      group: 'weapon-stacks',
      min: 0,
      max: eff.maxStacks ?? 1,
      step: 1,
    });
  }
  return out;
}
