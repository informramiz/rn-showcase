const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier/flat');
const tseslint = require('typescript-eslint');

module.exports = [
  ...expoConfig,
  ...tseslint.configs.strictTypeChecked.map((c) => ({ ...c, files: ['**/*.{ts,tsx}'] })),
  ...tseslint.configs.stylisticTypeChecked.map((c) => ({ ...c, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: process.cwd() } },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Numbers in template literals are safe and idiomatic; other types stay banned.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Concise arrow callbacks such as `() => setX(1)` are idiomatic in React handlers.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    },
  },
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
  prettier,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*', 'coverage/*'] },
];
