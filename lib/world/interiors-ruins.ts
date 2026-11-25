// Hollow Reach interiors: six cold rooms behind the landmark doors. Darkness, strong local light, drifting motes.
import type { Portfolio } from "@/lib/content"
import { charSheet, charFace, RUINS_CHARS } from "@/lib/na"
import { drawText, drawMicro, fitTitle, textW, microW, ordered, memoryPane, memoryTome } from "./exhibits"
import { TS, canvas, type Scene, type Sprite } from "./core"
import { makeRoom, npc as mkNpc, pen, shadow, shade, strip, type Theme, type Room, type Pen } from "./interiors-kit"

type Ctx = CanvasRenderingContext2D
const INK = "#080c18"
const TEAL = "#5fd0a0", VIOLET = "#9a7be0", ICE = "#8fe8ff", CANDLE = "#ffb54a"

function coldTheme(o: { wall?: string; floor?: "stone" | "wood" | "slate"; dark?: number; tint?: string; trim?: string } = {}): Theme {
  const wall = o.wall ?? "#3c4a5e", fl = o.floor ?? "stone", trim = o.trim ?? TEAL
  return {
    bg: "#04060d", dark: o.dark ?? 0.6, music: "ruins",
    lighting: { tint: o.tint ?? "4,8,30", glow: 0.34, holeStrength: 0.85, heroRadius: 64, radiusScale: 1 },
    floor: (g, x, y, c, r) => {
      if (fl === "wood") {
        g.fillStyle = (r % 2) ? "#4a3626" : "#523c2a"; g.fillRect(x, y, TS, TS)
        g.fillStyle = "#2c1f14"; g.fillRect(x, y + 7, TS, 1); g.fillRect(x, y + 15, TS, 1)
        g.fillStyle = "rgba(255,200,140,.12)"; g.fillRect(x, y, TS, 1); g.fillRect(x, y + 8, TS, 1)
        g.fillStyle = "#2c1f14"; g.fillRect(x + ((c * 7 + r * 5) % 12) + 2, y, 1, 7); g.fillRect(x + ((c * 3 + r * 11) % 12) + 2, y + 8, 1, 7)
        return
      }
      const a = (c * 5 + r * 3) % 3
      g.fillStyle = fl === "slate" ? (a ? "#2c3446" : "#323b50") : (a ? "#3a4256" : "#424a60"); g.fillRect(x, y, TS, TS)
      g.fillStyle = "rgba(180,220,255,.10)"; g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS)
      g.fillStyle = "rgba(0,0,10,.5)"; g.fillRect(x + 15, y, 1, TS); g.fillRect(x, y + 15, TS, 1)
      const k = (c * 11 + r * 7) % 11
      if (k === 0) { g.fillStyle = "rgba(0,0,10,.5)"; g.fillRect(x + 3, y + 5, 6, 1); g.fillRect(x + 8, y + 6, 4, 1); g.fillRect(x + 11, y + 7, 1, 4) }
      if (k === 2) { g.fillStyle = "rgba(60,140,100,.45)"; g.fillRect(x + 1, y + 1, 5, 2); g.fillRect(x + 1, y + 3, 2, 2) }
      if (k === 5) { g.fillStyle = "rgba(60,140,100,.35)"; g.fillRect(x + 10, y + 10, 5, 3) }
    },
    back: (g, w, h) => {
      g.fillStyle = wall; g.fillRect(0, 0, w, h)
      for (let y = 0; y < h - 16; y += 12) {
        const off = (y / 12) % 2 ? 12 : 0
        g.fillStyle = "#0a0f1c"; g.fillRect(0, y, w, 1)
        for (let x = off; x < w; x += 24) { g.fillStyle = "#0a0f1c"; g.fillRect(x, y, 1, 12); g.fillStyle = ((x * 7 + y) % 5 < 2) ? "rgba(190,225,255,.09)" : "rgba(0,0,20,.10)"; g.fillRect(x + 1, y + 1, 23, 11) }
      }
      // moss climbing the wall
      for (let x = 0; x < w; x += 6) { const mh = 4 + ((x * 13) % 14); g.fillStyle = "rgba(50,130,90,.55)"; g.fillRect(x, 10, 5, mh); g.fillStyle = "rgba(90,190,130,.4)"; g.fillRect(x + 1, 10, 2, mh - 2) }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(0,0,12,.65)"); gr.addColorStop(0.6, "rgba(0,0,12,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h)
      g.fillStyle = "#06091a"; g.fillRect(0, 0, w, 8)
      for (let x = 4; x < w; x += 14) { g.fillStyle = trim; g.fillRect(x, 3, 1, 3); g.fillRect(x + 3, 2, 1, 4); g.fillRect(x, 4, 4, 1); g.fillStyle = "rgba(95,208,160,.35)"; g.fillRect(x - 1, 2, 7, 5) }
      g.fillStyle = shade(wall, -0.45); g.fillRect(0, h - 16, w, 16)
      g.fillStyle = "#0a0f1c"; g.fillRect(0, h - 17, w, 1); g.fillStyle = "rgba(190,225,255,.25)"; g.fillRect(0, h - 16, w, 1)
      for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(0,0,10,.4)"; g.fillRect(x + 15, h - 14, 1, 12); g.fillStyle = "rgba(190,225,255,.07)"; g.fillRect(x + 2, h - 13, 10, 8) }
      g.fillStyle = "#04060d"; g.fillRect(0, h - 3, w, 3)
    },
    side: (g, x, y) => { g.fillStyle = shade(wall, -0.5); g.fillRect(x, y, TS, TS); g.fillStyle = "rgba(0,0,10,.5)"; g.fillRect(x, y + 7, TS, 1); g.fillRect(x + 7, y, 1, 8); g.fillRect(x + 3, y + 8, 1, 8); g.fillStyle = "rgba(190,225,255,.10)"; g.fillRect(x + 8, y + 1, 7, 6) },
    front: (g, x, y) => { g.fillStyle = shade(wall, -0.5); g.fillRect(x, y, TS, TS); g.fillStyle = "#04060d"; g.fillRect(x, y, TS, 3); g.fillStyle = "rgba(190,225,255,.2)"; g.fillRect(x, y + 4, TS, 1); g.fillStyle = "rgba(50,130,90,.4)"; g.fillRect(x + 2, y + 5, 4, 3) },
    mat: ["#14223a", TEAL],
  }
}

const box = (P: Pen, x: number, y: number, w: number, h: number, fill: string, line = INK) => P.box(x, y, w, h, fill, line)

// ── props ───────────────────────────────────────────────────────
function mistWindow(w: number, h: number, seed: number): HTMLCanvasElement {
  const P = pen(w, h), r = w / 2
  const inside = (x: number, y: number) => y >= r ? true : Math.hypot(x - r + 0.5, y - r) <= r
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) P.p(x, y, INK)
  for (let y = 1; y < h; y++) for (let x = 1; x < w - 1; x++) if (inside(x, y) && (y >= r || Math.hypot(x - r + 0.5, y - r) <= r - 1)) P.p(x, y, "#5a6a84")
  for (let y = 3; y < h - 2; y++) for (let x = 3; x < w - 3; x++) {
    if (!(y >= r || Math.hypot(x - r + 0.5, y - r) <= r - 3)) continue
    const t = (y - 3) / (h - 6)
    P.p(x, y, t < 0.5 ? "#0a1230" : t < 0.8 ? "#1a2c5a" : "#2c4a78")
  }
  const mx = Math.round(w * 0.62), my = Math.round(h * 0.3)
  P.disc(mx, my, 5, "rgba(190,230,255,.25)"); P.disc(mx, my, 3, "#e8f6ff"); P.p(mx - 1, my - 1, "#fff")
  for (let i = 0; i < 6; i++) P.p(4 + ((seed * 13 + i * 11) % (w - 8)), 4 + ((seed * 7 + i * 5) % Math.max(4, (h * 0.35) | 0)), "#cfe8ff")
  P.x.fillStyle = "rgba(190,225,240,.22)"; P.x.fillRect(3, h - 14, w - 6, 5); P.x.fillStyle = "rgba(190,225,240,.14)"; P.x.fillRect(3, h - 20, w - 6, 4)
  P.r(Math.floor(w / 2), 4, 1, h - 6, "#2a3448"); for (let y = 9; y < h - 4; y += 9) P.r(3, y, w - 6, 1, "#2a3448")
  P.r(0, h - 3, w, 3, "#4a5870"); P.r(0, h - 3, w, 1, "#9ab0c8")
  P.x.fillStyle = "rgba(60,140,100,.6)"; P.x.fillRect(1, h - 6, 5, 3); P.x.fillRect(w - 7, 4 + r, 4, 6)
  return P.c
}
const hearthStrip = (cold: boolean) => strip(72, 62, 4, (P, f) => {
  shadow(P, 2, 59, 68)
  box(P, 2, 8, 68, 50, "#59657c"); P.r(3, 9, 66, 1, "#9aaac4")
  for (let y = 12; y < 56; y += 8) for (let x = 4 + ((y / 8) % 2) * 6; x < 68; x += 12) P.r(x, y, 11, 7, (x + y) % 3 ? "#4a566c" : "#66728a")
  box(P, 0, 4, 72, 8, "#6a7690"); P.r(1, 5, 70, 1, "#b8c8e0")
  box(P, 14, 22, 44, 36, "#05070e"); P.r(16, 24, 40, 32, "#0b0f1c")
  if (cold) {
    P.r(20, 52, 32, 4, "#2a3040"); P.r(24, 50, 24, 3, "#3a4258")
    P.line(22, 52, 36, 46, "#4a3a2a", 3); P.line(50, 52, 36, 46, "#3a2c20", 3)
    for (let i = 0; i < 3; i++) { const ex = 26 + ((f * 7 + i * 9) % 22); P.p(ex, 52 - (i % 2), i === f % 3 ? "#6ad8ff" : "#2a5a78") }
    P.x.fillStyle = "rgba(100,200,255,.05)"; P.x.fillRect(16, 24, 40, 32)
  } else {
    P.r(20, 52, 32, 4, "#3a2a20"); P.line(22, 52, 36, 46, "#5a3a20", 3); P.line(50, 52, 36, 46, "#4a2c18", 3)
    const fx = (cx: number, w: number, h: number, ff: number) => { P.poly([[cx - w / 2, 52], [cx - w / 2 + 1, 52 - h * 0.5], [cx + [0, 1, 0, -1][ff % 4], 52 - h - [0, 2, 1, 3][ff % 4]], [cx + w / 2 - 1, 52 - h * 0.5], [cx + w / 2, 52]], "#d8481a"); P.poly([[cx - w / 3, 52], [cx, 52 - h * 0.8], [cx + w / 3, 52]], "#ff9a2a"); P.poly([[cx - w / 6, 52], [cx, 52 - h * 0.45], [cx + w / 6, 52]], "#ffe27a") }
    fx(36, 18, 20, f); fx(28, 9, 11, f + 1); fx(44, 9, 12, f + 2)
    P.x.fillStyle = "rgba(255,120,30,.25)"; P.x.fillRect(16, 24, 40, 32)
  }
  P.r(12, 18, 48, 4, "#47536a"); P.r(12, 18, 48, 1, "#8a9ab4")
})
function ghostPortrait(seed: number, cap: string): HTMLCanvasElement {
  const W = 30, H = 42
  const P = pen(W, H)
  box(P, 0, 0, W, 34, "#2a2030", INK); P.r(1, 1, W - 2, 1, "#8a7a9a"); P.r(1, 1, 1, 32, "#5a4a6a")
  P.r(3, 3, W - 6, 28, "#0c1424"); P.x.fillStyle = "rgba(95,208,160,.12)"; P.x.fillRect(3, 3, W - 6, 28)
  const col = ["#bfeee0", "#cfd8ff", "#e8d8ff", "#ffe8c8"][seed % 4]
  P.ell(15, 15, 6, 8, "rgba(160,255,230,.22)")
  P.ell(15, 15, 5, 7, col); P.r(9, 10, 12, 3, shade(col, 0.4))
  P.r(11, 14, 3, 3, "#0c1424"); P.r(17, 14, 3, 3, "#0c1424"); P.p(12, 15, "#7fffd4"); P.p(18, 15, "#7fffd4"); P.r(14, 20, 3, 2, "#0c1424")
  P.poly([[4, 31], [7, 25], [12, 22], [19, 22], [24, 25], [27, 31]], shade(col, -0.35)); P.r(13, 22, 5, 3, shade(col, -0.1))
  if (seed % 2) { P.r(9, 8, 12, 2, "#8a7a9a"); P.r(10, 6, 10, 2, "#5a4a6a") } else { P.r(10, 7, 10, 3, "#2a2a4a") }
  box(P, 3, 35, W - 6, 7, "#8a7a9a", INK)
  drawMicro(P.x, cap, Math.round((W - microW(cap)) / 2), 37, "#14102a")
  return P.c
}
const candleStrip = (n = 3) => strip(16, 24, 3, (P, f) => {
  P.ell(8, 22, 6, 2, "rgba(0,0,0,.3)")
  box(P, 6, 10, 4, 12, "#e8dcc0"); P.r(7, 11, 1, 9, "#fff6e0")
  for (let i = 0; i < n - 1; i++) { box(P, 1 + i * 11, 14, 3, 8, "#d8ccb0"); P.r(2 + i * 11, 15, 1, 6, "#fff6e0") }
  const fl = [0, 1, 0][f]
  for (const cx of [8, ...(n > 1 ? [2, 14] : [])]) { P.poly([[cx - 1, 10], [cx, 5 - fl], [cx + 1, 10]], "#ffb54a"); P.p(cx, 8, "#fff6c0") }
  P.x.fillStyle = "rgba(255,180,70,.14)"; P.x.fillRect(0, 2, 16, 16)
})
const blueBrazier = () => strip(20, 40, 4, (P, f) => {
  shadow(P, 3, 37, 14)
  P.r(9, 22, 3, 14, "#3a4254"); P.r(4, 34, 12, 2, "#3a4254")
  P.poly([[2, 16], [18, 16], [14, 24], [6, 24]], "#2a3040"); P.r(2, 15, 16, 2, "#7a8aa4"); P.r(3, 15, 14, 1, "#b8c8e0")
  const sway = [0, 1, 0, -1][f], tall = [0, 2, 1, 3][f]
  P.poly([[5, 15], [6, 10], [10 + sway, 1 - tall], [14, 10], [15, 15]], "#1e6ed8"); P.poly([[7, 15], [10 + sway, 3 - tall], [13, 15]], "#4ab4ff"); P.poly([[9, 15], [10 + sway, 8], [11, 15]], "#d8f6ff")
  for (let i = 0; i < 3; i++) P.p(5 + ((f * 3 + i * 5) % 11), 5 - ((f + i) % 4), "#a8e8ff")
})
function jar(accent: string, h = 22): HTMLCanvasElement {
  return strip(14, h, 4, (P, f) => {
    shadow(P, 2, h - 2, 10)
    P.ell(7, h - 9, 6, 8, "rgba(120,200,255,.3)"); P.ell(7, h - 9, 5, 7, "#143048"); P.ell(7, h - 9, 4, 6, "#1c4a64")
    const bob = [0, -1, 0, 1][f]
    P.disc(7, h - 10 + bob, 3, shade(accent, 0.3)); P.disc(7, h - 10 + bob, 2, "#ffffff"); P.p(5, h - 13 + bob, "#fff")
    P.r(4, 1, 6, 3, "#6a4a30"); P.r(4, 1, 6, 1, "#a8784a"); P.r(5, 4, 4, 3, "#2a4a60")
    P.r(3, h - 14, 1, 6, "rgba(255,255,255,.5)")
  })
}
function stoneTable(w = 70): HTMLCanvasElement {
  const P = pen(w, 28)
  shadow(P, 2, 25, w - 4)
  box(P, 3, 12, 6, 12, "#4a566c"); box(P, w - 9, 12, 6, 12, "#4a566c")
  box(P, 0, 6, w, 8, "#6a7690"); P.r(1, 7, w - 2, 1, "#b8c8e0"); P.r(0, 14, w, 2, "#2a3244")
  // cloth runner
  P.r(8, 6, w - 16, 3, "#5a2a4a"); P.r(8, 6, w - 16, 1, "#9a5a8a")
  return P.c
}
function woodTable(): HTMLCanvasElement {
  const P = pen(28, 24)
  shadow(P, 3, 21, 22)
  P.r(12, 12, 4, 9, "#3a2818"); box(P, 8, 19, 12, 2, "#3a2818")
  P.ell(14, 9, 12, 5, INK); P.ell(14, 8, 11, 4, "#7a5230"); P.r(7, 6, 6, 1, "#b88a58")
  box(P, 12, 3, 4, 6, "#e8dcc0"); P.poly([[13, 3], [14, 0], [15, 3]], "#ffb54a")
  return P.c
}
function stool(): HTMLCanvasElement {
  const P = pen(12, 14)
  shadow(P, 2, 12, 8)
  P.r(5, 6, 2, 6, "#3a2818"); P.r(2, 11, 8, 1, "#3a2818"); P.ell(6, 5, 5, 3, INK); P.ell(6, 4, 4, 2, "#7a5230"); P.r(3, 3, 3, 1, "#b88a58")
  return P.c
}
function bar(w: number): HTMLCanvasElement {
  const P = pen(w, 28)
  shadow(P, 1, 26, w - 2)
  box(P, 0, 8, w, 16, "#5a3a22"); P.r(1, 9, w - 2, 1, "#9a6a3c")
  for (let x = 6; x < w - 4; x += 14) { P.r(x, 13, 10, 8, "#3a2412"); P.r(x, 13, 10, 1, "#7a5230") }
  box(P, 0, 4, w, 6, "#8a5a30"); P.r(1, 5, w - 2, 1, "#d4a06a")
  for (const x of [10, 26, 50]) { box(P, x, 0, 5, 5, "#c8a050"); P.r(x + 1, 1, 3, 1, "#fff0b0") }
  return P.c
}
function barrel(): HTMLCanvasElement {
  const P = pen(18, 22)
  shadow(P, 1, 20, 16)
  box(P, 1, 3, 16, 17, "#5a3a22"); P.r(2, 4, 3, 15, "#8a5a30"); P.r(1, 7, 16, 2, "#2a2a34"); P.r(1, 15, 16, 2, "#2a2a34"); P.ell(9, 3, 8, 2, "#3a2412")
  return P.c
}
function board(title: string, lines: { l: string; r: string }[], w: number, h: number): HTMLCanvasElement {
  const P = pen(w, h)
  box(P, 0, 0, w, h, "#4a3220", INK); P.r(1, 1, w - 2, 1, "#8a5a30")
  P.r(3, 3, w - 6, h - 6, "#6a4a30")
  drawText(P.x, title, Math.round((w - textW(title)) / 2), 6, "#ffe9a8", "#2a1a10")
  P.r(7, 15, w - 14, 1, "#2a1a10")
  lines.forEach((ln, i) => {
    const y = 19 + i * 11
    box(P, 6, y - 2, w - 12, 9, "#e8dcc0", "#2a1a10")
    drawMicro(P.x, ln.l, 8, y + 1, "#3a2410"); drawMicro(P.x, ln.r, w - 8 - microW(ln.r), y + 1, "#8a3a1c")
  })
  P.p(4, 4, "#c0c0d0"); P.p(w - 5, 4, "#c0c0d0")
  return P.c
}
function plate(text: string, w: number, col = TEAL): HTMLCanvasElement {
  const P = pen(w, 14)
  box(P, 0, 0, w, 14, "#0a1020", col); P.r(1, 1, w - 2, 1, "rgba(255,255,255,.18)")
  const f = fitTitle(text, w - 8)
  if (f.micro) drawMicro(P.x, f.s, Math.round((w - f.w) / 2), 5, col); else drawText(P.x, f.s, Math.round((w - f.w) / 2), 3, col)
  return P.c
}
function bookcase(w = 36, h = 64, seed = 1): HTMLCanvasElement {
  const P = pen(w, h)
  shadow(P, 1, h - 2, w - 2)
  box(P, 0, 0, w, h - 2, "#3a2818"); P.r(1, 1, w - 2, 1, "#6a4a2c")
  const rows = 4, rh = Math.floor((h - 6) / rows)
  const cols = ["#7a2a3a", "#2a4a6a", "#6a5a2a", "#2a5a4a", "#4a3a6a", "#8a8a7a", "#6a3a1a"]
  for (let r = 0; r < rows; r++) {
    const y = 3 + r * rh
    P.r(2, y, w - 4, rh - 1, "#0a0c14")
    let x = 3, k = seed + r * 3
    while (x < w - 5) {
      if ((k * 7) % 9 === 0) { x += 3; k++; continue }
      const bw = 2 + (k * 5 % 3), bh = rh - 4 - (k * 7 % 4)
      P.r(x, y + rh - 2 - bh, bw, bh, cols[(k * 3 + r) % cols.length]); P.r(x, y + rh - 2 - bh, 1, bh, "rgba(255,255,255,.18)")
      x += bw; k++
    }
    P.r(2, y + rh - 1, w - 4, 1, "#5a4028")
    // cobweb in the corner
    P.x.fillStyle = "rgba(220,230,255,.35)"; P.x.fillRect(w - 8, y, 5, 1); P.x.fillRect(w - 6, y + 1, 3, 1); P.x.fillRect(w - 5, y + 2, 2, 1)
  }
  return P.c
}
const floatBooks = (seed: number) => strip(24, 30, 6, (P, f) => {
  const cols = ["#7a2a3a", "#2a4a8a", "#8a7a2a", "#2a7a5a", "#6a4a9a"]
  const b = (x: number, y: number, c: string, open = false) => {
    if (open) { P.poly([[x, y + 4], [x + 6, y + 2], [x + 12, y + 4], [x + 12, y + 10], [x + 6, y + 8], [x, y + 10]], "#e8dcc0"); P.r(x + 6, y + 2, 1, 6, "#8a7a5a"); P.r(x + 1, y + 5, 4, 1, "#8a7a5a"); P.r(x + 8, y + 5, 3, 1, "#8a7a5a") }
    else { box(P, x, y, 11, 7, c); P.r(x + 1, y + 1, 9, 1, "rgba(255,255,255,.3)"); P.r(x + 1, y + 4, 9, 1, "#e8dcc0") }
  }
  const t = (f / 6) * Math.PI * 2
  b(2, 18 + Math.round(Math.sin(t + seed) * 2), cols[seed % 5])
  b(11, 8 + Math.round(Math.sin(t + 2 + seed) * 2), cols[(seed + 2) % 5], true)
  b(5, 1 + Math.round(Math.sin(t + 4 + seed) * 2), cols[(seed + 3) % 5])
  for (let i = 0; i < 3; i++) P.p(3 + ((f * 5 + i * 9) % 18), 26 - ((f * 2 + i * 3) % 24), "#a8f0e0")
  P.x.fillStyle = "rgba(120,255,220,.10)"; P.x.fillRect(0, 0, 24, 30)
})
function readingDesk(): HTMLCanvasElement {
  const P = pen(44, 34)
  shadow(P, 2, 31, 40)
  box(P, 2, 14, 40, 6, "#6a4a2c"); P.r(3, 15, 38, 1, "#a8784a")
  box(P, 4, 20, 5, 11, "#4a3220"); box(P, 35, 20, 5, 11, "#4a3220")
  box(P, 8, 8, 14, 7, "#e8dcc0", "#2a1a10"); P.r(15, 8, 1, 7, "#8a7a5a"); P.r(10, 10, 4, 1, "#8a7a5a"); P.r(17, 10, 4, 1, "#8a7a5a")
  // lantern
  P.r(31, 6, 8, 1, "#3a3a44"); box(P, 32, 7, 6, 8, "#3a3a44"); P.r(33, 8, 4, 6, "#ffd45a"); P.r(34, 9, 2, 4, "#fff6c0"); P.r(34, 4, 2, 3, "#3a3a44")
  P.x.fillStyle = "rgba(255,200,90,.16)"; P.x.fillRect(26, 0, 18, 22)
  return P.c
}
const lanternStrip = () => strip(16, 26, 3, (P, f) => {
  P.r(7, 0, 2, 5, "#3a4254"); P.poly([[4, 5], [11, 5], [13, 9], [2, 9]], "#3a4254"); P.r(3, 9, 10, 9, "#3a4254")
  P.r(4, 10, 8, 7, ["#7ae8c8", "#9af2d8", "#6ad8b8"][f]); P.r(5, 11, 6, 5, "#e8fff6"); P.r(7, 10, 1, 7, "#3a4254"); P.r(4, 13, 8, 1, "#3a4254")
  P.poly([[3, 18], [12, 18], [10, 22], [5, 22]], "#3a4254"); P.r(7, 22, 2, 3, "#7a8aa4")
  P.x.fillStyle = "rgba(120,255,210,.14)"; P.x.fillRect(0, 7, 16, 14)
})
const whisperLantern = () => strip(40, 72, 6, (P, f) => {
  shadow(P, 4, 69, 32)
  box(P, 11, 52, 18, 16, "#4a566c"); P.r(12, 53, 16, 1, "#9aaac4"); box(P, 7, 64, 26, 6, "#59657c"); P.r(8, 65, 24, 1, "#b8c8e0")
  P.r(18, 44, 4, 9, "#3a4254")
  const t = f / 6, pul = Math.round(Math.sin(t * Math.PI * 2) * 2)
  P.x.fillStyle = "rgba(120,255,210,.12)"; P.x.beginPath(); P.x.arc(20, 30, 20 + pul, 0, 7); P.x.fill()
  P.x.fillStyle = "rgba(120,255,210,.14)"; P.x.beginPath(); P.x.arc(20, 30, 14 + pul, 0, 7); P.x.fill()
  P.poly([[10, 18], [30, 18], [34, 26], [6, 26]], "#3a4254"); box(P, 8, 25, 24, 20, "#3a4254")
  P.r(10, 27, 20, 16, "#58d8b4"); P.r(12, 29, 16, 12, "#b8ffe8"); P.disc(20, 35, 4 + (pul > 0 ? 1 : 0), "#ffffff")
  P.r(19, 27, 2, 16, "#3a4254"); P.r(10, 34, 20, 2, "#3a4254")
  P.r(18, 8, 4, 10, "#3a4254"); P.disc(20, 8, 3, "#3a4254"); P.p(20, 7, "#9aaac4")
  for (let i = 0; i < 4; i++) P.p(6 + ((f * 7 + i * 11) % 28), 24 - ((f * 3 + i * 5) % 22), "#c8fff0")
})
function whisperHorn(): HTMLCanvasElement {
  const P = pen(24, 30)
  shadow(P, 2, 27, 20)
  P.r(11, 14, 3, 13, "#3a4254"); P.r(6, 25, 13, 2, "#3a4254")
  P.poly([[2, 6], [14, 2], [22, 8], [22, 14], [14, 12], [2, 12]], "#8a6a3a"); P.poly([[3, 7], [14, 3], [21, 8], [14, 11], [3, 11]], "#c8a05a"); P.r(3, 8, 12, 1, "#f0d080"); P.ell(4, 9, 2, 3, "#2a1a10")
  return P.c
}
function mailRack(cols: number, rows: number): HTMLCanvasElement {
  const cw = 18, ch = 14, W = cols * cw + 4, H = rows * ch + 4
  const P = pen(W, H)
  box(P, 0, 0, W, H, "#3a2818"); P.r(1, 1, W - 2, 1, "#6a4a2c")
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = 2 + c * cw, y = 2 + r * ch
    P.r(x, y, cw - 1, ch - 1, "#080a12")
    const k = (c * 5 + r * 3) % 5
    if (k < 3) { for (let e = 0; e <= k; e++) { P.r(x + 2 + e * 4, y + 3 + (e % 2), 4, ch - 5 - (e % 2), e % 2 ? "#cfd8c8" : "#e8e0c8"); P.r(x + 2 + e * 4, y + 3 + (e % 2), 4, 1, "#fff") } if (k === 2) P.r(x + 3, y + 5, 3, 2, "#7ae8c8") }
    P.r(x, y + ch - 2, cw - 1, 1, "#5a4028")
  }
  return P.c
}
function banner(col: string, w = 22, h = 44): HTMLCanvasElement {
  const P = pen(w, h)
  P.r(0, 0, w, 3, "#2a2a34"); P.r(1, 0, w - 2, 1, "#7a8aa4")
  P.poly([[1, 3], [w - 1, 3], [w - 1, h - 10], [w - 4, h - 6], [w / 2, h - 12], [4, h - 5], [1, h - 10]], col)
  P.poly([[4, 6], [w - 4, 6], [w - 4, h - 16], [w / 2, h - 20], [4, h - 14]], shade(col, -0.25))
  P.r(w / 2 - 1, 12, 2, 12, "#9a8a6a"); P.r(w / 2 - 4, 16, 8, 2, "#9a8a6a")
  for (let y = 5; y < h - 8; y += 4) P.p(2 + (y % 3), y, "rgba(0,0,0,.35)")
  return P.c
}
function plant(): HTMLCanvasElement {
  const P = pen(20, 30)
  shadow(P, 3, 27, 14)
  box(P, 5, 18, 10, 9, "#4a566c"); P.r(6, 19, 8, 1, "#9aaac4")
  for (const [dx, dy] of [[-6, -6], [6, -6], [-3, -12], [3, -12], [0, -14]] as [number, number][]) { P.line(10, 18, 10 + dx, 18 + dy + 4, "#1a4a3a", 2); P.line(10, 18, 10 + dx, 18 + dy + 3, "#3a9a7a", 1) }
  for (const [x, y] of [[5, 6], [14, 8], [9, 3]]) P.p(x, y, "#a8ffe0")
  return P.c
}
function coffinRack(): HTMLCanvasElement {
  const P = pen(34, 46)
  shadow(P, 1, 43, 32)
  box(P, 0, 4, 34, 38, "#59657c"); P.r(1, 5, 32, 1, "#9aaac4")
  for (let i = 0; i < 2; i++) { const y = 8 + i * 17; box(P, 4, y, 26, 13, "#0a0f1c"); P.r(6, y + 2, 22, 9, "#141c30"); box(P, 8, y + 4, 18, 5, "#3a2818", "#080c18"); P.r(9, y + 5, 16, 1, "#6a4a2c") }
  box(P, 14, 0, 6, 4, "#6a7690")
  return P.c
}
function skull(): HTMLCanvasElement {
  const P = pen(14, 14)
  P.ell(7, 6, 5, 5, INK); P.ell(7, 6, 4, 4, "#dcd8c8"); P.r(5, 9, 4, 3, "#dcd8c8"); P.r(5, 5, 2, 2, "#080c18"); P.r(8, 5, 2, 2, "#080c18"); P.p(7, 8, "#080c18")
  return P.c
}
function cobweb(g: Ctx, x: number, y: number, flip: boolean) {
  g.strokeStyle = "rgba(220,235,255,.4)"; g.lineWidth = 1
  const s = flip ? -1 : 1
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * (6 + k * 4), y + (3 - k) * 4 + 2); g.stroke() }
  for (const r of [6, 11, 16]) { g.beginPath(); g.arc(x, y, r, flip ? Math.PI * 0.05 : Math.PI * 0.5, flip ? Math.PI * 0.5 : Math.PI * 0.95); g.stroke() }
}
function rugCold(g: Ctx, x: number, y: number, w: number, h: number, a = "#3a2a5a", b = "#9a7be0") {
  g.fillStyle = "#06081a"; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = a; g.fillRect(x, y, w, h)
  g.fillStyle = b; g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + h - 3, w - 4, 1); g.fillRect(x + 2, y + 2, 1, h - 4); g.fillRect(x + w - 3, y + 2, 1, h - 4)
  g.fillStyle = shade(a, -0.3); g.fillRect(x + 6, y + 6, w - 12, h - 12)
  const cx = x + w / 2, cy = y + h / 2
  g.fillStyle = b; g.beginPath(); g.moveTo(cx, cy - 8); g.lineTo(cx + 8, cy); g.lineTo(cx, cy + 8); g.lineTo(cx - 8, cy); g.closePath(); g.fill()
  g.fillStyle = a; g.fillRect(cx - 2, cy - 2, 4, 4)
  g.fillStyle = "rgba(0,0,0,.3)"; for (let k = 0; k < w; k += 5) { g.fillRect(x + k, y - 2, 1, 2); g.fillRect(x + k, y + h, 1, 2) }
}

const folk = (id: string, name: string, sheet: string, x: number, y: number, extra: Parameters<typeof mkNpc>[3]) => mkNpc(id, x, y, { name, ...extra }, charSheet(sheet), charFace(sheet))

// drifting motes, updated each frame by the scene's tick
function addMotes(R: Room, n: number, area: [number, number, number, number], col = "#a8f0e0") {
  const dots: { s: Sprite; x: number; y: number; p: number; sp: number }[] = []
  const { c, ctx } = canvas(6, 6)
  ctx.fillStyle = "rgba(200,255,240,.25)"; ctx.fillRect(0, 0, 6, 6); ctx.fillStyle = col; ctx.fillRect(2, 2, 2, 2); ctx.fillStyle = "#fff"; ctx.fillRect(2, 2, 1, 1)
  for (let i = 0; i < n; i++) {
    const x = area[0] + ((i * 97) % 1000) / 1000 * (area[2] - area[0]), y = area[1] + ((i * 61) % 1000) / 1000 * (area[3] - area[1])
    const s: Sprite = { kind: "sprite", src: c, rect: [0, 0, 6, 6], x, y, baseY: y + 40, dynamic: true }
    R.sprites.push(s); dots.push({ s, x, y, p: i * 1.7, sp: 0.3 + (i % 5) * 0.08 })
  }
  return (t: number) => { for (const d of dots) { d.s.x = d.x + Math.sin(t * d.sp + d.p) * 10; d.s.y = d.y + Math.cos(t * d.sp * 0.8 + d.p) * 6 - ((t * 3 + d.p * 5) % 16); d.s.baseY = d.s.y + 60 } }
}

// ═══════════════════════════════════════════════════════════════
export function buildRuinsInteriors(content: Portfolio): Record<string, Scene> {
  const out: Record<string, Scene> = {}
  const first = content.profile.name.split(" ")[0]
  const full = content.profile.name
  const lantern = (R: Room, cx: number, top = 12) => { R.wall(lanternStrip(), cx, top, { anim: { frames: 3, fps: 3, dx: 16 } }); R.light(cx, top + 18, 64, "120,255,210", 0.8) }
  const arch = (R: Room, cx: number, seed: number, w = 34, h = 48) => R.wallLow(mistWindow(w, h, seed), cx, 8)
  const brazier = (R: Room, cx: number, base: number, r = 78) => { R.add(blueBrazier(), cx, base, { anim: { frames: 4, fps: 7, dx: 20 }, solid: [10, 6] }); R.light(cx, base - 20, r, "90,170,255", 1.4) }
  const withTick = (R: Room, ...ticks: ((t: number) => void)[]) => R.finish({ tick: (t) => { for (const f of ticks) f(t) } })

  // ── ELDER'S HALL ──────────────────────────────────────────────
  {
    const R = makeRoom("ruins:townhall", "Elder's Hall", { w: 23, h: 15, wallH: 5, world: "ruins", theme: coldTheme({ dark: 0.6 }) })
    const W = R.w * TS
    R.decal((g) => { rugCold(g, 8 * TS, 7 * TS, 7 * TS, 5 * TS + 8); cobweb(g, TS, 5 * TS, false); cobweb(g, W - TS, 5 * TS, true); cobweb(g, TS, 13 * TS, false) })
    R.pool(W / 2, 9 * TS, 90, 40, "120,150,255", 0.1)
    // the cold hearth, ash and dead logs
    R.add(hearthStrip(true), W / 2, 5 * TS + 14, { anim: { frames: 4, fps: 3, dx: 72 }, solid: [64, 8] })
    R.light(W / 2, 5 * TS - 4, 90, "110,170,255", 0.5)
    // ancestral portraits
    const names = ["ELDER", "WREN", "ASH", "MOSS", "ROOK", "HOLLOW"]
    ;[5.3, 7.2, 15.8, 17.7].forEach((c, i) => { R.wallLow(ghostPortrait(i, names[i]), c * TS, 6); R.light(c * TS, 3 * TS + 8, 34, "130,255,215", 0.4) })
    R.wall(banner("#4a2a5a"), 2.4 * TS, 4); R.wall(banner("#2a4a5a"), W - 2.4 * TS, 4)
    arch(R, 1.6 * TS + 4, 3, 26, 40); arch(R, W - 1.6 * TS - 4, 8, 26, 40)
    lantern(R, 10.4 * TS, 10); lantern(R, W - 10.4 * TS, 10)
    // long table with candle
    R.add(stoneTable(80), W / 2, 10 * TS + 4, { solid: [76, 10] })
    R.add(candleStrip(3), W / 2 - 14, 10 * TS - 8, { anim: { frames: 3, fps: 5, dx: 16 }, solid: false }); R.light(W / 2 - 14, 10 * TS - 14, 70, "255,180,80", 1)
    for (const dx of [-30, 30]) R.add(stool(), W / 2 + dx, 11 * TS + 12, { solid: false })
    R.add(plant(), 1 * TS + 8, 8 * TS + 12); R.add(plant(), W - 1 * TS - 8, 8 * TS + 12)
    R.add(coffinRack(), 3 * TS + 8, 10 * TS + 8, { solid: [30, 8] })
    R.add(skull(), W - 3 * TS - 8, 10 * TS + 4, { solid: false })
    brazier(R, 6 * TS, 13 * TS + 4); brazier(R, W - 6 * TS, 13 * TS + 4)
    R.actors.push(folk("wren", "Elder Wren", RUINS_CHARS.elder, W / 2 + 2, 8 * TS + 6, {
      lines: [`Welcome to the Elder's Hall. Mind the hearth, it has been cold since before you were born.`, `${full}: ${content.profile.title}, out of ${content.profile.location}. ${content.profile.tagline}`, `${content.profile.availability}. The portraits behind me are the ones who came before.`],
      action: { type: "section", id: "townhall" },
    }))
    R.actors.push(folk("wisp-a", "Wisp", RUINS_CHARS.ghost, 17 * TS, 9 * TS, { wander: 40, bark: ["Boo. ...Sorry, reflex.", "The portraits blink when you aren't looking."] }))
    R.spot("hearth", W / 2, 8 * TS, "READ THE ELDER'S RECORD", { type: "section", id: "townhall" }, true, W / 2, 5 * TS - 14)
    const m = addMotes(R, 14, [TS * 2, TS * 6, W - TS * 2, TS * 13])
    out["ruins:townhall"] = withTick(R, m)
  }

  // ── MEMORY VAULT ──────────────────────────────────────────────
  {
    const list = ordered(content.projects)
    const top = list.slice(0, 6), rest = list.slice(6)
    const PER = 6, NW = 6
    const rows = Math.max(1, Math.ceil(rest.length / PER))
    const w = 31, h = NW + 7 + rows * 5 + 3
    const R = makeRoom("ruins:gallery", "Memory Vault", { w, h, wallH: NW, world: "ruins", theme: coldTheme({ dark: 0.7, wall: "#323e52", floor: "slate", tint: "2,6,28" }) })
    const W = w * TS
    R.decal((g) => { g.fillStyle = "#0a1020"; g.fillRect(13 * TS, NW * TS, 5 * TS, (h - 1 - NW) * TS); g.fillStyle = "#16284a"; g.fillRect(13 * TS + 2, NW * TS, 5 * TS - 4, (h - 1 - NW) * TS); g.fillStyle = "rgba(120,255,210,.5)"; g.fillRect(13 * TS + 4, NW * TS, 1, (h - 1 - NW) * TS); g.fillRect(18 * TS - 5, NW * TS, 1, (h - 1 - NW) * TS); for (let y = NW * TS + 10; y < (h - 1) * TS; y += 26) { g.fillStyle = "rgba(120,255,210,.35)"; g.fillRect(15 * TS + 5, y, 6, 6); g.fillStyle = "#0a1020"; g.fillRect(15 * TS + 7, y + 2, 2, 2) } })
    // crypt niches along the north wall with skulls and glowing jars
    R.wall(plate("MEMORY VAULT", 84, VIOLET), W / 2, 12)
    for (let i = 0; i < 8; i++) { const cx = 2.5 * TS + i * 3.4 * TS + (i > 3 ? 4.6 * TS : 0); if (cx > 12.4 * TS && cx < 18.8 * TS) continue; R.wallLow(skull(), cx, 6) }
    const span = W - 2 * TS, pitch = span / top.length
    const ticks: ((t: number) => void)[] = []
    top.forEach((p, i) => {
      const cx = TS + pitch * (i + 0.5)
      const m = memoryPane(p, 4, 0.92)
      R.add(m.cv, cx, (NW + 4) * TS, { anim: { frames: 4, fps: 4, dx: m.w }, solid: [34, 8] })
      R.light(cx, (NW + 2) * TS, 78, "130,255,225", 0.9); R.pool(cx, (NW + 4) * TS + 4, 40, 10, "120,255,220", 0.22)
      R.spot(`art-${p.id}`, cx, (NW + 4) * TS + 14, `RECALL ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, cx, (NW + 4) * TS - m.h - 8)
    })
    const podCols = [3, 7.4, 11.8, 19.2, 23.6, 28]
    rest.forEach((p, i) => {
      const row = Math.floor(i / PER), col = i % PER
      const cx = podCols[col] * TS + 8, base = (NW + 8 + row * 5) * TS
      const m = memoryTome(p, 3, 1)
      R.add(m.cv, cx, base, { anim: { frames: 3, fps: 3, dx: m.w }, solid: [26, 8] })
      R.light(cx, base - 24, 50, "140,220,255", 0.9)
      R.spot(`art-${p.id}`, cx, base + 14, `RECALL ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, cx, base - m.h - 6)
    })
    for (const x of [12.5, 17.5]) for (let r = 0; r <= rows; r++) brazier(R, x * TS, (NW + 3 + r * 5) * TS + 12, 76)
    for (const x of [1, 29]) { R.add(jar(VIOLET, 22), x * TS + 8, (NW + 2) * TS + 8, { anim: { frames: 4, fps: 3, dx: 14 }, solid: [10, 6] }); R.light(x * TS + 8, (NW + 2) * TS - 2, 40, "170,150,255", 0.8) }
    R.add(plant(), 15.5 * TS, (h - 2) * TS, { solid: false })
    R.actors.push(folk("hobb", "Gravekeeper Hobb", RUINS_CHARS.gravekeeper, 15 * TS + 8, (NW + 2) * TS + 4, {
      lines: [`I keep the Memory Vault. ${content.projects.length} projects, all well-behaved.`, `The big glowing panes are the headliners: ${top.map((p) => p.title).join(", ")}.`, `Walk up to any memory and press E to recall it.`],
      action: { type: "section", id: "gallery" },
    }))
    ticks.push(addMotes(R, 24, [TS * 2, TS * (NW + 1), W - TS * 2, TS * (h - 2)], "#a8f0e0"))
    out["ruins:gallery"] = withTick(R, ...ticks)
  }

  // ── THE LAST LANTERN: a cosy inn ──────────────────────────────
  {
    const R = makeRoom("ruins:tavern", "The Last Lantern", { w: 21, h: 14, wallH: 5, world: "ruins", theme: coldTheme({ floor: "wood", wall: "#4a4252", dark: 0.52, tint: "26,12,10", trim: CANDLE }) })
    const W = R.w * TS
    R.decal((g) => { rugCold(g, 6 * TS, 8 * TS, 9 * TS, 4 * TS + 8, "#5a2a2a", "#e8b050") })
    R.pool(W / 2, 9 * TS, 120, 50, "255,170,80", 0.16)
    R.add(hearthStrip(false), 4 * TS, 5 * TS + 14, { anim: { frames: 4, fps: 7, dx: 72 }, solid: [64, 8] })
    R.light(4 * TS, 5 * TS - 4, 150, "255,140,50", 1.6); R.pool(4 * TS, 7 * TS, 64, 22, "255,130,40", 0.22)
    arch(R, W - 3 * TS, 4, 30, 42)
    const roles = content.experience.map((e) => ({ l: `${e.org}`.toUpperCase().slice(0, 14), r: e.start.slice(-4) }))
    const bd = board("QUEST BOARD", roles, 104, 24 + roles.length * 11)
    R.wallLow(bd, 12 * TS, 6)
    R.light(12 * TS, 3 * TS, 70, "255,200,120", 0.8)
    R.wall(plate("THE LAST LANTERN", 100, CANDLE), 12 * TS, 4)
    for (const x of [8, 16]) { R.wall(lanternStrip(), x * TS, 18, { anim: { frames: 3, fps: 3, dx: 16 } }); R.light(x * TS, 3 * TS + 6, 70, "255,190,100", 1) }
    // bar
    R.add(bar(100), 15 * TS, 7 * TS + 2, { solid: [96, 8] }); R.add(barrel(), 19 * TS + 8, 6 * TS + 10, { solid: [14, 8] }); R.add(barrel(), 1 * TS + 8, 9 * TS + 6, { solid: [14, 8] })
    for (const x of [11, 14, 17]) R.add(stool(), x * TS + 8, 8 * TS + 10, { solid: false })
    R.light(15 * TS, 6 * TS + 4, 70, "255,190,110", 0.8)
    // tables with candles
    const tb: [number, number][] = [[3.5, 10], [16.5, 10], [4, 12], [14, 12]]
    tb.forEach(([c, r], i) => {
      const cx = c * TS + 8, by = r * TS + 12
      R.add(woodTable(), cx, by, { solid: [24, 8] }); R.add(stool(), cx - 20, by + 2, { solid: false }); R.add(stool(), cx + 20, by + 2, { solid: false })
      R.light(cx, by - 10, 56, "255,180,90", 1 + i * 0.1)
    })
    R.add(candleStrip(3), W / 2, 10 * TS + 8, { anim: { frames: 3, fps: 4, dx: 16 }, solid: [10, 6] }); R.light(W / 2, 10 * TS, 80, "255,180,90", 1)
    R.add(plant(), 1 * TS + 8, 12 * TS + 8)
    R.actors.push(folk("marrow", "Granny Marrow", RUINS_CHARS.innkeeper, 15 * TS, 6 * TS + 8, {
      lines: [`Welcome to the Last Lantern. The tea is cold, the stories are warm.`, `${first} was ${content.experience.map((e) => `${e.role} at ${e.org}`).join("; ")}.`, `Take a look at the quest board, dear. Every role is pinned up.`],
      action: { type: "section", id: "tavern" },
    }))
    R.actors.push(folk("ghost-a", "Friendly Ghost", RUINS_CHARS.ghost, 3.5 * TS + 8, 9 * TS + 4, { wander: 22, bark: ["Another warm cup of nothing, please!", "Barclays: GitLab CI, Helm, Kubernetes. I just float."] }))
    R.actors.push(folk("ghost-b", "Pip the Ghost", RUINS_CHARS.ghost, 15 * TS, 11 * TS, { wander: 26, bark: ["I died of laughter. Ask me how.", "CtrlFixIt: 120+ players at once!"] }))
    R.spot("quests", 12 * TS, 6 * TS + 4, "READ THE QUEST BOARD", { type: "section", id: "tavern" }, true, 12 * TS, 2 * TS - 4)
    const m = addMotes(R, 10, [TS * 2, TS * 6, W - TS * 2, TS * 12], "#ffd28a")
    out["ruins:tavern"] = withTick(R, m)
  }

  // ── COLD FORGE ────────────────────────────────────────────────
  {
    const groups = content.skills
    const NW = 5
    const R = makeRoom("ruins:forge", "Cold Forge", { w: 25, h: 15, wallH: NW, world: "ruins", theme: coldTheme({ floor: "slate", dark: 0.66, wall: "#2e3a4e", tint: "2,8,30", trim: ICE }) })
    const W = R.w * TS
    R.decal((g) => { g.fillStyle = "rgba(20,60,120,.3)"; g.beginPath(); g.ellipse(4 * TS + 8, 8 * TS, 62, 26, 0, 0, 7); g.fill() })
    // the blue flame furnace
    const fu = strip(64, 62, 4, (P, f) => {
      shadow(P, 2, 59, 60)
      box(P, 2, 18, 60, 40, "#4a566c"); P.r(3, 19, 58, 1, "#9aaac4")
      for (let y = 22; y < 56; y += 7) for (let x = 4 + ((y / 7) % 2) * 6; x < 60; x += 12) P.r(x, y, 11, 6, (x + y) % 3 ? "#3a465c" : "#566278")
      P.poly([[10, 18], [54, 18], [46, 2], [18, 2]], "#3a465c"); box(P, 26, 0, 12, 7, "#2a3244")
      box(P, 14, 30, 36, 26, "#05070e"); P.r(16, 32, 32, 22, "#0a1630")
      P.x.fillStyle = "rgba(60,150,255,.5)"; P.x.fillRect(16, 32, 32, 22)
      const fl = (cx: number, w: number, h: number, ff: number) => { const sway = [0, 1, 0, -1][ff % 4], tall = [0, 2, 1, 3][ff % 4]; P.poly([[cx - w / 2, 54], [cx - w / 2 + 1, 54 - h * 0.5], [cx + sway, 54 - h - tall], [cx + w / 2 - 1, 54 - h * 0.5], [cx + w / 2, 54]], "#1e6ed8"); P.poly([[cx - w / 3, 54], [cx + sway, 54 - h * 0.85 - tall], [cx + w / 3, 54]], "#4ab4ff"); P.poly([[cx - w / 6, 54], [cx + sway, 54 - h * 0.5], [cx + w / 6, 54]], "#d8f6ff") }
      fl(32, 22, 20, f); fl(23, 10, 11, f + 1); fl(41, 10, 12, f + 2)
      P.r(14, 55, 36, 1, "#8ad8ff")
      for (let i = 0; i < 3; i++) P.p(20 + ((f * 5 + i * 7) % 22), 26 - ((f + i) % 3), "#a8e8ff")
      box(P, 22, 25, 20, 4, "#2a3244"); P.r(23, 26, 18, 1, "#7a8aa4")
    })
    R.add(fu, 4 * TS + 8, NW * TS + 14, { anim: { frames: 4, fps: 8, dx: 64 }, solid: [56, 10] })
    R.light(4 * TS + 8, NW * TS - 4, 150, "70,150,255", 2); R.light(4 * TS + 8, 8 * TS, 100, "100,180,255", 1.4); R.pool(4 * TS + 8, NW * TS + 26, 74, 24, "70,150,255", 0.3)
    const anv = pen(30, 26); shadow(anv, 3, 23, 24); box(anv, 8, 15, 14, 8, "#5a6478"); anv.r(9, 16, 12, 1, "#9aaac4"); box(anv, 5, 10, 22, 6, "#6a7690"); anv.r(6, 11, 20, 1, "#d8e8f8"); anv.poly([[27, 10], [30, 12], [27, 15]], "#6a7690"); box(anv, 11, 3, 4, 7, "#6a7690"); anv.r(8, 2, 10, 3, "#8a9ab4")
    R.add(anv.c, 4 * TS + 8, 9 * TS + 4, { solid: [24, 8] })
    R.add(barrel(), 8 * TS + 8, NW * TS + 14, { solid: [14, 8] }); R.add(barrel(), 1 * TS + 8, 7 * TS + 6, { solid: [14, 8] })
    R.add(jar(ICE, 20), 1 * TS + 8, 12 * TS + 8, { anim: { frames: 4, fps: 3, dx: 14 }, solid: [10, 6] })
    // racks of tools, frosted
    const cols = 3
    groups.forEach((gr, i) => {
      const row = Math.floor(i / cols), col = i % cols
      const cx = 14 * TS + col * 3.5 * TS + 8, by = (NW + 3 + row * 4) * TS + 12
      const acc = [ICE, TEAL, VIOLET, "#ff9ac8", "#ffd76a", "#7ad8ff"][i % 6]
      const rk = pen(52, 58); shadow(rk, 1, 56, 50)
      box(rk, 0, 0, 52, 55, "#2a3446"); rk.r(1, 1, 50, 1, "#7a8aa4"); rk.r(3, 12, 46, 40, "#0a0f1c")
      box(rk, 3, 2, 46, 9, "#05070e", acc)
      const f = fitTitle(gr.group.toUpperCase(), 38); if (f.micro) drawMicro(rk.x, f.s, Math.round((52 - f.w) / 2), 4, "#e0f4ff"); else drawText(rk.x, f.s, Math.round((52 - f.w) / 2), 3, "#e0f4ff")
      rk.r(3, 34, 46, 2, "#4a566c"); rk.r(3, 48, 46, 2, "#4a566c")
      for (let k = 0; k < Math.min(6, gr.items.length); k++) {
        const x = 8 + (k % 3) * 14, y = k < 3 ? 14 : 38
        if (k % 3 === 0) { rk.r(x + 4, y + 5, 3, 14, "#5a6478"); box(rk, x, y, 11, 6, "#aab8cc") }
        else if (k % 3 === 1) { rk.line(x + 2, y, x + 6, y + 19, "#8a9ab4", 2); rk.line(x + 10, y, x + 6, y + 19, "#6a7690", 2) }
        else { box(rk, x + 4, y, 4, 14, "#cfe0f0"); rk.r(x + 5, y + 1, 1, 12, "#fff"); box(rk, x, y + 13, 12, 3, "#6a7690"); rk.r(x + 5, y + 16, 3, 4, "#3a465c") }
        rk.p(x + 1, y + 1, "#e8f8ff")
      }
      R.add(rk.c, cx, by, { solid: [46, 8] })
      R.light(cx, by - 26, 46, "130,200,255", 0.8)
      R.spot(`skills-${i}`, cx, by + 14, `INSPECT ${gr.group.toUpperCase()}`, { type: "section", id: "forge", focus: gr.group }, true, cx, by - 56)
    })
    R.wall(plate("COLD FORGE", 70, ICE), 17 * TS, 8)
    brazier(R, W - 2 * TS, 13 * TS + 4, 70)
    R.actors.push(folk("ironbones", "Ironbones the Smith", RUINS_CHARS.bones, 7 * TS + 8, 8 * TS + 6, {
      facing: "left",
      lines: [`Hot work? No. Cold work. The flame burns blue, and it never warms a thing.`, `These racks hold ${first}'s tools: ${groups.map((g) => g.group).join(", ")}.`, `Rust, TypeScript, Python. The bones remember them all.`],
      action: { type: "section", id: "forge" },
    }))
    const m = addMotes(R, 16, [TS * 2, TS * 6, W - TS * 2, TS * 13], "#a8e8ff")
    out["ruins:forge"] = withTick(R, m)
  }

  // ── FORGOTTEN LIBRARY ─────────────────────────────────────────
  {
    const NW = 6
    const R = makeRoom("ruins:academy", "Forgotten Library", { w: 23, h: 16, wallH: NW, world: "ruins", theme: coldTheme({ floor: "slate", dark: 0.64, wall: "#34304a", tint: "6,4,30", trim: VIOLET }) })
    const W = R.w * TS
    const edu = content.education[0]
    const ach = content.achievements.filter((a) => a.kind === "hackathon")
    R.decal((g) => { rugCold(g, 7 * TS, 9 * TS, 9 * TS, 5 * TS, "#2a2a5a", VIOLET); cobweb(g, TS, 6 * TS, false); cobweb(g, W - TS, 6 * TS, true) })
    R.pool(W / 2, 11 * TS, 100, 40, "150,120,255", 0.12)
    ;[1.5, 4.2, 7.0, 15.8, 18.6, 21.3].forEach((c, i) => R.add(bookcase(36, 70, i * 2 + 1), c * TS, NW * TS + 10, { solid: [34, 8] }))
    arch(R, W / 2, 6, 40, 60)
    R.light(W / 2, 4 * TS, 110, "120,160,255", 0.8)
    for (const x of [5.6, W / TS - 5.6]) { R.wall(lanternStrip(), x * TS, 10, { anim: { frames: 3, fps: 3, dx: 16 } }); R.light(x * TS, 3 * TS, 60, "130,255,215", 0.8) }
    R.wall(plate("THE FORGOTTEN LIBRARY", 124, VIOLET), W / 2, 4)
    // floating books
    const fb: [number, number, number][] = [[9, 9, 1], [13, 8, 2], [11, 12, 3], [6, 11, 4], [17, 11, 5], [14, 13, 6]]
    for (const [c, r, s] of fb) { R.add(floatBooks(s), c * TS, r * TS, { anim: { frames: 6, fps: 3 + (s % 3), dx: 24 }, solid: false, baseOff: 40 }); R.light(c * TS, r * TS - 12, 40, "130,255,215", 0.8) }
    // reading desk with a lantern
    R.add(readingDesk(), W / 2, (NW + 4) * TS, { solid: [40, 8] }); R.add(stool(), W / 2 - 14, (NW + 5) * TS + 2, { solid: false })
    R.light(W / 2 + 12, (NW + 3) * TS, 90, "255,200,100", 1)
    // honours: a glowing cabinet
    const ch = pen(70, 62); shadow(ch, 1, 60, 68); box(ch, 0, 0, 70, 59, "#3a2818"); ch.r(1, 1, 68, 1, "#6a4a2c"); ch.r(3, 4, 64, 51, "#0a0c14"); ch.x.fillStyle = "rgba(130,255,215,.10)"; ch.x.fillRect(3, 4, 64, 51)
    for (let s = 0; s < 3; s++) { const y = 4 + s * 17; ch.r(3, y + 15, 64, 2, "#6a4a2c"); for (let k = 0; k < 4; k++) { const i = s * 4 + k; if (i >= Math.min(11, ach.length + 3)) continue; const x = 9 + k * 15, by = y + 15; if (i % 2) { ch.r(x, by - 4, 9, 4, "#4a3a28"); ch.r(x + 1, by - 11, 7, 7, "#d8e8e0"); ch.r(x + 2, by - 9, 5, 1, "#2a6a5a"); ch.r(x + 2, by - 7, 5, 1, VIOLET) } else { ch.r(x + 3, by - 3, 2, 3, "#8a7a3a"); ch.r(x, by - 10, 8, 7, "#e8d070"); ch.r(x + 1, by - 9, 2, 4, "#fff6c0") } } }
    R.add(ch.c, 18 * TS, 15 * TS + 4, { solid: [66, 10] }); R.light(18 * TS, 13 * TS, 80, "130,255,215", 0.9)
    R.add(plant(), 1 * TS + 8, 14 * TS + 8)
    brazier(R, 4 * TS, 14 * TS + 4, 70)
    R.actors.push(folk("hex", "Apprentice Hex", RUINS_CHARS.apprentice, W / 2 + 26, (NW + 5) * TS, {
      lines: [`Shh. The books here whisper if you listen.`, `${first} studies ${edu.degree} ${edu.field} at SPIT. ${edu.note}`, `The glowing cabinet keeps his honours: ${ach.slice(0, 3).map((a) => a.title).join("; ")}, and more.`],
      action: { type: "section", id: "academy" },
    }))
    R.spot("tomes", W / 2, (NW + 6) * TS, "READ THE TOMES", { type: "section", id: "academy" }, true, W / 2, (NW + 1) * TS)
    R.spot("trophies", 18 * TS, 15 * TS + 12, "VIEW HONOURS", { type: "section", id: "academy", focus: "honours" }, true, 18 * TS, 11 * TS + 8)
    const m = addMotes(R, 22, [TS * 2, TS * (NW + 1), W - TS * 2, TS * 14], "#cdb8ff")
    out["ruins:academy"] = withTick(R, m)
  }

  // ── WHISPER POST ──────────────────────────────────────────────
  {
    const NW = 5
    const R = makeRoom("ruins:wizard", "Whisper Post", { w: 19, h: 14, wallH: NW, world: "ruins", theme: coldTheme({ dark: 0.6, wall: "#34445a", tint: "4,10,32" }) })
    const W = R.w * TS
    R.decal((g) => { rugCold(g, 6 * TS, 8 * TS, 7 * TS, 4 * TS, "#1e3a4a", TEAL) })
    R.pool(W / 2, 9 * TS, 80, 36, "110,255,210", 0.14)
    arch(R, 2 * TS, 3, 26, 40); arch(R, W - 2 * TS, 8, 26, 40)
    R.wallLow(mailRack(6, 3), 5.8 * TS, 6); R.wallLow(mailRack(4, 3), W - 4.6 * TS, 6)
    R.wall(plate("WHISPER POST", 80, TEAL), W / 2, 2)
    R.add(whisperLantern(), W / 2, 8 * TS + 4, { anim: { frames: 6, fps: 4, dx: 40 }, solid: [28, 10] })
    R.light(W / 2, 6 * TS, 140, "110,255,210", 1.2); R.light(W / 2, 8 * TS, 80, "200,255,240", 0.6)
    R.add(whisperHorn(), W / 2 + 34, 8 * TS + 6, { solid: [16, 8] })
    R.add(stoneTable(46), 3 * TS + 8, 10 * TS + 6, { solid: [44, 10] }); R.add(candleStrip(1), 3 * TS + 8, 10 * TS - 8, { anim: { frames: 3, fps: 5, dx: 16 }, solid: false }); R.light(3 * TS + 8, 10 * TS - 12, 60, "255,180,80", 1)
    R.add(barrel(), 17 * TS, 11 * TS + 8, { solid: [14, 8] }); R.add(plant(), 1 * TS + 8, 12 * TS + 8)
    R.add(jar(TEAL, 22), 16 * TS, 9 * TS + 4, { anim: { frames: 4, fps: 3, dx: 14 }, solid: [10, 6] })
    brazier(R, 4 * TS, 7 * TS, 70)
    R.actors.push(folk("quill", "Quill the Courier", RUINS_CHARS.courier, W / 2 - 30, 8 * TS + 4, {
      lines: [`Whisper Post. Speak into the lantern and your words drift to ${first}.`, `Letters for ${first} go to ${content.socials.email}. Ravens are optional.`, `${content.profile.availability}. He answers fast. Faster than the dead, anyway.`],
      action: { type: "section", id: "wizard" },
    }))
    R.actors.push(folk("ghost-c", "Hush", RUINS_CHARS.ghost, 14 * TS, 11 * TS, { wander: 24, bark: ["Psst. Tell it a secret.", "The lantern keeps everything. Politely."] }))
    R.spot("whisper", W / 2, 9 * TS + 10, "WHISPER INTO THE LANTERN", { type: "section", id: "wizard" }, true, W / 2, 5 * TS - 4)
    const m = addMotes(R, 18, [TS * 2, TS * 6, W - TS * 2, TS * 12], "#a8fff0")
    out["ruins:wizard"] = withTick(R, m)
  }

  return out
}

export const RUINS_INTERIOR_PRELOAD = [
  ...["Master", "OldMan3", "Skeleton", "Spirit", "OldWoman", "Tengu", "NinjaMageBlack"].flatMap((n) => [charSheet(n), charFace(n)]),
]
