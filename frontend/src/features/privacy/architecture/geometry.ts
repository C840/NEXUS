/**
 * Pixel geometry for the federation diagram. The SVG link layer and the HTML
 * nodes share one coordinate system (the measured container width), so the
 * drawing never distorts and text stays crisp at every breakpoint.
 *
 *   ┌──────── server ────────┐   y = serverTop … serverBottom
 *        ↑Δw  ↓w   (lanes)
 *   ─ ─ ─ ─ boundary ─ ─ ─ ─ ─   y = boundaryY   (raw traffic stops here)
 *   [client] [client] [client]   y = clientsTop (CSS grid, normal flow)
 */

export interface Point {
  x: number
  y: number
}

/** Cubic Bézier. */
export interface Curve {
  p0: Point
  c1: Point
  c2: Point
  p1: Point
}

export const DIAGRAM = {
  serverTop: 6,
  serverHeight: 104,
  serverMaxWidth: 440,
  boundaryY: 194,
  /** Height of the link layer; client cards start here. */
  clientsTop: 264,
  /** Must match the client grid's column gap. */
  columnGap: 16,
  /** Half the spacing between a client's update and broadcast lanes (client end). */
  laneOffset: 14,
  /** Half the spacing between the lanes at the server end. */
  anchorOffset: 11,
  /** Raw-traffic stub distance from a column's left edge. */
  rawInset: 28,
  /** Approximate rendered width of the "raw traffic" label (9.5px mono). */
  rawLabelWidth: 66,
} as const

export interface ClientLanes {
  center: number
  update: Curve
  broadcast: Curve
  /** Straight stub from the client up to the boundary. */
  raw: Curve
  /** Whether the "raw traffic" label fits without touching the update lane. */
  showRawLabel: boolean
}

export interface DiagramGeometry {
  width: number
  serverWidth: number
  serverBottom: number
  lanes: ClientLanes[]
}

/** Vertical S-curve: leaves and arrives perpendicular to the cards. */
export function sCurve(from: Point, to: Point): Curve {
  const midY = (from.y + to.y) / 2
  return { p0: from, c1: { x: from.x, y: midY }, c2: { x: to.x, y: midY }, p1: to }
}

function straight(from: Point, to: Point): Curve {
  return { p0: from, c1: from, c2: to, p1: to }
}

export function pointAt(c: Curve, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const d = 3 * u * t * t
  const e = t * t * t
  return {
    x: a * c.p0.x + b * c.c1.x + d * c.c2.x + e * c.p1.x,
    y: a * c.p0.y + b * c.c1.y + d * c.c2.y + e * c.p1.y,
  }
}

export function curvePath(c: Curve): string {
  const f = (p: Point) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  return `M${f(c.p0)} C${f(c.c1)} ${f(c.c2)} ${f(c.p1)}`
}

/** x of a vertically monotonic curve at height y (bisection). */
function xAtY(c: Curve, y: number): number {
  let lo = 0
  let hi = 1
  const descending = c.p1.y < c.p0.y
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const py = pointAt(c, mid).y
    if (descending ? py > y : py < y) lo = mid
    else hi = mid
  }
  return pointAt(c, (lo + hi) / 2).x
}

export function computeGeometry(width: number, count: number): DiagramGeometry {
  const g = DIAGRAM
  const serverWidth = Math.max(0, Math.min(g.serverMaxWidth, width - 32))
  const serverBottom = g.serverTop + g.serverHeight
  const columnWidth = count > 0 ? (width - g.columnGap * (count - 1)) / count : width
  const spread = count > 1 ? serverWidth * 0.3 : 0
  const labelY = g.boundaryY + 16

  const lanes = Array.from({ length: count }, (_, i): ClientLanes => {
    const columnLeft = i * (columnWidth + g.columnGap)
    const center = columnLeft + columnWidth / 2
    const relative = count > 1 ? (i / (count - 1)) * 2 - 1 : 0
    const anchor = width / 2 + relative * spread
    const update = sCurve({ x: center - g.laneOffset, y: g.clientsTop }, { x: anchor - g.anchorOffset, y: serverBottom })
    const broadcast = sCurve({ x: anchor + g.anchorOffset, y: serverBottom }, { x: center + g.laneOffset, y: g.clientsTop })
    const rawX = columnLeft + g.rawInset
    const raw = straight({ x: rawX, y: g.clientsTop }, { x: rawX, y: g.boundaryY })
    const labelEnd = rawX + 10 + g.rawLabelWidth
    return { center, update, broadcast, raw, showRawLabel: xAtY(update, labelY) - labelEnd >= 8 }
  })

  return { width, serverWidth, serverBottom, lanes }
}
