/**
 * Data public API. Curated, normalized game data + lazy loaders.
 *
 * Stats are generated from `@wfcd/items` by `scripts/build-data.mjs` into
 * `generated/`; effect descriptors + slot kinds are authored in `mods/`. The
 * loaders merge the two into fully-typed domain objects.
 */
export * from './loaders';
export { MOD_DESCRIPTORS, ARCANE_DESCRIPTORS } from './mods/descriptors';
export type { AuthoredMod } from './mods/descriptors';
