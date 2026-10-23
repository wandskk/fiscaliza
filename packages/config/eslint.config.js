import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

const FORBIDDEN_LAYER_IMPORTS = [
  { layer: 'domain', cannotImport: ['application', 'infrastructure', 'presentation'] },
  { layer: 'application', cannotImport: ['infrastructure', 'presentation'] },
  { layer: 'infrastructure', cannotImport: ['presentation'] },
];

const dependencyRuleZones = FORBIDDEN_LAYER_IMPORTS.flatMap(({ layer, cannotImport }) =>
  cannotImport.map((source) => ({
    target: `./**/${layer}/**`,
    from: `./**/${source}/**`,
    message: `Dependency rule (PROJETO.md 9.1): ${layer} must not import from ${source}.`,
  })),
);

export default defineConfig(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': { typescript: true, node: true },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'import/no-restricted-paths': ['error', { zones: dependencyRuleZones }],
    },
  },
  {
    files: ['**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', '@prisma/*', '@aws-sdk/*'],
              message: 'The domain knows no framework, database or AWS (PROJETO.md 9.1).',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
