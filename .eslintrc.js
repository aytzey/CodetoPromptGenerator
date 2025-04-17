/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: ['next', 'next/core-web-vitals'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
      // 👉 Add or tweak project‑specific rules here.
      // Examples:
      // '@typescript-eslint/explicit-function-return-type': 'warn',
      // 'react/no-unescaped-entities': 'off',
    },
    ignorePatterns: ['python_backend/**', 'node_modules/**'],
  };
  