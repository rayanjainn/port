// Hearthvale village rooms: Town Hall, Tavern, Forge, Academy and Raven Post, built with the shared room kit in the
// village's own warm wood-and-parchment look (Ninja Adventure floor and prop tiles plus painted wall pieces).
import type { Portfolio } from "@/lib/content"
import { CHARS } from "@/lib/na"
import { drawText, fitTitle, wrapMicro } from "./exhibits"
import { TS, type Scene } from "./core"
import { makeRoom, npc, pen, shadow, shade } from "./interiors-kit"
import { INK, WOOD, WOOD_D, WOOD_L, WOOD_LL, PARCH, PARCH_DD, GOLD, GOLD_D, RED, RED_D, villageTheme, prop, text, rug, candelabra, candle, banner, framedPage } from "./interiors-village-kit"

// ── TOWN HALL ───────────────────────────────────────────────────
function villageMap(): HTMLCanvasElement {
  const W = 96, H = 56
  const P = pen(W, H)
  P.r(0, 0, W, H, INK); P.r(1, 1, W - 2, H - 2, WOOD_L); P.r(1, 1, W - 2, 1, WOOD_LL); P.r(1, H - 2, W - 2, 1, WOOD)
  P.r(3, 3, W - 6, H - 6, INK); P.r(4, 4, W - 8, H - 8, "#e4cf98")
  for (let i = 0; i < 40; i++) P.p(5 + ((i * 37) % (W - 10)), 5 + ((i * 23) % (H - 10)), "#d6bc82")
  // the vale: a green island with a lake, a river and a mountain ridge
  const land: [number, number][] = [[9, 22], [14, 14], [30, 12], [50, 13], [70, 11], [86, 18], [88, 34], [78, 48], [52, 50], [26, 48], [11, 38]]
  P.poly(land.map(([x, y]) => [x + 1, y + 1] as [number, number]), "#8a7a4a")
  P.poly(land, "#a8c872")
  P.poly(land.map(([x, y]) => [x * 0.96 + 2, y * 0.96 + 1] as [number, number]), "#b8d884")
  P.ell(40, 30, 7, 4, "#5aa4c0"); P.ell(40, 30, 5, 2, "#8ccce0")
  for (let y = 33; y < 52; y++) P.p(40 + Math.round(Math.sin(y / 3) * 3) + (y - 33) / 2, y, "#5aa4c0")
  for (let i = 0; i < 6; i++) { const x = 60 + i * 5, y = 10 + (i % 2) * 3; P.poly([[x, y + 6], [x + 3, y], [x + 6, y + 6]], "#8a7a68"); P.poly([[x + 2, y + 2], [x + 3, y], [x + 4, y + 2]], "#f4f0e8") }
  for (let i = 0; i < 16; i++) { const x = 14 + ((i * 29) % 70), y = 14 + ((i * 17) % 36); P.disc(x, y, 1, "#5e9a46") }
  // dotted road between the buildings
  const spots: Record<string, [number, number, string, string, number, number]> = {
    hall: [44, 20, "#5b8fd6", "HALL", -7, -9],
    gallery: [62, 26, "#9a7be0", "GALLERY", -13, 5],
    academy: [24, 21, "#3fb3a6", "ACADEMY", -13, 5],
    tavern: [27, 36, "#e09a3a", "TAVERN", -10, 5],
    forge: [54, 38, "#e2683a", "FORGE", -9, 5],
    post: [80, 19, "#8e66e8", "POST", -6, 5],
    mine: [80, 40, "#9a8a72", "MINE", -6, 5],
  }
  const road = (a: string, b: string) => {
    const [x0, y0] = spots[a], [x1, y1] = spots[b], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    for (let i = 0; i <= n; i += 2) P.p(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + 2 + ((y1 - y0) * i) / n), "#8a5a2a")
  }
  road("hall", "academy"); road("hall", "gallery"); road("gallery", "post"); road("hall", "tavern"); road("gallery", "forge"); road("forge", "mine"); road("tavern", "forge")
  for (const [, [x, y, col, label, dx, dy]] of Object.entries(spots)) {
    P.r(x - 3, y - 2, 7, 6, INK); P.r(x - 2, y - 1, 5, 2, col); P.r(x - 2, y + 1, 5, 2, "#f4e4b4"); P.p(x, y + 2, INK)
    text(P, label, x + dx, y + dy, "#3a1c0a")
  }
  // you are here
  P.line(41, 16, 45, 20, RED, 1); P.line(45, 16, 41, 20, RED, 1)
  // title ribbon and compass
  P.r(14, 0, 68, 11, INK); P.r(15, 1, 66, 9, RED); P.r(15, 1, 66, 1, shade(RED, 0.3)); P.r(15, 9, 66, 1, RED_D)
  drawText(P.x, "HEARTHVALE", 18, 2, "#f8e4b0", INK)
  P.r(9, 41, 1, 9, INK); P.r(5, 45, 9, 1, INK); P.r(9, 40, 1, 2, RED); text(P, "N", 8, 34, "#3a1c0a")
  return P.c
}

function mayorDesk(): HTMLCanvasElement {
  const W = 88, H = 34
  const P = pen(W, H)
  shadow(P, 4, 31, 80)
  // front: carved wood with panels and brass studs
  P.r(2, 15, 84, 16, INK); P.r(3, 16, 82, 14, WOOD); P.r(3, 16, 82, 1, WOOD_LL)
  for (let x = 6; x < 80; x += 20) { P.r(x, 19, 16, 9, WOOD_D); P.r(x + 1, 20, 14, 7, shade(WOOD, -0.1)); P.r(x + 1, 20, 14, 1, shade(WOOD, 0.25)); P.p(x + 8, 23, GOLD) }
  P.r(4, 29, 80, 2, WOOD_D)
  // top slab
  P.r(0, 9, 88, 7, INK); P.r(1, 10, 86, 5, WOOD_L); P.r(1, 10, 86, 1, WOOD_LL); P.r(1, 14, 86, 1, WOOD)
  // ledger, scrolls, ink and quill, brass bell
  P.r(8, 4, 20, 6, INK); P.r(9, 5, 9, 4, PARCH); P.r(18, 5, 9, 4, "#f8ecc4"); P.r(18, 4, 1, 6, INK)
  for (let i = 0; i < 3; i++) { P.r(10, 6 + i, 6, 1, PARCH_DD); P.r(20, 6 + i, 6, 1, PARCH_DD) }
  P.r(40, 6, 14, 4, INK); P.r(41, 6, 12, 3, "#e8d4a0"); P.ell(41, 7, 2, 2, "#c8aa70"); P.ell(53, 7, 2, 2, "#c8aa70")
  P.r(58, 5, 5, 5, INK); P.r(59, 6, 3, 3, "#2a2a6a"); P.p(59, 6, "#6a6aca")
  P.line(61, 5, 66, 0, "#f8f0e0"); P.line(62, 5, 67, 1, "#d8c8a8"); P.p(66, 0, RED)
  P.ell(74, 8, 4, 3, INK); P.ell(74, 8, 3, 2, GOLD); P.p(73, 7, "#fff0a0"); P.r(73, 4, 2, 2, GOLD_D)
  return P.c
}

/** the Town Hall: a mayor's hall with a chronicle wall, a map of the vale, banners, a long rug and bookshelves */
export function buildTownHall(content: Portfolio): Scene {
  const p = content.profile
  const full = p.name, first = full.split(" ")[0]
  const edu = content.education[0]
  const exp = [...content.experience].sort((a, b) => stamp(a.start) - stamp(b.start))
  const NW = 5, w = 29, h = 14
  const R = makeRoom("townhall", "Town Hall", { w, h, wallH: NW, world: "village", theme: villageTheme({ wall: "beige", floor: "tan", kind: "plaster", base: "#e6cf9a", dark: 0.22, tint: "46,22,8" }) })
  const W = w * TS, cx = W / 2

  // ── north wall: the chronicle (six framed pages), two banners and the big map ──
  const chron: { date: string; lines: string[] }[] = []
  const mon = (d: string) => `${d.slice(0, 3).toUpperCase()} '${d.slice(-2)}`
  const cg = /CGPA\s*([\d.]+)/.exec(edu.note ?? "")
  chron.push({ date: mon(edu.start), lines: ["SPIT", edu.degree.toUpperCase(), cg ? `${cg[1]}/10` : "HONOURS"] })
  const mn = content.education.find((e) => /minor/i.test(e.degree))
  if (mn) chron.push({ date: mon(mn.start), lines: ["SPJIMR", "MINOR", "MGMT"] })
  for (const e of exp) {
    const role = e.role.replace(/Software Development Engineer/i, "SDE").replace(/Technology Developer/i, "DEV").replace(/Technical/i, "TECH")
    const org = e.org.length > 8 ? fitTitle(e.org, 28).s : e.org.toUpperCase()
    chron.push({ date: mon(e.start), lines: [org, ...wrapMicro(role, 7, 2)] })
  }
  const firsts = content.achievements.filter((a) => /^1st/i.test(a.title))
  if (firsts.length) chron.push({ date: `${firsts[0].date}`, lines: [`${firsts.length}X`, "1ST", "PLACE"] })
  const pages = chron.slice(0, 6)
  const px = [40, 88, 136, W - 136, W - 88, W - 40]
  pages.forEach((pg, i) => R.wall(framedPage(46, 44, pg.date, pg.lines), px[i], 8))
  for (let i = pages.length; i < 6; i++) R.wall(framedPage(46, 44, "SOON", ["MORE", "TO", "COME"]), px[i], 8)
  R.light(88, 30, 60, "255,226,170"); R.light(W - 88, 30, 60, "255,226,170")
  R.wall(banner("#a8382e", GOLD, "flower"), 172, 6); R.wall(banner("#2f6f8a", GOLD, "star"), W - 172, 6)
  R.wall(villageMap(), cx, 8)
  R.light(cx, 40, 90, "255,236,190")

  // ── floor: runner rug, rounded gold medallion, lounge rugs ──
  R.decal((g) => {
    rug(g, cx - 32, (NW + 2) * TS + 4, 64, (h - 1 - NW - 2) * TS - 4, "#a8382e", "#7a1f24", GOLD, false)
    g.fillStyle = GOLD; g.beginPath(); g.arc(cx, 10 * TS + 4, 18, 0, 7); g.fill(); g.fillStyle = "#7a1f24"; g.beginPath(); g.arc(cx, 10 * TS + 4, 15, 0, 7); g.fill()
    g.fillStyle = "#a8382e"; g.beginPath(); g.arc(cx, 10 * TS + 4, 12, 0, 7); g.fill()
    g.fillStyle = GOLD; for (const [dx, dy] of [[0, -9], [9, 0], [0, 9], [-9, 0]]) g.fillRect(cx + dx - 1, 10 * TS + 4 + dy - 1, 3, 3)
    g.fillRect(cx - 1, 10 * TS + 4 - 5, 3, 10); g.fillRect(cx - 5, 10 * TS + 3, 10, 3)
    rug(g, 3 * TS, 9 * TS, 80, 56, "#2f6f8a", "#1c4458", "#e8d49a")
    rug(g, W - 3 * TS - 80, 9 * TS + 8, 80, 48, "#6a8a3a", "#3e5a22", "#e8d49a")
  })
  R.pool(cx, 9 * TS, 110, 44, "255,200,120", 0.12)

  // ── mayor's desk and candles ──
  const desk = mayorDesk()
  R.add(desk, cx, 8 * TS, { solid: [84, 12] })
  const cd = candle()
  R.add(cd, cx - 26, 8 * TS - 18, { solid: false, baseOff: 12, anim: { frames: 3, fps: 5, dx: 8 } })
  R.add(cd, cx + 24, 8 * TS - 18, { solid: false, baseOff: 12, anim: { frames: 3, fps: 5, dx: 8 } })
  R.light(cx - 26, 8 * TS - 24, 44, "255,190,110", 0.8); R.light(cx + 24, 8 * TS - 24, 44, "255,190,110", 0.8)
  // standing lamps and candelabras on the rug
  for (const x of [cx - 52, cx + 52]) {
    R.add(candelabra(), x, 8 * TS + 2, { anim: { frames: 3, fps: 5, dx: 20 }, solid: [10, 6] })
    R.light(x, 8 * TS - 24, 80, "255,200,120", 1)
  }
  // shelves and furniture
  prop(R, "bookshelf", 1, NW - 1); prop(R, "bookshelf", 3, NW - 1); prop(R, "bigShelf", 24, NW - 1); prop(R, "bookshelf", 26, NW - 1)
  prop(R, "scrolls", 6, NW, { solid: false }); prop(R, "candles", 22, NW, { solid: false })
  prop(R, "chest", 1, 7)
  prop(R, "pottedPlant", 1, 11); prop(R, "pottedPlant", 27, 11); prop(R, "plantPot", 9, NW + 1); prop(R, "plantPot", 19, NW + 1)
  prop(R, "redTable", 4, 10); prop(R, "stool", 3, 10); prop(R, "stool", 5, 10)
  prop(R, "candles", 4, 9, { solid: false, dy: 9 })
  prop(R, "longTable", 23, 10); prop(R, "scrolls", 24, 10, { solid: false, dy: -5 })
  prop(R, "catStatue", 26, 8); prop(R, "dresser", 26, 10)

  // ── people ──
  const note = edu.note ? edu.note.replace(/\.$/, "") : ""
  R.actors.push(npc(CHARS.mayor, cx, 7 * TS + 6, {
    id: "mayor", name: "Mayor Hiro",
    lines: [
      `Welcome to Hearthvale Town Hall, traveller! I am Mayor Hiro.`,
      `Our village was built by ${full}: ${p.title.toLowerCase()}, from ${p.location}.`,
      `${edu.school.split(" (")[0]}: ${edu.degree} ${edu.field}, ${edu.start} to ${edu.end}. ${note}.`,
      `Our posts on record: ${exp.map((e) => `${e.role} at ${e.org}`).join("; ")}.`,
      `${p.availability}. The chronicle on the wall is ${first}'s whole story in six pages.`,
    ],
    action: { type: "section", id: "townhall" },
  }))
  R.actors.push(npc("Villager4", 24 * TS + 8, 9 * TS + 4, { id: "clerk", name: "Clerk Mina", facing: "down", bark: [`${first} is "${p.motto}"`, "Mind the freshly inked ledger!"] }))
  R.actors.push(npc("OldWoman", 4 * TS + 8, 11 * TS + 8, { id: "elder", name: "Elder Yuki", facing: "right", wander: 18, bark: ["I saw the first page being hung."] }))

  // ── hotspots ──
  R.spot("chronicle", cx, 8 * TS + 14, "READ THE CHRONICLE", { type: "section", id: "townhall" }, true, cx, 3 * TS)
  R.spot("map", cx - 80, 7 * TS + 4, "STUDY THE VILLAGE MAP", {
    type: "sign", lines: ["HEARTHVALE", "Town Hall: about", "Gallery: projects", "Tavern: experience", "Forge: skills", "Academy: education and honours", "Raven Post: contact", "Old Mine: arcade"],
  }, true, cx - 80, 3 * TS)
  return R.finish()
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
function stamp(s: string) { const m = /([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(s); return m ? +m[2] * 12 + Math.max(0, MONTHS.indexOf(m[1].toLowerCase())) : 0 }
