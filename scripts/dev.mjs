#!/usr/bin/env node
// Runs the NEXUS backend (FastAPI on :8000) and frontend (Vite on :5173) together.
// Usage from the repository root:  npm run dev
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isWindows = process.platform === 'win32'
const venvPython = path.join(root, 'backend', '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python')
const python = existsSync(venvPython) ? venvPython : isWindows ? 'python' : 'python3'

if (!existsSync(venvPython)) {
  console.warn(`[dev] backend/.venv not found — using "${python}". Create it with:\n      cd backend && python -m venv .venv && .venv/${isWindows ? 'Scripts' : 'bin'}/pip install -r requirements-dev.txt\n`)
}

const processes = [
  {
    name: 'api',
    color: '\x1b[36m',
    cmd: python,
    args: ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--reload', '--reload-dir', 'backend/app', '--host', '127.0.0.1', '--port', '8000'],
  },
  {
    name: 'web',
    color: '\x1b[35m',
    cmd: isWindows ? 'npm.cmd' : 'npm',
    args: ['--prefix', 'frontend', 'run', 'dev'],
  },
]

const children = processes.map(({ name, color, cmd, args }) => {
  const child = spawn(cmd, args, { cwd: root, shell: isWindows, env: { ...process.env, FORCE_COLOR: '1' } })
  const prefix = `${color}[${name}]\x1b[0m `
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) out.write(prefix + line + '\n')
    })
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`)
    shutdown(code ?? 0)
  })
  return child
})

let stopping = false
function shutdown(code) {
  if (stopping) return
  stopping = true
  for (const child of children) if (!child.killed) child.kill()
  setTimeout(() => process.exit(code), 300)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('\n  NEXUS  ·  web http://localhost:5173  ·  api http://localhost:8000/docs\n')
