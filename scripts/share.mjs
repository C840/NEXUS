#!/usr/bin/env node
// Shares this computer's NEXUS backend with the GitHub Pages site through a Cloudflare quick tunnel.
// Usage from the repository root:  npm run share
//
// 1. Starts the FastAPI backend (live capture included) with a fresh random access token.
// 2. Opens a Cloudflare tunnel (https://<random>.trycloudflare.com → http://127.0.0.1:8000).
// 3. Prints the link to open: https://<owner>.github.io/<repo>/?api=<tunnel>&token=<token>
// The tunnel URL and token change every run; stop with Ctrl+C.
import { execSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isWindows = process.platform === 'win32'
const venvPython = path.join(root, 'backend', '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python')
const python = existsSync(venvPython) ? venvPython : isWindows ? 'python' : 'python3'

function findCloudflared() {
  const candidates = isWindows
    ? ['C:\\Program Files (x86)\\cloudflared\\cloudflared.exe', 'C:\\Program Files\\cloudflared\\cloudflared.exe']
    : ['/usr/local/bin/cloudflared', '/opt/homebrew/bin/cloudflared', '/usr/bin/cloudflared']
  return candidates.find((p) => existsSync(p)) ?? 'cloudflared'
}

function pagesUrl() {
  try {
    const remote = execSync('git remote get-url origin', { cwd: root }).toString().trim()
    const m = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/)
    if (m) return `https://${m[1].toLowerCase()}.github.io/${m[2]}/`
  } catch {
    /* no git remote */
  }
  return null
}

const site = pagesUrl()
const token = randomBytes(18).toString('base64url')
const origins = ['http://localhost:5173', 'http://127.0.0.1:5173', ...(site ? [new URL(site).origin] : [])].join(',')

const children = []
let stopping = false
function shutdown(code) {
  if (stopping) return
  stopping = true
  for (const child of children) if (!child.killed) child.kill()
  setTimeout(() => process.exit(code), 300)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

function run(name, color, cmd, args, env, onLine) {
  const child = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env } })
  const prefix = `${color}[${name}]\x1b[0m `
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (!line.trim()) continue
        if (onLine?.(line) !== false) out.write(prefix + line + '\n')
      }
    })
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on('error', (err) => {
    console.error(`${prefix}could not start: ${err.message}`)
    if (name === 'tunnel') console.error('       Install cloudflared: winget install Cloudflare.cloudflared')
    shutdown(1)
  })
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`)
    shutdown(code ?? 0)
  })
  children.push(child)
  return child
}

run('api', '\x1b[36m', python, ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', '8000'], {
  NEXUS_ACCESS_TOKEN: token,
  NEXUS_CORS_ORIGINS: origins,
})

let announced = false
run('tunnel', '\x1b[33m', findCloudflared(), ['tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:8000'], {}, (line) => {
  const m = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
  if (m && !announced) {
    announced = true
    const api = m[0]
    const link = site ? `${site}?api=${encodeURIComponent(api)}&token=${token}` : `${api}  (token ${token})`
    writeFileSync(path.join(root, 'share-link.txt'), link + '\n')
    console.log('\n\x1b[32m  NEXUS is shared.\x1b[0m Open (or send) this link — it works until you press Ctrl+C:\n')
    console.log(`  \x1b[1m${link}\x1b[0m\n`)
    console.log('  Saved to share-link.txt. Anyone with the link can view and operate this NEXUS instance.\n')
  }
  // cloudflared is chatty; keep only warnings/errors after startup.
  return !announced || /ERR|WRN/.test(line)
})

console.log('\n  Starting NEXUS backend + Cloudflare tunnel…\n')
