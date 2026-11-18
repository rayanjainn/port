// Sunscar Oasis: a caravan town around a palm-ringed lake, hand-placed landmarks, procedural dunes, mesas and dressing.
import {
  PROPS, HOUSE_PROPS, PLANK, CHARS, charSheet, charFace, animalSheet, monsterSheet, DESERT_SHEETS as DS, DUNE, PATH_SAND, MUD_BED, LIME, OASIS,
  SAND_BASE, MUD_BASE, MESA, DESERT_ART, DESERT_PROPS as DP, TAN_ROCKS, type Rect, type Autotile,
} from "@/lib/na"
import type { Portfolio } from "@/lib/content"
import { ordered, stele, canopy } from "./exhibits"
import { TS, G, img, blit, hash, mulberry, autotile, canvas, type Scene, type Sprite, type Hotspot, type ActorDef, type Light, type SceneSign, type Landmark } from "./core"

export const DW = 84
export const DH = 64

const ds = (k: keyof typeof DS) => img(DS[k])
type Img = CanvasImageSource

// ── shared build state ──────────────────────────────────────────
interface Op { z: number; fn: (g: CanvasRenderingContext2D) => void }
interface World {
  W: number; H: number
  idx: (c: number, r: number) => number
  inb: (c: number, r: number) => boolean
  blocked: Uint8Array; reserved: Uint8Array; tiles: Uint8Array; heights: Float32Array
  dune: Uint8Array; path: Uint8Array; lime: Uint8Array; bed: Uint8Array; water: Uint8Array; bridge: Uint8Array; mesa: Uint8Array
  sprites: Sprite[]; lights: Light[]; hotspots: Hotspot[]; signs: SceneSign[]; actors: ActorDef[]
  ops: Op[]
  doors: { id: string; label: string; sub: string; accent: string; x: number; y: number; top: number; section: string }[]
  tickers: ((t: number, dt: number) => void)[]
  rnd: () => number
  spr: (src: Img, rect: Rect, x: number, y: number, extra?: Partial<Sprite>) => Sprite
  solid: (x: number, y: number, w: number, h: number) => void
  reserve: (c0: number, r0: number, c1: number, r1: number) => void
  lamp: (x: number, y: number, r?: number, color?: string, flicker?: number) => void
}

const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x: number, y: number, s: number) => vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15

// ── pixel helpers ───────────────────────────────────────────────
/** copy a sheet rect into a fresh canvas, remapping each pixel through fn(h, s, v) -> [h, s, v] */
function remap(src: HTMLImageElement, rect: Rect, fn: (h: number, s: number, v: number) => [number, number, number]) {
  const { c, ctx } = canvas(rect[2], rect[3])
  ctx.drawImage(src, rect[0], rect[1], rect[2], rect[3], 0, 0, rect[2], rect[3])
  if (!src.complete || !src.naturalWidth) return c
  const d = ctx.getImageData(0, 0, c.width, c.height), a = d.data
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue
    const r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn
    let h = dl === 0 ? 0 : mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4
    h = ((h * 60) + 360) % 360
    const s = mx === 0 ? 0 : dl / mx
    const [h2, s2, v2] = fn(h, s, mx)
    const cc = v2 * s2, x = cc * (1 - Math.abs(((h2 / 60) % 2) - 1)), m = v2 - cc
    const [rr, gg, bb] = h2 < 60 ? [cc, x, 0] : h2 < 120 ? [x, cc, 0] : h2 < 180 ? [0, cc, x] : h2 < 240 ? [0, x, cc] : h2 < 300 ? [x, 0, cc] : [cc, 0, x]
    a[i] = Math.round((rr + m) * 255); a[i + 1] = Math.round((gg + m) * 255); a[i + 2] = Math.round((bb + m) * 255)
  }
  ctx.putImageData(d, 0, 0)
  return c
}
/** shift only the green range to a new hue (domes, awnings) */
const recolourGreen = (src: HTMLImageElement, rect: Rect, hue: number, sat = 1, val = 1) =>
  remap(src, rect, (h, s, v) => (h > 50 && h < 170 && s > 0.25 ? [hue + (h - 90) * 0.35, Math.min(1, s * sat), Math.min(1, v * val)] : [h, s, v]))
/** draw a tiny bitmap: rows of palette keys, '.' = empty */
function bitmap(rows: string[], pal: Record<string, string>) {
  const { c, ctx } = canvas(Math.max(...rows.map((r) => r.length)), rows.length)
  rows.forEach((row, y) => [...row].forEach((k, x) => { if (pal[k]) { ctx.fillStyle = pal[k]; ctx.fillRect(x, y, 1, 1) } }))
  return c
}

/** a saguaro, built from rects so every one is a little different */
function cactusCanvas(seed: number, kind: "saguaro" | "barrel" | "pear") {
  const rr = mulberry(seed * 977 + 5)
  const O = "#1f3a1f", G1 = "#4c9a45", G2 = "#2f7439", G3 = "#8dd06a", F = "#ff6fa5"
  if (kind === "barrel") {
    const { c, ctx } = canvas(16, 16)
    ctx.fillStyle = O; ctx.fillRect(3, 6, 10, 9); ctx.fillRect(4, 5, 8, 1); ctx.fillRect(4, 15, 8, 1)
    ctx.fillStyle = G1; ctx.fillRect(4, 6, 8, 9)
    ctx.fillStyle = G3; ctx.fillRect(5, 6, 2, 8)
    ctx.fillStyle = G2; ctx.fillRect(9, 6, 2, 9); ctx.fillRect(11, 7, 1, 7)
    ctx.fillStyle = "#e9e0b0"; for (const [x, y] of [[4, 8], [7, 10], [10, 8], [6, 13], [11, 12]]) ctx.fillRect(x, y, 1, 1)
    ctx.fillStyle = F; ctx.fillRect(6, 4, 4, 2); ctx.fillStyle = "#ffd76a"; ctx.fillRect(7, 3, 2, 2)
    return c
  }
  if (kind === "pear") {
    const { c, ctx } = canvas(24, 20)
    const pad = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = O; ctx.fillRect(x - 1, y, w + 2, h); ctx.fillRect(x, y - 1, w, h + 2)
      ctx.fillStyle = G1; ctx.fillRect(x, y, w, h)
      ctx.fillStyle = G3; ctx.fillRect(x + 1, y + 1, 2, h - 3)
      ctx.fillStyle = G2; ctx.fillRect(x + w - 2, y + 2, 1, h - 3)
      ctx.fillStyle = "#e9e0b0"; ctx.fillRect(x + 2, y + 3, 1, 1); ctx.fillRect(x + w - 4, y + 5, 1, 1)
    }
    pad(8, 9, 9, 10); pad(2, 4, 7, 8); pad(15, 2, 7, 9); pad(10, 1, 6, 6)
    ctx.fillStyle = F; ctx.fillRect(4, 2, 2, 2); ctx.fillRect(17, 0, 2, 2); ctx.fillRect(11, 0, 2, 1)
    return c
  }
  const h = 20 + Math.floor(rr() * 8), w = 5 + (rr() < 0.4 ? 1 : 0)
  const { c, ctx } = canvas(24, h + 2)
  const bx = 9, by = 2
  const limb = (x: number, y: number, ww: number, hh: number) => {
    ctx.fillStyle = O; ctx.fillRect(x - 1, y + 1, ww + 2, hh - 1); ctx.fillRect(x, y, ww, 1)
    ctx.fillStyle = G1; ctx.fillRect(x, y + 1, ww, hh - 1)
    ctx.fillStyle = G3; ctx.fillRect(x + 1, y + 2, 1, hh - 3)
    ctx.fillStyle = G2; ctx.fillRect(x + ww - 2, y + 2, 1, hh - 3)
    if (ww > 3) { ctx.fillStyle = G2; ctx.fillRect(x + (ww >> 1), y + 3, 1, hh - 5) }
  }
  const arms: { side: -1 | 1; y: number; up: number }[] = []
  if (rr() < 0.85) arms.push({ side: -1, y: 8 + Math.floor(rr() * 5), up: 5 + Math.floor(rr() * 5) })
  if (rr() < 0.8) arms.push({ side: 1, y: 6 + Math.floor(rr() * 6), up: 5 + Math.floor(rr() * 6) })
  for (const a of arms) {
    const ax = a.side < 0 ? bx - 6 : bx + w + 1
    // elbow joins the trunk, then the arm climbs
    ctx.fillStyle = O; ctx.fillRect(a.side < 0 ? ax : bx + w - 1, by + a.y - 1, 7, 6)
    ctx.fillStyle = G1; ctx.fillRect(a.side < 0 ? ax + 1 : bx + w, by + a.y, 5, 4)
    limb(a.side < 0 ? ax : ax + 2, by + a.y - a.up, 4, a.up + 3)
  }
  limb(bx, by, w, h)
  if (rr() < 0.6) { ctx.fillStyle = F; ctx.fillRect(bx + 1, by - 1, 3, 2); ctx.fillStyle = "#ffd76a"; ctx.fillRect(bx + 2, by - 2, 1, 1) }
  return c
}

/** pennant banner: a coloured cloth with a painted emblem, hung from a pole */
function banner(color: string, trim: string, emblem: "sun" | "star" | "anvil" | "scroll" | "cup" | "feather" | "game") {
  const { c, ctx } = canvas(14, 34)
  ctx.fillStyle = "#3a2210"; ctx.fillRect(6, 0, 2, 34); ctx.fillRect(0, 2, 14, 2)
  ctx.fillStyle = "#a8692f"; ctx.fillRect(0, 2, 14, 1)
  ctx.fillStyle = "#2a1606"; ctx.fillRect(1, 4, 12, 20); ctx.fillRect(2, 24, 10, 2); ctx.fillRect(4, 26, 6, 2); ctx.fillRect(6, 28, 2, 1)
  ctx.fillStyle = color; ctx.fillRect(2, 4, 10, 20); ctx.fillRect(3, 24, 8, 1); ctx.fillRect(4, 25, 6, 1); ctx.fillRect(5, 26, 4, 1); ctx.fillRect(6, 27, 2, 1)
  ctx.fillStyle = trim; ctx.fillRect(2, 5, 10, 1); ctx.fillRect(2, 4, 1, 20); ctx.fillRect(11, 4, 1, 20)
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(9, 6, 2, 17)
  const e = "#fff1c8"
  ctx.fillStyle = e
  const put = (pts: [number, number][]) => pts.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1))
  if (emblem === "sun") { ctx.fillRect(5, 11, 4, 4); put([[6, 8], [7, 8], [6, 17], [7, 17], [3, 12], [3, 13], [10, 12], [10, 13], [4, 9], [9, 9], [4, 16], [9, 16]]) }
  if (emblem === "star") put([[6, 8], [7, 8], [6, 9], [7, 9], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [5, 12], [6, 12], [7, 12], [8, 12], [5, 13], [6, 13], [7, 13], [8, 13], [4, 14], [5, 14], [8, 14], [9, 14], [4, 15], [9, 15]])
  if (emblem === "anvil") { ctx.fillRect(3, 11, 8, 2); ctx.fillRect(5, 13, 4, 2); ctx.fillRect(4, 15, 6, 2); ctx.fillRect(2, 11, 1, 1) }
  if (emblem === "scroll") { ctx.fillRect(4, 9, 6, 9); ctx.fillStyle = color; ctx.fillRect(5, 11, 4, 1); ctx.fillRect(5, 13, 4, 1); ctx.fillRect(5, 15, 3, 1) }
  if (emblem === "cup") { ctx.fillRect(4, 10, 6, 4); ctx.fillRect(5, 14, 4, 1); ctx.fillRect(10, 11, 2, 2); ctx.fillRect(5, 16, 4, 1); ctx.fillStyle = color; ctx.fillRect(5, 11, 4, 1) }
  if (emblem === "feather") put([[9, 8], [8, 9], [9, 9], [7, 10], [8, 10], [6, 11], [7, 11], [5, 12], [6, 12], [4, 13], [5, 13], [3, 14], [4, 14], [2, 15], [3, 16]])
  if (emblem === "game") { ctx.fillRect(3, 12, 8, 4); ctx.fillStyle = color; ctx.fillRect(4, 13, 2, 2); ctx.fillRect(8, 13, 1, 1); ctx.fillRect(9, 14, 1, 1) }
  return c
}

// ── terrain ─────────────────────────────────────────────────────
export const LAKE = { cx: 41, cy: 20, rx: 8.6, ry: 5.2 }
export const SPAWN = { c: 41, r: 28 }
export const TRAVEL = { c: 8, r: 37 }
const BED_PTS: [number, number][] = [[77, 8], [75, 15], [73, 22], [72, 29], [71, 36], [68, 42], [62, 45], [55, 47], [49, 49]]
export const BRIDGE = { c: 58, r0: 42, r1: 50 }
export const ARENA = { c: 66, r: 51 }
export const QUICK = { c0: 31, c1: 45, r0: 49, r1: 57 }
export const LOOKOUT = { c0: 7, r0: 8, w: 11, top: 4, face: 2, ramp: 12 }

interface Mesa { c0: number; r0: number; w: number; top: number; face: number; ramp?: number }

function drawMesa(g: CanvasRenderingContext2D, m: Mesa) {
  const rel = ds("relief")
  const { c0, r0, w, top, face } = m
  for (let j = 0; j < top + face; j++)
    for (let i = 0; i < w; i++) {
      const isTop = j < top
      const fj = j - top
      let rect: Rect
      if (isTop) {
        if (w === 1) rect = j === 0 ? MESA.vTop : MESA.vMid
        else {
          const k = i === 0 ? 0 : i === w - 1 ? 2 : 1
          rect = j === 0 ? [MESA.tl, MESA.t, MESA.tr][k] : [MESA.l, MESA.c, MESA.r][k]
        }
      } else if (face === 1) rect = w === 1 ? MESA.vBot : [MESA.bl, MESA.b, MESA.br][i === 0 ? 0 : i === w - 1 ? 2 : 1]
      else {
        const k = w === 1 ? 1 : i === 0 ? 0 : i === w - 1 ? 2 : 1
        const row = fj === 0 ? [MESA.wallTL, MESA.wallT, MESA.wallTR] : fj === face - 1 ? [MESA.wallBL, MESA.wallB, MESA.wallBR] : [MESA.wallL, MESA.wallM, MESA.wallR]
        rect = row[k]
      }
      if (m.ramp === c0 + i) {
        if (!isTop) rect = face === 1 ? MESA.rampM : fj === 0 ? MESA.rampT : fj === face - 1 ? MESA.rampB : MESA.rampM
        else if (j > 0) rect = MESA.c
      }
      blit(g, rel, rect, (c0 + i) * TS, (r0 + j) * TS)
    }
}

export function buildDesert(content?: Portfolio): Scene {
  const W = DW, H = DH
  const rnd = mulberry(20260611)
  const idx = (c: number, r: number) => r * W + c
  const inb = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H
  const w: World = {
    W, H, idx, inb,
    blocked: new Uint8Array(W * H), reserved: new Uint8Array(W * H), tiles: new Uint8Array(W * H).fill(G.Grass), heights: new Float32Array(W * H),
    dune: new Uint8Array(W * H), path: new Uint8Array(W * H), lime: new Uint8Array(W * H), bed: new Uint8Array(W * H),
    water: new Uint8Array(W * H), bridge: new Uint8Array(W * H), mesa: new Uint8Array(W * H),
    sprites: [], lights: [], hotspots: [], signs: [], actors: [], ops: [], doors: [], tickers: [], rnd,
    spr: (src, rect, x, y, extra = {}) => {
      const s: Sprite = { kind: "sprite", src, rect, x: Math.round(x), y: Math.round(y), baseY: Math.round(y + rect[3] - 1), ...extra }
      w.sprites.push(s)
      return s
    },
    solid: (x, y, ww, hh) => { w.sprites.push({ kind: "sprite", src: ds("floor"), rect: [0, 0, 0, 0], x, y, baseY: y + hh, solid: { x, y, w: ww, h: hh } }) },
    reserve: (c0, r0, c1, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inb(c, r)) w.reserved[idx(c, r)] = 1 },
    lamp: (x, y, r = 56, color = "255,190,100", flicker = 1) => { w.lights.push({ x, y, r, color, flicker }) },
  }
  const set = (a: Uint8Array, c: number, r: number, v = 1) => { if (inb(c, r)) a[idx(c, r)] = v }
  const get = (a: Uint8Array, c: number, r: number) => (inb(c, r) ? a[idx(c, r)] : 0)

  terrain(w, set, get)
  build(w, content)
  return finish(w)
}

// stage functions are appended below

// ── landmark footprints and doors (tile coords) ─────────────────
interface Foot { c0: number; r0: number; c1: number; r1: number }
const FOOT: Foot[] = [
  { c0: 36, r0: 30, c1: 42, r1: 35 },   // caravanserai
  { c0: 51, r0: 28, c1: 59, r1: 34 },   // hall of relics
  { c0: 24, r0: 17, c1: 28, r1: 21 },   // teahouse
  { c0: 22, r0: 31, c1: 26, r1: 34 },   // forge
  { c0: 61, r0: 10, c1: 65, r1: 15 },   // observatory
  { c0: 53, r0: 18, c1: 56, r1: 21 },   // falcon post
]
const ROADS: [number, number, number, number][] = [
  [41, 40, 37, 36], [41, 40, 55, 35], [41, 40, 25, 23], [41, 40, 24, 36], [41, 40, 54, 23], [54, 23, 63, 17], [25, 23, 12, 15],
  [41, 40, 9, 37], [41, 40, 57, 51], [41, 27, 41, 40], [25, 23, 41, 27], [54, 23, 41, 27], [41, 44, 38, 49],
]
export const DOORS = {
  townhall: { x: 36 * TS + 24, y: 31 * TS + 66 },
  gallery: { x: 55 * TS + 8, y: 29 * TS + 80 },
  tavern: { x: 24 * TS + 24, y: 18 * TS + 64 },
  forge: { x: 22 * TS + 24, y: 32 * TS + 48 },
  academy: { x: 61 * TS + 24, y: 11 * TS + 80 },
  wizard: { x: 53 * TS + 24, y: 19 * TS + 48 },
}

function terrain(w: World, set: (a: Uint8Array, c: number, r: number, v?: number) => void, get: (a: Uint8Array, c: number, r: number) => number) {
  const { W, H, idx, inb, rnd } = w

  // ── mesas: terraced walls close every edge ──
  const mesas: Mesa[] = []
  // north: tall back wall, shorter terrace in front, a nook for the waterfall
  for (let c = -3; c < W; ) {
    const ww = 5 + Math.floor(rnd() * 5)
    if (c + ww > 33 && c < 47) { c = 47; continue }
    mesas.push({ c0: c, r0: -(rnd() < 0.4 ? 1 : 0), w: ww, top: 3 + Math.floor(rnd() * 2), face: 3 })
    c += ww - (rnd() < 0.4 ? 1 : 0)
  }
  mesas.push({ c0: 34, r0: 0, w: 13, top: 3, face: 4 })
  for (let c = -2; c < W; ) {
    const ww = 4 + Math.floor(rnd() * 5)
    if (c + ww > 36 && c < 46) { c = 46; continue }
    if (c + ww > 72 && c < 79) { c = 79; continue }       // dry river leaves the cliffs here
    mesas.push({ c0: c, r0: 5 + Math.floor(rnd() * 2), w: ww, top: 1 + (rnd() < 0.3 ? 1 : 0), face: 2 })
    c += ww - (rnd() < 0.5 ? 1 : 0)
  }
  mesas.push({ c0: 37, r0: 6, w: 9, top: 1, face: 3 })
  // west and east
  for (const side of [0, 1]) {
    for (let r = 9; r < H - 2; ) {
      const hh = 3 + Math.floor(rnd() * 2)
      const wd = 4 + Math.floor(rnd() * 2)
      mesas.push({ c0: side ? W - wd - (rnd() < 0.4 ? 1 : 0) : -(rnd() < 0.4 ? 1 : 0), r0: r, w: wd, top: hh - 2, face: 2 })
      r += hh + (rnd() < 0.5 ? 0 : 1)
    }
    for (let r = 14 + side * 3; r < H - 8; ) {
      mesas.push({ c0: side ? W - 7 : 4, r0: r, w: 2 + Math.floor(rnd() * 2), top: 1, face: 2 })
      r += 6 + Math.floor(rnd() * 5)
    }
  }
  // south
  for (let c = -3; c < W; ) {
    const ww = 6 + Math.floor(rnd() * 5)
    mesas.push({ c0: c, r0: H - 7 + Math.floor(rnd() * 2), w: ww, top: 4, face: 3 })
    c += ww - 1
  }
  // the lookout: climbable from the south by a stair cut into the face
  const lk: Mesa = { c0: LOOKOUT.c0, r0: LOOKOUT.r0, w: LOOKOUT.w, top: LOOKOUT.top, face: LOOKOUT.face, ramp: LOOKOUT.ramp }
  mesas.push(lk)
  mesas.sort((a, b) => a.r0 + a.top + a.face - (b.r0 + b.top + b.face) || a.r0 - b.r0)
  const owner = new Int16Array(W * H).fill(-1)
  for (const [mi, m] of mesas.entries()) {
    for (let r = m.r0; r < m.r0 + m.top + m.face; r++)
      for (let c = m.c0; c < m.c0 + m.w; c++) {
        if (!inb(c, r)) continue
        owner[idx(c, r)] = mi
        set(w.mesa, c, r)
        w.blocked[idx(c, r)] = 1
        w.tiles[idx(c, r)] = G.Void
      }
  }
  // 3D elevation: per column, from the south going north, each mesa stands on the one in front of it and is as tall as
  // the rows of its painted face that are still visible (later mesas are drawn over earlier ones)
  for (let c = 0; c < W; c++) {
    let level = 0, r = H - 1
    while (r >= 0) {
      const o = owner[idx(c, r)]
      if (o < 0) { level = 0; r--; continue }
      const m = mesas[o]
      let r2 = r, kv = 0
      while (r2 >= 0 && owner[idx(c, r2)] === o) { if (r2 >= m.r0 + m.top) kv++; r2-- }
      level += kv
      for (let q = r2 + 1; q <= r; q++) w.heights[idx(c, q)] = level
      r = r2
    }
  }
  // lookout walkability: surface interior and the stair
  for (let r = lk.r0 + 1; r < lk.r0 + lk.top; r++) for (let c = lk.c0 + 1; c < lk.c0 + lk.w - 1; c++) { w.blocked[idx(c, r)] = 0; w.tiles[idx(c, r)] = G.Floor; w.heights[idx(c, r)] = w.heights[idx(lk.ramp!, lk.r0 + 1)] }
  for (let r = lk.r0 + lk.top; r < lk.r0 + lk.top + lk.face; r++) { w.blocked[idx(lk.ramp!, r)] = 0; w.tiles[idx(lk.ramp!, r)] = G.Dirt; w.heights[idx(lk.ramp!, r)] = (w.heights[idx(lk.ramp!, lk.r0 + 1)]) * (1 - (r - lk.r0 - lk.top + 1) / lk.face) }
  w.ops.push({ z: 30, fn: (g) => { for (const m of mesas) drawMesa(g, m) } })
  w.reserve(LOOKOUT.c0 - 1, LOOKOUT.r0 - 1, LOOKOUT.c0 + LOOKOUT.w, LOOKOUT.r0 + LOOKOUT.top + LOOKOUT.face + 1)
  // map border is always solid
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (c < 3 || r < 3 || c >= W - 3 || r >= H - 3) w.blocked[idx(c, r)] = 1

  // ── dunes ──
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const n = fbm(c * 0.075 + r * 0.025, r * 0.13, 3)
      if (n > 0.5 && !get(w.mesa, c, r)) w.dune[idx(c, r)] = 1
    }
  smooth(w, w.dune, 2)

  // ── the oasis ──
  for (let r = 8; r < 32; r++)
    for (let c = 22; c < 60; c++) {
      const a = Math.atan2(r - LAKE.cy, c - LAKE.cx)
      const wob = 1 + Math.sin(a * 3 + 0.6) * 0.11 + Math.cos(a * 5 + 1) * 0.07
      if (Math.hypot((c - LAKE.cx) / LAKE.rx, (r - LAKE.cy) / LAKE.ry) < wob) w.water[idx(c, r)] = 1
    }
  // stream from the falls
  for (let r = 10; r <= 15; r++) for (let c = 40; c <= 42; c++) w.water[idx(c, r)] = 1
  // small second pool beside the cactus grove
  for (let r = 35; r < 42; r++) for (let c = 13; c < 21; c++) if (Math.hypot((c - 16.5) / 3.6, (r - 38.6) / 2.4) < 1) w.water[idx(c, r)] = 1
  smooth(w, w.water, 2, true)
  for (let i = 0; i < W * H; i++) if (w.water[i]) { w.blocked[i] = 1; w.tiles[i] = G.Water; w.dune[i] = 0 }

  // ── dry riverbed ──
  const bedAt = (c: number, r: number, rad: number) => {
    for (let dr = -Math.ceil(rad); dr <= Math.ceil(rad); dr++)
      for (let dc = -Math.ceil(rad); dc <= Math.ceil(rad); dc++) if (Math.hypot(dc, dr) <= rad && inb(c + dc, r + dr) && !w.mesa[idx(c + dc, r + dr)] && !w.water[idx(c + dc, r + dr)]) w.bed[idx(c + dc, r + dr)] = 1
  }
  for (let k = 0; k < BED_PTS.length - 1; k++) {
    const [x0, y0] = BED_PTS[k], [x1, y1] = BED_PTS[k + 1]
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = x0 + (x1 - x0) * t + Math.sin((k + t) * 2.3) * 1.1, y = y0 + (y1 - y0) * t + Math.cos((k + t) * 1.9) * 0.8
      bedAt(Math.round(x), Math.round(y), 1.7 + hash(k, i, 4) * 0.9)
    }
  }
  smooth(w, w.bed, 2)
  for (let i = 0; i < W * H; i++) if (w.bed[i]) { w.dune[i] = 0; w.tiles[i] = G.Dirt }

  // plank bridge over the bed (north-south)
  for (let r = BRIDGE.r0; r <= BRIDGE.r1; r++) for (let c = BRIDGE.c; c <= BRIDGE.c + 1; c++) if (get(w.bed, c, r)) w.bridge[idx(c, r)] = 1
  for (let r = BRIDGE.r0; r <= BRIDGE.r1; r++) for (let c = BRIDGE.c; c <= BRIDGE.c + 1; c++) if (get(w.bridge, c, r + 1) && !get(w.bridge, c, r) && !w.water[idx(c, r)]) w.bridge[idx(c, r)] = 1

  // ── plaza, arena ring ──
  for (let r = 34; r < 48; r++)
    for (let c = 26; c < 58; c++) {
      const e = Math.hypot((c - 41) / 9.5, (r - 40.5) / 3.9)
      if (e < 1 + Math.sin(c * 0.9) * 0.05 && !w.water[idx(c, r)] && !w.bed[idx(c, r)]) w.lime[idx(c, r)] = 1
    }
  for (let r = 40; r < 63; r++)
    for (let c = 54; c < 80; c++) {
      const e = Math.hypot((c - ARENA.c) / 9.6, (r - ARENA.r) / 6.6)
      const inner = Math.hypot((c - ARENA.c) / 6.4, (r - ARENA.r) / 4)
      if (e < 1 && !w.bed[idx(c, r)] && !w.mesa[idx(c, r)]) { if (inner < 1) { w.dune[idx(c, r)] = 1; w.lime[idx(c, r)] = 0 } else w.lime[idx(c, r)] = 1 }
    }
  // quicksand field is bare packed sand (no dunes) so the swirls read
  for (let r = QUICK.r0 - 1; r <= QUICK.r1 + 1; r++) for (let c = QUICK.c0 - 1; c <= QUICK.c1 + 1; c++) if (inb(c, r)) w.dune[idx(c, r)] = 0
  w.reserve(QUICK.c0, QUICK.r0, QUICK.c1, QUICK.r1)

  // ── roads: cheapest paths over noisy costs ──
  const isFoot = (c: number, r: number) => FOOT.some((f) => c >= f.c0 && c <= f.c1 && r >= f.r0 && r <= f.r1)
  const carve = (sc: number, sr: number, tc: number, tr: number, seed: number) => {
    const N = W * H
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N)
    const heap: number[] = []
    const push = (i: number) => { heap.push(i); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (dist[heap[p]] <= dist[heap[k]]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p } }
    const pop = () => { const t = heap[0], l = heap.pop()!; if (heap.length) { heap[0] = l; let k = 0; for (;;) { const a = 2 * k + 1, b2 = a + 1; let m = k; if (a < heap.length && dist[heap[a]] < dist[heap[m]]) m = a; if (b2 < heap.length && dist[heap[b2]] < dist[heap[m]]) m = b2; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m } } return t }
    const s = idx(sc, sr), goal = idx(tc, tr)
    dist[s] = 0; push(s)
    while (heap.length) {
      const i = pop()
      if (done[i]) continue
      done[i] = 1
      if (i === goal) break
      const c = i % W, r = (i / W) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dx, nr = r + dy
        if (!inb(nc, nr) || w.water[idx(nc, nr)] || w.mesa[idx(nc, nr)] || isFoot(nc, nr)) continue
        const j = idx(nc, nr)
        let cost = 1 + hash(nc, nr, seed) * 1.6
        if (w.path[j] || w.lime[j]) cost = 0.3
        else if (w.bridge[j]) cost = 0.25
        else if (w.bed[j]) cost = 4
        if (w.bridge[idx(c, r)] && dx !== 0) cost += 30
        if (dist[i] + cost < dist[j]) { dist[j] = dist[i] + cost; prev[j] = i; push(j) }
      }
    }
    for (let i = goal; i !== -1; i = prev[i]) { if (!w.bed[i] && !w.bridge[i]) w.path[i] = 1 }
  }
  ROADS.forEach(([a, b, c, d], i) => carve(a, b, c, d, i + 11))
  // widen irregularly, then plug 1-tile specks
  for (let pass = 0; pass < 2; pass++) {
  const widen: number[] = []
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) if (w.path[idx(c, r)]) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const j = idx(c + dx, r + dy); if (!w.path[j] && !w.water[j] && !w.mesa[j] && !w.bed[j] && !isFoot(c + dx, r + dy) && hash(c, r, 21) < 0.9) widen.push(j) }
  for (const j of widen) w.path[j] = 1
  }
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) if (!w.path[idx(c, r)] && !w.water[idx(c, r)] && !w.mesa[idx(c, r)] && !isFoot(c, r)) {
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => w.path[idx(c + dx, r + dy)]).length
    if (n >= 3) w.path[idx(c, r)] = 1
  }
  for (let i = 0; i < W * H; i++) if (w.path[i] && w.tiles[i] === G.Grass) w.tiles[i] = G.Dirt
  for (let i = 0; i < W * H; i++) if (w.lime[i] && w.tiles[i] === G.Grass) w.tiles[i] = G.Plaza
  for (let i = 0; i < W * H; i++) if (w.bridge[i]) w.tiles[i] = G.Bridge
}

/** cellular smoothing so every region is a chunky blob the autotile can edge cleanly */
function smooth(w: World, a: Uint8Array, passes: number, strict = false) {
  const { W, H, idx } = w
  for (let p = 0; p < passes; p++) {
    const next = a.slice()
    for (let r = 1; r < H - 1; r++)
      for (let c = 1; c < W - 1; c++) {
        let n = 0
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && a[idx(c + dc, r + dr)]) n++
        if (a[idx(c, r)]) {
          const v = a[idx(c, r - 1)] || a[idx(c, r + 1)], h = a[idx(c - 1, r)] || a[idx(c + 1, r)]
          if (n < 3 || (strict && (!v || !h))) next[idx(c, r)] = 0
        } else if (n >= 5) next[idx(c, r)] = 1
      }
    a.set(next)
  }
}

// ── ground render + scene ───────────────────────────────────────
function finish(w: World): Scene {
  const { W, H, idx } = w
  const { c: gcv, ctx: g } = canvas(W * TS, H * TS)
  const flo = ds("floor"), wat = ds("water")
  const get = (a: Uint8Array, c: number, r: number, edge = 0) => (c < 0 || r < 0 || c >= W || r >= H ? edge : a[idx(c, r)])
  const layer = (mask: Uint8Array, at: Autotile, src: HTMLImageElement, edge = 0) => {
    const ins = (c: number, r: number) => !!get(mask, c, r, edge)
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (mask[idx(c, r)]) blit(g, src, autotile(at, ins, c, r), c * TS, r * TS)
  }
  // base: dark sand with the odd tuft
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) blit(g, flo, SAND_BASE[Math.floor(hash(c, r, 1) * SAND_BASE.length)], c * TS, r * TS)
  layer(w.dune, DUNE, flo)
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (w.bed[idx(c, r)]) blit(g, flo, MUD_BASE[Math.floor(hash(c, r, 2) * MUD_BASE.length)], c * TS, r * TS)
  layer(w.bed, MUD_BED, flo)
  layer(w.path, PATH_SAND, flo)
  layer(w.lime, LIME, flo)
  layer(w.water, OASIS, wat, 0)
  // bridge planks
  const isB = (c: number, r: number) => !!get(w.bridge, c, r)
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (w.bridge[idx(c, r)]) {
    const u = isB(c, r - 1), d = isB(c, r + 1), l = isB(c - 1, r), rt = isB(c + 1, r)
    const p = !u ? (!l ? PLANK.tl : !rt ? PLANK.tr : PLANK.t) : !d ? (!l ? PLANK.bl : !rt ? PLANK.br : PLANK.b) : (!l ? PLANK.l : !rt ? PLANK.r : PLANK.c)
    blit(g, wat, p, c * TS, r * TS)
  }
  for (const op of w.ops.sort((a, b) => a.z - b.z)) op.fn(g)

  const QUEST: Record<string, string> = {
    townhall: "Meet the elder in the Caravanserai", gallery: "Browse the Hall of Relics", tavern: "Read the board at the Oasis Teahouse", forge: "Inspect the Sand Forge",
    academy: "Study the stars at the Observatory", wizard: "Send word by falcon from the Falcon Post", arcade: "Try your luck in the Sand Arena",
  }
  const landmarks: Landmark[] = ["townhall", "gallery", "tavern", "forge", "academy", "wizard"].map((id) => {
    const d = w.doors.find((q) => q.id === id)!
    return { id, label: d.label, sub: d.sub, accent: d.accent, x: d.x, y: d.y + 2, quest: QUEST[id] }
  })
  landmarks.push({ id: "arcade", label: "SAND ARENA", sub: "ARCADE", accent: "#d9a83a", x: ARENA.c * TS + 8, y: ARENA.r * TS + 20, quest: QUEST.arcade })
  const water: { c: number; r: number }[] = []
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) if (w.water[idx(c, r)] && w.water[idx(c - 1, r)] && w.water[idx(c + 1, r)] && w.water[idx(c, r - 1)] && w.water[idx(c, r + 1)] && hash(c, r, 50) < 0.5) water.push({ c, r })
  return {
    id: "desert", title: "Sunscar Oasis", w: W, h: H, ground: gcv, sprites: w.sprites, blocked: w.blocked, hotspots: w.hotspots, actors: w.actors, lights: w.lights,
    spawn: { x: SPAWN.c * TS + 8, y: SPAWN.r * TS + 8, facing: "down" }, dark: 0, music: "desert", water, bg: "#c98a4a",
    tiles: w.tiles, heights: w.heights, ground3d: gcv, baked: [], outdoor: true, world: "desert", signs: w.signs, landmarks, arrive: { x: TRAVEL.c * TS + 64, y: (TRAVEL.r + 2) * TS + 12, facing: "right" },
    tick: (t, dt) => { for (const f of w.tickers) f(t, dt) },
  }
}

export const DESERT_PRELOAD: string[] = [
  ...Object.values(DS),
  charSheet(CHARS.hero),
  ...["Caveman", "GoldKnight", "OldMan2", "Cavegirl2", "SorcererOrange", "Monk2", "LionBoy", "Cavegirl", "Child", "Boy", "OldWoman", "Samurai", "Monk"].flatMap((n) => [charSheet(n), charFace(n)]),
  ...["cow", "racoon", "monkey", "cat", "frog"].map(animalSheet),
  ...["Snake", "Lizard", "Reptile", "Mole"].map(monsterSheet),
]

// ── landmark art ────────────────────────────────────────────────
/** a stepped sandstone ziggurat with a glowing relic door */
function pyramidCanvas() {
  const { c, ctx: g } = canvas(112, 80)
  const OUT = "#2a1810", TOP = "#f6e8c6", LITE = "#ead3a2", MID = "#d9b27a", DARK = "#b88a58", DEEP = "#8a5f3c"
  const tier = (inset: number, y: number, topH: number, faceH: number) => {
    const x = inset, w = 112 - inset * 2
    g.fillStyle = OUT; g.fillRect(x - 1, y - 1, w + 2, topH + faceH + 2)
    g.fillStyle = TOP; g.fillRect(x, y, w, topH)
    g.fillStyle = LITE; g.fillRect(x, y + topH, w, faceH)
    g.fillStyle = MID; g.fillRect(x + (w >> 1), y + topH, w >> 1, faceH)
    g.fillStyle = DARK; g.fillRect(x + w - 6, y + topH, 6, faceH)
    g.fillStyle = DEEP; g.fillRect(x, y + topH + faceH - 2, w, 2)
    g.fillStyle = "rgba(90,50,24,.35)"
    for (let yy = y + topH + 5; yy < y + topH + faceH - 2; yy += 6) g.fillRect(x, yy, w, 1)
    for (let yy = y + topH, k = 0; yy < y + topH + faceH - 2; yy += 6, k++) for (let xx = x + 4 + (k % 2) * 5; xx < x + w; xx += 10) g.fillRect(xx, yy, 1, 6)
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x, y, w, 1)
  }
  tier(0, 52, 4, 24)
  tier(13, 36, 4, 12)
  tier(26, 22, 4, 10)
  tier(38, 10, 4, 8)
  // central stair
  g.fillStyle = OUT; g.fillRect(48, 20, 16, 38)
  g.fillStyle = "#f1deb0"; g.fillRect(49, 20, 14, 38)
  g.fillStyle = "#c79a64"; for (let y = 22; y < 58; y += 4) g.fillRect(49, y, 14, 1)
  // capstone with a golden pyramidion
  g.fillStyle = OUT; g.fillRect(50, 0, 12, 11); g.fillStyle = "#ffd76a"; g.fillRect(51, 1, 10, 9); g.fillStyle = "#fff0a8"; g.fillRect(52, 1, 3, 8); g.fillStyle = "#d9a83a"; g.fillRect(58, 3, 3, 7)
  // doorway with a pale-blue glow
  g.fillStyle = OUT; g.fillRect(44, 56, 24, 24)
  g.fillStyle = "#1a1030"; g.fillRect(46, 60, 20, 20); g.fillRect(48, 58, 16, 2)
  g.fillStyle = "#3b2d6b"; g.fillRect(49, 62, 14, 18)
  g.fillStyle = "#7fe3ff"; g.fillRect(52, 66, 8, 14); g.fillStyle = "#dff9ff"; g.fillRect(54, 68, 4, 12)
  // gold inlay along the bottom tier
  g.fillStyle = "#e6b84a"; for (let x = 6; x < 106; x += 8) if (x < 40 || x > 70) g.fillRect(x, 62, 4, 2)
  g.fillStyle = "#2f8fb5"; for (let x = 10; x < 102; x += 16) if (x < 40 || x > 70) g.fillRect(x, 68, 3, 3)
  return c
}

function telescopeCanvas() {
  const { c, ctx: g } = canvas(24, 22)
  g.fillStyle = "#2a1606"; g.fillRect(11, 12, 2, 10); g.fillRect(6, 20, 12, 2); g.fillRect(8, 15, 2, 7); g.fillRect(14, 15, 2, 7)
  g.save(); g.translate(12, 11); g.rotate(-0.7)
  g.fillStyle = "#2a1606"; g.fillRect(-12, -3, 22, 6)
  g.fillStyle = "#e0b04a"; g.fillRect(-11, -2, 20, 4); g.fillStyle = "#fff0a8"; g.fillRect(-11, -2, 20, 1)
  g.fillStyle = "#5a3a1a"; g.fillRect(-12, -3, 3, 6); g.fillStyle = "#7fe3ff"; g.fillRect(9, -2, 2, 4)
  g.restore()
  return c
}
function anvilCanvas() {
  return bitmap([
    "..oooooooooo..", ".owwwwwwwwwwoo", "oowwggggwwwwwo", "..oowwwwwoo...", "....owwwwo....", "...oowwwwoo...", "..oggggggggo..", "..oooooooooo..",
  ], { o: "#1c1a20", w: "#8c8f9a", g: "#c9ccd6" })
}
function falconCanvas() {
  const mk = (up: boolean) => bitmap(up
    ? ["o.....o", "oo...oo", ".ooboo.", "..obbo.", "...oy..", "....o.."] : [".......", ".ooboo.", "ooobbo.", "o.obbo.", "..oyo..", "...o..."],
  { o: "#3a2412", b: "#b07a46", y: "#ffd76a" })
  const { c, ctx } = canvas(16, 6)
  ctx.drawImage(mk(true), 0, 0); ctx.drawImage(mk(false), 8, 0)
  return c
}
function tumbleCanvas() {
  const { c, ctx } = canvas(48, 12)
  for (let f = 0; f < 4; f++) {
    ctx.save(); ctx.translate(f * 12 + 6, 6); ctx.rotate((f * Math.PI) / 8)
    ctx.strokeStyle = "#7a4a22"; ctx.lineWidth = 1
    for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(0, 0, 5 - (k % 2), 2 + (k % 3), (k * Math.PI) / 7, 0, Math.PI * 2); ctx.stroke() }
    ctx.fillStyle = "#c79a5a"; ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
  return c
}
function rugCanvas(w: number, h: number, a: string, b: string, trim: string) {
  const { c, ctx } = canvas(w, h)
  ctx.fillStyle = "#3a1c10"; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = trim; ctx.fillRect(1, 1, w - 2, h - 2)
  ctx.fillStyle = a; ctx.fillRect(2, 2, w - 4, h - 4)
  ctx.fillStyle = b
  for (let x = 4; x < w - 5; x += 5) { ctx.fillRect(x, (h >> 1) - 1, 3, 3); ctx.fillRect(x + 1, (h >> 1) - 2, 1, 5) }
  ctx.fillStyle = trim; for (let x = 1; x < w - 1; x += 2) { ctx.fillRect(x, 0, 1, 1); ctx.fillRect(x, h - 1, 1, 1) }
  return c
}
function ribCanvas() {
  const { c, ctx } = canvas(48, 36)
  const O = "#3a2a1a", B = "#f3e9d0", S = "#c9b48c"
  ctx.fillStyle = O; ctx.fillRect(4, 30, 40, 3); ctx.fillStyle = B; ctx.fillRect(5, 30, 38, 2)
  for (let i = 0; i < 5; i++) {
    const x = 6 + i * 8, hh = 22 - Math.abs(i - 2) * 3
    ctx.fillStyle = O; ctx.fillRect(x, 30 - hh, 3, hh); ctx.fillRect(x + 3, 30 - hh, 2, 2); ctx.fillRect(x + 2, 29 - hh, 3, 2)
    ctx.fillStyle = B; ctx.fillRect(x + 1, 31 - hh, 1, hh - 1); ctx.fillStyle = S; ctx.fillRect(x + 2, 32 - hh, 1, hh - 2)
  }
  ctx.fillStyle = O; ctx.fillRect(40, 22, 8, 9); ctx.fillStyle = B; ctx.fillRect(41, 23, 6, 7); ctx.fillStyle = O; ctx.fillRect(43, 25, 2, 2)
  return c
}

// ── dressing, landmarks, life ───────────────────────────────────
function build(w: World, content?: Portfolio) {
  const { W, H, idx, inb, rnd } = w
  const flo = ds("floor")
  const desertImg = ds("desert"), houseImg = ds("house"), natureImg = img("/na/tiles/TilesetNature.png"), elem = ds("element"), fd = ds("floorDetail")
  const free = (c: number, r: number) => inb(c, r) && !w.blocked[idx(c, r)] && !w.reserved[idx(c, r)] && !w.path[idx(c, r)] && !w.water[idx(c, r)] && !w.bed[idx(c, r)] && !w.lime[idx(c, r)] && !w.mesa[idx(c, r)]
  const freeArea = (c: number, r: number, rad: number) => { for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) if (!free(c + dc, r + dr)) return false; return true }
  const rect = (c0: number, r0: number, c1: number, r1: number, v = 1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inb(c, r)) w.reserved[idx(c, r)] = v }

  // dune shading, wind ripples, tufts, bones: ground decals
  w.ops.push({ z: 25, fn: (g) => {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (w.dune[idx(c, r)] && inb(c, r + 1) && !w.dune[idx(c, r + 1)] && !w.mesa[idx(c, r + 1)]) {
      g.fillStyle = "rgba(170,70,25,.16)"; g.fillRect(c * TS + 1, r * TS + 15, 14, 3)
      g.fillStyle = "rgba(170,70,25,.08)"; g.fillRect(c * TS + 3, r * TS + 18, 10, 2)
    }
  } })
  w.ops.push({ z: 26, fn: (g) => {
    for (let r = 3; r < H - 3; r++) for (let c = 3; c < W - 3; c++) {
      const i = idx(c, r)
      if (w.water[i] || w.mesa[i] || w.lime[i] || w.bridge[i]) continue
      const v = hash(c, r, 61)
      const x = c * TS + (hash(c, r, 62) - 0.5) * 8, y = r * TS + (hash(c, r, 63) - 0.5) * 8
      if (v < (w.dune[i] ? 0.1 : 0.05)) blit(g, fd, [[16 * 4, 0, 16, 16], [16 * 5, 0, 16, 16], [16 * 6, 0, 16, 16], [16 * 7, 0, 16, 16], [16 * 8, 0, 16, 16]][Math.floor(hash(c, r, 64) * 5)] as Rect, x, y)
      else if (v < 0.08 && !w.bed[i]) blit(g, fd, [0, 0, 16, 16], x, y)
      else if (v < 0.095 && !w.bed[i] && !w.path[i]) blit(g, fd, [[16 * 14, 0, 16, 16], [16 * 15, 0, 16, 16], [16 * 13, 0, 16, 16]][Math.floor(hash(c, r, 65) * 3)] as Rect, x, y)
    }
    // green tufts hugging the water
    for (let r = 3; r < H - 3; r++) for (let c = 3; c < W - 3; c++) {
      const i = idx(c, r)
      if (w.water[i] || w.mesa[i] || w.lime[i] || w.path[i]) continue
      let near = false
      for (let dr = -1; dr <= 1 && !near; dr++) for (let dc = -1; dc <= 1; dc++) if (w.water[idx(c + dc, r + dr)]) { near = true; break }
      if (near && hash(c, r, 66) < 0.45) blit(g, fd, [[16 * 0, 32, 16, 16], [16 * 3, 32, 16, 16], [16 * 6, 32, 16, 16], [16 * 7, 32, 16, 16], [16 * 5, 32, 16, 16]][Math.floor(hash(c, r, 67) * 5)] as Rect, c * TS, r * TS - 2)
    }
  } })
  w.ops.push({ z: 24, fn: (g) => {
    g.fillStyle = "rgba(255,196,120,.34)"
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (w.lime[idx(c, r)]) g.fillRect(c * TS, r * TS, TS, TS)
  } })
  w.ops.push({ z: 32, fn: (g) => {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (w.mesa[idx(c, r)] && inb(c, r + 1) && !w.mesa[idx(c, r + 1)]) {
      g.fillStyle = "rgba(110,40,15,.3)"; g.fillRect(c * TS, (r + 1) * TS, TS, 4)
      g.fillStyle = "rgba(110,40,15,.14)"; g.fillRect(c * TS, (r + 1) * TS + 4, TS, 4)
    }
  } })
  // plaza mosaic: a sun painted into the paving
  w.ops.push({ z: 27, fn: (g) => {
    const cx = 41 * TS + 8, cy = 40.5 * TS + 4
    g.save(); g.translate(cx, cy); g.scale(1, 0.5)
    for (const [rad, col, lw] of [[78, "#d9b27a", 3], [70, "#4f9ac0", 2], [62, "#d9b27a", 1]] as [number, string, number][]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.stroke() }
    g.fillStyle = "#e0a85a"; for (let k = 0; k < 16; k++) { g.save(); g.rotate((k * Math.PI) / 8); g.beginPath(); g.moveTo(14, -3); g.lineTo(52, 0); g.lineTo(14, 3); g.fill(); g.restore() }
    g.fillStyle = "#4f9ac0"; g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill()
    g.fillStyle = "#ffd76a"; g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill()
    g.fillStyle = "#fff0a8"; g.beginPath(); g.arc(-2, -2, 4, 0, Math.PI * 2); g.fill()
    g.restore()
  } })

  const prop = (name: string, c: number, r: number, extra: Partial<Sprite> = {}, dx = 0, dy = 0) => {
    const p = PROPS[name] ?? HOUSE_PROPS[name]
    const src = PROPS[name] ? elem : houseImg
    const [, , ww, hh] = p.rect
    const s = w.spr(src, p.rect, c * TS + dx, r * TS + dy, { baseY: r * TS + dy + hh - 1, solid: p.solid ? { x: c * TS + dx + 2, y: r * TS + dy + hh - Math.min(10, hh), w: ww - 4, h: Math.min(8, hh - 2) } : undefined, ...extra })
    rect(c, r, c + Math.ceil(ww / TS) - 1, r + Math.ceil(hh / TS) - 1)
    return s
  }
  const lampPost = (c: number, r: number, col = "255,190,100", rad = 60) => {
    prop("lantern", c, r - 1)
    w.lamp(c * TS + 8, r * TS - 6, rad, col)
  }
  const solidAt = (x: number, y: number, ww: number, hh: number) => w.solid(Math.round(x), Math.round(y), ww, hh)

  // ── waterfall off the north cliff ──
  const FALL_C = 40
  for (let c = FALL_C; c <= FALL_C + 1; c++) {
    w.spr(ds("fallTop"), [0, 0, 16, 16], c * TS, 3 * TS, { baseY: 3 * TS + 1000 - 1000 + 10, anim: { frames: 5, fps: 8, dx: 16 } })
    for (let r = 4; r <= 9; r++) w.spr(ds("fallMid"), [0, 0, 16, 16], c * TS, r * TS, { baseY: r * TS + 6, anim: { frames: 5, fps: 8, dx: 16 } })
    w.spr(ds("fallBot"), [0, 0, 16, 16], c * TS, 10 * TS, { baseY: 10 * TS + 14, anim: { frames: 3, fps: 6, dx: 16 } })
  }
  w.lamp(41 * TS, 11 * TS, 70, "130,210,255", 0.4)
  rect(38, 9, 44, 15)

  // ── palms ring the lake ──
  const palm = (c: number, r: number, k: "A" | "B" = rnd() < 0.5 ? "A" : "B") => {
    const rc = k === "A" ? DP.palmA : DP.palmB
    const x = c * TS + 8, y = r * TS + 15
    w.spr(desertImg, rc, x - 16, y - 31, { baseY: y, solid: { x: x - 3, y: y - 5, w: 6, h: 5 }, sway: 0.5 })
    rect(c, r, c, r)
  }
  for (let k = 0; k < 44; k++) {
    const a = (k / 44) * Math.PI * 2 + hash(k, 1, 2) * 0.12
    const c = Math.round(LAKE.cx + Math.cos(a) * (LAKE.rx + 2.2 + hash(k, 2, 2) * 1.8)), r = Math.round(LAKE.cy + Math.sin(a) * (LAKE.ry + 2 + hash(k, 3, 2) * 1.6))
    if (free(c, r) && free(c, r - 1)) palm(c, r)
  }
  // grand palm groves
  for (const [c, r, k] of [[31, 24, "q"], [50, 24, "t"], [20, 28, "t"], [60, 24, "q"]] as [number, number, string][]) {
    const x = c * TS + 8, y = r * TS + 15
    if (!free(c, r)) continue
    w.spr(desertImg, k === "q" ? DP.palmQuad : DP.palmTriple, x - 32, y - 47, { baseY: y, solid: { x: x - 12, y: y - 6, w: 24, h: 6 } })
    rect(c - 1, r, c + 1, r)
  }

  // ── landmarks ──
  const doors = w.doors
  const landmark = (id: string, src: Img, srcRect: Rect, x: number, y: number, door: [number, number], solidTop: number, label: string, sub: string, accent: string, glow = "255,200,120") => {
    const [, , bw, bh] = srcRect
    const dxc = x + (door[0] + door[1]) / 2, dyb = y + bh
    w.spr(src, srcRect, x, y, { baseY: y + bh - 2, solid: { x: x + 2, y: y + solidTop, w: bw - 4, h: bh - solidTop - 3 }, tag: `b:${id}` })
    w.hotspots.push({ id: `door-${id}`, box: { x: dxc - 12, y: dyb - 6, w: 24, h: 18 }, label: `ENTER ${label}`, action: { type: "section", id }, marker: true, markerX: dxc, markerY: y - 6 })
    w.signs.push({ x: dxc, y: y - 2, label, sub, accent, hotspot: `door-${id}` })
    w.lamp(dxc, dyb - 8, 38, glow, 0.6)
    rect(Math.floor(x / TS) - 1, Math.floor(y / TS), Math.ceil((x + bw) / TS), Math.floor(dyb / TS) + 1)
    doors.push({ id, label, sub, accent, x: dxc, y: dyb, top: y, section: id })
    return { x: dxc, y: dyb }
  }
  const pennant = (x: number, y: number, color: string, trim: string, emblem: Parameters<typeof banner>[2]) => {
    const b = banner(color, trim, emblem)
    w.spr(b, [0, 0, 14, 34], x - 7, y - 34, { baseY: y, solid: { x: x - 2, y: y - 4, w: 4, h: 4 } })
  }

  // CARAVANSERAI: the chief's great hall (about)
  const cv = landmark("townhall", desertImg, DESERT_ART.longHouse.rect, 36 * TS, 31 * TS, DESERT_ART.longHouse.door, 22, "CARAVANSERAI", "ABOUT", "#5b8fd6")
  pennant(cv.x - 22, cv.y + 2, "#c8463b", "#ffd76a", "sun"); pennant(cv.x + 22, cv.y + 2, "#c8463b", "#ffd76a", "sun")
  prop("crates", 40, 33, {}, 0, 18); prop("barrel", 36, 35, {}, -4, 4); prop("jar", 42, 35, {}, 4, 6)
  w.spr(desertImg, DP.basketRed, 43 * TS - 6, 35 * TS + 2, { baseY: 35 * TS + 16 }); w.spr(desertImg, DP.basketYellow, 34 * TS + 6, 35 * TS + 4, { baseY: 35 * TS + 17 })
  lampPost(35, 37); lampPost(43, 37)

  // HALL OF RELICS (projects)
  const gx = 52 * TS, gy = 29 * TS
  const gl = landmark("gallery", pyramidCanvas(), [0, 0, 112, 80], gx, gy, [44, 68], 30, "HALL OF RELICS", "PROJECTS", "#9a7be0", "140,220,255")
  w.lights.push({ x: gx + 56, y: gy + 72, r: 54, color: "120,210,255", flicker: 0.5 })
  w.spr(desertImg, DP.lion, gx - 30, gy + 36, { baseY: gy + 80, solid: { x: gx - 28, y: gy + 66, w: 26, h: 12 } })
  w.spr(desertImg, DP.lion, gx + 112 - 2, gy + 36, { baseY: gy + 80, flip: true, solid: { x: gx + 112, y: gy + 66, w: 26, h: 12 } })
  pennant(gl.x - 36, gl.y + 4, "#7a4fd0", "#ffd76a", "scroll"); pennant(gl.x + 36, gl.y + 4, "#7a4fd0", "#ffd76a", "scroll")
  prop("brazier", 51, 35, { glow: { x: 8, y: 6, r: 40, color: "255,150,60" } }); prop("brazier", 59, 35, { glow: { x: 8, y: 6, r: 40, color: "255,150,60" } })
  w.lamp(51 * TS + 8, 35 * TS + 6, 62, "255,150,70", 1.4); w.lamp(59 * TS + 8, 35 * TS + 6, 62, "255,150,70", 1.4)

  // AVENUE OF RELICS: every project carved into a stele south of the hall. Featured work stands nearest the door.
  {
    const projects = ordered(content?.projects ?? [])
    const X0 = gl.x, Y0 = gl.y
    // sandstone paving down the middle, a gold line inlaid
    w.ops.push({ z: 28, fn: (g) => {
      const x0 = X0 - 26, y0 = Y0, len = 330
      g.fillStyle = "#8a5e34"; g.fillRect(x0 - 2, y0, 56, len)
      for (let yy = 0; yy < len; yy += 8) for (let xx = 0; xx < 52; xx += 13) {
        const o = (yy / 8) % 2 ? 6 : 0
        g.fillStyle = hash(xx + yy, yy, 9) < 0.5 ? "#d9b27a" : "#e6c28a"; g.fillRect(x0 + xx + o - (o && xx + o > 39 ? 13 : 0), y0 + yy, 12, 7)
      }
      g.fillStyle = "#f4c430"; g.fillRect(X0 - 1, y0, 2, len)
      g.fillStyle = "#b07d14"; for (let yy = 4; yy < len; yy += 16) g.fillRect(X0 - 3, y0 + yy, 6, 1)
    } })
    const solids = w.sprites.filter((q) => q.solid).map((q) => q.solid!)
    const hits = (bx: number, by: number, bw: number, bh: number) => solids.some((b) => bx < b.x + b.w && bx + bw > b.x && by < b.y + b.h && by + bh > b.y)
    const slotFree = (cx: number, fy: number, sw: number) => {
      const x0 = cx - sw / 2, y0 = fy - 14
      if (hits(x0, y0, sw, 14)) return false
      for (let r = Math.floor(y0 / TS); r <= Math.floor(fy / TS); r++) for (let c = Math.floor(x0 / TS); c <= Math.floor((x0 + sw) / TS); c++)
        if (!inb(c, r) || w.blocked[idx(c, r)] || w.water[idx(c, r)] || w.mesa[idx(c, r)] || w.bed[idx(c, r)] || w.reserved[idx(c, r)]) return false
      return true
    }
    // slots: staggered rows below the door, nearest the aisle first
    const slots: { cx: number; fy: number }[] = []
    for (let k = 0; k < 8; k++) {
      const fy = Y0 + 64 + k * 62, offs = (k % 2 ? [-84, 84, -152, 152, -220, 220, -288, 288, -356, 356, -424, 424] : [-50, 50, -118, 118, -186, 186, -254, 254, -322, 322, -390, 390])
      for (const o of offs) slots.push({ cx: X0 + o, fy })
    }
    let placed = 0
    const torch = (x: number, y: number) => {
      w.spr(elem, PROPS.brazier.rect, x - 8, y - 16, { baseY: y, glow: { x: 8, y: 6, r: 40, color: "255,150,60" }, solid: { x: x - 6, y: y - 6, w: 12, h: 6 } })
      w.lamp(x, y - 12, 56, "255,160,70", 1.4)
    }
    for (const sl of slots) {
      if (placed >= projects.length) break
      const p = projects[placed]
      const great = !!p.featured
      const cv = stele(p, great ? "great" : "tablet", 0.75)
      if (!slotFree(sl.cx, sl.fy, cv.width - 8)) continue
      placed++
      const x = Math.round(sl.cx - cv.width / 2), y = sl.fy - cv.height
      w.spr(cv, [0, 0, cv.width, cv.height], x, y, { baseY: sl.fy, solid: { x: x + 6, y: sl.fy - 10, w: cv.width - 12, h: 10 } })
      rect(Math.floor((x + 4) / TS), Math.floor((sl.fy - 14) / TS), Math.floor((x + cv.width - 4) / TS), Math.floor(sl.fy / TS) + 1)
      w.hotspots.push({ id: `relic-${p.id}`, box: { x: sl.cx - 22, y: sl.fy - 2, w: 44, h: 20 }, label: `VIEW ${p.title.toUpperCase()}`, action: { type: "section", id: "gallery", focus: p.id }, marker: true, markerX: sl.cx, markerY: y - 4 })
      w.lamp(sl.cx, sl.fy - cv.height * 0.55, great ? 66 : 54, great ? "255,206,120" : "255,190,110", 0.8)
      if (!great && placed % 3 === 0) {
        const cn = canopy(cv.width + 14, p.accent)
        w.spr(cn, [0, 0, cn.width, cn.height], x - 7, y - 24, { baseY: sl.fy + 2 })
        torch(x - 10, sl.fy + 4); torch(x + cv.width + 10, sl.fy + 4)
      } else if (great && placed % 2 === 1) { torch(x + cv.width + 6, sl.fy + 2) }
    }
    if (placed < projects.length) {
      const left = projects.length - placed
      const sx = X0 + 40, sy = Y0 + 20
      w.hotspots.push({ id: "relic-more", box: { x: sx - 16, y: sy - 2, w: 32, h: 20 }, label: "READ THE PLAQUE", action: { type: "sign", lines: [`${left} more relic${left > 1 ? "s" : ""} rest inside the Hall.`, "Step through the glowing door to see every project."] }, marker: true, markerX: sx, markerY: sy - 28 })
      w.spr(elem, PROPS.redSign.rect, sx - 8, sy - 12, { baseY: sy + 4, solid: { x: sx - 6, y: sy, w: 12, h: 4 } })
    }
  }

  // OASIS TEAHOUSE (experience)
  const th = landmark("tavern", desertImg, DESERT_ART.awningHouse.rect, 24 * TS, 18 * TS, DESERT_ART.awningHouse.door, 24, "OASIS TEAHOUSE", "EXPERIENCE", "#e09a3a", "255,190,110")
  pennant(th.x + 30, th.y + 2, "#2f8f6f", "#ffe9a8", "cup")
  w.spr(desertImg, DP.clothGreen, 21 * TS, 22 * TS + 2, { baseY: 22 * TS + 30 })
  for (const [c, r] of [[22, 24], [27, 24], [29, 22]] as [number, number][]) { prop("redTable", c, r); prop("stool", c, r + 1, {}, 0, 2) }
  w.spr(rugCanvas(48, 22, "#2f8f9f", "#ffd76a", "#e0a85a"), [0, 0, 48, 22], 24 * TS + 8, 24 * TS + 4, { baseY: 20 })
  lampPost(23, 23, "255,190,110"); lampPost(30, 24, "255,190,110")

  // SAND FORGE (skills)
  const fg = landmark("forge", houseImg, [368, 0, 48, 48], 22 * TS, 32 * TS, [16, 31], 20, "SAND FORGE", "SKILLS", "#e2683a", "255,150,70")
  w.spr(anvilCanvas(), [0, 0, 14, 8], 26 * TS + 2, 35 * TS + 2, { baseY: 35 * TS + 10, solid: { x: 26 * TS + 2, y: 35 * TS + 4, w: 14, h: 6 } })
  prop("barrel", 20, 34); prop("logs", 20, 36); prop("waterBucket", 27, 36)
  prop("brazier", 25, 36, { glow: { x: 8, y: 6, r: 50, color: "255,120,50" } })
  w.lamp(25 * TS + 8, 36 * TS + 6, 78, "255,120,50", 1.6); w.lamp(23 * TS + 8, 32 * TS + 6, 50, "255,150,60", 1.2)
  w.spr(ds("smoke"), [0, 0, 32, 32], 23 * TS - 4, 29 * TS - 10, { baseY: 33 * TS, anim: { frames: 6, fps: 5, dx: 32 } })
  pennant(fg.x - 26, fg.y + 2, "#c8553a", "#ffd76a", "anvil")

  // STAR OBSERVATORY (education & honours)
  const ob = landmark("academy", recolourGreen(desertImg, DESERT_ART.tower.rect, 232, 1.1, 0.78), [0, 0, 48, 80], 61 * TS, 11 * TS, DESERT_ART.tower.door, 34, "STAR OBSERVATORY", "EDUCATION", "#3fb3a6", "170,200,255")
  w.spr(telescopeCanvas(), [0, 0, 24, 22], 65 * TS + 4, 15 * TS - 6, { baseY: 15 * TS + 12, solid: { x: 65 * TS + 8, y: 15 * TS + 6, w: 12, h: 6 } })
  pennant(ob.x + 30, ob.y + 2, "#2d3f9a", "#ffd76a", "star"); pennant(ob.x - 30, ob.y + 2, "#2d3f9a", "#ffd76a", "star")
  w.lights.push({ x: ob.x, y: 11 * TS + 14, r: 60, color: "150,180,255", flicker: 0.4 })
  prop("scrolls", 59, 16); prop("crate", 66, 16)

  // FALCON POST (contact)
  const fp = landmark("wizard", recolourGreen(desertImg, DESERT_ART.dome.rect, 188, 1, 1), [0, 0, 48, 48], 53 * TS, 19 * TS, DESERT_ART.dome.door, 20, "FALCON POST", "CONTACT", "#8e66e8", "255,214,150")
  pennant(fp.x + 30, fp.y + 2, "#8e66e8", "#fff1c8", "feather")
  for (const px of [52 * TS + 4, 57 * TS + 2]) { w.spr(bitmap(["oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo"], { o: "#6a4020" }), [0, 0, 2, 12], px, 20 * TS + 4, { baseY: 21 * TS + 8 }); w.spr(bitmap(["..oooooo.."], { o: "#6a4020" }), [0, 0, 10, 1], px - 4, 20 * TS + 4, { baseY: 21 * TS + 9 }) }
  w.spr(falconCanvas(), [0, 0, 8, 6], 52 * TS - 2, 20 * TS - 2, { baseY: 21 * TS + 9 }); w.spr(falconCanvas(), [8, 0, 8, 6], 57 * TS - 2, 20 * TS - 2, { baseY: 21 * TS + 9, flip: true })
  // circling falcons
  const wings = falconCanvas()
  const birds = [0, 1, 2].map((i) => ({ s: w.spr(wings, [0, 0, 8, 6], 0, 0, { baseY: 99999, dynamic: true }), ph: i * 2.1, rad: 36 + i * 14 }))
  w.tickers.push((t) => { for (const b of birds) { const a = t * 0.5 + b.ph; b.s.x = Math.round(fp.x + Math.cos(a) * b.rad); b.s.y = Math.round(fp.y - 64 + Math.sin(a * 1.3) * 14); b.s.rect = [Math.floor(t * 6 + b.ph) % 2 ? 8 : 0, 0, 8, 6]; b.s.flip = Math.sin(a) > 0 } })

  // SAND ARENA: four altars, four games
  const AC = ARENA.c, AR = ARENA.r
  for (let k = 0; k < 3; k++) w.spr(desertImg, DP.wall, (AC - 4.5) * TS + k * 48 - 4, (AR - 7) * TS + 8, { baseY: (AR - 7) * TS + 30, solid: { x: (AC - 4.5) * TS + k * 48 - 4, y: (AR - 7) * TS + 30, w: 48, h: 20 } })
  const games: [string, string, Rect, string][] = [
    ["serpent", "SERPENT", [64, 32, 16, 16], "120,200,255"], ["runes", "RUNE RECALL", [80, 32, 16, 16], "230,230,255"],
    ["quickdraw", "QUICKDRAW", [96, 32, 16, 16], "255,110,80"], ["slimes", "SLIME SMASH", [112, 32, 16, 16], "255,190,80"],
  ]
  games.forEach(([id, label, rc, col], i) => {
    const c = AC - 5 + i * 3, r = AR - 3
    w.spr(ds("dungeon"), rc, c * TS, r * TS, { baseY: r * TS + 15, solid: { x: c * TS + 1, y: r * TS + 6, w: 14, h: 9 }, glow: { x: 8, y: 4, r: 30, color: col } })
    w.lights.push({ x: c * TS + 8, y: r * TS + 4, r: 70, color: col, flicker: 0.4 })
    w.hotspots.push({ id: `game-${id}`, box: { x: c * TS - 4, y: r * TS + 18, w: 24, h: 16 }, label: `PLAY ${label}`, action: { type: "game", id }, marker: true, markerX: c * TS + 8, markerY: r * TS - 10 })
    rect(c, r, c, r + 1)
  })
  for (const [c, r] of [[AC - 8, AR - 4], [AC + 8, AR - 4], [AC - 8, AR + 3], [AC + 8, AR + 3]] as [number, number][]) {
    w.spr(ds("dungeon"), [32, 32, 16, 16], c * TS, r * TS, { baseY: r * TS + 15, solid: { x: c * TS + 2, y: r * TS + 6, w: 12, h: 9 } })
    w.lamp(c * TS + 8, r * TS + 4, 84, "255,150,60", 1.6)
  }
  w.signs.push({ x: AC * TS + 8, y: (AR - 7) * TS + 4, label: "SAND ARENA", sub: "ARCADE", accent: "#d9a83a" })
  pennant((AC - 7) * TS, (AR - 2) * TS, "#c8463b", "#ffd76a", "game"); pennant((AC + 7) * TS + 8, (AR - 2) * TS, "#2d3f9a", "#ffd76a", "game")
  rect(AC - 10, AR - 8, AC + 10, AR + 7)
  w.ops.push({ z: 28, fn: (g) => {
    g.save(); g.translate(AC * TS + 8, AR * TS + 20); g.scale(1, 0.55)
    g.strokeStyle = "rgba(160,70,30,.5)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.stroke()
    g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.stroke()
    for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(Math.cos((k * Math.PI) / 4) * 26, Math.sin((k * Math.PI) / 4) * 26); g.lineTo(Math.cos((k * Math.PI) / 4) * 40, Math.sin((k * Math.PI) / 4) * 40); g.stroke() }
    g.restore()
  } })

  // ── travel gate: the old caravan road out west ──
  const gate = remap(houseImg, [464, 320, 64, 48], (h, s, v) => [32, Math.min(0.5, 0.22 + s * 0.5 + (1 - v) * 0.2), Math.min(1, v * 1.1 + 0.08)])
  const GX = TRAVEL.c * TS - 16, GY = (TRAVEL.r - 2) * TS
  w.spr(gate, [0, 0, 64, 48], GX, GY, { baseY: GY + 46 })
  solidAt(GX + 2, GY + 30, 10, 16); solidAt(GX + 52, GY + 30, 10, 16)
  w.hotspots.push({ id: "travel", label: "JOIN THE CARAVAN", box: { x: GX + 16, y: GY + 40, w: 32, h: 26 }, action: { type: "travel" }, marker: true, markerX: GX + 32, markerY: GY - 6 })
  w.signs.push({ x: GX + 32, y: GY - 2, label: "CARAVAN GATE", sub: "TRAVEL", accent: "#d9a83a", hotspot: "travel" })
  w.lamp(GX + 8, GY + 34, 58, "255,190,100", 1); w.lamp(GX + 56, GY + 34, 58, "255,190,100", 1)
  prop("cart", 9, 41); prop("hay", 12, 40); prop("hay", 12, 41); prop("crates", 7, 41); prop("barrel", 13, 36)
  pennant(GX - 4, GY + 48, "#d9a83a", "#fff1c8", "sun"); pennant(GX + 68, GY + 48, "#d9a83a", "#fff1c8", "sun")
  rect(2, TRAVEL.r - 4, 14, TRAVEL.r + 6)

  // ── bazaar street ──
  const stall = (c: number, r: number, k: "b" | "y", flip = false) => {
    w.spr(desertImg, k === "b" ? DP.stallBlue : DP.stallYellow, c * TS, r * TS, { baseY: r * TS + 31, flip, solid: { x: c * TS + 2, y: r * TS + 22, w: 28, h: 8 } })
    rect(c, r, c + 1, r + 1)
  }
  stall(28, 38, "b"); stall(31, 38, "y"); stall(28, 42, "y", true); stall(31, 42, "b", true)
  w.spr(desertImg, DP.clothBlue, 33 * TS, 38 * TS, { baseY: 39 * TS + 12 }); w.spr(desertImg, DP.clothGreen, 26 * TS, 39 * TS, { baseY: 40 * TS + 4 })
  w.spr(rugCanvas(32, 20, "#c8463b", "#ffd76a", "#8e3b2a"), [0, 0, 32, 20], 29 * TS, 40 * TS + 4, { baseY: 5 })
  w.spr(rugCanvas(28, 18, "#2d6fa0", "#fff1c8", "#1f4468"), [0, 0, 28, 18], 33 * TS + 8, 41 * TS, { baseY: 5 })
  for (const [c, r, n] of [[27, 38, "jar"], [34, 41, "pot"], [27, 43, "barrel"], [34, 44, "crate"], [30, 45, "jar"]] as [number, number, string][]) prop(n, c, r)
  lampPost(27, 41); lampPost(33, 41); lampPost(30, 37, "255,170,90"); lampPost(35, 45, "255,170,90")
  // string of bazaar lanterns
  for (const [x, y] of [[29, 37], [31, 37], [33, 37]] as [number, number][]) w.lamp(x * TS, y * TS + 8, 34, "255,120,80", 1.4)

  // ── quicksand ──
  const qs = ds("quicksand")
  const qsPos: [number, number][] = [[32, 50], [35, 49], [38, 51], [41, 49], [33, 53], [36, 54], [39, 55], [42, 52], [44, 55], [37, 57]]
  for (const [c, r] of qsPos) w.spr(qs, [0, 0, 32, 32], c * TS - 4, r * TS - 4, { baseY: r * TS - 400, anim: { frames: 8, fps: 4, dx: 32 } })
  for (const [c, r, t] of [[30, 48, 0], [46, 54, 1], [37, 47, 2]] as [number, number, number][]) {
    prop("sign", c, r, { solid: undefined })
    w.hotspots.push({ id: `qs-${t}`, box: { x: c * TS - 6, y: r * TS - 4, w: 28, h: 24 }, label: "READ SIGN", action: { type: "sign", lines: ["DANGER: QUICKSAND", "It looks like it wants to eat you. It only wants to slow you down. Keep walking!"] } })
  }
  for (const [c, r] of [[30, 52], [31, 56], [46, 51], [45, 57], [34, 48], [40, 47]] as [number, number][]) w.spr(desertImg, [DP.skull, DP.bones, DP.fossil, DP.femur][(c + r) % 4], c * TS, r * TS, { baseY: r * TS + 14 })

  // ── bone yard & fossil dig ──
  const rib = ribCanvas()
  w.spr(rib, [0, 0, 48, 36], 11 * TS, 49 * TS, { baseY: 49 * TS + 34, solid: { x: 11 * TS + 4, y: 49 * TS + 28, w: 40, h: 6 } })
  w.spr(rib, [0, 0, 48, 36], 16 * TS, 53 * TS, { baseY: 53 * TS + 34, flip: true, solid: { x: 16 * TS + 4, y: 53 * TS + 28, w: 40, h: 6 } })
  for (const [c, r] of [[9, 50], [10, 54], [14, 47], [19, 50], [20, 55], [8, 56], [13, 56], [22, 47]] as [number, number][]) w.spr(desertImg, [DP.skull, DP.bones, DP.fossil, DP.femur][(c * 3 + r) % 4], c * TS, r * TS, { baseY: r * TS + 14 })
  // dig site: stakes, a rope square and tools
  for (const [c, r] of [[17, 49], [20, 49], [17, 52], [20, 52]] as [number, number][]) w.spr(bitmap(["oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo"], { o: "#7a4a22" }), [0, 0, 2, 8], c * TS + 7, r * TS + 4, { baseY: r * TS + 12 })
  w.ops.push({ z: 29, fn: (g) => { g.strokeStyle = "#b07a46"; g.lineWidth = 1; g.strokeRect(17 * TS + 8, 49 * TS + 6, 3 * TS, 3 * TS); g.fillStyle = "rgba(150,70,30,.22)"; g.fillRect(17 * TS + 9, 49 * TS + 7, 3 * TS - 2, 3 * TS - 2) } })
  prop("crate", 21, 51); prop("pot", 16, 50); w.spr(desertImg, DP.map, 18 * TS, 50 * TS, { baseY: 50 * TS + 14 })
  rect(8, 46, 23, 57)

  // ── half-buried colossus & statues ──
  const statue = HOUSE_PROPS.statue.rect
  for (const [c, r, h] of [[74, 24, 30], [77, 29, 26]] as [number, number, number][]) {
    w.spr(houseImg, [statue[0], statue[1], 32, h], c * TS, r * TS + (48 - h), { baseY: r * TS + 48, solid: { x: c * TS + 3, y: r * TS + 36, w: 26, h: 10 } })
    w.ops.push({ z: 31, fn: (g) => { g.fillStyle = "#f7b46a"; g.beginPath(); g.ellipse(c * TS + 16, r * TS + 46, 24, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#ffcb8a"; g.beginPath(); g.ellipse(c * TS + 14, r * TS + 44, 16, 4, 0, 0, Math.PI * 2); g.fill() } })
    rect(c - 1, r, c + 2, r + 3)
  }
  w.spr(desertImg, DP.lion, 73 * TS, 33 * TS, { baseY: 33 * TS + 46, solid: { x: 73 * TS + 2, y: 33 * TS + 34, w: 28, h: 12 } }); rect(72, 33, 75, 36)

  // ── the lookout ──
  const LK = LOOKOUT
  w.spr(telescopeCanvas(), [0, 0, 24, 22], (LK.c0 + 6) * TS - 4, (LK.r0 + 1) * TS, { baseY: (LK.r0 + 2) * TS + 4, solid: { x: (LK.c0 + 6) * TS, y: (LK.r0 + 2) * TS - 2, w: 12, h: 6 } })
  const flag = img(DS.flagYellow)
  w.spr(flag, [0, 0, 16, 16], (LK.c0 + 2) * TS, (LK.r0 + 1) * TS - 6, { baseY: (LK.r0 + 2) * TS + 4, anim: { frames: 4, fps: 6, dx: 16 } })
  w.spr(bitmap(["oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo"], { o: "#6a4020" }), [0, 0, 2, 10], (LK.c0 + 2) * TS + 1, (LK.r0 + 1) * TS + 2, { baseY: (LK.r0 + 2) * TS + 5 })
  w.hotspots.push({ id: "lookout-view", label: "LOOK OUT", box: { x: (LK.c0 + 6) * TS - 6, y: (LK.r0 + 2) * TS + 6, w: 28, h: 20 }, action: { type: "sign", lines: ["From up here the whole oasis glitters.", "Teahouse west, relics east, the arena beyond the dry river. Somewhere a chest is hiding."] }, marker: true, markerX: (LK.c0 + 6) * TS + 8, markerY: (LK.r0 + 1) * TS - 8 })
  w.lamp((LK.c0 + 2) * TS + 8, (LK.r0 + 2) * TS, 50, "255,200,120", 0.8)

  // ── hidden chest in a pocket of cacti ──
  const CH = { c: 76, r: 46 }
  prop("chest", CH.c, CH.r)
  w.hotspots.push({ id: "chest-desert", label: "OPEN CHEST", box: { x: CH.c * TS - 4, y: CH.r * TS + 6, w: 24, h: 20 }, action: { type: "chest", id: "chest-desert" }, marker: true, markerX: CH.c * TS + 8, markerY: CH.r * TS - 8 })
  w.lamp(CH.c * TS + 8, CH.r * TS + 6, 40, "255,215,120", 0.5)
  rect(CH.c - 2, CH.r - 2, CH.c + 2, CH.r + 2)

  // ── scatter: cacti, rocks, dead trees, bones ──
  const cacti = [0, 1, 2, 3, 4, 5].map((i) => cactusCanvas(i + 1, "saguaro")), barrels = [0, 1, 2].map((i) => cactusCanvas(i + 9, "barrel")), pears = [0, 1].map((i) => cactusCanvas(i + 20, "pear"))
  const cactus = (c: number, r: number, k = Math.floor(rnd() * 10)) => {
    const x = c * TS + 8, y = r * TS + 15
    const cv = k < 5 ? cacti[k % 6] : k < 8 ? barrels[k % 3] : pears[k % 2]
    w.spr(cv, [0, 0, cv.width, cv.height], x - cv.width / 2, y - cv.height, { baseY: y, solid: { x: x - 4, y: y - 5, w: 8, h: 5 } })
    w.reserved[idx(c, r)] = 1
  }
  // pocket for the chest
  for (const [c, r] of [[74, 45], [74, 47], [75, 44], [78, 44], [78, 47], [76, 44], [77, 48]] as [number, number][]) cactus(c, r, c % 5)
  w.reserved[idx(CH.c, CH.r)] = 1
  const scatter = (n: number, tries: number, fn: (c: number, r: number) => void, margin = 0) => {
    for (let k = 0, put = 0; k < tries && put < n; k++) {
      const c = 4 + Math.floor(rnd() * (W - 8)), r = 4 + Math.floor(rnd() * (H - 8))
      if (!freeArea(c, r, margin)) continue
      fn(c, r); put++
    }
  }
  const nat = natureImg
  scatter(70, 4000, (c, r) => cactus(c, r), 1)
  scatter(34, 3000, (c, r) => {
    const rocks: [Rect, number][] = [[TAN_ROCKS.big, 32], [TAN_ROCKS.med, 32], [TAN_ROCKS.wide, 64], [TAN_ROCKS.tall, 32], [TAN_ROCKS.triple, 64]]
    const [rc, rw] = rocks[Math.floor(rnd() * rocks.length)]
    const x = c * TS + 8, y = r * TS + 15
    w.spr(nat, rc, x - rw / 2, y - rc[3], { baseY: y, solid: { x: x - rw / 2 + 4, y: y - 8, w: rw - 8, h: 8 } })
    rect(c - 1, r, c + Math.floor(rw / 32), r)
  }, 2)
  scatter(40, 2000, (c, r) => { const rc = TAN_ROCKS.small[Math.floor(rnd() * 3)]; w.spr(nat, rc, c * TS, r * TS, { baseY: r * TS + 14, solid: { x: c * TS + 3, y: r * TS + 8, w: 10, h: 6 } }); w.reserved[idx(c, r)] = 1 })
  scatter(7, 2000, (c, r) => { w.spr(nat, [64, 0, 32, 32], c * TS - 8, r * TS - 16, { baseY: r * TS + 14, solid: { x: c * TS + 3, y: r * TS + 8, w: 10, h: 6 } }); w.reserved[idx(c, r)] = 1 }, 1)
  scatter(18, 2000, (c, r) => { w.spr(desertImg, [DP.skull, DP.bones, DP.fossil, DP.femur][Math.floor(rnd() * 4)], c * TS, r * TS, { baseY: r * TS + 14 }); w.reserved[idx(c, r)] = 1 })
  scatter(20, 2000, (c, r) => { w.spr(desertImg, rnd() < 0.5 ? DP.sproutA : DP.sproutB, c * TS, r * TS, { baseY: r * TS + 14 }); w.reserved[idx(c, r)] = 1 })
  // cactus grove around the second pool
  for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, c = Math.round(16.5 + Math.cos(a) * (6 + rnd() * 2)), r = Math.round(38.6 + Math.sin(a) * (4 + rnd() * 2)); if (free(c, r)) cactus(c, r) }
  // rocks along the mesa tops frame the skyline
  for (let c = 6; c < W - 6; c += 3 + Math.floor(rnd() * 4)) {
    if (hash(c, 1, 91) < 0.5) w.spr(nat, TAN_ROCKS.small[c % 3], c * TS, 1 * TS + 4, { baseY: 2 * TS })
  }

  // ── wind-blown sand, tumbleweeds ──
  const streak = bitmap(["ppppp"], { p: "rgba(255,238,200,0.55)" })
  const streaks = Array.from({ length: 70 }, (_, i) => ({ s: w.spr(streak, [0, 0, 5, 1], 0, 0, { baseY: 99999, dynamic: true }), x: hash(i, 1, 70) * W * TS, y: hash(i, 2, 70) * H * TS, v: 18 + hash(i, 3, 70) * 22, ph: hash(i, 4, 70) * 6 }))
  const tw = tumbleCanvas()
  const weeds = [0, 1, 2, 3].map((i) => ({ s: w.spr(tw, [0, 0, 12, 12], 0, 0, { baseY: 0, dynamic: true }), x: hash(i, 5, 71) * W * TS, y: (14 + hash(i, 6, 71) * 40) * TS, v: 26 + i * 6 }))
  w.tickers.push((t, dt) => {
    for (const p of streaks) {
      p.x += p.v * dt; if (p.x > W * TS) p.x -= W * TS
      p.s.x = Math.round(p.x); p.s.y = Math.round(p.y + Math.sin(t * 0.8 + p.ph) * 6)
    }
    for (const q of weeds) {
      q.x += q.v * dt; if (q.x > W * TS + 16) q.x = -16
      const hop = Math.abs(Math.sin(q.x * 0.045)) * 7
      q.s.x = Math.round(q.x); q.s.y = Math.round(q.y - hop); q.s.baseY = Math.round(q.y + 10)
      q.s.rect = [(Math.floor(q.x / 5) % 4) * 12, 0, 12, 12]
    }
  })
  // shimmering oasis at night: blue glow around the lake
  for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28; w.lights.push({ x: LAKE.cx * TS + 8 + Math.cos(a) * LAKE.rx * TS * 0.7, y: LAKE.cy * TS + 8 + Math.sin(a) * LAKE.ry * TS * 0.7, r: 52, color: "90,200,255", flicker: 0.3 }) }
  w.lights.push({ x: 16.5 * TS, y: 38.6 * TS, r: 44, color: "90,200,255" })
  lampPost(41, 29, "255,200,120", 70); lampPost(37, 27, "255,200,120"); lampPost(45, 27, "255,200,120")

  people(w)
  void flo
}

// ── people, animals and monsters ────────────────────────────────
function people(w: World) {
  const npc = (id: string, sheetName: string, name: string, c: number, r: number, wander: number, bark: string[], lines?: string[], action?: ActorDef["action"]) =>
    w.actors.push({ id, kind: "npc", sheet: charSheet(sheetName), face: charFace(sheetName), name, x: c * TS + 8, y: r * TS + 12, wander, bark, lines, speed: 20, action })
  npc("sahar", "Cavegirl2", "Sahar the Guide", 43, 28, 16,
    ["Welcome to Sunscar! Mind the quicksand.", "Every door here opens a chapter of Rayan's story."],
    ["Welcome to Sunscar Oasis, traveller!", "Rayan Jain builds Rust and TypeScript things out of Mumbai. This town is his portfolio, in sand.", "Caravanserai for his story, Hall of Relics for projects, Teahouse for experience.", "Sand Forge holds his skills, the Observatory his studies, and the Falcon Post will carry your message."],
    { type: "section", id: "townhall" })
  npc("bashir", "OldMan2", "Bashir the Tea Master", 26, 24, 12,
    ["Ferrite predicts what a task needs, then dry-runs the plan. I do that with tea.", "Interned at Barclays this summer. Strong tea, stronger commits."],
    ["Ahh, sit! Sit! The tea is hot and the stories hotter.", "Rayan studies computer engineering at SPIT and ships a Rust agent browser, a system monitor and a Kubernetes platform on the side.", "He also led the tech side of the CSI-SPIT student chapter. A busy man, and he still finds time for tea."],
    { type: "section", id: "tavern" })
  npc("zuleika", "SorcererOrange", "Zuleika the Stargazer", 63, 17, 10,
    ["Nebula reads the stars of malware: 95.4% accuracy, 0.989 AUC.", "Pull Shark twice over. A fine constellation."],
    ["Shhh. I am reading tonight's sky.", "Nebula watches Windows executables run, feeds their API calls to a chunked transformer, and explains why it flagged them.", "95.4% accuracy and an AUC of 0.989. Rayan studies Computer Engineering in Mumbai, and the honours are on the Observatory shelves."],
    { type: "section", id: "academy" })
  npc("idris", "GoldKnight", "Captain Idris", 11, 35, 10,
    ["Sentinel explains every connection. I only explain who may pass.", "The caravan road leads on. Soon."])
  npc("noor", "Child", "Noor", 38, 38, 36, ["DuckOps made a whole repo, a k8s deploy and monitoring from a wizard!", "Press Space near a snake. I dare you."])
  npc("faris", "Boy", "Faris", 46, 41, 36, ["CtrlFixIt ran 120+ players at once. Can I be a hundred and twenty-first?", "BoomSuite is up to 4x louder. I tried it on the camels."])
  npc("hadi", "Samurai", "Hadi the Smith", 24, 37, 8,
    ["skrgrep: a multi-threaded grep in Rust, on Homebrew too.", "Hot work! Rust, TypeScript, Kubernetes... tempered by shipping."],
    ["Mind the sparks!", "Rust, TypeScript, Python, plus a pile of infra: Docker, Kubernetes, Terraform, Ansible.", "He even published skrgrep to Homebrew. Take a look at the racks."],
    { type: "section", id: "forge" })
  npc("yasmin", "Cavegirl", "Yasmin the Falconer", 55, 23, 12,
    ["My falcons reach rayansjain@gmail.com faster than light.", "Rayan replies quickly, I hear."],
    ["My falcons never lose a letter.", "Want to reach Rayan? Write him from the Falcon Post. He is open to collabs and interesting problems."],
    { type: "section", id: "wizard" })
  npc("layla", "OldWoman", "Madame Layla", 30, 40, 20, ["Poker with a Rust backend, in real time. I still lose.", "DevHub: Postman, DevTools and Burp in one. I sell rugs, not requests."])
  npc("rafi", "LionBoy", "Rafi the Caravan Driver", 12, 37, 12, ["Next stop: wherever the portfolio goes next.", "Ship fast. Break things. Fix faster. Also: water the camels."])
  npc("amon", "Monk2", "Brother Amon", 12, 11, 6,
    ["First place at Ignisa '26. A long climb, like this one.", "Breathe. The view is the point."],
    ["You climbed all the way up! Good.", "From here you can see the whole oasis. Hackathons, challenges, ML, platforms: Rayan has crossed a lot of dunes.", "CreditIQ won Ignisa '26; NeuroCred was built at the Airavat Hackathon. All shipped under time pressure."])
  npc("tomas", "Caveman", "Old Tomas the Digger", 14, 51, 14, ["Found a fossil of a bug that nobody could reproduce.", "Vendex turns a product video into a ranked supplier list. I turn dirt into bones."])
  const animal = (id: string, n: string, c: number, r: number, wander = 30) => w.actors.push({ id, kind: "animal", sheet: animalSheet(n), x: c * TS + 8, y: r * TS + 12, wander, speed: 14 })
  animal("camel1", "cow", 11, 39, 20); animal("camel2", "cow", 13, 41, 20); animal("camel3", "cow", 6, 41, 16); animal("camel4", "cow", 36, 38, 30)
  animal("fox1", "racoon", 46, 25, 40); animal("fox2", "racoon", 33, 27, 40); animal("fox3", "racoon", 70, 40, 40)
  animal("cat1", "cat", 28, 24, 20); animal("cat2", "cat", 42, 36, 20); animal("monkey", "monkey", 32, 39, 24)
  animal("frog1", "frog", 36, 25, 12); animal("frog2", "frog", 17, 41, 12); animal("frog3", "frog", 47, 24, 12)
  const mon = (id: string, n: string, c: number, r: number) => w.actors.push({ id, kind: "monster", sheet: monsterSheet(n), x: c * TS + 8, y: r * TS + 12, wander: 44, speed: 16 })
  mon("sn1", "Snake", 9, 53); mon("sn2", "Snake", 12, 55); mon("sn3", "Snake", 18, 55); mon("lz1", "Lizard", 10, 56); mon("lz2", "Lizard", 21, 53); mon("rp1", "Reptile", 16, 56)
  mon("sn4", "Snake", 76, 55); mon("lz3", "Lizard", 74, 56); mon("mo1", "Mole", 78, 53); mon("rp2", "Reptile", 72, 54)
}
