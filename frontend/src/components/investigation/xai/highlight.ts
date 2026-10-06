import type { FeatureContribution } from '@/types'

/** A run of the explanation text, optionally linked to the feature it quotes. */
export interface TextSegment {
  text: string
  featureKey?: string
}

interface Range {
  start: number
  end: number
  featureKey: string
}

const NUMBER_RE = /\d+(?:[.,]\d+)*%?/g

/**
 * Candidate substrings that identify a feature's observed value in prose:
 * the whole observed string ("4.6 bits/char") and its numeric tokens
 * ("73", "182,400", "93%"). Bare single digits are skipped — too ambiguous.
 */
function candidateTokens(observed: string): string[] {
  const tokens = new Set<string>()
  const trimmed = observed.trim()
  if (trimmed.length >= 3) tokens.add(trimmed)
  for (const match of trimmed.matchAll(NUMBER_RE)) {
    const token = match[0]
    if (/^\d$/.test(token)) continue
    tokens.add(token)
    // "60.0 s" in the data usually reads "60-second" in prose.
    if (/\.0+$/.test(token)) tokens.add(token.replace(/\.0+$/, ''))
  }
  return [...tokens]
}

const isDigit = (ch: string | undefined) => ch !== undefined && ch >= '0' && ch <= '9'
const isWordChar = (ch: string | undefined) => ch !== undefined && /[A-Za-z0-9]/.test(ch)

/** True when the match is not part of a longer number or word. */
function hasBoundaries(text: string, start: number, end: number, token: string): boolean {
  const before = text[start - 1]
  const after = text[end]
  const afterNext = text[end + 1]
  const numeric = /^[\d.,%]+$/.test(token)
  if (numeric) {
    if (isDigit(before) || before === '.' || (before === ',' && isDigit(text[start - 2]))) return false
    if (isDigit(after)) return false
    if ((after === '.' || after === ',') && isDigit(afterNext)) return false
    return true
  }
  return !isWordChar(before) && !isWordChar(after)
}

function findRanges(text: string, features: FeatureContribution[]): Range[] {
  const lowered = text.toLowerCase()
  // Case-insensitive only when lowercasing keeps indices aligned with the original text.
  const caseless = lowered.length === text.length
  const haystack = caseless ? lowered : text
  const ranges: Range[] = []
  for (const feature of features) {
    for (const token of candidateTokens(feature.observed)) {
      const needle = caseless ? token.toLowerCase() : token
      let from = 0
      while (from <= haystack.length - needle.length) {
        const start = haystack.indexOf(needle, from)
        if (start === -1) break
        const end = start + needle.length
        if (hasBoundaries(text, start, end, token)) ranges.push({ start, end, featureKey: feature.key })
        from = end
      }
    }
  }
  // Earliest first; on ties the longer (more specific) match wins.
  ranges.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
  const accepted: Range[] = []
  for (const r of ranges) {
    const last = accepted[accepted.length - 1]
    if (!last || r.start >= last.end) accepted.push(r)
  }
  return accepted
}

/**
 * Splits the explanation into plain and highlighted runs. The concatenated
 * `text` of all segments is always identical to the input — never altered.
 */
export function segmentExplanation(text: string, features: FeatureContribution[]): TextSegment[] {
  const ranges = findRanges(text, features)
  const segments: TextSegment[] = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start > cursor) segments.push({ text: text.slice(cursor, r.start) })
    segments.push({ text: text.slice(r.start, r.end), featureKey: r.featureKey })
    cursor = r.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}
