/**
 * 校验规则以数据描述。新增规则只需在此追加一条记录，
 * runChecks / CLI / HTTP 服务等所有调用方无需改动。
 *
 * 字段说明：
 * - id/label:      机器与人类可读的规则标识
 * - bin:           真实执行的可执行文件名（经 PATH 解析）
 * - args:          静态参数
 * - buildArgs:     运行期动态参数（如对暂存文件做 lint/format）
 * - timeoutMs:     子进程超时，被杀后回退该规则上一次结果并标注 stale
 * - lintStaged:    pre-commit 阶段的配置：
 *                  glob 为入口集合，随后即时与 ESLint ignore 求交
 */
export const RULES = [
  {
    id: 'lint',
    label: 'ESLint',
    bin: 'eslint',
    args: ['.', '--ext', '.ts,.tsx,.js,.cjs,.mjs'],
    timeoutMs: 30_000,
    lintStaged: {
      glob: ['*.{ts,tsx,js,cjs,mjs}', '**/*.{ts,tsx,js,cjs,mjs}'],
      buildArgs: (files) => files,
      respectEslintIgnore: true,
    },
  },
  {
    id: 'format',
    label: 'Prettier format check (read-only)',
    bin: 'prettier',
    args: ['--check', '.'],
    timeoutMs: 30_000,
    lintStaged: {
      glob: ['*.{ts,tsx,js,cjs,mjs,json,css,html,md}', '**/*.{ts,tsx,js,cjs,mjs,json,css,html,md}'],
      buildArgs: (files) => ['--check', ...files],
      respectEslintIgnore: true,
    },
  },
  {
    id: 'types',
    label: 'TypeScript type check',
    bin: 'tsc',
    args: ['-p', 'tsconfig.json', '--noEmit'],
    timeoutMs: 30_000,
    lintStaged: {
      glob: ['*.{ts,tsx}', '**/*.{ts,tsx}'],
      buildArgs: () => ['-p', 'tsconfig.json', '--noEmit'],
      respectEslintIgnore: true,
      runWholeProject: true,
    },
  },
];

export const DEFAULT_TIMEOUT_MS = 30_000;
