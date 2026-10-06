#!/usr/bin/env node
// Runs the backend test suite with the backend virtualenv's interpreter.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend')
const isWindows = process.platform === 'win32'
const venvPython = path.join(backend, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python')
const python = existsSync(venvPython) ? venvPython : isWindows ? 'python' : 'python3'

const result = spawnSync(python, ['-m', 'pytest', ...process.argv.slice(2)], { cwd: backend, stdio: 'inherit' })
process.exit(result.status ?? 1)
