import { ESLint } from 'eslint';
import { RULES } from './rules.js';
import { findRepoRoot } from './repo-root.js';
import { resolveBin } from './resolve-bin.js';

function quoteWindowsPath(file) {
  return process.platform === 'win32' ? `"${file.replace(/"/g, '\\"')}"` : file;
}

/**
 * 构造 lint-staged 的数据化配置：
 * glob 来自规则描述，命中文件再即时与 ESLint ignore 求交，
 * 被 ESLint 忽略的暂存文件不会触发（全量）校验。
 * 同一 glob 可能被多条规则声明，因此按 glob 聚合命令。
 */
export async function buildLintStagedConfig(cwd = process.cwd()) {
  const eslint = new ESLint({ cwd });
  const rulesByGlob = new Map();

  for (const rule of RULES) {
    if (!rule.lintStaged) continue;
    for (const pattern of rule.lintStaged.glob) {
      if (!rulesByGlob.has(pattern)) rulesByGlob.set(pattern, []);
      rulesByGlob.get(pattern).push(rule);
    }
  }

  const config = {};
  for (const [pattern, rules] of rulesByGlob) {
    config[pattern] = async (files) => {
      const ignoredFlags = await Promise.all(files.map(async (file) => eslint.isPathIgnored(file)));
      const lintable = files.filter((_, index) => !ignoredFlags[index]);
      const commands = [];

      for (const rule of rules) {
        const { buildArgs, runWholeProject = false } = rule.lintStaged;
        // 交集为空且非全量规则：被忽略文件不触发任何重跑。
        if (!runWholeProject && lintable.length === 0) continue;
        const extraArgs = runWholeProject
          ? buildArgs([])
          : buildArgs(lintable.map(quoteWindowsPath));
        commands.push([resolveBin(rule.bin), ...extraArgs].join(' '));
      }

      return commands;
    };
  }

  return config;
}

export async function runStaged(cwd = findRepoRoot()) {
  const { default: lintStaged } = await import('lint-staged');
  const config = await buildLintStagedConfig(cwd);
  const passed = await lintStaged({ config, cwd, debug: false, quiet: false });
  // lint-staged 在任务失败时 resolve(false)，必须显式转成异常/非零退出。
  if (!passed) throw new Error('lint-staged tasks failed');
  return passed;
}
