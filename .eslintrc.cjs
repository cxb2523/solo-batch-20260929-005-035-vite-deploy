module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, node: true, es2022: true },
  ignorePatterns: ['dist', 'dist-ssr', 'node_modules', 'coverage', 'scratch'],
}
