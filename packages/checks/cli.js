#!/usr/bin/env node
import { runChecks } from './index.js'

const report = await runChecks()

for (const result of report.results) {
  const mark = result.status === 'pass' ? 'PASS' : result.status.toUpperCase()
  const stale = result.stale ? ' (stale fallback)' : ''
  console.log(`[${mark}] ${result.id} - ${result.durationMs}ms${stale}`)
  if (result.status !== 'pass' && result.output) {
    console.log(result.output)
  }
}
console.log(
  `\nbase: ${report.base}\noverall: ${report.status} in ${report.durationMs}ms`,
)

process.exit(report.status === 'pass' ? 0 : 1)
