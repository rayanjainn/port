// Sunscar Oasis interiors: six sandstone rooms behind the landmark doors, lit by lanterns, torches and a kiln.
import type { Portfolio } from "@/lib/content"
import { charSheet, charFace } from "@/lib/na"
import { drawText, drawMicro, fitTitle, textW, microW, ordered, stele, palOf, shrink, wrapMicro } from "./exhibits"
import { TS, type Scene } from "./core"
import { makeRoom, npc as mkNpc, pen, shadow, shade, strip, type Theme, type Room, type Pen } from "./interiors-kit"

type Ctx = CanvasRenderingContext2D
const INK = "#2a1608"
const TERRA = "#c4552d", TEAL = "#2fa6a0", GOLD = "#f4c430", CREAM = "#f3e2b8"

function sandTheme(o: { wall?: string; floor?: "flag" | "dark" | "mosaic"; dark?: number; tint?: string; mortar?: string } = {}): Theme {
  const wall = o.wall ?? "#d3a468", mortar = o.mortar ?? "#8a5e34"
  const fl = o.floor ?? "flag"
  return {
    bg: "#0d0805", dark: o.dark ?? 0.42, music: "desert",
    lighting: { tint: o.tint ?? "34,14,4", glow: 0.32, holeStrength: 0.8, heroRadius: 70, radiusScale: 1 },
    floor: (g, x, y, c, r) => {
      if (fl === "dark") {
        g.fillStyle = (c + r) % 2 ? "#6b4a36" : "#5f4130"; g.fillRect(x, y, TS, TS)
        g.fillStyle = "rgba(255,200,140,.10)"; g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS)
        g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x + 15, y, 1, TS); g.fillRect(x, y + 15, TS, 1)
        if ((c * 7 + r * 3) % 5 === 0) { g.fillStyle = "rgba(20,10,6,.45)"; g.fillRect(x + 3, y + 4, 6, 3) }
        return
      }
      if (fl === "mosaic") {
        g.fillStyle = (c + r) % 2 ? "#6a5a8a" : "#5e5080"; g.fillRect(x, y, TS, TS)
        g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS)
        g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(x + 15, y, 1, TS); g.fillRect(x, y + 15, TS, 1)
        if ((c * 5 + r * 11) % 7 === 0) { g.fillStyle = "#e6c36a"; g.fillRect(x + 7, y + 7, 2, 2) }
        return
      }
      g.fillStyle = (c + r) % 2 ? "#cfa56e" : "#c39a62"; g.fillRect(x, y, TS, TS)
      g.fillStyle = "rgba(255,235,190,.35)"; g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS)
      g.fillStyle = "rgba(90,55,20,.45)"; g.fillRect(x + 15, y, 1, TS); g.fillRect(x, y + 15, TS, 1)
      const k = (c * 13 + r * 7) % 9
      if (k === 0) { g.fillStyle = "rgba(90,55,20,.35)"; g.fillRect(x + 4, y + 5, 5, 1); g.fillRect(x + 8, y + 6, 3, 1) }
      if (k === 3) { g.fillStyle = "rgba(255,230,170,.35)"; g.fillRect(x + 9, y + 10, 3, 2) }
    },
    back: (g, w, h) => {
      g.fillStyle = wall; g.fillRect(0, 0, w, h)
      // adobe courses
      for (let y = 0; y < h - 16; y += 8) {
        g.fillStyle = mortar; g.fillRect(0, y, w, 1)
        const off = (y / 8) % 2 ? 8 : 0
        for (let x = off; x < w; x += 16) { g.fillStyle = mortar; g.fillRect(x, y, 1, 8); g.fillStyle = ((x * 3 + y) % 5 < 2) ? "rgba(255,230,170,.12)" : "rgba(80,40,10,.07)"; g.fillRect(x + 1, y + 1, 15, 7) }
      }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(20,8,0,.6)"); gr.addColorStop(0.55, "rgba(20,8,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h)
      // cornice: a band of zigzag tiles
      g.fillStyle = shade(wall, -0.45); g.fillRect(0, 0, w, 9)
      for (let x = 0; x < w; x += 8) { g.fillStyle = (x / 8) % 2 ? TEAL : TERRA; g.fillRect(x, 2, 4, 4); g.fillStyle = GOLD; g.fillRect(x + 1, 3, 2, 1) }
      g.fillStyle = "#3a2010"; g.fillRect(0, 9, w, 1); g.fillStyle = "rgba(255,225,170,.5)"; g.fillRect(0, 0, w, 1)
      // dado
      g.fillStyle = shade(wall, -0.3); g.fillRect(0, h - 16, w, 16)
      g.fillStyle = mortar; g.fillRect(0, h - 17, w, 1); g.fillStyle = "rgba(255,230,170,.35)"; g.fillRect(0, h - 16, w, 1)
      for (let x = 0; x < w; x += 16) { g.fillStyle = (x / 16) % 2 ? TEAL : TERRA; g.fillRect(x + 6, h - 11, 4, 4); g.fillStyle = shade(wall, -0.5); g.fillRect(x + 7, h - 10, 2, 2); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x + 15, h - 14, 1, 12) }
      g.fillStyle = "#2a1608"; g.fillRect(0, h - 3, w, 3)
    },
    side: (g, x, y) => { g.fillStyle = shade(wall, -0.35); g.fillRect(x, y, TS, TS); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x, y + 7, TS, 1); g.fillRect(x + 7, y, 1, 8); g.fillRect(x + 3, y + 8, 1, 8); g.fillStyle = "rgba(255,225,170,.15)"; g.fillRect(x + 8, y + 1, 7, 6) },
    front: (g, x, y) => { g.fillStyle = shade(wall, -0.4); g.fillRect(x, y, TS, TS); g.fillStyle = "#2a1608"; g.fillRect(x, y, TS, 3); g.fillStyle = "rgba(255,225,170,.25)"; g.fillRect(x, y + 4, TS, 1); g.fillRect(x + 3, y + 8, 10, 1) },
    mat: ["#6a2a1c", TERRA],
  }
}

// ── props ───────────────────────────────────────────────────────
const box = (P: Pen, x: number, y: number, w: number, h: number, fill: string, line = INK) => P.box(x, y, w, h, fill, line)

function archWindow(w: number, h: number, seed: number): HTMLCanvasElement {
  const P = pen(w, h)
  const r = w / 2
  const inside = (x: number, y: number) => y >= r ? x >= 0 && x < w : Math.hypot(x - r + 0.5, y - r) <= r
  // stone frame
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) P.p(x, y, y < r ? INK : INK)
  for (let y = 1; y < h; y++) for (let x = 1; x < w - 1; x++) if (inside(x, y) && (y >= r ? true : Math.hypot(x - r + 0.5, y - r) <= r - 1)) P.p(x, y, "#e0bd86")
  const iw = w - 6
  for (let y = 3; y < h - 2; y++) for (let x = 3; x < w - 3; x++) {
    const inn = y >= r ? true : Math.hypot(x - r + 0.5, y - r) <= r - 3
    if (!inn) continue
    const t = (y - 3) / (h - 6)
    const col = t < 0.45 ? "#15123a" : t < 0.6 ? "#3a2a6a" : t < 0.78 ? "#c4552d" : "#f2a23a"
    P.p(x, y, col)
  }
  for (let i = 0; i < 8; i++) P.p(4 + ((seed * 13 + i * 11) % (iw - 2)), 4 + ((seed * 7 + i * 5) % Math.max(4, (h * 0.4) | 0)), "#fff4cf")
  // dune silhouettes and a palm
  P.x.fillStyle = "#2a1630"
  P.poly([[3, h - 8], [8, h - 12], [16, h - 9], [24, h - 13], [w - 3, h - 9], [w - 3, h - 3], [3, h - 3]], "#2a1630")
  P.r(Math.floor(w * 0.7), h - 22, 1, 12, "#14081c"); for (const [dx, dy] of [[-3, 0], [3, 0], [-2, -2], [2, -2], [0, -3]] as [number, number][]) P.line(Math.floor(w * 0.7), h - 22, Math.floor(w * 0.7) + dx * 2, h - 22 + dy * 2 + 2, "#14081c")
  // lattice (mashrabiya) bars and sill
  P.r(Math.floor(w / 2), 4, 1, h - 6, "#6a3f1c")
  for (let y = 8; y < h - 4; y += 8) P.r(3, y, w - 6, 1, "#6a3f1c")
  P.r(0, h - 3, w, 3, "#8a5e34"); P.r(0, h - 3, w, 1, "#f6dfae")
  return P.c
}
const lanternStrip = (h = 26) => strip(16, h, 3, (P, f) => {
  P.r(7, 0, 2, 5, "#3a2a1c"); P.p(6, 1, "#3a2a1c"); P.p(9, 1, "#3a2a1c")
  P.poly([[4, 5], [11, 5], [13, 9], [2, 9]], "#5a3a1c"); P.r(5, 6, 6, 1, GOLD)
  P.r(3, 9, 10, 9, "#5a3a1c")
  const glow = ["#ffd45a", "#ffe58a", "#ffc23a"][f]
  P.r(4, 10, 8, 7, glow); P.r(5, 11, 6, 5, "#fff3b0"); P.r(7, 10, 1, 7, "#8a5a1c"); P.r(4, 13, 8, 1, "#8a5a1c")
  P.poly([[3, 18], [12, 18], [10, 22], [5, 22]], "#5a3a1c"); P.r(7, 22, 2, 3, GOLD)
  P.x.fillStyle = "rgba(255,200,90,.16)"; P.x.fillRect(0, 7, 16, 14)
})
const torchStrip = () => strip(14, 34, 4, (P, f) => {
  P.r(5, 16, 4, 18, "#4a2f18"); P.r(6, 16, 1, 18, "#7a5230"); box(P, 3, 13, 8, 5, "#3a3a44"); P.r(4, 14, 6, 1, "#8a8a9a")
  flame(P, 7, 14, 5, 12, f)
})
function flame(P: Pen, cx: number, base: number, w: number, h: number, f: number, cool = false) {
  const sway = [0, 1, 0, -1][f % 4], tall = [0, 2, 1, 3][f % 4]
  const o = cool ? ["#1e6ed8", "#4ab4ff", "#c8f0ff"] : ["#d8481a", "#ff9a2a", "#ffe27a"]
  P.poly([[cx - w / 2, base], [cx - w / 2 + 1, base - h * 0.5], [cx + sway, base - h - tall], [cx + w / 2 - 1, base - h * 0.5], [cx + w / 2, base]], o[0])
  P.poly([[cx - w / 3, base], [cx + sway, base - h * 0.85 - tall], [cx + w / 3, base]], o[1])
  P.poly([[cx - w / 6, base], [cx + sway, base - h * 0.5], [cx + w / 6, base]], o[2])
}
function cushion(col: string, col2 = CREAM, w = 22): HTMLCanvasElement {
  const P = pen(w, 12)
  P.ell(w / 2, 8, w / 2 - 1, 3, "rgba(0,0,0,.3)")
  P.ell(w / 2, 6, w / 2 - 1, 4, INK); P.ell(w / 2, 6, w / 2 - 2, 3, col); P.r(3, 4, w - 6, 1, shade(col, 0.35))
  for (let x = 5; x < w - 5; x += 4) { P.p(x, 6, col2); P.p(x + 1, 5, col2) }
  P.p(2, 5, GOLD); P.p(w - 3, 5, GOLD)
  return P.c
}
function lowTable(): HTMLCanvasElement {
  const P = pen(30, 20)
  shadow(P, 4, 17, 22)
  P.r(6, 11, 2, 6, "#5a3a1c"); P.r(22, 11, 2, 6, "#5a3a1c"); P.r(14, 12, 2, 5, "#5a3a1c")
  P.ell(15, 9, 13, 5, INK); P.ell(15, 8, 12, 4, "#c9a14a"); P.ell(15, 8, 9, 3, "#e8c860"); P.r(9, 6, 5, 1, "#fff3b0")
  // tea pot and glasses
  box(P, 11, 3, 7, 6, "#e8e0d0"); P.r(12, 4, 5, 1, "#fff"); P.r(18, 5, 3, 1, "#e8e0d0"); P.r(13, 1, 3, 2, "#b0a890")
  for (const x of [20, 8]) { P.r(x, 5, 3, 4, "#d8f0e8"); P.r(x, 6, 3, 2, "#c4552d") }
  return P.c
}
function amphora(h = 22, col = "#b5683a"): HTMLCanvasElement {
  const P = pen(14, h)
  shadow(P, 2, h - 2, 10)
  P.ell(7, h - 9, 6, 7, INK); P.ell(7, h - 9, 5, 6, col); P.r(4, h - 13, 2, 8, shade(col, 0.3))
  P.r(5, 2, 4, 6, INK); P.r(6, 2, 2, 6, col); P.r(4, 1, 6, 2, shade(col, -0.2)); P.r(4, 1, 6, 1, shade(col, 0.3))
  P.r(2, h - 14, 10, 1, TEAL); P.r(2, h - 6, 10, 1, TEAL)
  return P.c
}
function crate(w = 18, h = 16, col = "#8a5a30"): HTMLCanvasElement {
  const P = pen(w, h)
  shadow(P, 0, h - 2, w)
  box(P, 0, 0, w, h - 2, col); P.r(1, 1, w - 2, 1, shade(col, 0.35)); P.r(2, 2, 1, h - 6, shade(col, -0.3)); P.r(w - 3, 2, 1, h - 6, shade(col, -0.3)); P.r(3, 5, w - 6, 1, shade(col, -0.25))
  return P.c
}
function sack(col = "#d8c090"): HTMLCanvasElement {
  const P = pen(16, 18)
  shadow(P, 1, 16, 14)
  P.ell(8, 11, 7, 6, INK); P.ell(8, 11, 6, 5, col); P.r(5, 7, 6, 3, col); P.r(6, 5, 4, 3, INK); P.r(7, 5, 2, 3, shade(col, -0.3)); P.r(4, 9, 8, 1, shade(col, -0.3)); P.r(4, 8, 3, 2, shade(col, 0.4))
  return P.c
}
function rolledRugs(): HTMLCanvasElement {
  const P = pen(28, 24)
  shadow(P, 1, 22, 26)
  const cols = [TERRA, TEAL, "#d9a83a", "#8a3a6a"]
  for (let i = 0; i < 4; i++) { const x = 2 + i * 6, y = 2 + (i % 2) * 2; box(P, x, y, 7, 19 - (i % 2) * 2, cols[i]); P.r(x + 1, y + 1, 1, 16, shade(cols[i], 0.4)); P.r(x + 1, y + 6, 5, 1, CREAM); P.r(x + 1, y + 11, 5, 1, CREAM) }
  return P.c
}
function palmPot(): HTMLCanvasElement {
  const P = pen(30, 44)
  shadow(P, 6, 41, 18)
  box(P, 9, 30, 12, 11, "#b5683a"); P.r(10, 31, 10, 1, "#e0a070"); P.r(9, 35, 12, 1, TEAL)
  P.r(14, 12, 3, 18, "#7a5a30"); P.r(15, 12, 1, 18, "#a8844a")
  for (const [dx, dy] of [[-12, -2], [12, -2], [-9, -8], [9, -8], [-4, -12], [4, -12], [0, -14]] as [number, number][]) { P.line(15, 12, 15 + dx, 12 + dy + 5, "#14502a", 2); P.line(15, 12, 15 + dx, 12 + dy + 4, "#34a04a", 1) }
  P.disc(15, 13, 2, "#6a4a20")
  return P.c
}
function pillar(h = 64): HTMLCanvasElement {
  const P = pen(22, h)
  shadow(P, 1, h - 2, 20)
  box(P, 3, 0, 16, 7, "#e6c892"); P.r(4, 1, 14, 1, "#fff0c8"); box(P, 1, 6, 20, 4, "#c9a16a")
  box(P, 5, 9, 12, h - 20, "#d8b27a"); P.r(6, 10, 2, h - 22, "#f4dba4"); P.r(14, 10, 2, h - 22, "#a8783e")
  for (let y = 16; y < h - 14; y += 10) P.r(5, y, 12, 1, "#a8783e")
  box(P, 2, h - 12, 18, 5, "#c9a16a"); box(P, 0, h - 8, 22, 6, "#e6c892"); P.r(1, h - 7, 20, 1, "#fff0c8")
  return P.c
}
function tapestry(w: number, h: number, a: string, b: string): HTMLCanvasElement {
  const P = pen(w, h)
  P.r(0, 0, w, 2, "#3a2010"); P.r(0, 0, w, 1, GOLD)
  box(P, 1, 2, w - 2, h - 5, a, "#3a2010")
  P.r(3, 4, w - 6, h - 9, b); P.r(4, 5, w - 8, h - 11, a)
  const cx = w / 2, cy = h / 2 + 1
  P.poly([[cx, cy - 13], [cx + 9, cy], [cx, cy + 13], [cx - 9, cy]], b); P.poly([[cx, cy - 9], [cx + 6, cy], [cx, cy + 9], [cx - 6, cy]], a); P.poly([[cx, cy - 4], [cx + 3, cy], [cx, cy + 4], [cx - 3, cy]], GOLD)
  for (let y = 7; y < h - 8; y += 5) { P.p(7, y, GOLD); P.p(w - 8, y, GOLD) }
  for (let x = 2; x < w - 2; x += 3) { P.r(x, h - 3, 1, 3, GOLD) }
  return P.c
}
function rug(g: Ctx, x: number, y: number, w: number, h: number, a = "#8e2a22", b = "#e8c860", c = TEAL) {
  g.fillStyle = "#2a0e08"; g.fillRect(x - 1, y - 1, w + 2, h + 2)
  g.fillStyle = a; g.fillRect(x, y, w, h)
  g.fillStyle = b; g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + h - 3, w - 4, 1); g.fillRect(x + 2, y + 2, 1, h - 4); g.fillRect(x + w - 3, y + 2, 1, h - 4)
  g.fillStyle = c; g.fillRect(x + 4, y + 4, w - 8, 2); g.fillRect(x + 4, y + h - 6, w - 8, 2)
  for (let k = 5; k < w - 5; k += 6) { g.fillStyle = b; g.fillRect(x + k, y + 4, 2, 2); g.fillRect(x + k, y + h - 6, 2, 2) }
  g.fillStyle = shade(a, -0.3); g.fillRect(x + 7, y + 8, w - 14, h - 16)
  const cx = x + w / 2, cy = y + h / 2
  g.fillStyle = b
  g.beginPath(); g.moveTo(cx, cy - h / 2 + 10); g.lineTo(cx + Math.min(24, w / 3), cy); g.lineTo(cx, cy + h / 2 - 10); g.lineTo(cx - Math.min(24, w / 3), cy); g.closePath(); g.fill()
  g.fillStyle = c; g.beginPath(); g.moveTo(cx, cy - h / 2 + 14); g.lineTo(cx + Math.min(18, w / 4), cy); g.lineTo(cx, cy + h / 2 - 14); g.lineTo(cx - Math.min(18, w / 4), cy); g.closePath(); g.fill()
  g.fillStyle = a; g.fillRect(cx - 3, cy - 3, 6, 6); g.fillStyle = b; g.fillRect(cx - 1, cy - 1, 2, 2)
  g.fillStyle = b; for (let k = 0; k < w; k += 3) { g.fillRect(x + k, y - 3, 1, 3); g.fillRect(x + k, y + h, 1, 3) }
}
function brazier(): HTMLCanvasElement {
  return strip(20, 40, 4, (P, f) => {
    shadow(P, 3, 37, 14)
    P.r(9, 22, 3, 14, "#3a3a44"); P.r(4, 34, 12, 2, "#3a3a44"); P.p(4, 33, "#3a3a44"); P.p(15, 33, "#3a3a44")
    P.poly([[2, 16], [18, 16], [14, 24], [6, 24]], "#2a2a34"); P.r(2, 15, 16, 2, "#6a6a7a"); P.r(3, 15, 14, 1, "#a8a8b8")
    flame(P, 10, 15, 11, 14, f)
    for (let i = 0; i < 3; i++) P.p(5 + ((f * 3 + i * 5) % 11), 4 - ((f + i) % 4), "#ffd45a")
  })
}
function scrollBoard(title: string, lines: { l: string; r: string }[], w: number, h: number): HTMLCanvasElement {
  const P = pen(w, h)
  P.r(0, 0, w, 3, "#3a2010"); P.r(0, 0, w, 1, GOLD); box(P, 1, 3, w - 2, h - 8, "#f0dcaa", "#5a3a1c")
  P.r(2, 4, w - 4, 1, "#fff6d8")
  box(P, 0, h - 5, w, 5, "#5a3a1c", "#2a1608"); P.r(1, h - 4, w - 2, 1, GOLD)
  drawText(P.x, title, Math.round((w - textW(title)) / 2), 7, "#6a2a14")
  P.r(6, 16, w - 12, 1, "#b5683a")
  lines.forEach((ln, i) => { drawMicro(P.x, ln.l, 7, 20 + i * 8, "#3a2010"); drawMicro(P.x, ln.r, w - 7 - microW(ln.r), 20 + i * 8, "#8a3a1c"); P.r(7, 26 + i * 8, w - 14, 1, "rgba(120,80,30,.3)") })
  return P.c
}
function plaqueSign(text: string, w: number, col = "#6a2a14"): HTMLCanvasElement {
  const P = pen(w, 14)
  box(P, 0, 0, w, 14, "#e8c860", "#3a2010"); P.r(1, 1, w - 2, 1, "#fff3b0"); P.r(2, 11, w - 4, 1, "#b88a2a")
  const f = fitTitle(text, w - 8)
  if (f.micro) drawMicro(P.x, f.s, Math.round((w - f.w) / 2), 5, col); else drawText(P.x, f.s, Math.round((w - f.w) / 2), 3, col)
  return P.c
}
function rack(label: string, accent: string, n: number): HTMLCanvasElement {
  const W = 52, H = 58
  const P = pen(W, H)
  shadow(P, 1, H - 2, W - 2)
  box(P, 0, 0, W, H - 3, "#5a3a1c", "#2a1608"); P.r(1, 1, W - 2, 1, "#9a6a3c")
  P.r(3, 12, W - 6, H - 18, "#2a1608")
  for (let y = 15; y < H - 8; y += 6) for (let x = 6; x < W - 6; x += 8) P.p(x, y, "#4a2f18")
  box(P, 3, 2, W - 6, 9, "#1a0c06", accent)
  const f = fitTitle(label, W - 14)
  if (f.micro) drawMicro(P.x, f.s, Math.round((W - f.w) / 2), 4, "#f6dfae"); else drawText(P.x, f.s, Math.round((W - f.w) / 2), 3, "#f6dfae")
  P.r(3, 34, W - 6, 2, "#7a5230"); P.r(3, 48, W - 6, 2, "#7a5230")
  const kinds = ["hammer", "tongs", "sword", "axe", "saw", "pick", "knife", "tongs", "hammer"]
  for (let i = 0; i < Math.min(n, 6); i++) {
    const row = i < 3 ? 0 : 1, x = 8 + (i % 3) * 14, y = row === 0 ? 14 : 38
    const t = kinds[i % kinds.length], H2 = 19
    if (t === "hammer") { P.r(x + 4, y + 5, 3, H2 - 5, "#9a6a3c"); P.r(x + 5, y + 5, 1, H2 - 5, "#c8905a"); box(P, x, y, 11, 6, "#a8a8b8"); P.r(x + 1, y + 1, 9, 1, "#e8e8f4") }
    else if (t === "tongs") { P.line(x + 2, y, x + 6, y + H2, "#8a8a9a", 2); P.line(x + 10, y, x + 6, y + H2, "#6a6a7a", 2); P.r(x + 5, y + 11, 3, 2, "#c8c8d8") }
    else if (t === "sword") { box(P, x + 4, y, 4, 14, "#d8d8e8"); P.r(x + 5, y + 1, 1, 12, "#fff"); box(P, x, y + 13, 12, 3, "#c9a14a"); P.r(x + 5, y + 16, 3, 4, "#7a3a1c") }
    else if (t === "axe") { P.r(x + 4, y, 3, H2, "#9a6a3c"); P.poly([[x + 6, y + 1], [x + 12, y + 3], [x + 12, y + 9], [x + 6, y + 10]], "#b8b8c8"); P.r(x + 7, y + 3, 4, 1, "#fff") }
    else if (t === "saw") { box(P, x, y + 2, 12, 6, "#b8b8c8"); for (let k = 0; k < 12; k += 2) P.p(x + k, y + 8, "#8a8a9a"); box(P, x + 8, y + 7, 4, 10, "#9a6a3c") }
    else if (t === "pick") { P.r(x + 5, y, 3, H2, "#9a6a3c"); P.line(x, y + 3, x + 12, y + 3, "#a8a8b8", 3); P.r(x + 5, y + 2, 3, 3, "#d8d8e8") }
    else { P.r(x + 5, y, 2, 12, "#d8d8e8"); P.r(x + 5, y + 12, 3, 7, "#7a3a1c"); P.r(x + 3, y + 11, 7, 2, "#c9a14a") }
  }
  P.r(0, H - 5, W, 2, "#2a1608")
  return P.c
}
const kilnStrip = () => strip(56, 62, 4, (P, f) => {
  shadow(P, 2, 59, 52)
  box(P, 2, 20, 52, 38, "#b5683a"); P.r(3, 21, 50, 1, "#e8a070")
  for (let y = 24; y < 56; y += 6) for (let x = 4 + ((y / 6) % 2) * 5; x < 50; x += 10) P.r(x, y, 9, 5, (x + y) % 3 ? "#a85a30" : "#c47848")
  P.poly([[10, 20], [46, 20], [40, 4], [16, 4]], "#9a4a28"); box(P, 22, 0, 12, 8, "#6a3a1c"); P.r(24, 1, 8, 1, "#c47848")
  // glowing mouth
  box(P, 14, 32, 28, 24, "#1a0a06"); P.r(16, 34, 24, 20, "#5a1a08")
  P.x.fillStyle = "rgba(255,120,30,.55)"; P.x.fillRect(16, 34, 24, 20)
  flame(P, 28, 54, 20, 18, f); flame(P, 21, 54, 10, 10, f + 1); flame(P, 35, 54, 10, 12, f + 2)
  P.r(14, 55, 28, 1, "#ffb040")
  for (let i = 0; i < 3; i++) P.p(20 + ((f * 5 + i * 7) % 18), 26 - ((f + i) % 3), "#ffd45a")
  box(P, 20, 28, 16, 4, "#3a2010"); P.r(21, 29, 14, 1, "#7a5230")
})
function anvil(): HTMLCanvasElement {
  const P = pen(30, 26)
  shadow(P, 3, 23, 24)
  box(P, 8, 15, 14, 8, "#5a5a68"); P.r(9, 16, 12, 1, "#8a8a98"); box(P, 5, 10, 22, 6, "#6a6a78"); P.r(6, 11, 20, 1, "#b8b8c8"); P.poly([[27, 10], [30, 12], [27, 15]], "#6a6a78")
  box(P, 11, 3, 4, 7, "#7a5230"); P.r(8, 2, 10, 3, "#8a8a98")
  return P.c
}
function bellows(): HTMLCanvasElement {
  const P = pen(26, 22)
  shadow(P, 2, 19, 22)
  P.poly([[2, 4], [18, 8], [18, 16], [2, 15]], INK); P.poly([[3, 5], [17, 9], [17, 15], [3, 14]], "#8a5a30"); for (let x = 5; x < 17; x += 3) P.line(x, 6 + (x / 4) | 0, x, 14, "#5a3a1c")
  P.r(18, 10, 7, 3, "#5a5a68"); P.r(0, 2, 4, 14, "#5a3a1c"); P.line(1, 2, 6, -1, "#5a3a1c", 2)
  return P.c
}
function barrel(col = "#7a5230"): HTMLCanvasElement {
  const P = pen(18, 22)
  shadow(P, 1, 20, 16)
  box(P, 1, 3, 16, 17, col); P.r(2, 4, 3, 15, shade(col, 0.3)); P.r(1, 7, 16, 2, "#3a3a44"); P.r(1, 15, 16, 2, "#3a3a44"); P.ell(9, 3, 8, 2, shade(col, -0.2)); P.r(3, 3, 12, 1, "#5ac4e0")
  return P.c
}
function coalPile(): HTMLCanvasElement {
  const P = pen(24, 14)
  P.ell(12, 9, 11, 4, "rgba(0,0,0,.3)")
  P.ell(12, 7, 10, 5, "#1a1a20"); P.ell(11, 5, 7, 3, "#2a2a32"); for (const [x, y] of [[6, 6], [12, 3], [16, 7], [9, 8]]) P.p(x, y, "#ff8a2a")
  return P.c
}
const telescope = () => {
  const P = pen(34, 64)
  shadow(P, 2, 61, 30)
  P.line(17, 40, 5, 60, "#5a3a1c", 3); P.line(17, 40, 29, 60, "#5a3a1c", 3); P.line(17, 40, 17, 61, "#7a5230", 2)
  P.line(8, 38, 26, 6, INK, 8); P.line(8, 38, 26, 6, "#c98a2a", 6); P.line(8, 37, 26, 5, "#f4d27a", 2)
  P.disc(26, 6, 5, INK); P.disc(26, 6, 4, "#e8b84a"); P.disc(26, 6, 2, "#6ad0f0"); P.p(25, 5, "#fff")
  for (let t = 0.2; t < 1; t += 0.28) P.disc(8 + (26 - 8) * t, 38 + (6 - 38) * t, 3, "#8a5a1a")
  box(P, 13, 36, 8, 7, "#8a5a1a"); P.r(14, 37, 6, 1, "#f4d27a")
  return P.c
}
const orreryStrip = () => strip(44, 44, 8, (P, f) => {
  shadow(P, 4, 41, 36)
  box(P, 15, 36, 14, 5, "#6a4a2a"); P.r(16, 37, 12, 1, "#b88a4a"); P.r(21, 22, 2, 14, "#c98a2a")
  const cx = 22, cy = 20
  P.disc(cx, cy, 4, INK); P.disc(cx, cy, 3, "#ffd45a"); P.p(cx - 1, cy - 1, "#fff6c0")
  const rings: [number, number, string, number][] = [[10, 4, "#6ad0f0", 0], [16, 6, "#e8805a", 2.1], [21, 8, "#b48cff", 4.2]]
  rings.forEach(([rx, ry, col, ph], i) => {
    P.x.strokeStyle = "rgba(244,210,122,.55)"; P.x.beginPath(); P.x.ellipse(cx + 0.5, cy + 0.5, rx, ry, 0, 0, 7); P.x.stroke()
    const a = ph + (f / 8) * Math.PI * 2 * (i % 2 ? -1 : 1) * (1 + i * 0.3)
    const px = Math.round(cx + Math.cos(a) * rx), py = Math.round(cy + Math.sin(a) * ry)
    P.disc(px, py, i === 1 ? 2 : 1, INK); P.disc(px, py, i === 1 ? 1 : 1, col)
  })
  P.r(20, 36, 4, 1, GOLD)
})
function starChart(): HTMLCanvasElement {
  const P = pen(38, 46)
  P.r(0, 0, 38, 3, "#3a2010"); P.r(0, 0, 38, 1, GOLD); box(P, 1, 3, 36, 38, "#14123a", "#5a3a1c"); box(P, 0, 40, 38, 5, "#3a2010", "#2a1608")
  const stars: [number, number][] = [[8, 12], [14, 8], [20, 14], [26, 9], [31, 16], [12, 22], [22, 26], [30, 30], [10, 32]]
  P.x.strokeStyle = "rgba(244,210,122,.55)"; P.x.beginPath(); stars.forEach(([x, y], i) => i ? P.x.lineTo(x + 0.5, y + 0.5) : P.x.moveTo(x + 0.5, y + 0.5)); P.x.stroke()
  stars.forEach(([x, y], i) => { P.p(x, y, "#fff4cf"); if (i % 3 === 0) { P.p(x - 1, y, "#ffd45a"); P.p(x + 1, y, "#ffd45a"); P.p(x, y - 1, "#ffd45a"); P.p(x, y + 1, "#ffd45a") } })
  P.x.strokeStyle = "rgba(106,208,240,.5)"; P.x.beginPath(); P.x.arc(19.5, 21.5, 14, 0, 7); P.x.stroke()
  return P.c
}
function honourShelf(n: number): HTMLCanvasElement {
  const W = 78, H = 66
  const P = pen(W, H)
  shadow(P, 1, H - 2, W - 2)
  box(P, 0, 0, W, H - 3, "#8a5a30"); P.r(1, 1, W - 2, 1, "#c8905a")
  for (let s = 0; s < 3; s++) {
    const y = 4 + s * 19
    P.r(3, y, W - 6, 17, "#2a1608"); P.r(3, y + 16, W - 6, 2, "#c8905a")
    for (let k = 0; k < 4; k++) {
      const i = s * 4 + k
      if (i >= n) continue
      const x = 9 + k * 17, by = y + 16
      if (i % 3 === 0) { P.r(x + 4, by - 3, 2, 3, "#8a5a1c"); P.r(x + 1, by - 10, 8, 7, GOLD); P.r(x + 2, by - 9, 2, 4, "#fff3b0"); P.r(x - 1, by - 9, 2, 4, GOLD); P.r(x + 8, by - 9, 2, 4, GOLD) }
      else if (i % 3 === 1) { P.r(x, by - 4, 10, 4, "#5a3a1c"); P.r(x + 2, by - 11, 6, 7, "#e8e0d0"); P.r(x + 3, by - 10, 4, 1, TERRA); P.r(x + 3, by - 8, 4, 1, TEAL); P.r(x + 4, by - 12, 2, 2, "#e8e0d0") }
      else { P.r(x + 1, by - 5, 8, 5, "#a8783e"); P.disc(x + 5, by - 9, 4, INK); P.disc(x + 5, by - 9, 3, "#d9dde8"); P.p(x + 4, by - 10, "#fff") }
    }
  }
  return P.c
}
const falconStrip = () => strip(24, 44, 4, (P, f) => {
  shadow(P, 4, 41, 16)
  P.r(11, 20, 2, 22, "#5a3a1c"); P.r(5, 40, 14, 2, "#5a3a1c"); box(P, 3, 17, 18, 3, "#7a5230"); P.r(4, 18, 16, 1, "#a8844a")
  // body
  P.ell(12, 11, 5, 7, INK); P.ell(12, 11, 4, 6, "#8a5a30"); P.ell(12, 13, 3, 4, "#f0dcb0"); P.r(10, 9, 1, 6, "#8a5a30"); P.r(13, 10, 1, 4, "#8a5a30")
  P.disc(12, 4, 3, INK); P.disc(12, 4, 2, "#8a5a30"); P.p(11, 3, f === 3 ? "#8a5a30" : "#1a1a1a"); P.p(13, 3, "#ffd45a"); P.poly([[14, 4], [17, 6], [14, 7]], "#e8c040")
  P.r(10, 17, 1, 2, "#e8c040"); P.r(14, 17, 1, 2, "#e8c040")
  const w = [0, 1, 0, -1][f]
  P.poly([[8, 7], [4 + w, 12], [6, 17], [8, 15]], "#6a4020"); P.poly([[16, 7], [20 - w, 12], [18, 17], [16, 15]], "#6a4020")
  P.r(11, 17, 3, 5, "#5a3a1c")
})
function cubbies(cols: number, rows: number): HTMLCanvasElement {
  const cw = 20, ch = 16, W = cols * cw + 4, H = rows * ch + 6
  const P = pen(W, H)
  box(P, 0, 0, W, H, "#c9a16a", "#3a2010"); P.r(1, 1, W - 2, 1, "#f4dba4")
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = 2 + c * cw, y = 3 + r * ch
    P.r(x, y, cw - 1, ch - 1, "#1a0c06"); P.r(x, y, cw - 1, 1, "#0a0502")
    const k = (c * 7 + r * 5) % 5
    for (let e = 0; e < (k % 3) + 1; e++) { const sx = x + 2 + e * 5; P.r(sx, y + 3 + (e % 2) * 2, 4, ch - 6, e % 2 ? "#e8d8a8" : "#f4e8c0"); P.r(sx, y + 3 + (e % 2) * 2, 4, 1, "#fff"); if (k > 1) P.r(sx + 1, y + 7, 2, 2, TERRA) }
    P.r(x, y + ch - 2, cw - 1, 1, "#8a5a30")
  }
  return P.c
}
function deskWax(w = 46): HTMLCanvasElement {
  const P = pen(w, 30)
  shadow(P, 2, 27, w - 4)
  box(P, 1, 12, w - 2, 5, "#9a6a3c"); P.r(2, 13, w - 4, 1, "#d4a06a")
  box(P, 3, 17, 5, 10, "#6a4a2a"); box(P, w - 8, 17, 5, 10, "#6a4a2a"); box(P, 10, 18, w - 20, 7, "#7a5230")
  box(P, 6, 7, 14, 6, "#f4e8c0", "#5a3a1c"); P.r(8, 9, 10, 1, "#b8a878"); P.r(8, 11, 7, 1, "#b8a878")
  P.line(26, 12, 31, 3, "#e8e0d0", 1); P.p(32, 2, "#e8e0d0"); box(P, 25, 10, 4, 3, "#2a2a34")
  P.disc(w - 12, 10, 3, TERRA); P.p(w - 13, 9, "#ffb090")
  return P.c
}
function scrollPile(): HTMLCanvasElement {
  const P = pen(24, 14)
  P.ell(12, 11, 10, 2, "rgba(0,0,0,.3)")
  for (let i = 0; i < 4; i++) { const x = 2 + i * 5, y = 3 + (i % 2) * 3; box(P, x, y, 8, 5, "#f0dcaa", "#5a3a1c"); P.r(x + 6, y + 1, 2, 3, "#e0c080") }
  P.r(8, 2, 8, 2, TERRA)
  return P.c
}
const parchmentSack = () => sack("#c8b080")
function tinyFace() { return pen(1, 1).c }
function zodiac(g: Ctx, cx: number, cy: number) {
  g.fillStyle = "#2a1a4a"; g.beginPath(); g.arc(cx, cy, 52, 0, 7); g.fill()
  g.strokeStyle = GOLD; g.lineWidth = 1
  for (const r of [50, 44, 30, 14]) { g.beginPath(); g.arc(cx + 0.5, cy + 0.5, r, 0, 7); g.stroke() }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); g.lineTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44); g.stroke()
    g.fillStyle = k % 2 ? "#6ad0f0" : "#e8805a"; g.fillRect(Math.round(cx + Math.cos(a + 0.26) * 37) - 1, Math.round(cy + Math.sin(a + 0.26) * 37) - 1, 3, 3)
  }
  g.fillStyle = "#e8c860"; g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx + 3, cy - 3); g.lineTo(cx + 10, cy); g.lineTo(cx + 3, cy + 3); g.lineTo(cx, cy + 10); g.lineTo(cx - 3, cy + 3); g.lineTo(cx - 10, cy); g.lineTo(cx - 3, cy - 3); g.fill()
  g.fillStyle = "rgba(255,255,255,.7)"; for (let k = 0; k < 20; k++) g.fillRect(cx - 40 + ((k * 37) % 80), cy - 38 + ((k * 53) % 76), 1, 1)
}

const folk = (id: string, name: string, sheet: string, x: number, y: number, extra: Parameters<typeof mkNpc>[3]) => mkNpc(id, x, y, { name, ...extra }, charSheet(sheet), charFace(sheet))
void tinyFace; void shrink

// ═══════════════════════════════════════════════════════════════
export function buildDesertInteriors(content: Portfolio): Record<string, Scene> {
  const out: Record<string, Scene> = {}
  const first = content.profile.name.split(" ")[0]
  const full = content.profile.name
  const lantern = (R: Room, cx: number, top = 12) => { R.wall(lanternStrip(), cx, top, { anim: { frames: 3, fps: 4, dx: 16 }, glow: undefined }); R.light(cx, top + 18, 64, "255,200,110", 1) }
  const torch = (R: Room, cx: number, top: number, r = 70) => { R.wall(torchStrip(), cx, top, { anim: { frames: 4, fps: 7, dx: 14 } }); R.light(cx, top + 10, r, "255,150,60", 1.4) }
  const arch = (R: Room, cx: number, seed: number, w = 36, h = 50) => R.wallLow(archWindow(w, h, seed), cx, 8)

  // ── CARAVANSERAI: the chief's courtyard hall ──────────────────
  {
    const R = makeRoom("desert:townhall", "Caravanserai", { w: 25, h: 15, wallH: 5, world: "desert", theme: sandTheme({ dark: 0.32 }) })
    const W = R.w * TS
    R.decal((g) => { rug(g, 6 * TS, 7 * TS - 4, 13 * TS, 6 * TS + 4, "#8e2a22", "#e8c860", TEAL); rug(g, 2 * TS, 8 * TS, 3 * TS + 8, 4 * TS, "#2a6a74", "#e8c860", TERRA); rug(g, 20 * TS + 8, 8 * TS, 3 * TS + 8, 4 * TS, "#2a6a74", "#e8c860", TERRA) })
    R.pool(W / 2, 9 * TS, 110, 40, "255,190,100", 0.14)
    arch(R, 3 * TS + 8, 3); arch(R, W - 3 * TS - 8, 8)
    R.wallLow(tapestry(60, 56, "#7a1f2a", "#e8c860"), W / 2, 6)
    R.wallLow(tapestry(30, 50, "#1f5a6a", "#e8c860"), 8 * TS, 8); R.wallLow(tapestry(30, 50, "#1f5a6a", "#e8c860"), W - 8 * TS, 8)
    lantern(R, 5.5 * TS); lantern(R, W - 5.5 * TS); lantern(R, W / 2 - 52, 14); lantern(R, W / 2 + 52, 14)
    for (const x of [5, 20]) { R.add(pillar(70), x * TS + 8, 7 * TS + 8, { solid: [14, 8] }) }
    R.add(rolledRugs(), 2 * TS + 4, 7 * TS - 2); R.add(crate(), 4 * TS + 2, 6 * TS + 6); R.add(amphora(), 1 * TS + 10, 6 * TS + 10)
    R.add(amphora(26), 22 * TS + 4, 6 * TS + 10); R.add(crate(20, 18), 23 * TS + 2, 7 * TS + 4); R.add(sack(), 21 * TS + 8, 6 * TS + 14)
    R.add(palmPot(), 1 * TS + 8, 12 * TS + 12); R.add(palmPot(), 23 * TS + 8, 12 * TS + 12)
    // the low table and cushions
    R.add(lowTable(), W / 2, 9 * TS + 10, { solid: [26, 10] })
    for (const [dx, dy, col] of [[-34, 2, TERRA], [34, 2, TEAL], [-22, 18, "#d9a83a"], [22, 18, "#8a3a6a"], [0, 20, TERRA]] as [number, number, string][]) R.add(cushion(col), W / 2 + dx, 9 * TS + 10 + dy, { solid: false })
    R.light(W / 2, 9 * TS, 120, "255,200,120", 0.8)
    for (const x of [8, 16]) { R.add(amphora(18, TERRA), x * TS + 8, 13 * TS + 8, { solid: [10, 6] }) }
    R.actors.push(folk("tariq", "Sheikh Tariq", "Noble", W / 2, 8 * TS + 6, {
      facing: "down",
      lines: [`Peace be upon you, traveller. Sit, sit.`, `${full} is ${content.profile.title.toLowerCase()} from ${content.profile.location}. ${content.profile.tagline}`, `${content.profile.now}`, `The ledger on the tapestry wall tells the rest.`],
      action: { type: "section", id: "townhall" },
    }))
    R.actors.push(folk("camel-boy", "Faris", "Boy", 18 * TS, 11 * TS, { wander: 20, bark: ["Ship fast, break things, fix faster. Says the tapestry.", "Mind the cushions!"] }))
    R.spot("ledger", W / 2, 10 * TS + 14, "READ THE CARAVAN LEDGER", { type: "section", id: "townhall" }, true, W / 2, 7 * TS + 4)
    out["desert:townhall"] = R.finish()
  }

  // ── HALL OF RELICS: torch-lit gallery of tablets ──────────────
  {
    const list = ordered(content.projects)
    const top = list.slice(0, 6), rest = list.slice(6)
    const PER = 6, NW = 7
    const rows = Math.max(1, Math.ceil(rest.length / PER))
    const w = 31, h = NW + 3 + rows * 5 + 4
    const R = makeRoom("desert:gallery", "Hall of Relics", { w, h, wallH: NW, world: "desert", theme: sandTheme({ dark: 0.58, tint: "26,10,2", wall: "#c99a60" }) })
    const W = w * TS
    R.decal((g) => { g.fillStyle = "#2a0e08"; g.fillRect(13 * TS, NW * TS, 5 * TS, (h - 1 - NW) * TS); g.fillStyle = "#8e2a22"; g.fillRect(13 * TS + 2, NW * TS, 5 * TS - 4, (h - 1 - NW) * TS); g.fillStyle = GOLD; g.fillRect(13 * TS + 4, NW * TS, 1, (h - 1 - NW) * TS); g.fillRect(18 * TS - 5, NW * TS, 1, (h - 1 - NW) * TS); g.fillStyle = TEAL; for (let y = NW * TS + 8; y < (h - 1) * TS; y += 24) { g.fillRect(15 * TS + 4, y, 8, 8); g.fillStyle = GOLD; g.fillRect(15 * TS + 7, y + 3, 2, 2); g.fillStyle = TEAL } })
    const span = W - 2 * TS, pitch = span / top.length
    top.forEach((p, i) => {
      const cx = TS + pitch * (i + 0.5)
      const st = stele(p, "great", 0.75)
      R.wallLow(st, cx, 2)
      R.light(cx, NW * TS - 44, 70, "255,196,110", 0.8)
      R.spot(`art-${p.id}`, cx, NW * TS + 14, `VIEW ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, cx, NW * TS - st.height - 12)
      if (i < top.length - 1) torch(R, cx + pitch / 2, NW * TS - 14 - 34 - 20, 74)
    })
    const podCols = [3, 7.4, 11.8, 19.2, 23.6, 28]
    rest.forEach((p, i) => {
      const row = Math.floor(i / PER), col = i % PER
      const cx = podCols[col] * TS + 8, base = (NW + 4 + row * 5) * TS + 8
      const st = stele(p, "tablet", 0.7)
      R.add(st, cx, base, { solid: [st.width - 14, 10] })
      R.light(cx, base - 30, 56, "255,196,110", 0.9)
      R.spot(`art-${p.id}`, cx, base + 14, `VIEW ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, cx, base - st.height - 8)
    })
    for (let r = 0; r < rows; r++) for (const x of [12.5, 17.5]) { R.add(brazier(), x * TS, (NW + 4 + r * 5) * TS + 14, { anim: { frames: 4, fps: 7, dx: 20 }, solid: [10, 6] }); R.light(x * TS, (NW + 4 + r * 5) * TS - 8, 80, "255,150,60", 1.5) }
    R.add(brazier(), 12.5 * TS, (NW + 1) * TS + 14, { anim: { frames: 4, fps: 7, dx: 20 }, solid: [10, 6] }); R.add(brazier(), 17.5 * TS, (NW + 1) * TS + 14, { anim: { frames: 4, fps: 7, dx: 20 }, solid: [10, 6] })
    R.light(12.5 * TS, (NW + 1) * TS - 8, 80, "255,150,60", 1.5); R.light(17.5 * TS, (NW + 1) * TS - 8, 80, "255,150,60", 1.5)
    for (const x of [1, 29]) { R.add(pillar(80), x * TS + 8, (NW + 3) * TS + 8, { solid: [14, 8] }); R.add(pillar(80), x * TS + 8, (h - 3) * TS + 8, { solid: [14, 8] }) }
    R.add(palmPot(), 15.5 * TS, (h - 2) * TS + 4, { solid: false })
    R.actors.push(folk("samira", "Keeper Samira", "Princess", 15 * TS + 8, (NW + 2) * TS + 6, {
      lines: [`Welcome to the Hall of Relics. Mind the torches.`, `Each tablet is one of ${first}'s projects, ${content.projects.length} in all, carved in relief.`, `The six great steles on the north wall are the headliners. Walk up to any tablet and press E.`],
      action: { type: "section", id: "gallery" },
    }))
    out["desert:gallery"] = R.finish()
  }

  // ── OASIS TEAHOUSE ────────────────────────────────────────────
  {
    const R = makeRoom("desert:tavern", "Oasis Teahouse", { w: 19, h: 14, wallH: 5, world: "desert", theme: sandTheme({ dark: 0.42, wall: "#c89a64" }) })
    const W = R.w * TS
    R.decal((g) => { rug(g, 5 * TS, 6 * TS + 4, 9 * TS, 5 * TS, "#2a5a64", "#e8c860", TERRA); rug(g, 1 * TS + 4, 9 * TS, 3 * TS, 3 * TS + 8, "#8e2a22", "#e8c860", TEAL); rug(g, 15 * TS + 4, 9 * TS, 3 * TS - 4, 3 * TS + 8, "#8e2a22", "#e8c860", TEAL) })
    R.pool(W / 2, 8 * TS + 8, 90, 40, "255,190,100", 0.15)
    arch(R, 3 * TS, 5, 34, 44); arch(R, W - 3 * TS, 11, 34, 44)
    const roles = content.experience.map((e) => ({ l: `${e.org}`.toUpperCase().slice(0, 12), r: `${e.start.slice(-4)}` }))
    const sb = scrollBoard("TALES OF QUESTS", roles, 104, 36 + roles.length * 8)
    R.wallLow(sb, W / 2, 6)
    // shelf of pots left of the board
    lantern(R, 1.6 * TS, 12); lantern(R, W - 1.6 * TS, 12); lantern(R, 5.3 * TS, 14); lantern(R, W - 5.3 * TS, 14)
    // tea counter
    const ct = pen(64, 28); shadow(ct, 1, 26, 62); box(ct, 0, 8, 64, 17, "#7a4a2a"); ct.r(1, 9, 62, 1, "#b88a4a"); box(ct, 0, 4, 64, 6, "#c9a14a"); ct.r(1, 5, 62, 1, "#fff3b0")
    for (let x = 6; x < 58; x += 12) { ct.r(x, 13, 8, 8, "#5a3a1c"); ct.r(x, 13, 8, 1, "#9a6a3c") }
    for (const x of [8, 20, 34, 48]) { ct.r(x, -0, 0, 0, "#000"); box(ct, x, 0, 6, 5, "#e8e0d0"); ct.r(x + 1, 1, 4, 1, "#fff") }
    R.add(ct.c, 3 * TS + 8, 7 * TS - 2, { solid: [60, 8] })
    R.light(3 * TS + 8, 6 * TS + 4, 70, "255,190,110", 0.8)
    // low tables with cushions
    const tbls: [number, number][] = [[3.5, 10], [15, 10], [4, 12.2], [14.8, 12.2]]
    tbls.forEach(([c, r], i) => {
      const cx = c * TS + 8, by = r * TS + 12
      R.add(lowTable(), cx, by, { solid: [24, 8] })
      R.add(cushion([TERRA, TEAL, "#d9a83a", "#8a3a6a"][i]), cx - 22, by + 2, { solid: false }); R.add(cushion([TEAL, TERRA, "#8a3a6a", "#d9a83a"][i]), cx + 22, by + 2, { solid: false })
      R.light(cx, by - 8, 44, "255,200,120", 0.6)
    })
    // storyteller on the central rug
    R.add(cushion("#7a1f2a", GOLD, 30), W / 2, 8 * TS + 8, { solid: false })
    for (const [dx, col] of [[-36, TEAL], [-14, TERRA], [14, "#d9a83a"], [36, "#8a3a6a"]] as [number, string][]) R.add(cushion(col), W / 2 + dx, 10 * TS + 8, { solid: false })
    R.light(W / 2, 8 * TS, 90, "255,196,120", 1.2)
    R.add(brazier(), 2 * TS + 4, 12 * TS + 6, { anim: { frames: 4, fps: 6, dx: 20 }, solid: [10, 6] }); R.light(2 * TS + 4, 11 * TS, 70, "255,150,60", 1.5)
    R.add(brazier(), W - 2 * TS - 4, 12 * TS + 6, { anim: { frames: 4, fps: 6, dx: 20 }, solid: [10, 6] }); R.light(W - 2 * TS - 4, 11 * TS, 70, "255,150,60", 1.5)
    R.add(palmPot(), W - 1 * TS - 8, 7 * TS + 8, { solid: [12, 6] })
    R.actors.push(folk("bashir", "Bashir the Storyteller", "OldMan2", W / 2, 8 * TS + 4, {
      lines: [`Ahh, sit! Sit! The tea is hot and the stories hotter.`, `Once upon a time ${first} was ${content.experience.map((e) => `${e.role} at ${e.org}`).join(", then ")}.`, `Barclays: GitLab CI/CD, Kubernetes and Helm. CSI-SPIT: CtrlFixIt for 120+ players at once. And the tale goes on, on the board behind me.`],
      action: { type: "section", id: "tavern" },
    }))
    R.actors.push(folk("listener", "Noor", "Child", W / 2 - 14, 10 * TS + 2, { facing: "up", bark: ["Tell the one about Vendex again!"] }))
    R.actors.push(folk("listener2", "Layla", "OldWoman", 14 * TS + 14, 10 * TS + 6, { facing: "left", bark: ["More tea, Bashir?"] }))
    R.spot("tales", W / 2, 6 * TS + 4, "READ THE TALES BOARD", { type: "section", id: "tavern" }, true, W / 2, 3 * TS - 6)
    out["desert:tavern"] = R.finish()
  }

  // ── SAND FORGE ────────────────────────────────────────────────
  {
    const groups = content.skills
    const NW = 5
    const R = makeRoom("desert:forge", "Sand Forge", { w: 25, h: 15, wallH: NW, world: "desert", theme: sandTheme({ floor: "dark", dark: 0.56, tint: "30,10,2", wall: "#a8683c", mortar: "#5a3018" }) })
    const W = R.w * TS
    R.decal((g) => { g.fillStyle = "rgba(20,8,2,.45)"; g.beginPath(); g.ellipse(4 * TS + 8, 8 * TS, 60, 26, 0, 0, 7); g.fill() })
    // the great kiln, mouth glowing
    R.add(kilnStrip(), 4 * TS + 8, NW * TS + 14, { anim: { frames: 4, fps: 8, dx: 56 }, solid: [50, 10] })
    R.light(4 * TS + 8, NW * TS - 6, 150, "255,120,40", 2); R.light(4 * TS + 8, 8 * TS, 100, "255,150,60", 1.5)
    R.pool(4 * TS + 8, NW * TS + 26, 70, 24, "255,130,40", 0.28)
    R.add(anvil(), 4 * TS + 8, 9 * TS + 4, { solid: [24, 8] })
    R.add(bellows(), 8 * TS + 2, NW * TS + 12, { solid: [22, 8] }); R.add(barrel(), 8 * TS + 4 + 24, NW * TS + 14, { solid: [14, 8] })
    R.add(coalPile(), 1 * TS + 6, 9 * TS + 6, { solid: false }); R.add(barrel("#6a4a30"), 1 * TS + 8, 6 * TS + 8, { solid: [14, 8] })
    R.add(crate(), 1 * TS + 8, 12 * TS + 6); R.add(sack("#9a8060"), 3 * TS + 4, 12 * TS + 8)
    R.add(amphora(20, "#8a4a2a"), 7 * TS + 4, 12 * TS + 8, { solid: [10, 6] })
    // tool racks: one per skill group, two rows
    const cols = 3
    groups.forEach((gr, i) => {
      const row = Math.floor(i / cols), col = i % cols
      const cx = 14 * TS + col * 3.4 * TS, by = (NW + 3 + row * 4) * TS + 4
      const acc = [TERRA, TEAL, "#d9a83a", "#8a3a6a", "#58c46a", "#e8805a"][i % 6]
      R.add(rack(gr.group.toUpperCase(), acc, Math.min(6, gr.items.length)), cx, by, { solid: [46, 8] })
      R.light(cx, by - 26, 46, "255,170,90", 0.8)
      R.spot(`skills-${i}`, cx, by + 14, `INSPECT ${gr.group.toUpperCase()}`, { type: "section", id: "forge", focus: gr.group }, true, cx, by - 56)
    })
    torch(R, 11 * TS, 6, 60); torch(R, W - 2 * TS, 6, 60)
    R.wall(plaqueSign("SAND FORGE", 70), 17 * TS, 8)
    R.add(barrel(), W - 1 * TS - 8, 13 * TS + 4, { solid: [14, 8] })
    R.light(W / 2, 11 * TS, 130, "255,170,100", 0.6)
    R.actors.push(folk("hadi", "Hadi the Smith", "Samurai", 6 * TS + 8, 8 * TS + 6, {
      facing: "right",
      lines: [`Mind the sparks! The kiln never sleeps.`, `The racks hold ${first}'s tools: ${groups.map((g) => g.group).join(", ")}.`, `Rust, TypeScript, Python, plus a pile of infra. He even published skrgrep to Homebrew.`],
      action: { type: "section", id: "forge" },
    }))
    out["desert:forge"] = R.finish()
  }

  // ── STAR OBSERVATORY ──────────────────────────────────────────
  {
    const NW = 6
    const R = makeRoom("desert:academy", "Star Observatory", { w: 21, h: 16, wallH: NW, world: "desert", theme: sandTheme({ floor: "mosaic", dark: 0.52, tint: "14,12,44", wall: "#b88c5c" }) })
    const W = R.w * TS
    const edu = content.education[0]
    const ach = content.achievements.filter((a) => a.kind === "hackathon")
    R.decal((g) => { zodiac(g, W / 2, 11 * TS) })
    R.pool(W / 2, 11 * TS, 70, 40, "130,170,255", 0.14)
    arch(R, 2 * TS + 10, 4, 30, 54); arch(R, W - 2 * TS - 10, 9, 30, 54)
    R.wallLow(archWindow(60, 66, 6), W / 2, 6)
    R.wallLow(starChart(), 7.2 * TS, 6); R.wallLow(starChart(), W - 7.2 * TS, 6)
    lantern(R, 5 * TS, 8); lantern(R, W - 5 * TS, 8)
    R.add(telescope(), W / 2 - 40, (NW + 3) * TS + 6, { solid: [18, 8] })
    R.light(W / 2 - 34, (NW + 1) * TS, 100, "130,190,255", 0.6)
    R.add(orreryStrip(), W / 2 + 36, (NW + 3) * TS + 4, { anim: { frames: 8, fps: 5, dx: 44 }, solid: [26, 8] })
    R.light(W / 2 + 36, (NW + 2) * TS, 70, "255,220,140", 0.8)
    R.add(honourShelf(Math.min(12, ach.length + 3)), 16 * TS + 8, 15 * TS + 4, { solid: [74, 10] })
    R.light(16 * TS + 8, 13 * TS, 100, "255,220,150", 0.7)
    R.add(deskWax(50), 4 * TS + 8, 14 * TS + 6, { solid: [46, 8] })
    R.add(scrollPile(), 6.5 * TS, 14 * TS + 2, { solid: false })
    R.add(cushion("#2a5a8a"), 8.5 * TS, 11 * TS + 8, { solid: false }); R.add(cushion(TERRA), 12.5 * TS, 11 * TS + 10, { solid: false })
    R.add(palmPot(), 1 * TS + 8, 8 * TS + 8, { solid: [12, 6] }); R.add(palmPot(), W - 1 * TS - 8, 8 * TS + 8, { solid: [12, 6] })
    R.add(brazier(), 3 * TS, 12 * TS, { anim: { frames: 4, fps: 6, dx: 20 }, solid: [10, 6] }); R.light(3 * TS, 11 * TS - 4, 70, "255,150,60", 1.5)
    R.actors.push(folk("zuleika", "Zuleika the Stargazer", "SorcererOrange", W / 2 - 4, (NW + 5) * TS, {
      lines: [`Shhh. The stars keep a ledger too.`, `${first} studies ${edu.degree} ${edu.field} at SPIT in ${edu.place}. ${edu.note}`, `Honours on the shelves: ${ach.slice(0, 4).map((a) => a.title).join("; ")}, and more.`],
      action: { type: "section", id: "academy" },
    }))
    R.spot("chart", W / 2, (NW + 6) * TS + 8, "STUDY THE STAR CHARTS", { type: "section", id: "academy" }, true, W / 2, (NW + 2) * TS - 6)
    R.spot("trophies", 16 * TS + 8, 15 * TS + 12, "VIEW HONOURS", { type: "section", id: "academy", focus: "honours" }, true, 16 * TS + 8, 11 * TS + 4)
    out["desert:academy"] = R.finish()
  }

  // ── FALCON POST ───────────────────────────────────────────────
  {
    const NW = 5
    const R = makeRoom("desert:wizard", "Falcon Post", { w: 19, h: 14, wallH: NW, world: "desert", theme: sandTheme({ dark: 0.38, wall: "#d0a266" }) })
    const W = R.w * TS
    R.decal((g) => { rug(g, 6 * TS, 8 * TS, 7 * TS, 4 * TS, "#2a5a64", "#e8c860", TERRA) })
    R.pool(W / 2, 10 * TS, 90, 30, "255,200,120", 0.13)
    arch(R, 2 * TS + 8, 2, 30, 42); arch(R, W - 2 * TS - 8, 7, 30, 42)
    R.wallLow(cubbies(7, 2), W / 2, 6)
    lantern(R, 6 * TS - 4, 6); lantern(R, W - 6 * TS + 4, 6)
    // perches
    ;[[4, 8.2], [8, 7.4], [11, 7.6], [15, 8.4]].forEach(([c, r], i) => { R.add(falconStrip(), c * TS + 8, r * TS + 12, { anim: { frames: 4, fps: 1.4 + i * 0.3, dx: 24 }, solid: [10, 6] }) })
    R.add(deskWax(50), 5 * TS, 6 * TS + 4, { solid: [46, 8] }); R.add(scrollPile(), 8 * TS, 6 * TS + 2, { solid: false })
    R.add(parchmentSack(), 2 * TS + 4, 6 * TS + 8, { solid: [12, 6] }); R.add(parchmentSack(), 3 * TS + 2, 7 * TS + 4, { solid: [12, 6] }); R.add(crate(), 16 * TS + 4, 6 * TS + 8)
    R.add(amphora(20, TEAL), 17 * TS + 4, 12 * TS + 6, { solid: [10, 6] }); R.add(palmPot(), 1 * TS + 8, 12 * TS + 8, { solid: [12, 6] })
    R.add(cushion(TERRA), 12 * TS + 4, 11 * TS + 8, { solid: false }); R.add(cushion(TEAL), 6 * TS, 11 * TS + 10, { solid: false })
    R.light(W / 2, 9 * TS, 120, "255,200,120", 0.7); R.light(5 * TS, 6 * TS, 70, "255,190,110", 0.8)
    R.actors.push(folk("yasmin", "Yasmin the Falconer", "Cavegirl", 6 * TS + 8, 5 * TS + 12, {
      lines: [`My falcons never lose a letter.`, `Want to reach ${first}? Write to ${content.socials.email}. ${content.profile.availability}.`, `Tell me what to write, and the falcon flies.`],
      action: { type: "section", id: "wizard" },
    }))
    R.spot("falcon-letter", 6 * TS + 8, 7 * TS + 8, "WRITE A LETTER", { type: "section", id: "wizard" }, true, 6 * TS + 8, 3 * TS + 12)
    R.spot("perch", 11 * TS + 8, 8 * TS + 10, "SEND A FALCON", { type: "section", id: "wizard" }, true, 11 * TS + 8, 5 * TS + 4)
    out["desert:wizard"] = R.finish()
  }

  void wrapMicro; void palOf
  return out
}

export const DESERT_INTERIOR_PRELOAD = [
  ...["Noble", "Boy", "Princess", "OldMan2", "Child", "OldWoman", "Samurai", "SorcererOrange", "Cavegirl"].flatMap((n) => [charSheet(n), charFace(n)]),
  ...["/exhibits/frame-stone.png", "/exhibits/frame-stone-b.png"],
]
