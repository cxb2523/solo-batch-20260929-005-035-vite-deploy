module.exports = {
  root: true,
  env: {
    es2022: true,
    browser: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist/', 'node_modules/', '*.svg', 'package-lock.json'],
  overrides: [
    {
      files: ['*.cjs', '.eslintrc.cjs'],
      parserOptions: { sourceType: 'script' },
      env: { node: true, commonjs: true },
    },
    {
      files: ['packages/**/*.js'],
      env: { node: true },
    },
  ],
  rules: {},
};
