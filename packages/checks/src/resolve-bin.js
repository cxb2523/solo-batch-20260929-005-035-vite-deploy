import { existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * 从包目录向上查找 node_modules/.bin 中的工具。
 * 这样无论调用方（npm script / husky / node 直跑）PATH 如何，
 * 都能定位到 workspace 提升后的可执行文件。
 * 返回值兼容 Windows 的 .cmd/.exe 以及 POSIX 的无扩展名 shim。
 */
export function resolveBin(name, start = PACKAGE_DIR) {
  let dir = start;
  const { root } = parse(dir);
  while (true) {
    const binDir = join(dir, 'node_modules', '.bin');
    const candidates = process.platform === 'win32' ? [`${name}.cmd`, `${name}.exe`, name] : [name];
    for (const candidate of candidates) {
      const fullPath = join(binDir, candidate);
      if (existsSync(fullPath)) return fullPath;
    }
    if (dir === root) break;
    dir = dirname(dir);
  }
  return name;
}
