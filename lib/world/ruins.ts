// Hollow Reach: a haunted village in perpetual twilight. Everything is graded into one cold palette; light is the star.
import {
  RUINS_SHEETS, RUINS_ART, RUINS_CHARS, MUD, SWAMP_WATER, DEAD_GRASS, HOLE, PLATEAU, CLIFF, PLANK, PROPS, SHEETS,
  charSheet, charFace, monsterSheet, animalSheet, type Rect, type Autotile,
} from "@/lib/na"
import type { Portfolio } from "@/lib/content"
import { ordered, memoryPane, memoryTome, FRAME_PRELOAD } from "./exhibits"
import { TS, G, img, sheet, blit, hash, mulberry, autotile, canvas, type Scene, type Sprite, type Hotspot, type ActorDef, type Light, type Box, type SceneSign, type Landmark } from "./core"

export const RW = 80
export const RH = 60
const W = RW, H = RH

// ── twilight grading ────────────────────────────────────────────
const RAMP: [number, number, number][] = [[10, 12, 28], [34, 44, 74], [74, 98, 124], [122, 150, 164], [186, 206, 214], [236, 242, 244]]
const LUT = (() => {
  const out = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const f = (i / 255) * (RAMP.length - 1), a = Math.min(RAMP.length - 2, Math.floor(f)), t = f - a
    for (let k = 0; k < 3; k++) out[i * 3 + k] = RAMP[a][k] * (1 - t) + RAMP[a + 1][k] * t
  }
  return out
})()
type Src = HTMLImageElement | HTMLCanvasElement
const gradeCache = new Map<Src, HTMLCanvasElement>()
function grade(src: Src, k = 0.5, des = 0.5, gain = 1.12): HTMLCanvasElement {
  const hit = gradeCache.get(src)
  if (hit) return hit
  const w = src instanceof HTMLImageElement ? src.naturalWidth : src.width, h = src instanceof HTMLImageElement ? src.naturalHeight : src.height
  const { c, ctx } = canvas(Math.max(1, w), Math.max(1, h))
  if (w && h) {
    ctx.drawImage(src, 0, 0)
    const d = ctx.getImageData(0, 0, w, h), a = d.data
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue
      const r = a[i], g = a[i + 1], b = a[i + 2]
      const l = Math.min(255, Math.round((0.3 * r + 0.59 * g + 0.11 * b) * gain))
      for (let q = 0; q < 3; q++) {
        const o = q === 0 ? r : q === 1 ? g : b
        a[i + q] = (l + (o - l) * (1 - des)) * (1 - k) + LUT[l * 3 + q] * k
      }
    }
    ctx.putImageData(d, 0, 0)
  }
  gradeCache.set(src, c)
  return c
}

const vn = (x: number, y: number, s = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// ── layout ──────────────────────────────────────────────────────
const chasmX = (r: number) => 59 + 2.5 * Math.sin((r - 22) * 0.18)
const HILL = { c0: 49, r0: 7, c1: 72, r1: 19 }
const PLAZA = { c0: 31, r0: 24, c1: 49, r1: 35 }
const BRIDGE = { r: 33, c0: 56, c1: 65 }
const LAKE = { cx: 15, cy: 47, rx: 11.5, ry: 6.5 }
const SEANCE = { c: 68, r: 40 }

interface B { id: string; art: string; c: number; r: number; flip?: boolean; section?: string; label?: string; sub?: string; accent?: string; light?: string; lit?: string }
const BUILDS: B[] = [
  { id: "townhall", art: "dome", c: 38, r: 9, section: "townhall", label: "ELDER'S HALL", sub: "ABOUT", accent: "#e0b24a", light: "255,214,140", lit: "255,200,110" },
  { id: "academy", art: "tower", c: 14, r: 11, section: "academy", label: "FORGOTTEN LIBRARY", sub: "EDUCATION", accent: "#3fb3a6", light: "120,240,220", lit: "150,235,215" },
  { id: "tavern", art: "cottageA", c: 18, r: 26, section: "tavern", label: "THE LAST LANTERN", sub: "EXPERIENCE", accent: "#e09a3a", light: "255,176,84", lit: "255,190,100" },
  { id: "inn2", art: "cottageB", c: 21, r: 27, flip: true, light: "255,176,84" },
  { id: "wizard", art: "cottageB", c: 27, r: 41, section: "wizard", label: "WHISPER POST", sub: "CONTACT", accent: "#8e66e8", light: "190,140,255", lit: "190,140,255" },
  { id: "forge", art: "ruinHall", c: 44, r: 41, section: "forge", label: "COLD FORGE", sub: "SKILLS", accent: "#e2683a", light: "255,110,60", lit: "255,100,50" },
  { id: "kiln", art: "kiln", c: 48, r: 41, light: "255,90,40" },
  { id: "d1", art: "cottageA", c: 8, r: 20 },
  { id: "d2", art: "cottageB", c: 28, r: 12, flip: true },
  { id: "d3", art: "cottageA", c: 52, r: 25 },
  { id: "d4", art: "ruinHall", c: 33, r: 44 },
  { id: "d5", art: "cottageB", c: 9, r: 33 },
  { id: "d6", art: "cottageA", c: 25, r: 20, flip: true },
]
const bSize = (b: B) => { const a = RUINS_ART[b.art]; return { w: a[2], h: a[3], tw: Math.ceil(a[2] / TS), th: Math.ceil(a[3] / TS) } }
const doorOf = (b: B) => {
  const { w, h } = bSize(b)
  const dx = b.art === "tower" ? 24 : b.art === "dome" ? 32 : b.art === "kiln" ? 24 : 24
  return { x: b.c * TS + (b.flip ? w - dx : dx), y: b.r * TS + h }
}

export function buildRuins(content?: Portfolio): Scene {
  const NPROJ = content?.projects.length ?? 8
  const rnd = mulberry(66642)
  const idx = (c: number, r: number) => r * W + c
  const inb = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H
  const kind = new Uint8Array(W * H)      // 0 grass 1 mud 2 water 3 plank 4 plaza 5 hill 6 chasm 7 cliff
  const blocked = new Uint8Array(W * H)
  const forest = new Uint8Array(W * H)
  const occ = new Uint8Array(W * H)       // keep decoration away
  const K = { Grass: 0, Mud: 1, Water: 2, Plank: 3, Plaza: 4, Hill: 5, Chasm: 6, Cliff: 7 }
  const get = (c: number, r: number, d = 0) => (inb(c, r) ? kind[idx(c, r)] : d)

  // sheets, raw and graded
  const raw = {
    floor: sheet("floor"), water: sheet("water"), nature: sheet("nature"), house: sheet("house"), element: sheet("element"), floorDetail: sheet("floorDetail"), ifloor: sheet("ifloor"),
    abandoned: img(RUINS_SHEETS.abandoned), hole: img(RUINS_SHEETS.hole), relief: img(RUINS_SHEETS.relief), reliefDetail: img(RUINS_SHEETS.reliefDetail),
  }
  const gr = {
    nature: grade(raw.nature), house: grade(raw.house), element: grade(raw.element), floorDetail: grade(raw.floorDetail, 0.55, 0.4, 0.7),
    abandoned: grade(raw.abandoned, 0.5, 0.45, 1.0), relief: grade(raw.relief, 0.65, 0.5, 0.42), reliefDetail: grade(raw.reliefDetail, 0.55, 0.4, 0.85),
  }

  // ── forest ring (north is cliff)
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const d = Math.min(c, r, W - 1 - c, H - 1 - r)
      const edge = 4.6 + Math.sin(c * 0.31 + r * 0.17) * 1.1 + hash(c, r, 9) * 1.3
      if (d < edge) forest[idx(c, r)] = 1
    }
  for (let r = 0; r <= 5; r++) for (let c = 0; c < W; c++) forest[idx(c, r)] = 1

  // ── hill (graveyard terrace)
  const inHill = (c: number, r: number) => {
    if (c < HILL.c0 || c > HILL.c1 || r < HILL.r0 || r > HILL.r1) return false
    const cx = c < HILL.c0 + 3 ? HILL.c0 + 3 - c : c > HILL.c1 - 3 ? c - (HILL.c1 - 3) : 0
    const cy = r < HILL.r0 + 2 ? HILL.r0 + 2 - r : 0
    return cx + cy < 3
  }
  for (let r = HILL.r0; r <= HILL.r1; r++) for (let c = HILL.c0; c <= HILL.c1; c++) if (inHill(c, r)) { kind[idx(c, r)] = K.Hill; forest[idx(c, r)] = 0 }
  const LADDER = [60, 61]

  // ── chasm
  for (let r = 21; r <= 52; r++) {
    const cx = chasmX(r)
    for (let c = Math.floor(cx - 2); c <= Math.ceil(cx + 2); c++) if (Math.abs(c + 0.5 - cx) < 1.7 && inb(c, r)) { kind[idx(c, r)] = K.Chasm; forest[idx(c, r)] = 0 }
  }
  for (let r = BRIDGE.r; r <= BRIDGE.r + 1; r++) for (let c = BRIDGE.c0; c <= BRIDGE.c1; c++) { kind[idx(c, r)] = K.Plank }

  // ── lake
  for (let r = 36; r < 58; r++)
    for (let c = 3; c < 32; c++) {
      const a = Math.atan2(r - LAKE.cy, c - LAKE.cx)
      const wob = 1 + Math.sin(a * 3) * 0.12 + Math.cos(a * 5 + 1) * 0.08
      if (Math.hypot((c - LAKE.cx) / LAKE.rx, (r - LAKE.cy) / LAKE.ry) < wob) { kind[idx(c, r)] = K.Water; forest[idx(c, r)] = 0 }
    }
  // a small pond by the library
  for (let r = 22; r < 30; r++) for (let c = 10; c < 18; c++) if (Math.hypot((c - 13.5) / 3.6, (r - 25.5) / 2.4) < 1) kind[idx(c, r)] = K.Water
  for (let pass = 0; pass < 2; pass++)
    for (let r = 1; r < H - 1; r++)
      for (let c = 1; c < W - 1; c++) {
        if (kind[idx(c, r)] !== K.Water) continue
        const v = kind[idx(c, r - 1)] === K.Water || kind[idx(c, r + 1)] === K.Water
        const h = kind[idx(c - 1, r)] === K.Water || kind[idx(c + 1, r)] === K.Water
        if (!v || !h) kind[idx(c, r)] = K.Grass
      }
  // boardwalk and pier
  for (let r = 45; r <= 46; r++) for (let c = 12; c <= 30; c++) kind[idx(c, r)] = K.Plank
  for (let r = 44; r <= 47; r++) for (let c = 10; c <= 12; c++) kind[idx(c, r)] = K.Plank

  // ── plaza
  for (let r = PLAZA.r0; r <= PLAZA.r1; r++) for (let c = PLAZA.c0; c <= PLAZA.c1; c++) { kind[idx(c, r)] = K.Plaza; forest[idx(c, r)] = 0 }

  // ── building footprints
  const footprint = (c: number, r: number) => BUILDS.some((b) => { const s = bSize(b); return c >= b.c && c < b.c + s.tw && r >= b.r && r < b.r + s.th })
  for (const b of BUILDS) {
    const s = bSize(b)
    for (let r = b.r - 1; r <= b.r + s.th + 2; r++) for (let c = b.c - 1; c <= b.c + s.tw; c++) if (inb(c, r)) { forest[idx(c, r)] = 0; occ[idx(c, r)] = 1 }
  }

  // ── roads (cheapest path over noisy costs)
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
        if (!inb(nc, nr)) continue
        const g = kind[idx(nc, nr)]
        if (g === K.Water || g === K.Chasm || g === K.Hill || g === K.Cliff) continue
        if (footprint(nc, nr)) continue
        if (nr > 54 || nr < 6) continue
        let cost = 1 + hash(nc, nr, seed) * 1.6
        if (g === K.Mud || g === K.Plaza || g === K.Plank) cost = 0.3
        if (forest[idx(nc, nr)]) cost += 12
        const j = idx(nc, nr)
        if (dist[i] + cost < dist[j]) { dist[j] = dist[i] + cost; prev[j] = i; push(j) }
      }
    }
    for (let i = goal; i !== -1 && i !== s; i = prev[i]) { if (kind[i] === K.Grass) kind[i] = K.Mud; forest[i] = 0 }
    if (kind[s] === K.Grass) kind[s] = K.Mud
  }
  const doors = Object.fromEntries(BUILDS.filter((b) => b.section).map((b) => [b.id, doorOf(b)]))
  const dc = (id: string) => Math.floor(doors[id].x / TS), dr = (id: string) => Math.floor(doors[id].y / TS) + 1
  carve(40, 54, 40, PLAZA.r1 + 1, 1)
  carve(40, PLAZA.r0 - 1, dc("townhall"), dr("townhall"), 2)
  carve(PLAZA.c0 - 1, 29, dc("tavern"), dr("tavern"), 3)
  carve(PLAZA.c1 + 1, 31, BRIDGE.c0 - 1, BRIDGE.r, 4)
  carve(BRIDGE.c1 + 1, BRIDGE.r + 1, SEANCE.c, SEANCE.r - 5, 5)
  carve(SEANCE.c, SEANCE.r + 5, SEANCE.c, SEANCE.r + 4, 6)
  carve(44, PLAZA.r1 + 1, dc("forge"), dr("forge"), 7)
  carve(34, PLAZA.r1 + 1, dc("wizard"), dr("wizard"), 8)
  carve(dc("townhall"), dr("townhall"), dc("academy"), dr("academy"), 9)
  carve(44, PLAZA.r0 - 1, LADDER[0], HILL.r1 + 2, 10)
  carve(dc("wizard"), dr("wizard"), 31, 45, 11)
  carve(BRIDGE.c1 + 1, BRIDGE.r, 67, 26, 12)
  carve(dc("tavern"), dr("tavern"), 14, 38, 13)
  for (let r = 51; r <= 54; r++) for (let c = 39; c <= 41; c++) { forest[idx(c, r)] = 0; kind[idx(c, r)] = K.Mud }
  // widen roads irregularly, then drop 1-tile specks
  const widen: number[] = []
  for (let r = 6; r < 54; r++) for (let c = 2; c < W - 2; c++) if (kind[idx(c, r)] === K.Mud) for (const [dx, dy] of [[1, 0], [0, 1]]) if (kind[idx(c + dx, r + dy)] === K.Grass && !footprint(c + dx, r + dy) && !forest[idx(c + dx, r + dy)] && hash(c, r, 21) < 0.5) widen.push(idx(c + dx, r + dy))
  for (const i of widen) kind[i] = K.Mud
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) if (kind[idx(c, r)] === K.Grass) { const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => kind[idx(c + dx, r + dy)] === K.Mud).length; if (n >= 3) kind[idx(c, r)] = K.Mud }
  for (let i = 0; i < W * H; i++) if (kind[i] === K.Mud) occ[i] = 1
  for (let i = 0; i < W * H; i++) if (kind[i] === K.Plaza || kind[i] === K.Plank || kind[i] === K.Hill) occ[i] = 1

  // ── ground canvas
  const { c: gcv, ctx: g } = canvas(W * TS, H * TS)
  const floorG = grade(raw.floor, 0.66, 0.5, 0.72), waterG = grade(raw.water, 0.6, 0.4, 0.62), holeG = grade(raw.hole, 0.4, 0.3), ifG = grade(raw.ifloor, 0.6, 0.4, 0.8)
  const isMud = (c: number, r: number) => get(c, r) === K.Mud
  const isWater = (c: number, r: number) => { const v = get(c, r); return v === K.Water || v === K.Plank }
  const isChasm = (c: number, r: number) => { const v = get(c, r, 0); return v === K.Chasm || (v === K.Plank && inb(c, r) && Math.abs(c + 0.5 - chasmX(r)) < 4) }
  const isHill = (c: number, r: number) => get(c, r) === K.Hill
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) blit(g, floorG, DEAD_GRASS[Math.floor(hash(c, r, 1) * DEAD_GRASS.length)], c * TS, r * TS)
  // soft ground mottle: lighter moonlit and darker mossy drifts
  {
    const d = g.getImageData(0, 0, W * TS, H * TS), a = d.data
    for (let y = 0; y < H * TS; y++)
      for (let x = 0; x < W * TS; x++) {
        const i = (y * W * TS + x) * 4
        const m = vn(x * 0.045, y * 0.045, 4), mo = vn(x * 0.07 + 30, y * 0.07, 8)
        const f = 0.86 + m * 0.26
        a[i] *= f; a[i + 1] *= f; a[i + 2] *= f
        if (mo > 0.62) { const t = Math.min(1, (mo - 0.62) * 4) * (hash(x, y, 2) > 0.3 ? 0.55 : 0.2); a[i] = a[i] * (1 - t) + 40 * t; a[i + 1] = a[i + 1] * (1 - t) + 92 * t; a[i + 2] = a[i + 2] * (1 - t) + 70 * t }
      }
    g.putImageData(d, 0, 0)
  }
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const v = kind[idx(c, r)]
      if (v === K.Mud) blit(g, floorG, autotile(MUD, isMud, c, r), c * TS, r * TS)
    }
  // plaza: cobbles with a ragged, cracked edge
  {
    const x0 = (PLAZA.c0 - 1) * TS, y0 = (PLAZA.r0 - 1) * TS, w = (PLAZA.c1 - PLAZA.c0 + 3) * TS, h = (PLAZA.r1 - PLAZA.r0 + 3) * TS
    const { c: lc, ctx: l } = canvas(w, h)
    const cob: Rect[] = [[16 * 16, 13 * 16, 16, 16], [17 * 16, 13 * 16, 16, 16], [16 * 16, 14 * 16, 16, 16], [17 * 16, 14 * 16, 16, 16]]
    for (let ty = 0; ty < h / TS; ty++) for (let tx = 0; tx < w / TS; tx++) blit(l, ifG, cob[(tx % 2) + (ty % 2) * 2], tx * TS, ty * TS)
    const px0 = PLAZA.c0 * TS, py0 = PLAZA.r0 * TS, px1 = (PLAZA.c1 + 1) * TS, py1 = (PLAZA.r1 + 1) * TS
    const cx = (px0 + px1) / 2, cy = (py0 + py1) / 2
    const inside = (x: number, y: number) => {
      const qx = Math.abs(x - cx) - ((px1 - px0) / 2 - 30), qy = Math.abs(y - cy) - ((py1 - py0) / 2 - 30)
      const sdf = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 30
      const n = (vn(x * 0.08, y * 0.08, 5) - 0.5) * 26 + (hash(x, y, 3) - 0.5) * 3
      if (sdf > n - 4) return false
      if (Math.hypot(x - cx, y - cy) > 50 && vn(x * 0.11 + 9, y * 0.11, 6) > 0.8) return false
      return true
    }
    const id = l.getImageData(0, 0, w, h), a = id.data
    const msk = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) msk[y * w + x] = inside(x + x0, y + y0) ? 1 : 0
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        if (!msk[y * w + x]) { a[i + 3] = 0; continue }
        const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !msk[y * w + x - 1] || !msk[y * w + x + 1] || !msk[(y - 1) * w + x] || !msk[(y + 1) * w + x]
        if (edge) { a[i] *= 0.45; a[i + 1] *= 0.45; a[i + 2] *= 0.5 }
        else if (vn(x * 0.2, y * 0.2, 7) > 0.74 && hash(x, y, 4) > 0.4) { a[i] = a[i] * 0.5 + 30; a[i + 1] = a[i + 1] * 0.5 + 70; a[i + 2] = a[i + 2] * 0.5 + 62 }
      }
    l.putImageData(id, 0, 0)
    g.drawImage(lc, x0, y0)
  }
  // water, chasm, hill, planks
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const v = kind[idx(c, r)]
      if (v === K.Water) blit(g, waterG, autotile(SWAMP_WATER as Autotile, isWater, c, r), c * TS, r * TS)
      if (v === K.Chasm) blit(g, holeG, autotile(HOLE as Autotile, isChasm, c, r), c * TS, r * TS)
      if (v === K.Hill) blit(g, gr.relief, autotile(PLATEAU as Autotile, isHill, c, r), c * TS, r * TS)
    }
  const isPlank = (c: number, r: number) => get(c, r) === K.Plank
  const plankG = grade(raw.water, 0.62, 0.5, 0.5)
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      if (kind[idx(c, r)] !== K.Plank) continue
      const u = isPlank(c, r - 1), d = isPlank(c, r + 1), l = isPlank(c - 1, r), rt = isPlank(c + 1, r)
      const p = !u ? (!l ? PLANK.tl : !rt ? PLANK.tr : PLANK.t) : !d ? (!l ? PLANK.bl : !rt ? PLANK.br : PLANK.b) : (!l ? PLANK.l : !rt ? PLANK.r : PLANK.c)
      blit(g, plankG, p, c * TS, r * TS)
    }
  // ladder up the cliff face
  for (const c of LADDER) blit(g, gr.reliefDetail, RUINS_ART.ladder, c * TS, HILL.r1 * TS)
  // north cliff wall
  for (let c = 4; c < W - 4; c++) for (let r = 1; r <= 4; r++) {
    const side = c === 4 ? CLIFF.l : c === W - 5 ? CLIFF.r : CLIFF.m
    blit(g, gr.relief, side[r === 1 ? 0 : r === 4 ? 2 : 1], c * TS, r * TS)
    kind[idx(c, r)] = K.Cliff
  }
  g.fillStyle = "#0b0e1c"; g.fillRect(0, 0, W * TS, TS)

  // decals: sprouts, frost tufts, bones, leaves
  const detail = (rc: Rect, x: number, y: number) => blit(g, gr.floorDetail, rc, x, y)
  const decalRects: Rect[] = [[0, 32, 16, 16], [16, 32, 16, 16], [32, 32, 16, 16], [48, 32, 16, 16], [64, 32, 16, 16], [0, 48, 16, 16], [16, 48, 16, 16], [32, 48, 16, 16], [48, 48, 16, 16], [112, 32, 16, 16]]
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const i = idx(c, r)
      if (kind[i] !== K.Grass || forest[i] || occ[i]) continue
      const v = hash(c, r, 31)
      if (v < 0.2) detail(decalRects[Math.floor(hash(c, r, 32) * decalRects.length)], c * TS, r * TS)
      else if (v < 0.235) detail([0, 0, 16, 16], c * TS, r * TS)
      else if (v < 0.25) detail([[96, 0, 16, 16], [112, 0, 16, 16]][c % 2] as Rect, c * TS, r * TS)
    }
  // lily pads and pale blooms on the swamp, leaf litter on the hill
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const i = idx(c, r)
      if (kind[i] === K.Water && isWater(c - 1, r) && isWater(c + 1, r) && isWater(c, r - 1) && isWater(c, r + 1) && hash(c, r, 61) < 0.18) {
        const x = c * TS + 2 + Math.floor(hash(c, r, 62) * 7), y = r * TS + 3 + Math.floor(hash(c, r, 63) * 7)
        g.fillStyle = "#1c3a40"; g.fillRect(x, y, 6, 4); g.fillRect(x + 1, y - 1, 4, 1); g.fillRect(x + 1, y + 4, 4, 1)
        g.fillStyle = "#2f6a66"; g.fillRect(x + 1, y, 4, 3)
        if (hash(c, r, 64) < 0.35) { g.fillStyle = "#ff9ad8"; g.fillRect(x + 2, y, 2, 2); g.fillStyle = "#fff0fa"; g.fillRect(x + 2, y, 1, 1) }
      }
      if (kind[i] === K.Hill && !blocked[i] && hash(c, r, 65) < 0.14) detail(decalRects[Math.floor(hash(c, r, 66) * decalRects.length)], c * TS, r * TS)
    }
  const clean = canvas(W * TS, H * TS)
  clean.ctx.drawImage(gcv, 0, 0)

  // ── sprites, lights, hotspots
  const sprites: Sprite[] = []
  const lights: Light[] = []
  const hotspots: Hotspot[] = []
  const signs: SceneSign[] = []
  const actors: ActorDef[] = []
  const baked: Sprite[] = []
  const pools: { x: number; y: number; r: number; color: string; a: number }[] = []
  const lamp = (x: number, y: number, r: number, color: string, flicker = 0, pool = 0.28) => {
    const l: Light = { x, y, r, color, flicker }
    lights.push(l)
    if (pool) pools.push({ x, y, r: r * 0.85, color, a: pool })
    return l
  }
  const mk = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => { const { c, ctx } = canvas(w, h); draw(ctx); return c }
  const add = (s: Sprite) => { sprites.push(s); return s }
  const solid = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h })
  const reserve = (c0: number, r0: number, c1: number, r1: number) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inb(c, r)) occ[idx(c, r)] = 1 }

  /** sprite placed by foot point */
  const put = (src: CanvasImageSource, rect: Rect, fx: number, fy: number, o: Partial<Omit<Sprite, "solid">> & { solid?: Box | true } = {}) => {
    const sol = o.solid === true ? solid(fx - 4, fy - 5, 8, 5) : o.solid || undefined
    return add({ kind: "sprite", src, rect, x: Math.round(fx - rect[2] / 2), y: Math.round(fy - rect[3]), baseY: fy, ...o, solid: sol })
  }

  // trees
  const NAT = { dead: [64, 0, 32, 31] as Rect, deadC: [16, 80, 32, 47] as Rect, pine: [32, 0, 32, 32] as Rect, stump: [1, 134, 30, 23] as Rect, round: [0, 0, 32, 32] as Rect }
  const treeAt = (rc: Rect, x: number, y: number, dyn: boolean, fixed?: HTMLCanvasElement) => {
    const s = put(fixed ?? gr.nature, rc, x, y, { solid: dyn ? solid(x - 5, y - 6, 10, 5) : undefined, sway: dyn ? 0.4 : 0, tag: dyn ? "tree" : "bake" })
    return s
  }
  const mix = (c: number, r: number): Rect => {
    const v = hash(c, r, 6)
    return v < 0.45 ? NAT.dead : v < 0.65 ? NAT.deadC : v < 0.95 ? NAT.pine : NAT.stump
  }
  for (let r = -2; r < H + 2; r++)
    for (let c = -2; c < W + 2; c++) {
      if (inb(c, r) && !forest[idx(c, r)] && !(inb(c, r) && false)) continue
      if (inb(c, r) && kind[idx(c, r)] === K.Cliff && r > 0) { if (hash(c, r, 5) < 0.85 || r > 1) continue }
      if (inb(c, r) && kind[idx(c, r)] !== K.Grass && kind[idx(c, r)] !== K.Cliff && kind[idx(c, r)] !== K.Mud) continue
      if ((c + r) % 2 === 1 && hash(c, r, 5) < 0.5) continue
      let nearOpen = false
      for (let dr2 = 0; dr2 <= 3 && !nearOpen; dr2++) for (let dc2 = -2; dc2 <= 2 && !nearOpen; dc2++) if (inb(c + dc2, r + dr2) && !forest[idx(c + dc2, r + dr2)] && kind[idx(c + dc2, r + dr2)] !== K.Water) nearOpen = true
      const rc = mix(c, r)
      const s = treeAt(rc, c * TS + 8 + (hash(c, r, 7) - 0.5) * 10, r * TS + 14 + (hash(c, r, 8) - 0.5) * 8, nearOpen)
      if (!nearOpen) baked.push(s)
    }
  for (let i = 0; i < W * H; i++) if (forest[i]) blocked[i] = 1
  for (let i = 0; i < W * H; i++) if (kind[i] === K.Water || kind[i] === K.Chasm || kind[i] === K.Cliff) blocked[i] = 1
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (kind[idx(c, r)] === K.Plank && (get(c, r - 1) === K.Chasm || get(c, r + 1) === K.Chasm || get(c - 1, r) === K.Chasm)) blocked[idx(c, r)] = 0
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (kind[idx(c, r)] === K.Plank) blocked[idx(c, r)] = 0
  // hill: rim is a wall, except the ladder
  for (let r = HILL.r0; r <= HILL.r1; r++) for (let c = HILL.c0; c <= HILL.c1; c++) {
    if (!isHill(c, r)) continue
    const edge = !isHill(c, r - 1) || !isHill(c, r + 1) || !isHill(c - 1, r) || !isHill(c + 1, r)
    if (edge && !(r === HILL.r1 && LADDER.includes(c))) blocked[idx(c, r)] = 1
  }
  // bridge rails: keep the hero on the planks
  for (let r = BRIDGE.r - 1; r <= BRIDGE.r + 2; r++) for (let c = BRIDGE.c0 + 1; c < BRIDGE.c1; c++) if (get(c, r) === K.Chasm) blocked[idx(c, r)] = 1

  // ── buildings
  const BCV: Record<string, HTMLCanvasElement> = {}
  const patchGlow = (cv: HTMLCanvasElement, srcSheet: HTMLImageElement, art: Rect, rel: Rect, mode: "cream" | "dark", color: [number, number, number]) => {
    const { ctx: sctx } = canvas(art[2], art[3])
    sctx.drawImage(srcSheet, art[0], art[1], art[2], art[3], 0, 0, art[2], art[3])
    const sd = sctx.getImageData(rel[0], rel[1], rel[2], rel[3]).data
    const ctx = cv.getContext("2d")!
    const dd = ctx.getImageData(rel[0], rel[1], rel[2], rel[3]), da = dd.data
    for (let i = 0; i < sd.length; i += 4) {
      if (!sd[i + 3]) continue
      const y = Math.floor(i / 4 / rel[2])
      if (mode === "cream" ? sd[i] > 215 && sd[i + 1] > 175 && sd[i + 2] > 110 : sd[i] + sd[i + 1] + sd[i + 2] < 130) {
        const f = mode === "dark" ? 0.55 + 0.45 * (y / rel[3]) : 1
        da[i] = color[0] * f; da[i + 1] = color[1] * f; da[i + 2] = color[2] * f
      }
    }
    ctx.putImageData(dd, rel[0], rel[1])
  }
  const rgb = (s: string) => s.split(",").map(Number) as [number, number, number]
  for (const b of BUILDS) {
    const a = RUINS_ART[b.art]
    const cv = mk(a[2], a[3], (x) => x.drawImage(gr.abandoned, a[0], a[1], a[2], a[3], 0, 0, a[2], a[3]))
    if (b.lit) {
      const col = rgb(b.lit)
      if (b.art === "cottageA" || b.art === "cottageB") { patchGlow(cv, raw.abandoned, a, [14, 6, 28, 18], "cream", col); patchGlow(cv, raw.abandoned, a, [14, 30, 20, 18], "dark", col) }
      if (b.art === "tower") { patchGlow(cv, raw.abandoned, a, [8, 40, 44, 30], "cream", col); patchGlow(cv, raw.abandoned, a, [12, 62, 24, 18], "dark", col) }
      if (b.art === "ruinHall") patchGlow(cv, raw.abandoned, a, [14, 28, 22, 20], "dark", col)
      if (b.art === "dome") {
        const x = cv.getContext("2d")!
        // a lit doorway under the porch
        x.fillStyle = "#1a1210"; x.fillRect(23, 66, 18, 28)
        x.fillStyle = "#5a3a22"; x.fillRect(22, 65, 20, 2); x.fillRect(22, 65, 2, 29); x.fillRect(40, 65, 2, 29)
        for (let yy = 0; yy < 26; yy++) { const t = yy / 25; x.fillStyle = `rgb(${col[0]},${Math.round(col[1] * (0.7 + 0.3 * t))},${Math.round(col[2] * (0.45 + 0.4 * t))})`; x.fillRect(25, 68 + yy, 14, 1) }
        x.fillStyle = "#5a3a22"; x.fillRect(31, 68, 2, 26)
        patchGlow(cv, raw.abandoned, a, [24, 44, 30, 20], "cream", col)
      }
    }
    BCV[b.id] = cv
    const x = b.c * TS, y = b.r * TS
    const top = b.art === "tower" ? 40 : b.art === "dome" ? 56 : b.art === "kiln" ? 18 : 22
    add({ kind: "sprite", src: cv, rect: [0, 0, a[2], a[3]], x, y, baseY: y + a[3] - 2, flip: b.flip, solid: solid(x + 2, y + top, a[2] - 4, a[3] - top - 3), tag: `b:${b.id}` })
    const d = doorOf(b)
    if (b.light) {
      lamp(d.x, d.y - 8, b.lit ? 74 : 40, b.light, b.lit ? 1 : 0.6, b.lit ? 0.4 : 0.15)
      if (b.lit) lamp(b.c * TS + a[2] / 2, y + a[3] * 0.4, 46, b.light, 0.8, 0.2)
    }
    if (b.section) {
      hotspots.push({ id: `door-${b.id}`, box: { x: d.x - 12, y: d.y - 6, w: 24, h: 18 }, label: `ENTER ${b.label}`, action: { type: "door", to: `ruins:${b.section}`, label: b.label! }, marker: true, markerX: d.x, markerY: y - 6 })
      signs.push({ x: d.x, y: y + 4, label: b.label!, sub: b.sub, accent: b.accent, hotspot: `door-${b.id}` })
    }
    reserve(b.c - 1, b.r - 1, b.c + bSize(b).tw, b.r + bSize(b).th + 1)
  }

  // ── props helpers
  const prop = (name: string, x: number, y: number, o: Partial<Sprite> = {}) => {
    const p = PROPS[name]
    const [, , w, h] = p.rect
    return add({ kind: "sprite", src: gr.element, rect: p.rect, x, y, baseY: y + h - 1, solid: p.solid ? solid(x + 2, y + h - Math.min(10, h), w - 4, Math.min(8, h - 2)) : undefined, ...o })
  }
  const rawElement = sheet("element")
  const lantern = (c: number, r: number, color = "255,190,100", rr = 66) => {
    const [lr, lg, lb] = rgb(color)
    const lcv = mk(16, 30, (x) => {
      x.fillStyle = "#12141f"; x.fillRect(7, 12, 2, 18); x.fillRect(5, 28, 6, 2); x.fillRect(4, 3, 8, 2); x.fillRect(6, 1, 4, 2)
      x.fillStyle = `rgb(${lr},${lg},${lb})`; x.fillRect(5, 5, 6, 8)
      x.fillStyle = "rgba(255,255,255,.85)"; x.fillRect(7, 6, 2, 4)
      x.fillStyle = "#12141f"; x.fillRect(4, 5, 1, 8); x.fillRect(11, 5, 1, 8); x.fillRect(4, 13, 8, 2)
    })
    add({ kind: "sprite", src: lcv, rect: [0, 0, 16, 30], x: c * TS, y: r * TS - 14, baseY: r * TS + 14, solid: solid(c * TS + 4, r * TS + 8, 8, 6) })
    lamp(c * TS + 8, r * TS - 6, rr, color, 1)
    reserve(c, r - 1, c, r)
  }
  const A = (k: string) => RUINS_ART[k]
  const art = (k: string, x: number, y: number, o: Partial<Sprite> = {}, srcImg: CanvasImageSource = gr.abandoned) => { const a = A(k); return add({ kind: "sprite", src: srcImg, rect: a, x, y, baseY: y + a[3] - 1, ...o }) }
  const artFoot = (k: string, fx: number, fy: number, o: Partial<Sprite> & { sol?: boolean } = {}, srcImg: CanvasImageSource = gr.abandoned) => {
    const a = A(k)
    const { sol, ...rest } = o
    return add({ kind: "sprite", src: srcImg, rect: a, x: Math.round(fx - a[2] / 2), y: fy - a[3], baseY: fy, solid: sol === false ? undefined : solid(fx - a[2] / 2 + 3, fy - 6, a[2] - 6, 6), ...rest })
  }

  // ── plaza: glowing fountain with a frog guardian
  const FX = 40 * TS + 8, FY = 29 * TS + 8
  // landmarks' neighbours: lamps
  for (const [c, r] of [[31, 24], [49, 24], [31, 35], [49, 35], [36, 22], [44, 22], [40, 37], [40, 47], [37, 41], [43, 41]]) lantern(c, r)
  artFoot("frog", FX, FY + 4, { sol: true })
  reserve(37, 26, 43, 32)

  // ── elder's hall dressing
  const hd = doors.townhall
  lantern(36, 15); lantern(43, 15)
  for (const dx of [-26, 26]) prop("candles", hd.x + dx, hd.y - 8, { src: rawElement })
  lamp(hd.x - 26, hd.y - 10, 30, "255,190,100", 1.5, 0.1); lamp(hd.x + 26, hd.y - 10, 30, "255,190,100", 1.5, 0.1)
  // library: shelves, scrolls, benches in an overgrown garden
  const ld = doors.academy
  artFoot("shelfA", ld.x - 40, ld.y + 8, {}); artFoot("shelfA", ld.x + 42, ld.y + 8, { flip: true })
  prop("scrolls", ld.x - 20, ld.y + 2, { src: rawElement }); prop("bookshelf", ld.x + 58, ld.y - 10)
  prop("candles", ld.x + 16, ld.y + 4, { src: rawElement })
  lamp(ld.x + 24, ld.y + 2, 40, "130,240,220", 1.2, 0.2)
  // inn: porch tables, barrels, hanging lanterns
  const id0 = doors.tavern
  prop("redTable", id0.x - 36, id0.y + 6); prop("stool", id0.x - 46, id0.y + 8); prop("stool", id0.x - 26, id0.y + 8)
  prop("candles", id0.x - 34, id0.y + 4, { src: rawElement }); lamp(id0.x - 30, id0.y + 2, 36, "255,176,84", 1.8, 0.2)
  prop("barrel", id0.x + 22, id0.y - 2); prop("barrel", id0.x + 36, id0.y - 4); prop("crates", id0.x + 50, id0.y + 2)
  lantern(17, 30, "255,176,84", 78)
  // forge: stone yard with cold embers
  const fd = doors.forge
  prop("oven", fd.x + 36, fd.y - 14); prop("cauldron", fd.x + 54, fd.y - 12); prop("logs", fd.x + 70, fd.y - 10); prop("waterBucket", fd.x - 40, fd.y - 6)
  add({ kind: "sprite", src: rawElement, rect: PROPS.brazier.rect, x: fd.x - 24, y: fd.y - 4, baseY: fd.y + 6, solid: solid(fd.x - 22, fd.y, 12, 8) })
  lamp(fd.x - 18, fd.y + 2, 80, "255,96,40", 1.5, 0.3)
  // post: lanterns on the boardwalk
  const wd = doors.wizard
  lantern(31, 44, "190,140,255", 70); lantern(24, 44, "190,140,255", 60)
  prop("redSign", wd.x + 28, wd.y - 12, { src: rawElement }); prop("scrolls", wd.x - 24, wd.y + 2, { src: rawElement })

  // ── graveyard: graves, iron fence, crypt, torches
  const cx0 = 59 * TS, cy0 = 11 * TS
  const crypt = A("crypt")
  add({ kind: "sprite", src: gr.reliefDetail, rect: crypt, x: cx0, y: cy0 - crypt[3], baseY: cy0 - 1, solid: solid(cx0 + 2, cy0 - 22, crypt[2] - 4, 19), tag: "b:vault" })
  const vd = { x: cx0 + 24, y: cy0 + 2 }
  lamp(vd.x, vd.y - 8, 76, "120,170,255", 0.8, 0.4)
  hotspots.push({ id: "door-gallery", box: { x: vd.x - 12, y: vd.y - 6, w: 24, h: 18 }, label: "ENTER MEMORY VAULT", action: { type: "door", to: "ruins:gallery", label: "MEMORY VAULT" }, marker: true, markerX: vd.x, markerY: cy0 - crypt[3] - 6 })
  signs.push({ x: vd.x, y: cy0 - crypt[3] + 4, label: "MEMORY VAULT", sub: "PROJECTS", accent: "#9a7be0", hotspot: "door-gallery" })
  for (const dx of [-30, 54]) { add({ kind: "sprite", src: rawElement, rect: PROPS.brazier.rect, x: cx0 + dx, y: cy0 - 12, baseY: cy0, solid: solid(cx0 + dx + 2, cy0 - 6, 10, 6) }); lamp(cx0 + dx + 8, cy0 - 12, 56, "110,190,255", 1.2, 0.3) }
  artFoot("pillarGrey", cx0 - 8, cy0 + 2, {}, gr.house); artFoot("pillarGrey", cx0 + 56, cy0 + 2, {}, gr.house)
  for (let i = 0; i < 6; i++) art("ironFence", (53 + (i % 3) * 4.4) * TS, (13 + Math.floor(i / 3) * 4.5) * TS - 2, { baseY: (13 + Math.floor(i / 3) * 4.5) * TS + 12, solid: solid((53 + (i % 3) * 4.4) * TS + 2, (13 + Math.floor(i / 3) * 4.5) * TS + 4, 64, 8) }, gr.house)
  const graves: [number, number][] = [[52, 9], [54, 10], [51, 12], [66, 9], [68, 11], [65, 13], [70, 14], [63, 15], [57, 16], [55, 17], [69, 17], [66, 17], [53, 15], [62, 13]]
  graves.forEach(([c, r], i) => { if (isHill(c, r) && !blocked[idx(c, r)]) prop(["grave", "stoneA", "stoneB"][i % 3], c * TS + 2, r * TS, {}); })
  // bones and skulls
  for (const [c, r] of [[56, 12], [64, 11], [58, 14], [67, 15], [52, 11]]) blit(g, gr.floorDetail, [[208, 0, 16, 16], [224, 0, 16, 16]][c % 2] as Rect, c * TS, r * TS)

  // ── watchtower (ruined) built from cliff panels on the east ledge
  {
    const tw = 3, th = 4
    const cv = mk(tw * TS, th * TS + 4, (x) => {
      for (let r = 0; r < th; r++) for (let c = 0; c < tw; c++) x.drawImage(gr.relief, ...(((c === 0 ? CLIFF.l : c === tw - 1 ? CLIFF.r : CLIFF.m)[r === 0 ? 0 : r === th - 1 ? 2 : 1]) as Rect), c * TS, r * TS + 4, 16, 16)
      x.globalCompositeOperation = "destination-out"
      x.fillRect(32, 0, 16, 6); x.fillRect(38, 6, 10, 4); x.fillRect(0, 0, 6, 3)
      x.globalCompositeOperation = "source-over"
      x.fillStyle = "#0a0d18"; x.fillRect(19, 18, 10, 14); x.fillRect(21, 16, 6, 2)
      x.fillStyle = "#1c2236"; x.fillRect(19, 18, 10, 1)
    })
    const tx = 67 * TS, ty = 25 * TS
    add({ kind: "sprite", src: cv, rect: [0, 0, cv.width, cv.height], x: tx, y: ty - cv.height, baseY: ty - 2, solid: solid(tx + 2, ty - 40, 44, 36) })
    lamp(tx + 24, ty - 36, 40, "110,170,255", 0.6, 0.18)
    artFoot("bushA", tx + 4, ty + 2, { sol: false }); artFoot("bushB", tx + 44, ty + 2, { sol: false })
    signs.push({ x: tx + 24, y: ty - cv.height + 4, label: "BROKEN WATCH", sub: "RUIN", accent: "#6a7ea8" })
    signs.pop()
  }

  // ── seance circle: four spirit stones, one per game
  const games = [
    { id: "serpent", label: "SERPENT", c: SEANCE.c, r: SEANCE.r - 4, col: "70,230,200" },
    { id: "runes", label: "RUNE RECALL", c: SEANCE.c + 4, r: SEANCE.r, col: "190,130,255" },
    { id: "quickdraw", label: "QUICKDRAW", c: SEANCE.c, r: SEANCE.r + 4, col: "255,100,80" },
    { id: "slimes", label: "SLIME SMASH", c: SEANCE.c - 4, r: SEANCE.r, col: "255,200,70" },
  ]
  const orbShrine = (col: string) => {
    const a = A("orbShrine")
    const cv = mk(a[2], a[3], (x) => x.drawImage(gr.house, a[0], a[1], a[2], a[3], 0, 0, a[2], a[3]))
    // replace the blue orb with the stone's own colour
    const src = mk(a[2], a[3], (x) => x.drawImage(raw.house, a[0], a[1], a[2], a[3], 0, 0, a[2], a[3]))
    const sd = src.getContext("2d")!.getImageData(0, 0, a[2], a[3]).data
    const cc = cv.getContext("2d")!
    const dd = cc.getImageData(0, 0, a[2], a[3]), da = dd.data
    const [cr, cg, cb] = rgb(col)
    for (let i = 0; i < sd.length; i += 4) if (sd[i + 3] && sd[i + 2] > sd[i] + 30) { const l = (sd[i] + sd[i + 1] + sd[i + 2]) / 765; da[i] = Math.min(255, cr * (0.5 + l)); da[i + 1] = Math.min(255, cg * (0.5 + l)); da[i + 2] = Math.min(255, cb * (0.5 + l)) }
    cc.putImageData(dd, 0, 0)
    return cv
  }
  const stoneLights: Light[] = []
  for (const gm of games) {
    const fx = gm.c * TS + 8, fy = gm.r * TS + 14
    const cv = orbShrine(gm.col)
    add({ kind: "sprite", src: cv, rect: [0, 0, cv.width, cv.height], x: fx - 15, y: fy - 30, baseY: fy, solid: solid(fx - 12, fy - 9, 24, 9) })
    stoneLights.push(lamp(fx, fy - 18, 74, gm.col, 0.5, 0.35))
    const below = gm.r > SEANCE.r || gm.c !== SEANCE.c
    hotspots.push({ id: `game-${gm.id}`, box: { x: fx - 14, y: fy + (below ? 1 : 1), w: 28, h: 14 }, label: `PLAY ${gm.label}`, action: { type: "game", id: gm.id }, marker: true, markerX: fx, markerY: fy - 34 })
  }
  signs.push({ x: SEANCE.c * TS + 8, y: (SEANCE.r - 7) * TS + 4, label: "SEANCE CIRCLE", sub: "ARCADE", accent: "#b48cff" })
  reserve(SEANCE.c - 6, SEANCE.r - 6, SEANCE.c + 6, SEANCE.r + 6)

  // ── ghost ferry & pier
  const pier = { x: 9 * TS, y: 45 * TS + 8 }
  hotspots.push({ id: "travel", box: { x: 10 * TS, y: 44 * TS + 8, w: 40, h: 24 }, label: "BOARD THE GHOST FERRY", action: { type: "travel" }, marker: true, markerX: pier.x + 24, markerY: 43 * TS })
  signs.push({ x: pier.x + 24, y: 43 * TS - 4, label: "GHOST FERRY", sub: "TRAVEL", accent: "#6fd6e0", hotspot: "travel" })
  const boatSrc = mk(80, 32, (x) => x.drawImage(grade(img(RUINS_SHEETS.boat), 0.7, 0.7, 1.05), 0, 0))
  const boat = add({ kind: "sprite", src: boatSrc, rect: [0, 0, 80, 32], x: 4 * TS - 8, y: 45 * TS + 4, baseY: 46 * TS + 20, dynamic: true })
  const boatLamp = lamp(boat.x + 52, boat.y + 8, 56, "120,230,230", 0.8, 0.25)
  lamp(11 * TS, 45 * TS, 60, "120,230,230", 1, 0.3)
  lantern(13, 44, "120,230,230", 60)

  // ── ruined gate at the village entrance
  artFoot("pillarGrey", 38 * TS + 8, 51 * TS + 8, {}, gr.house); artFoot("pillarGrey", 42 * TS + 8, 51 * TS + 8, {}, gr.house)
  lamp(38 * TS + 8, 49 * TS + 8, 50, "255,190,100", 1, 0.3); lamp(42 * TS + 8, 49 * TS + 8, 50, "255,190,100", 1, 0.3)

  // ── chest nook, far north-west
  const chest = prop("chest", 7 * TS, 9 * TS, { src: rawElement })
  hotspots.push({ id: "chest-ruins", box: { x: 7 * TS - 6, y: 9 * TS + 10, w: 28, h: 18 }, label: "OPEN CHEST", action: { type: "chest", id: "ruins" }, marker: true, markerX: 7 * TS + 8, markerY: 9 * TS - 8 })
  lamp(chest.x + 8, chest.y + 6, 40, "200,230,255", 1, 0.3)
  for (const [c, r] of [[5, 8], [8, 8], [6, 7], [9, 10], [5, 11], [7, 6]]) { if (!forest[idx(c, r)]) treeAt(NAT.dead, c * TS + 8, r * TS + 14, true); forest[idx(c, r)] = forest[idx(c, r)] }
  reserve(5, 8, 9, 11)

  // ── scattered life: dead trees, rocks, mushrooms, ruined walls
  const free = (c: number, r: number) => inb(c, r) && !occ[idx(c, r)] && kind[idx(c, r)] === K.Grass && !forest[idx(c, r)] && !blocked[idx(c, r)]
  const rockSrc = gr.nature
  const ROCKS: Rect[] = [[240, 226, 32, 62], [272, 272, 16, 16], [288, 273, 16, 14], [304, 272, 16, 16], [258, 132, 29, 27]]
  for (let k = 0; k < 150; k++) {
    const c = 6 + Math.floor(rnd() * (W - 12)), r = 6 + Math.floor(rnd() * (H - 12))
    if (!free(c, r) || !free(c + 1, r) || !free(c, r - 1)) continue
    const v = rnd()
    occ[idx(c, r)] = 1
    if (v < 0.4) treeAt(rnd() < 0.7 ? NAT.dead : NAT.deadC, c * TS + 8, r * TS + 14, true)
    else if (v < 0.5) treeAt(NAT.pine, c * TS + 8, r * TS + 14, true)
    else if (v < 0.75) { const rc = ROCKS[1 + Math.floor(rnd() * 4)]; put(rockSrc, rc, c * TS + 8, r * TS + 14, { solid: true }) }
    else if (v < 0.82) put(rockSrc, ROCKS[0], c * TS + 8, r * TS + 14, { solid: solid(c * TS, r * TS - 4, 14, 8) })
    else artFoot(rnd() < 0.5 ? "bushA" : "bushB", c * TS + 8, r * TS + 14, { sol: false })
  }
  for (const r of [26, 34, 42, 50]) lamp(chasmX(r) * TS + 8, r * TS + 8, 60, "90,130,255", 0.8, 0.18)
  // lamps along the roads
  let lc = 0
  for (let r = 8; r < 54; r++) for (let c = 3; c < W - 3; c++) {
    if (kind[idx(c, r)] !== K.Mud) continue
    if (hash(c, r, 77) < 0.035 && lc < 22 && free(c + 1, r)) { lc++; lantern(c + 1, r, hash(c, r, 78) < 0.7 ? "255,190,100" : "170,220,255", 58) }
  }
  // glowing mushrooms
  const mush = (x: number, y: number, col: string) => {
    const [r, g2, b] = rgb(col)
    const cv = mk(11, 10, (cx) => {
      cx.fillStyle = "#e8e4f0"; cx.fillRect(4, 6, 3, 4)
      cx.fillStyle = `rgb(${r},${g2},${b})`; cx.fillRect(2, 3, 7, 3); cx.fillRect(3, 2, 5, 1)
      cx.fillStyle = "rgba(255,255,255,.7)"; cx.fillRect(4, 3, 1, 1); cx.fillRect(7, 4, 1, 1)
      cx.fillStyle = `rgb(${r * 0.6},${g2 * 0.6},${b * 0.6})`; cx.fillRect(2, 5, 7, 1)
    })
    put(cv, [0, 0, 11, 10], x, y, {})
    lamp(x, y - 4, 22, col, 0.6, 0.22)
  }
  const mcols = ["80,230,255", "200,110,255", "90,255,170"]
  for (let k = 0; k < 90; k++) {
    const c = 6 + Math.floor(rnd() * (W - 12)), r = 6 + Math.floor(rnd() * (H - 12))
    if (!free(c, r)) continue
    const n = 1 + Math.floor(rnd() * 3), col = mcols[Math.floor(rnd() * 3)]
    for (let q = 0; q < n; q++) mush(c * TS + 4 + q * 5 + rnd() * 3, r * TS + 12 + rnd() * 3, col)
    occ[idx(c, r)] = 1
    if (lights.length > 260) break
  }
  // broken walls
  for (const [c, r, k] of [[31, 38, "signWall"], [21, 20, "signWall"], [44, 15, "signWall"], [30, 49, "signWall"]] as [number, number, string][]) {
    if (!free(c, r) && !(c === 31 && r === 38)) continue
    art(k, c * TS, r * TS - 8, { solid: solid(c * TS + 4, r * TS + 18, 72, 18) })
  }

  // ── people & creatures
  const npc = (id: string, ch: string, name: string, c: number, r: number, o: Partial<ActorDef>) =>
    actors.push({ id, kind: "npc", sheet: charSheet(ch), face: charFace(ch), name, x: c * TS + 8, y: r * TS + 12, wander: 24, speed: 18, ...o })
  npc("wisp", RUINS_CHARS.ghost, "Wisp", 41, 50, {
    wander: 36,
    lines: ["Oh! A living visitor. How rude of you, being so warm.", "Welcome to Hollow Reach. Seven doors still glow, and each one holds a piece of Rayan Jain's story.", "Elder's Hall is north, past the plaza. Try not to wake the frog."],
    bark: ["Boo. ...Sorry, reflex.", "Mind the chasm. I would, if I could."],
  })
  npc("elder", RUINS_CHARS.elder, "Elder Wren", Math.floor(hd.x / TS) - 2, Math.floor(hd.y / TS) + 3, {
    lines: ["Rayan Jain: Full-stack and Systems Engineer, out of Mumbai.", "He is building a browser AI agents cannot be tricked by. I have seen worse hobbies.", "Open to collabs and interesting problems. The door behind me is unlocked."],
    action: { type: "section", id: "townhall" },
  })
  npc("hobb", RUINS_CHARS.gravekeeper, "Gravekeeper Hobb", 62, 14, {
    wander: 28,
    lines: [`I keep the Memory Vault. ${NPROJ} projects, all well-behaved.`, "Ferrite is my favourite: a Rust browser that cannot be talked into anything. Not even by me.", "Sentinel explains every process it watches. I wish my tenants did."],
    bark: ["Quiet night. They are all quiet.", "The skulls bite. Swing with Space."],
  })
  npc("bones", RUINS_CHARS.bones, "Night Watchman Bones", 44, 38, { wander: 20, bark: ["I watch the road. Sentinel watches everything else, and explains itself.", "Uptime: forever. Perks of the job."] })
  npc("count", RUINS_CHARS.count, "Count Cache", 34, 31, {
    lines: ["I never forget a thing. Redis, 80 out of 100, they tell me.", "Rayan reaches for PostgreSQL, Redis and MongoDB. I reach for necks. Cache invalidation is harder."],
    bark: ["Have we met? I would remember."],
  })
  npc("bard", RUINS_CHARS.bard, "Lucan the Lost Bard", 37, 32, {
    wander: 40,
    lines: ["Ship fast. Break things. Fix faster. A ballad in three lines!", "It is Rayan's motto. Rhymes poorly, ships brilliantly.", "I am lost, yes, but the acoustics here are marvellous."],
    bark: ["Ship fast... break things... la la la..."],
  })
  npc("marrow", RUINS_CHARS.innkeeper, "Granny Marrow", Math.floor(id0.x / TS) + 2, Math.floor(id0.y / TS) + 2, {
    lines: ["Welcome to the Last Lantern. The tea is cold, the stories are warm.", "Rayan interned at Barclays and LazerBelieve, and led the tech side of the CSI-SPIT student chapter.", "Take the board by the door. It lists every quest."],
    action: { type: "section", id: "tavern" },
  })
  npc("quill", RUINS_CHARS.courier, "Quill the Courier", Math.floor(wd.x / TS) + 3, Math.floor(wd.y / TS) + 1, {
    lines: ["Letters for Rayan go to rayansjain@gmail.com. Ravens are optional.", "He answers fast. Faster than the dead, anyway."],
    action: { type: "section", id: "wizard" },
  })
  npc("hex", RUINS_CHARS.apprentice, "Apprentice Hex", Math.floor(ld.x / TS) + 3, Math.floor(ld.y / TS) + 2, {
    lines: ["The Library keeps Rayan's honours: first place at Ignisa '26 with CreditIQ, Pull Shark twice, Quickdraw and YOLO.", "He also ships skrgrep through his own Homebrew tap. I tried to borrow it. It is a CLI, apparently."],
    bark: ["Shh. Books are sleeping."],
  })
  for (const [id, c, r] of [["owl1", 12, 15], ["owl2", 54, 20], ["owl3", 74, 30]] as [string, number, number][])
    actors.push({ id, kind: "npc", sheet: monsterSheet("Owl2"), name: "Owl", x: c * TS + 8, y: r * TS + 12, wander: 0, bark: ["Hoo?", "Hoo. (Rust, probably.)"] })
  const animal = (id: string, name: string, c: number, r: number, wander = 28) => actors.push({ id, kind: "animal", sheet: animalSheet(name), x: c * TS + 8, y: r * TS + 12, wander, speed: 14 })
  animal("cat", "catblack", 41, 36, 30); animal("cat2", "catblack", 20, 30, 18); animal("frog1", "frog", 24, 38, 12); animal("frog2", "frog", 13, 40, 12)
  const mon = (id: string, m: string, c: number, r: number) => actors.push({ id, kind: "monster", sheet: monsterSheet(m), x: c * TS + 8, y: r * TS + 12, wander: 50, speed: 18 })
  mon("m1", "SkullBlue", 54, 13); mon("m2", "SkullBlue", 66, 11); mon("m3", "Spirit", 57, 17); mon("m4", "Spirit", 68, 16); mon("m5", "Flam2", 63, 9); mon("m6", "SkullBlue", 52, 16)

  // ── bake: far trees and lights into the ground
  const bakedSet = new Set(baked)
  for (const s of baked.sort((a, b) => a.baseY - b.baseY)) blit(g, s.src as CanvasImageSource, s.rect, s.x, s.y)
  const live = sprites.filter((s) => !bakedSet.has(s))
  g.globalCompositeOperation = "lighter"
  for (const p of pools) {
    const gd = g.createRadialGradient(p.x, p.y + 6, 0, p.x, p.y + 6, p.r)
    gd.addColorStop(0, `rgba(${p.color},${p.a})`); gd.addColorStop(1, `rgba(${p.color},0)`)
    g.fillStyle = gd; g.fillRect(p.x - p.r, p.y + 6 - p.r, p.r * 2, p.r * 2)
  }
  g.globalCompositeOperation = "source-over"
  // fountain basin and seance runes: emissive, painted after the grade
  {
    const ring = (x: number, y: number, r0: number, r1: number, col: (d: number) => string) => {
      for (let yy = -r1; yy <= r1; yy++) for (let xx = -r1; xx <= r1; xx++) { const d = Math.hypot(xx, yy * 1.15); if (d >= r0 && d < r1) { g.fillStyle = col(d); g.fillRect(x + xx, y + yy, 1, 1) } }
    }
    ring(FX, FY, 0, 31, (d) => (d > 29 ? "#10162a" : d > 25 ? "#8a98aa" : d > 23 ? "#4a566c" : `rgb(${40 + (1 - d / 23) * 40},${150 + (1 - d / 23) * 70},${170 + (1 - d / 23) * 60})`))
    for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, d = rnd() * 20; g.fillStyle = "rgba(220,255,255,.7)"; g.fillRect(FX + Math.cos(a) * d, FY + Math.sin(a) * d * 0.87, 1, 1) }
    const sx = SEANCE.c * TS + 8, sy = SEANCE.r * TS + 8
    for (const [rad, col] of [[52, "rgba(170,140,255,.9)"], [34, "rgba(120,220,230,.85)"], [20, "rgba(255,200,110,.8)"]] as [number, string][]) {
      g.strokeStyle = col; g.lineWidth = 1
      g.beginPath(); g.ellipse(sx, sy + 2, rad, rad * 0.86, 0, 0, Math.PI * 2); g.stroke()
    }
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, x = sx + Math.cos(a) * 43, y = sy + 2 + Math.sin(a) * 37
      g.fillStyle = "rgba(190,160,255,.95)"; g.fillRect(Math.round(x) - 1, Math.round(y) - 2, 2, 5); g.fillRect(Math.round(x) - 2, Math.round(y), 4, 1)
    }
    g.fillStyle = "rgba(255,230,160,.9)"; g.fillRect(sx - 1, sy - 4, 2, 9); g.fillRect(sx - 4, sy, 9, 1)
    g.globalCompositeOperation = "lighter"
    const gd = g.createRadialGradient(sx, sy, 0, sx, sy, 70); gd.addColorStop(0, "rgba(150,110,255,.22)"); gd.addColorStop(1, "rgba(150,110,255,0)")
    g.fillStyle = gd; g.fillRect(sx - 70, sy - 70, 140, 140)
    const gf = g.createRadialGradient(FX, FY, 0, FX, FY, 60); gf.addColorStop(0, "rgba(80,220,230,.3)"); gf.addColorStop(1, "rgba(80,220,230,0)")
    g.fillStyle = gf; g.fillRect(FX - 60, FY - 60, 120, 120)
    g.globalCompositeOperation = "source-over"
  }
  lamp(FX, FY, 92, "90,220,230", 0.7, 0)
  lamp(SEANCE.c * TS + 8, SEANCE.r * TS + 8, 70, "170,130,255", 0.5, 0)

  // ── living things: wisps, fog banks, motes
  const wispCv = (col: string) => mk(9, 9, (x) => {
    const [r, g2, b] = rgb(col)
    const gd = x.createRadialGradient(4.5, 4.5, 0, 4.5, 4.5, 4.5); gd.addColorStop(0, "rgba(255,255,255,1)"); gd.addColorStop(0.3, `rgba(${r},${g2},${b},.9)`); gd.addColorStop(1, `rgba(${r},${g2},${b},0)`)
    x.fillStyle = gd; x.fillRect(0, 0, 9, 9)
  })
  const wcols = ["120,255,220", "160,200,255", "190,150,255", "255,230,150"]
  const wcv = wcols.map(wispCv)
  const wisps = Array.from({ length: 16 }, (_, i) => {
    const ax = 8 * TS + rnd() * (W - 16) * TS, ay = 8 * TS + rnd() * (H - 16) * TS
    const sp = add({ kind: "sprite", src: wcv[i % 4], rect: [0, 0, 9, 9], x: ax, y: ay, baseY: 9000 + i, dynamic: true })
    const L = i % 3 === 0 ? lamp(ax, ay, 34, wcols[i % 4], 0, 0) : null
    return { sp, L, ax, ay, ph: rnd() * 6.28, rx: 20 + rnd() * 40, ry: 10 + rnd() * 24, sp2: 0.15 + rnd() * 0.25 }
  })
  const fogs: { sp: Sprite; v: number; y0: number }[] = []
  {
    const soft = mk(260, 120, (x) => {
      for (let k = 0; k < 9; k++) {
        const br = 30 + hash(k, 3, 90) * 14, bx = 56 + k * 18 + (hash(k, 1, 90) - 0.5) * 8, by = 60 + (hash(k, 2, 90) - 0.5) * 24
        const gd = x.createRadialGradient(bx, by, 0, bx, by, br)
        gd.addColorStop(0, "rgba(150,180,215,.16)"); gd.addColorStop(1, "rgba(150,180,215,0)")
        x.fillStyle = gd; x.fillRect(bx - br, by - br, br * 2, br * 2)
      }
    })
    const spots = [[30, 46], [10, 48], [52, 50], [14, 38], [60, 27], [66, 44], [44, 20], [24, 24], [32, 30], [74, 20], [40, 54], [58, 8], [8, 28], [70, 52]]
    spots.forEach(([c, r], i) => {
      const sp = add({ kind: "sprite", src: soft, rect: [0, 0, 260, 120], x: c * TS - 120, y: r * TS - 40, baseY: 9500 + i, dynamic: true })
      fogs.push({ sp, v: (i % 2 ? 1 : -1) * (3 + (i % 4)), y0: sp.y })
    })
  }
  const motes = Array.from({ length: 36 }, (_, i) => {
    const cv = mk(3, 3, (x) => { x.fillStyle = i % 2 ? "rgba(190,230,255,.9)" : "rgba(255,230,160,.9)"; x.fillRect(1, 1, 1, 1); x.fillStyle = "rgba(255,255,255,.25)"; x.fillRect(0, 1, 3, 1); x.fillRect(1, 0, 1, 3) })
    const sp = add({ kind: "sprite", src: cv, rect: [0, 0, 3, 3], x: 0, y: 0, baseY: 9100, dynamic: true })
    return { sp, ax: rnd() * W * TS, ay: rnd() * H * TS, ph: rnd() * 6.28 }
  })
  const fountainSp = add({ kind: "sprite", src: mk(40, 36, () => undefined), rect: [0, 0, 40, 36], x: FX - 20, y: FY - 40, baseY: FY + 40, dynamic: true })
  // ── MEMORY VAULT exhibits: every project a ghost memory. Featured work floats as glowing panes; the rest rest as tomes.
  {
    const before = sprites.length
    const projects = ordered(content?.projects ?? [])
    const isSoft = (q: Sprite) => !!q.solid && !q.dynamic && q.rect[2] <= 24 && q.rect[3] <= 34
    const softs = sprites.filter(isSoft)
    const solids = sprites.filter((q) => q.solid && !isSoft(q)).map((q) => q.solid!)
    const ok = new Set([K.Hill, K.Grass, K.Mud, K.Plaza])
    const free = (cx: number, fy: number, sw: number) => {
      const x0 = cx - sw / 2, y0 = fy - 12
      if (solids.some((b) => x0 < b.x + b.w && x0 + sw > b.x && y0 < b.y + b.h && fy > b.y)) return false
      for (let r = Math.floor(y0 / TS); r <= Math.floor(fy / TS); r++) for (let c = Math.floor(x0 / TS); c <= Math.floor((x0 + sw) / TS); c++)
        if (!inb(c, r) || blocked[idx(c, r)] || !ok.has(kind[idx(c, r)])) return false
      return true
    }
    // an even grid anchored at fixed multiples, so every region shares the same rows and lanes
    const lattice = (x0: number, x1: number, y0: number, y1: number, dx: number, dy: number) => {
      const out: { cx: number; fy: number }[] = []
      for (let y = Math.ceil(y0 / dy) * dy; y <= y1; y += dy) for (let x = Math.ceil(x0 / dx) * dx; x <= x1; x += dx) out.push({ cx: x, fy: y })
      return out
    }
    const dropped = new Set<Sprite>()
    const vis: Box[] = [{ x: cx0 - 56, y: cy0 - crypt[3] - 14, w: 168, h: crypt[3] + 60 }]
    const dist = (a: { cx: number; fy: number }) => Math.hypot(a.cx - vd.x, (a.fy - vd.y) * 1.3)
    const regions: [number, number, number, number][] = [[51 * TS + 24, 70 * TS - 24, 9 * TS + 8, 18 * TS + 8], [44 * TS, 76 * TS, 19 * TS, 29 * TS], [8 * TS, 44 * TS, 8 * TS, 22 * TS], [24 * TS, 56 * TS, 30 * TS, 38 * TS]]
    const place = (sizeW: number, dx: number, dy: number, k: number, count: number, build: (i: number, k: number) => { cv: HTMLCanvasElement; w: number; h: number; frames: number }, start: number, glowCol: string, orbit: boolean) => {
      let n = 0
      for (const [x0, x1, y0, y1] of regions) {
        const cand = lattice(x0, x1, y0, y1, dx, dy).sort((a, b) => dist(a) - dist(b))
        for (const sl of cand) {
          if (n >= count) return n
          if (!free(sl.cx, sl.fy, sizeW)) continue
          const pr = projects[start + n]
          const m = build(start + n, k)
          const vb: Box = { x: sl.cx - m.w / 2 - 8, y: sl.fy - m.h - 8, w: m.w + 16, h: m.h + 12 }
          if (vis.some((b) => vb.x < b.x + b.w && vb.x + vb.w > b.x && vb.y < b.y + b.h && vb.y + vb.h > b.y)) continue
          vis.push(vb)
          for (const q of softs) if (q.x < vb.x + vb.w && q.x + q.rect[2] > vb.x && q.y < vb.y + vb.h && q.y + q.rect[3] > vb.y && !dropped.has(q)) dropped.add(q)
          const x = Math.round(sl.cx - m.w / 2), y = sl.fy - m.h
          const bx = { x: sl.cx - sizeW / 2, y: sl.fy - 8, w: sizeW, h: 8 }
          add({ kind: "sprite", src: m.cv, rect: [0, 0, m.w, m.h], x, y, baseY: sl.fy, solid: bx, anim: { frames: m.frames, fps: orbit ? 5 : 4, dx: m.w } })
          solids.push(bx)
          hotspots.push({ id: `memory-${pr.id}`, box: { x: sl.cx - 22, y: sl.fy - 2, w: 44, h: 20 }, label: `RECALL ${pr.title.toUpperCase()}`, action: { type: "section", id: "gallery", focus: pr.id }, marker: true, markerX: sl.cx, markerY: y - 4 })
          lamp(sl.cx, sl.fy - m.h * 0.6, orbit ? 70 : 50, glowCol, 0.9, 0.22)
          if (orbit) for (let k = 0; k < 2; k++) {
            const wsp = add({ kind: "sprite", src: wcv[(n + k) % 4], rect: [0, 0, 9, 9], x: sl.cx, y: sl.fy - 40, baseY: 9100 + n * 2 + k, dynamic: true })
            wisps.push({ sp: wsp, L: null, ax: sl.cx, ay: sl.fy - 40, ph: k * Math.PI + n, rx: 34, ry: 16, sp2: 0.7 + 0.15 * k })
          }
          n++
        }
      }
      return n
    }
    const feat = projects.filter((q) => q.featured)
    const placedF = place(44, 80, 64, 0.7, feat.length, (i, k) => memoryPane(projects[i], 4, k), 0, "130,255,225", true)
    const restN = projects.length - feat.length
    const placedR = place(30, 56, 52, 0.65, restN, (i, k) => memoryTome(projects[i], 3, k), feat.length, "140,220,255", false)
    const missing = projects.length - placedF - placedR
    live.push(...sprites.slice(before))
    if (dropped.size) { for (const arr of [sprites, live]) { for (let i = arr.length - 1; i >= 0; i--) if (dropped.has(arr[i])) arr.splice(i, 1) } }
    if (missing > 0) {
      const sx = vd.x - 40, sy = vd.y + 36
      hotspots.push({ id: "memory-more", box: { x: sx - 16, y: sy - 2, w: 32, h: 20 }, label: "READ THE PLAQUE", action: { type: "sign", lines: [`${missing} more memor${missing > 1 ? "ies" : "y"} sleep inside the Vault.`, "Step through the door to see every project."] }, marker: true, markerX: sx, markerY: sy - 24 })
    }
  }

  const tick = (t: number) => {
    for (const w of wisps) {
      const x = w.ax + Math.sin(t * w.sp2 + w.ph) * w.rx, y = w.ay + Math.cos(t * w.sp2 * 1.3 + w.ph) * w.ry
      w.sp.x = x - 4; w.sp.y = y - 4 + Math.sin(t * 2 + w.ph) * 1.5
      if (w.L) { w.L.x = x; w.L.y = y; w.L.r = 32 + Math.sin(t * 3 + w.ph) * 4 }
    }
    for (const f of fogs) { f.sp.x += f.v * 0.016; if (f.sp.x > W * TS) f.sp.x = -260; if (f.sp.x < -260) f.sp.x = W * TS; f.sp.y = f.y0 + Math.sin(t * 0.2 + f.v) * 3 }
    for (const m of motes) { m.sp.x = m.ax + Math.sin(t * 0.4 + m.ph) * 20; m.sp.y = m.ay - ((t * 6 + m.ph * 20) % 60) + Math.cos(t * 0.7 + m.ph) * 4 }
    boat.y = 45 * TS + 4 + Math.round(Math.sin(t * 0.9) * 1.5); boat.baseY = boat.y + 36; boatLamp.y = boat.y + 8
    stoneLights.forEach((l, i) => { l.r = 74 + Math.sin(t * 1.6 + i * 1.5) * 8 })
    const x = fountainSp.src as HTMLCanvasElement
    const fx = x.getContext("2d")!
    fx.clearRect(0, 0, 40, 36)
    for (let k = 0; k < 10; k++) { const ph = (t * 0.5 + k / 10) % 1; fx.fillStyle = `rgba(190,255,255,${1 - ph})`; fx.fillRect(Math.round(20 + Math.sin(k * 2.3 + t) * 7 * ph), Math.round(34 - ph * 26), 1, 2) }
  }
  tick(0)

  const water: { c: number; r: number }[] = []
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (kind[idx(c, r)] === K.Water && isWater(c - 1, r) && isWater(c + 1, r) && isWater(c, r - 1) && isWater(c, r + 1) && hash(c, r, 50) < 0.5) water.push({ c, r })
  const tiles = new Uint8Array(W * H)
  // 3D elevation: graveyard terrace up, north cliff up, chasm a deep pit (the bridge planks keep their own deck height)
  const heights = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) heights[i] = kind[i] === K.Hill ? 1 : kind[i] === K.Cliff ? 3 : kind[i] === K.Chasm ? -2.2 : 0
  for (const c of LADDER) heights[idx(c, HILL.r1)] = 0.5   // the ladder is a half step up onto the terrace
  for (let i = 0; i < W * H; i++) { const v = kind[i]; tiles[i] = v === K.Water ? G.Water : v === K.Plank ? G.Bridge : v === K.Mud ? G.Dirt : v === K.Plaza ? G.Plaza : G.Grass }

  const QUEST: Record<string, string> = {
    townhall: "Meet the Elder in the Elder's Hall", gallery: "Open the Memory Vault", tavern: "Read the board at The Last Lantern", forge: "Warm up at the Cold Forge",
    academy: "Read in the Forgotten Library", wizard: "Leave a note at the Whisper Post", arcade: "Step into the Seance Circle",
  }
  const lmB = (id: string): Landmark => { const b = BUILDS.find((q) => q.id === id)!; return { id, label: b.label!, sub: b.sub!, accent: b.accent!, x: doors[id].x, y: doors[id].y + 2, quest: QUEST[id] } }
  const landmarks: Landmark[] = [
    lmB("townhall"), { id: "gallery", label: "MEMORY VAULT", sub: "PROJECTS", accent: "#9a7be0", x: vd.x, y: vd.y + 2, quest: QUEST.gallery },
    lmB("tavern"), lmB("forge"), lmB("academy"), lmB("wizard"),
    { id: "arcade", label: "SEANCE CIRCLE", sub: "ARCADE", accent: "#b48cff", x: SEANCE.c * TS + 8, y: SEANCE.r * TS + 8, quest: QUEST.arcade },
  ]
  return {
    id: "ruins", title: "Hollow Reach", w: W, h: H, ground: gcv, sprites: live, blocked, hotspots, actors, lights, signs,
    spawn: { x: 40 * TS + 8, y: 54 * TS + 8, facing: "up" }, dark: 0.6, music: "ruins", bg: "#0a0d1c", tick, water, world: "ruins",
    tiles, heights, ground3d: clean.c, baked, landmarks,
    lighting: { tint: "8,12,38" }, arrive: { x: 12 * TS + 8, y: 46 * TS + 6, facing: "right" },
  }
}

export const RUINS_PRELOAD: string[] = [
  ...FRAME_PRELOAD,
  ...Object.values(SHEETS), ...Object.values(RUINS_SHEETS),
  ...Object.values(RUINS_CHARS).flatMap((n) => [charSheet(n), charFace(n)]),
  ...["SkullBlue", "Spirit", "Flam2", "Owl2"].map(monsterSheet), animalSheet("catblack"), animalSheet("frog"),
]
