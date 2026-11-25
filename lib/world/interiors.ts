// Walkable interiors for every building, plus the mine dungeon.
import { PROPS, HOUSE_PROPS, CHARS, charSheet, charFace, monsterSheet, animalSheet, type Rect } from "@/lib/na"
import type { Portfolio } from "@/lib/content"
import { ordered, exhibitArt, frameAround, plaque, sculpture, matted, FRAME_PRELOAD, type ExProject } from "./exhibits"
import { buildTownHall } from "./interiors-village"
import { TS, G, sheet, img, blit, hash, canvas, type Scene, type Sprite, type Hotspot, type ActorDef, type Light } from "./core"

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
  const tiles = new Uint8Array(w * h).fill(G.Floor)
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
  for (let i = 0; i < w * h; i++) if (blocked[i]) tiles[i] = G.Void

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
    id, title, w, h, ground: gcv, sprites, blocked, hotspots, actors, lights, tiles,
    spawn: { x: doorC * TS + 8, y: (h - 2) * TS + 10, facing: "up" }, dark: 0.15, music: "chill", scale: 4, bg: "#0d0b14", world: "village",
    ...extra,
  })
  return { g, put, spot, sprites, hotspots, actors, lights, blocked, tiles, finish, doorC }
}

function npc(name: string, x: number, y: number, extra: Partial<ActorDef>): ActorDef {
  return { id: name, kind: "npc", sheet: charSheet(name), face: charFace(name), name, x, y, wander: 0, facing: "down", ...extra }
}

export function buildInteriors(content: Portfolio): Record<string, Scene> {
  const out: Record<string, Scene> = {}
  const first = content.profile.name.split(" ")[0]

  out.townhall = buildTownHall(content)

  // ── GALLERY: a museum hall ──────────────────────────────────
  // Back wall: the masterpieces (featured work). Below it, free-standing hanging walls in rows, two per row, with a
  // central aisle to the door. The hall grows a row for every six more projects.
  {
    const list = ordered(content.projects)
    const nTop = Math.min(6, list.length)
    const rest = list.slice(nTop)
    const rows = Math.ceil(rest.length / 6)
    const GW = 40, NW = 7                       // hall width, back-wall height (tiles)
    const T0 = NW + 6                           // first hanging wall's top row
    const PITCH = 9                              // rows between hanging walls
    const h = rows ? T0 + rows * PITCH + 3 : NW + 9
    const R = room("gallery", "Gallery", { w: GW, h, wall: "orange", floor: "yellow" })
    const g = R.g
    const W = GW * TS
    // parquet: darker herringbone feel, runner and rug
    for (let r = NW; r < h - 1; r++) for (let c = 1; c < GW - 1; c++) {
      g.fillStyle = (c + r) % 2 ? "rgba(70,30,10,.10)" : "rgba(255,230,170,.06)"; g.fillRect(c * TS, r * TS, TS, TS)
    }
    const carpet = (x: number, y: number, w2: number, h2: number) => {
      g.fillStyle = "#2a0d14"; g.fillRect(x - 2, y - 2, w2 + 4, h2 + 4)
      g.fillStyle = "#8e1f2f"; g.fillRect(x, y, w2, h2)
      g.fillStyle = "#c9a14a"; g.fillRect(x + 3, y + 3, w2 - 6, 1); g.fillRect(x + 3, y + h2 - 4, w2 - 6, 1); g.fillRect(x + 3, y + 3, 1, h2 - 6); g.fillRect(x + w2 - 4, y + 3, 1, h2 - 6)
      g.fillStyle = "rgba(255,255,255,.06)"; for (let k = 8; k < h2 - 4; k += 8) g.fillRect(x + 6, y + k, w2 - 12, 1)
    }
    const midX = (GW / 2) * TS
    carpet(midX - 24, NW * TS + 8, 48, (h - 1 - NW) * TS - 8)
    carpet(midX - 112, NW * TS + 10, 224, 78)
    // brass medallion in the masterpiece rug
    g.fillStyle = "#c9a14a"; g.beginPath(); g.arc(midX, NW * TS + 49, 15, 0, Math.PI * 2); g.fill()
    g.fillStyle = "#8e1f2f"; g.beginPath(); g.arc(midX, NW * TS + 49, 12, 0, Math.PI * 2); g.fill()
    g.fillStyle = "#f4c430"; g.beginPath(); g.arc(midX, NW * TS + 49, 7, 0, Math.PI * 2); g.fill()

    const paper = (ctx: CanvasRenderingContext2D, w2: number, h2: number, wain: number) => {
      ctx.fillStyle = "#5b2036"; ctx.fillRect(0, 0, w2, h2)
      for (let x = 0; x < w2; x += 12) { ctx.fillStyle = "rgba(255,255,255,.045)"; ctx.fillRect(x, 0, 6, h2) }
      for (let y = 12; y < h2 - wain - 4; y += 16) for (let x = 6 + ((y / 16) % 2) * 6; x < w2; x += 12) { ctx.fillStyle = "rgba(255,205,140,.13)"; ctx.fillRect(x, y, 1, 3); ctx.fillRect(x - 1, y + 1, 3, 1) }
      ctx.fillStyle = "#2b180c"; ctx.fillRect(0, 0, w2, 5); ctx.fillStyle = "#c9a14a"; ctx.fillRect(0, 5, w2, 1); ctx.fillStyle = "#8a6420"; ctx.fillRect(0, 6, w2, 1)
      ctx.fillStyle = "#c9a14a"; ctx.fillRect(0, 0, w2, 1)
      const wy = h2 - wain
      ctx.fillStyle = "#c9a14a"; ctx.fillRect(0, wy, w2, 1); ctx.fillStyle = "#3a2010"; ctx.fillRect(0, wy + 1, w2, wain - 1)
      for (let x = 3; x < w2 - 8; x += 24) { ctx.fillStyle = "#5a3a1e"; ctx.fillRect(x, wy + 3, 20, wain - 6); ctx.fillStyle = "#7a5230"; ctx.fillRect(x, wy + 3, 20, 1) }
      ctx.fillStyle = "#1c0f06"; ctx.fillRect(0, h2 - 2, w2, 2)
    }
    const cone = (ctx: CanvasRenderingContext2D, cx: number, top: number, bottom: number, spread: number, big: boolean) => {
      ctx.fillStyle = "#c9a14a"; ctx.fillRect(cx - 3, top, 6, 3); ctx.fillStyle = "#fff0b0"; ctx.fillRect(cx - 1, top + 3, 2, 1)
      ctx.fillStyle = big ? "rgba(255,236,170,.17)" : "rgba(255,236,170,.11)"
      ctx.beginPath(); ctx.moveTo(cx - 2, top + 4); ctx.lineTo(cx + 2, top + 4); ctx.lineTo(cx + spread, bottom); ctx.lineTo(cx - spread, bottom); ctx.closePath(); ctx.fill()
    }
    // the artwork on a wall canvas: frame, plaque, spotlight. Returns the hotspot centre (x) and frame top.
    const hang = (ctx: CanvasRenderingContext2D, p: ExProject, cx: number, top: number, big: boolean) => {
      const art = exhibitArt(p)
      const inner = big ? matted(art, 6, "#3a0f1c") : art
      const fr = frameAround(inner, "gold", big)
      const x = Math.round(cx - fr.width / 2)
      cone(ctx, cx, 6, top + fr.height + 22, Math.round(fr.width / 2) + 10, big)
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(x + 3, top + 3, fr.width, fr.height)
      ctx.drawImage(fr, x, top)
      const pl = plaque(p, big ? 72 : 56)
      ctx.drawImage(pl, Math.round(cx - pl.width / 2), top + fr.height + 3)
      // a ribbon bow on masterpieces
      if (big) { ctx.fillStyle = "#f4c430"; ctx.fillRect(Math.round(cx) - 2, top - 3, 4, 4); ctx.fillStyle = "#b07d14"; ctx.fillRect(Math.round(cx) - 1, top, 2, 2) }
      return fr
    }
    // north wall painted into the ground
    paper(g, W, NW * TS, 12)
    // keep the side walls: restore the corners
    const topPlan = list.slice(0, nTop)
    const usable = W - 2 * TS
    const tp = usable / Math.max(1, nTop)
    topPlan.forEach((p, k) => {
      const cx = TS + tp * (k + 0.5)
      const fr = hang(g, p, cx, 12, !!p.featured)
      const spotY = NW * TS + 8
      g.fillStyle = "rgba(255,236,170,.1)"; g.beginPath(); g.ellipse(cx, NW * TS + 30, 46, 11, 0, 0, Math.PI * 2); g.fill()
      R.lights.push({ x: cx, y: 12 + fr.height + 12, r: 78, color: "255,226,170" })
      R.spot(`art-${p.id}`, cx, spotY + 36, `VIEW ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, cx, 12 + fr.height + 34)
    })
    for (let c = 0; c < GW; c++) for (let r = 0; r < NW; r++) { R.blocked[r * GW + c] = 1 }
    // pedestals with sculptures of the first featured projects, rope between posts
    const pedX = [6, 13, 27, 34]
    list.filter((p) => p.featured).slice(0, 4).forEach((p, i) => {
      const sc = sculpture(p, i % 2 ? "bronze" : "marble")
      const fx = pedX[i] * TS + 8, fy = (NW + 4) * TS + 6
      R.sprites.push({ kind: "sprite", src: sc, rect: [0, 0, sc.width, sc.height], x: fx - sc.width / 2, y: fy - sc.height, baseY: fy, solid: { x: fx - 11, y: fy - 9, w: 22, h: 8 } })
      R.lights.push({ x: fx, y: fy - 30, r: 52, color: "255,230,180" })
      g.fillStyle = "rgba(255,236,170,.1)"; g.beginPath(); g.ellipse(fx, fy, 24, 8, 0, 0, Math.PI * 2); g.fill()
    })
    const stanchion = (len: number) => {
      const { c: sc, ctx: sx } = canvas(len, 20)
      const post = (x: number) => { sx.fillStyle = "#3a2210"; sx.fillRect(x - 1, 3, 4, 15); sx.fillStyle = "#e6b84a"; sx.fillRect(x, 4, 2, 13); sx.fillStyle = "#fff0b0"; sx.fillRect(x, 4, 1, 12); sx.fillStyle = "#3a2210"; sx.fillRect(x - 2, 17, 6, 2); sx.fillStyle = "#e6b84a"; sx.fillRect(x - 1, 17, 4, 1); sx.fillStyle = "#3a2210"; sx.fillRect(x - 1, 1, 4, 3); sx.fillStyle = "#e6b84a"; sx.fillRect(x, 2, 2, 1) }
      for (let x = 3; x < len - 3; x++) { const t = (x - 3) / (len - 6), sag = Math.round(Math.sin(t * Math.PI) * 4); sx.fillStyle = "#3a0a12"; sx.fillRect(x, 6 + sag, 1, 3); sx.fillStyle = "#b8283c"; sx.fillRect(x, 6 + sag, 1, 2) }
      post(3); post(len - 5)
      return sc
    }
    // ropes across the masterpiece zone, with a gap at the central aisle and in front of each pedestal's hotspot lane
    const rope = (x: number, y: number, len: number) => {
      const s = stanchion(len)
      R.sprites.push({ kind: "sprite", src: s, rect: [0, 0, len, 20], x, y: y - 20, baseY: y, solid: { x: x + 1, y: y - 6, w: 4, h: 5 } })
      R.sprites.push({ kind: "sprite", src: img("/na/tiles/TilesetFloor.png"), rect: [0, 0, 0, 0], x: x + len - 6, y: y - 6, baseY: y, solid: { x: x + len - 6, y: y - 6, w: 4, h: 5 } })
    }
    for (const [x0, x1] of [[2, 14], [26, 38]]) {
      const len = (x1 - x0) * TS
      rope(x0 * TS, (NW + 7) * TS, len)
    }
    // benches and ropes on the partitions
    const bench = (cx: number, y: number) => {
      const { c: bc, ctx: bx } = canvas(44, 18)
      bx.fillStyle = "rgba(0,0,0,.3)"; bx.fillRect(2, 15, 40, 3)
      bx.fillStyle = "#2b180c"; bx.fillRect(3, 9, 3, 7); bx.fillRect(38, 9, 3, 7)
      bx.fillStyle = "#1c0a10"; bx.fillRect(1, 3, 42, 9); bx.fillStyle = "#9a2638"; bx.fillRect(2, 4, 40, 6); bx.fillStyle = "#c8485a"; bx.fillRect(2, 4, 40, 1); bx.fillStyle = "#c9a14a"; bx.fillRect(2, 10, 40, 1)
      R.sprites.push({ kind: "sprite", src: bc, rect: [0, 0, 44, 18], x: Math.round(cx - 22), y: y - 18, baseY: y, solid: { x: Math.round(cx - 21), y: y - 8, w: 42, h: 7 } })
    }
    // partitions
    const pieceRows: { p: ExProject; cx: number }[][] = []
    for (let r = 0; r < rows; r++) {
      const T = (T0 + r * PITCH) * TS
      const base = T + 96
      const chunk = rest.slice(r * 6, r * 6 + 6)
      ;[chunk.slice(0, 3), chunk.slice(3, 6)].forEach((part, side) => {
        if (!part.length) return
        const pw = part.length * 91 + 14
        const x0 = side === 0 ? 19 * TS - pw : 22 * TS
        const { c: wc, ctx: wx } = canvas(pw, 96)
        paper(wx, pw, 96, 10)
        wx.fillStyle = "#1c0f06"; wx.fillRect(0, 0, 2, 96); wx.fillRect(pw - 2, 0, 2, 96)
        wx.fillStyle = "#c9a14a"; wx.fillRect(2, 0, 1, 96); wx.fillRect(pw - 3, 0, 1, 96)
        const cxs: number[] = []
        part.forEach((p, k) => {
          const cx = 7 + 91 * (k + 0.5)
          hang(wx, p, cx, 9, false)
          cxs.push(x0 + cx)
          g.fillStyle = "rgba(255,236,170,.12)"; g.beginPath(); g.ellipse(x0 + cx, base + 12, 44, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,236,170,.1)"; g.beginPath(); g.ellipse(x0 + cx, base + 12, 28, 7, 0, 0, Math.PI * 2); g.fill()
          R.lights.push({ x: x0 + cx, y: T + 72, r: 66, color: "255,226,170" })
          R.spot(`art-${p.id}`, x0 + cx, base + 12, `VIEW ${p.title.toUpperCase()}`, { type: "section", id: "gallery", focus: p.id }, true, x0 + cx, T + 4)
        })
        R.sprites.push({ kind: "sprite", src: wc, rect: [0, 0, pw, 96], x: x0, y: T, baseY: base, solid: { x: x0, y: base - 14, w: pw, h: 12 } })
        // blocked tiles beneath the wall so the 3D view raises it
        for (let c = Math.floor(x0 / TS); c < Math.ceil((x0 + pw) / TS); c++) for (let rr = Math.floor((base - 14) / TS); rr <= Math.floor((base - 1) / TS); rr++) R.blocked[rr * GW + c] = 1
        // benches in the gaps between pieces
        for (let k = 0; k < part.length - 1; k++) bench(x0 + 7 + 91 * (k + 1), base + 26)
        // a brass floor strip in front of the wall
        g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x0, base, pw, 3)
      })
      pieceRows.push([])
    }
    void pieceRows
    R.put("bannerPurple", 1, 1); R.put("bannerYellow", GW - 2, 1)
    R.put("pottedPlant", 1, h - 3); R.put("pottedPlant", GW - 2, h - 3); R.put("pottedPlant", 1, NW + 1); R.put("pottedPlant", GW - 2, NW + 1)
    R.actors.push(npc(CHARS.curator, 24 * TS + 8, (NW + 3) * TS + 8, {
      id: "curator", name: "Curator Mei", facing: "left",
      lines: [`Welcome to the Gallery!`, `Every piece here is one of ${first}'s projects, ${content.projects.length} in all.`, `The masterpieces hang on the back wall. Walk up to any frame and press E.`],
      action: { type: "section", id: "gallery" },
    }))
    R.lights.push({ x: midX, y: (NW + 3) * TS, r: 150, color: "255,215,160" })
    for (let r = 0; r < rows; r++) R.lights.push({ x: midX, y: (T0 + r * PITCH + 7) * TS, r: 70, color: "255,205,140" })
    for (let i = 0; i < GW * h; i++) if (R.blocked[i]) R.tiles[i] = G.Void
    out.gallery = R.finish({ dark: 0.5 })
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
    // one rack per skill group, 4 tiles apart; the room widens to fit them all
    const R = room("forge", "Forge", { w: Math.max(13, content.skills.length * 4 + 3), h: 10, wall: "brown", floor: "dark" })
    R.put("oven", 2, 1); R.put("oven", 3, 1); R.put("cauldron", 9, 1); R.put("logs", 10, 1); R.put("crate", 11, 1)
    R.put("brazier", 3, 3, { glow: { x: 8, y: 6, r: 40, color: "255,120,50" } })
    // a wide forge (one rack per skill group) gets a second work bay so the back wall is not bare
    const FW = Math.max(13, content.skills.length * 4 + 3)
    if (FW > 16) {
      const m = Math.floor(FW / 2) + 3
      R.put("oven", m, 1); R.put("oven", m + 1, 1); R.put("cauldron", FW - 4, 1); R.put("logs", FW - 3, 1)
      R.put("brazier", m + 1, 3, { glow: { x: 8, y: 6, r: 40, color: "255,120,50" } })
      R.lights.push({ x: (m + 1) * TS + 8, y: 3 * TS + 6, r: 110, color: "255,120,50", flicker: 1.5 })
    }
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
    out.cave = R.finish({ dark: 0.88, music: "dungeon", title: "Old Mine", ambient: "cave" })
  }

  return out
}

export const INTERIOR_PRELOAD = [
  ...FRAME_PRELOAD,
  charSheet(CHARS.mayor), charFace(CHARS.mayor), charSheet(CHARS.curator), charFace(CHARS.curator),
  charSheet(CHARS.barkeep), charFace(CHARS.barkeep), charSheet(CHARS.smith), charFace(CHARS.smith),
  charSheet(CHARS.teacher), charFace(CHARS.teacher), charSheet(CHARS.postmaster), charFace(CHARS.postmaster),
  charSheet("Monk"), charFace("Monk"), charSheet("Villager2"),
  ...["Skull", "Slime", "Spirit", "Bamboo", "Eye", "Larva"].map(monsterSheet),
  ...["Katana", "Sword", "Rapier", "Hammer", "Axe", "Sai", "Lance", "Pickaxe", "BigSword"].map((w) => `/na/weapons/${w}.png`),
]
