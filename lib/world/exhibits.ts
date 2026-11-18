// Exhibit system: every project becomes a piece of pixel art (an illustration of its subject), and each world
// presents that art its own way (gilded frames, billboards, carved steles, spectral panes).
// Everything here is generated from project data, deterministically, on 16px-tile scale canvases.
import type { Project } from "@/lib/content"
import { motifFor, hashStr, rng, type Motif } from "@/lib/quick/motif"
import { canvas, img, ready } from "./core"

export type ExProject = Pick<Project, "short" | "id" | "title" | "tagline" | "accent" | "year" | "featured" | "category" | "tech" | "description" | "highlights">

/** native size of every illustration, in px (4 x 2.5 tiles) */
export const ART_W = 64
export const ART_H = 40

// ── colour helpers ──────────────────────────────────────────────
const toRgb = (h: string): [number, number, number] => {
  const s = h.replace("#", "")
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s
  const n = parseInt(f.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const hexOf = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`
export function mix(a: string, b: string, t: number) {
  const x = toRgb(a), y = toRgb(b)
  return hexOf(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t)
}
export const rgbCsv = (h: string) => toRgb(h).join(",")
const safeAccent = (a: string) => (/^#[0-9a-f]{6}$/i.test(a || "") ? a : "#ffd76a")

export interface Pal { a: string; d: string; dd: string; l: string; ll: string; deep: string }
export const palOf = (accent: string): Pal => {
  const a = safeAccent(accent)
  return { a, d: mix(a, "#000000", 0.38), dd: mix(a, "#000000", 0.66), l: mix(a, "#ffffff", 0.4), ll: mix(a, "#ffffff", 0.78), deep: mix(a, "#0a0816", 0.86) }
}

const INK = "#120f1c", WHITE = "#f6f2e8", PAPER = "#e6dcc4", STEEL = "#9aa5b5", STEEL_D = "#5d687b", STEEL_L = "#d3dae4", GOLD = "#f4c430", GOLD_D = "#b07d14"
const RED = "#e5483d", GREEN = "#58c46a", BLUE = "#4aa3ff", ORANGE = "#ff9a3c", YELLOW = "#ffe066"

// ── 5x7 and 3x5 bitmap fonts ────────────────────────────────────
const GLYPHS: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 10001 11110 10001 10001 11110", C: "01110 10001 10000 10000 10000 10001 01110",
  D: "11110 10001 10001 10001 10001 10001 11110", E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001", I: "01110 00100 00100 00100 00100 00100 01110",
  J: "00111 00010 00010 00010 00010 10010 01100", K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 11001 10101 10011 10001 10001 10001", O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000", Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100", U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100", W: "10001 10001 10001 10101 10101 11011 10001", X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
  "0": "01110 10001 10011 10101 11001 10001 01110", "1": "00100 01100 00100 00100 00100 00100 01110", "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11110 00001 00001 01110 00001 00001 11110", "4": "00010 00110 01010 10010 11111 00010 00010", "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110", "7": "11111 00001 00010 00100 01000 01000 01000", "8": "01110 10001 10001 01110 10001 10001 01110",
  "9": "01110 10001 10001 01111 00001 00010 01100",
  "&": "01100 10010 10100 01000 10101 10010 01101", "-": "00000 00000 00000 11111 00000 00000 00000", ".": "00000 00000 00000 00000 00000 01100 01100",
  "!": "00100 00100 00100 00100 00100 00000 00100", "/": "00001 00001 00010 00100 01000 10000 10000", ":": "00000 01100 01100 00000 01100 01100 00000",
  "'": "00100 00100 01000 00000 00000 00000 00000", "+": "00000 00100 00100 11111 00100 00100 00000", " ": "00000 00000 00000 00000 00000 00000 00000",
  "?": "01110 10001 00001 00110 00100 00000 00100", "#": "01010 11111 01010 01010 11111 01010 00000", "_": "00000 00000 00000 00000 00000 00000 11111",
  "(": "00010 00100 01000 01000 01000 00100 00010", ")": "01000 00100 00010 00010 00010 00100 01000", ",": "00000 00000 00000 00000 01100 00100 01000",
  "%": "11001 11010 00010 00100 01000 01011 10011", "*": "00000 10101 01110 11111 01110 10101 00000", "=": "00000 00000 11111 00000 11111 00000 00000",
}
const GROWS: Record<string, number[][]> = {}
for (const [k, v] of Object.entries(GLYPHS)) GROWS[k] = v.split(" ").map((r) => r.split("").map(Number))
const MICRO: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011",
  H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101",
  O: "010101101101010", P: "110101110100100", Q: "010101101111011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111",
  V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
  "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110", "4": "101101111001001", "5": "111100110001110",
  "6": "011100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001110",
  ".": "000000000000010", "+": "000010111010000", "-": "000000111000000", "/": "001001010100100", "'": "010010000000000", "!": "010010010000010", ":": "000010000010000", " ": "000000000000000",
  "?": "110001010000010", "#": "101111101111101", "_": "000000000000111", "*": "101010111010101", "=": "000111000111000", "%": "101001010100101",
}
type Ctx = CanvasRenderingContext2D
export const textW = (s: string) => Math.max(0, s.length * 6 - 1)
export const microW = (s: string) => Math.max(0, s.length * 4 - 1)
export function drawText(ctx: Ctx, s: string, x: number, y: number, color: string, shadow?: string) {
  const pass = (ox: number, oy: number, col: string) => {
    ctx.fillStyle = col
    let cx = x + ox
    for (const ch of s.toUpperCase()) {
      const gl = GROWS[ch] ?? GROWS[" "]
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c]) ctx.fillRect(cx + c, y + oy + r, 1, 1)
      cx += 6
    }
  }
  if (shadow) { pass(1, 1, shadow); pass(1, 0, shadow); pass(0, 1, shadow) }
  pass(0, 0, color)
}
export function drawMicro(ctx: Ctx, s: string, x: number, y: number, color: string, shadow?: string) {
  const pass = (ox: number, oy: number, col: string) => {
    ctx.fillStyle = col
    let cx = x + ox
    for (const ch of s.toUpperCase()) {
      const gl = MICRO[ch] ?? MICRO[" "]
      for (let i = 0; i < 15; i++) if (gl[i] === "1") ctx.fillRect(cx + (i % 3), y + oy + Math.floor(i / 3), 1, 1)
      cx += 4
    }
  }
  if (shadow) pass(1, 1, shadow)
  pass(0, 0, color)
}
/** hand-picked short forms for titles too long for any plaque (a `short` on the content object wins over these) */
const SHORT: Record<string, string> = { "financial-research-automation": "FIN RESEARCH", "classroom-mcp": "CLASSROOM" }
const clean = (t: string) => t.toUpperCase().replace(/[^A-Z0-9 &'.!/:+\-?#_()]/g, "").replace(/\s+/g, " ").trim()
/** split "ClassroomPilot" / "BUG//REPORT" style titles into words */
const splitWords = (t: string) => t.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[\/_]+/g, " ").split(/\s+/).filter(Boolean)
const abbr = (w: string, n: number) => (w.length <= n ? w : w.slice(0, Math.max(2, n - 1)) + ".")
/** a title that fits `max` px: full title in the 5x7 face, else a short form or the 3x5 face, never a mid-word cut */
export function fitTitle(src: string | { id?: string; title: string; short?: string }, max: number): { s: string; micro: boolean; w: number } {
  const title = typeof src === "string" ? src : src.title
  const short = typeof src === "string" ? undefined : src.short ?? (src.id ? SHORT[src.id] : undefined)
  const full = clean(title) || "UNTITLED"
  const ws = splitWords(title.replace(/[^A-Za-z0-9 \/_]/g, " ")).map((w) => w.toUpperCase())
  const cands: string[] = []
  if (short) cands.push(clean(short))
  cands.push(full, ws.join(" "))
  for (let n = 8; n >= 3; n--) {
    const cur = [...ws]
    for (;;) {
      const i = cur.reduce((bi, w, k) => (w.length > cur[bi].length ? k : bi), 0)
      if (!cur.length || cur[i].length <= n) break
      cur[i] = abbr(cur[i], n)
      cands.push(cur.join(" "))
    }
  }
  if (ws.length > 1) cands.push(ws.map((w) => w[0]).join(""))
  const ok = cands.filter(Boolean), np = (short ? 3 : 2)
  for (const grp of [ok.slice(0, np), ok.slice(np)]) {
    for (const t of grp) if (textW(t) <= max) return { s: t, micro: false, w: textW(t) }
    for (const t of grp) if (microW(t) <= max) return { s: t, micro: true, w: microW(t) }
  }
  const first = ws[0] ?? full
  for (let n = first.length; n > 1; n--) { const t = abbr(first, n); if (microW(t) <= max) return { s: t, micro: true, w: microW(t) } }
  return { s: first.slice(0, 1), micro: true, w: 3 }
}

// ── pen: crisp, integer-only drawing ───────────────────────────
class Pen {
  readonly c: HTMLCanvasElement
  readonly x: Ctx
  constructor(public w: number, public h: number) { const k = canvas(w, h); this.c = k.c; this.x = k.ctx }
  r(x: number, y: number, w: number, h: number, col: string) { this.x.fillStyle = col; this.x.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }
  p(x: number, y: number, col: string) { this.x.fillStyle = col; this.x.fillRect(Math.round(x), Math.round(y), 1, 1) }
  a(al: number) { this.x.globalAlpha = al }
  line(x0: number, y0: number, x1: number, y1: number, col: string, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    this.x.fillStyle = col
    for (;;) {
      this.x.fillRect(x0, y0, th, th)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) { err += dy; x0 += sx }
      if (e2 <= dx) { err += dx; y0 += sy }
    }
  }
  disc(cx: number, cy: number, r: number, col: string) {
    this.x.fillStyle = col
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.7) this.x.fillRect(Math.round(cx) + x, Math.round(cy) + y, 1, 1)
  }
  ring(cx: number, cy: number, r: number, col: string, th = 1) {
    this.x.fillStyle = col
    const ri = (r - th) * (r - th)
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r + r * 0.7 && d > ri + (r - th) * 0.7) this.x.fillRect(Math.round(cx) + x, Math.round(cy) + y, 1, 1) }
  }
  ell(cx: number, cy: number, rx: number, ry: number, col: string) {
    this.x.fillStyle = col
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) this.x.fillRect(Math.round(cx) + x, Math.round(cy) + y, 1, 1)
  }
  /** outlined box: ink edge, fill inside */
  box(x: number, y: number, w: number, h: number, fill: string, line = INK) { this.r(x, y, w, h, line); this.r(x + 1, y + 1, w - 2, h - 2, fill) }
  /** scanline polygon fill sampled at pixel centres */
  poly(pts: [number, number][], col: string) {
    const ys = pts.map((p) => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys))
    this.x.fillStyle = col
    for (let y = y0; y <= y1; y++) {
      const xs: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]
        const yy = y + 0.5
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax))
      }
      xs.sort((p, q) => p - q)
      for (let i = 0; i + 1 < xs.length; i += 2) this.x.fillRect(Math.round(xs[i]), y, Math.max(1, Math.round(xs[i + 1]) - Math.round(xs[i])), 1)
    }
  }
  /** annulus sector painted per pixel; colour from a function of the 0..1 position along the arc */
  arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, col: (t: number) => string) {
    for (let y = -r1; y <= r1; y++) for (let x = -r1; x <= r1; x++) {
      const d = Math.sqrt(x * x + y * y)
      if (d < r0 || d > r1) continue
      let a = Math.atan2(y, x); if (a < a0 - 1e-6) a += Math.PI * 2
      if (a < a0 || a > a1) continue
      this.x.fillStyle = col((a - a0) / (a1 - a0))
      this.x.fillRect(Math.round(cx) + x, Math.round(cy) + y, 1, 1)
    }
  }
  /** bitmap from rows: each char is a palette key, '.' is empty */
  bm(rows: string[], pal: Record<string, string>, x: number, y: number, o: { outline?: boolean | string; flip?: boolean } = {}) {
    const w = Math.max(...rows.map((r) => r.length)), h = rows.length
    const k = canvas(w + 2, h + 2)
    rows.forEach((row, j) => [...row].forEach((ch, i) => { const col = pal[ch]; if (col) { k.ctx.fillStyle = col; k.ctx.fillRect((o.flip ? w - 1 - i : i) + 1, j + 1, 1, 1) } }))
    if (o.outline) outline(k.c, typeof o.outline === "string" ? o.outline : INK)
    this.x.drawImage(k.c, Math.round(x) - 1, Math.round(y) - 1)
  }
  /** draw another canvas with an ink outline */
  stamp(src: HTMLCanvasElement, x: number, y: number, ol: string | false = INK) {
    const k = canvas(src.width + 2, src.height + 2)
    k.ctx.drawImage(src, 1, 1)
    if (ol) outline(k.c, ol)
    this.x.drawImage(k.c, Math.round(x) - 1, Math.round(y) - 1)
  }
  spark(x: number, y: number, col: string, big = false) {
    this.p(x, y, col); this.p(x - 1, y, col); this.p(x + 1, y, col); this.p(x, y - 1, col); this.p(x, y + 1, col)
    if (big) { this.p(x - 2, y, col); this.p(x + 2, y, col); this.p(x, y - 2, col); this.p(x, y + 2, col); this.p(x, y, "#ffffff") }
  }
}
/** 1px outline around the opaque pixels of a canvas (4-neighbour), in place */
function outline(c: HTMLCanvasElement, col: string) {
  const ctx = c.getContext("2d")!
  const d = ctx.getImageData(0, 0, c.width, c.height), a = d.data
  const [r, g, b] = toRgb(col)
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < c.width && y < c.height && a[(y * c.width + x) * 4 + 3] > 40
  const add: number[] = []
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) add.push(y * c.width + x)
  for (const i of add) { a[i * 4] = r; a[i * 4 + 1] = g; a[i * 4 + 2] = b; a[i * 4 + 3] = 255 }
  ctx.putImageData(d, 0, 0)
}

// ── scene toolkit ───────────────────────────────────────────────
type Scene = (P: Pen, c: Pal, rnd: () => number, rich: boolean) => void

function backdrop(P: Pen, c: Pal, rnd: () => number, style: "night" | "dusk" | "room" | "paper" | "space" = "dusk") {
  const dark = style === "paper" ? "#2a2540" : "#0a0816"
  const bands = style === "room" ? [0.8, 0.77, 0.74, 0.71, 0.68] : [0.9, 0.87, 0.83, 0.78, 0.72]
  const bh = Math.ceil(P.h / bands.length)
  bands.forEach((t, i) => P.r(0, i * bh, P.w, bh, mix(c.a, dark, t)))
  if (style === "night" || style === "space" || style === "dusk") {
    const n = style === "space" ? 26 : 14
    for (let i = 0; i < n; i++) { const x = Math.floor(rnd() * P.w), y = Math.floor(rnd() * (P.h - 12)); P.p(x, y, i % 4 === 0 ? c.ll : mix(c.l, dark, 0.35)) }
  }
  if (style === "room") { for (let x = 0; x < P.w; x += 8) P.r(x, 0, 1, P.h, mix(c.a, dark, 0.75)) }
}
function floor(P: Pen, y: number, c: Pal, tone = 0.6) {
  P.r(0, y, P.w, P.h - y, mix(c.a, "#0a0816", tone)); P.r(0, y, P.w, 1, mix(c.a, "#ffffff", 0.18))
  for (let x = 2; x < P.w; x += 8) P.r(x, y + 3, 4, 1, mix(c.a, "#0a0816", tone - 0.12))
}
function glow(P: Pen, cx: number, cy: number, r: number, col: string, al = 0.18) {
  for (let k = 3; k >= 1; k--) { P.a(al * (4 - k) / 3); P.disc(cx, cy, Math.round((r * k) / 3), col) }
  P.a(1)
}
function win(P: Pen, x: number, y: number, w: number, h: number, bar: string, body: string) {
  P.box(x, y, w, h, body); P.r(x + 1, y + 1, w - 2, 5, bar); P.p(x + 3, y + 3, RED); P.p(x + 5, y + 3, GOLD); P.p(x + 7, y + 3, GREEN); P.r(x + 1, y + 6, w - 2, 1, INK)
}
function shieldAt(P: Pen, cx: number, top: number, w: number, h: number, fill: string, rim: string) {
  const rows = (g: number, col: string) => {
    for (let i = -g; i < h + g; i++) {
      const t = Math.max(0, Math.min(1, i / (h - 1)))
      const half = (t < 0.45 ? w / 2 : (w / 2) * (1 - Math.pow((t - 0.45) / 0.55, 1.5))) + g
      P.r(cx - half, top + i, Math.max(1, half * 2), 1, col)
    }
  }
  rows(1, INK); rows(0, rim)
  const sw = w - 4
  for (let i = 2; i < h - 2; i++) {
    const t = i / (h - 1)
    const half = ((t < 0.45 ? sw / 2 : (sw / 2) * (1 - Math.pow((t - 0.45) / 0.55, 1.5)))) - 0.5
    if (half > 0.5) P.r(cx - half, top + i, half * 2, 1, fill)
  }
  P.r(cx - 1, top + 3, 2, h - 8, mix(fill, "#ffffff", 0.25))
}
function cloud(P: Pen, cx: number, cy: number, s: number, fill: string, lit: string) {
  const k = canvas(Math.round(s * 2.4), Math.round(s * 1.5))
  const kp = new Pen(k.c.width, k.c.height)
  kp.disc(s * 0.75, s * 0.95, Math.round(s * 0.5), fill); kp.disc(s * 1.25, s * 0.7, Math.round(s * 0.62), fill); kp.disc(s * 1.7, s * 1.0, Math.round(s * 0.45), fill); kp.r(s * 0.75, s * 0.8, s * 1, s * 0.65, fill)
  kp.r(s * 0.9, s * 0.4, s * 0.55, 1, lit)
  P.stamp(kp.c, cx - k.c.width / 2, cy - k.c.height / 2)
}
function gear(P: Pen, cx: number, cy: number, r: number, col: string, hole = INK) {
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; P.disc(cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1), 1, col) }
  P.disc(cx, cy, r, col); P.disc(cx, cy, Math.max(1, Math.round(r * 0.4)), hole)
}
function bubble(P: Pen, x: number, y: number, w: number, h: number, fill: string, tailLeft = true) {
  P.box(x, y, w, h, fill)
  const tx = tailLeft ? x + 3 : x + w - 5
  P.r(tx, y + h, 3, 1, INK); P.r(tx + 1, y + h, 2, 1, fill); P.r(tx, y + h + 1, 1, 1, INK); P.r(tx + 1, y + h + 1, 1, 1, fill); P.p(tx + 2, y + h + 1, INK); P.p(tx, y + h + 2, INK)
}
function arrowR(P: Pen, x: number, y: number, len: number, col: string) {
  P.r(x, y - 1, len - 3, 3, INK); P.r(x, y, len - 3, 1, col)
  P.poly([[x + len - 4, y - 3], [x + len, y + 0.5], [x + len - 4, y + 4]], INK); P.poly([[x + len - 4, y - 2], [x + len - 1, y + 0.5], [x + len - 4, y + 3]], col)
}
function codeLines(P: Pen, x: number, y: number, rows: [number, string][], gap = 3) {
  rows.forEach(([w, col], i) => P.r(x, y + i * gap, w, 1, col))
}
function cursorArrow(P: Pen, x: number, y: number, col: string) {
  P.bm(["X.......", "XX......", "XCX.....", "XCCX....", "XCCCX...", "XCCCCX..", "XCCXXXX.", "XXCCX...", "..XCCX..", "..XXXX.."].map((r) => r.replace(/X/g, "X")), { X: INK, C: col }, x, y)
}

// ── the illustrations ───────────────────────────────────────────
// Safe zone for the important shapes is y < 32; the last rows are floor so a title banner can sit on them.

const sceneFerrite: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "night"); glow(P, 32, 20, 26, c.a, 0.2)
  win(P, 3, 3, 38, 28, c.a, "#1d2338")
  P.r(8, 12, 28, 4, WHITE); P.r(9, 13, 2, 2, c.a); P.r(13, 13, 18, 2, "#aab3c8")
  codeLines(P, 7, 19, [[20, "#5b6684"], [27, "#39425f"], [14, "#39425f"], [22, "#39425f"]], 3)
  shieldAt(P, 38, 6, 22, 26, "#2c3a5e", STEEL_L)
  P.bm(["..SSS..", ".S...S.", ".S...S.", "SSSSSSS", "SSSSSSS", "SSSKSSS", "SSSKSSS", "SSSSSSS"], { S: WHITE, K: "#2c3a5e" }, 34, 14)
  P.r(36, 22, 1, 1, c.a)
  // the robot hand, held back by the shield
  P.box(57, 19, 7, 9, STEEL_D); P.p(60, 23, RED); P.p(61, 23, "#ffb0a8")
  P.box(48, 15, 10, 17, STEEL); P.r(49, 16, 8, 2, STEEL_L); P.r(49, 29, 8, 2, STEEL_D)
  for (const fy of [16, 21, 26]) { P.box(43, fy, 7, 4, STEEL_L); P.r(44, fy + 1, 5, 1, WHITE) }
  P.spark(43, 23, YELLOW, true); P.p(41, 19, RED); P.p(42, 27, RED); P.p(40, 23, ORANGE)
  floor(P, 33, c, 0.5)
}

const sceneSentinel: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "night")
  // radar fan
  P.a(0.22); P.poly([[32, 8], [-2, 31], [66, 31]], c.l); P.a(0.18); P.poly([[32, 8], [8, 31], [56, 31]], c.ll); P.a(1)
  // network on the ground
  const nodes: [number, number][] = [[7, 31], [19, 28], [46, 29], [58, 31], [32, 33]]
  const edges = [[0, 1], [1, 4], [4, 2], [2, 3], [1, 2]]
  for (const [a, b] of edges) P.line(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], c.d, 1)
  nodes.forEach(([x, y], i) => { P.disc(x, y, 3, INK); P.disc(x, y, 2, i === 3 ? RED : c.l); P.p(x - 1, y - 1, WHITE) })
  // watchtower
  P.box(27, 15, 12, 19, "#8b93a7"); P.r(28, 16, 3, 17, "#b4bccb"); P.r(35, 16, 3, 17, "#6a7288")
  for (let y = 19; y < 33; y += 4) P.r(28, y, 10, 1, "#6a7288")
  P.box(24, 11, 18, 5, "#a4adbe"); for (let x = 24; x < 42; x += 6) P.box(x, 8, 4, 4, "#a4adbe")
  P.r(30, 21, 6, 6, INK); P.r(31, 22, 4, 4, YELLOW); P.r(31, 22, 4, 1, WHITE)
  P.r(32, 3, 2, 6, STEEL_D); P.box(26, 2, 14, 3, c.l); P.r(27, 3, 12, 1, WHITE); P.disc(33, 1, 2, RED)
  P.spark(33, 1, "#ffb0a8")
  floor(P, 35, c, 0.5)
}

const sceneDuckOps: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "dusk")
  cloud(P, 50, 10, 11, WHITE, STEEL_L)
  P.r(49, 10, 2, 7, c.a); P.poly([[46, 11], [50, 6], [54, 11]], c.a)
  // dotted path up to the cloud
  for (let i = 0; i < 6; i++) P.p(44 + i * 2, 29 - i * 3, c.ll)
  // conveyor
  P.box(0, 28, 64, 6, STEEL_D); P.r(0, 29, 64, 1, STEEL)
  for (let x = 2; x < 64; x += 6) { P.r(x, 31, 3, 1, INK); P.r(x + 1, 30, 1, 1, STEEL_L) }
  for (const x of [4, 28, 52]) { P.disc(x, 36, 3, STEEL); P.disc(x, 36, 1, INK) }
  gear(P, 16, 36, 3, STEEL_L)
  const boxes: [number, string][] = [[4, "#3b86e8"], [24, "#e25b4a"], [44, "#34b7a0"]]
  boxes.forEach(([x, col]) => {
    P.box(x, 16, 17, 13, col); for (let i = 3; i < 16; i += 3) P.r(x + i, 17, 1, 11, mix(col, "#000000", 0.28))
    P.r(x + 1, 17, 15, 1, mix(col, "#ffffff", 0.35)); P.r(x + 6, 24, 5, 3, mix(col, "#000000", 0.4))
  })
  // the duck
  const D: Record<string, string> = { y: YELLOW, Y: "#d9a61e", o: ORANGE, K: INK, w: "#fff6b8" }
  P.bm([
    "......yyy.......", ".....yyyyy......", ".....yKyyyoooo..", ".....yyyyyooooo.", "......yyyy......", "......yyyy......",
    "..yy..yyyyy.....", ".yyyyyyyyyyyy...", "yyyyyyyyyyyyyy..", "yyyYYyyyyyyyyy..", ".yyYYYyyyyyyy...", "..yyyyyyyyyy....",
  ], D, 7, 4, { outline: true })
  P.r(11, 6, 1, 1, WHITE)
  P.spark(36, 8, c.ll); P.spark(12, 3, c.ll)
  floor(P, 36, c, 0.52)
}

const sceneDevHub: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  // request pane (left) and response pane (right)
  win(P, 3, 3, 24, 16, c.a, "#1d1a30"); P.r(6, 11, 6, 3, GREEN); P.r(14, 11, 9, 1, "#8f88b8"); P.r(14, 14, 7, 1, "#5b5585"); P.r(6, 16, 12, 1, "#5b5585")
  win(P, 37, 3, 24, 16, c.l, "#1d1a30"); P.r(40, 11, 3, 3, GREEN); P.r(45, 11, 5, 1, WHITE); P.r(45, 13, 11, 1, "#8f88b8"); P.r(40, 16, 15, 1, "#5b5585")
  arrowR(P, 27, 8, 10, YELLOW)
  P.line(36, 15, 29, 15, ORANGE); P.poly([[28, 15], [31, 12], [31, 18]], ORANGE)
  // toolbox: carry handle, tray of tools, latch
  P.ring(32, 24, 8, INK, 3); P.ring(32, 24, 7, STEEL, 1); P.r(22, 24, 21, 8, mix(c.a, "#0a0816", 0.78))
  P.box(8, 22, 48, 12, c.a); P.r(9, 23, 46, 2, c.l); P.r(9, 30, 46, 3, c.d)
  P.r(8, 27, 48, 1, INK); P.box(28, 25, 8, 5, GOLD); P.r(31, 27, 2, 2, INK)
  P.box(11, 17, 4, 7, STEEL_L); P.box(10, 14, 6, 4, STEEL); P.r(12, 14, 2, 3, INK)
  P.box(47, 15, 4, 9, ORANGE); P.r(47, 23, 4, 1, INK); P.box(46, 13, 6, 3, STEEL_L); P.r(21, 19, 3, 5, GOLD); P.r(40, 19, 3, 5, RED)
  P.r(7, 34, 50, 1, INK); P.r(8, 35, 48, 1, c.dd)
  floor(P, 35, c, 0.5)
  P.spark(8, 24, c.ll); P.spark(58, 26, c.ll)
}

const sceneNeuroCred: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "dusk")
  // shop front
  P.box(3, 9, 30, 24, mix(c.a, "#2a1640", 0.55)); P.r(4, 10, 28, 2, mix(c.a, "#ffffff", 0.2))
  for (let i = 0; i < 7; i++) { const x = 3 + i * 4.3; P.box(Math.round(x), 10, 5, 7, i % 2 ? WHITE : c.a); P.r(Math.round(x) + 1, 16, 3, 2, i % 2 ? WHITE : c.a) }
  P.r(4, 17, 28, 1, INK)
  P.box(6, 21, 13, 10, "#ffe9a8"); P.r(7, 22, 11, 1, WHITE); P.disc(10, 28, 2, c.a); P.box(13, 26, 4, 4, ORANGE); P.r(8, 25, 3, 1, INK)
  P.box(22, 21, 8, 12, c.d); P.p(24, 28, GOLD)
  P.box(10, 6, 14, 5, INK); P.r(11, 7, 12, 3, GOLD); P.r(12, 8, 10, 1, GOLD_D)
  // credit dial, needle rising
  P.disc(48, 30, 15, INK); P.disc(48, 30, 13, "#14122a")
  P.arc(48, 30, 8, 13, Math.PI, Math.PI * 2, (t) => (t < 0.33 ? RED : t < 0.66 ? YELLOW : GREEN))
  for (let k = 0; k <= 4; k++) { const a = Math.PI + (k * Math.PI) / 4; P.p(48 + Math.cos(a) * 14.5, 30 + Math.sin(a) * 14.5, WHITE) }
  P.line(48, 30, 56, 20, INK, 2); P.line(48, 30, 56, 20, WHITE, 1); P.disc(48, 30, 3, INK); P.disc(48, 30, 2, c.l)
  P.r(35, 31, 28, 4, INK)
  P.poly([[55, 7], [60, 13], [57, 13], [57, 17], [53, 17], [53, 13], [50, 13]], INK); P.poly([[55, 9], [58, 12], [56, 12], [56, 16], [54, 16], [54, 12], [52, 12]], GREEN)
  P.spark(40, 12, c.ll)
  floor(P, 35, c, 0.5)
}

const sceneNebula: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "space")
  glow(P, 24, 17, 20, c.a, 0.22)
  // galaxy
  for (let i = 0; i < 150; i++) {
    const arm = i % 2, t = Math.sqrt(i / 150), a = t * 5.2 + arm * Math.PI + (rnd() - 0.5) * 0.7, r = t * 18
    const x = 24 + Math.cos(a) * r, y = 17 + Math.sin(a) * r * 0.62
    P.p(x, y, t < 0.3 ? WHITE : t < 0.6 ? c.ll : c.l)
  }
  P.disc(24, 17, 3, c.ll); P.disc(24, 17, 1, WHITE)
  // malicious particles
  const bad: [number, number][] = [[41, 22], [47, 27], [38, 28], [52, 21], [44, 31], [56, 29], [50, 24]]
  bad.forEach(([x, y]) => { P.r(x - 1, y - 1, 3, 3, INK); P.r(x, y, 1, 1, RED); P.p(x - 1, y - 1, "#ff9d92") })
  // net: bowl of diamonds on a pole
  P.line(60, 2, 46, 18, "#c7a26a", 2); P.r(59, 1, 4, 2, GOLD_D)
  P.ell(47, 27, 15, 11, "#0000");
  for (let y = 15; y <= 38; y++) for (let x = 30; x <= 63; x++) {
    const dx = (x - 47) / 17, dy = (y - 24) / 13
    if (dx * dx + dy * dy > 1 || y < 21) continue
    if (((x + y) % 5 === 0) || ((x - y + 64) % 5 === 0)) P.p(x, y, c.ll)
  }
  P.ring(47, 21, 17, "#c7a26a", 1)
  P.r(30, 21, 35, 1, "#c7a26a")
  floor(P, 36, c, 0.7)
}

const sceneCtrlFixIt: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  // loose code tiles at the sides
  const tile = (x: number, y: number, col: string, s: string) => { P.box(x, y, 9, 8, col); P.r(x + 1, y + 1, 7, 1, mix(col, "#ffffff", 0.4)); drawMicro(P.x, s, x + 2, y + 2, INK) }
  tile(4, 6, c.a, "{}"); tile(7, 17, GREEN, ";"); tile(50, 8, BLUE, "//"); tile(52, 20, ORANGE, "<>"); tile(2, 27, YELLOW, "()")
  // arcade cabinet
  P.box(18, 3, 28, 34, c.d); P.r(19, 4, 3, 32, c.a); P.r(43, 4, 2, 32, c.dd)
  P.box(20, 4, 24, 6, INK); P.r(21, 5, 22, 4, c.l); drawMicro(P.x, "FIXIT", 25, 6, INK)
  P.box(21, 11, 22, 15, "#0b1020"); P.r(22, 12, 20, 13, "#10193a")
  // falling code blocks stack
  const stack: [number, number, number, string][] = [[23, 22, 5, GREEN], [28, 22, 5, BLUE], [33, 22, 5, ORANGE], [38, 22, 4, c.a], [23, 18, 5, YELLOW], [28, 18, 5, RED], [35, 18, 5, GREEN], [31, 14, 5, c.l]]
  stack.forEach(([x, y, w, col]) => { P.r(x, y, w - 1, 3, col); P.r(x, y, w - 1, 1, mix(col, "#ffffff", 0.5)) })
  P.r(37, 14, 4, 3, c.l)
  P.r(28, 26, 2, 0, WHITE)
  P.box(20, 27, 24, 6, c.dd); P.disc(26, 30, 2, RED); P.r(25, 28, 2, 1, "#ff9d92")
  P.disc(34, 30, 1, YELLOW); P.disc(38, 30, 1, GREEN); P.disc(41, 30, 1, BLUE)
  P.r(18, 37, 28, 1, INK)
  floor(P, 37, c, 0.55)
}

const sceneSkrgrep: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  win(P, 2, 3, 46, 29, "#2b2140", "#0f0b1a")
  drawMicro(P.x, "$", 5, 11, GREEN); P.r(10, 12, 12, 1, c.l); drawMicro(P.x, "GREP", 10, 10, WHITE)
  const rows: [number, string][] = [[26, "#4a3c6a"], [32, "#4a3c6a"], [20, "#4a3c6a"], [36, "#4a3c6a"], [24, "#4a3c6a"], [30, "#4a3c6a"]]
  rows.forEach(([w, col], i) => P.r(5, 16 + i * 2.6, w, 1, col))
  P.r(5, 20.8, 36, 2, mix(c.a, "#000000", 0.55)); P.r(5, 21, 12, 2, c.a)
  // magnifier
  P.line(50, 28, 61, 38, INK, 5); P.line(50, 28, 61, 38, "#b5835a", 3)
  P.disc(41, 22, 14, INK); P.disc(41, 22, 12, STEEL_L); P.disc(41, 22, 10, "#0f0b1a")
  P.r(33, 19, 17, 3, mix(c.a, "#000000", 0.5)); P.r(33, 19, 7, 3, c.l); P.r(33, 25, 14, 1, "#4a3c6a"); P.r(33, 16, 11, 1, "#4a3c6a")
  P.r(35, 12, 5, 1, "#ffffff"); P.p(33, 15, "#ffffff")
  P.spark(46, 15, WHITE)
  floor(P, 36, c, 0.55)
}

const sceneIpSniffer: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "night")
  P.disc(20, 18, 17, INK); P.disc(20, 18, 15, mix(c.a, "#0a0816", 0.78))
  for (const r of [5, 9, 13]) P.ring(20, 18, r, mix(c.a, "#0a0816", 0.4), 1)
  P.r(20, 3, 1, 31, mix(c.a, "#0a0816", 0.45)); P.r(5, 18, 31, 1, mix(c.a, "#0a0816", 0.45))
  P.a(0.5); P.poly([[20, 18], [32, 8], [35, 18]], c.l); P.a(0.3); P.poly([[20, 18], [28, 5], [32, 8]], c.ll); P.a(1)
  P.line(20, 18, 33, 9, WHITE, 1)
  for (const [x, y, k] of [[28, 22, 1], [12, 12, 0], [24, 11, 1], [15, 25, 0], [29, 14, 1]] as [number, number, number][]) { P.disc(x, y, 2, k ? GREEN : c.l); P.disc(x, y, 1, WHITE) }
  // port ladder
  P.box(40, 3, 22, 31, "#14122a")
  const ports: [string, string][] = [["22", GREEN], ["80", GREEN], ["443", GREEN], ["25", RED], ["110", GREEN]]
  ports.forEach(([s, col], i) => { const y = 6 + i * 6; P.r(43, y, 3, 3, col); P.p(43, y, "#ffffff"); drawMicro(P.x, s, 49, y - 1, i % 2 ? STEEL_L : WHITE) })
  floor(P, 36, c, 0.55)
}

const sceneChess: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "dusk")
  // board in perspective: 6 rows
  const light = mix(c.l, "#ffffff", 0.35), dark = mix(c.a, "#000000", 0.45)
  P.poly([[4, 38], [60, 38], [54, 21], [10, 21]], INK)
  for (let r = 0; r < 6; r++) {
    const y0 = 21 + (r * 17) / 6, y1 = 21 + ((r + 1) * 17) / 6
    const xl0 = 10 - (r * 6) / 6, xl1 = 10 - ((r + 1) * 6) / 6, xr0 = 54 + (r * 6) / 6, xr1 = 54 + ((r + 1) * 6) / 6
    for (let q = 0; q < 8; q++) {
      const a0 = q / 8, a1 = (q + 1) / 8
      const p = (u: number, l: number, rr: number) => l + (rr - l) * u
      P.poly([[p(a0, xl0, xr0), y0], [p(a1, xl0, xr0), y0], [p(a1, xl1, xr1), y1], [p(a0, xl1, xr1), y1]], (q + r) % 2 ? dark : light)
    }
  }
  // pieces
  const W: Record<string, string> = { W: WHITE, w: STEEL_L, K: INK }, B: Record<string, string> = { W: "#46405c", w: "#2e2a40", K: WHITE }
  const king = ["...WW...", "..WWWW..", "...WW...", "..WWWW..", ".WWWWWW.", "..WWWW..", "..WWWW..", "..wWWW..", ".wWWWWW.", ".wWWWWW.", "wwWWWWWW", "wwwWWWWW"]
  const knight = ["...WW.....", "..WWWW....", ".WWWWWW...", "WWWKWWWW..", "WWWWWWWWW.", ".WWWWWWWW.", "..wWWWWWW.", "...wWWWWW.", "..wWWWWWW.", ".wWWWWWWWW", ".wwWWWWWWW", "wwwWWWWWWW"]
  const pawn = ["..WWW..", ".WWWWW.", ".WWWWW.", "..WWW..", "..WWW..", ".WwWWW.", "..wWW..", "..wWW..", ".wWWWW.", "wwWWWWW"]
  P.bm(king, B, 16, 12, { outline: WHITE }); P.bm(pawn, B, 29, 21, { outline: WHITE }); P.bm(knight, W, 40, 11, { outline: true }); P.bm(pawn, W, 28, 28, { outline: true })
  P.bm(pawn, B, 48, 25, { outline: WHITE }); P.bm(king, W, 8, 24, { outline: true })
  P.r(16, 4, 0, 0, WHITE)
  P.spark(58, 8, c.ll); P.spark(5, 10, c.ll)
}

const scenePoker: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  P.ell(32, 33, 31, 7, INK); P.ell(32, 33, 29, 6, "#1d6a3a"); P.ell(32, 33, 25, 4, "#26844a"); P.ring(32, 33, 28, "#14502b", 1)
  // fan of cards
  const card = (cx: number, cy: number, ang: number, sym: string, col: string, face: string) => {
    const cs = Math.cos(ang), sn = Math.sin(ang), hw = 7, hh = 10
    for (let y = -hh - 2; y <= hh + 2; y++) for (let x = -hw - 2; x <= hw + 2; x++) {
      const u = x * cs + y * sn, v = -x * sn + y * cs
      const inn = Math.abs(u) <= hw && Math.abs(v) <= hh, inb = Math.abs(u) <= hw + 1 && Math.abs(v) <= hh + 1
      if (!inb) continue
      P.p(cx + x, cy + y, inn ? WHITE : INK)
    }
    // pip in the middle, index letter at the rotated top-left corner
    const sx = cx, sy = cy + 1
    if (sym === "S") P.bm([".SS.", "SSSS", "SSSS", ".SS."].map((r, i) => (i === 0 ? ".SS." : r)), { S: col }, sx - 2, sy - 2)
    else if (sym === "H") P.bm(["HH.HH", "HHHHH", ".HHH.", "..H.."], { H: col }, sx - 2, sy - 2)
    else if (sym === "D") P.bm(["..D..", ".DDD.", "DDDDD", ".DDD.", "..D.."], { D: col }, sx - 2, sy - 2)
    else P.bm(["..C..", ".CCC.", "CCCCC", "..C..", ".CCC."], { C: col }, sx - 2, sy - 2)
    const lx = cx + (-hw + 2) * cs - (-hh + 2) * sn, ly = cy + (-hw + 2) * sn + (-hh + 2) * cs
    drawMicro(P.x, face, Math.round(lx) - 1, Math.round(ly) - 2, col)
  }
  card(16, 17, -0.5, "H", RED, "A"); card(25, 14, -0.25, "S", "#1a1630", "K"); card(35, 13, 0.0, "H", RED, "Q"); card(45, 15, 0.28, "D", RED, "J"); card(53, 19, 0.52, "S", "#1a1630", "A")
  // chips
  const chips = (x: number, y: number, col: string, n: number) => { for (let i = 0; i < n; i++) { P.ell(x, y - i * 2, 5, 2, INK); P.ell(x, y - i * 2, 4, 1, i % 2 ? col : mix(col, "#ffffff", 0.2)); P.r(x - 1, y - i * 2, 3, 1, WHITE) } }
  chips(11, 33, RED, 3); chips(53, 34, BLUE, 4); chips(19, 36, "#2b2b3a", 2); chips(45, 36, GREEN, 2)
  P.disc(32, 30, 3, INK); P.disc(32, 30, 2, YELLOW); drawMicro(P.x, "D", 31, 28, INK)
  floor(P, 38, c, 0.5)
}

const sceneWdraw: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  P.box(6, 4, 52, 29, "#f7f4ec"); P.r(7, 5, 50, 1, "#ffffff")
  for (let x = 10; x < 56; x += 5) for (let y = 8; y < 31; y += 5) P.p(x, y, "#e0dacb")
  // strokes
  const sq: [number, number][] = [[12, 22], [15, 14], [19, 24], [23, 13], [27, 22], [31, 16]]
  for (let i = 0; i < sq.length - 1; i++) P.line(sq[i][0], sq[i][1], sq[i + 1][0], sq[i + 1][1], BLUE, 2)
  P.ring(44, 16, 7, RED, 2)
  P.line(36, 27, 54, 27, GREEN, 2); P.line(38, 24, 50, 30, GREEN, 1)
  P.r(14, 26, 8, 4, ORANGE); P.r(15, 27, 6, 2, YELLOW)
  // collaborators' cursors with name tabs
  cursorArrow(P, 31, 14, BLUE); P.box(37, 18, 12, 6, BLUE); drawMicro(P.x, "KAI", 39, 19, WHITE)
  cursorArrow(P, 49, 20, RED); P.box(52, 6, 9, 6, RED); drawMicro(P.x, "ZO", 54, 7, WHITE); P.line(51, 20, 55, 12, RED, 1)
  cursorArrow(P, 53, 25, GREEN); P.box(8, 9, 11, 6, GREEN); drawMicro(P.x, "ME", 10, 10, INK)
  cursorArrow(P, 12, 20, c.a)
  floor(P, 34, c, 0.55)
}

const sceneBoom: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "dusk")
  // sound waves
  for (let i = 0; i < 4; i++) { P.arc(20, 20, 16 + i * 7, 18.2 + i * 7, -0.7, 0.7, () => (i === 0 ? c.ll : i === 1 ? c.l : i === 2 ? c.a : c.d)) }
  // speaker
  P.box(4, 3, 26, 33, "#2b2540"); P.r(5, 4, 24, 1, "#4a4268"); P.r(5, 4, 1, 31, "#4a4268")
  P.disc(17, 12, 6, INK); P.disc(17, 12, 5, c.a); P.disc(17, 12, 2, c.d); P.p(15, 10, c.ll)
  P.disc(17, 26, 8, INK); P.disc(17, 26, 7, STEEL_D); P.disc(17, 26, 5, "#1a1730"); P.disc(17, 26, 2, c.a); P.p(14, 22, STEEL_L)
  for (const [x, y] of [[7, 5], [27, 5], [7, 33], [27, 33]]) P.p(x, y, GOLD)
  // 4x burst
  const bx = 51, by = 9
  P.poly([[bx, by - 8], [bx + 3, by - 3], [bx + 9, by - 4], [bx + 5, by + 1], [bx + 9, by + 6], [bx + 2, by + 4], [bx, by + 9], [bx - 3, by + 4], [bx - 9, by + 6], [bx - 5, by + 1], [bx - 9, by - 4], [bx - 3, by - 3]], INK)
  P.poly([[bx, by - 6], [bx + 2, by - 2], [bx + 7, by - 3], [bx + 4, by + 1], [bx + 7, by + 5], [bx + 1, by + 3], [bx, by + 7], [bx - 2, by + 3], [bx - 7, by + 5], [bx - 4, by + 1], [bx - 7, by - 3], [bx - 2, by - 2]], YELLOW)
  drawText(P.x, "4X", bx - 5, by - 3, INK)
  // volume bars
  for (let i = 0; i < 5; i++) { const h = 3 + i * 3; P.box(37 + i * 5, 34 - h, 5, h, i > 2 ? RED : c.l) }
  floor(P, 36, c, 0.5)
}

const sceneAio: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "dusk")
  // notch / island at the top
  P.r(18, 0, 28, 7, INK); P.r(19, 7, 26, 1, INK); P.r(20, 1, 24, 5, "#0a0a0f"); P.disc(26, 3, 1, c.a); drawMicro(P.x, "3:42", 30, 1, WHITE); P.r(40, 2, 3, 3, GREEN)
  // widgets
  P.box(5, 11, 17, 13, "#1b2a3a"); P.disc(13, 17, 5, WHITE); P.r(13, 13, 1, 5, INK); P.r(13, 17, 4, 1, INK)
  P.box(24, 11, 17, 13, "#1b2a3a"); P.r(27, 14, 11, 7, "#0e1a22"); P.r(27, 14, 8, 7, c.a); P.r(38, 16, 2, 3, c.l)
  P.box(43, 11, 17, 13, "#1b2a3a"); for (let i = 0; i < 5; i++) P.r(46 + i * 2.6, 22 - (3 + (i * 7) % 8), 2, 3 + (i * 7) % 8, i % 2 ? c.l : c.a)
  // dock with one magnified icon
  P.r(3, 28, 58, 9, INK); P.r(4, 28, 56, 8, "#3b4a5c"); P.r(4, 28, 56, 1, "#8fa4bd")
  const icon = (x: number, y: number, s: number, col: string, ch: string) => { P.box(x, y, s, s, col); P.r(x + 1, y + 1, s - 2, 1, mix(col, "#ffffff", 0.45)); drawMicro(P.x, ch, x + Math.floor((s - 3) / 2), y + Math.floor((s - 5) / 2) + 1, "#ffffff") }
  icon(7, 30, 7, "#e25b4a", "M"); icon(16, 30, 7, "#ffb03c", "S"); icon(25, 24, 12, c.a, "A"); icon(39, 30, 7, "#7a6af0", "C"); icon(48, 30, 7, GREEN, "T")
  P.r(30, 37, 3, 1, WHITE)
  P.spark(61, 5, c.ll)
}

const sceneCreditIQ: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "dusk")
  P.arc(32, 31, 22, 28, Math.PI, Math.PI * 2, (t) => (t < 0.34 ? RED : t < 0.67 ? YELLOW : GREEN))
  P.arc(32, 31, 21, 21.9, Math.PI, Math.PI * 2, () => INK); P.arc(32, 31, 28.1, 29, Math.PI, Math.PI * 2, () => INK)
  for (let k = 0; k <= 6; k++) { const a = Math.PI + (k * Math.PI) / 6; P.r(32 + Math.cos(a) * 31, 31 + Math.sin(a) * 31, 1, 1, WHITE) }
  P.line(32, 31, 42, 17, INK, 3); P.line(32, 31, 42, 17, WHITE, 1); P.disc(32, 31, 3, INK); P.disc(32, 31, 2, STEEL_L)
  // trophy
  const T: Record<string, string> = { g: GOLD, G: GOLD_D, h: "#fff3a0" }
  P.bm([
    "..gggggggggggg..", ".ghhhgggggggGGg.", ".ghhggggggggGGg.", "gghhggggggggGGgg", "g.ghgggggggGGg.g", "g..ghgggggGGg..g", ".g..gggggggGg..g",
    "..gg.gggggGg.gg.", "......gggGG.....", ".......ggG......", ".......ggG......", "......gggGG.....", ".....gggggGG....", "....gggggggGG...", "....gGGGGGGGG...",
  ], T, 24, 10, { outline: true })
  P.bm(["..R..", ".RRR.", "RRRRR", ".RRR.", "R.R.R"].map((r) => r.replace(/R/g, "R")), { R: WHITE }, 30, 13)
  P.spark(14, 9, YELLOW, true); P.spark(52, 6, WHITE); P.spark(10, 24, c.ll)
  floor(P, 36, c, 0.5)
}

const sceneCreatorAi: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  // preview monitor
  P.box(6, 3, 38, 20, "#0c0b1e"); P.r(7, 4, 36, 18, mix(c.a, "#000000", 0.5)); P.r(7, 4, 36, 8, mix(c.a, "#000000", 0.35))
  P.disc(14, 10, 3, YELLOW); P.poly([[7, 22], [18, 14], [26, 19], [34, 12], [43, 21], [43, 22], [7, 22]], mix(c.a, "#000000", 0.75))
  P.disc(25, 13, 6, INK); P.disc(25, 13, 5, WHITE); P.poly([[23, 10], [29, 13], [23, 16]], c.d)
  // sparkle / AI star
  P.spark(52, 8, c.ll, true); P.spark(58, 14, WHITE); P.spark(47, 14, c.l)
  // clapper
  P.box(48, 17, 13, 9, "#2b2b3a"); P.r(49, 18, 11, 1, "#4a4a62")
  P.poly([[47, 15], [61, 12], [62, 16], [48, 19]], INK); for (let i = 0; i < 4; i++) P.poly([[49 + i * 3.5, 14.5 - i * 0.7], [51 + i * 3.5, 14 - i * 0.7], [49.5 + i * 3.5, 18], [47.5 + i * 3.5, 18.5]].map(([x, y]) => [x, y + 0.5] as [number, number]), i % 2 ? WHITE : c.a)
  // timeline
  P.box(3, 25, 58, 11, "#14122a")
  const track = (y: number, clips: [number, number, string][]) => clips.forEach(([x, w, col]) => { P.box(x, y, w, 4, col); P.r(x + 1, y + 1, w - 2, 1, mix(col, "#ffffff", 0.4)) })
  track(27, [[5, 14, c.a], [21, 10, c.l], [33, 16, c.d], [51, 8, c.a]]); track(32, [[5, 8, GREEN], [15, 18, ORANGE], [35, 10, BLUE], [47, 12, GREEN]])
  P.r(29, 24, 2, 13, RED); P.poly([[27, 23], [33, 23], [30, 27]], RED)
}

const sceneDaily: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  const G1 = "#4cc26a", Y1 = "#e8b923", X1 = "#4a4660"
  const grid: string[][] = [[X1, Y1, X1, X1, G1], [G1, G1, Y1, X1, G1], [G1, G1, G1, G1, G1], [Y1, X1, X1, X1, X1]]
  const solved = [[true, true, true, true, true], [true, true, true, true, true], [true, true, true, true, true], [false, false, false, false, false]]
  grid.forEach((row, j) => row.forEach((col, i) => {
    const x = 6 + i * 9, y = 3 + j * 8.4
    if (j === 3) { P.box(x, y, 8, 7, "#1d1a30", "#3d3858"); return }
    P.box(x, y, 8, 7, col); P.r(x + 1, y + 1, 6, 1, mix(col, "#ffffff", 0.4)); drawMicro(P.x, "WORDS".charAt((i + j * 2) % 5), x + 3, y + 1, "#ffffff"); void solved
  }))
  // streak flame
  const F: Record<string, string> = { o: ORANGE, y: YELLOW, r: RED, w: "#fff8d0" }
  P.bm(["....o....", "...oo....", "...ooo.o.", "..oooo.o.", ".ooyooooo", ".ooyyooooo", "ooyyyyoooo", "ooyywwyooo", "ooyywwyooo", ".ooyyyyoo.", "..oooooo.."], F, 52, 4, { outline: true })
  P.r(53, 9, 1, 1, r2(RED))
  // calendar
  P.box(51, 22, 12, 11, WHITE); P.r(52, 23, 10, 3, RED); drawMicro(P.x, "7", 56, 27, INK); P.r(54, 21, 1, 3, INK); P.r(59, 21, 1, 3, INK)
  P.r(51, 33, 12, 1, INK)
  floor(P, 36, c, 0.55)
}
const r2 = (s: string) => s

const sceneClassroom: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  // chalkboard in a wooden frame
  P.box(4, 3, 40, 26, "#8a5a32"); P.r(5, 4, 38, 1, "#b88252"); P.box(7, 6, 34, 20, "#1c3a30"); P.r(8, 7, 32, 1, "#2a5a48")
  drawText(P.x, "A+B", 11, 10, "#e8f5e8"); P.r(11, 20, 12, 1, "#e8f5e8"); P.r(26, 12, 10, 1, "#9fd4c0"); P.r(26, 15, 7, 1, "#9fd4c0"); P.r(26, 18, 11, 1, "#9fd4c0")
  P.r(10, 24, 6, 1, "#e8f5e8")
  P.box(8, 27, 20, 3, "#8a5a32")
  // apple + chalk on the ledge
  P.disc(13, 26, 2, RED); P.p(13, 23, GREEN); P.r(20, 25, 4, 2, WHITE)
  // plug cable running to the assistant bubble: the MCP connector
  P.line(44, 17, 50, 17, INK, 3); P.line(44, 17, 50, 17, STEEL, 1)
  P.box(40, 14, 5, 7, c.a); P.r(37, 15, 3, 1, STEEL_L); P.r(37, 19, 3, 1, STEEL_L); P.r(41, 15, 3, 1, c.ll)
  P.line(50, 17, 52, 28, INK, 3); P.line(50, 17, 52, 28, STEEL, 1)
  bubble(P, 40, 29, 22, 8, "#f0f6ff", true)
  drawMicro(P.x, "HI!", 44, 31, c.d); P.r(54, 31, 4, 3, c.a); P.spark(58, 31, c.l)
  // paper plane
  P.poly([[48, 3], [62, 8], [52, 10], [51, 13], [48, 10]], INK); P.poly([[49, 5], [60, 8], [52, 9]], WHITE); P.poly([[52, 9], [50, 11], [51, 12]], c.l)
  floor(P, 37, c, 0.5)
}

const sceneLedger: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  // SEC filing in, report out
  P.box(3, 5, 20, 26, PAPER); P.r(4, 6, 18, 1, WHITE)
  drawMicro(P.x, "10-K", 6, 8, INK); codeLines(P, 6, 15, [[14, "#8c8472"], [12, "#8c8472"], [15, "#8c8472"], [9, "#8c8472"], [13, "#8c8472"], [11, "#8c8472"]], 2)
  P.ell(17, 27, 6, 3, "#b62020"); P.ell(17, 27, 5, 2, "#e0443c"); drawMicro(P.x, "SEC", 13, 25, WHITE)
  P.box(6, 8, 20, 26, mix(PAPER, "#ffffff", 0.1)); P.r(7, 9, 18, 1, WHITE)
  drawMicro(P.x, "10-K", 9, 11, INK); codeLines(P, 9, 18, [[14, "#8c8472"], [12, "#8c8472"], [15, "#8c8472"], [9, "#8c8472"], [13, "#8c8472"]], 2.5)
  // gears
  gear(P, 33, 17, 4, c.a); gear(P, 38, 24, 3, c.l)
  arrowR(P, 28, 8, 12, GREEN)
  // report page with bars and a trend line
  P.box(42, 4, 20, 28, WHITE); P.r(43, 5, 18, 1, "#ffffff"); P.r(44, 7, 10, 2, c.a)
  const hs = [5, 8, 6, 11, 14]; hs.forEach((h, i) => P.r(45 + i * 3.4, 28 - h, 3, h, i === 4 ? GREEN : c.d))
  P.line(45, 22, 52, 19, RED, 1); P.line(52, 19, 57, 14, RED, 1)
  P.disc(59, 30, 0, WHITE)
  floor(P, 36, c, 0.55)
}

const sceneVendex: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  // phone playing a reel
  P.box(4, 2, 18, 33, "#0e0c1c"); P.r(5, 3, 16, 31, "#1d2b36"); P.r(5, 3, 16, 14, mix(c.a, "#000000", 0.45))
  P.disc(13, 14, 5, INK); P.disc(13, 14, 4, WHITE); P.poly([[12, 11], [16, 14], [12, 17]], c.d)
  P.r(7, 22, 12, 1, STEEL); P.r(7, 25, 9, 1, STEEL); P.disc(18, 29, 2, RED); P.r(9, 29, 5, 3, c.a)
  P.r(9, 5, 3, 1, WHITE)
  arrowR(P, 24, 18, 12, GREEN)
  // ranked supplier list
  P.box(38, 3, 24, 30, "#f3efe2")
  const row = (i: number, y: number, w: number, col: string) => { P.disc(43, y + 3, 3, col); drawMicro(P.x, String(i), 42, y + 1, INK); P.r(48, y + 1, w, 2, "#8c8472"); P.r(48, y + 4, w - 4, 1, "#bdb6a1"); P.r(58, y + 2, 2, 2, GREEN) }
  row(1, 6, 8, GOLD); row(2, 14, 6, STEEL_L); row(3, 22, 7, "#cf8a4a"); P.r(39, 4, 22, 1, c.a)
  // parcel
  P.box(27, 26, 13, 9, "#c99a5a"); P.r(33, 26, 2, 9, "#8a6232"); P.r(28, 27, 11, 1, "#e6c08a")
  P.spark(36, 7, c.ll); P.spark(28, 6, c.l)
  floor(P, 36, c, 0.55)
}

const sceneDap: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "night")
  // pitch lines
  P.r(0, 26, 64, 14, "#17482b"); P.r(0, 26, 64, 1, "#2e8a52"); for (let x = 0; x < 64; x += 12) P.r(x, 27, 6, 13, "#1b5731")
  P.ring(32, 36, 12, "#2e8a52", 1); P.r(0, 33, 64, 1, "#2e8a52")
  // fingerprint inside a shield
  shieldAt(P, 32, 2, 30, 31, mix(c.a, "#000000", 0.5), STEEL_L)
  const gaps = [[0.2, 1.0], [2.4, 3.2], [4.0, 4.9], [5.6, 6.4]]
  ;[3, 6, 9, 12].forEach((r, i) => {
    const [g0, g1] = gaps[i]
    P.arc(32, 18, r, r + 1.3, g1, g0 + Math.PI * 2, () => (i % 2 ? WHITE : c.ll))
  })
  P.r(32, 15, 1, 7, WHITE)
  // ball and a watermark badge
  P.disc(10, 32, 5, INK); P.disc(10, 32, 4, WHITE); P.poly([[9, 30], [12, 31], [11, 34], [8, 34]], INK)
  P.box(46, 8, 13, 9, c.a); drawMicro(P.x, "ID", 49, 10, INK); P.r(47, 9, 11, 1, c.ll)
  P.disc(52, 22, 4, INK); P.disc(52, 22, 3, GREEN); P.line(50, 22, 51, 24, WHITE, 1); P.line(51, 24, 54, 20, WHITE, 1)
  P.spark(8, 8, WHITE)
}

const sceneStackIt: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "room")
  // stack of three slabs
  const slab = (y: number, col: string) => { P.poly([[8, y + 2], [26, y - 4], [44, y + 2], [26, y + 8]], INK); P.poly([[9, y + 2], [26, y - 3], [43, y + 2], [26, y + 7]], mix(col, "#ffffff", 0.3)); P.poly([[9, y + 3], [26, y + 8], [26, y + 12], [9, y + 7]], col); P.poly([[43, y + 3], [26, y + 8], [26, y + 12], [43, y + 7]], mix(col, "#000000", 0.35)); P.line(9, y + 3, 26, y + 8, INK); P.line(43, y + 3, 26, y + 8, INK) }
  slab(26, c.d); slab(19, c.a); slab(12, c.l)
  P.r(20, 12, 12, 1, WHITE); P.r(20, 14, 8, 1, mix(c.l, "#ffffff", 0.5))
  // Q and A bubbles
  bubble(P, 36, 3, 18, 13, WHITE, true); drawText(P.x, "?", 43, 5, c.d)
  bubble(P, 3, 2, 14, 10, c.ll, false); P.line(6, 7, 8, 9, GREEN, 1); P.line(8, 9, 13, 4, GREEN, 1)
  P.r(10, 33, 0, 0, WHITE)
  P.disc(55, 26, 5, INK); P.disc(55, 26, 4, c.a); P.poly([[55, 22], [56, 25], [59, 25], [57, 27], [58, 30], [55, 28], [52, 30], [53, 27], [51, 25], [54, 25]], YELLOW)
  floor(P, 37, c, 0.52)
}

const sceneGlitch: Scene = (P, c, rnd) => {
  ;["#140a26", "#1a0d30", "#210f3a", "#2a1248", "#34165a"].forEach((col, i) => P.r(0, i * 8, 64, 8, col))
  for (let i = 0; i < 12; i++) P.p(Math.floor(rnd() * 64), Math.floor(rnd() * 28), i % 3 ? "#7a4fd0" : WHITE)
  // isometric cubes
  const cube = (x: number, y: number, col: string) => { P.poly([[x, y + 3], [x + 7, y], [x + 14, y + 3], [x + 7, y + 6]], INK); P.poly([[x + 1, y + 3], [x + 7, y + 1], [x + 13, y + 3], [x + 7, y + 5]], mix(col, "#ffffff", 0.3)); P.r(x, y + 4, 7, 7, INK); P.r(x + 7, y + 4, 7, 7, INK); P.r(x + 1, y + 4, 6, 6, col); P.r(x + 7, y + 4, 6, 6, mix(col, "#000000", 0.4)) }
  cube(2, 22, c.d); cube(48, 22, c.d); cube(2, 11, c.a); cube(48, 9, c.a); cube(15, 27, c.dd); cube(36, 27, c.dd)
  // the bug: a beetle at double size so it reads at a glance
  const B: Record<string, string> = { g: "#a6f04a", G: "#5fb02a", d: "#2f6a14", w: WHITE, K: INK, r: RED }
  const bug = new Pen(17, 15)
  bug.bm([
    "....K....K....", ".....K..K.....", "......gg......", "....gggggg....", "..K.gwggwg.K..", "...gggggggg...", "gg.GGGgdGGGg.gg",
    "..GGGGgdGGGGG..", "gg.GrGgdGrGg.gg", "..GGGGgdGGGGG..", "gg.dGGgdGGGd.gg", "...dGGgdGGd....", "....ddgddd....",
  ], B, 1, 1)
  const bk = new Pen(34, 32)
  bk.x.drawImage(bug.c, 1, 1, 15, 13, 2, 2, 30, 26)
  outline(bk.c, INK)
  P.x.drawImage(bk.c, 15, 2)
  // glitch slices
  for (let i = 0; i < 6; i++) {
    const y = 5 + Math.floor(rnd() * 26), h = 1 + Math.floor(rnd() * 2), off = (rnd() < 0.5 ? -1 : 1) * (3 + Math.floor(rnd() * 5))
    P.x.drawImage(P.c, 12, y, 40, h, 12 + off, y, 40, h)
  }
  P.r(0, 14, 20, 1, "#ff3df0"); P.r(44, 21, 20, 1, "#00f0ff"); P.r(20, 30, 26, 1, "#ff3df0"); P.r(4, 8, 12, 1, "#00f0ff")
  for (let y = 0; y < 38; y += 3) { P.a(0.14); P.r(0, y, 64, 1, "#000000"); P.a(1) }
  floor(P, 37, c, 0.65)
}

const sceneMosaic: Scene = (P, c, rnd) => {
  backdrop(P, c, rnd, "dusk")
  // system map: hub and spokes around a core
  const pts: [number, number][] = []
  for (let i = 0; i < 6; i++) { const a = (i * Math.PI * 2) / 6 + rnd() * 0.4; pts.push([32 + Math.cos(a) * (18 + rnd() * 8), 17 + Math.sin(a) * (10 + rnd() * 4)]) }
  pts.forEach(([x, y]) => P.line(32, 17, x, y, c.d, 2))
  pts.forEach(([x, y], i) => { P.box(Math.round(x) - 5, Math.round(y) - 4, 10, 8, i % 2 ? c.l : c.a); P.r(Math.round(x) - 4, Math.round(y) - 3, 8, 1, WHITE) })
  P.box(25, 10, 14, 14, c.a); P.r(26, 11, 12, 2, c.ll); gear(P, 32, 18, 3, INK, c.ll)
  floor(P, 34, c, 0.55)
}

const SCENES: Record<string, Scene> = {
  "ferrite-browser": sceneFerrite, sentinel: sceneSentinel, duckops: sceneDuckOps, devhub: sceneDevHub, neurocred: sceneNeuroCred, nebula: sceneNebula,
  ctrlfixit: sceneCtrlFixIt, skrgrep: sceneSkrgrep, "ip-sniffer": sceneIpSniffer, chess: sceneChess, poker: scenePoker, "draw-app": sceneWdraw,
  boomsuite: sceneBoom, aio: sceneAio, creditiq: sceneCreditIQ, creatorai: sceneCreatorAi, "daily-games": sceneDaily, "classroom-mcp": sceneClassroom,
  "financial-research-automation": sceneLedger, vendex: sceneVendex, dapdap: sceneDap, stackit: sceneStackIt, glitch: sceneGlitch,
}
const MOTIF_SCENES: Record<Motif, Scene> = {
  shield: sceneFerrite, network: sceneSentinel, pipeline: sceneDuckOps, api: sceneDevHub, cards: scenePoker, wave: sceneBoom, terminal: sceneSkrgrep,
  dial: sceneCreditIQ, neural: sceneNebula, scan: sceneCreatorAi, hash: sceneDap, board: sceneCtrlFixIt, dock: sceneAio, grid: sceneDaily, glitch: sceneGlitch,
  ledger: sceneLedger, tools: sceneClassroom, mosaic: sceneMosaic,
}

/** which subject a project is drawn as: a hand-made scene for known ids, else the scene of its motif */
export function subjectOf(p: ExProject): string {
  if (SCENES[p.id]) return p.id
  return `motif:${motifFor(p)}`
}

const artCache = new Map<string, HTMLCanvasElement>()
/** the project's illustration at native size (64x40), no frame, no title */
export function exhibitArt(p: ExProject): HTMLCanvasElement {
  const key = `${p.id}|${p.accent}|${p.featured}`
  const hit = artCache.get(key)
  if (hit) return hit
  const P = new Pen(ART_W, ART_H)
  const c = palOf(p.accent), rnd = rng(hashStr(p.id) ^ 0x9e3779b1)
  const scene = SCENES[p.id] ?? MOTIF_SCENES[motifFor(p)]
  scene(P, c, rnd, !!p.featured)
  if (!SCENES[p.id]) {
    // unknown projects share a motif scene: vary it per project so neighbours differ
    const h = hashStr(p.id)
    P.spark(4 + (h % 12), 3 + ((h >> 4) % 6), c.ll, true); P.spark(48 + ((h >> 8) % 12), 3 + ((h >> 12) % 6), c.l)
  }
  artCache.set(key, P.c)
  return P.c
}

/** art with a title banner laid over the floor strip (for billboards and screens) */
export function titledArt(p: ExProject, tag?: string): HTMLCanvasElement {
  const base = exhibitArt(p)
  const P = new Pen(ART_W, ART_H)
  P.x.drawImage(base, 0, 0)
  const c = palOf(p.accent)
  const f = fitTitle(p, ART_W - 8)
  P.r(0, ART_H - 10, ART_W, 10, "rgba(8,6,16,.86)"); P.r(0, ART_H - 11, ART_W, 1, c.a)
  const x = Math.round((ART_W - f.w) / 2)
  if (f.micro) drawMicro(P.x, f.s, x, ART_H - 7, WHITE, "rgba(0,0,0,.6)")
  else drawText(P.x, f.s, x, ART_H - 9, WHITE, "rgba(0,0,0,.55)")
  if (tag) drawMicro(P.x, tag, 2, 2, c.ll, "rgba(0,0,0,.7)")
  return P.c
}

// ── tiny 12x12 product icons: one per motif (and a few hand-picked subjects), white glyph with ink detail ──
const ICON_ID: Record<string, string> = { duckops: "duck", chess: "pawn" }
// 1 = white, 2 = ink, 3 = yellow, 4 = orange, 5 = red
const ICON: Record<string, string> = {
  shield: "..11111111.. .1111111111. .1111221111. .1122222211. .1111221111. .1111221111. .1111111111. ..11111111.. ..11111111.. ...111111... ....1111.... .....11.....",
  duck: "............ ....3333.... ...333333... ...332333... ...33333444. ....3333444. ....3333.... ..33333333.. .3333333333. .3333333333. ..33333333.. ...333333...",
  pawn: "....1111.... ...111111... ...111111... ....1111.... .....11..... ....1111.... ....1111.... .....11..... ....1111.... ...111111... ..11111111.. ..11111111..",
  network: "11........11 11........11 ..1......1.. ...1....1... ....1..1.... .....11..... .....11..... ....1..1.... ...1....1... ..1......1.. 11........11 11........11",
  pipeline: "............ 11..11..11.. .11..11..11. ..11..11..11 .11..11..11. 11..11..11.. ............ 11..11..11.. .11..11..11. ..11..11..11 .11..11..11. 11..11..11..",
  api: "............ ........1... ........11.. .1111111111. ........11.. ........1... ...1........ ..11........ .1111111111. ..11........ ...1........ ............",
  cards: "2222222..... 2111112..... 2111112..... 211122222222 211121111112 222221111112 ....21515112 ....21555112 ....21151112 ....21111112 ....21111112 ....22222222",
  wave: "............ ..1.....1... ..1..1..1..1 .11..1.11..1 .11.11.11.11 .11.11.11.11 11111111111. .11.11.11.11 .11.11.11.11 .11..1.11..1 ..1..1..1... ............",
  terminal: "111111111111 122222222221 121222222221 122122222221 121222222221 122222222221 122222222221 122222222221 122222222221 111111111111 ............ ............",
  dial: "............ ...111111... .11......11. .1........1. 11....3...11 1.....3....1 1....3.....1 1...3......1 1..........1 11...11...11 .1111111111. ............",
  neural: "............ .11.....11.. .11.1.1.11.. ....1.1..... .11.111.11.. .11.1.1.1111 ....1.1.11.. .11.111.11.. .11.1.1..... .11.....11.. ............ ............",
  scan: "111......111 1..........1 1....11....1 ......11..... ...111111... ...1....1... ...1.33.1... ...1....1... ...111111... 1..........1 1..........1 111......111",
  hash: "..1...1..... ..1...1..... 1111111111.. ..1...1..... ..1...1..... 1111111111.. ..1...1..... ..1...1..... ............ ............ ............ ............",
  dock: "............ ............ ..11..11.... ..11..11.... ............ 111111111111 122222222221 1213141.1.21 122222222221 111111111111 ............ ............",
  grid: "............ .111.111.111 .111.111.111 .111.111.111 ............ .111.....111 .111.....111 .111.....111 ............ .111.111.... .111.111.... .111.111....",
  glitch: "............ 111111111... ............ ..11111111.. ............ 1111111..... ...........1 ..1111111111 ............ 11111111.... ............ ............",
  ledger: "..111111.... ..122221.... ..121121.... ..122221.... ..111111.... ..121121.... ..122221.... ..111111.... ..11111111.. ............ ............ ............",
  tools: "............ ....1111.... ....1..1.... 111111111111 122222222221 123333333221 122222222221 122222222221 122222222221 111111111111 ............ ............",
  board: "............ .....33..... ....3333.... ....3333.... ..111.11111. ..121.12221. 11121.12221. 11121.12221. 11121.12221. 11111111111. ............ ............",
  mosaic: "............ .1111.2222.. .1111.2222.. .1111.2222.. .1111.2222.. ............ .2222.1111.. .2222.1111.. .2222.1111.. .2222.1111.. ............ ............",
}
const ICON_COL: Record<string, string> = { "1": "#ffffff", "2": INK, "3": YELLOW, "4": ORANGE, "5": RED }
const iconCache = new Map<string, HTMLCanvasElement>()
/** 12x12 pixel icon for a project: its motif's glyph, no letters */
export function projectIcon(p: ExProject): HTMLCanvasElement {
  const key = ICON_ID[p.id] ?? motifFor(p)
  const hit = iconCache.get(key)
  if (hit) return hit
  const { c, ctx } = canvas(12, 12)
  const rows = (ICON[key] ?? ICON.mosaic).split(" ").map((r) => r.padEnd(12, ".").slice(0, 12))
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const col = ICON_COL[ch]; if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1) } }))
  iconCache.set(key, c)
  return c
}

/** featured first (stable within each group), the order every world presents the work in */
export function ordered<T extends { featured: boolean }>(list: T[]): T[] {
  return [...list.filter((p) => p.featured), ...list.filter((p) => !p.featured)]
}

// ═══════════════════════════════════════════════════════════════
// presentation pieces shared by the worlds
// ═══════════════════════════════════════════════════════════════
export type FrameStyle = "gold" | "stone" | "steel" | "spectral"
export const FRAME_PRELOAD = (["gold", "stone", "steel", "spectral"] as FrameStyle[]).flatMap((s) => [`/exhibits/frame-${s}.png`, `/exhibits/frame-${s}-b.png`])
const FRAME_LINE: Record<FrameStyle, [string, string, string, string]> = {
  gold: ["#fff7be", "#f4c430", "#b07d14", "#3a220c"], stone: ["#f4dcaa", "#d4aa6e", "#96683e", "#422816"],
  steel: ["#e2eefc", "#96aac8", "#586886", "#14162c"], spectral: ["#d6fff4", "#6ed6be", "#348282", "#0a1e2c"],
}
const FRAME_MAT: Record<FrameStyle, string> = { gold: "#4a1424", stone: "#5a3a22", steel: "#12142a", spectral: "#0c2a30" }
export const FRAME_PAD = 8

/** an ornate frame (9-slice of the baked CC0 border, recoloured per world) around any canvas */
export function frameAround(art: HTMLCanvasElement, style: FrameStyle = "gold", big = false, mat?: string): HTMLCanvasElement {
  const pad = FRAME_PAD, W = art.width + pad * 2, H = art.height + pad * 2
  const { c, ctx } = canvas(W, H)
  const L = FRAME_LINE[style]
  // mat
  ctx.fillStyle = L[3]; ctx.fillRect(1, 1, W - 2, H - 2)
  ctx.fillStyle = mat ?? FRAME_MAT[style]; ctx.fillRect(2, 2, W - 4, H - 4)
  ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(2, 2, W - 4, 1)
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(pad - 1, pad - 1, art.width + 2, art.height + 2)
  ctx.drawImage(art, pad, pad)
  // glass shine
  ctx.fillStyle = "rgba(255,255,255,.1)"
  for (let k = 0; k < 6; k++) ctx.fillRect(pad + 6 + k * 2, pad + 2, 1, 1)
  const src = img(`/exhibits/frame-${style}${big ? "-b" : ""}.png`)
  if (ready(src)) {
    const S = src.naturalWidth, cs = 13
    ctx.drawImage(src, 0, 0, cs, cs, 0, 0, cs, cs)
    ctx.drawImage(src, S - cs, 0, cs, cs, W - cs, 0, cs, cs)
    ctx.drawImage(src, 0, S - cs, cs, cs, 0, H - cs, cs, cs)
    ctx.drawImage(src, S - cs, S - cs, cs, cs, W - cs, H - cs, cs, cs)
    const mid = Math.floor(S / 2)
    ctx.drawImage(src, mid, 0, 1, cs, cs, 0, W - cs * 2, cs)
    ctx.drawImage(src, mid, S - cs, 1, cs, cs, H - cs, W - cs * 2, cs)
    ctx.drawImage(src, 0, mid, cs, 1, 0, cs, cs, H - cs * 2)
    ctx.drawImage(src, S - cs, mid, cs, 1, W - cs, cs, cs, H - cs * 2)
  } else {
    ctx.fillStyle = L[3]; ctx.fillRect(0, 0, W, 1); ctx.fillRect(0, H - 1, W, 1); ctx.fillRect(0, 0, 1, H); ctx.fillRect(W - 1, 0, 1, H)
    ctx.fillStyle = L[1]; ctx.fillRect(1, 1, W - 2, 2); ctx.fillRect(1, H - 3, W - 2, 2); ctx.fillRect(1, 1, 2, H - 2); ctx.fillRect(W - 3, 1, 2, H - 2)
  }
  return c
}

/** brass plate with title and year */
export function plaque(p: ExProject, w = 56, style: FrameStyle = "gold"): HTMLCanvasElement {
  const f = fitTitle(p, w - 8), h = f.micro ? 15 : 17
  const { c, ctx } = canvas(w, h)
  const L = FRAME_LINE[style]
  ctx.fillStyle = L[3]; ctx.fillRect(0, 0, w, h); ctx.fillStyle = L[2]; ctx.fillRect(1, 1, w - 2, h - 2); ctx.fillStyle = L[1]; ctx.fillRect(1, 1, w - 2, h - 3); ctx.fillStyle = L[0]; ctx.fillRect(1, 1, w - 2, 1)
  ctx.fillStyle = L[3]; for (const [x, y] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) ctx.fillRect(x, y, 1, 1)
  const tx = Math.round((w - f.w) / 2)
  if (f.micro) { drawMicro(ctx, f.s, tx, 3, L[3]); drawMicro(ctx, String(p.year), Math.round((w - microW(String(p.year))) / 2), 9, mix(L[3], L[2], 0.4)) }
  else { drawText(ctx, f.s, tx, 2, L[3]); drawMicro(ctx, String(p.year), Math.round((w - microW(String(p.year))) / 2), 10, mix(L[3], L[2], 0.4)) }
  return c
}

/** pedestal sculpture of a project's emblem, ~ 28 x 44 */
export function sculpture(p: ExProject, tone: "marble" | "bronze" | "glass" = "marble"): HTMLCanvasElement {
  const P = new Pen(30, 46)
  const c = palOf(p.accent)
  const metal = tone === "bronze" ? ["#fff0c0", "#d9a33a", "#8a5a14"] : tone === "glass" ? ["#e0fff6", "#7fe0c8", "#2f8a86"] : [c.ll, c.a, c.d]
  const stone = tone === "marble" ? ["#f1ece0", "#cfc7b4", "#8d8470"] : tone === "bronze" ? ["#d8c8a0", "#a89468", "#6a5a38"] : ["#7fb8b4", "#4a8a8a", "#245a62"]
  // pedestal
  P.box(2, 33, 26, 12, stone[1]); P.r(3, 34, 24, 2, stone[0]); P.r(3, 42, 24, 2, stone[2]); P.r(5, 38, 20, 1, stone[2])
  P.box(5, 29, 20, 5, stone[0]); P.r(6, 30, 18, 1, WHITE)
  const m = motifFor(p), k = hashStr(p.id)
  const base = 29
  if (p.id === "duckops" || m === "pipeline") {
    const D: Record<string, string> = { y: metal[1], Y: metal[2], o: ORANGE, K: INK, w: metal[0] }
    P.bm(["......yyy.......", ".....yyyyy......", ".....yKyyyoooo..", ".....yyyyyooooo.", "......yyyy......", "......yyyy......", "..yy..yyyyy.....", ".yyyyyyyyyyyy...", "yyyyyyyyyyyyyy..", "yyyYYyyyyyyyyy..", ".yyYYYyyyyyyy...", "..yyyyyyyyyy...."], D, 7, base - 13, { outline: true })
  } else if (m === "shield" || m === "hash") {
    shieldAt(P, 15, base - 24, 18, 23, metal[2], metal[0]); P.r(14, base - 17, 2, 9, metal[0]); P.r(11, base - 13, 8, 2, metal[0])
  } else if (m === "network" || m === "scan" || m === "mosaic") {
    P.disc(15, base - 12, 11, INK); P.disc(15, base - 12, 10, metal[1]); P.ring(15, base - 12, 7, metal[0], 1); P.r(15, base - 22, 1, 20, metal[2]); P.r(5, base - 12, 20, 1, metal[2]); P.disc(15, base - 12, 3, metal[0]); P.disc(11, base - 16, 1, WHITE)
  } else if (m === "dial" || m === "ledger") {
    for (let i = 0; i < 4; i++) { P.ell(15, base - 2 - i * 4, 9, 3, INK); P.ell(15, base - 2 - i * 4, 8, 2, i % 2 ? metal[1] : metal[0]); P.r(8, base - 2 - i * 4, 14, 1, metal[2]) }
    P.spark(15, base - 20, WHITE, true)
  } else if (m === "api" || m === "tools" || m === "terminal") {
    P.line(8, base - 2, 22, base - 20, INK, 5); P.line(8, base - 2, 22, base - 20, metal[1], 3); P.disc(23, base - 21, 5, INK); P.disc(23, base - 21, 4, metal[1]); P.r(21, base - 25, 4, 4, INK)
    P.line(22, base - 2, 8, base - 20, INK, 5); P.line(22, base - 2, 8, base - 20, metal[0], 3)
  } else if (m === "neural" || m === "glitch" || m === "wave") {
    P.poly([[15, base - 24], [26, base - 12], [15, base - 1], [4, base - 12]], INK); P.poly([[15, base - 22], [24, base - 12], [15, base - 3], [6, base - 12]], metal[1]); P.poly([[15, base - 22], [24, base - 12], [15, base - 12]], metal[0]); P.poly([[15, base - 12], [24, base - 12], [15, base - 3]], metal[2])
  } else {
    gear(P, 15, base - 12, 8, metal[1], stone[0]); P.ring(15, base - 12, 9, INK, 1); P.disc(15, base - 12, 3, metal[0])
  }
  if (k % 2) P.spark(5, base - 20, WHITE)
  return P.c
}

/** neon billboard: bezel with bulbs around the titled art, optional tagline strip beneath */
export function billboard(p: ExProject, o: { pitch?: boolean; art?: HTMLCanvasElement; lines?: string[] } = {}): HTMLCanvasElement {
  const art = o.art ?? titledArt(p), c = palOf(p.accent)
  const lines = o.pitch ? (o.lines ?? wrapMicro(p.tagline, 15, 2)) : []
  const sh = lines.length ? lines.length * 6 + 3 : 0
  const W = art.width + 8, H = art.height + 8 + sh
  const { c: cv, ctx } = canvas(W, H)
  ctx.fillStyle = "#0d0b16"; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = "#4a525c"; ctx.fillRect(0, 0, W, 1); ctx.fillRect(0, H - 1, W, 1); ctx.fillRect(0, 0, 1, H); ctx.fillRect(W - 1, 0, 1, H)
  ctx.drawImage(art, 4, 4)
  for (let x = 4; x < W - 2; x += 6) { ctx.fillStyle = "#fff4c8"; ctx.fillRect(x, 1, 2, 2); ctx.fillRect(x, H - 3, 2, 2) }
  for (let y = 6; y < H - 4; y += 6) { ctx.fillStyle = c.l; ctx.fillRect(1, y, 2, 2); ctx.fillRect(W - 3, y, 2, 2) }
  if (lines.length) {
    ctx.fillStyle = c.a; ctx.fillRect(4, art.height + 5, art.width, 1)
    lines.forEach((l, i) => drawMicro(ctx, l, 4 + Math.round((art.width - microW(l)) / 2), art.height + 8 + i * 6, i ? WHITE : c.ll))
  }
  return cv
}
export function wrapMicro(s: string, max: number, maxLines: number): string[] {
  const words = s.toUpperCase().replace(/[^A-Z0-9 &'.!/:+\-?#]/g, "").split(/\s+/).filter(Boolean)
  const out: string[] = []
  let cur = ""
  for (const w of words) {
    if ((cur + " " + w).trim().length <= max) cur = (cur + " " + w).trim()
    else { if (cur) out.push(cur); cur = w.slice(0, max) }
    if (out.length === maxLines) break
  }
  if (cur && out.length < maxLines) out.push(cur)
  return out.slice(0, maxLines)
}

/** art carved in relief: stone ramp by luminance, gold inlay where the art is brightly coloured */
export function carve(src: HTMLCanvasElement, accent: string, ramp: [string, string, string, string, string] = ["#6e4624", "#9a6a38", "#c49860", "#e4c088", "#f8e4b4"]): HTMLCanvasElement {
  const { c, ctx } = canvas(src.width, src.height)
  ctx.drawImage(src, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height), a = d.data
  const stops = ramp.map(toRgb), ac = toRgb(safeAccent(accent))
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], g = a[i + 1], b = a[i + 2]
    const l = (0.3 * r + 0.59 * g + 0.11 * b) / 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0
    const q = Math.min(4, Math.floor(Math.pow(l, 0.55) * 5.1))
    let [R, G, B] = stops[q]
    if (sat > 0.55 && l > 0.45) { R = 244; G = 196; B = 70; if (l > 0.8) { R = 255; G = 240; B = 160 } }
    else if (l > 0.9) { R = 250; G = 236; B = 190 }
    void ac
    a[i] = R; a[i + 1] = G; a[i + 2] = B; a[i + 3] = 255
  }
  ctx.putImageData(d, 0, 0)
  // chisel bevel: darker pixel under/right of a brighter one
  const e = ctx.getImageData(0, 0, c.width, c.height), o = e.data, w = c.width
  for (let y = 1; y < c.height; y++) for (let x = 1; x < w; x++) {
    const i = (y * w + x) * 4, j = (y * w + x - 1) * 4, k = ((y - 1) * w + x) * 4
    if (o[i] + o[i + 1] < o[j] + o[j + 1] - 90 || o[i] + o[i + 1] < o[k] + o[k + 1] - 90) { o[i] = Math.round(o[i] * 0.7); o[i + 1] = Math.round(o[i + 1] * 0.7); o[i + 2] = Math.round(o[i + 2] * 0.7) }
  }
  ctx.putImageData(e, 0, 0)
  return c
}

/** spectral version of the art: glowing duotone, with `frames` flicker cells laid side by side */
export function spectral(src: HTMLCanvasElement, accent: string, frames = 4): HTMLCanvasElement {
  const w = src.width, h = src.height
  const { c, ctx } = canvas(w * frames, h)
  const tint = toRgb(mix(safeAccent(accent), "#9fffe6", 0.55)), deep = toRgb("#0a2a3a")
  const base = canvas(w, h)
  base.ctx.drawImage(src, 0, 0)
  const d = base.ctx.getImageData(0, 0, w, h), a = d.data
  for (let i = 0; i < a.length; i += 4) {
    const l = Math.pow((0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) / 255, 0.85)
    a[i] = deep[0] + (tint[0] - deep[0]) * l; a[i + 1] = deep[1] + (tint[1] - deep[1]) * l; a[i + 2] = deep[2] + (tint[2] - deep[2]) * l; a[i + 3] = 255
  }
  base.ctx.putImageData(d, 0, 0)
  for (let f = 0; f < frames; f++) {
    ctx.save(); ctx.translate(f * w, 0)
    ctx.drawImage(base.c, 0, 0)
    // a bright scan band drifting down the pane, and a few sparkles
    const y = Math.floor((f / frames) * (h + 8)) - 4
    ctx.fillStyle = "rgba(220,255,248,.28)"; ctx.fillRect(0, y, w, 3)
    ctx.fillStyle = "rgba(230,255,250,.5)"; ctx.fillRect(0, y + 1, w, 1)
    ctx.fillStyle = "rgba(0,20,30,.18)"; for (let yy = (f % 2); yy < h; yy += 2) ctx.fillRect(0, yy, w, 1)
    ctx.fillStyle = "rgba(255,255,255,.85)"
    for (let k = 0; k < 5; k++) { const hx = hashStr(accent + k + f * 7); ctx.fillRect(hx % w, (hx >> 8) % h, 1, 1) }
    ctx.restore()
  }
  return c
}

/** a canvas with a solid mat border of `n` px around it */
export function matted(art: HTMLCanvasElement, n: number, col: string): HTMLCanvasElement {
  const { c, ctx } = canvas(art.width + n * 2, art.height + n * 2)
  ctx.fillStyle = col; ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(0, 0, c.width, 1)
  ctx.drawImage(art, n, n)
  return c
}

// ── desert relics: carved sandstone ─────────────────────────────
const SAND = { ink: "#3e2512", d: "#8a5e34", m: "#bf8f58", l: "#e2bc82", hl: "#f6dfae" }
const ARCH_RY = 12
function slabHalf(i: number, w: number, arch: boolean) {
  const r = w / 2
  if (arch && i < ARCH_RY) { const dy = (ARCH_RY - i - 0.5) / ARCH_RY; return Math.round(r * Math.sqrt(Math.max(0, 1 - dy * dy))) }
  return r
}
function slab(P: Pen, x: number, y: number, w: number, h: number, arch: boolean, col: string) {
  const r = w / 2
  for (let i = 0; i < h; i++) { const half = slabHalf(i, w, arch); P.r(x + r - half, y + i, half * 2, 1, col) }
}
function slabSet(P: Pen, x: number, y: number, w: number, h: number, arch: boolean) {
  slab(P, x - 1, y - 1, w + 2, h + 1, arch, SAND.ink)
  slab(P, x, y, w, h, arch, SAND.m)
  const r = w / 2
  for (let i = 0; i < h; i++) {
    const half = slabHalf(i, w, arch)
    P.r(x + r - half, y + i, 2, 1, SAND.l); P.r(x + r + half - 2, y + i, 2, 1, SAND.d)
    if (i === 0 || (arch && i < 3)) P.r(x + r - half, y + i, half * 2, 1, SAND.hl)
  }
}
/** a carved sandstone stele: gold-inlaid title, the project art in relief (great ones add an arch, tagline and glyph frieze) */
export function stele(p: ExProject, kind: "great" | "tablet" = "tablet", k = 1): HTMLCanvasElement {
  const art = carve(exhibitArt(p), p.accent)
  const great = kind === "great"
  const W = great ? 84 : 76, H = great ? 82 : 72
  const P = new Pen(W, H)
  const sx = great ? 6 : 4, sw = W - sx * 2
  P.box(0, H - 8, W, 8, SAND.d); P.r(1, H - 7, W - 2, 1, SAND.l)
  slabSet(P, sx, 2, sw, H - 10, great)
  const gy = great ? 6 : 4
  slab(P, sx + 3, gy, sw - 6, H - 10 - gy - 3, great, "#b07d14"); slab(P, sx + 4, gy + 1, sw - 8, H - 10 - gy - 5, great, SAND.m)
  for (let i = 0; i < 24; i++) { const hx = hashStr(p.id + "s" + i); P.p(sx + 6 + (hx % (sw - 12)), gy + 4 + ((hx >> 8) % (H - 30)), i % 3 ? SAND.d : SAND.l) }
  const ty = great ? 13 : 7
  const title = (T: Pen, bx: number, by: number, bw: number, tw: number) => {
    const f = fitTitle(p, tw)
    T.r(bx, by - 3, bw, 12, SAND.ink); T.r(bx + 1, by - 2, bw - 2, 10, SAND.d)
    const tx = Math.round((T.w - f.w) / 2)
    if (f.micro) drawMicro(T.x, f.s, tx, by + 1, "#ffd84a", SAND.ink); else drawText(T.x, f.s, tx, by, "#ffd84a", SAND.ink)
  }
  if (k === 1) title(P, sx + 5, ty, sw - 10, sw - 12)
  const ay = ty + 13
  P.r(W / 2 - 34, ay - 2, 68, 44, "#f4c430"); P.r(W / 2 - 33, ay - 1, 66, 42, SAND.ink)
  P.x.drawImage(art, W / 2 - 32, ay)
  for (const [qx, qy] of [[W / 2 - 35, ay - 3], [W / 2 + 33, ay - 3], [W / 2 - 35, ay + 41], [W / 2 + 33, ay + 41]]) { P.r(qx, qy, 3, 3, "#f4c430"); P.p(qx, qy, "#fff0b0") }
  if (k === 1) return P.c
  const sc = shrink(P.c, k), T = new Pen(sc.width, sc.height)
  T.x.drawImage(sc, 0, 0)
  // lettering is drawn after scaling so it stays crisp
  const bx = Math.round((sx + 5) * k), by = Math.round(ty * k) + 1, bw = Math.round((sw - 10) * k)
  title(T, bx, by, bw, bw - 4)
  return T.c
}

/** striped cloth canopy on two poles, drawn over a relic; returns canvas of the given width */
/** nearest-neighbour downscale of a finished canvas (keeps the pixel look) */
export function shrink(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = Math.round(src.width * k), h = Math.round(src.height * k)
  const { c, ctx } = canvas(w, h)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, w, h)
  return c
}
/** shrink a horizontal strip of equal frames, frame by frame, with nearest sampling */
function shrinkStrip(src: HTMLCanvasElement, frames: number, k: number): { cv: HTMLCanvasElement; w: number; h: number } {
  const fw = src.width / frames, w = Math.round(fw * k), h = Math.round(src.height * k)
  const { c, ctx } = canvas(w * frames, h)
  ctx.imageSmoothingEnabled = false
  for (let f = 0; f < frames; f++) ctx.drawImage(src, f * fw, 0, fw, src.height, f * w, 0, w, h)
  return { cv: c, w, h }
}
export function canopy(w: number, accent: string): HTMLCanvasElement {
  const h = 34, P = new Pen(w, h), c = palOf(accent)
  P.r(2, 12, 3, h - 12, "#5a3a1e"); P.r(w - 5, 12, 3, h - 12, "#5a3a1e"); P.r(3, 12, 1, h - 12, "#8a5e34"); P.r(w - 4, 12, 1, h - 12, "#8a5e34")
  P.r(0, 8, w, 3, "#3e2512"); P.r(0, 8, w, 1, "#c9a14a")
  for (let i = 0; i < w; i += 6) {
    const col = (i / 6) % 2 ? WHITE : c.a
    P.poly([[i, 11], [i + 6, 11], [i + 6, 4], [i + 3, 0], [i, 4]].map(([x, y]) => [x, y] as [number, number]), col)
    P.r(i, 11, 6, 3, col); P.p(i + 2, 14, col); P.p(i + 3, 14, col)
  }
  for (let i = 0; i < w; i += 6) P.r(i, 4, 1, 10, "rgba(0,0,0,.18)")
  return P.c
}

/**
 * Stable entry points for UI code that wants a project's illustration as an image.
 *  exhibitArtDataUrl(project): PNG data URL of the 64x40 illustration (scale 1..8, default 3), or null off the browser.
 *  exhibitArtPath(id): static PNG baked under public/exhibits/art/ for the shipped projects (any scale-3 size 192x120).
 */
const urlCache = new Map<string, string>()
export function exhibitArtDataUrl(p: ExProject, scale = 3): string | null {
  if (typeof document === "undefined") return null
  const key = `${p.id}|${p.accent}|${p.featured}|${scale}`
  const hit = urlCache.get(key)
  if (hit) return hit
  const art = exhibitArt(p)
  const { c, ctx } = canvas(art.width * scale, art.height * scale)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(art, 0, 0, c.width, c.height)
  const url = c.toDataURL("image/png")
  urlCache.set(key, url)
  return url
}
export const exhibitArtPath = (id: string) => `/exhibits/art/${id}.png`

// ── ruins: memories ─────────────────────────────────────────────
const cell = (strip: HTMLCanvasElement, f: number, w: number, h: number) => { const k = canvas(w, h); k.ctx.drawImage(strip, f * w, 0, w, h, 0, 0, w, h); return k.c }
/** a floating spectral pane over a small obelisk, as an animated strip of `frames` cells of 80 x 82 */
export function memoryPane(p: ExProject, frames = 4, k = 1): { cv: HTMLCanvasElement; w: number; h: number; frames: number } {
  const sp = spectral(exhibitArt(p), p.accent, frames)
  const FW = 80, FH = 82
  const { c, ctx } = canvas(FW * frames, FH)
  for (let f = 0; f < frames; f++) {
    const ox = f * FW
    const lift = f % 2 ? 1 : 0
    const fr = frameAround(cell(sp, f, ART_W, ART_H), "spectral", true, "#0a2a34")
    const gr = ctx.createRadialGradient(ox + 40, 30 - lift, 4, ox + 40, 30 - lift, 44)
    gr.addColorStop(0, "rgba(140,255,230,.35)"); gr.addColorStop(1, "rgba(140,255,230,0)")
    ctx.fillStyle = gr; ctx.fillRect(ox, 0, FW, FH)
    ctx.drawImage(fr, ox, 2 - lift)
    ctx.fillStyle = "#0a1822"; ctx.fillRect(ox + 27, 62, 26, 20); ctx.fillStyle = "#2a4a58"; ctx.fillRect(ox + 28, 63, 24, 18); ctx.fillStyle = "#4a7a88"; ctx.fillRect(ox + 28, 63, 24, 2); ctx.fillStyle = "#16303c"; ctx.fillRect(ox + 46, 65, 6, 16)
    ctx.fillStyle = "#6effd6"; ctx.fillRect(ox + 38, 70, 4, 4); ctx.fillStyle = "#ffffff"; ctx.fillRect(ox + 39, 71, 2, 2)
    ctx.fillStyle = "rgba(200,255,245,.85)"
    for (let q = 0; q < 3; q++) ctx.fillRect(ox + 30 + q * 9, 60 - ((f * 3 + q * 5) % 9), 1, 1)
  }
  if (k !== 1) { const r = shrinkStrip(c, frames, k); return { cv: r.cv, w: r.w, h: r.h, frames } }
  return { cv: c, w: FW, h: FH, frames }
}
/** a tome on a lectern with a faint hologram of the art above it: strip of `frames` cells of 44 x 62 */
export function memoryTome(p: ExProject, frames = 3, k = 1): { cv: HTMLCanvasElement; w: number; h: number; frames: number } {
  const sp = spectral(exhibitArt(p), p.accent, frames)
  const FW = 44, FH = 62
  const { c, ctx } = canvas(FW * frames, FH)
  const f0 = fitTitle(p, 38)
  for (let f = 0; f < frames; f++) {
    const ox = f * FW
    const bob = f === 1 ? 1 : 0
    const gr = ctx.createRadialGradient(ox + 22, 14, 2, ox + 22, 14, 26)
    gr.addColorStop(0, "rgba(140,255,230,.3)"); gr.addColorStop(1, "rgba(140,255,230,0)")
    ctx.fillStyle = gr; ctx.fillRect(ox, 0, FW, 40)
    ctx.fillStyle = "rgba(160,255,235,.16)"; ctx.beginPath(); ctx.moveTo(ox + 14, 36); ctx.lineTo(ox + 30, 36); ctx.lineTo(ox + 37, 22); ctx.lineTo(ox + 7, 22); ctx.fill()
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(cell(sp, f, ART_W, ART_H), 0, 0, ART_W, ART_H, ox + 4, 1 - bob, 36, 22)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = "rgba(200,255,245,.8)"; ctx.fillRect(ox + 4, 0 - bob, 36, 1); ctx.fillRect(ox + 4, 23 - bob, 36, 1); ctx.fillRect(ox + 4, 1 - bob, 1, 22); ctx.fillRect(ox + 39, 1 - bob, 1, 22)
    ctx.fillStyle = "#0a1822"; ctx.fillRect(ox + 4, 36, 36, 26); ctx.fillStyle = "#26424e"; ctx.fillRect(ox + 5, 37, 34, 24); ctx.fillStyle = "#3c6270"; ctx.fillRect(ox + 5, 37, 34, 2)
    ctx.fillStyle = "#0a1822"; ctx.fillRect(ox + 8, 32, 28, 6)
    ctx.fillStyle = "#bff7ec"; ctx.fillRect(ox + 9, 33, 12, 4); ctx.fillRect(ox + 23, 33, 12, 4); ctx.fillStyle = "#6edcc4"; ctx.fillRect(ox + 21, 32, 2, 6)
    const tx = ox + 5 + Math.round((34 - f0.w) / 2)
    if (k === 1) { if (f0.micro) drawMicro(ctx, f0.s, tx, 46, "#a8f0e0"); else drawText(ctx, f0.s, tx, 44, "#a8f0e0") }
  }
  if (k !== 1) {
    const r = shrinkStrip(c, frames, k)
    const ctx2 = r.cv.getContext("2d")!
    // lettering is drawn after scaling so it stays crisp
    const f1 = fitTitle(p, Math.round(34 * k) - 2)
    const tx = Math.round(5 * k) + Math.round((Math.round(34 * k) - f1.w) / 2), ty = Math.round(45 * k)
    for (let f = 0; f < frames; f++) { if (f1.micro) drawMicro(ctx2, f1.s, f * r.w + tx, ty, "#a8f0e0"); else drawText(ctx2, f1.s, f * r.w + tx, ty - 1, "#a8f0e0") }
    return { cv: r.cv, w: r.w, h: r.h, frames }
  }
  return { cv: c, w: FW, h: FH, frames }
}
