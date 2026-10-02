// Rules are pure data. To add a check, append an entry here — no caller
// (CLI, HTTP server, pre-commit hook, CI) needs to change.
export const DEFAULT_TIMEOUT_MS = 30_000

export const rules = [
  {
    id: 'typecheck',
    title: 'TypeScript typecheck',
    command: 'npx tsc --noEmit',
    timeoutMs: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'lint',
    title: 'ESLint',
    command: 'npx eslint . --ext .js,.cjs,.ts,.tsx --max-warnings=0',
    timeoutMs: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'format',
    title: 'Prettier check (read-only)',
    command: 'npx prettier --check .',
    timeoutMs: DEFAULT_TIMEOUT_MS,
  },
]
