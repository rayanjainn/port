// Hearthvale Tavern: a warm inn with a hearth, a bar with bottles, the quest board of real roles, patrons and a bard.
import type { Portfolio } from "@/lib/content"
import { CHARS, animalSheet } from "@/lib/na"
import { drawText, wrapMicro } from "./exhibits"
import { type Scene } from "./core"
import { TS } from "./core"
import { makeRoom, npc, pen, shadow, shade, strip } from "./interiors-kit"
import {
  INK, WOOD, WOOD_D, WOOD_L, WOOD_LL, PARCH, PARCH_D, PARCH_DD, GOLD, GOLD_D, RED, RED_D,
  villageTheme, prop, text, rug, flame, candle, windowEvening,
} from "./interiors-village-kit"
import { lanternLight, splitCamel, dash } from "./interiors-village-bits"

function fireplace(): HTMLCanvasElement {
  const W = 76, H = 84, Y = 22
  const P = pen(W, H)
  shadow(P, 2, H - 3, W - 4)
  // chimney breast, rising to the ceiling beam
  P.r(8, 0, W - 16, Y + 44, INK)
  for (let y = 0; y < Y + 44; y += 6) for (let x = 9 + ((y / 6) % 2 ? 6 : 0); x < W - 9; x += 12) {
    P.r(x, y + 1, 11, 5, ((x + y) % 5 < 2) ? "#8c7a6a" : "#7a6858"); P.r(x, y + 1, 11, 1, "#a8967e"); P.r(x, y + 5, 11, 1, "#5a4a3c")
  }
  // mantel
  P.r(2, Y + 22, W - 4, 6, INK); P.r(3, Y + 23, W - 6, 4, WOOD_L); P.r(3, Y + 23, W - 6, 1, WOOD_LL); P.r(3, Y + 26, W - 6, 1, WOOD)
  // things on the mantel: clock, mug, candle, jar
  P.r(32, Y + 10, 12, 13, INK); P.r(33, Y + 11, 10, 11, "#e8d4a0"); P.r(34, Y + 12, 8, 9, PARCH); P.r(38, Y + 13, 1, 4, INK); P.r(38, Y + 16, 3, 1, INK)
  P.r(10, Y + 17, 7, 6, INK); P.r(11, Y + 18, 5, 4, "#c8aa70"); P.r(11, Y + 18, 5, 1, "#fff6d0"); P.r(17, Y + 19, 2, 3, "#c8aa70")
  P.r(58, Y + 15, 4, 8, INK); P.r(59, Y + 16, 2, 6, "#f4ecd0"); P.p(60, Y + 14, "#ffe27a"); P.p(60, Y + 13, "#ff9a2a")
  P.r(48, Y + 18, 8, 5, "#6a3a1c"); P.r(49, Y + 19, 6, 3, "#a86a3c")
  // firebox
  P.r(14, Y + 28, W - 28, 30, INK); P.r(16, Y + 30, W - 32, 28, "#140a06")
  P.poly([[14, Y + 28], [W - 14, Y + 28], [W - 16, Y + 31], [16, Y + 31]], "#2a1c14")
  // side pillars and hearth slab
  P.r(8, Y + 28, 6, 30, "#7a6858"); P.r(W - 14, Y + 28, 6, 30, "#7a6858"); P.r(8, Y + 28, 1, 30, "#a8967e"); P.r(W - 9, Y + 28, 1, 30, "#5a4a3c")
  P.r(4, Y + 56, W - 8, 6, INK); P.r(5, Y + 57, W - 10, 4, "#8c7a6a"); P.r(5, Y + 57, W - 10, 1, "#b8a68e")
  // logs
  P.r(22, Y + 49, 32, 6, INK); P.r(23, Y + 50, 30, 4, "#5a3418"); P.r(23, Y + 50, 30, 1, "#8a5a30"); P.ell(24, Y + 52, 2, 2, "#c89860"); P.ell(52, Y + 52, 2, 2, "#c89860")
  return P.c
}
const fireStrip = () => strip(44, 30, 4, (P, f) => {
  const sw = [0, 1, 0, -1][f]
  P.ell(22, 26, 18, 4, "rgba(255,120,30,.35)")
  for (const [cx, w, h] of [[12, 9, 16], [22, 13, 25], [33, 9, 18]] as [number, number, number][]) flame(P, cx + sw, 27, w, h, f + cx)
  for (let i = 0; i < 5; i++) P.p(8 + ((i * 9 + f * 5) % 28), 6 + ((i * 7 + f * 9) % 16), i % 2 ? "#ffd070" : "#ff7a30")
})
function pubTable(w = 40): HTMLCanvasElement {
  const P = pen(w, 26)
  shadow(P, 2, 23, w - 4)
  P.r(4, 14, 3, 9, INK); P.r(5, 14, 1, 8, WOOD_D); P.r(w - 7, 14, 3, 9, INK); P.r(w - 6, 14, 1, 8, WOOD_D)
  P.r(0, 8, w, 7, INK); P.r(1, 9, w - 2, 5, WOOD_L); P.r(1, 9, w - 2, 1, WOOD_LL); P.r(1, 13, w - 2, 1, WOOD)
  P.r(2, 12, w - 4, 3, WOOD_D)
  P.r(8, 3, w - 16, 6, "#a8382e"); P.r(8, 3, w - 16, 1, "#d85a48"); P.r(8, 8, w - 16, 1, RED_D)
  for (const x of [w / 2 - 12, w / 2 + 8]) { P.r(x, 2, 5, 7, INK); P.r(x + 1, 3, 3, 5, "#c8aa70"); P.r(x + 1, 2, 3, 2, "#fff6d0"); P.r(x + 5, 4, 2, 3, INK) }
  P.ell(w / 2, 5, 4, 2, INK); P.ell(w / 2, 5, 3, 1, "#e8e0d0")
  return P.c
}
function barStool(): HTMLCanvasElement {
  const P = pen(12, 16)
  P.ell(6, 14, 5, 2, "rgba(0,0,0,.3)")
  P.r(3, 8, 1, 7, INK); P.r(8, 8, 1, 7, INK); P.r(4, 11, 4, 1, INK)
  P.ell(6, 6, 5, 3, INK); P.ell(6, 5, 4, 2, "#a8382e"); P.r(3, 4, 5, 1, "#d85a48"); P.p(2, 7, GOLD); P.p(10, 7, GOLD)
  return P.c
}
function barCounter(w = 132): HTMLCanvasElement {
  const H = 36
  const P = pen(w, H)
  shadow(P, 2, H - 3, w - 4)
  P.r(0, 14, w, 21, INK); P.r(1, 15, w - 2, 19, WOOD)
  for (let x = 3; x < w - 3; x += 14) { P.r(x, 17, 11, 14, WOOD_D); P.r(x + 1, 18, 9, 12, shade(WOOD, -0.08)); P.r(x + 1, 18, 9, 1, shade(WOOD, 0.22)) }
  P.r(1, 32, w - 2, 2, GOLD_D); P.r(1, 32, w - 2, 1, "#fff0a0")
  P.r(0, 8, w, 8, INK); P.r(1, 9, w - 2, 6, WOOD_L); P.r(1, 9, w - 2, 2, WOOD_LL); P.r(1, 14, w - 2, 1, WOOD_D)
  const mug = (x: number) => { P.r(x, 2, 6, 7, INK); P.r(x + 1, 3, 4, 5, "#c8aa70"); P.r(x + 1, 2, 4, 2, "#fff6d0"); P.r(x + 6, 4, 2, 3, INK) }
  mug(8); mug(18); mug(w - 30); mug(w - 20)
  const bottle = (x: number, col: string) => { P.r(x, 0, 4, 9, INK); P.r(x + 1, 1, 2, 7, col); P.r(x + 1, 0, 2, 3, INK); P.p(x + 1, 3, shade(col, 0.5)) }
  bottle(34, "#3a8a4a"); bottle(40, "#b8782a"); bottle(46, "#3a6ac8")
  P.r(w - 56, 1, 20, 8, INK); P.r(w - 55, 2, 18, 6, "#8a5a30"); P.r(w - 55, 2, 18, 1, "#b8864a"); P.r(w - 49, 2, 1, 6, INK); P.r(w - 43, 2, 1, 6, INK); P.r(w - 58, 4, 3, 2, GOLD)
  P.r(w - 14, 1, 4, 8, INK); P.r(w - 13, 2, 2, 6, "#f4ecd0")
  return P.c
}
function bottleShelf(w = 120): HTMLCanvasElement {
  const H = 46
  const P = pen(w, H)
  P.r(0, 0, w, H, INK); P.r(1, 1, w - 2, H - 2, WOOD_L); P.r(3, 3, w - 6, H - 6, "#2a160a"); P.r(3, 3, w - 6, 1, "#3a2010")
  P.r(3, 8, w - 6, 1, GOLD_D)
  for (let x = 8; x < w - 8; x += 12) { P.r(x, 9, 5, 6, INK); P.r(x + 1, 10, 3, 4, "#c8aa70"); P.r(x + 5, 11, 2, 2, INK); P.p(x + 2, 8, "#fff0a0") }
  const cols = ["#3a8a4a", "#b8782a", "#3a6ac8", "#a8382e", "#9a7be0", "#d8c050"]
  for (const [y, off] of [[18, 0], [32, 3]] as [number, number][]) {
    P.r(3, y + 11, w - 6, 3, WOOD); P.r(3, y + 11, w - 6, 1, WOOD_LL); P.r(3, y + 13, w - 6, 1, INK)
    let i = off
    for (let x = 7; x < w - 9; x += 7 + (i % 3)) {
      const c = cols[i++ % cols.length], tall = 7 + (i % 3) * 2
      P.r(x, y + 11 - tall, 5, tall, INK); P.r(x + 1, y + 12 - tall, 3, tall - 1, c); P.r(x + 1, y + 12 - tall, 1, tall - 1, shade(c, 0.4)); P.r(x + 1, y + 11 - tall - 2, 3, 3, INK); P.p(x + 2, y + 10 - tall, "#e8d4a0")
    }
  }
  return P.c
}
function questBoard(content: Portfolio): HTMLCanvasElement {
  const exp = [...content.experience].slice(0, 3)
  const n = Math.max(3, exp.length), nw = 36, gap = 3
  const W = n * nw + (n + 1) * gap + 6, H = 70
  const P = pen(W, H)
  P.r(0, 0, W, H, INK); P.r(1, 1, W - 2, H - 2, WOOD_L); P.r(1, 1, W - 2, 1, WOOD_LL); P.r(1, H - 2, W - 2, 1, WOOD)
  P.r(3, 3, W - 6, H - 6, INK); P.r(4, 4, W - 8, H - 8, "#9a6a3a")
  for (let y = 5; y < H - 5; y += 4) { P.r(4, y, W - 8, 1, "#8a5a2e"); for (let x = 7 + (y % 8); x < W - 8; x += 17) P.p(x, y + 1, "#b8864a") }
  P.r(W / 2 - 34, 0, 68, 11, INK); P.r(W / 2 - 33, 1, 66, 9, RED); P.r(W / 2 - 33, 1, 66, 1, "#d85a48"); P.r(W / 2 - 33, 9, 66, 1, RED_D)
  drawText(P.x, "QUEST BOARD", Math.round(W / 2 - 32), 2, "#f8e4b0", INK)
  exp.forEach((e, i) => {
    const x = 6 + gap + i * (nw + gap), y = 16 + (i % 2)
    const hh = H - y - 6
    P.r(x + 1, y + 1, nw, hh, "rgba(0,0,0,.3)")
    P.r(x, y, nw, hh, INK); P.r(x + 1, y + 1, nw - 2, hh - 2, i % 2 ? "#f8ecc4" : PARCH)
    P.p(x + 2, y + 2, PARCH_D); P.p(x + nw - 3, y + hh - 3, PARCH_D)
    const o = splitCamel(e.org), role = /intern/i.test(e.role) ? "INTERN" : /head/i.test(e.role) ? "TECH HEAD" : e.role.toUpperCase()
    let ly = y + 5
    for (const l of o.slice(0, 2)) { text(P, l.slice(0, 8), x + 3, ly, "#3a1c0a"); ly += 6 }
    P.r(x + 3, ly, nw - 6, 1, PARCH_DD); ly += 3
    for (const l of wrapMicro(role, 8, 1)) { text(P, l, x + 3, ly, "#8a3a1e"); ly += 6 }
    for (const l of dash(e)) { text(P, l, x + 3, ly, "#5a3a1e"); ly += 6 }
    P.disc(x + nw / 2, y + 1, 1, i % 2 ? "#3a8a4a" : RED); P.p(x + nw / 2 - 1, y, "#fff")
  })
  return P.c
}
const noteStrip = () => strip(12, 18, 4, (P, f) => {
  const y = [0, -1, -2, -1][f] + 3
  P.r(3, 6 + y, 5, 5, "#fff0a0"); P.r(7, 2 + y, 1, 8, "#fff0a0"); P.r(7, 2 + y, 3, 2, "#fff0a0")
  P.r(2, 8 + y, 3, 3, "#ffd45a")
  P.p(9, 12 + y - (f % 2) * 4, "#fff"); P.p(1, 4 + y + (f % 2) * 3, "#fff")
})
function lute(): HTMLCanvasElement {
  const P = pen(10, 18)
  P.ell(5, 12, 4, 4, INK); P.ell(5, 12, 3, 3, "#b8782a"); P.p(5, 12, INK); P.r(4, 9, 2, 1, "#e8c070")
  P.r(5, 1, 1, 9, INK); P.r(4, 0, 3, 2, INK); P.p(5, 0, GOLD)
  return P.c
}

/** the chimney stack that carries on up the wall behind the hearth */
function chimney(w = 60, h = 46): HTMLCanvasElement {
  const P = pen(w, h)
  P.r(0, 0, w, h, INK)
  for (let y = 0; y < h; y += 6) for (let x = 1 + ((y / 6) % 2 ? 6 : 0) - 6; x < w - 1; x += 12) {
    const x0 = Math.max(1, x), x1 = Math.min(w - 1, x + 11)
    P.r(x0, y + 1, x1 - x0, 5, ((x + y) % 5 < 2) ? "#8c7a6a" : "#7a6858"); P.r(x0, y + 1, x1 - x0, 1, "#a8967e"); P.r(x0, y + 5, x1 - x0, 1, "#5a4a3c")
  }
  return P.c
}

/** the Tavern: a warm inn with a hearth, a bar with bottles, the quest board of real roles, patrons and a bard */
export function buildTavern(content: Portfolio): Scene {
  const full = content.profile.name, first = full.split(" ")[0]
  const exp = [...content.experience]
  const NW = 6, w = 27, h = 14
  const R = makeRoom("tavern", "Tavern", { w, h, wallH: NW, world: "village", theme: villageTheme({ wall: "brown", floor: "wood", kind: "plank", base: "#8a5a30", beam: "#3a2010", dark: 0.4, tint: "58,24,6", glow: 0.34 }) })
  const W = w * TS, cx = W / 2

  // ── north wall ──
  R.wall(bottleShelf(120), 88, 12)
  R.light(88, 40, 70, "255,200,120", 0.4)
  lanternLight(R, 156, 8, 60)
  R.wall(windowEvening(32, 50, 3), 184, 10)
  R.light(184, 38, 46, "255,170,110", 0.2)
  lanternLight(R, 290, 8, 60)
  R.wall(questBoard(content), 356, 8)
  R.light(356, 40, 64, "255,226,170", 0.3)
  // fireplace
  R.wall(chimney(60, 46), 244, 7)
  R.add(fireplace(), 244, (NW + 1) * TS + 2, { solid: [68, 10] })
  R.add(fireStrip(), 244, (NW + 1) * TS + 12, { anim: { frames: 4, fps: 8, dx: 44 }, solid: false, baseOff: 8 })
  R.light(244, (NW + 1) * TS + 2, 120, "255,130,50", 1.6)
  R.light(244, (NW + 3) * TS, 70, "255,150,70", 1.2)

  // ── floor: rugs, the bard's stage ──
  R.decal((g) => {
    rug(g, 244 - 44, (NW + 2) * TS + 4, 88, 44, "#8a2a2a", "#5a1818", GOLD, false)
    rug(g, cx - 18, 9 * TS + 4, 36, 3 * TS + 8, "#7a5a2a", "#4a3418", "#e8d49a", false)
    rug(g, 52, 11 * TS - 6, 56, 40, "#3a5a7a", "#223a52", "#e8d49a", false)
    const sx = 328, sy = 9 * TS + 8, sw = 84, sh = 44
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(sx + 2, sy + 3, sw, sh)
    g.fillStyle = INK; g.fillRect(sx - 1, sy - 1, sw + 2, sh + 2)
    g.fillStyle = "#6a3e1e"; g.fillRect(sx, sy, sw, sh - 6)
    for (let x = 0; x < sw; x += 12) { g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(sx + x, sy, 1, sh - 6); g.fillStyle = "rgba(255,210,150,.12)"; g.fillRect(sx + x + 1, sy + 2, 10, 1) }
    g.fillStyle = "#4a2a14"; g.fillRect(sx, sy + sh - 6, sw, 6); g.fillStyle = "#a8382e"; g.fillRect(sx, sy + sh - 5, sw, 3); g.fillStyle = GOLD; g.fillRect(sx, sy + sh - 6, sw, 1)
    for (let x = 4; x < sw - 3; x += 4) { g.fillStyle = GOLD; g.fillRect(sx + x, sy + sh - 2, 1, 2) }
  })
  R.pool(244, (NW + 3) * TS, 80, 32, "255,140,60", 0.2)
  R.pool(370, 11 * TS, 60, 24, "255,220,150", 0.14)

  // ── bar ──
  R.add(barCounter(132), 124, (NW + 3) * TS + 2, { solid: [128, 14] })
  for (const x of [66, 98, 130, 160]) R.add(barStool(), x, (NW + 3) * TS + 22, { solid: [8, 5] })
  R.light(124, (NW + 3) * TS - 8, 70, "255,200,120", 0.5)
  prop(R, "barrel", 1, NW); prop(R, "barrel", 3, NW); prop(R, "barrel", 1, NW + 1); prop(R, "jar", 3, NW + 1); prop(R, "crate", 1, NW + 2)

  // ── tables ──
  const tables: [number, number][] = [[80, 11 * TS + 14], [168, 12 * TS], [286, 11 * TS + 10]]
  tables.forEach(([x, y], i) => {
    R.add(pubTable(40), x, y, { solid: [36, 10] })
    R.add(barStool(), x - 28, y - 2, { solid: false }); R.add(barStool(), x + 28, y - 2, { solid: false })
    R.add(candle(), x + (i % 2 ? 12 : -2), y - 24, { solid: false, baseOff: 12, anim: { frames: 3, fps: 5, dx: 8 } })
    R.light(x, y - 22, 46, "255,190,110", 0.9)
  })
  prop(R, "pottedPlant", 25, 12)
  R.add(lute(), 342, 11 * TS + 8, { solid: false })

  // ── people and animals ──
  R.actors.push({ id: "dog", kind: "animal", sheet: animalSheet("dog"), x: 244, y: (NW + 3) * TS + 10, wander: 8, speed: 8 })
  R.actors.push(npc(CHARS.barkeep, 128, (NW + 1) * TS + 10, {
    id: "barkeep", name: "Barkeep Taro",
    lines: [
      `Pull up a stool, friend! This is the Hearth Inn. Every quest ${first} ever took is pinned on that board.`,
      ...exp.map((e) => `${e.role} at ${e.org} (${e.start} to ${e.end}, ${e.location}). ${e.description}`),
      `Ask the regulars. They love telling these tales.`,
    ],
    action: { type: "section", id: "tavern" },
  }))
  const bark = (i: number, d: string) => [exp[i]?.highlights?.[0] ?? d]
  R.actors.push(npc("Villager2", 80 - 28, 11 * TS + 10, { id: "patron1", name: "Dev the Regular", facing: "right", bark: [...bark(0, "Another round!"), "Another round!"] }))
  R.actors.push(npc("Monk", 168 + 28, 12 * TS - 2, { id: "patron2", name: "Brother Ken", facing: "left", bark: [...bark(1, "A fine evening."), "Heard about the hackathons?"] }))
  R.actors.push(npc("Noble", 286 - 28, 11 * TS + 8, { id: "patron3", name: "Lady Aiko", facing: "right", bark: [...bark(2, "Lovely soup."), "Three posts in a year, and still shipping."] }))
  R.add(noteStrip(), 370, 9 * TS + 4, { anim: { frames: 4, fps: 5, dx: 12 }, solid: false, baseOff: 40 })
  R.actors.push(npc("Child", 370, 10 * TS + 6, {
    id: "bard", name: "Bard Lio", facing: "down",
    lines: [`A song for the road! "${content.profile.motto}"`, `I sing of ${first}'s quests: ${exp.map((e) => e.org).join(", ")}.`],
    bark: [content.profile.motto, "La la, ship it!"],
  }))

  // ── hotspots ──
  R.spot("board", 356, (NW + 1) * TS + 10, "READ QUEST BOARD", { type: "section", id: "tavern" }, true, 356, 76)
  return R.finish()
}
