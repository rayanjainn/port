// Hearthvale Forge: a proper smithy. A stone forge with a glowing fire, anvil, quench barrel, tool walls and one labelled
// weapon rack per skill group (each keeps its `skills-<i>` hotspot).
import type { Portfolio } from "@/lib/content"
import { CHARS } from "@/lib/na"
import { drawMicro, drawText } from "./exhibits"
import { TS, type Scene } from "./core"
import { makeRoom, npc, pen, shadow, shade, strip, type Pen } from "./interiors-kit"
import { INK, WOOD, WOOD_D, WOOD_L, WOOD_LL, GOLD, GOLD_D, villageTheme, prop, rug, flame } from "./interiors-village-kit"

const STEEL = "#c8d0d8", STEEL_D = "#7a8694", STEEL_L = "#eef2f6"

type Tool = "katana" | "sword" | "rapier" | "hammer" | "axe" | "pick" | "spear" | "tongs" | "shield" | "saw" | "wrench" | "wand"
/** a hanging tool, blade/head up, ~9 px wide; (x, y) is its top-left */
function tool(P: Pen, kind: Tool, x: number, y: number) {
  const o = (cx: number, cy: number, w: number, h: number, c: string) => { P.r(cx - 1, cy - 1, w + 2, h + 2, INK); P.r(cx, cy, w, h, c) }
  switch (kind) {
    case "sword": case "katana": case "rapier": {
      const bl = kind === "rapier" ? 22 : 19, bw = kind === "rapier" ? 1 : 3
      o(x + 4 - Math.floor(bw / 2), y, bw, bl, STEEL); P.r(x + 4 - Math.floor(bw / 2), y, 1, bl, STEEL_L)
      if (kind === "katana") { P.p(x + 5, y + 1, STEEL); P.p(x + 6, y + 2, STEEL_D) }
      o(x + 1, y + bl, 7, 2, kind === "katana" ? GOLD : "#a8382e"); P.r(x + 1, y + bl, 7, 1, shade(GOLD, 0.3))
      o(x + 3, y + bl + 2, 3, 6, kind === "katana" ? "#2a2a6a" : "#6a3a1c"); P.p(x + 4, y + bl + 8, GOLD)
      break
    }
    case "hammer": o(x + 4, y + 8, 1, 22, WOOD_L); o(x, y + 2, 9, 7, STEEL_D); P.r(x + 1, y + 3, 7, 1, STEEL_L); P.r(x + 1, y + 7, 7, 1, "#4a5460"); break
    case "axe": o(x + 3, y + 3, 2, 26, WOOD_L); P.poly([[x + 5, y + 2], [x + 9, y], [x + 10, y + 10], [x + 5, y + 8]], INK); P.poly([[x + 5, y + 3], [x + 9, y + 1], [x + 9, y + 9], [x + 5, y + 7]], STEEL); P.r(x + 9, y + 1, 1, 8, STEEL_L); break
    case "pick": o(x + 4, y + 4, 1, 24, WOOD_L); P.poly([[x - 1, y + 5], [x + 4, y + 1], [x + 9, y + 5], [x + 9, y + 7], [x + 4, y + 4], [x - 1, y + 7]], INK); P.poly([[x, y + 5], [x + 4, y + 2], [x + 8, y + 5], [x + 4, y + 4]], STEEL); break
    case "spear": o(x + 4, y + 8, 1, 24, WOOD_L); P.poly([[x + 2, y + 9], [x + 4.5, y], [x + 7, y + 9]], INK); P.poly([[x + 3, y + 9], [x + 4.5, y + 2], [x + 6, y + 9]], STEEL); P.r(x + 4, y + 3, 1, 5, STEEL_L); break
    case "tongs": P.line(x + 3, y, x + 1, y + 24, INK, 3); P.line(x + 5, y, x + 7, y + 24, INK, 3); P.line(x + 3, y, x + 1, y + 24, STEEL_D); P.line(x + 5, y, x + 7, y + 24, STEEL); P.r(x + 3, y - 1, 3, 3, STEEL_D); break
    case "shield": P.poly([[x - 1, y + 2], [x + 10, y + 2], [x + 10, y + 12], [x + 4.5, y + 20], [x - 1, y + 12]], INK); P.poly([[x, y + 3], [x + 9, y + 3], [x + 9, y + 11], [x + 4.5, y + 18], [x, y + 11]], "#a8382e"); P.r(x + 4, y + 4, 1, 12, GOLD); P.r(x + 1, y + 8, 7, 1, GOLD); break
    case "saw": o(x + 1, y + 2, 7, 16, STEEL); for (let i = 0; i < 8; i++) P.p(x + 8, y + 3 + i * 2, STEEL_D); o(x + 2, y + 18, 5, 6, WOOD_L); break
    case "wrench": o(x + 4, y + 7, 2, 20, STEEL_D); o(x + 1, y + 1, 8, 7, STEEL); P.r(x + 4, y + 1, 2, 4, "#2a1c14"); break
    case "wand": o(x + 4, y + 6, 1, 20, WOOD_L); P.spark(x + 4, y + 3, "#9ad8ff", true); break
  }
}
const RACK_SETS: Tool[][] = [
  ["katana", "sword", "rapier", "katana"], ["hammer", "axe", "pick", "hammer"], ["spear", "sword", "shield", "spear"],
  ["pick", "tongs", "pick", "saw"], ["wrench", "hammer", "tongs", "wrench"], ["wand", "sword", "rapier", "wand"],
]

/** the group's name for the plate: whole in the big face, else the small face, else two lines split at a space (keeps "&" and "/") */
function plateLines(label: string, max: number): { lines: string[]; micro: boolean } {
  const t = label.toUpperCase().replace(/[^A-Z0-9 &/'.\-]/g, "")
  if (t.length * 6 - 1 <= max) return { lines: [t], micro: false }
  if (t.length * 4 - 1 <= max) return { lines: [t.replace(/&/g, "+")], micro: true }
  const ws = t.replace(/&/g, "+").split(" ")
  let best = [t], bw = 1e9
  for (let k = 1; k < ws.length; k++) {
    const x = ws.slice(0, k).join(" "), y = ws.slice(k).join(" "), wd = Math.max(x.length, y.length) * 4 - 1
    if (wd < bw) { best = [x, y]; bw = wd }
  }
  return { lines: best, micro: true }
}

/** a weapon rack: a rail of hanging tools, an oak backboard with the group's weapons, and a brass-edged plate with its name */
function rack(label: string, idx: number): HTMLCanvasElement {
  const W = 58, TH = 24, BH = 36, H = TH + 52
  const P = pen(W, H)
  // tool rail
  P.r(0, 0, W, 3, INK); P.r(1, 1, W - 2, 1, WOOD_L)
  const kinds = ([["tongs", "hammer", "saw", "wrench", "tongs"], ["hammer", "pick", "tongs", "saw", "wrench"], ["saw", "tongs", "hammer", "wrench", "pick"]] as Tool[][])[idx % 3]
  kinds.forEach((k, i) => {
    const sub = pen(11, 30)
    tool(sub, k, 1, 1)
    P.r(5 + i * 11, 3, 1, 2, "#3a2a1c")
    P.x.drawImage(sub.c, 0, 0, 11, 19, 1 + i * 11, 4, 11, 19)
  })
  const oy = TH
  P.r(0, oy, W, BH, INK); P.r(1, oy + 1, W - 2, BH - 2, WOOD_L); P.r(1, oy + 1, W - 2, 1, WOOD_LL)
  P.r(3, oy + 3, W - 6, BH - 6, "#3a2010")
  for (let x = 4; x < W - 4; x += 8) { P.r(x, oy + 4, 1, BH - 8, "#4a2a14"); P.r(x + 1, oy + 4, 1, BH - 8, "#2a1608") }
  P.r(3, oy + BH - 5, W - 6, 2, WOOD); P.r(3, oy + BH - 5, W - 6, 1, WOOD_LL)
  P.r(3, oy + 5, W - 6, 2, WOOD); P.r(3, oy + 5, W - 6, 1, WOOD_LL)
  const set = RACK_SETS[idx % RACK_SETS.length]
  set.forEach((k, i) => tool(P, k, 8 + i * 12, oy + (k === "katana" || k === "sword" || k === "rapier" ? 4 : 5)))
  for (const x of [5, W - 7]) { P.p(x, oy + 6, GOLD); P.p(x, oy + BH - 4, GOLD) }
  // plate
  const f = plateLines(label, W - 6), py = oy + BH, ph = H - py
  P.r(0, py, W, ph, INK); P.r(1, py + 1, W - 2, ph - 2, WOOD); P.r(1, py + 1, W - 2, 1, WOOD_LL); P.r(1, H - 2, W - 2, 1, WOOD_D)
  P.r(3, py, 1, 3, "#3a2a1c"); P.r(W - 4, py, 1, 3, "#3a2a1c")
  P.p(2, py + 2, GOLD); P.p(W - 3, py + 2, GOLD); P.p(2, H - 3, GOLD); P.p(W - 3, H - 3, GOLD)
  const lh = f.micro ? 5 : 7
  const total = f.lines.length * lh + (f.lines.length - 1) * 1
  f.lines.forEach((l, i) => {
    const y = py + Math.round((ph - total) / 2) + i * (lh + 1)
    const wpx = f.micro ? l.length * 4 - 1 : l.length * 6 - 1
    if (f.micro) drawMicro(P.x, l, Math.round((W - wpx) / 2), y, "#f8e4b0", INK); else drawText(P.x, l, Math.round((W - wpx) / 2), y, "#f8e4b0", INK)
  })
  return P.c
}
/** a low bench of finished pieces under each rack */
function bench(w = 48): HTMLCanvasElement {
  const P = pen(w, 16)
  shadow(P, 2, 13, w - 4)
  P.r(2, 8, 3, 6, INK); P.r(w - 5, 8, 3, 6, INK)
  P.r(0, 4, w, 6, INK); P.r(1, 5, w - 2, 4, WOOD_L); P.r(1, 5, w - 2, 1, WOOD_LL); P.r(1, 8, w - 2, 1, WOOD_D)
  // a few finished blades and a whetstone laid on top
  P.r(4, 2, 14, 2, INK); P.r(5, 2, 12, 1, STEEL); P.r(14, 1, 5, 3, INK); P.r(15, 2, 3, 1, "#a8382e")
  P.r(24, 1, 8, 4, INK); P.r(25, 2, 6, 2, "#8a8a96"); P.r(w - 14, 2, 8, 3, INK); P.r(w - 13, 3, 6, 1, STEEL)
  return P.c
}
function forgeHearth(): HTMLCanvasElement {
  const W = 84, H = 72
  const P = pen(W, H)
  shadow(P, 2, H - 3, W - 4)
  // soot-dark stone body and an arched mouth
  P.r(4, 6, W - 8, H - 8, INK)
  for (let y = 7; y < H - 4; y += 6) for (let x = 5 + ((y / 6) % 2 ? 6 : 0) - 6; x < W - 5; x += 12) {
    const x0 = Math.max(5, x), x1 = Math.min(W - 5, x + 11)
    P.r(x0, y, x1 - x0, 5, ((x + y) % 5 < 2) ? "#6e6058" : "#5e5048"); P.r(x0, y, x1 - x0, 1, "#8a7a6c"); P.r(x0, y + 4, x1 - x0, 1, "#3a2e28")
  }
  // hood
  P.poly([[10, 0], [W - 10, 0], [W - 4, 14], [4, 14]], INK); P.poly([[12, 1], [W - 12, 1], [W - 7, 13], [7, 13]], "#4a3a34"); P.r(12, 1, W - 24, 1, "#6a5a52")
  // mouth
  P.r(16, 24, W - 32, 40, INK)
  P.poly([[16, 28], [24, 22], [W - 24, 22], [W - 16, 28]], INK)
  P.r(18, 28, W - 36, 34, "#1a0c06")
  // coal bed
  P.r(18, 54, W - 36, 8, "#3a1408")
  for (let x = 20; x < W - 22; x += 4) { P.r(x, 54 + (x % 3), 3, 2, "#d8501a"); P.p(x + 1, 54 + (x % 3), "#ffb040") }
  // front slab and iron trim
  P.r(2, 62, W - 4, 10, INK); P.r(3, 63, W - 6, 8, "#7a6a60"); P.r(3, 63, W - 6, 1, "#a8967e")
  P.r(14, 22, 2, 42, STEEL_D); P.r(W - 16, 22, 2, 42, STEEL_D)
  for (let y = 26; y < 62; y += 9) { P.p(14, y, GOLD_D); P.p(W - 15, y, GOLD_D) }
  // poker and tongs leaning on the side
  P.r(W - 10, 20, 2, 40, INK); P.r(W - 9, 21, 1, 38, STEEL_D)
  return P.c
}
const forgeFire = () => strip(52, 34, 4, (P, f) => {
  const sw = [0, 1, 0, -1][f]
  P.ell(26, 31, 22, 4, "rgba(255,90,20,.5)")
  for (const [cx, w, h] of [[10, 9, 14], [20, 12, 22], [31, 11, 26], [42, 9, 16]] as [number, number, number][]) flame(P, cx + sw * (cx % 2 ? 1 : -1), 31, w, h, f + cx)
  for (let i = 0; i < 7; i++) P.p(8 + ((i * 11 + f * 7) % 36), 4 + ((i * 13 + f * 5) % 22), i % 2 ? "#ffe070" : "#ff7a30")
})
function anvil(): HTMLCanvasElement {
  const P = pen(34, 32)
  shadow(P, 4, 29, 26)
  // oak stump
  P.r(8, 18, 18, 12, INK); P.r(9, 19, 16, 10, "#7a4a26"); P.r(9, 19, 2, 10, "#a8703c"); P.r(23, 19, 2, 10, "#4a2a14"); P.ell(17, 19, 8, 2, "#b8864a"); P.r(10, 25, 14, 1, "#4a2a14")
  // anvil body: waist, face, horn
  P.poly([[3, 8], [30, 8], [33, 11], [22, 13], [21, 18], [26, 20], [8, 20], [13, 18], [13, 13], [6, 12]], INK)
  P.poly([[4, 9], [29, 9], [31, 11], [21, 12], [20, 18], [24, 19], [10, 19], [14, 18], [14, 12], [7, 11]], STEEL_D)
  P.r(5, 9, 23, 1, STEEL_L); P.r(5, 10, 23, 1, STEEL)
  // a bar of hot iron on the face
  P.r(12, 6, 11, 3, INK); P.r(13, 7, 9, 1, "#ff9a2a"); P.r(14, 7, 5, 1, "#ffe070")
  return P.c
}
const sparks = () => strip(22, 20, 4, (P, f) => {
  for (let i = 0; i < 6; i++) {
    const a = (i * 1.1 + f * 0.7), r = 3 + ((i * 5 + f * 4) % 9)
    P.p(11 + Math.round(Math.cos(a) * r * 0.9), 15 - Math.abs(Math.round(Math.sin(a) * r)), i % 2 ? "#ffe070" : "#ff8a30")
  }
})
function quenchBarrel(): HTMLCanvasElement {
  const P = pen(26, 32)
  shadow(P, 2, 29, 22)
  P.r(2, 8, 22, 22, INK); P.r(3, 9, 20, 20, "#7a4a26"); P.r(3, 9, 3, 20, "#a8703c"); P.r(20, 9, 3, 20, "#4a2a14")
  for (const y of [11, 25]) { P.r(2, y, 22, 3, INK); P.r(3, y + 1, 20, 1, STEEL_D) }
  for (let x = 8; x < 22; x += 5) P.r(x, 14, 1, 10, "#4a2a14")
  P.ell(13, 8, 11, 4, INK); P.ell(13, 8, 10, 3, "#3a6a8a"); P.ell(13, 8, 8, 2, "#5aa4c8"); P.r(8, 7, 5, 1, "#9ad8ff")
  return P.c
}
const steam = () => strip(18, 26, 4, (P, f) => {
  for (let i = 0; i < 3; i++) {
    const y = 22 - ((f * 4 + i * 8) % 22), x = 9 + Math.round(Math.sin((y + i * 3) / 3) * 3) + (i - 1) * 3
    const a = 0.55 - (22 - y) / 60
    P.a(Math.max(0.1, a)); P.disc(x, y, 2 + (i % 2), "#e8f0f8"); P.a(1)
  }
})
function grindstone(): HTMLCanvasElement {
  const P = pen(28, 30)
  shadow(P, 2, 27, 24)
  P.r(3, 12, 3, 15, INK); P.r(4, 12, 1, 14, WOOD); P.r(22, 12, 3, 15, INK); P.r(23, 12, 1, 14, WOOD)
  P.r(2, 24, 24, 3, INK); P.r(3, 25, 22, 1, WOOD_L)
  P.disc(14, 14, 10, INK); P.disc(14, 14, 9, "#9a9aa6"); P.disc(14, 14, 6, "#8a8a96"); P.disc(14, 14, 2, INK)
  P.ring(14, 14, 8, "#b8b8c4"); P.line(14, 14, 20, 8, INK); P.r(20, 6, 3, 3, WOOD_L)
  return P.c
}
function workTable(w = 44): HTMLCanvasElement {
  const P = pen(w, 30)
  shadow(P, 2, 27, w - 4)
  P.r(3, 16, 4, 11, INK); P.r(w - 7, 16, 4, 11, INK); P.r(4, 17, 2, 9, WOOD)
  P.r(0, 12, w, 7, INK); P.r(1, 13, w - 2, 5, WOOD_L); P.r(1, 13, w - 2, 1, WOOD_LL); P.r(1, 17, w - 2, 1, WOOD_D)
  // a hammer, a vice, an unfinished blade
  P.r(5, 8, 12, 2, INK); P.r(6, 9, 10, 1, STEEL); P.r(13, 5, 6, 5, INK); P.r(14, 6, 4, 3, STEEL_D)
  P.r(24, 4, 9, 8, INK); P.r(25, 5, 7, 6, STEEL_D); P.r(25, 5, 7, 1, STEEL_L); P.r(27, 2, 3, 3, INK)
  P.r(w - 9, 9, 7, 3, INK); P.r(w - 8, 10, 5, 1, "#ff9a2a")
  return P.c
}
function coalBin(): HTMLCanvasElement {
  const P = pen(26, 22)
  shadow(P, 1, 19, 24)
  P.r(1, 8, 24, 11, INK); P.r(2, 9, 22, 9, WOOD); P.r(2, 9, 22, 1, WOOD_LL); P.r(2, 14, 22, 1, WOOD_D)
  for (let x = 3; x < 22; x += 3) { P.r(x, 4 + (x % 4), 3, 5, "#1a1418"); P.p(x + 1, 5 + (x % 4), "#5a4a56") }
  return P.c
}
/** an iron fire bowl on a tripod; the flame is a separate strip */
function fireBowl(): HTMLCanvasElement {
  const P = pen(22, 26)
  shadow(P, 3, 23, 16)
  P.line(5, 12, 3, 24, INK, 2); P.line(16, 12, 18, 24, INK, 2); P.line(10, 14, 10, 24, INK, 2)
  P.line(5, 12, 3, 24, STEEL_D); P.line(16, 12, 18, 24, STEEL_D)
  P.poly([[1, 6], [20, 6], [17, 15], [4, 15]], INK); P.poly([[2, 7], [19, 7], [16, 14], [5, 14]], "#4a4a56"); P.r(2, 7, 17, 1, STEEL)
  P.ell(10, 7, 8, 2, "#2a1408")
  for (let x = 4; x < 17; x += 3) P.p(x, 6 + (x % 2), "#ff7a30")
  return P.c
}
const bowlFlame = () => strip(22, 24, 4, (P, f) => {
  flame(P, 11, 22, 11, 14, f); flame(P, 6, 22, 6, 8, f + 1); flame(P, 16, 22, 6, 9, f + 2)
})
function armourStand(): HTMLCanvasElement {
  const P = pen(26, 42)
  shadow(P, 3, 39, 20)
  P.r(12, 12, 3, 27, INK); P.r(13, 12, 1, 26, WOOD_L); P.r(6, 36, 15, 3, INK); P.r(7, 36, 13, 1, WOOD_L)
  P.r(3, 15, 21, 3, INK); P.r(4, 15, 19, 1, WOOD_L)
  // breastplate and sash, helm on top
  P.poly([[6, 14], [21, 14], [19, 30], [8, 30]], INK); P.poly([[7, 15], [20, 15], [18, 29], [9, 29]], STEEL_D); P.r(8, 16, 4, 10, STEEL); P.r(13, 15, 1, 14, "#4a5460")
  P.r(8, 24, 11, 2, "#a8382e"); P.r(8, 24, 11, 1, "#d85a48")
  P.disc(13, 9, 5, INK); P.disc(13, 9, 4, STEEL); P.r(9, 9, 9, 1, INK); P.r(12, 4, 2, 3, "#a8382e"); P.r(10, 6, 2, 1, STEEL_L)
  return P.c
}
function ingots(): HTMLCanvasElement {
  const P = pen(32, 20)
  shadow(P, 1, 17, 30)
  P.r(2, 14, 28, 3, INK); P.r(3, 14, 26, 2, WOOD_L)
  const bar = (x: number, y: number, hot = false) => { P.r(x, y, 12, 4, INK); P.r(x + 1, y + 1, 10, 2, hot ? "#e8602a" : STEEL_D); P.r(x + 1, y + 1, 10, 1, hot ? "#ffb040" : STEEL_L) }
  bar(4, 10); bar(16, 10, true); bar(10, 6); bar(22, 6); bar(10, 2); bar(16, 6 - 4 + 4 - 4 + 0)
  return P.c
}
function ember(w: number, h: number) {
  return (g: CanvasRenderingContext2D, x: number, y: number) => {
    g.fillStyle = "rgba(30,16,12,.5)"; g.fillRect(x, y, w, h)
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 3 ? "rgba(255,150,60,.25)" : "rgba(255,230,140,.3)"; g.fillRect(x + ((i * 37) % (w - 2)), y + ((i * 53) % (h - 2)), 2, 1) }
  }
}

export function buildForge(content: Portfolio): Scene {
  const full = content.profile.name, first = full.split(" ")[0]
  const groups = content.skills
  const nL = Math.ceil(groups.length / 2), nR = groups.length - nL
  const NW = 6
  const w = Math.max(19, groups.length * 4 + 9), h = 14      // odd, so the doormat sits dead centre under the hearth
  const R = makeRoom("forge", "Forge", { w, h, wallH: NW, world: "village", theme: villageTheme({ wall: "brown", floor: "dark", kind: "stone", base: "#6a5a52", beam: "#2a1a10", dark: 0.5, tint: "60,18,2", glow: 0.38 }) })
  const W = w * TS, cx = W / 2
  const hearthHalf = 44
  // racks hug the hearth on both sides, nearest first
  const leftX = (i: number) => cx - hearthHalf - 8 - 32 - (nL - 1 - i) * 64
  const rightX = (j: number) => cx + hearthHalf + 8 + 32 + j * 64
  void nR

  // ── north wall: hearth stack, tool rails, six labelled racks ──
  groups.forEach((gr, i) => {
    const x = i < nL ? leftX(i) : rightX(i - nL)
    R.wall(rack(gr.group, i), x, 6)
    R.light(x, 54, 44, "255,170,90", 0.6)
    R.add(bench(48), x, (NW + 1) * TS + 2, { solid: [46, 10] })
    R.spot(`skills-${i}`, x, (NW + 2) * TS + 6, `INSPECT ${gr.group.toUpperCase()}`, { type: "section", id: "forge", focus: gr.group })
  })
  // chimney and hearth
  const stack = pen(64, 44)
  stack.r(0, 0, 64, 44, INK)
  for (let y = 0; y < 44; y += 6) for (let x = -6 + ((y / 6) % 2 ? 6 : 0); x < 63; x += 12) {
    const x0 = Math.max(1, x), x1 = Math.min(63, x + 11)
    stack.r(x0, y + 1, x1 - x0, 5, ((x + y) % 5 < 2) ? "#6e6058" : "#5e5048"); stack.r(x0, y + 1, x1 - x0, 1, "#8a7a6c"); stack.r(x0, y + 5, x1 - x0, 1, "#3a2e28")
  }
  R.wall(stack.c, cx, 7)
  R.add(forgeHearth(), cx, (NW + 1) * TS + 2, { solid: [80, 12] })
  R.add(forgeFire(), cx, (NW + 1) * TS - 2, { anim: { frames: 4, fps: 9, dx: 52 }, solid: false, baseOff: 8 })
  R.light(cx, (NW + 1) * TS - 14, 150, "255,110,40", 2)
  R.light(cx, (NW + 3) * TS, 90, "255,130,50", 1.5)

  // ── floor decals ──
  R.decal((g) => {
    ember(96, 48)(g, cx - 48, (NW + 1) * TS + 4)
    rug(g, cx - 16, 9 * TS, 32, 4 * TS, "#6a2a1c", "#3a160c", GOLD, false)
    // iron work plate by the anvil
    const ax = cx + 40, ay = (NW + 4) * TS
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(ax - 24, ay - 6, 52, 36)
    g.fillStyle = "#3a3a44"; g.fillRect(ax - 26, ay - 8, 52, 36); g.fillStyle = "#4a4a56"; g.fillRect(ax - 24, ay - 6, 48, 32)
    g.fillStyle = "rgba(255,255,255,.08)"; for (let x = -22; x < 22; x += 8) for (let y = -4; y < 22; y += 8) g.fillRect(ax + x, ay + y, 3, 1)
    // a wet patch by the quench barrel
    g.fillStyle = "rgba(90,150,190,.28)"; g.beginPath(); g.ellipse(ax + 44, ay + 24, 18, 6, 0, 0, 7); g.fill()
  })
  R.pool(cx, (NW + 3) * TS, 120, 48, "255,110,40", 0.22)

  // ── the smithing floor ──
  const ax = cx + 40, ay = (NW + 4) * TS + 12
  R.add(anvil(), ax, ay, { solid: [26, 8] })
  R.add(sparks(), ax - 2, ay - 22, { anim: { frames: 4, fps: 10, dx: 22 }, solid: false, baseOff: 24 })
  R.light(ax, ay - 14, 70, "255,150,60", 1.8)
  R.add(quenchBarrel(), ax + 44, ay + 4, { solid: [20, 8] })
  R.add(steam(), ax + 44, ay - 22, { anim: { frames: 4, fps: 5, dx: 18 }, solid: false, baseOff: 24 })
  R.add(grindstone(), cx - 56, ay + 2, { solid: [22, 8] })
  R.add(workTable(44), cx - 104, ay + 2, { solid: [40, 10] })
  R.add(coalBin(), cx + 80, (NW + 3) * TS + 6, { solid: [22, 8] })
  // braziers flank the doorway; crates, barrels and logs in the corners
  for (const x of [cx - 52, cx + 52]) {
    R.add(fireBowl(), x, 11 * TS + 14, { solid: [12, 6] })
    R.add(bowlFlame(), x, 11 * TS + 8, { anim: { frames: 4, fps: 8, dx: 22 }, solid: false, baseOff: 8 })
    R.light(x, 11 * TS - 2, 80, "255,130,50", 1.6)
  }
  R.add(armourStand(), cx - 150, 11 * TS + 12, { solid: [14, 6] }); R.add(ingots(), cx + 150, 11 * TS + 10, { solid: [28, 8] })
  R.light(cx + 150, 11 * TS, 40, "255,110,40", 1)
  prop(R, "barrel", 1, NW + 2); prop(R, "crate", 1, NW + 3); prop(R, "crate", 2, NW + 3); prop(R, "logs", 1, 11); prop(R, "cauldron", 1, 9)
  prop(R, "barrel", w - 3, NW + 2); prop(R, "crate", w - 3, NW + 3); prop(R, "crate", w - 2, NW + 3); prop(R, "ricePot", w - 3, 10); prop(R, "bucket", w - 3, 11, { solid: false })

  // ── people ──
  const items = groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.group })))
  const top = [...items].sort((a, b) => b.level - a.level).slice(0, 4)
  const gl = groups.find((g) => /lang/i.test(g.group)) ?? groups[0]
  R.actors.push(npc(CHARS.smith, ax - 30, ay - 8, {
    id: "smith", name: "Smith Kenji", facing: "right",
    lines: [
      `Hot work in here! ${first}'s whole toolkit hangs on these ${groups.length} racks, one per skill group.`,
      `The racks, left to right: ${groups.map((g) => g.group).join(", ")}.`,
      `Sharpest edges in the shop: ${top.map((t) => `${t.name} (${t.level})`).join(", ")}.`,
      `${gl.group}: ${gl.items.slice(0, 5).map((t) => t.name).join(", ")}. Walk up to any rack and press E.`,
    ],
    action: { type: "section", id: "forge" },
  }))
  R.actors.push(npc("Boy", cx - 100, ay - 22, { id: "apprentice", name: "Apprentice Jun", facing: "right", wander: 10, bark: [`${top[0]?.name} is the sharpest blade here.`, "Mind the sparks!", "I only quench. For now."] }))
  return R.finish()
}
