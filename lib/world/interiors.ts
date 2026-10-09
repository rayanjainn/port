// Walkable interiors for every building, plus the mine dungeon.
import { PROPS, HOUSE_PROPS, CHARS, charSheet, charFace, monsterSheet, animalSheet, type Rect } from "@/lib/na"
import type { Portfolio } from "@/lib/content"
import { TS, sheet, img, blit, hash, mulberry, canvas, type Scene, type Sprite, type Hotspot, type ActorDef, type Light } from "./core"

type WallVariant = "beige" | "orange" | "brown" | "green"
const WALL_OFF: Record<WallVariant, [number, number]> = { beige: [0, 0], orange: [5, 0], brown: [0, 6], green: [5, 6] }

const FLOORS: Record<string, { sheet: "ifloor" | "water"; rects: Rect[] }> = {
  tan: { sheet: "ifloor", rects: [[192, 16, 16, 16]] },
  beige: { sheet: "ifloor", rects: [[16, 16, 16, 16]] },
  orange: { sheet: "ifloor", rects: [[16, 112, 16, 16]] },
  yellow: { sheet: "ifloor", rects: [[96, 208, 16, 16], [16, 208, 16, 16]] },
  dark: { sheet: "ifloor", rects: [[208, 208, 16, 16], [272, 224, 16, 16]] },
  green: { sheet: "ifloor", rects: [[192, 112, 16, 16]] },
  wood: { sheet: "water", rects: [[80, 208, 16, 16], [96, 208, 16, 16], [112, 208, 16, 16]] },
}

interface RoomOpts { w: number; h: number; wall: WallVariant; floor: keyof typeof FLOORS; rug?: boolean }

/** Room shell: floor + wall frame with a doorway in the bottom wall. Returns builders. */
function room(id: string, title: string, o: RoomOpts) {
  const { w, h } = o
  const { c: gcv, ctx: g } = canvas(w * TS, h * TS)
  const blocked = new Uint8Array(w * h)
  const sprites: Sprite[] = []
  const hotspots: Hotspot[] = []
  const actors: ActorDef[] = []
  const lights: Light[] = []
  const [wc, wr] = WALL_OFF[o.wall]
  const W = (c: number, r: number): Rect => [(wc + c) * 16, (wr + r) * 16, 16, 16]
  const doorC = Math.floor(w / 2)
  const fl = FLOORS[o.floor]

  g.fillStyle = "#14121c"
  g.fillRect(0, 0, w * TS, h * TS)
  for (let r = 1; r < h - 1; r++)
    for (let c = 1; c < w - 1; c++) blit(g, sheet(fl.sheet), fl.rects[Math.floor(hash(c, r, 4) * fl.rects.length)], c * TS, r * TS)
  // doorway floor
  blit(g, sheet(fl.sheet), fl.rects[0], doorC * TS, (h - 1) * TS)
  for (let c = 0; c < w; c++) {
    blit(g, sheet("wall"), c === 0 ? W(0, 0) : c === w - 1 ? W(4, 0) : W(2 + (c % 2), 0), c * TS, 0)
    if (c !== doorC) blit(g, sheet("wall"), c === 0 ? W(0, 4) : c === w - 1 ? W(4, 4) : W(2 + (c % 2), 4), c * TS, (h - 1) * TS)
  }
  for (let r = 1; r < h - 1; r++) {
    blit(g, sheet("wall"), W(0, 2), 0, r * TS)
    blit(g, sheet("wall"), W(4, 2), (w - 1) * TS, r * TS)
  }
  // doormat
  g.fillStyle = "#7a3b2a"; g.fillRect(doorC * TS + 2, (h - 1) * TS + 4, 12, 8)
  g.fillStyle = "#b5583c"; g.fillRect(doorC * TS + 3, (h - 1) * TS + 5, 10, 6)

  for (let c = 0; c < w; c++) { blocked[c] = 1; if (c !== doorC) blocked[(h - 1) * w + c] = 1 }
  for (let r = 0; r < h; r++) { blocked[r * w] = 1; blocked[r * w + w - 1] = 1 }

  const put = (name: string, c: number, r: number, extra?: Partial<Sprite>, solid = true) => {
    const p = PROPS[name] ?? HOUSE_PROPS[name]
    const src = PROPS[name] ? sheet("element") : sheet("house")
    const [, , pw, ph] = p.rect
    const x = c * TS, y = r * TS
    const s: Sprite = {
      kind: "sprite", src, rect: p.rect, x, y, baseY: y + ph - 1,
      solid: solid && (p.solid ?? true) ? { x: x + 1, y: y + Math.max(0, ph - 12), w: pw - 2, h: Math.min(10, ph) } : undefined, ...extra,
    }
    sprites.push(s)
    return s
  }
  const spot = (id2: string, x: number, y: number, label: string, action: Hotspot["action"], marker = true, mx?: number, my?: number) =>
    hotspots.push({ id: id2, box: { x: x - 14, y: y - 10, w: 28, h: 22 }, label, action, marker, markerX: mx ?? x, markerY: my ?? y - 30 })

  hotspots.push({ id: "exit", box: { x: doorC * TS - 4, y: (h - 1) * TS, w: 24, h: 16 }, label: "LEAVE", action: { type: "exit" } })

  const finish = (extra: Partial<Scene>): Scene => ({
    id, title, w, h, ground: gcv, sprites, blocked, hotspots, actors, lights,
    spawn: { x: doorC * TS + 8, y: (h - 2) * TS + 10, facing: "up" }, dark: 0.15, music: "chill", scale: 4, bg: "#0d0b14",
    ...extra,
  })
  return { g, put, spot, sprites, hotspots, actors, lights, blocked, finish, doorC }
}

function npc(name: string, x: number, y: number, extra: Partial<ActorDef>): ActorDef {
  return { id: name, kind: "npc", sheet: charSheet(name), face: charFace(name), name, x, y, wander: 0, facing: "down", ...extra }
}

// ── generated "paintings" for each project ─────────────────────
function painting(seed: string, accent: string, w = 20, h = 16) {
  const { c, ctx } = canvas(w + 4, h + 4)
  const rnd = mulberry([...seed].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7))
  // gilded frame
  ctx.fillStyle = "#3a2210"; ctx.fillRect(0, 0, w + 4, h + 4)
  ctx.fillStyle = "#d9a441"; ctx.fillRect(1, 1, w + 2, h + 2)
  ctx.fillStyle = "#8a5a1c"; ctx.fillRect(2, 2, w, h)
  // canvas: sky gradient tinted with the accent
  const hex = accent.replace("#", "")
  const ar = parseInt(hex.slice(0, 2), 16), ag = parseInt(hex.slice(2, 4), 16), ab = parseInt(hex.slice(4, 6), 16)
  for (let y = 0; y < h; y++) {
    const k = y / h
    ctx.fillStyle = `rgb(${Math.round(20 + ar * k * 0.9)},${Math.round(18 + ag * k * 0.7)},${Math.round(40 + ab * k * 0.6)})`
    ctx.fillRect(2, 2 + y, w, 1)
  }
  const motif = Math.floor(rnd() * 3)
  ctx.fillStyle = accent
  if (motif === 0) {
    // sun + mountains
    ctx.fillRect(2 + w - 7, 4, 4, 4)
    for (let x = 0; x < w; x++) { const mh = Math.floor(3 + Math.abs(Math.sin(x * 0.5 + rnd() * 3)) * 6); ctx.fillStyle = `rgba(15,10,25,0.85)`; ctx.fillRect(2 + x, 2 + h - mh, 1, mh) }
  } else if (motif === 1) {
    // abstract blocks
    for (let k = 0; k < 6; k++) { ctx.globalAlpha = 0.5 + rnd() * 0.5; ctx.fillRect(2 + Math.floor(rnd() * (w - 5)), 2 + Math.floor(rnd() * (h - 5)), 3 + Math.floor(rnd() * 4), 3 + Math.floor(rnd() * 4)) }
    ctx.globalAlpha = 1
  } else {
    // stars / circuit
    for (let k = 0; k < 10; k++) { ctx.fillStyle = k % 3 ? "#fff8dc" : accent; ctx.fillRect(2 + Math.floor(rnd() * w), 2 + Math.floor(rnd() * h), 1, 1) }
    ctx.fillStyle = accent; ctx.fillRect(2 + w / 2 - 3, 2 + h / 2 - 3, 6, 6)
    ctx.fillStyle = "#fff8dc"; ctx.fillRect(2 + w / 2 - 1, 2 + h / 2 - 1, 2, 2)
  }
  // shine
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(3, 3, w - 2, 1)
  return c
}

export function buildInteriors(content: Portfolio): Record<string, Scene> {
  const out: Record<string, Scene> = {}
  const first = content.profile.name.split(" ")[0]

  // ── TOWN HALL ───────────────────────────────────────────────
  {
    const R = room("townhall", "Town Hall", { w: 15, h: 11, wall: "beige", floor: "tan" })
    // runner carpet
    for (let r = 3; r < 10; r++) { R.g.fillStyle = "#9c2f2f"; R.g.fillRect(6 * TS + 4, r * TS, TS * 3 - 8, TS); R.g.fillStyle = "#c9a14a"; R.g.fillRect(6 * TS + 6, r * TS, 1, TS); R.g.fillRect(9 * TS - 7, r * TS, 1, TS) }
    R.put("bookshelf", 1, 1); R.put("bookshelf", 3, 1); R.put("bigShelf", 10, 1); R.put("bookshelf", 12, 1)
    R.put("longTable", 6, 3); R.put("candles", 6, 2, undefined, false); R.put("scrolls", 8, 2, undefined, false)
    R.put("bannerRed", 5, 1); R.put("bannerTeal", 9, 1)
    R.put("pottedPlant", 1, 8); R.put("pottedPlant", 13, 8); R.put("catStatue", 13, 4); R.put("chest", 1, 5)
    R.put("frogStatue", 1, 4); R.put("plantPot", 4, 8); R.put("plantPot", 10, 8); R.put("dresser", 12, 6); R.put("jar", 2, 6)
    R.actors.push(npc(CHARS.mayor, 7 * TS + 8, 2 * TS + 14, {
      id: "mayor", name: "Mayor Hiro",
      lines: [`Welcome to the Town Hall, traveller!`, `This village was built by ${content.profile.name}, ${content.profile.title.toLowerCase()}.`, `Our records hold the whole story. Have a look!`],
      action: { type: "section", id: "townhall" },
    }))
    R.spot("chronicle", 7 * TS + 8, 4 * TS + 10, "READ THE CHRONICLE", { type: "section", id: "townhall" }, true, 7 * TS + 8, 2 * TS - 12)
    R.lights.push({ x: 7 * TS, y: 3 * TS, r: 60, color: "255,210,140", flicker: 1 })
    out.townhall = R.finish({})
  }

  // ── GALLERY ─────────────────────────────────────────────────
  {
    const projects = content.projects
    const wallSlots = Math.min(projects.length, 6)
    const easelRows = Math.ceil(Math.max(0, projects.length - wallSlots) / 4)
    const h = 9 + easelRows * 3
    const R = room("gallery", "Gallery", { w: 17, h, wall: "orange", floor: "yellow" })
    projects.forEach((p, i) => {
      const art = painting(p.id, p.accent || "#ffd76a")
      let x: number, y: number, baseY: number
      if (i < wallSlots) {
        x = (2 + i * 2.4) * TS + 4; y = TS - 6; baseY = TS
      } else {
        const k = i - wallSlots
        const row = Math.floor(k / 4), col = k % 4
        x = (2.5 + col * 3.4) * TS; y = (4.2 + row * 3) * TS; baseY = y + 26
        // easel legs
        R.sprites.push({ kind: "sprite", src: easel(), rect: [0, 0, 24, 30], x: x - 2, y: y - 2, baseY, solid: { x: x + 2, y: y + 18, w: 16, h: 8 } })
      }
      R.sprites.push({ kind: "sprite", src: art, rect: [0, 0, art.width, art.height], x, y, baseY: baseY + 1 })
      R.spot(`art-${p.id}`, x + 12, i < wallSlots ? 2 * TS + 4 : y + 34, `VIEW ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, x + 12, y - 8)
    })
    R.put("bannerPurple", 1, 1); R.put("bannerYellow", 15, 1)
    R.put("pottedPlant", 1, h - 3); R.put("pottedPlant", 15, h - 3)
    R.actors.push(npc(CHARS.curator, 13 * TS + 8, (h - 3) * TS + 8, {
      id: "curator", name: "Curator Mei", facing: "left",
      lines: [`Welcome to the Gallery!`, `Every painting here is one of ${first}'s projects.`, `Walk up to one and press E to learn more, or browse them all.`],
      action: { type: "section", id: "gallery" },
    }))
    R.lights.push({ x: 8 * TS, y: TS + 8, r: 120, color: "255,220,160" })
    out.gallery = R.finish({ dark: 0.1 })
  }

  // ── TAVERN ──────────────────────────────────────────────────
  {
    const R = room("tavern", "Tavern", { w: 15, h: 11, wall: "brown", floor: "wood" })
    R.put("longTable", 2, 3); R.put("longTable", 5, 3)
    R.put("barrel", 1, 1); R.put("barrel", 2, 1); R.put("jar", 3, 1); R.put("pot", 4, 1); R.put("crate", 7, 1)
    R.put("redSign", 10, 1)
    R.put("redTable", 4, 6); R.put("stool", 3, 6, undefined, false); R.put("stool", 5, 6, undefined, false)
    R.put("redTable", 10, 6); R.put("stool", 9, 6, undefined, false); R.put("stool", 11, 6, undefined, false)
    R.put("redTable", 7, 8); R.put("stool", 6, 8, undefined, false); R.put("stool", 8, 8, undefined, false)
    R.put("candles", 4, 5, undefined, false); R.put("candles", 10, 5, undefined, false)
    R.put("barrel", 13, 8); R.put("barrel", 13, 9)
    R.actors.push({ id: "dog", kind: "animal", sheet: animalSheet("dog"), x: 8 * TS, y: 9 * TS, wander: 30, speed: 12 })
    R.actors.push(npc(CHARS.barkeep, 4 * TS + 8, 2 * TS + 14, {
      id: "barkeep", name: "Barkeep Taro",
      lines: [`Pull up a stool, friend!`, `Folks here swap tales of ${first}'s past quests.`, `The quest board on the wall has them all.`],
      action: { type: "section", id: "tavern" },
    }))
    R.actors.push(npc("Villager2", 3 * TS + 8, 6 * TS + 14, { id: "patron1", facing: "right", bark: ["Another round!"] }))
    R.actors.push(npc("Monk", 11 * TS + 8, 6 * TS + 14, { id: "patron2", facing: "left", bark: ["Heard about the hackathons?"] }))
    R.spot("board", 10 * TS + 8, 2 * TS + 12, "READ QUEST BOARD", { type: "section", id: "tavern" }, true, 10 * TS + 8, TS - 6)
    for (const [x, y] of [[4, 5], [10, 5]]) R.lights.push({ x: x * TS + 8, y: y * TS + 4, r: 56, color: "255,180,90", flicker: 1 })
    out.tavern = R.finish({ dark: 0.35 })
  }

  // ── FORGE ───────────────────────────────────────────────────
  {
    const R = room("forge", "Forge", { w: 13, h: 10, wall: "brown", floor: "dark" })
    R.put("oven", 2, 1); R.put("oven", 3, 1); R.put("cauldron", 9, 1); R.put("logs", 10, 1); R.put("crate", 11, 1)
    R.put("brazier", 3, 3, { glow: { x: 8, y: 6, r: 40, color: "255,120,50" } })
    const groups = content.skills
    const RACKS: [string, number, number][][] = [
      [["Katana", 6, 14], ["Sword", 6, 17], ["Rapier", 10, 15]],
      [["Hammer", 9, 16], ["Axe", 11, 13], ["Sai", 7, 13]],
      [["Lance", 6, 23], ["Pickaxe", 11, 13], ["BigSword", 7, 16]],
    ]
    groups.forEach((gr, i) => {
      const c = 2 + i * 4
      const rack = R.put("stall", c - 1, 5, undefined, true)
      RACKS[i % RACKS.length].forEach(([name, ww, wh], k) => {
        R.sprites.push({ kind: "sprite", src: img(`/na/weapons/${name}.png`), rect: [0, 0, ww, wh], x: (c - 1) * TS + 12 + k * 11 - ww / 2 + 3, y: 5 * TS + 22 - wh, baseY: rack.baseY + 1 })
      })
      R.spot(`skills-${i}`, c * TS + 8, 7 * TS + 6, `INSPECT ${gr.group.toUpperCase()}`, { type: "section", id: "forge", focus: gr.group }, true, c * TS + 8, 5 * TS - 4)
    })
    R.actors.push(npc(CHARS.smith, 6 * TS + 8, 2 * TS + 12, {
      id: "smith", name: "Smith Kenji",
      lines: [`Hot work in here!`, `These racks hold ${first}'s weapons of choice.`, `Rust, TypeScript, Kubernetes... all tempered by shipping.`],
      action: { type: "section", id: "forge" },
    }))
    R.lights.push({ x: 3 * TS + 8, y: 3 * TS + 6, r: 110, color: "255,120,50", flicker: 1.5 }, { x: 3 * TS, y: 2 * TS, r: 60, color: "255,150,60", flicker: 1 })
    out.forge = R.finish({ dark: 0.5 })
  }

  // ── ACADEMY ─────────────────────────────────────────────────
  {
    const R = room("academy", "Academy", { w: 15, h: 11, wall: "green", floor: "beige" })
    for (const c of [1, 3, 9, 11]) R.put(c === 9 ? "bigShelf" : "bookshelf", c, 1)
    R.put("scrolls", 6, 1, undefined, false); R.put("candles", 7, 1, undefined, false)
    for (const [c, r] of [[3, 5], [6, 5], [9, 5], [3, 7], [6, 7], [9, 7]]) { R.put("redTable", c, r); R.put("stool", c, r + 1, undefined, false) }
    R.put("pottedPlant", 13, 8); R.put("pottedPlant", 1, 8); R.put("bearStatue", 13, 4)
    R.actors.push(npc(CHARS.teacher, 7 * TS + 8, 3 * TS + 6, {
      id: "teacher", name: "Master Sora",
      lines: [`Ah, a curious mind!`, `${first} studied and earned honours here.`, `The scrolls and the trophy shelf tell the story.`],
      action: { type: "section", id: "academy" },
    }))
    R.spot("diploma", 6 * TS + 8, 2 * TS + 14, "READ THE SCROLLS", { type: "section", id: "academy" }, true, 6 * TS + 8, TS - 4)
    R.spot("trophies", 10 * TS, 3 * TS + 10, "VIEW HONOURS", { type: "section", id: "academy", focus: "honours" }, true, 10 * TS, TS - 6)
    R.lights.push({ x: 7 * TS, y: 2 * TS, r: 70, color: "255,230,170" })
    out.academy = R.finish({})
  }

  // ── RAVEN POST (contact) ────────────────────────────────────
  {
    const R = room("wizard", "Raven Post", { w: 13, h: 10, wall: "orange", floor: "tan" })
    R.put("longTable", 4, 3)
    R.put("scrolls", 4, 2, undefined, false); R.put("candles", 6, 2, undefined, false)
    R.put("crate", 1, 1); R.put("crate", 2, 1); R.put("dresser", 10, 1); R.put("bigShelf", 8, 1)
    R.put("orbStatue", 10, 5)
    R.put("pottedPlant", 1, 7); R.put("plantPot", 11, 7)
    R.put("scrolls", 2, 4, undefined, false); R.put("crate", 1, 5); R.put("jar", 2, 5); R.put("bookshelf", 10, 1)
    R.actors.push({ id: "cat", kind: "animal", sheet: animalSheet("cat"), x: 3 * TS, y: 7 * TS, wander: 24, speed: 10 })
    R.actors.push(npc(CHARS.postmaster, 5 * TS + 8, 2 * TS + 12, {
      id: "postmaster", name: "Postmaster Ito",
      lines: [`Raven Post, how can I help?`, `Need to reach ${first}? Our ravens fly straight to ${content.socials.email}.`, `Write your letter and I'll send it off.`],
      action: { type: "section", id: "wizard" },
    }))
    R.spot("letter", 5 * TS + 8, 4 * TS + 12, "WRITE A LETTER", { type: "section", id: "wizard" }, true, 5 * TS + 8, 2 * TS - 12)
    R.spot("orb", 11 * TS, 7 * TS + 4, "GAZE INTO THE ORB", { type: "section", id: "wizard" }, true, 11 * TS, 5 * TS - 6)
    R.lights.push({ x: 11 * TS, y: 5 * TS + 8, r: 60, color: "130,170,255", flicker: 0.5 })
    out.wizard = R.finish({ dark: 0.2 })
  }

  // ── OLD MINE: arcade dungeon ───────────────────────────────
  {
    const R = room("cave", "Old Mine", { w: 23, h: 16, wall: "green", floor: "dark" })
    // bones & pebbles
    const deco: Rect[] = [[13 * 16, 0, 16, 16], [14 * 16, 0, 16, 16], [3 * 16, 0, 16, 16], [4 * 16, 0, 16, 16], [0, 16, 16, 16]]
    for (let k = 0; k < 26; k++) {
      const c = 1 + Math.floor(hash(k, 1, 77) * 21), r = 1 + Math.floor(hash(k, 2, 77) * 13)
      blit(R.g, sheet("floorDetail"), deco[k % deco.length], c * TS, r * TS)
    }
    const games = [
      { id: "serpent", label: "SERPENT", orb: [64, 32, 16, 16] as Rect, c: 4, r: 4, col: "120,200,255" },
      { id: "runes", label: "RUNE RECALL", orb: [80, 32, 16, 16] as Rect, c: 9, r: 4, col: "230,230,255" },
      { id: "quickdraw", label: "QUICKDRAW", orb: [96, 32, 16, 16] as Rect, c: 13, r: 4, col: "255,110,80" },
      { id: "slimes", label: "SLIME SMASH", orb: [112, 32, 16, 16] as Rect, c: 18, r: 4, col: "255,190,80" },
    ]
    for (const gm of games) {
      R.sprites.push({ kind: "sprite", src: sheet("dungeon"), rect: gm.orb, x: gm.c * TS, y: gm.r * TS, baseY: gm.r * TS + 15, solid: { x: gm.c * TS + 1, y: gm.r * TS + 6, w: 14, h: 9 }, glow: { x: 8, y: 4, r: 30, color: gm.col } })
      R.lights.push({ x: gm.c * TS + 8, y: gm.r * TS + 4, r: 70, color: gm.col, flicker: 0.4 })
      R.spot(`game-${gm.id}`, gm.c * TS + 8, gm.r * TS + 26, `PLAY ${gm.label}`, { type: "game", id: gm.id }, true, gm.c * TS + 8, gm.r * TS - 10)
    }
    // torches (fire pedestals) + statues
    for (const [c, r] of [[1, 1], [21, 1], [1, 10], [21, 10], [7, 9], [15, 9]]) {
      R.sprites.push({ kind: "sprite", src: sheet("dungeon"), rect: [32, 32, 16, 16], x: c * TS, y: r * TS, baseY: r * TS + 15, solid: { x: c * TS + 2, y: r * TS + 6, w: 12, h: 9 } })
      R.lights.push({ x: c * TS + 8, y: r * TS + 4, r: 90, color: "255,150,60", flicker: 1.6 })
    }
    R.put("statue", 10, 9)
    // treasure
    R.put("chest", 20, 13)
    R.spot("chest", 20 * TS + 8, 14 * TS + 10, "OPEN CHEST", { type: "chest", id: "mine" }, true, 20 * TS + 8, 13 * TS - 6)
    for (const [c, r] of [[2, 13], [3, 13], [2, 12]]) R.put(["crate", "barrel", "jar"][(c + r) % 3], c, r)
    R.put("grave", 18, 12); R.put("stoneA", 5, 12)
    const mons = ["Skull", "Slime", "Spirit", "Bamboo", "Eye", "Larva"]
    mons.forEach((m, i) => R.actors.push({ id: `mon${i}`, kind: "monster", sheet: monsterSheet(m), x: (5 + i * 3) * TS, y: (8 + (i % 3) * 2) * TS, wander: 60, speed: 18 + i * 2 }))
    R.actors.push(npc("Monk", 11 * TS + 8, 12 * TS + 8, {
      id: "keeper", name: "Arcade Keeper",
      lines: [`Psst! You found the old mine.`, `${first} hid an arcade down here. Four altars, four games.`, `Beat my high scores if you can. The chest is yours too!`],
      bark: ["Try Slime Smash!", "Rune Recall is tricky..."],
    }))
    out.cave = R.finish({ dark: 0.88, music: "dungeon", title: "Old Mine" })
  }

  return out
}

let easelCanvas: HTMLCanvasElement | null = null
function easel() {
  if (easelCanvas) return easelCanvas
  const { c, ctx } = canvas(24, 30)
  ctx.fillStyle = "#3a2210"
  ctx.fillRect(4, 8, 3, 22); ctx.fillRect(17, 8, 3, 22); ctx.fillRect(10, 4, 3, 26)
  ctx.fillStyle = "#a8692f"
  ctx.fillRect(5, 9, 1, 20); ctx.fillRect(18, 9, 1, 20); ctx.fillRect(11, 5, 1, 24)
  ctx.fillStyle = "#3a2210"; ctx.fillRect(2, 20, 20, 3)
  ctx.fillStyle = "#c98a45"; ctx.fillRect(3, 21, 18, 1)
  easelCanvas = c
  return c
}

export const INTERIOR_PRELOAD = [
  charSheet(CHARS.mayor), charFace(CHARS.mayor), charSheet(CHARS.curator), charFace(CHARS.curator),
  charSheet(CHARS.barkeep), charFace(CHARS.barkeep), charSheet(CHARS.smith), charFace(CHARS.smith),
  charSheet(CHARS.teacher), charFace(CHARS.teacher), charSheet(CHARS.postmaster), charFace(CHARS.postmaster),
  charSheet("Monk"), charFace("Monk"), charSheet("Villager2"),
  ...["Skull", "Slime", "Spirit", "Bamboo", "Eye", "Larva"].map(monsterSheet),
  ...["Katana", "Sword", "Rapier", "Hammer", "Axe", "Sai", "Lance", "Pickaxe", "BigSword"].map((w) => `/na/weapons/${w}.png`),
]
