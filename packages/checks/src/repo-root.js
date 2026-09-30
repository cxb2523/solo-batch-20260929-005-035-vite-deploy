import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';

/**
 * 向上查找包含 .git 的目录作为仓库根；找不到时回退到起始目录。
 * 返回规范化后的绝对路径（解析符号链接），用作并发去重键。
 */
export function findRepoRoot(start = process.cwd()) {
  let dir = start;
  const { root } = parse(dir);
  while (!existsSync(join(dir, '.git')) && dir !== root) {
    dir = dirname(dir);
  }
  if (dir === root && !existsSync(join(dir, '.git'))) {
    dir = start;
  }
  try {
    return realpathSync(dir);
  } catch {
    return dir;
  }
}
