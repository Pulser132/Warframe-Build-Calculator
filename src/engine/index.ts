/**
 * Engine public API.
 *
 * Framework-agnostic, pure TypeScript: never imports React, the Zustand store,
 * the UI layer, or the DOM (enforced by the engine-purity ESLint guard).
 *
 * The pipeline (`calculateBuild`) and attribution land in Phases 4–5.
 */
export * from './model';
export * from './gear';
export * from './pipeline';
export * from './attribution';
export * from './buffs';
export * from './warframe';
