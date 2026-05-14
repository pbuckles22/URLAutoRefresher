import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * CI lint gate: catches unused code, console noise, and structural debt.
 * Stricter caps apply to `src/lib` (pure logic). UI/scheduler hotspots are
 * tracked for follow-up refactors (see `.cursor/skills/code-quality-gate/SKILL.md`).
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'dashboard/*.js',
      'sidepanel/*.js',
      'e2e/fixture-server.mjs',
      'Scripts/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.test.ts', 'e2e/**/*.ts', 'vitest.config.ts', 'playwright.config.ts'],
    rules: {
      'max-lines-per-function': 'off',
      complexity: 'off',
    },
  },
  {
    files: ['src/dashboard/**/*.ts', 'src/background/scheduler.ts'],
    rules: {
      'max-lines-per-function': 'off',
      complexity: ['error', 50],
    },
  },
  {
    files: ['src/lib/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'max-lines-per-function': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 52],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: [
      '**/*.test.ts',
      'src/lib/**/*.ts',
      'src/dashboard/**/*.ts',
      'src/background/scheduler.ts',
    ],
    rules: {
      'max-lines-per-function': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 35],
    },
  },
  eslintConfigPrettier
);
