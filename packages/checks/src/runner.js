import { spawn } from 'node:child_process';
import { RULES } from './rules.js';
import { resolveBin } from './resolve-bin.js';

const isWindows = process.platform === 'win32';
const OUTPUT_LIMIT = 4_000;

function clip(text) {
  if (text.length <= OUTPUT_LIMIT) return text;
  return text.slice(text.length - OUTPUT_LIMIT);
}

/**
 * 跨平台执行一条规则，不经过 shell（参数数组直传）。
 * Windows 下 npm 提升后的 bin 是 .CMD，需要 shell 引导，
 * 但参数仍由 Node 逐项拼接，路径统一加双引号防空格。
 */
function execRule(rule, cwd, extraArgs = []) {
  const args = [...(rule.args ?? []), ...extraArgs];
  const command = resolveBin(rule.bin);
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let spawnFailed = false;

    const useShell = isWindows && /\.(cmd|bat)$/i.test(command);
    const child = spawn(command, args.map(quote), {
      cwd,
      shell: useShell,
      windowsVerbatimArguments: false,
      env: process.env,
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 2_000).unref();
    }, rule.timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      spawnFailed = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        timedOut: false,
        spawnFailed: true,
        code: null,
        output: clip(`spawn failed: ${error.message}`),
      });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (spawnFailed) return;
      resolve({
        ok: code === 0,
        timedOut,
        code,
        output: clip([stdout, stderr].filter(Boolean).join('\n').trim()),
      });
    });
  });
}

function quote(value) {
  if (!isWindows) return value;
  return /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

/**
 * 执行单条规则；超时时回退到该规则上一次的成功/失败快照，
 * 并在结果上打 stale 标记。
 */
async function runRule(rule, cwd, extraArgs, previousResult) {
  const startedAt = Date.now();
  const attempt = await execRule(rule, cwd, extraArgs);
  const durationMs = Date.now() - startedAt;

  if (attempt.timedOut && previousResult) {
    return {
      id: rule.id,
      label: rule.label,
      ok: previousResult.ok,
      code: previousResult.code ?? null,
      durationMs,
      timedOut: true,
      stale: true,
      output: previousResult.output ?? '',
      fallbackFrom: previousResult.checkedAt ?? null,
      checkedAt: new Date(startedAt).toISOString(),
    };
  }

  return {
    id: rule.id,
    label: rule.label,
    ok: attempt.ok,
    code: attempt.code ?? null,
    durationMs,
    timedOut: attempt.timedOut,
    stale: false,
    output: attempt.output,
    checkedAt: new Date(startedAt).toISOString(),
  };
}

/**
 * 唯一真实入口：依次跑完全部数据描述的规则。
 * 新增规则只改 rules.js，调用方（CLI / HTTP / 钩子 / CI）零改动。
 *
 * @param {object} options
 * @param {string} options.cwd          仓库根绝对路径
 * @param {Map<string, any>} [options.previous] 各规则上一次结果（按 id）
 * @param {Array<{id: string, extraArgs?: string[]}>} [options.selection]
 */
export async function runChecks({ cwd, previous, selection } = {}) {
  const startedAt = Date.now();
  const selectedIds = selection?.map((item) => item.id);
  const rules = selectedIds ? RULES.filter((rule) => selectedIds.includes(rule.id)) : RULES;

  const results = [];
  for (const rule of rules) {
    const extraArgs = selection?.find((item) => item.id === rule.id)?.extraArgs ?? [];
    results.push(await runRule(rule, cwd, extraArgs, previous?.get(rule.id)));
  }

  const ok = results.every((result) => result.ok);
  const stale = results.some((result) => result.stale);
  return {
    base: cwd,
    ok,
    stale,
    durationMs: Date.now() - startedAt,
    checkedAt: new Date(startedAt).toISOString(),
    results,
  };
}

export { RULES };
