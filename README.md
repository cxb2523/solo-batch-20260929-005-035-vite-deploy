<div align="center">
    <h2>⚜️ V I T E &nbsp; D E P L O Y ⚜️</h2>
</div>

<div align="center">
    <h4>Follow the steps below to deploy your React application on GitHub.</h4>
    <a href="https://www.youtube.com/watch?v=XhoWXhyuW_I">
        <img src="https://img.shields.io/badge/Youtube_Video%20-%0A66C2.svg?&style=for-the-badge&logo=YouTube&logoColor=FF0000&color=282828" />
    </a>
</div>

<br />

#### 01. Create a vite react app

```npm
npm create vite@latest
```

#### 02. Create a new repository on GitHub and initialize GIT

```git
git init
git add .
git commit -m "add: initial files"
git branch -M main
git remote add origin https://github.com/[USER]/[REPO_NAME]
git push -u origin main
```

#### 03. Setup base in _vite.config_

```js
base: '/[REPO_NAME]/'
```

#### 04. Create ./github/workflows/deploy.yml and add the code bellow

> [!WARNING]
> It is crucial that the `.yml` file has the exact code below. Any typing or spacing errors may cause deployment issues.

```yml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3

      - name: Install dependencies
        uses: bahmutov/npm-install@v1

      - name: Build project
        run: npm run build

      - name: Upload production-ready build files
        uses: actions/upload-artifact@v3
        with:
          name: production-files
          path: ./dist

  deploy:
    name: Deploy
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: production-files
          path: ./dist

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

#### 05. Push to GitHub

```git
git add .
git commit -m "add: deploy workflow"
git push
```

#### 06. Active workflow (GitHub)

```
Config > Actions > General > Workflow permissions > Read and Write permissions
```

```
Actions > failed deploy > re-run-job failed jobs
```

```
Pages > gh-pages > save
```

## 🛠 Helper

#### > For code changes

Whenever you push to GitHub, it will deploy automatically.

```git
git add .
git commit -m "fix: some bug"
git push
```

#### > Fixing the 404 page error on routes.

Watch my video on YouTube or check my repository.

<a href="https://youtu.be/uEEj2c3_ydg?si=XiUEL9h1WUmfjtkt">
    <img src="https://img.shields.io/badge/Video%20-%0A66C2.svg?&style=for-the-badge&logo=YouTube&logoColor=FF0000&color=282828" />
</a>
<a href="https://github.com/ErickKS/vite-react-router">
    <img src="https://img.shields.io/badge/Repository%20-%0A66C2.svg?&style=for-the-badge&logo=GitHub&logoColor=FFFFFF&color=282828" />
</a>

<br/>

#### > Do you want to automate the project setup process ( `.yml` and `vite.config` )?

To prevent possible errors in the deploy process, check out this pull request:

<a href="https://github.com/ErickKS/vite-deploy/pull/1">
    <img src="https://img.shields.io/badge/Pull_Request%20-%0A66C2.svg?&style=for-the-badge&logo=GitHub&logoColor=FFFFFF&color=282828" />
</a>

## ✅ Unified checks (`repo-checks`)

All check definitions live in one referenceable Node package, `packages/checks`
(published locally as the `repo-checks` file dependency). The rules are pure
data in `packages/checks/rules.js` — adding a new rule means appending one
entry there; no caller (CLI, HTTP server, pre-commit hook, CI) changes.

```js
import { runChecks } from 'repo-checks'
const report = await runChecks() // { base, status, durationMs, results[] }
```

- `npm run verify` — runs every rule once (typecheck, ESLint, Prettier check).
- `npm run checks:serve` — HTTP server on port `8787`.
  - `GET /report` returns `base` (repo root), per-rule results, durations and
    `stale` flags; `POST /run` forces a run; `GET /health` is a liveness probe.
  - Concurrent requests for the same workspace share a single in-flight
    Promise, deduplicated by the repo-root absolute path — only one real run
    happens at a time.
  - A subprocess exceeding its 30s timeout is killed (process tree) and the
    rule falls back to its previous known result, flagged `stale: true` in
    `/report`.
- `npm run format:check` — Prettier in read-only `--check` mode; it never
  writes. Use `npm run format` explicitly to rewrite files.

### Pre-commit hook

`.githooks/pre-commit` (activated via `npm run prepare`, which sets
`core.hooksPath`) runs `lint-staged`. The staged-file glob is intersected
with ESLint ignore **at commit time** (`repo-checks/eslint-ignore`), so staged
files that ESLint ignores produce an empty task list and never trigger a full
re-run; any remaining staged file runs `npm run verify`.

### CI

`.github/workflows/ci.yml` splits `verify` and `build` into separate jobs that
share the npm cache: a failing check stops the pipeline before build minutes
are spent and keeps the failure signal unambiguous, at the cost of one extra
job startup. Because the hook and CI both call `npm run verify`, commits that
bypass the hook with `--no-verify` are still caught by the `verify` job.
