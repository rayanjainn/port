// Shared pieces for the Hearthvale village rooms: the warm wood-and-parchment theme (Ninja Adventure floor + rim tiles,
// painted walls), Ninja Adventure props cropped for the room kit, and a few hand-painted fittings every room reuses.
import { PROPS, HOUSE_PROPS, type Rect } from "@/lib/na"
import { drawMicro, drawText, fitTitle } from "./exhibits"
import { TS, sheet, blit, hash, canvas } from "./core"
import { pen, shadow, shade, strip, type Theme, type Room, type Pen, type AddOpts } from "./interiors-kit"

export const INK = "#2a1608"
export const WOOD = "#7a4a26", WOOD_D = "#4a2a14", WOOD_L = "#b07a40", WOOD_LL = "#d8a060"
export const PARCH = "#f0dca8", PARCH_D = "#d4b680", PARCH_DD = "#a88852"
export const GOLD = "#e8b830", GOLD_D = "#a87a14", RED = "#b03a2e", RED_D = "#6a1c1c", TEAL = "#2f8f86"

export type WallVariant = "beige" | "orange" | "brown" | "green"
const WALL_OFF: Record<WallVariant, [number, number]> = { beige: [0, 0], orange: [5, 0], brown: [0, 6], green: [5, 6] }

const FLOORS: Record<string, Rect[]> = {
  tan: [[192, 16, 16, 16]],
  beige: [[16, 16, 16, 16]],
  orange: [[16, 112, 16, 16]],
  yellow: [[96, 208, 16, 16], [16, 208, 16, 16]],
  dark: [[208, 208, 16, 16], [272, 224, 16, 16]],
  green: [[192, 112, 16, 16]],
}

export type WallKind = "plaster" | "plank" | "stone"
export interface VillageThemeOpts {
  wall: WallVariant
  floor: keyof typeof FLOORS | "wood"
  kind: WallKind
  base: string                 // wall colour
  beam?: string
  dark?: number
  tint?: string
  glow?: number
  mat?: [string, string]
  music?: Theme["music"]
}

export function villageTheme(o: VillageThemeOpts): Theme {
  const [wc, wr] = WALL_OFF[o.wall]
  const W = (c: number, r: number): Rect => [(wc + c) * 16, (wr + r) * 16, 16, 16]
  const beam = o.beam ?? "#5a3418"
  const base = o.base
  return {
    bg: "#0d0b14", dark: o.dark ?? 0.3, music: o.music ?? "chill", mat: o.mat ?? ["#7a3b2a", "#b5583c"],
    lighting: { tint: o.tint ?? "40,16,4", glow: o.glow ?? 0.3, holeStrength: 0.8, heroRadius: 70, radiusScale: 1 },
    floor: (g, x, y, c, r) => {
      if (o.floor === "wood") {
        // two staggered rows of planks per tile, warm and low-contrast
        for (let half = 0; half < 2; half++) {
          const py = y + half * 8, tone = hash(c, r * 2 + half, 11)
          g.fillStyle = tone > 0.66 ? "#a8703c" : tone > 0.33 ? "#9c6634" : "#a46c3a"; g.fillRect(x, py, TS, 8)
          g.fillStyle = "rgba(255,214,150,.14)"; g.fillRect(x, py, TS, 1)
          g.fillStyle = "rgba(50,22,6,.55)"; g.fillRect(x, py + 7, TS, 1)
          const jx = x + ((c * 5 + r * 3 + half * 7) % 3) * 5 + 3
          g.fillStyle = "rgba(50,22,6,.5)"; g.fillRect(jx, py, 1, 7)
          if (tone > 0.8) { g.fillStyle = "rgba(60,28,8,.4)"; g.fillRect(x + 9, py + 3, 3, 2); g.fillStyle = "rgba(255,214,150,.18)"; g.fillRect(x + 9, py + 2, 3, 1) }
          g.fillStyle = "rgba(40,18,4,.5)"; g.fillRect(jx + 1, py + 1, 1, 1); g.fillRect(jx - 2, py + 5, 1, 1)
        }
        return
      }
      const rects = FLOORS[o.floor]
      blit(g, sheet("ifloor"), rects[Math.floor(hash(c, r, 4) * rects.length)], x, y)
    },
    back: (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h)
      if (o.kind === "plaster") {
        for (let y = 8; y < h - 14; y += 2) for (let x = (y * 7) % 5; x < w; x += 5) {
          const k = hash(x, y, 9)
          if (k > 0.82) { g.fillStyle = "rgba(255,240,200,.10)"; g.fillRect(x, y, 2, 1) } else if (k < 0.12) { g.fillStyle = "rgba(90,50,20,.08)"; g.fillRect(x, y, 1, 2) }
        }
        g.fillStyle = "rgba(90,50,20,.10)"
        for (let x = 0; x < w; x += 48) g.fillRect(x, 8, 1, h - 22)
      } else if (o.kind === "plank") {
        for (let x = 0; x < w; x += 12) {
          g.fillStyle = (x / 12) % 2 ? "rgba(255,200,130,.05)" : "rgba(0,0,0,.10)"; g.fillRect(x, 0, 12, h)
          g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x + 11, 0, 1, h)
          g.fillStyle = "rgba(255,210,150,.10)"; g.fillRect(x, 0, 1, h)
          const k = hash(x, 3, 5)
          if (k > 0.6) { const ky = 10 + Math.floor(k * 40) % (h - 30); g.fillStyle = "rgba(30,14,4,.55)"; g.fillRect(x + 4, ky, 3, 2); g.fillStyle = "rgba(255,210,150,.14)"; g.fillRect(x + 4, ky - 1, 3, 1) }
        }
      } else {
        for (let y = 7; y < h - 14; y += 8) {
          const off = (y / 8) % 2 ? 8 : 0
          g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, y, w, 1)
          for (let x = off; x < w; x += 16) {
            g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(x, y, 1, 8)
            g.fillStyle = hash(x, y, 2) > 0.5 ? "rgba(255,220,170,.10)" : "rgba(0,0,0,.10)"; g.fillRect(x + 1, y + 1, 15, 7)
          }
        }
      }
      // soft ceiling shadow
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(20,8,0,.55)"); gr.addColorStop(0.5, "rgba(20,8,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h)
      // ceiling beam with rafter ends
      g.fillStyle = beam; g.fillRect(0, 0, w, 7)
      g.fillStyle = shade(beam, 0.28); g.fillRect(0, 0, w, 1); g.fillStyle = shade(beam, 0.1); g.fillRect(0, 1, w, 1)
      g.fillStyle = INK; g.fillRect(0, 7, w, 1)
      for (let x = 24; x < w - 8; x += 64) {
        g.fillStyle = INK; g.fillRect(x - 1, 7, 8, 4); g.fillStyle = beam; g.fillRect(x, 7, 6, 3); g.fillStyle = shade(beam, 0.2); g.fillRect(x, 7, 6, 1)
      }
      // wainscot: wood panels under a chair rail
      const wy = h - 13
      g.fillStyle = INK; g.fillRect(0, wy - 1, w, 1)
      g.fillStyle = WOOD_L; g.fillRect(0, wy, w, 2); g.fillStyle = WOOD_LL; g.fillRect(0, wy, w, 1)
      g.fillStyle = WOOD; g.fillRect(0, wy + 2, w, 9)
      for (let x = 0; x < w; x += 12) { g.fillStyle = WOOD_D; g.fillRect(x, wy + 2, 1, 9); g.fillStyle = "rgba(255,210,150,.14)"; g.fillRect(x + 1, wy + 3, 1, 6); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x + 6, wy + 3, 5, 6) }
      g.fillStyle = WOOD_D; g.fillRect(0, h - 2, w, 2); g.fillStyle = INK; g.fillRect(0, h - 1, w, 1)
    },
    side: (g, x, y, left) => { blit(g, sheet("wall"), left ? W(0, 2) : W(4, 2), x, y) },
    front: (g, x, y) => { blit(g, sheet("wall"), W(2 + ((x / TS) & 1), 4), x, y) },
  }
}

// ── Ninja Adventure props, cropped so they go through the room kit like any painted prop ─────────
function naCrop(name: string): HTMLCanvasElement {
  const p = PROPS[name] ?? HOUSE_PROPS[name]
  const src = PROPS[name] ? sheet("element") : sheet("house")
  const k = canvas(p.rect[2], p.rect[3])
  blit(k.ctx, src, p.rect, 0, 0)
  return k.c
}
/** put a Ninja Adventure prop with its top-left tile at (c, r). Solid only when the catalogue says so. */
export function prop(R: Room, name: string, c: number, r: number, op: AddOpts = {}) {
  const cv = naCrop(name)
  const p = PROPS[name] ?? HOUSE_PROPS[name]
  const solid = op.solid ?? (p.solid === true ? [Math.max(4, cv.width - 2), Math.min(10, cv.height)] as [number, number] : false)
  return R.add(cv, c * TS + cv.width / 2, r * TS + cv.height, { ...op, solid })
}

export const text = (P: Pen, s: string, x: number, y: number, col: string, sh?: string) => drawMicro(P.x, s, x, y, col, sh)

// ── flat floor decals ───────────────────────────────────────────
/** a woven rug: border bands, fringe on the short ends, a field with a diamond lattice */
export function rug(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, field: string, band: string, trim = GOLD, medallion = true) {
  x = Math.round(x); y = Math.round(y)
  g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(x + 1, y + 2, w, h)
  g.fillStyle = INK; g.fillRect(x - 1, y - 1, w + 2, h + 2)
  g.fillStyle = band; g.fillRect(x, y, w, h)
  g.fillStyle = trim; g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + h - 3, w - 4, 1); g.fillRect(x + 2, y + 2, 1, h - 4); g.fillRect(x + w - 3, y + 2, 1, h - 4)
  g.fillStyle = field; g.fillRect(x + 4, y + 4, w - 8, h - 8)
  g.fillStyle = "rgba(255,255,255,.10)"
  for (let j = 0; j * 6 + 8 < h - 4; j++) for (let i = 0; i * 8 + 8 < w - 6; i++) { const cx = x + 8 + i * 8 + (j % 2) * 4, cy = y + 8 + j * 6; if (cx < x + w - 6) { g.fillRect(cx, cy - 1, 1, 3); g.fillRect(cx - 1, cy, 3, 1) } }
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x + 4, y + 4, w - 8, 1); g.fillRect(x + 4, y + 4, 1, h - 8)
  if (medallion && w >= 40 && h >= 40) {
    const cx = x + w / 2, cy = y + h / 2
    g.fillStyle = trim; g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fill(); g.fillStyle = band; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill()
    g.fillStyle = trim; g.fillRect(cx - 1, cy - 6, 2, 12); g.fillRect(cx - 6, cy - 1, 12, 2)
  }
  g.fillStyle = trim
  for (let i = 1; i < w - 1; i += 3) { g.fillRect(x + i, y - 3, 1, 2); g.fillRect(x + i, y + h + 1, 1, 2) }
}
export function pool(R: Room, x: number, y: number, rx: number, ry: number, rgb: string, a = 0.16) { R.pool(x, y, rx, ry, rgb, a) }

// ── animated flames ─────────────────────────────────────────────
export function flame(P: Pen, cx: number, base: number, w: number, h: number, f: number) {
  const sway = [0, 1, 0, -1][f % 4], tall = [0, 2, 1, 3][f % 4]
  const o = ["#d8481a", "#ff9a2a", "#ffe27a"]
  P.poly([[cx - w / 2, base], [cx - w / 2 + 1, base - h * 0.5], [cx + sway, base - h - tall], [cx + w / 2 - 1, base - h * 0.5], [cx + w / 2, base]], o[0])
  P.poly([[cx - w / 3, base], [cx + sway, base - h * 0.85 - tall], [cx + w / 3, base]], o[1])
  P.poly([[cx - w / 6, base], [cx + sway, base - h * 0.5], [cx + w / 6, base]], o[2])
}
/** a hanging iron-and-paper lantern, three flicker frames, 16 px per frame */
export const lanternStrip = (h = 26) => strip(16, h, 3, (P, f) => {
  P.r(7, 0, 2, 5, "#3a2a1c"); P.p(6, 1, "#3a2a1c"); P.p(9, 1, "#3a2a1c")
  P.poly([[4, 5], [11, 5], [13, 9], [2, 9]], "#5a2a1c"); P.r(5, 6, 6, 1, GOLD)
  P.r(3, 9, 10, 9, "#5a2a1c")
  const glow = ["#ffd45a", "#ffe58a", "#ffc23a"][f]
  P.r(4, 10, 8, 7, glow); P.r(5, 11, 6, 5, "#fff3b0"); P.r(7, 10, 1, 7, "#8a3a1c"); P.r(4, 13, 8, 1, "#8a3a1c")
  P.poly([[3, 18], [12, 18], [10, 22], [5, 22]], "#5a2a1c"); P.r(7, 22, 2, 3, GOLD)
  P.x.fillStyle = "rgba(255,200,90,.16)"; P.x.fillRect(0, 7, 16, 14)
})
/** a standing three-branch candelabra, three flicker frames, 20 px per frame */
export const candelabra = () => strip(20, 36, 3, (P, f) => {
  shadow(P, 4, 33, 12)
  P.r(9, 16, 2, 16, "#3a2210"); P.r(9, 16, 1, 16, GOLD_D); P.r(6, 30, 8, 3, INK); P.r(7, 30, 6, 2, GOLD); P.r(7, 30, 6, 1, "#fff0a0")
  P.r(3, 15, 14, 2, INK); P.r(4, 15, 12, 1, GOLD)
  for (const x of [4, 9, 14]) {
    P.r(x + 1, 9, 2, 6, INK); P.r(x + 1, 9, 2, 5, "#f4ecd0"); P.r(x + 1, 9, 1, 5, "#fff")
    const l = [0, 1, 0][f]; flame(P, x + 2, 9, 3, 5 + l, f + x)
  }
})
/** a small table candle with flame, three frames of 8 px */
export const candle = () => strip(8, 16, 3, (P, f) => {
  P.r(2, 10, 4, 5, INK); P.r(3, 10, 2, 4, "#f4ecd0"); P.r(3, 10, 1, 4, "#fff"); P.r(1, 14, 6, 1, GOLD_D)
  flame(P, 4, 10, 3, 4, f)
})

// ── hung things ─────────────────────────────────────────────────
/** a tall cloth banner with a forked tail and a lantern-flower crest */
export function banner(cloth: string, trim: string, crest: "flower" | "sword" | "star" | "feather" = "flower", w = 20, h = 46) {
  const P = pen(w, h)
  P.r(0, 0, w, 3, INK); P.r(1, 1, w - 2, 1, WOOD_L); P.r(0, 0, 2, 4, INK); P.r(w - 2, 0, 2, 4, INK); P.p(0, 1, GOLD); P.p(w - 1, 1, GOLD)
  P.poly([[2, 3], [w - 2, 3], [w - 2, h - 2], [w / 2, h - 9], [2, h - 2]], INK)
  P.poly([[3, 4], [w - 3, 4], [w - 3, h - 4], [w / 2, h - 11], [3, h - 4]], cloth)
  P.r(3, 4, 1, h - 10, shade(cloth, 0.22)); P.r(w - 4, 4, 1, h - 10, shade(cloth, -0.25))
  P.r(3, 6, w - 6, 1, trim); P.r(3, 8, w - 6, 1, shade(trim, -0.3))
  const cx = w / 2, cy = 21
  P.disc(cx, cy, 6, trim); P.disc(cx, cy, 5, shade(cloth, -0.15))
  if (crest === "flower") { for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]] as [number, number][]) P.disc(cx + dx, cy + dy, 1, trim); P.p(cx, cy, GOLD) }
  else if (crest === "sword") { P.r(cx, cy - 4, 1, 8, trim); P.r(cx - 2, cy + 1, 5, 1, trim); P.p(cx, cy - 5, "#fff") }
  else if (crest === "star") { P.spark(cx, cy, trim, true) }
  else { P.line(cx - 3, cy + 3, cx + 3, cy - 3, trim); P.line(cx - 2, cy + 3, cx + 3, cy - 2, trim); P.p(cx + 3, cy - 3, "#fff") }
  P.r(3, h - 14, w - 6, 1, trim)
  for (let x = 4; x < w - 3; x += 3) { P.p(x, h - 3 - (x > w / 2 ? 1 : 0), trim) }
  return P.c
}
/** a framed parchment page: a date line, a rule, and up to three lines of micro text */
export function framedPage(w: number, h: number, date: string, lines: string[], seal = RED) {
  const P = pen(w, h)
  P.r(0, 0, w, h, INK); P.r(1, 1, w - 2, h - 2, WOOD_L); P.r(1, 1, w - 2, 1, WOOD_LL); P.r(1, h - 2, w - 2, 1, WOOD)
  P.r(3, 3, w - 6, h - 6, INK); P.r(4, 4, w - 8, h - 8, PARCH)
  P.r(4, 4, w - 8, 1, "#fff6d0"); P.r(4, h - 5, w - 8, 1, PARCH_D)
  for (let i = 0; i < 6; i++) P.p(5 + ((i * 7) % (w - 12)), 6 + ((i * 11) % (h - 14)), PARCH_D)
  text(P, date, 6, 6, "#8a3a1e")
  P.r(5, 13, w - 10, 1, PARCH_DD)
  lines.forEach((l, i) => text(P, l, 6, 16 + i * 6, i === 0 ? INK : "#5a3a1e"))
  P.disc(w - 9, h - 8, 2, seal); P.p(w - 10, h - 9, shade(seal, 0.4))
  P.p(w - 9, h - 5, seal); P.p(w - 8, h - 4, seal)
  return P.c
}
/** a plank sign on two chains, text in the 5x7 face (or micro when it will not fit) */
export function plankSign(label: string, w: number, col = "#f4e4b4", wood = WOOD, sub?: string) {
  const h = sub ? 22 : 16
  const P = pen(w, h)
  P.r(Math.round(w * 0.2), 0, 1, 3, "#3a2a1c"); P.r(Math.round(w * 0.8), 0, 1, 3, "#3a2a1c")
  P.r(0, 3, w, h - 3, INK); P.r(1, 4, w - 2, h - 5, wood); P.r(1, 4, w - 2, 1, shade(wood, 0.3)); P.r(1, h - 2, w - 2, 1, shade(wood, -0.3))
  for (let x = 6; x < w - 2; x += 9) P.r(x, 5, 1, h - 7, shade(wood, -0.12))
  P.p(2, 5, GOLD); P.p(w - 3, 5, GOLD)
  const f = fitTitle(label, w - 8)
  const ty = sub ? 6 : Math.round((h - 3 - (f.micro ? 5 : 7)) / 2) + 3
  if (f.micro) drawMicro(P.x, f.s, Math.round((w - f.w) / 2), ty, col, INK); else drawText(P.x, f.s, Math.round((w - f.w) / 2), ty, col, INK)
  if (sub) { const sf = fitTitle(sub, w - 8); drawMicro(P.x, sf.micro ? sf.s : sf.s, Math.round((w - (sf.micro ? sf.w : sf.s.length * 4 - 1)) / 2), 15, "#e8d49a", INK) }
  return P.c
}
/** a small arched window onto an evening sky: curtains and a sill */
export function windowEvening(w: number, h: number, seed = 1, sky: [string, string, string] = ["#2a2a6a", "#6a4a8a", "#e8905a"]) {
  const P = pen(w, h)
  P.r(0, 0, w, h, INK); P.r(1, 1, w - 2, h - 2, WOOD_L); P.r(1, 1, w - 2, 1, WOOD_LL)
  const iw = w - 8, ih = h - 12
  for (let y = 0; y < ih; y++) { const t = y / ih; P.r(4, 4 + y, iw, 1, t < 0.5 ? sky[0] : t < 0.75 ? sky[1] : sky[2]) }
  for (let i = 0; i < 5; i++) P.p(5 + ((seed * 13 + i * 9) % (iw - 2)), 5 + ((seed * 7 + i * 5) % Math.max(3, ih / 2)), "#fff4cf")
  P.poly([[4, 4 + ih], [4, 4 + ih - 6], [4 + iw * 0.3, 4 + ih - 9], [4 + iw * 0.6, 4 + ih - 5], [4 + iw, 4 + ih - 8], [4 + iw, 4 + ih]], "#1c1030")
  P.r(4 + Math.floor(iw / 2), 4, 1, ih, INK); P.r(4, 4 + Math.floor(ih / 2), iw, 1, INK)
  P.r(0, h - 6, w, 3, WOOD_D); P.r(0, h - 6, w, 1, WOOD_LL); P.r(1, h - 3, w - 2, 3, INK)
  // curtains
  P.r(2, 2, 4, ih + 4, "#a8382e"); P.r(2, 2, 1, ih + 4, "#d85a48"); P.r(w - 6, 2, 4, ih + 4, "#a8382e"); P.r(w - 3, 2, 1, ih + 4, "#6a1c1c")
  P.r(2, 2, w - 4, 2, GOLD_D)
  return P.c
}
