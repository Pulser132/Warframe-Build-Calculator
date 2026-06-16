import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'src/data/generated', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Engine purity guard: nothing in src/engine/ may import React, the store, the
  // UI layer, or the DOM. The engine must remain framework-agnostic pure TS.
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'engine must stay framework-agnostic (no React).' },
            { name: 'react-dom', message: 'engine must stay framework-agnostic (no React).' },
            { name: 'zustand', message: 'engine must not depend on the state store.' },
          ],
          patterns: [
            { group: ['@state', '@state/*'], message: 'engine must not import the store.' },
            { group: ['@ui', '@ui/*'], message: 'engine must not import UI.' },
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'engine must stay framework-agnostic (no React).' },
          ],
        },
      ],
    },
  },
  // Node scripts and config files run in Node, not the browser.
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
