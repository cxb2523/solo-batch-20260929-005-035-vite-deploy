#!/usr/bin/env node
import http from 'node:http'
import { runChecks } from './index.js'

const PORT = Number(process.env.CHECKS_PORT ?? 8787)

let lastReport = null
let currentRun = null

function ensureRun() {
  if (!currentRun) {
    currentRun = runChecks()
      .then((report) => {
        lastReport = report
        return report
      })
      .finally(() => {
        currentRun = null
      })
  }
  return currentRun
}

function send(res, status, body) {
  const payload = JSON.stringify(body, null, 2)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(payload)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(
    req.url ?? '/',
    `http://${req.headers.host ?? 'localhost'}`,
  )

  if (url.pathname === '/report') {
    // Return the freshest report; concurrent callers share the in-flight run.
    const report = await ensureRun()
    send(res, report.status === 'pass' ? 200 : 500, report)
    return
  }

  if (url.pathname === '/run' && req.method === 'POST') {
    const report = await ensureRun()
    send(res, report.status === 'pass' ? 200 : 500, report)
    return
  }

  if (url.pathname === '/health') {
    send(res, 200, { ok: true, base: lastReport?.base ?? null })
    return
  }

  send(res, 404, {
    error: 'not found',
    routes: ['/report', '/run (POST)', '/health'],
  })
})

server.listen(PORT, () => {
  console.log(`repo-checks server listening on http://localhost:${PORT}`)
  ensureRun().catch((err) => console.error(err))
})
