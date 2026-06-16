/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Path aliases mirror the `paths` map in tsconfig.app.json. Keep the two in sync.
const alias = {
  '@engine': fileURLToPath(new URL('./src/engine/index.ts', import.meta.url)),
  '@engine/': fileURLToPath(new URL('./src/engine/', import.meta.url)),
  '@data': fileURLToPath(new URL('./src/data/index.ts', import.meta.url)),
  '@data/': fileURLToPath(new URL('./src/data/', import.meta.url)),
  '@state': fileURLToPath(new URL('./src/state/index.ts', import.meta.url)),
  '@state/': fileURLToPath(new URL('./src/state/', import.meta.url)),
  '@ui': fileURLToPath(new URL('./src/ui/index.ts', import.meta.url)),
  '@ui/': fileURLToPath(new URL('./src/ui/', import.meta.url)),
  '@share': fileURLToPath(new URL('./src/share/index.ts', import.meta.url)),
  '@share/': fileURLToPath(new URL('./src/share/', import.meta.url)),
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Vite matches longest alias first; the trailing-slash entries handle subpath imports.
    alias: Object.entries(alias).map(([find, replacement]) => ({
      find: find.endsWith('/') ? new RegExp(`^${find}`) : new RegExp(`^${find}$`),
      replacement,
    })),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/engine/**', 'src/data/**', 'src/state/**', 'src/share/**'],
    },
  },
});
