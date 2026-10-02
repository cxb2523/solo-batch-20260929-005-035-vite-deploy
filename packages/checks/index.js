import fs from 'node:fs'
import path from 'node:path'
import { rules } from './rules.js'
import { runRule } from './runner.js'

// In-flight runs deduplicated by repo-root absolute path: concurrent callers
// for the same workspace share one Promise, so only one real run happens.
const inflight = new Map()
// Last fully-known result per rule per repo root, used as stale fallback
// when a subprocess is killed after exceeding its timeout.
const lastGood = new Map()

export function findRepoRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir)
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return path.resolve(startDir)
    dir = parent
  }
}

async function executeRules(root) {
  const startedAt = Date.now()
  const good = lastGood.get(root) ?? new Map()

  const results = await Promise.all(
    rules.map(async (rule) => {
      const result = await runRule(rule, root)
      if (result.status === 'timeout') {
        const previous = good.get(rule.id)
        if (previous) {
          // Subprocess killed after timeout: fall back to the previous
          // known result and flag it as stale.
          return { ...previous, stale: true, durationMs: result.durationMs }
        }
        return { ...result, stale: false }
      }
      good.set(rule.id, result)
      return { ...result, stale: false }
    }),
  )

  lastGood.set(root, good)

  return {
    base: root,
    status: results.every((r) => r.status === 'pass') ? 'pass' : 'fail',
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    stale: results.some((r) => r.stale),
    results,
  }
}

export function runChecks(options = {}) {
  const root = findRepoRoot(options.cwd ?? process.cwd())
  const key = path.resolve(root)

  const pending = inflight.get(key)
  if (pending) return pending

  const promise = executeRules(key).finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}
