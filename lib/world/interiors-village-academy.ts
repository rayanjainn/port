// Hearthvale Academy: a classroom-library with a blackboard showing the degree and CGPA, bookshelves, a trophy cabinet for the
// honours (first places on the top shelf), a spinning globe and a teacher host quoting the education record.
import type { Portfolio } from "@/lib/content"
import { CHARS } from "@/lib/na"
import { drawText } from "./exhibits"
import { TS, type Scene } from "./core"
import { makeRoom, npc, pen, shadow, shade, strip, type Pen } from "./interiors-kit"
import { INK, WOOD, WOOD_D, WOOD_L, WOOD_LL, PARCH, PARCH_D, GOLD, GOLD_D, RED, villageTheme, prop, text, rug, candle, banner, windowEvening, plankSign } from "./interiors-village-kit"
import { lanternLight } from "./interiors-village-bits"

const CHALK = "#f4f0e0", CHALK_Y = "#f8dc78", BOARD = "#2c4a3c", BOARD_D = "#1e3629"

function blackboard(content: Portfolio): HTMLCanvasElement {
  const edu = content.education[0]
  const minor = content.education.find((e) => /minor/i.test(e.degree))
  const cg = /CGPA\s*([\d.]+)\s*\/\s*10\s*last/i.exec(edu.note ?? "")
  const avg = /([\d.]+)\s*\/\s*10\s*average/i.exec(edu.note ?? "")
  const W = 126, H = 74
  const P = pen(W, H)
  P.r(0, 0, W, H, INK); P.r(1, 1, W - 2, H - 2, WOOD_L); P.r(1, 1, W - 2, 1, WOOD_LL); P.r(1, H - 2, W - 2, 1, WOOD)
  P.r(4, 4, W - 8, H - 12, INK); P.r(5, 5, W - 10, H - 14, BOARD)
  for (let i = 0; i < 70; i++) P.p(6 + ((i * 53) % (W - 12)), 6 + ((i * 29) % (H - 16)), i % 3 ? "#35574a" : "#26402f")
  P.r(5, 5, W - 10, 1, BOARD_D); P.r(5, 5, 1, H - 14, BOARD_D)
  // chalk tray: chalk pieces and an eraser
  P.r(4, H - 9, W - 8, 4, INK); P.r(5, H - 8, W - 10, 2, WOOD); P.r(5, H - 8, W - 10, 1, WOOD_LL)
  P.r(10, H - 11, 5, 2, CHALK); P.r(18, H - 11, 4, 2, CHALK_Y); P.r(W - 22, H - 12, 12, 4, INK); P.r(W - 21, H - 11, 10, 2, "#c86a3a"); P.r(W - 21, H - 12, 10, 1, "#8a8a96")
  const mid = (s: string, big: boolean, y: number, col: string) => {
    const wd = big ? s.length * 6 - 1 : s.length * 4 - 1
    if (big) drawText(P.x, s, Math.round((W - wd) / 2), y, col); else text(P, s, Math.round((W - wd) / 2), y, col)
  }
  mid(`${edu.degree} ${edu.field}`.toUpperCase().replace("COMPUTER SCIENCE", "COMP SCI"), true, 9, CHALK_Y)
  P.r(18, 19, W - 36, 1, "#5a8a6e")
  mid("SARDAR PATEL INSTITUTE", false, 23, CHALK)
  mid("OF TECHNOLOGY MUMBAI", false, 30, CHALK)
  mid(cg ? `CGPA ${cg[1]}/10` : "HONOURS", true, 38, CHALK)
  const bits = [avg ? `MEAN ${avg[1]}` : "", `${edu.start.slice(-4)}-${edu.end.slice(-4)}`].filter(Boolean).join("  ")
  mid(bits, false, 47, "#9ad8c0")
  // chalk doodles: a little rising graph in the corner
  P.line(108, 45, 112, 38, "#9ad8c0"); P.line(112, 38, 116, 42, "#9ad8c0"); P.line(116, 42, 121, 32, "#9ad8c0"); P.r(107, 46, 15, 1, "#5a8a6e"); P.r(107, 30, 1, 16, "#5a8a6e")
  if (minor) mid("MINOR IN MGMT AT SPJIMR", false, 56, "#c8b0e8")
  return P.c
}
function worldMapFrame(): HTMLCanvasElement {
  const W = 52, H = 36
  const P = pen(W, H)
  P.r(0, 0, W, H, INK); P.r(1, 1, W - 2, H - 2, WOOD_L); P.r(1, 1, W - 2, 1, WOOD_LL)
  P.r(3, 3, W - 6, H - 6, INK); P.r(4, 4, W - 8, H - 8, "#8cc0d0")
  for (let y = 6; y < H - 5; y += 5) P.r(4, y, W - 8, 1, "#a8d4e0")
  const land = (pts: [number, number][]) => { P.poly(pts, "#8ab05a"); P.poly(pts.map(([x, y]) => [x + 0.5, y + 0.5] as [number, number]), "#a8c870") }
  land([[8, 8], [16, 6], [20, 10], [18, 18], [14, 22], [10, 16]])            // americas-ish
  land([[24, 7], [34, 6], [40, 9], [38, 16], [32, 14], [30, 24], [26, 22], [25, 14]])
  land([[40, 20], [46, 20], [46, 26], [41, 26]])
  P.p(34, 17, RED); P.p(35, 17, RED); P.p(34, 18, RED)
  P.r(6, H - 8, 6, 1, INK); P.r(8, H - 11, 1, 7, INK)
  return P.c
}
function wallClock(): HTMLCanvasElement {
  const P = pen(18, 18)
  P.disc(9, 9, 8, INK); P.disc(9, 9, 7, WOOD_L); P.disc(9, 9, 6, PARCH)
  for (const [x, y] of [[9, 4], [9, 14], [4, 9], [14, 9]]) P.p(x, y, INK)
  P.line(9, 9, 9, 5, INK); P.line(9, 9, 12, 10, INK); P.p(9, 9, RED)
  return P.c
}
function lectern(): HTMLCanvasElement {
  const W = 40, H = 40
  const P = pen(W, H)
  shadow(P, 4, H - 3, 32)
  P.r(6, 16, 28, 22, INK); P.r(7, 17, 26, 20, WOOD); P.r(7, 17, 26, 1, WOOD_LL)
  P.r(10, 21, 20, 12, WOOD_D); P.r(11, 22, 18, 10, shade(WOOD, -0.08)); P.r(11, 22, 18, 1, shade(WOOD, 0.25)); P.p(20, 27, GOLD)
  P.poly([[3, 12], [37, 12], [34, 18], [6, 18]], INK); P.poly([[4, 13], [36, 13], [33, 17], [7, 17]], WOOD_L); P.r(4, 13, 32, 1, WOOD_LL)
  // an open book, a bell and the register
  P.poly([[8, 6], [20, 8], [20, 14], [8, 12]], INK); P.poly([[9, 7], [19, 8.5], [19, 13], [9, 11.5]], "#f8ecc4")
  P.poly([[20, 8], [32, 6], [32, 12], [20, 14]], INK); P.poly([[21, 8.5], [31, 7], [31, 11.5], [21, 13]], PARCH)
  for (let i = 0; i < 3; i++) { P.line(10, 9 + i, 18, 10 + i, PARCH_D); P.line(22, 10 + i, 30, 8.5 + i, PARCH_D) }
  P.ell(34, 10, 3, 2, INK); P.ell(34, 10, 2, 1, GOLD)
  return P.c
}
function studentDesk(): HTMLCanvasElement {
  const W = 42, H = 26
  const P = pen(W, H)
  shadow(P, 2, H - 3, W - 4)
  P.r(4, 14, 3, 10, INK); P.r(W - 7, 14, 3, 10, INK); P.r(5, 15, 1, 8, WOOD)
  P.r(2, 18, W - 4, 2, INK); P.r(3, 19, W - 6, 1, WOOD_D)
  P.poly([[1, 6], [W - 1, 6], [W - 3, 15], [3, 15]], INK); P.poly([[2, 7], [W - 2, 7], [W - 4, 14], [4, 14]], WOOD_L); P.r(3, 7, W - 6, 1, WOOD_LL)
  // two open books and an ink pot
  for (const x of [8, 25]) { P.r(x, 8, 9, 5, INK); P.r(x + 1, 9, 3, 3, "#f8ecc4"); P.r(x + 5, 9, 3, 3, PARCH); P.p(x + 4, 9, INK) }
  P.r(20, 8, 3, 3, INK); P.p(21, 9, "#2a2a6a")
  return P.c
}
function stool(): HTMLCanvasElement {
  const P = pen(14, 14)
  P.ell(7, 12, 5, 2, "rgba(0,0,0,.3)")
  P.r(4, 7, 1, 6, INK); P.r(9, 7, 1, 6, INK)
  P.ell(7, 6, 6, 3, INK); P.ell(7, 5, 5, 2, WOOD_L); P.r(3, 4, 6, 1, WOOD_LL)
  return P.c
}
const globeStrip = () => strip(26, 40, 8, (P, f) => {
  shadow(P, 4, 37, 18)
  P.r(12, 28, 2, 9, INK); P.r(13, 28, 1, 9, GOLD_D); P.r(7, 35, 12, 3, INK); P.r(8, 35, 10, 2, WOOD); P.r(8, 35, 10, 1, WOOD_LL)
  const cx = 13, cy = 15, R = 12
  P.disc(cx, cy, R + 1, INK)
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    if (x * x + y * y > R * R) continue
    const lon = Math.asin(x / Math.sqrt(R * R - y * y + 0.01)) + (f / 8) * Math.PI * 2, lat = y / R
    const n = Math.sin(lon * 2.1 + 1) + Math.sin(lon * 3.7 + lat * 2.6) * 0.8 + Math.cos(lat * 3.1 + lon) * 0.6
    const land = n > 0.55 && Math.abs(lat) < 0.86
    const shade2 = (x + y * 0.4) / R
    P.p(cx + x, cy + y, land ? (shade2 > 0.45 ? "#5a8a3a" : "#8ab05a") : (shade2 > 0.45 ? "#2c6a98" : "#4a9ac8"))
  }
  P.line(cx - 8, cy - 9, cx - 8, cy + 9, "rgba(0,0,0,0)")
  P.p(cx - 5, cy - 7, "#ffffff"); P.p(cx - 4, cy - 8, "#ffffff")
  P.arc(cx, cy, R + 1, R + 2, Math.PI * 0.6, Math.PI * 1.4, () => GOLD)
})

// ── trophy cabinet ───────────────────────────────────────────────
function cup(P: Pen, x: number, y: number, col = GOLD, num = "") {
  const hi = shade(col, 0.5), lo = shade(col, -0.35)
  P.r(x + 5, y + 11, 3, 3, INK); P.r(x + 6, y + 11, 1, 3, lo)
  P.r(x + 2, y + 14, 9, 2, INK); P.r(x + 3, y + 14, 7, 1, col)
  P.poly([[x + 1, y + 1], [x + 12, y + 1], [x + 10, y + 11], [x + 3, y + 11]], INK)
  P.poly([[x + 2, y + 2], [x + 11, y + 2], [x + 9, y + 10], [x + 4, y + 10]], col)
  P.r(x + 3, y + 3, 2, 6, hi); P.r(x + 9, y + 4, 1, 5, lo); P.r(x + 2, y + 1, 9, 1, hi)
  P.ring(x - 1, y + 5, 3, INK); P.ring(x + 14, y + 5, 3, INK); P.p(x - 3, y + 5, col); P.p(x + 16, y + 5, col)
  if (num) text(P, num, x + 5, y + 4, INK)
}
function medal(P: Pen, x: number, y: number, col: string, ribbon: string) {
  P.poly([[x, y], [x + 4, y], [x + 7, y + 8], [x + 3, y + 8]], INK); P.poly([[x + 1, y], [x + 3, y], [x + 5, y + 7], [x + 3, y + 7]], ribbon)
  P.poly([[x + 8, y], [x + 4, y], [x + 1, y + 8], [x + 5, y + 8]], INK); P.poly([[x + 7, y], [x + 5, y], [x + 3, y + 7], [x + 5, y + 7]], shade(ribbon, -0.2))
  P.disc(x + 4, y + 11, 4, INK); P.disc(x + 4, y + 11, 3, col); P.p(x + 3, y + 10, shade(col, 0.6))
}
function badge(P: Pen, x: number, y: number, col: string) {
  P.poly([[x + 4, y], [x + 8, y + 2], [x + 8, y + 6], [x + 4, y + 9], [x, y + 6], [x, y + 2]], INK)
  P.poly([[x + 4, y + 1], [x + 7, y + 3], [x + 7, y + 6], [x + 4, y + 8], [x + 1, y + 6], [x + 1, y + 3]], col); P.p(x + 3, y + 3, shade(col, 0.6))
}
function trophyCabinet(content: Portfolio): HTMLCanvasElement {
  const firsts = content.achievements.filter((a) => /^1st/i.test(a.title))
  const tops = content.achievements.filter((a) => !/^1st/i.test(a.title) && /top/i.test(a.title))
  const rest = content.achievements.filter((a) => !/^1st/i.test(a.title) && !/top/i.test(a.title))
  const W = 96, H = 74
  const P = pen(W, H)
  shadow(P, 2, H - 3, W - 4)
  P.r(0, 0, W, H - 4, INK); P.r(1, 1, W - 2, H - 6, WOOD_L); P.r(1, 1, W - 2, 1, WOOD_LL)
  // carved crest
  P.r(2, 2, W - 4, 7, WOOD_D); P.r(2, 2, W - 4, 1, WOOD); for (let x = 5; x < W - 5; x += 6) { P.r(x, 4, 3, 3, WOOD_L); P.p(x + 1, 5, GOLD) }
  // glass case
  P.r(5, 10, W - 10, H - 22, INK); P.r(6, 11, W - 12, H - 24, "#3a2418")
  P.r(6, 11, W - 12, 4, "#4a3020")
  const sy = [31, 48, 63]
  for (const y of sy) { P.r(6, y, W - 12, 3, WOOD_L); P.r(6, y, W - 12, 1, WOOD_LL); P.r(6, y + 3, W - 12, 1, INK) }
  // top shelf: the gold cups, first places
  const n = Math.min(firsts.length, 6), sp = n > 5 ? 14 : 16, x0 = Math.round((W - (n * sp - (sp - 13))) / 2)
  for (let i = 0; i < n; i++) cup(P, x0 + i * sp, 13, GOLD, "1")
  // middle shelf: silver and bronze medals for the top placements
  const mc = ["#d8dce4", "#d8a060", "#c0c8d4", "#e0a868"]
  const nm = Math.min(tops.length, 4)
  for (let i = 0; i < nm; i++) medal(P, 14 + i * 20, 33, mc[i % mc.length], i % 2 ? "#3a6ac8" : "#a8382e")
  // bottom shelf: badges and the tap package
  const nb = Math.min(rest.length, 7)
  for (let i = 0; i < nb; i++) badge(P, 10 + i * 11, 51, ["#5a8aff", "#e8b830", "#9a7be0", "#3fb3a6", "#e2683a", "#a8382e", "#6ac85a"][i % 7])
  // glass sheen
  P.a(0.12); P.poly([[8, 12], [20, 12], [10, H - 14], [8, H - 14]], "#cfe8ff"); P.poly([[30, 12], [34, 12], [24, H - 14], [20, H - 14]], "#cfe8ff"); P.a(1)
  P.r(5, 10, W - 10, 1, "#d8c090")
  // brass plate
  const label = `${firsts.length} FIRST PLACES`
  P.r(W / 2 - 32, H - 12, 64, 9, INK); P.r(W / 2 - 31, H - 11, 62, 7, GOLD_D); P.r(W / 2 - 31, H - 11, 62, 1, "#fff0a0")
  text(P, label, Math.round(W / 2 - (label.length * 4 - 1) / 2), H - 10, INK)
  return P.c
}

/** the Academy: a classroom and reading room with the degree on the blackboard and the honours in the trophy cabinet */
export function buildAcademy(content: Portfolio): Scene {
  const full = content.profile.name, first = full.split(" ")[0]
  const edu = content.education[0]
  const minor = content.education.find((e) => /minor/i.test(e.degree))
  const firsts = content.achievements.filter((a) => /^1st/i.test(a.title))
  const NW = 6, w = 29, h = 14
  const R = makeRoom("academy", "Academy", { w, h, wallH: NW, world: "village", theme: villageTheme({ wall: "green", floor: "beige", kind: "plaster", base: "#c4cc9e", beam: "#4a3418", dark: 0.26, tint: "36,28,8", glow: 0.28 }) })
  const W = w * TS, cx = W / 2

  // ── north wall ──
  R.wall(worldMapFrame(), 66, 10)
  R.wall(windowEvening(32, 50, 5, ["#78b4e8", "#a8d4f0", "#f8e8b8"], false), 138, 8)
  R.light(138, 40, 56, "255,244,210", 0.2)
  R.wall(wallClock(), 166, 12)
  R.wall(blackboard(content), cx, 8)
  R.light(cx, 40, 90, "255,240,200")
  lanternLight(R, 300, 8, 54)
  R.wall(windowEvening(32, 50, 7, ["#78b4e8", "#a8d4f0", "#f8e8b8"], false), 332, 8)
  R.light(332, 40, 56, "255,244,210", 0.2)
  R.wall(plankSign("HONOURS", 64, "#f4e4b4", WOOD), 404, 12)
  R.wall(banner("#2f6f8a", GOLD, "star", 20, 40), 28, 6)
  prop(R, "bookshelf", 1, NW - 1); prop(R, "bookshelf", 3, NW - 1); prop(R, "bigShelf", 5, NW - 1)
  prop(R, "scrolls", 8, NW, { solid: false })

  // ── floor ──
  R.decal((g) => {
    rug(g, cx - 24, (NW + 2) * TS, 48, (h - 1 - NW - 2) * TS, "#3a7a6a", "#1e4a40", GOLD, false)
    rug(g, 2 * TS + 4, 10 * TS - 4, 88, 52, "#7a2a34", "#4a1620", "#e8d49a")
    rug(g, W - 2 * TS - 92, 9 * TS + 4, 80, 52, "#2f5a7a", "#1c3850", "#e8d49a", false)
  })
  R.pool(cx, 9 * TS, 90, 50, "255,240,200", 0.1)

  // lectern, globe, plants
  R.add(lectern(), cx + 40, (NW + 2) * TS - 2, { solid: [34, 10] })
  R.add(candle(), cx + 56, (NW + 2) * TS - 30, { solid: false, baseOff: 12, anim: { frames: 3, fps: 5, dx: 8 } })
  R.light(cx + 56, (NW + 2) * TS - 34, 40, "255,200,120", 0.8)
  R.add(globeStrip(), cx - 70, (NW + 3) * TS + 4, { anim: { frames: 8, fps: 4, dx: 26 }, solid: [14, 6] })
  prop(R, "pottedPlant", 8, NW + 1); prop(R, "pottedPlant", 27, NW + 1)

  // desks facing the blackboard, aisle left clear
  const desk: [number, number][] = [[-132, 0], [-80, 0], [88, 0], [140, 0], [-132, 1], [-80, 1], [88, 1], [140, 1]]
  desk.forEach(([dx, row], i) => {
    const x = cx + dx, y = (NW + 5 + row * 2) * TS + 6
    if (i === 0 || i === 4 || i === 5) return                          // the reading nook takes this corner
    R.add(studentDesk(), x, y, { solid: [38, 10] })
    R.add(stool(), x, y + 12, { solid: false })
  })
  // reading nook: a table of books and an armchair-stool pair on the rug
  R.add(studentDesk(), 5 * TS + 8, 11 * TS + 10, { solid: [38, 10] })
  R.add(stool(), 3 * TS + 12, 11 * TS + 10, { solid: false }); R.add(stool(), 7 * TS + 4, 11 * TS + 10, { solid: false })
  R.add(candle(), 5 * TS + 14, 11 * TS - 8, { solid: false, baseOff: 12, anim: { frames: 3, fps: 5, dx: 8 } })
  R.light(5 * TS + 14, 10 * TS + 6, 50, "255,200,130", 0.6)
  // trophy cabinet on the right, with its lamp
  R.add(trophyCabinet(content), 404, (NW + 1) * TS + 2, { solid: [92, 10] })
  R.light(404, (NW + 1) * TS - 20, 70, "255,226,150", 0.3)
  R.pool(404, (NW + 3) * TS, 60, 20, "255,226,150", 0.16)

  // ── people ──
  const school = "Sardar Patel Institute of Technology"
  const placed = firsts.map((a) => a.title.replace(/^1st place,?\s*/i, ""))
  R.actors.push(npc(CHARS.teacher, cx + 10, (NW + 1) * TS + 4, {
    id: "teacher", name: "Master Sora", facing: "down",
    lines: [
      `Ah, a curious mind! Welcome to the Academy.`,
      `${full} studies ${edu.degree} ${edu.field} at ${school} in Mumbai, ${edu.start} to ${edu.end}. ${edu.note}`,
      ...(minor ? [`Alongside it, a ${minor.degree}${minor.field ? ` in ${minor.field}` : ""} at SPJIMR, ${minor.start} to ${minor.end}.`] : []),
      `${firsts.length} first places so far: ${placed.join(", ")}.`,
      `They all stand in the trophy cabinet. The gold cups on the top shelf are the first places.`,
    ],
    action: { type: "section", id: "academy" },
  }))
  R.actors.push(npc("Child", cx - 80, (NW + 5) * TS + 4, { id: "pupil1", name: "Pupil Ren", facing: "up", bark: ["Nine point six eight. Nine. Point. Six eight.", "Is that really the average?"] }))
  R.actors.push(npc("Villager", cx + 88, (NW + 5) * TS + 4, { id: "pupil2", name: "Pupil Hana", facing: "up", bark: [`${first} won ${firsts.length} first places!`, "I want a gold cup too."] }))
  R.actors.push(npc("OldWoman", 6 * TS + 4, 12 * TS - 2, { id: "librarian", name: "Librarian Fuji", facing: "up", wander: 12, bark: ["Shh. Reading room.", "Mind the books."] }))

  // ── hotspots ──
  R.spot("diploma", cx + 40, (NW + 3) * TS + 6, "READ THE SCROLLS", { type: "section", id: "academy" }, true, cx + 40, 4 * TS)
  R.spot("trophies", 404, (NW + 2) * TS + 8, "VIEW HONOURS", { type: "section", id: "academy", focus: "honours" }, true, 404, 2 * TS - 4)
  return R.finish()
}
