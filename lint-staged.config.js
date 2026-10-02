import { filterNotIgnored } from 'repo-checks/eslint-ignore'

// Staged files are intersected with ESLint ignore *at commit time*.
// If everything staged is ignored, we return [] and lint-staged runs
// nothing — ignored files never trigger a full re-run of the checks.
export default {
  '*.{js,cjs,mjs,ts,tsx,jsx}': async (files) => {
    const effective = await filterNotIgnored(files)
    if (effective.length === 0) return []
    return ['npm run verify']
  },
}
