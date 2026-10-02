// Intersects a file list with ESLint's ignore rules, evaluated at call time
// so .eslintignore / ignorePatterns edits take effect immediately.
import { ESLint } from 'eslint'

export async function filterNotIgnored(files, cwd = process.cwd()) {
  if (files.length === 0) return []
  const eslint = new ESLint({ cwd })
  const flags = await Promise.all(
    files.map((file) => eslint.isPathIgnored(file)),
  )
  return files.filter((_, index) => !flags[index])
}
