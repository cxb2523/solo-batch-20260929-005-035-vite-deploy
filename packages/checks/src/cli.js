#!/usr/bin/env node
import { runChecks, RULES } from './runner.js';
import { findRepoRoot } from './repo-root.js';
import { runStaged } from './staged.js';
import { createChecksServer, DEFAULT_PORT } from './server.js';

function printReport(report) {
  console.log(`base: ${report.base}`);
  for (const result of report.results) {
    const tag = result.stale
      ? `${result.ok ? 'OK(stale)' : 'FAIL(stale)'}`
      : result.ok
        ? 'OK '
        : 'FAIL';
    console.log(
      `[${tag}] ${result.id.padEnd(7)} ${String(result.durationMs).padStart(6)}ms  ${result.label}`,
    );
    if (!result.ok && result.output) {
      console.log(
        result.output
          .split('\n')
          .map((line) => `       ${line}`)
          .join('\n'),
      );
    }
    if (result.timedOut && !result.stale) {
      console.log('       子进程超过 30s 被杀，且没有可回退的历史结果。');
    }
  }
  console.log(`total ${report.durationMs}ms${report.stale ? '  (含 stale 回退结果)' : ''}`);
}

const [command, ...rest] = process.argv.slice(2);
const root = findRepoRoot();

if (command === 'run') {
  const report = await runChecks({ cwd: root });
  printReport(report);
  process.exitCode = report.ok ? 0 : 1;
} else if (command === 'staged') {
  try {
    await runStaged(root);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
} else if (command === 'serve') {
  const portArgIndex = rest.indexOf('--port');
  const port = portArgIndex >= 0 ? Number(rest[portArgIndex + 1]) : DEFAULT_PORT;
  const service = createChecksServer({ port, cwd: root });
  const info = await service.start();
  console.log(`checks service listening on http://localhost:${info.port} (base=${info.root})`);
  console.log(`rules: ${RULES.map((rule) => rule.id).join(', ')}`);
} else {
  console.error('usage: repo-checks <run|staged|serve> [--port 8787]');
  process.exitCode = 2;
}
