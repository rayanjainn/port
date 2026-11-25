// Hearthvale Raven Post: a post office with mail cubbies, ravens on perches, a writing desk, parcels and a postmaster host.
import type { Portfolio } from "@/lib/content"
import { CHARS, animalSheet } from "@/lib/na"
import { TS, type Scene } from "./core"
import { makeRoom, npc, pen, shadow, shade, strip, type Pen } from "./interiors-kit"
import { INK, WOOD, WOOD_D, WOOD_L, WOOD_LL, PARCH, PARCH_DD, GOLD, GOLD_D, RED, villageTheme, prop, text, rug, candle, plankSign, windowEvening } from "./interiors-village-kit"
import { lanternLight } from "./interiors-village-bits"

/** micro text with a hand-drawn "@" (the pixel fonts have none) */
function microAt(P: Pen, s: string, x: number, y: number, col: string) {
  let cx = x
  for (const part of s.split(/(@)/)) {
    if (part === "@") {
      for (const [dx, dy] of [[1, 0], [2, 0], [3, 0], [0, 1], [4, 1], [0, 2], [2, 2], [3, 2], [4, 2], [0, 3], [2, 3], [1, 4], [2, 4], [3, 4]] as [number, number][]) P.p(cx + dx, y + dy, col)
      cx += 6
    } else if (part) { text(P, part, cx, y, col); cx += part.length * 4 }
  }
}
const microW = (s: string) => s.split("").reduce((n, ch) => n + (ch === "@" ? 6 : 4), 0) - 1

/** a framed parchment notice with centred micro lines (the first one bold-coloured) */
function notice(w: number, h: number, head: string, lines: string[]) {
  const P = pen(w, h)
  P.r(0, 0, w, h, INK); P.r(1, 1, w - 2, h - 2, WOOD_L); P.r(1, 1, w - 2, 1, WOOD_LL)
  P.r(3, 3, w - 6, h - 6, INK); P.r(4, 4, w - 8, h - 8, PARCH); P.r(4, 4, w - 8, 1, "#fff6d0")
  const mid = (s: string, y: number, col: string) => microAt(P, s, Math.round((w - microW(s)) / 2), y, col)
  mid(head, 8, "#8a3a1e")
  P.r(10, 15, w - 20, 1, PARCH_DD)
  lines.forEach((l, i) => mid(l, 19 + i * 7, i === 0 ? INK : "#5a3a1e"))
  P.disc(w / 2, 2, 1, RED); P.p(w / 2 - 1, 1, "#fff")
  return P.c
}
function routeMap(): HTMLCanvasElement {
  const W = 54, H = 40
  const P = pen(W, H)
  P.r(0, 0, W, H, INK); P.r(1, 1, W - 2, H - 2, WOOD_L); P.r(1, 1, W - 2, 1, WOOD_LL)
  P.r(3, 3, W - 6, H - 6, INK); P.r(4, 4, W - 8, H - 8, "#e4cf98")
  P.poly([[8, 22], [14, 12], [28, 10], [42, 14], [46, 26], [36, 34], [18, 32]], "#a8c872"); P.poly([[10, 22], [15, 14], [28, 12], [40, 15], [44, 26], [36, 32], [19, 30]], "#b8d884")
  // raven routes: dotted arcs from the post to far towns
  const home: [number, number] = [28, 22]
  for (const [tx, ty] of [[12, 16], [44, 17], [40, 30], [16, 30]] as [number, number][]) {
    for (let t = 0; t <= 1; t += 0.06) { const x = home[0] + (tx - home[0]) * t, y = home[1] + (ty - home[1]) * t - Math.sin(t * Math.PI) * 5; P.p(x, y, "#8a3a1e") }
    P.r(tx - 1, ty - 1, 3, 3, INK); P.p(tx, ty, GOLD)
  }
  P.r(home[0] - 2, home[1] - 2, 5, 5, INK); P.r(home[0] - 1, home[1] - 1, 3, 3, RED)
  text(P, "ROUTES", 9, 5, "#3a1c0a")
  return P.c
}
function cubbies(cols: number, rows: number): HTMLCanvasElement {
  const cw = 16, ch = 14
  const W = cols * cw + 8, H = rows * ch + 8
  const P = pen(W, H)
  P.r(0, 0, W, H, INK); P.r(1, 1, W - 2, H - 2, WOOD_L); P.r(1, 1, W - 2, 1, WOOD_LL)
  const seals = [RED, "#3a6ac8", GOLD, "#3a8a4a", "#9a7be0"]
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = 4 + c * cw, y = 4 + r * ch, k = (c * 7 + r * 3) % 5
    P.r(x, y, cw, ch, INK); P.r(x + 1, y + 1, cw - 2, ch - 2, "#3a2010"); P.r(x + 1, y + 1, cw - 2, 2, "#2a1608"); P.r(x + 1, y + ch - 3, cw - 2, 2, WOOD)
    // letters leaning in the pigeonhole (some empty)
    if (k !== 2) {
      const n = 1 + (k % 3)
      for (let i = 0; i < n; i++) {
        const lx = x + 2 + i * 3, tilt = i % 2
        P.r(lx, y + 3 + tilt, 5, ch - 6 - tilt, INK); P.r(lx + 1, y + 4 + tilt, 3, ch - 8 - tilt, i % 2 ? "#f8ecc4" : PARCH)
        P.p(lx + 2, y + 6 + tilt, seals[(c + r + i) % seals.length])
      }
    } else { P.r(x + 3, y + ch - 6, 9, 3, INK); P.r(x + 4, y + ch - 5, 7, 1, "#c8a060") }   // a rolled scroll
  }
  return P.c
}
function counter(w = 132): HTMLCanvasElement {
  const H = 40
  const P = pen(w, H)
  shadow(P, 2, H - 3, w - 4)
  P.r(0, 16, w, 23, INK); P.r(1, 17, w - 2, 21, WOOD)
  for (let x = 3; x < w - 3; x += 16) { P.r(x, 19, 13, 15, WOOD_D); P.r(x + 1, 20, 11, 13, shade(WOOD, -0.08)); P.r(x + 1, 20, 11, 1, shade(WOOD, 0.22)) }
  // stamp-stained notices pinned to the front
  P.r(8, 22, 14, 9, INK); P.r(9, 23, 12, 7, PARCH); P.r(11, 25, 8, 1, PARCH_DD); P.r(11, 27, 6, 1, PARCH_DD)
  P.r(w - 24, 22, 14, 9, INK); P.r(w - 23, 23, 12, 7, "#f8ecc4"); P.r(w - 21, 25, 8, 1, PARCH_DD); P.disc(w - 17, 28, 1, RED)
  P.r(1, 35, w - 2, 2, GOLD_D); P.r(1, 35, w - 2, 1, "#fff0a0")
  P.r(0, 10, w, 8, INK); P.r(1, 11, w - 2, 6, WOOD_L); P.r(1, 11, w - 2, 2, WOOD_LL); P.r(1, 16, w - 2, 1, WOOD_D)
  // on top: balance scale, bell, ledger with quill, a tied parcel
  P.r(14, 6, 1, 5, INK); P.r(8, 5, 13, 1, INK); P.r(7, 6, 1, 2, INK); P.r(20, 6, 1, 2, INK); P.r(5, 8, 5, 1, GOLD); P.r(18, 8, 5, 1, GOLD); P.r(11, 10, 7, 1, GOLD_D)
  P.ell(40, 9, 5, 2, INK); P.ell(40, 8, 4, 2, GOLD); P.r(39, 4, 2, 3, GOLD_D); P.p(40, 3, GOLD)
  P.r(58, 5, 20, 7, INK); P.r(59, 6, 9, 5, "#f8ecc4"); P.r(68, 6, 9, 5, PARCH); P.r(68, 5, 1, 7, INK)
  P.line(76, 5, 82, 0, "#f8f0e0"); P.p(82, 0, RED)
  P.r(w - 46, 3, 17, 9, INK); P.r(w - 45, 4, 15, 7, "#c8a060"); P.r(w - 45, 7, 15, 1, "#8a6a30"); P.r(w - 38, 4, 1, 7, "#8a6a30"); P.r(w - 41, 5, 5, 3, "#f8ecc4")
  return P.c
}
function perch(): HTMLCanvasElement {
  const P = pen(26, 46)
  shadow(P, 4, 43, 18)
  P.r(12, 14, 3, 29, INK); P.r(13, 14, 1, 29, WOOD_L); P.r(7, 41, 13, 3, INK); P.r(8, 41, 11, 2, WOOD); P.r(8, 41, 11, 1, WOOD_LL)
  P.r(2, 12, 23, 3, INK); P.r(3, 12, 21, 2, WOOD_L); P.r(3, 12, 21, 1, WOOD_LL)
  P.r(5, 12, 1, 3, GOLD_D); P.r(21, 12, 1, 3, GOLD_D)
  return P.c
}
/** a raven on a perch; frames: still, head tilt, bob, wing shuffle (14 px per frame) */
const ravenStrip = (tone = 0) => strip(16, 20, 4, (P, f) => {
  const body = tone ? "#3a3048" : "#2a2038", hi = tone ? "#6a5a80" : "#4a3a68"
  const dy = f === 2 ? 1 : 0, dx = f === 1 ? 1 : 0
  P.ell(8, 12 + dy, 5, 5, INK); P.ell(8, 12 + dy, 4, 4, body); P.r(6, 10 + dy, 3, 1, hi)
  P.poly([[2, 14 + dy], [6, 13 + dy], [4, 19 + dy]], INK); P.poly([[3, 14 + dy], [6, 14 + dy], [4, 18 + dy]], shade(body, -0.2))   // tail
  if (f === 3) { P.poly([[7, 9], [11, 8], [14, 12], [9, 13]], INK); P.poly([[8, 10], [11, 9], [13, 12], [9, 12]], hi) }
  P.disc(11 + dx, 6 + dy, 3, INK); P.disc(11 + dx, 6 + dy, 2, body)
  P.poly([[13 + dx, 5 + dy], [17 + dx, 7 + dy], [13 + dx, 8 + dy]], INK); P.poly([[13 + dx, 6 + dy], [16 + dx, 7 + dy], [13 + dx, 7 + dy]], "#e8b830")
  P.p(11 + dx, 5 + dy, f === 1 ? body : "#ffe070")
  P.r(7, 17 + dy, 1, 2, "#8a6a30"); P.r(10, 17 + dy, 1, 2, "#8a6a30")
})
function writingDesk(): HTMLCanvasElement {
  const W = 58, H = 38
  const P = pen(W, H)
  shadow(P, 2, H - 3, W - 4)
  P.r(4, 20, 4, 16, INK); P.r(5, 21, 2, 14, WOOD); P.r(W - 8, 20, 4, 16, INK); P.r(W - 7, 21, 2, 14, WOOD)
  P.r(6, 28, W - 12, 2, INK); P.r(7, 29, W - 14, 1, WOOD_D)
  // slanted writing slope
  P.poly([[2, 12], [W - 2, 12], [W - 5, 22], [5, 22]], INK); P.poly([[3, 13], [W - 3, 13], [W - 6, 21], [6, 21]], WOOD_L); P.r(3, 13, W - 6, 1, WOOD_LL)
  P.poly([[12, 14], [34, 14], [32, 20], [10, 20]], INK); P.poly([[13, 15], [33, 15], [31, 19], [11, 19]], "#f8ecc4")
  for (let i = 0; i < 3; i++) P.line(15, 16 + i, 29, 16 + i, PARCH_DD)
  // inkwell and quill, sealing wax, an envelope stack
  P.r(39, 10, 6, 6, INK); P.r(40, 11, 4, 4, "#2a2a6a"); P.p(41, 11, "#6a6aca")
  P.line(43, 10, 49, 2, "#f8f0e0"); P.line(44, 10, 50, 3, "#d8c8a8"); P.p(49, 2, RED)
  P.r(47, 12, 6, 3, INK); P.r(48, 13, 4, 1, RED)
  P.r(3, 6, 10, 8, INK); P.r(4, 7, 8, 6, "#f8ecc4"); P.r(4, 7, 8, 1, PARCH); P.r(3, 8, 10, 6, INK); P.r(4, 9, 8, 4, PARCH); P.p(8, 11, RED)
  return P.c
}
function parcels(): HTMLCanvasElement {
  const P = pen(40, 34)
  shadow(P, 2, 31, 36)
  const box = (x: number, y: number, w: number, h: number, c: string, tie = RED) => {
    P.r(x, y, w, h, INK); P.r(x + 1, y + 1, w - 2, h - 2, c); P.r(x + 1, y + 1, w - 2, 1, shade(c, 0.3)); P.r(x + 1, y + h - 2, w - 2, 1, shade(c, -0.3))
    P.r(x + Math.floor(w / 2), y + 1, 1, h - 2, "#6a4a2a"); P.r(x + 1, y + Math.floor(h / 2), w - 2, 1, "#6a4a2a")
    P.r(x + w - 8, y + 3, 6, 4, "#f8ecc4"); P.p(x + w - 7, y + 4, tie); P.p(x + w - 5, y + 5, "#3a6ac8")
  }
  box(2, 18, 22, 13, "#c8a060"); box(24, 21, 14, 10, "#b88a4a", "#3a8a4a"); box(7, 8, 16, 11, "#d8b070", "#3a6ac8"); box(17, 1, 10, 8, "#c8a060")
  return P.c
}
function mailSack(): HTMLCanvasElement {
  const P = pen(22, 24)
  shadow(P, 2, 21, 18)
  P.poly([[3, 7], [18, 7], [20, 20], [1, 20]], INK); P.poly([[4, 8], [17, 8], [19, 19], [2, 19]], "#b89a64"); P.r(4, 8, 2, 10, "#d8bc84"); P.r(16, 9, 2, 10, "#8a6a40")
  P.r(5, 4, 11, 4, INK); P.r(6, 5, 9, 2, "#a8864e"); P.r(4, 8, 13, 1, "#6a4a2a")
  text(P, "POST", 4, 12, "#6a2a1c")
  return P.c
}
function rugRunner(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { rug(g, x, y, w, h, "#7a2a34", "#4a1620", GOLD, false) }

/** the Raven Post: a post office with mail cubbies, ravens on perches, a writing desk, parcels and the postmaster */
export function buildRavenPost(content: Portfolio): Scene {
  const full = content.profile.name, first = full.split(" ")[0]
  const so = content.socials
  const handle = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
  const NW = 6, w = 23, h = 14
  const R = makeRoom("wizard", "Raven Post", { w, h, wallH: NW, world: "village", theme: villageTheme({ wall: "orange", floor: "tan", kind: "plaster", base: "#d8a468", beam: "#5a3418", dark: 0.3, tint: "44,22,8", glow: 0.3, mat: ["#4a1620", "#7a2a34"] }) })
  const W = w * TS, cx = W / 2

  // ── north wall: the cubbies, a notice with the real address, route map, windows ──
  R.wall(plankSign("RAVEN POST", 70, "#f4e4b4", WOOD), cx, 5)
  R.wall(cubbies(6, 3), cx, 24)
  R.light(cx, 50, 80, "255,226,170", 0.4)
  R.wall(notice(92, 56, "SEND A RAVEN TO", [so.email.toUpperCase(), "", content.profile.location.toUpperCase(), "OPEN TO COLLABS"]), 86, 14)
  R.wall(routeMap(), 296, 14)
  R.wall(windowEvening(30, 46, 4), 24, 10); R.wall(windowEvening(30, 46, 9), W - 24, 10)
  R.light(24, 40, 46, "255,170,110", 0.2); R.light(W - 24, 40, 46, "255,170,110", 0.2)
  lanternLight(R, 246, 6, 56)

  // ── floor ──
  R.decal((g) => {
    rugRunner(g, cx - 20, (NW + 4) * TS - 4, 40, (h - 1 - NW - 4) * TS + 4)
    rug(g, W - 92, 8 * TS + 8, 72, 52, "#2f5a7a", "#1c3850", "#e8d49a")
    rug(g, 20, 7 * TS + 6, 52, 36, "#5a6a3a", "#2e3a1e", "#e8d49a", false)
  })
  R.pool(cx, 9 * TS, 90, 40, "255,200,120", 0.1)

  // ── the counter and the postmaster ──
  R.add(counter(132), cx, (NW + 3) * TS, { solid: [128, 12] })
  R.add(candle(), cx + 40, (NW + 3) * TS - 30, { solid: false, baseOff: 12, anim: { frames: 3, fps: 5, dx: 8 } })
  R.light(cx + 40, (NW + 3) * TS - 34, 44, "255,190,110", 0.8)

  // ── ravens on perches ──
  const perches: [number, number, number][] = [[56, (NW + 3) * TS + 8, 0], [96, (NW + 3) * TS + 8, 1], [W - 40, (NW + 3) * TS + 8, 0]]
  perches.forEach(([x, y, t], i) => {
    R.add(perch(), x, y, { solid: [10, 6] })
    R.add(ravenStrip(t), x - 6 + (i % 2) * 8, y - 33, { anim: { frames: 4, fps: 1.2 + i * 0.35, dx: 16 }, solid: false, baseOff: 36 })
  })
  R.light(76, (NW + 3) * TS - 10, 50, "255,190,120", 0.3)

  // ── writing desk, parcels, sacks ──
  const dx = W - 56, dy = (NW + 5) * TS + 12
  R.add(writingDesk(), dx, dy, { solid: [52, 10] })
  R.add(candle(), dx + 18, dy - 26, { solid: false, baseOff: 12, anim: { frames: 3, fps: 5, dx: 8 } })
  R.light(dx + 18, dy - 30, 50, "255,190,110", 0.8)
  R.add(plankStool(), dx + 2, dy + 12, { solid: false })
  R.add(parcels(), 34, (NW + 6) * TS + 14, { solid: [34, 8] })
  R.add(mailSack(), 66, (NW + 6) * TS + 14, { solid: [18, 8] }); R.add(mailSack(), 82, (NW + 6) * TS + 18, { solid: [18, 8] })
  prop(R, "pottedPlant", w - 3, 11); prop(R, "plantPot", 2, 12)
  R.actors.push({ id: "cat", kind: "animal", sheet: animalSheet("cat"), x: 5 * TS, y: 9 * TS, wander: 24, speed: 10 })

  // ── people ──
  R.actors.push(npc(CHARS.postmaster, cx - 2, (NW + 1) * TS - 2, {
    id: "postmaster", name: "Postmaster Ito", facing: "down",
    lines: [
      `Raven Post, how can I help?`,
      `Need to reach ${first}? Our ravens fly straight to ${so.email}.`,
      `${first} is based in ${content.profile.location}. ${content.profile.availability}.`,
      `Other routes: ${handle(so.github)}, ${handle(so.linkedin)} and ${handle(so.website)}.`,
      `Write your letter at the desk and I'll send a raven off at once.`,
    ],
    action: { type: "section", id: "wizard" },
  }))
  R.actors.push(npc("Villager4", cx - 52, 11 * TS + 2, { id: "courier", name: "Courier Taki", facing: "up", wander: 14, bark: ["Special delivery for Mumbai!", "Three ravens out today."] }))

  // ── hotspots ──
  R.spot("letter", dx, dy + 14, "WRITE A LETTER", { type: "section", id: "wizard" }, true, dx, (NW + 4) * TS - 6)
  R.spot("raven", 76, (NW + 5) * TS + 8, "SEND A RAVEN", { type: "section", id: "wizard" }, true, 76, (NW + 2) * TS + 4)
  return R.finish()
}

function plankStool(): HTMLCanvasElement {
  const P = pen(14, 14)
  P.ell(7, 12, 5, 2, "rgba(0,0,0,.3)")
  P.r(4, 7, 1, 6, INK); P.r(9, 7, 1, 6, INK)
  P.ell(7, 6, 6, 3, INK); P.ell(7, 5, 5, 2, "#a8382e"); P.r(3, 4, 6, 1, "#d85a48")
  return P.c
}
