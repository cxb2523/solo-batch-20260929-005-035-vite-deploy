# @vite-deploy/checks

收敛 ESLint / Prettier / TypeScript 三处校验口径的本地 workspace 包。规则以数据描述保存在
`src/rules.js`，新增一条规则只需追加记录，所有调用方（CLI、HTTP 服务、pre-commit、CI）零改动。

## 导出

- `runChecks({ cwd, previous, selection })` — 顺序执行全部规则，返回带每项结果与耗时的报告
- `runStaged(cwd)` / `buildLintStagedConfig(cwd)` — pre-commit 用的 lint-staged 配置
- `createChecksServer({ port })` — 常驻 8787 端口的 HTTP 服务
- `findRepoRoot()` — 仓库根绝对路径（并发去重键）

## CLI（`repo-checks`）

- `repo-checks run` — 一次性校验，任何规则失败则进程退出码为 1（CI / `npm run verify` 使用）
- `repo-checks staged` — 执行 lint-staged，供 `.husky/pre-commit` 调用
- `repo-checks serve [--port 8787]` — 常驻 HTTP 服务

## HTTP 服务

- `GET /report` — 最近一次校验报告（含 `base`、三项结果、逐项与总耗时、`stale` 标记）
- `POST /check` — 触发一次校验；同一工作区并发请求只跑一次真实校验，其余复用同一个 Promise
- `GET /healthz`

去重键是仓库根的绝对路径。某条子进程超过 30s 被杀时，该条回退到上一次结果并标注
`stale: true`（附 `fallbackFrom` 时间戳），整份报告的顶层 `stale` 同步置位。

## pre-commit 交集语义

规则里的 `lintStaged.glob` 只是入口集合；执行前会用 `ESLint.isPathIgnored` 对暂存文件
即时求交，被忽略的文件不触发任何重跑。Prettier 任务固定使用 `--check`，只读不回写。
