import { createServer } from 'node:http';
import { runChecks } from './runner.js';
import { findRepoRoot } from './repo-root.js';

export const DEFAULT_PORT = 8787;

/**
 * 按工作区（仓库根绝对路径）维护：
 * - inFlight: 正在执行的校验 Promise；同一工作区并发请求只跑一次真实校验
 * - last:     上一次结果，供超时规则回退与 /report 查看
 */
function createWorkspaces() {
  const inFlight = new Map();
  const last = new Map();

  function trigger(root) {
    if (inFlight.has(root)) return inFlight.get(root);

    const promise = (async () => {
      try {
        const previousReport = last.get(root);
        const previous = previousReport
          ? new Map(previousReport.results.map((result) => [result.id, result]))
          : undefined;
        const report = await runChecks({ cwd: root, previous });
        last.set(root, report);
        return report;
      } finally {
        inFlight.delete(root);
      }
    })();

    inFlight.set(root, promise);
    return promise;
  }

  return { inFlight, last, trigger };
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) reject(new Error('payload too large'));
      else raw += chunk;
    });
    request.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

export function createChecksServer(options = {}) {
  const port = options.port ?? DEFAULT_PORT;
  const defaultRoot = findRepoRoot(options.cwd);
  const workspaces = createWorkspaces();

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const root = defaultRoot;

    try {
      if (request.method === 'GET' && url.pathname === '/healthz') {
        sendJson(response, 200, { ok: true, base: root });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/report') {
        // 没有快照时复用进行中的校验或启动一次；并发请求共享同一 Promise。
        const report = workspaces.last.get(root) ?? (await workspaces.trigger(root));
        sendJson(response, 200, report);
        return;
      }

      if ((request.method === 'POST' || request.method === 'GET') && url.pathname === '/check') {
        await readJsonBody(request).catch(() => ({}));
        const report = await workspaces.trigger(root);
        sendJson(response, report.ok ? 200 : 422, report);
        return;
      }

      sendJson(response, 404, {
        ok: false,
        error: 'not found',
        routes: ['GET /healthz', 'GET /report', 'POST /check'],
      });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error.message });
    }
  });

  return {
    server,
    workspaces,
    start() {
      return new Promise((resolve) => {
        server.listen(port, () => {
          // 启动即预热一次，/report 立即可用。
          workspaces.trigger(defaultRoot);
          resolve({ port, root: defaultRoot });
        });
      });
    },
  };
}
