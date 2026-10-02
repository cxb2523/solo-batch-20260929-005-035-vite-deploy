import { spawn } from 'node:child_process'

function killTree(child) {
  if (process.platform === 'win32') {
    // cmd.exe shells out to grandchildren; kill the whole tree or the
    // surviving grandchildren keep stdio pipes (and 'close') pending.
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    }).unref()
    return
  }
  child.kill('SIGTERM')
  setTimeout(() => child.kill('SIGKILL'), 1_000).unref()
}

export function runRule(rule, cwd) {
  const timeoutMs = rule.timeoutMs ?? 30_000
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const child = spawn(rule.command, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    let output = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killTree(child)
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        id: rule.id,
        title: rule.title,
        status: 'fail',
        durationMs: Date.now() - startedAt,
        timedOut: false,
        output: String(err),
      })
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({
        id: rule.id,
        title: rule.title,
        status: timedOut ? 'timeout' : code === 0 ? 'pass' : 'fail',
        durationMs: Date.now() - startedAt,
        timedOut,
        exitCode: code,
        signal: signal ?? undefined,
        output: output.trim().slice(-4000),
      })
    })
  })
}
