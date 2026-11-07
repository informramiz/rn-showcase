const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier/flat');

module.exports = [
  ...expoConfig,
  prettier,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*', 'coverage/*'] },
];
