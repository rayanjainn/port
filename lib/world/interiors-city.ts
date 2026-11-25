// Neon Harbor interiors: six modern rooms, one behind each landmark door. Night light pours in through the windows.
import type { Portfolio } from "@/lib/content"
import { PEOPLE, personSheet, personFace } from "@/lib/kenney"
import { drawText, drawMicro, fitTitle, textW, microW, ordered, exhibitArt, shrink, projectIcon, palOf, mix, wrapMicro, type ExProject } from "./exhibits"
import { TS, canvas, type Scene } from "./core"
import { makeRoom, npc as mkNpc, pen, shadow, shade, strip, type Theme, type Room, type Pen } from "./interiors-kit"

type Ctx = CanvasRenderingContext2D
const INK = "#0b0d1a"

// ── themes ──────────────────────────────────────────────────────
type Floor = "marble" | "wood" | "epoxy" | "carpet" | "vinyl"
function cityTheme(floor: Floor, wallCol: string, trim: string, o: { dark?: number } = {}): Theme {
  const tiles: Record<Floor, (g: Ctx, x: number, y: number, c: number, r: number) => void> = {
    marble: (g, x, y, c, r) => {
      const a = (c + r) % 2
      g.fillStyle = a ? "#c9cedd" : "#aeb5c9"; g.fillRect(x, y, TS, TS)
      g.fillStyle = a ? "#dde1ec" : "#bfc6d8"; g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS)
      g.fillStyle = "rgba(60,70,110,.35)"; g.fillRect(x + 15, y, 1, TS); g.fillRect(x, y + 15, TS, 1)
      g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x + 3 + ((c * 5 + r * 3) % 7), y + 3 + ((c * 3 + r * 7) % 7), 3, 1)
    },
    wood: (g, x, y, c, r) => {
      g.fillStyle = (r % 2) ? "#8c6a48" : "#9a7650"; g.fillRect(x, y, TS, TS)
      g.fillStyle = "#6b4c30"; g.fillRect(x, y + 7, TS, 1); g.fillRect(x, y + 15, TS, 1)
      g.fillStyle = "rgba(255,230,190,.18)"; g.fillRect(x, y, TS, 1); g.fillRect(x, y + 8, TS, 1)
      g.fillStyle = "#6b4c30"; g.fillRect(x + ((c * 7 + r * 5) % 12) + 2, y, 1, 7); g.fillRect(x + ((c * 3 + r * 11) % 12) + 2, y + 8, 1, 7)
    },
    epoxy: (g, x, y, c, r) => {
      g.fillStyle = (c + r) % 2 ? "#3b4150" : "#363c4b"; g.fillRect(x, y, TS, TS)
      g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS)
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x + 15, y, 1, TS); g.fillRect(x, y + 15, TS, 1)
      if (c % 8 === 3) { g.fillStyle = "#e8b020"; g.fillRect(x + 6, y, 4, TS); g.fillStyle = "#1a1a1a"; for (let k = 0; k < TS; k += 4) g.fillRect(x + 6, y + k, 4, 2) }
    },
    carpet: (g, x, y, c, r) => {
      g.fillStyle = (c + r) % 2 ? "#2d3a6a" : "#2a3665"; g.fillRect(x, y, TS, TS)
      g.fillStyle = "rgba(160,190,255,.10)"; for (let k = 0; k < 4; k++) g.fillRect(x + ((c * 3 + k * 5 + r) % 14), y + ((k * 4 + r * 3) % 14), 2, 1)
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x + 15, y, 1, TS)
    },
    vinyl: (g, x, y, c, r) => {
      g.fillStyle = (c + r) % 2 ? "#d8cfb8" : "#cbc1a8"; g.fillRect(x, y, TS, TS)
      g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS)
      g.fillStyle = "rgba(90,70,40,.25)"; g.fillRect(x + 15, y, 1, TS); g.fillRect(x, y + 15, TS, 1)
    },
  }
  return {
    bg: "#05060d", dark: o.dark ?? 0.42, music: "chill",
    lighting: { tint: "8,10,36", glow: 0.3, holeStrength: 0.78, heroRadius: 70, radiusScale: 1 },
    floor: tiles[floor],
    back: (g, w, h) => {
      g.fillStyle = wallCol; g.fillRect(0, 0, w, h)
      // vertical panel seams and a soft gradient toward the ceiling
      for (let x = 0; x < w; x += 32) { g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(x, 0, 1, h - 16); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x + 1, 0, 1, h - 16) }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(0,0,0,.45)"); gr.addColorStop(0.5, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h)
      // dado rail + baseboard
      g.fillStyle = shade(wallCol, -0.35); g.fillRect(0, h - 16, w, 16)
      g.fillStyle = trim; g.fillRect(0, h - 17, w, 1); g.fillStyle = shade(trim, -0.4); g.fillRect(0, h - 16, w, 1)
      for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(x, h - 14, 1, 12) }
      g.fillStyle = "#0b0d18"; g.fillRect(0, h - 3, w, 3); g.fillStyle = trim; g.fillRect(0, h - 3, w, 1)
      g.fillStyle = "#04050b"; g.fillRect(0, 0, w, 3)
    },
    side: (g, x, y) => { g.fillStyle = shade(wallCol, -0.2); g.fillRect(x, y, TS, TS); g.fillStyle = trim; g.fillRect(x, y + 14, TS, 1); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y, TS, TS); g.fillStyle = shade(wallCol, 0.05); g.fillRect(x + 4, y, 8, TS) },
    front: (g, x, y) => { g.fillStyle = shade(wallCol, -0.25); g.fillRect(x, y, TS, TS); g.fillStyle = trim; g.fillRect(x, y, TS, 2); g.fillStyle = "#04050b"; g.fillRect(x, y + 2, TS, TS - 2); g.fillStyle = shade(wallCol, -0.1); g.fillRect(x + 1, y + 3, TS - 2, 4) },
    mat: ["#161a2e", "#ff4fa3"],
  }
}

// ── pixel props ─────────────────────────────────────────────────
const box = (P: Pen, x: number, y: number, w: number, h: number, fill: string, line = INK) => P.box(x, y, w, h, fill, line)

function windowNight(w: number, h: number, seed: number, neon: string): HTMLCanvasElement {
  const P = pen(w, h)
  box(P, 0, 0, w, h, "#0a1030", "#10131f")
  const gr = P.x.createLinearGradient(0, 2, 0, h - 2); gr.addColorStop(0, "#0d1442"); gr.addColorStop(0.6, "#35206a"); gr.addColorStop(1, "#c4468f")
  P.x.fillStyle = gr; P.x.fillRect(2, 2, w - 4, h - 4)
  for (let i = 0; i < 9; i++) P.p(3 + ((seed * 13 + i * 17) % (w - 6)), 3 + ((seed * 7 + i * 5) % 8), "#fff7d8")
  let x = 2, k = seed
  while (x < w - 2) {
    const bw = 5 + (k * 7 % 7), bh = 8 + ((k * 11) % (h - 14))
    const bx = x, by = h - 2 - bh
    P.r(bx, by, Math.min(bw, w - 2 - bx), bh, k % 2 ? "#12183a" : "#0c1230")
    P.r(bx, by, Math.min(bw, w - 2 - bx), 1, "#2a2f66")
    for (let wy = by + 2; wy < h - 3; wy += 3) for (let wx = bx + 1; wx < bx + bw - 1 && wx < w - 3; wx += 2) if ((wx * 5 + wy * 3 + seed) % 5 < 2) P.p(wx, wy, (wx + wy) % 3 ? "#ffd987" : neon)
    x += bw + 1; k++
  }
  // mullions and glass shine
  P.r(Math.floor(w / 2), 1, 1, h - 2, "#10131f"); P.r(1, Math.floor(h * 0.45), w - 2, 1, "#10131f")
  P.x.fillStyle = "rgba(255,255,255,.10)"; P.x.beginPath(); P.x.moveTo(3, h - 3); P.x.lineTo(10, 2); P.x.lineTo(14, 2); P.x.lineTo(7, h - 3); P.x.fill()
  P.r(0, h - 3, w, 3, "#1a1f33"); P.r(0, h - 3, w, 1, "#4d5678")
  return P.c
}

function plant(h = 30): HTMLCanvasElement {
  const P = pen(20, h)
  const top = h - 12
  shadow(P, 3, h - 2, 14)
  box(P, 4, top + 2, 12, 9, "#3b4a6b"); P.r(5, top + 3, 10, 1, "#6a7fb0"); P.r(4, top + 9, 12, 2, "#232d49")
  P.r(7, top, 6, 3, "#3a2a1c")
  for (const [lx, ly, ang] of [[10, top - 2, 0], [6, top - 4, -1], [14, top - 4, 1], [4, top - 9, -1], [16, top - 9, 1], [10, top - 12, 0], [7, top - 14, -1], [13, top - 14, 1]] as [number, number, number][]) {
    P.disc(lx, ly, 3, "#10331f"); P.disc(lx, ly, 2, "#2f8a4c"); P.p(lx - 1 + ang, ly - 1, "#62c57a")
  }
  P.r(9, top - 12, 2, 12, "#1d5a30")
  return P.c
}

/** a desk pod: monitor facing the viewer showing `art`, keyboard, mug, side drawers */
function deskPod(art: HTMLCanvasElement | null, accent: string, big = false): HTMLCanvasElement {
  const W = big ? 58 : 52, H = 42
  const P = pen(W, H)
  shadow(P, 2, H - 3, W - 4)
  // desk body
  box(P, 1, 22, W - 2, 6, "#a58a63", "#2a1d12"); P.r(2, 23, W - 4, 1, "#cdb28a")
  box(P, 3, 28, 4, 11, "#6c5a45", "#2a1d12"); box(P, W - 7, 28, 4, 11, "#6c5a45", "#2a1d12")
  box(P, W - 20, 28, 14, 10, "#59687f", "#1d2433"); P.r(W - 18, 31, 10, 1, "#a6b4cc"); P.r(W - 18, 35, 10, 1, "#a6b4cc")
  // monitor
  const mw = big ? 38 : 34, mh = big ? 24 : 21, mx = Math.round((W - mw) / 2), my = 0
  box(P, mx, my, mw, mh + 2, "#171b2c", INK); P.r(mx + 1, my + 1, mw - 2, 1, "#3b4263")
  if (art) {
    const sc = shrink(art, (mw - 4) / art.width)
    P.x.drawImage(sc, mx + 2, my + 2)
    P.x.fillStyle = "rgba(180,220,255,.12)"; P.x.fillRect(mx + 2, my + 2, mw - 4, 2)
  } else { P.r(mx + 2, my + 2, mw - 4, mh - 2, palOf(accent).deep) }
  P.r(mx + 2, my + mh, mw - 4, 1, palOf(accent).a)
  box(P, W / 2 - 3, mh + 2, 6, 3, "#303753", INK); box(P, W / 2 - 8, mh + 4, 16, 2, "#303753", INK)
  // keyboard and mug
  P.r(mx + 4, 26, 18, 3, "#2a2f48"); for (let k = 0; k < 16; k += 2) P.p(mx + 5 + k, 27, "#7d89b8")
  box(P, mx + mw - 6, 24, 5, 5, "#f2f2f2", INK); P.r(mx + mw - 5, 25, 3, 1, "#7a4a2a")
  return P.c
}
function chair(col = "#2d3552"): HTMLCanvasElement {
  const P = pen(16, 20)
  shadow(P, 2, 17, 12)
  box(P, 3, 0, 10, 9, col, INK); P.r(4, 1, 8, 1, "rgba(255,255,255,.3)")
  P.r(7, 9, 2, 5, "#1a1d2c"); box(P, 2, 8, 12, 4, shade(col, 0.1), INK)
  P.r(3, 14, 10, 2, "#1a1d2c"); P.p(2, 16, "#1a1d2c"); P.p(13, 16, "#1a1d2c")
  return P.c
}
function counter(w: number, top = "#e8ebf5", body = "#2d3455", trim = "#ff4fa3"): HTMLCanvasElement {
  const H = 26
  const P = pen(w, H)
  shadow(P, 1, H - 2, w - 2)
  box(P, 0, 6, w, 16, body, INK); P.r(1, 7, w - 2, 1, "rgba(255,255,255,.2)")
  for (let x = 6; x < w - 4; x += 12) { P.r(x, 11, 8, 8, shade(body, -0.25)); P.r(x, 11, 8, 1, shade(body, 0.2)) }
  box(P, 0, 3, w, 5, top, INK); P.r(1, 4, w - 2, 1, "#ffffff")
  P.r(1, 22, w - 2, 1, trim)
  return P.c
}
function monitorOnly(art: HTMLCanvasElement | null, accent: string): HTMLCanvasElement {
  const P = pen(22, 20)
  box(P, 1, 0, 20, 14, "#171b2c", INK)
  if (art) P.x.drawImage(shrink(art, 16 / art.width), 3, 2); else { P.r(3, 2, 16, 10, palOf(accent).deep); P.r(4, 4, 8, 1, palOf(accent).l); P.r(4, 6, 12, 1, palOf(accent).a); P.r(4, 8, 6, 1, palOf(accent).l) }
  box(P, 9, 14, 4, 3, "#303753", INK); box(P, 5, 17, 12, 2, "#303753", INK)
  return P.c
}
function bubbleSign(text: string, w: number, bg: string, fg: string, neon?: string): HTMLCanvasElement {
  const P = pen(w, 14)
  box(P, 0, 0, w, 14, bg, neon ?? INK)
  const f = fitTitle(text, w - 6)
  const x = Math.round((w - f.w) / 2)
  if (f.micro) drawMicro(P.x, f.s, x, 5, fg); else drawText(P.x, f.s, x, 3, fg)
  return P.c
}

function flag(kind: "city" | "india", h = 44): HTMLCanvasElement {
  const P = pen(28, h)
  P.r(1, 2, 2, h - 2, "#c8cfe0"); P.r(1, 2, 1, h - 2, "#ffffff"); P.disc(2, 1, 2, "#ffd76a")
  const fw = 22, fh = 24
  if (kind === "india") {
    P.r(4, 4, fw, 8, "#ff9933"); P.r(4, 12, fw, 8, "#f4f4f4"); P.r(4, 20, fw, 8, "#138808")
    P.disc(15, 16, 3, "#1a2a8a"); P.disc(15, 16, 2, "#f4f4f4"); P.p(15, 16, "#1a2a8a")
  } else {
    P.r(4, 4, fw, fh + 4, "#14123a"); P.poly([[4, 18], [10, 12], [16, 20], [26, 10], [26, 20], [4, 28]], "#ff4fa3"); P.poly([[4, 22], [10, 17], [16, 24], [26, 15], [26, 28], [4, 28]], "#5de6ff")
    P.p(8, 8, "#fff"); P.p(20, 7, "#fff")
  }
  // soft fold shading
  for (let y = 4; y < 28; y += 1) { P.p(4 + ((y * 5) % 22), y, "rgba(0,0,0,.18)") }
  P.r(4, 4, fw, 1, "rgba(255,255,255,.3)"); P.r(4, 28, fw, 1, "rgba(0,0,0,.4)")
  return P.c
}

/** bust portrait in a frame, with a caption plate */
function portrait(bg: string, cap: string, shirt: string, hair: string, glasses = false): HTMLCanvasElement {
  const W = 34, H = 46
  const P = pen(W, H)
  box(P, 0, 0, W, 36, "#1a1c30", INK); P.r(1, 1, W - 2, 1, "#9ba3c8"); P.r(1, 1, 1, 34, "#6a7099")
  const gr = P.x.createLinearGradient(0, 3, 0, 34); gr.addColorStop(0, shade(bg, 0.15)); gr.addColorStop(1, shade(bg, -0.45))
  P.x.fillStyle = gr; P.x.fillRect(3, 3, W - 6, 30)
  P.disc(17, 17, 7, "#6a4a38"); P.disc(17, 17, 6, "#c68e6a"); P.r(11, 10, 12, 4, hair); P.r(10, 12, 2, 5, hair); P.r(23, 12, 1, 4, hair)
  P.r(14, 17, 2, 2, "#1a1020"); P.r(19, 17, 2, 2, "#1a1020"); P.r(15, 22, 5, 1, "#8a4a40")
  if (glasses) { P.r(13, 16, 4, 4, "rgba(255,255,255,0)"); P.x.strokeStyle = "#1a1020"; P.x.strokeRect(13.5, 16.5, 4, 3); P.x.strokeRect(18.5, 16.5, 4, 3); P.r(17, 17, 2, 1, "#1a1020") }
  P.poly([[5, 33], [8, 27], [14, 24], [21, 24], [27, 27], [30, 33]], shirt); P.r(14, 24, 7, 2, "#c68e6a")
  box(P, 2, 37, W - 4, 8, "#e8ebf5", INK)
  const lines = wrapMicro(cap, 7, 2)
  lines.forEach((l, i) => drawMicro(P.x, l, Math.round((W - microW(l)) / 2), 38 + i * 4, "#1a1c30"))
  return P.c
}

function sofa(w = 42, col = "#7a3d8a"): HTMLCanvasElement {
  const P = pen(w, 26)
  shadow(P, 1, 23, w - 2)
  box(P, 0, 4, w, 12, shade(col, -0.2)); P.r(1, 5, w - 2, 1, shade(col, 0.3))
  box(P, 0, 12, w, 10, col); P.r(1, 13, w - 2, 1, shade(col, 0.35)); P.r(w / 2, 13, 1, 7, shade(col, -0.35))
  box(P, 0, 8, 5, 14, shade(col, -0.1)); box(P, w - 5, 8, 5, 14, shade(col, -0.1))
  box(P, 4, 20, 3, 3, "#1a1020"); box(P, w - 7, 20, 3, 3, "#1a1020")
  return P.c
}
function roundTable(col = "#e8d5b0"): HTMLCanvasElement {
  const P = pen(26, 24)
  shadow(P, 4, 21, 18)
  P.r(12, 12, 2, 9, "#2a2f48"); box(P, 8, 19, 10, 2, "#2a2f48")
  P.ell(13, 9, 11, 5, INK); P.ell(13, 8, 10, 4, col); P.r(6, 6, 6, 1, "rgba(255,255,255,.5)")
  box(P, 10, 4, 5, 5, "#f2f2f2"); P.r(11, 5, 3, 1, "#7a4a2a"); P.r(15, 7, 3, 2, "#f2f2f2")
  return P.c
}
function stool(col = "#ff4fa3"): HTMLCanvasElement {
  const P = pen(12, 16)
  shadow(P, 2, 14, 8)
  P.r(5, 7, 2, 7, "#2a2f48"); P.r(2, 13, 8, 1, "#2a2f48")
  P.ell(6, 5, 5, 3, INK); P.ell(6, 4, 4, 2, col); P.r(3, 3, 3, 1, "rgba(255,255,255,.5)")
  return P.c
}
function coffeeMachine(): HTMLCanvasElement {
  const P = pen(28, 30)
  shadow(P, 2, 27, 24)
  box(P, 1, 2, 26, 24, "#c7ccd9"); P.r(2, 3, 24, 1, "#fff"); box(P, 3, 5, 22, 7, "#2a2f48"); drawMicro(P.x, "ESPRESSO", 5, 7, "#5de6ff")
  box(P, 4, 14, 6, 8, "#0b0d1a"); box(P, 18, 14, 6, 8, "#0b0d1a"); P.r(11, 13, 6, 10, "#ff4fa3"); P.r(12, 15, 4, 4, "#ffd1e6")
  P.r(5, 20, 4, 3, "#f2f2f2"); P.r(19, 20, 4, 3, "#f2f2f2"); P.r(2, 24, 24, 2, "#6b7285")
  return P.c
}
function pastryCase(w = 44): HTMLCanvasElement {
  const P = pen(w, 26)
  shadow(P, 1, 23, w - 2)
  box(P, 0, 10, w, 12, "#2d3455"); box(P, 0, 2, w, 10, "rgba(170,230,255,.35)", "#8ab0d0")
  for (let x = 4; x < w - 6; x += 9) { P.ell(x + 3, 9, 3, 2, "#d99a50"); P.r(x + 1, 7, 4, 1, "#f4c880") }
  P.r(1, 3, w - 2, 1, "rgba(255,255,255,.5)")
  return P.c
}
function chalkboard(title: string, lines: { l: string; r?: string }[], w = 100, h = 62): HTMLCanvasElement {
  const P = pen(w, h)
  box(P, 0, 0, w, h, "#7a5230", INK); P.r(1, 1, w - 2, 1, "#b98a5a")
  P.r(3, 3, w - 6, h - 6, "#1d2a27"); P.r(3, 3, w - 6, 1, "#0d1614")
  P.x.fillStyle = "rgba(255,255,255,.04)"; for (let k = 0; k < 6; k++) P.x.fillRect(5 + k * 14, 6 + (k * 7) % 30, 12, 6)
  const tx = Math.round((w - textW(title)) / 2)
  drawText(P.x, title, tx, 6, "#ffe9a8")
  P.r(8, 15, w - 16, 1, "#cfd8d0")
  lines.forEach((ln, i) => {
    const y = 19 + i * 8
    drawMicro(P.x, ln.l, 7, y, i % 2 ? "#bfe4ff" : "#ffd7e8")
    if (ln.r) drawMicro(P.x, ln.r, w - 7 - microW(ln.r), y, "#cfd8d0")
  })
  P.r(4, h - 6, 14, 1, "#e8e0d0"); // chalk tray
  return P.c
}
function neonSign(text: string, col: string, w?: number): HTMLCanvasElement {
  const tw = textW(text), W = w ?? tw + 12
  const P = pen(W, 18)
  P.x.fillStyle = "rgba(0,0,0,.4)"; P.x.fillRect(0, 0, W, 18)
  P.x.strokeStyle = col; P.x.lineWidth = 1; P.x.strokeRect(1.5, 1.5, W - 3, 15)
  drawText(P.x, text, Math.round((W - tw) / 2), 5, "#ffffff", col)
  P.r(0, 0, 2, 2, col); P.r(W - 2, 0, 2, 2, col); P.r(0, 16, 2, 2, col); P.r(W - 2, 16, 2, 2, col)
  return P.c
}

const serverRack = () => strip(26, 44, 4, (P, f) => {
  shadow(P, 1, 41, 24)
  box(P, 0, 0, 26, 42, "#1f2436"); P.r(1, 1, 24, 1, "#4a5372")
  for (let u = 0; u < 7; u++) {
    const y = 3 + u * 5.4 | 0
    box(P, 2, y, 22, 4, "#2b3250", "#0b0d1a"); P.r(4, y + 1, 8, 2, "#12162a")
    for (let k = 0; k < 4; k++) {
      const on = ((u * 3 + k * 5 + f * 2 + (u % 2) * f) % 4) < 2
      P.p(15 + k * 2, y + 1, on ? (k % 2 ? "#5dffb0" : "#ff4fa3") : "#1b2a2a"); P.p(15 + k * 2, y + 2, ((u + k + f) % 3 === 0) ? "#ffd76a" : "#20202a")
    }
  }
  P.r(2, 40, 22, 1, "#4a5372")
})

const scopeStrip = () => strip(28, 26, 4, (P, f) => {
  shadow(P, 2, 24, 24)
  box(P, 1, 3, 26, 20, "#7b8294"); P.r(2, 4, 24, 1, "#c8cfdc")
  box(P, 3, 5, 16, 14, "#06140f");
  P.x.strokeStyle = "rgba(90,255,160,.18)"; for (let k = 1; k < 4; k++) { P.x.beginPath(); P.x.moveTo(3, 5 + k * 3.5); P.x.lineTo(19, 5 + k * 3.5); P.x.stroke() }
  let py = 12
  for (let x = 0; x < 14; x++) { const y = 12 + Math.round(Math.sin((x + f * 3) * 0.9) * 4); P.line(4 + x, py, 4 + x, y, "#5dffb0"); py = y }
  for (const [kx, ky] of [[22, 7], [22, 12], [22, 17]]) { P.disc(kx, ky, 2, "#2a2f48"); P.p(kx, ky - 1, "#ff4fa3") }
  P.r(4, 20, 14, 1, "#3a4056")
})

function workbench(w = 52, items: ("solder" | "board" | "tools" | "laptop")[] = ["solder", "board"]): HTMLCanvasElement {
  const H = 38
  const P = pen(w, H)
  shadow(P, 1, H - 3, w - 2)
  box(P, 1, 20, w - 2, 5, "#9aa3b5"); P.r(2, 21, w - 4, 1, "#e8ecf5")
  box(P, 3, 25, 4, 11, "#4b5368"); box(P, w - 7, 25, 4, 11, "#4b5368")
  box(P, 9, 26, w - 18, 4, "#3a4156"); P.r(10, 27, w - 20, 1, "#6a7390")
  let x = 4
  for (const it of items) {
    if (it === "solder") { box(P, x, 14, 12, 6, "#2a2f48"); P.r(x + 2, 8, 2, 7, "#c0c6d6"); P.line(x + 4, 8, x + 9, 4, "#d0d6e4"); P.p(x + 9, 3, "#ff7a3a"); P.p(x + 10, 2, "#ffd76a"); x += 15 }
    else if (it === "board") { box(P, x, 15, 14, 5, "#1f7a46", "#07240f"); for (let k = 0; k < 5; k++) P.p(x + 2 + k * 2, 17, "#d9b85a"); P.r(x + 9, 16, 3, 3, "#12162a"); x += 17 }
    else if (it === "tools") { P.r(x, 12, 2, 8, "#d0d6e4"); P.r(x + 3, 10, 2, 10, "#ff4fa3"); P.r(x + 6, 13, 2, 7, "#5de6ff"); P.r(x + 3, 9, 2, 2, "#1a1020"); x += 11 }
    else { box(P, x, 8, 16, 11, "#1b2034"); P.r(x + 2, 10, 12, 7, "#12356a"); P.r(x + 3, 12, 6, 1, "#5de6ff"); P.r(x + 3, 14, 8, 1, "#ff4fa3"); box(P, x - 1, 19, 18, 2, "#4b5368"); x += 19 }
  }
  return P.c
}

function binCabinet(label: string, accent: string, n: number): HTMLCanvasElement {
  const W = 52, H = 54
  const P = pen(W, H)
  shadow(P, 1, H - 2, W - 2)
  box(P, 0, 0, W, H - 3, "#3a4156"); P.r(1, 1, W - 2, 1, "#7b86a6")
  const f = fitTitle(label, W - 8)
  box(P, 3, 3, W - 6, 10, "#0b0d1a", accent)
  const tx = Math.round((W - f.w) / 2)
  if (f.micro) drawMicro(P.x, f.s, tx, 6, "#ffffff"); else drawText(P.x, f.s, tx, 4, "#ffffff")
  const cols = 3, rows = 3
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const bx = 4 + c * 15, by = 16 + r * 12
    box(P, bx, by, 14, 11, "#59637f", "#1a1f30"); P.r(bx + 1, by + 1, 12, 1, "#98a4c4")
    P.r(bx + 4, by + 3, 6, 3, "#e8ebf5"); P.r(bx + 5, by + 4, 4, 1, shade(accent, -0.2)); P.r(bx + 5, by + 8, 4, 1, "#20263a")
    if ((r * 3 + c) < n) { P.p(bx + 2, by + 2, accent); }
  }
  return P.c
}

function parcel(w: number, h: number, col: string, tape = "#e8d9b0"): HTMLCanvasElement {
  const P = pen(w, h)
  shadow(P, 0, h - 2, w)
  box(P, 0, 0, w, h - 2, col); P.r(1, 1, w - 2, 1, "rgba(255,255,255,.35)"); P.r(Math.floor(w / 2) - 1, 0, 3, h - 2, tape)
  P.r(2, h - 6, 5, 3, "#f4f4f4"); P.p(3, h - 5, "#222")
  return P.c
}
function pigeonholes(cols: number, rows: number, seed = 1): HTMLCanvasElement {
  const cw = 18, ch = 14, W = cols * cw + 4, H = rows * ch + 4
  const P = pen(W, H)
  box(P, 0, 0, W, H, "#5a4630", INK); P.r(1, 1, W - 2, 1, "#8c6c46")
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = 2 + c * cw, y = 2 + r * ch
    P.r(x, y, cw - 1, ch - 1, "#1a1208"); P.r(x, y, cw - 1, 1, "#0a0704")
    const k = (c * 5 + r * 3 + seed) % 5
    if (k < 3) {
      for (let e = 0; e <= k; e++) { P.r(x + 2 + e * 3, y + 3 + (e % 2), 5, ch - 5 - (e % 2), e % 2 ? "#f4efe0" : "#d9e8f5"); P.r(x + 2 + e * 3, y + 3 + (e % 2), 5, 1, "#ffffff") }
      if (k === 2) P.r(x + 3, y + 4, 3, 2, "#e04a5a")
    }
    P.r(x, y + ch - 2, cw - 1, 1, "#6a4e30")
  }
  return P.c
}
function trophyCabinet(w = 64, h = 70, items = 7): HTMLCanvasElement {
  const P = pen(w, h)
  shadow(P, 1, h - 2, w - 2)
  box(P, 0, 0, w, h - 3, "#3a2a1c"); P.r(1, 1, w - 2, 1, "#8c6c46")
  P.r(3, 4, w - 6, h - 11, "#0b1020"); P.x.fillStyle = "rgba(170,225,255,.14)"; P.x.fillRect(3, 4, w - 6, h - 11)
  const shelves = 3, sh = Math.floor((h - 11) / shelves)
  for (let s = 0; s < shelves; s++) P.r(3, 4 + (s + 1) * sh - 2, w - 6, 2, "#8c6c46")
  let n = 0
  for (let s = 0; s < shelves; s++) for (let k = 0; k < 3 && n < items; k++, n++) {
    const cx = 12 + k * ((w - 20) / 2.6) | 0, by = 4 + (s + 1) * sh - 2
    const gold = (n % 3 === 0) ? "#ffd76a" : n % 3 === 1 ? "#d9dde8" : "#d29a5a"
    if (n % 2 === 0) { P.r(cx - 1, by - 5, 3, 5, shade(gold, -0.3)); P.r(cx - 4, by - 13, 9, 8, gold); P.r(cx - 3, by - 12, 2, 5, "rgba(255,255,255,.7)"); P.r(cx - 6, by - 12, 2, 4, gold); P.r(cx + 5, by - 12, 2, 4, gold) }
    else { P.r(cx - 5, by - 3, 11, 3, "#5a3a1e"); P.poly([[cx, by - 14], [cx + 4, by - 8], [cx, by - 3], [cx - 4, by - 8]], gold); P.p(cx - 1, by - 10, "#fff") }
  }
  P.x.fillStyle = "rgba(255,255,255,.18)"; P.x.beginPath(); P.x.moveTo(6, h - 8); P.x.lineTo(16, 4); P.x.lineTo(21, 4); P.x.lineTo(11, h - 8); P.x.fill()
  P.r(1, h - 7, w - 2, 4, "#2a1d12")
  return P.c
}
function bookcase(w = 36, h = 54, seed = 1): HTMLCanvasElement {
  const P = pen(w, h)
  shadow(P, 1, h - 2, w - 2)
  box(P, 0, 0, w, h - 2, "#4a3426");
  const rows = 4, rh = Math.floor((h - 6) / rows)
  const cols = ["#c8485a", "#4aa3ff", "#ffd76a", "#58c46a", "#9a7be0", "#e8ebf5", "#ff9a3c", "#5de6ff"]
  for (let r = 0; r < rows; r++) {
    const y = 3 + r * rh
    P.r(2, y, w - 4, rh - 1, "#1c130c")
    let x = 3, k = seed + r * 3
    while (x < w - 5) {
      const bw = 2 + (k * 5 % 3), bh = rh - 4 - (k * 7 % 4)
      P.r(x, y + rh - 2 - bh, bw, bh, cols[(k * 3 + r) % cols.length]); P.r(x, y + rh - 2 - bh, 1, bh, "rgba(255,255,255,.3)")
      x += bw; k++
    }
    P.r(2, y + rh - 1, w - 4, 1, "#7a5a3a")
  }
  return P.c
}
function lecternDesk(): HTMLCanvasElement {
  const P = pen(24, 30)
  shadow(P, 2, 27, 20)
  box(P, 3, 8, 18, 18, "#6a4a30"); P.r(4, 9, 16, 1, "#a3784e"); box(P, 1, 3, 22, 6, "#8a6a42"); P.r(2, 4, 20, 1, "#c8a26c")
  P.r(10, 0, 4, 4, "#c0c6d6"); P.disc(12, 0, 1, "#ff4fa3")
  box(P, 6, 14, 12, 7, "#3a2a1c"); drawMicro(P.x, "SPIT", 8, 16, "#ffd76a")
  return P.c
}
function studentDesk(): HTMLCanvasElement {
  const P = pen(30, 24)
  shadow(P, 2, 21, 26)
  box(P, 1, 6, 28, 7, "#b58a5a"); P.r(2, 7, 26, 1, "#e0b886")
  P.r(3, 13, 2, 7, "#3a4156"); P.r(25, 13, 2, 7, "#3a4156")
  box(P, 6, 2, 10, 5, "#f4efe0"); P.r(7, 3, 8, 1, "#9aa3c0"); P.r(7, 5, 6, 1, "#9aa3c0"); box(P, 19, 3, 6, 4, "#1a2a5a")
  return P.c
}
function benchSeat(): HTMLCanvasElement {
  const P = pen(16, 14)
  shadow(P, 1, 12, 14)
  box(P, 2, 0, 12, 6, "#2a3665"); P.r(3, 1, 10, 1, "#5a6bb0"); box(P, 1, 6, 14, 4, "#3a4a85"); P.r(2, 7, 12, 1, "#6a7bc0")
  P.r(3, 10, 2, 3, "#1a1f30"); P.r(11, 10, 2, 3, "#1a1f30")
  return P.c
}
function projectorScreen(w: number, lines: string[]): HTMLCanvasElement {
  const h = 72
  const P = pen(w, h)
  P.r(0, 0, w, 3, "#2a2f48"); P.r(1, 3, 1, 5, "#8a90a8"); P.r(w - 2, 3, 1, 5, "#8a90a8")
  box(P, 3, 6, w - 6, h - 12, "#f2f6ff", "#1a1f30")
  P.x.fillStyle = "rgba(120,160,255,.15)"; P.x.fillRect(4, 7, w - 8, 3)
  const f = fitTitle(lines[0], w - 16)
  if (f.micro) drawMicro(P.x, f.s, Math.round((w - f.w) / 2), 14, "#1a2a5a"); else drawText(P.x, f.s, Math.round((w - f.w) / 2), 12, "#1a2a5a")
  P.r(10, 24, w - 20, 1, "#ff4fa3")
  lines.slice(1).forEach((l, i) => { const fl = fitTitle(l, w - 14); const tx = Math.round((w - fl.w) / 2); if (fl.micro) drawMicro(P.x, fl.s, tx, 29 + i * 8, "#3a4a85"); else drawText(P.x, fl.s, tx, 28 + i * 9, "#3a4a85") })
  P.r(w / 2 - 1, h - 6, 2, 6, "#8a90a8")
  return P.c
}
function posterArt(art: HTMLCanvasElement, accent: string, p: ExProject): HTMLCanvasElement {
  const P = pen(70, 56)
  box(P, 0, 0, 70, 56, "#0b0d1a", palOf(accent).a)
  P.x.drawImage(art, 3, 3)
  P.r(3, 3 + 40, 64, 1, palOf(accent).a)
  const f = fitTitle(p, 62)
  if (f.micro) drawMicro(P.x, f.s, Math.round((70 - f.w) / 2), 47, "#fff"); else drawText(P.x, f.s, Math.round((70 - f.w) / 2), 45, "#fff")
  P.r(0, 0, 70, 1, "rgba(255,255,255,.35)")
  for (const [x, y] of [[0, 0], [69, 0], [0, 55], [69, 55]]) P.p(x, y, "#ffd76a")
  return P.c
}
function screenFrame(art: HTMLCanvasElement, p: ExProject): HTMLCanvasElement {
  const f = fitTitle(p, 56)
  const W = art.width + 8, H = art.height + 8 + 14
  const P = pen(W, H)
  const c = palOf(p.accent)
  box(P, 0, 0, W, art.height + 8, "#10142a", "#05060d"); P.r(1, 1, W - 2, 1, "#4a5372")
  P.x.drawImage(art, 4, 4)
  P.x.fillStyle = "rgba(180,220,255,.10)"; P.x.fillRect(4, 4, art.width, 3)
  P.r(0, art.height + 7, W, 1, c.a)
  P.r(3, art.height + 8, 2, 4, "#2a2f48"); P.r(W - 5, art.height + 8, 2, 4, "#2a2f48")
  box(P, 6, art.height + 9, W - 12, 11, "#11152a", c.a)
  if (f.micro) drawMicro(P.x, f.s, Math.round((W - f.w) / 2), art.height + 13, "#ffffff"); else drawText(P.x, f.s, Math.round((W - f.w) / 2), art.height + 11, "#ffffff")
  void H
  return P.c
}
function arrowFloor(g: Ctx, x: number, y: number, w: number) {
  g.fillStyle = "rgba(255,230,120,.5)"; for (let k = 0; k < w; k += 8) g.fillRect(x + k, y, 4, 1)
}

// ── rug / floor decor ───────────────────────────────────────────
function floorRug(R: Room, x: number, y: number, w: number, h: number, a: string, b: string) {
  const g = R.g
  g.fillStyle = "#06070f"; g.fillRect(x - 1, y - 1, w + 2, h + 2)
  g.fillStyle = a; g.fillRect(x, y, w, h)
  g.fillStyle = b; g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + h - 3, w - 4, 1); g.fillRect(x + 2, y + 2, 1, h - 4); g.fillRect(x + w - 3, y + 2, 1, h - 4)
  g.fillStyle = "rgba(255,255,255,.07)"; for (let k = 6; k < h - 4; k += 6) g.fillRect(x + 5, y + k, w - 10, 1)
}

const worker = (id: string, name: string, look: (typeof PEOPLE)[number], cx: number, cy: number, extra: Parameters<typeof mkNpc>[3]) =>
  mkNpc(id, cx, cy, { name, ...extra }, personSheet(look), personFace(look))

const L = (R: Room, c: number, r: number) => ({ x: c * TS + 8, y: r * TS + 8 })

// ═══════════════════════════════════════════════════════════════
export function buildCityInteriors(content: Portfolio): Record<string, Scene> {
  const out: Record<string, Scene> = {}
  const first = content.profile.name.split(" ")[0]
  const full = content.profile.name
  const NEON = "#ff4fa3", CYAN = "#5de6ff"
  const win = (R: Room, cx: number, seed: number, w = 44, h = 40) => R.wallLow(windowNight(w, h, seed, seed % 2 ? NEON : CYAN), cx, 8)

  // ── CITY HALL: lobby, reception, flags, portrait wall ─────────
  {
    const R = makeRoom("city:townhall", "City Hall", { w: 25, h: 15, wallH: 5, world: "city", theme: cityTheme("marble", "#232a4a", "#c9a14a", { dark: 0.4 }) })
    const W = R.w * TS
    // central runner + compass medallion
    R.decal((g) => {
      g.fillStyle = "#0b0d1a"; g.fillRect(11 * TS - 1, R.NW * TS, 3 * TS + 2, (R.h - 1 - R.NW) * TS)
      g.fillStyle = "#1f3a7a"; g.fillRect(11 * TS, R.NW * TS, 3 * TS, (R.h - 1 - R.NW) * TS)
      g.fillStyle = "#c9a14a"; g.fillRect(11 * TS + 3, R.NW * TS, 1, (R.h - 1 - R.NW) * TS); g.fillRect(14 * TS - 4, R.NW * TS, 1, (R.h - 1 - R.NW) * TS)
      g.fillStyle = "#c9a14a"; g.beginPath(); g.arc(W / 2, 11 * TS, 22, 0, 7); g.fill(); g.fillStyle = "#14224a"; g.beginPath(); g.arc(W / 2, 11 * TS, 18, 0, 7); g.fill()
      g.fillStyle = "#5de6ff"; g.beginPath(); g.moveTo(W / 2, 11 * TS - 16); g.lineTo(W / 2 + 4, 11 * TS); g.lineTo(W / 2, 11 * TS + 16); g.lineTo(W / 2 - 4, 11 * TS); g.fill()
      g.fillStyle = "#ff4fa3"; g.beginPath(); g.moveTo(W / 2 - 16, 11 * TS); g.lineTo(W / 2, 11 * TS - 4); g.lineTo(W / 2 + 16, 11 * TS); g.lineTo(W / 2, 11 * TS + 4); g.fill()
    })
    R.pool(W / 2, 11 * TS, 90, 44, "255,220,150", 0.12)
    // north wall: tall windows, flags, portrait wall
    win(R, 40, 3, 36, 46); win(R, W - 40, 8, 36, 46)
    R.wallLow(flag("city"), 92, 6); R.wallLow(flag("india"), W - 92, 6)
    const ports: [string, string, string, string, boolean][] = [
      ["#2a6ab0", "SPIT BTECH", "#3a5a9a", "#1a1020", true],
      ["#a05a2a", "BARCLAYS", "#2a2f48", "#3a2a1c", false],
      ["#2a8a6a", "CSI-SPIT", "#8a3a5a", "#1a1020", true],
      ["#8a4ab0", "AIRAVAT", "#c9a14a", "#2a1a10", false],
    ]
    ports.forEach(([bg, cap, shirt, hair, gl], i) => R.wall(portrait(bg, cap, shirt, hair, gl), W / 2 + (i - 1.5) * 40, 6))
    R.light(W / 2, 3 * TS, 150, "255,225,170")
    // reception desk
    const desk = counter(96, "#e8ebf5", "#2d3455", CYAN)
    R.add(desk, W / 2, 8 * TS + 12)
    R.add(monitorOnly(null, NEON), W / 2 - 22, 8 * TS - 20, { solid: false })
    R.add(monitorOnly(exhibitArt(content.projects[0]), NEON), W / 2 + 22, 8 * TS - 20, { solid: false })
    R.wall(bubbleSign("RECEPTION", 54, "#10142a", CYAN, CYAN), W / 2, 4)
    // lounge
    R.add(sofa(42, "#3a4a85"), 3 * TS + 8, 11 * TS + 12); R.add(sofa(42, "#3a4a85"), 21 * TS + 8, 11 * TS + 12, { flip: true })
    R.add(plant(34), 1 * TS + 10, 7 * TS + 12); R.add(plant(34), 23 * TS + 6, 7 * TS + 12)
    R.add(plant(), 8 * TS + 8, 13 * TS + 4); R.add(plant(), 16 * TS + 8, 13 * TS + 4)
    R.add(roundTable("#cfd6e8"), 3 * TS + 8, 9 * TS + 4); R.add(roundTable("#cfd6e8"), 21 * TS + 8, 9 * TS + 4)
    R.light(3 * TS + 8, 9 * TS, 60, "255,200,150", 0.4); R.light(21 * TS + 8, 9 * TS, 60, "255,200,150", 0.4)
    R.light(W / 2, 9 * TS, 110, "190,220,255")
    R.light(40, 3 * TS, 50, "120,160,255"); R.light(W - 40, 3 * TS, 50, "255,120,190")
    R.actors.push(worker("clerk", "Imani at Reception", "girl_c", W / 2 + 4, 7 * TS + 8, {
      lines: [`Welcome to City Hall. I'm Imani, the front desk.`, `${full}: ${content.profile.title.toLowerCase()}, based in ${content.profile.location}.`, content.profile.tagline, `The portrait wall behind me has the milestones. Ask me anything.`],
      action: { type: "section", id: "townhall" },
    }))
    R.actors.push(worker("visitor", "Dev the Visitor", "dude_b", 19 * TS + 8, 10 * TS + 8, { wander: 20, bark: ["Open to collabs and interesting problems, they say."] }))
    R.spot("hall-about", W / 2, 10 * TS + 4, "READ THE CITY RECORD", { type: "section", id: "townhall" }, true, W / 2, 7 * TS + 8)
    R.spot("hall-portraits", W / 2, 6 * TS + 4, "VIEW THE PORTRAIT WALL", { type: "section", id: "townhall" }, true, W / 2, 2 * TS + 2)
    out["city:townhall"] = R.finish()
  }

  // ── PROJECT STUDIO: startup showroom ──────────────────────────
  {
    const list = ordered(content.projects)
    const top = list.slice(0, 6), rest = list.slice(6)
    const PER = 6
    const rows = Math.max(1, Math.ceil(rest.length / PER))
    const w = 31, NW = 6, h = NW + 3 + rows * 5 + 4
    const R = makeRoom("city:gallery", "Project Studio", { w, h, wallH: NW, world: "city", theme: cityTheme("wood", "#1b2140", "#9a7be0", { dark: 0.4 }) })
    const W = w * TS
    R.decal((g) => { g.fillStyle = "#12163a"; g.fillRect(13 * TS, NW * TS, 5 * TS, (h - 1 - NW) * TS); g.fillStyle = "#9a7be0"; for (let y = NW * TS; y < (h - 1) * TS; y += 16) g.fillRect(15 * TS + 6, y + 4, 4, 8); g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(13 * TS, NW * TS, 1, (h - 1 - NW) * TS); g.fillRect(18 * TS - 1, NW * TS, 1, (h - 1 - NW) * TS) })
    const span = W - 2 * TS, pitch = span / Math.max(1, top.length)
    top.forEach((p, i) => {
      const cx = TS + pitch * (i + 0.5)
      const sf = screenFrame(exhibitArt(p), p)
      R.wallLow(sf, cx, 4)
      R.light(cx, NW * TS - 40, 70, "190,170,255")
      R.pool(cx, NW * TS + 10, 40, 10, "154,123,224", 0.16)
      R.spot(`art-${p.id}`, cx, NW * TS + 16, `VIEW ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, cx, NW * TS - sf.height - 22)
    })
    R.wall(neonSign("PROJECT STUDIO", "#9a7be0"), W / 2, 4)
    const podCols = [3, 7.4, 11.8, 19.2, 23.6, 28]
    rest.forEach((p, i) => {
      const row = Math.floor(i / PER), col = i % PER
      const cx = podCols[col] * TS + 8, base = (NW + 3 + row * 5) * TS + 24
      R.add(deskPod(exhibitArt(p), p.accent), cx, base, { solid: [48, 14] })
      R.add(chair(), cx + 17, base + 12, { solid: false })
      R.light(cx, base - 18, 40, "170,200,255", 0.3)
      R.spot(`art-${p.id}`, cx - 6, base + 18, `VIEW ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, cx, base - 46)
      const nm = fitTitle(p, 30), tag = pen(34, 7); tag.r(0, 0, 34, 7, "#10142a"); tag.r(0, 6, 34, 1, palOf(p.accent).a)
      if (nm.micro) drawMicro(tag.x, nm.s, Math.round((34 - nm.w) / 2), 1, "#fff"); else drawText(tag.x, nm.s, Math.round((34 - nm.w) / 2), 0, "#fff")
      R.add(tag.c, cx - 6, base + 2, { solid: false, baseOff: 1 })
    })
    for (const x of [1, 29]) { R.add(plant(34), x * TS + 8, (NW + 2) * TS + 12); R.add(plant(34), x * TS + 8, (h - 3) * TS + 12) }
    R.light(W / 2, (NW + 3) * TS, 140, "200,190,255")
    for (let r = 0; r < rows; r++) R.light(W / 2, (NW + 5 + r * 5) * TS, 90, "190,210,255")
    R.actors.push(worker("founder", "Zoe the Founder", "girl", 16 * TS + 8, (NW + 2) * TS + 6, {
      lines: [`Welcome to the Studio. We ship things here.`, `${first} has ${content.projects.length} projects on show. The six big screens are the headliners: ${top.map((p) => p.title).join(", ")}.`, `Every desk below runs one more. Walk up and press E.`],
      action: { type: "section", id: "gallery" },
    }))
    R.actors.push(worker("dev2", "Kit the Dev", "dude", 15 * TS, (NW + 7) * TS, { wander: 14, bark: ["Ferrite predicts, dry-runs, then asks for consent.", "Sentinel samples under 2.1% CPU."] }))
    out["city:gallery"] = R.finish()
  }

  // ── ROOFTOP CAFE: co-work hub ─────────────────────────────────
  {
    const R = makeRoom("city:tavern", "Rooftop Cafe", { w: 19, h: 14, wallH: 5, world: "city", theme: cityTheme("wood", "#2a1f3a", "#e09a3a", { dark: 0.45 }) })
    win(R, 48, 2, 44, 36); win(R, 128, 5, 44, 36)
    R.wall(neonSign("OPEN LATE", "#e09a3a"), 88, 3)
    const cb = chalkboard("PAST ROLES", content.experience.map((e) => ({ l: `${e.org}`.toUpperCase().slice(0, 12), r: `${e.start.slice(-4)}` })), 104, 52 + Math.max(0, content.experience.length - 3) * 8)
    R.wallLow(cb, 15 * TS, 2)
    R.light(15 * TS, 3 * TS, 60, "255,230,180")
    R.add(counter(96, "#e8d5b0", "#4a2a3a", "#e09a3a"), 5 * TS + 8, 6 * TS + 4)
    R.add(coffeeMachine(), 2 * TS + 12, 5 * TS + 6, { solid: false })
    R.add(pastryCase(44), 8 * TS + 10, 6 * TS + 6, { solid: [40, 8] })
    R.light(5 * TS + 8, 5 * TS + 8, 90, "255,190,120", 0.5)
    const tb: [number, number][] = [[3, 9], [8, 10], [13, 9], [16, 12], [5, 12]]
    tb.forEach(([c, r], i) => {
      R.add(roundTable(i % 2 ? "#cfd6e8" : "#e8d5b0"), c * TS + 8, r * TS + 12, { solid: [18, 8] })
      R.add(stool(i % 2 ? NEON : CYAN), c * TS - 6, r * TS + 14, { solid: false }); R.add(stool(i % 2 ? CYAN : NEON), c * TS + 22, r * TS + 14, { solid: false })
      R.light(c * TS + 8, r * TS + 2, 40, "255,200,140", 0.4)
    })
    R.add(plant(34), 1 * TS + 8, 7 * TS + 12); R.add(plant(34), 17 * TS + 8, 11 * TS + 12)
    R.add(sofa(42, "#d06a3a"), 15 * TS + 8, 7 * TS + 14, {})
    R.pool(14 * TS, 8 * TS, 70, 30, "255,150,200", 0.1)
    R.actors.push(worker("barista", "Nora the Barista", "girl_b", 6 * TS + 8, 5 * TS + 10, {
      lines: [`Flat white? The rooftop crowd runs on them.`, `This board lists ${first}'s past roles: ${content.experience.map((e) => `${e.role} at ${e.org}`).join("; ")}.`, `Look at the chalkboard, or press E on me for the full story.`],
      action: { type: "section", id: "tavern" },
    }))
    R.actors.push(worker("freelancer", "Ravi at the Laptop", "runner_b", 8 * TS + 8, 9 * TS + 10, { facing: "down", bark: ["Barclays: GitLab CI/CD, Helm, Kubernetes.", "Vendex took a reel to a supplier shortlist in about 60 s."] }))
    R.spot("roles", 15 * TS, 6 * TS + 4, "READ THE ROLES BOARD", { type: "section", id: "tavern" }, true, 15 * TS, 3 * TS - 2)
    out["city:tavern"] = R.finish()
  }

  // ── HARDWARE LAB ──────────────────────────────────────────────
  {
    const groups = content.skills
    const cols = Math.max(3, Math.ceil(groups.length / 2))
    const w = Math.max(21, cols * 4 + 9), NW = 6
    const R = makeRoom("city:forge", "Hardware Lab", { w, h: 17, wallH: NW, world: "city", theme: cityTheme("epoxy", "#1c2230", "#e2683a", { dark: 0.5 }) })
    const W = w * TS
    R.wall(neonSign("HARDWARE LAB", "#e2683a"), W / 2, 4)
    win(R, 3 * TS, 4, 40, 38)
    ;[0, 1, 2].forEach((k) => { const p = content.projects[k]; R.wallLow(posterArt(shrink(exhibitArt(p), 0.75), p.accent, p), (8 + k * 4.2) * TS, 3) })
    ;[2, 4].forEach((c, i) => R.add(serverRack(), c * TS - 4, (NW + 1) * TS + 12, { anim: { frames: 4, fps: 3 + i, dx: 26 }, solid: [20, 8] }))
    R.light(3 * TS - 4, (NW + 1) * TS, 70, "90,255,170", 0.8)
    groups.forEach((gr, i) => {
      const row = i < cols ? 0 : 1, col = i % cols
      const cx = 7 * TS + col * 4 * TS + 8, by = (NW + 4 + row * 4) * TS
      const acc = ["#ff4fa3", "#5de6ff", "#e2683a", "#9a7be0", "#58c46a", "#ffd76a"][i % 6]
      R.add(binCabinet(gr.group.toUpperCase(), acc, Math.min(9, gr.items.length)), cx, by, { solid: [48, 10] })
      R.light(cx, by - 30, 44, "255,230,200", 0.4)
      R.spot(`skills-${i}`, cx, by + 14, `INSPECT ${gr.group.toUpperCase()}`, { type: "section", id: "forge", focus: gr.group }, true, cx, by - 66)
    })
    R.add(workbench(60, ["solder", "board", "tools"]), W - 3 * TS - 8, (NW + 2) * TS + 4, { solid: [56, 10] })
    R.add(scopeStrip(), W - 3 * TS + 34, (NW + 2) * TS + 2, { anim: { frames: 4, fps: 6, dx: 28 }, solid: [24, 8] })
    R.add(workbench(52, ["laptop", "board"]), W - 3 * TS, (NW + 7) * TS, { solid: [48, 10] })
    R.light(W - 3 * TS, (NW + 1) * TS, 80, "255,170,100", 0.8); R.light(W - 3 * TS, (NW + 5) * TS, 70, "190,230,255")
    R.light(W / 2, 12 * TS, 130, "255,225,190"); R.light(9 * TS, (NW + 2) * TS, 90, "255,230,200")
    R.add(plant(), 1 * TS + 8, 15 * TS + 4)
    R.pool(W / 2, 14 * TS, 80, 20, "255,230,160", 0.08)
    R.actors.push(worker("engineer", "Bo the Engineer", "worker", 8 * TS + 8, (NW + 2) * TS + 4, {
      lines: [`Mind the cables. Safety glasses on.`, `The bins hold ${first}'s toolkit: ${groups.map((g) => g.group).join(", ")}.`, `Top of the list: TypeScript, Python, Rust. Press E on a bin to see the full inventory.`],
      action: { type: "section", id: "forge" },
    }))
    out["city:forge"] = R.finish()
  }

  // ── UNIVERSITY: lecture hall + library + trophy cabinet ───────
  {
    const NW = 6
    const R = makeRoom("city:academy", "University", { w: 23, h: 17, wallH: NW, world: "city", theme: cityTheme("carpet", "#1f2646", "#3fb3a6", { dark: 0.38 }) })
    const edu = content.education[0]
    const ach = content.achievements.filter((a) => a.kind === "hackathon")
    win(R, 2 * TS + 4, 6, 28, 40); win(R, 21 * TS - 4, 11, 28, 40)
    R.wall(projectorScreen(112, ["B.TECH COMP SCI", "SPIT MUMBAI", "CGPA 9.68/10", `${edu.start.slice(-4)} - ${edu.end.slice(-4)}`]), 8 * TS, 3)
    R.wall(bubbleSign("LIBRARY", 44, "#10142a", "#ffd76a", "#ffd76a"), 16.5 * TS, 4)
    R.light(8 * TS, 3 * TS, 100, "210,230,255")
    ;[13, 15, 17, 19].forEach((c, i) => R.add(bookcase(34, 62, i * 2 + 1), c * TS + 8, NW * TS + 10, { solid: [32, 8] }))
    R.light(16.5 * TS, 5 * TS, 80, "255,215,160", 0.6)
    R.add(lecternDesk(), 8 * TS + 8, (NW + 1) * TS + 8, { solid: [20, 8] })
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const cx = (3.5 + c * 2.7) * TS, by = (NW + 4 + r * 2.1) * TS
      R.add(studentDesk(), cx, by, { solid: [26, 8] }); R.add(benchSeat(), cx, by + 12, { solid: false })
    }
    for (let k = 0; k < 2; k++) { R.add(roundTable("#d8c8a0"), (15 + k * 4) * TS + 8, 10 * TS + 12, { solid: [18, 8] }); R.light((15 + k * 4) * TS + 8, 10 * TS + 4, 44, "255,215,160", 0.4) }
    R.add(stool("#3fb3a6"), 14 * TS + 4, 11 * TS + 4, { solid: false }); R.add(stool("#ffd76a"), 21 * TS - 2, 11 * TS + 4, { solid: false })
    R.add(trophyCabinet(64, 68, 8), 16 * TS + 4, 15 * TS + 4, { solid: [60, 10] })
    R.add(trophyCabinet(64, 68, Math.min(8, ach.length)), 20 * TS, 15 * TS + 4, { solid: [60, 10] })
    R.light(18 * TS, 13 * TS, 90, "255,236,180", 0.5)
    R.add(plant(34), 1 * TS + 8, 15 * TS + 6)
    R.actors.push(worker("prof", "Prof. Alvi", "elder_b", 10 * TS + 8, (NW + 1) * TS + 8, {
      lines: [`Take a seat. ${first} studies ${edu.degree} ${edu.field} at SPIT, ${edu.place}.`, `${edu.note}`, `There is also a minor in management at SPJIMR, running alongside. Honours are in the cabinets.`],
      action: { type: "section", id: "academy" },
    }))
    R.actors.push(worker("student", "Tess the Student", "kid_b", 5 * TS, 13 * TS, { wander: 12, bark: ["1st place at AIRAVAT '26 for NeuroCred.", "Pull Shark twice over!"] }))
    R.spot("lecture", 8 * TS + 8, (NW + 3) * TS, "ATTEND THE LECTURE", { type: "section", id: "academy" }, true, 8 * TS, NW * TS - 4)
    R.spot("trophies", 18 * TS, 15 * TS + 10, "VIEW HONOURS", { type: "section", id: "academy", focus: "honours" }, true, 18 * TS, 11 * TS + 12)
    out["city:academy"] = R.finish()
  }

  // ── POST OFFICE ───────────────────────────────────────────────
  {
    const R = makeRoom("city:wizard", "Post Office", { w: 19, h: 14, wallH: 5, world: "city", theme: cityTheme("vinyl", "#2b2540", "#8e66e8", { dark: 0.34 }) })
    const W = R.w * TS
    win(R, 40, 14, 40, 36); win(R, W - 40, 6, 40, 36)
    R.wallLow(pigeonholes(7, 3, 2), W / 2, 6)
    R.wall(bubbleSign("POST OFFICE", 70, "#10142a", "#ffffff", "#8e66e8"), W / 2, 3)
    R.wall(bubbleSign("PARCELS", 36, "#10142a", "#ffd76a", "#ffd76a"), 15 * TS, 30)
    R.light(W / 2, 3 * TS, 100, "255,230,190")
    R.add(counter(96, "#ebe3d0", "#5a3a8a", "#8e66e8"), 5 * TS + 8, 7 * TS + 2)
    R.add(counter(60, "#ebe3d0", "#5a3a8a", "#8e66e8"), 15 * TS, 7 * TS + 2)
    R.add(monitorOnly(null, "#8e66e8"), 3 * TS + 8, 6 * TS + 6, { solid: false })
    R.add(parcel(26, 18, "#b4854a"), 2 * TS + 4, 12 * TS + 4); R.add(parcel(20, 14, "#6a8ab4"), 3 * TS + 10, 12 * TS + 4); R.add(parcel(22, 14, "#c8624a"), 2 * TS + 12, 12 * TS - 4, { solid: false })
    R.add(parcel(28, 20, "#b4854a"), 16 * TS + 4, 12 * TS + 6); R.add(parcel(18, 14, "#9a7be0"), 16 * TS + 2, 12 * TS - 6, { solid: false })
    const mb = pen(18, 30); shadow(mb, 2, 27, 14); box(mb, 3, 0, 12, 18, "#2a4aa0"); mb.r(4, 1, 10, 1, "#6a8aff"); mb.r(5, 7, 8, 2, "#0b0d1a"); box(mb, 7, 18, 4, 9, "#1a2a5a"); mb.r(6, 3, 6, 2, "#ffd76a")
    R.add(mb.c, 12 * TS + 8, 11 * TS + 12, { solid: [14, 6] })
    R.add(plant(), 1 * TS + 8, 9 * TS + 8); R.add(plant(), 17 * TS + 8, 9 * TS + 8)
    R.add(roundTable("#e8e0cc"), 8 * TS + 8, 11 * TS + 4, { solid: [18, 8] })
    R.light(5 * TS, 8 * TS, 80, "255,225,190"); R.light(15 * TS, 8 * TS, 60, "255,225,190"); R.light(W / 2, 11 * TS, 100, "255,240,210")
    R.decal((g) => { g.fillStyle = "#e8b020"; for (let y = 9 * TS; y < 13 * TS; y += 8) { g.fillRect(6 * TS, y, 2, 4); g.fillRect(12 * TS - 2, y, 2, 4) } })
    R.actors.push(worker("postal", "Pia the Postmaster", "girl_b", 5 * TS + 8, 6 * TS + 8, {
      lines: [`Post Office, how can I help?`, `Need to reach ${first}? Mail ${content.socials.email}, or find the links on the form.`, content.profile.availability + ". Replies are fast."],
      action: { type: "section", id: "wizard" },
    }))
    R.actors.push(worker("courier", "Kai the Courier", "runner", 14 * TS, 10 * TS + 6, { wander: 18, bark: ["Parcels for Ferrite HQ? Always.", "Letters go out at six."] }))
    R.spot("mailbox", 12 * TS + 8, 12 * TS + 10, "WRITE A LETTER", { type: "section", id: "wizard" }, true, 12 * TS + 8, 8 * TS + 8)
    R.spot("counter", 5 * TS + 8, 8 * TS + 6, "SEND A MESSAGE", { type: "section", id: "wizard" }, true, 5 * TS + 8, 4 * TS + 2)
    out["city:wizard"] = R.finish()
  }

  void canvas; void mix; void projectIcon; void arrowFloor; void L; void floorRug
  return out
}

export const CITY_INTERIOR_PRELOAD = [...PEOPLE.map(personSheet), ...PEOPLE.map(personFace)]
