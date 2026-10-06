/**
 * Where the NEXUS backend lives, resolved once at page load.
 *
 * Local development: the Vite proxy serves `/api` and `/ws` on the same origin (base '').
 * Hosted build (GitHub Pages, VITE_HOSTED=1): the backend runs on the owner's PC behind a
 * tunnel whose URL changes per session. `npm run share` prints a link of the form
 *   https://<user>.github.io/NEXUS/?api=https://xyz.trycloudflare.com&token=…
 * which is saved here (per browser) and stripped from the address bar.
 */

const API_KEY = 'nexus.api'
const TOKEN_KEY = 'nexus.token'

export const IS_HOSTED = import.meta.env.VITE_HOSTED === '1'

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(key: string, value: string): void {
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    /* storage unavailable — the link still works for this page view */
  }
}

function normalize(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).origin // the backend is always served from an origin root
  } catch {
    return withScheme
  }
}

/** Accepts either the separate fields or a whole share link pasted into one of them. */
export function parseConnection(urlField: string, tokenField: string): { apiBase: string; token: string } {
  for (const value of [urlField, tokenField]) {
    const query = value.includes('?') ? value.slice(value.indexOf('?')) : ''
    const api = new URLSearchParams(query).get('api')
    if (api) return { apiBase: normalize(api), token: (new URLSearchParams(query).get('token') ?? tokenField).trim() }
  }
  return { apiBase: normalize(urlField), token: tokenField.trim() }
}

function resolve(): { apiBase: string; token: string } {
  const params = new URLSearchParams(window.location.search)
  const fromLink = params.get('api')
  const tokenFromLink = params.get('token')
  let apiBase = read(API_KEY)
  let token = read(TOKEN_KEY)
  if (fromLink !== null || tokenFromLink !== null) {
    apiBase = normalize(fromLink ?? apiBase)
    token = (tokenFromLink ?? token).trim()
    write(API_KEY, apiBase)
    write(TOKEN_KEY, token)
    params.delete('api')
    params.delete('token')
    const search = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }
  const envBase = normalize((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '')
  return { apiBase: IS_HOSTED ? apiBase || envBase : envBase, token: IS_HOSTED ? token : '' }
}

const resolved = resolve()

/** Backend origin ('' = same origin via the dev proxy). */
export const API_BASE_URL = resolved.apiBase
/** Access token required by a backend that is shared through a tunnel. */
export const ACCESS_TOKEN = resolved.token
/** The hosted site has no backend to talk to until a link or the connect form provides one. */
export const NEEDS_BACKEND = IS_HOSTED && !API_BASE_URL

export function authHeaders(): Record<string, string> {
  return ACCESS_TOKEN ? { 'X-Nexus-Token': ACCESS_TOKEN } : {}
}

/** Save a new backend location and reload so every service picks it up. */
export function connectTo(urlField: string, tokenField: string): void {
  const { apiBase, token } = parseConnection(urlField, tokenField)
  write(API_KEY, apiBase)
  write(TOKEN_KEY, token)
  window.location.reload()
}

export function disconnect(): void {
  connectTo('', '')
}
