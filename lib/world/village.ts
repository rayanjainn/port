// The village: a hand-shaped layout with procedural detail.
import { BUILDING_ART, TREES, PLANTS, PROPS, HOUSE_PROPS, DIRT, WATER, GRASS, PLANK, CHARS, charSheet, charFace, animalSheet, SHEETS, type Rect } from "@/lib/na"
import { TS, G, sheet, img, blit, hash, mulberry, autotile, canvas, type Scene, type Sprite, type Hotspot, type ActorDef, type Light } from "./core"

export const VW = 84
export const VH = 64

export interface BuildingSpot {
  id: string            // section id, or "house-*" for decorative homes
  art: keyof typeof BUILDING_ART
  c: number; r: number  // top-left tile
  label?: string
  section?: string
  accent?: string
}

// tile coords chosen by hand so the village reads well; everything else is generated
export const BUILDINGS: BuildingSpot[] = [
  { id: "townhall", art: "hall", c: 37, r: 17, label: "TOWN HALL", section: "ABOUT", accent: "#5b8fd6" },
  { id: "gallery", art: "redRoof", c: 50, r: 24, label: "GALLERY", section: "PROJECTS", accent: "#9a7be0" },
  { id: "academy", art: "lodge", c: 21, r: 18, label: "ACADEMY", section: "EDUCATION", accent: "#3fb3a6" },
  { id: "tavern", art: "izakaya", c: 23, r: 36, label: "TAVERN", section: "EXPERIENCE", accent: "#e09a3a" },
  { id: "forge", art: "kiln", c: 48, r: 39, label: "FORGE", section: "SKILLS", accent: "#e2683a" },
  { id: "wizard", art: "shop", c: 69, r: 13, label: "RAVEN POST", section: "CONTACT", accent: "#8e66e8" },
  { id: "cave", art: "cave", c: 71, r: 49, label: "OLD MINE", section: "ARCADE", accent: "#9a8a72" },
  { id: "house-1", art: "orange", c: 11, r: 25 },
  { id: "house-2", art: "beige", c: 31, r: 46 },
  { id: "house-3", art: "orange2", c: 51, r: 51 },
  { id: "house-4", art: "timber", c: 13, r: 34 },
  { id: "house-5", art: "straw", c: 45, r: 11 },
  { id: "house-6", art: "straw", c: 29, r: 10 },
  { id: "house-7", art: "beige", c: 75, r: 25 },
]

export function doorOf(b: BuildingSpot) {
  const a = BUILDING_ART[b.art]
  const w = a.rect[2], h = a.rect[3]
  const dx = (a.door[0] + a.door[1]) / 2
  return { x: b.c * TS + dx, y: b.r * TS + h, w, h }
}

const RIVER_W = 3
export function riverX(r: number) {
  return 61 + Math.sin(r * 0.13) * 3 + Math.sin(r * 0.05 + 1.3) * 2.2
}
const BRIDGES = [{ r: 17, label: "north" }, { r: 46, label: "south" }]
const PLAZA = { c0: 33, r0: 25, c1: 47, r1: 33 }

export function buildVillage(): Scene {
  const W = VW, H = VH
  const rnd = mulberry(20260517)
  const ground = new Uint8Array(W * H)          // G.*
  const blocked = new Uint8Array(W * H)
  const forest = new Uint8Array(W * H)          // 1 = dense border forest
  const reserved = new Uint8Array(W * H)        // no decoration here
  const idx = (c: number, r: number) => r * W + c
  const inb = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H
  const get = (a: Uint8Array, c: number, r: number, d = 0) => (inb(c, r) ? a[idx(c, r)] : d)

  // ── forest ring with a ragged inner edge
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const d = Math.min(c, r, W - 1 - c, H - 1 - r)
      const edge = 4.2 + Math.sin(c * 0.31 + r * 0.17) * 1.1 + hash(c, r, 9) * 1.2
      if (d < edge) forest[idx(c, r)] = 1
    }

  // ── river (north → south)
  for (let r = 0; r < H; r++) {
    const cx = riverX(r)
    for (let c = Math.floor(cx - RIVER_W / 2); c < cx + RIVER_W / 2; c++) {
      if (!inb(c, r)) continue
      ground[idx(c, r)] = G.Water
      forest[idx(c, r)] = 0
    }
  }

  // ── lake in the south-west with a wobbly shore
  const lake = { cx: 15.5, cy: 50, rx: 6.5, ry: 4.2 }
  for (let r = 40; r < 60; r++)
    for (let c = 5; c < 30; c++) {
      const a = Math.atan2(r - lake.cy, c - lake.cx)
      const wob = 1 + Math.sin(a * 3) * 0.12 + Math.cos(a * 5 + 1) * 0.08
      if (Math.hypot((c - lake.cx) / lake.rx, (r - lake.cy) / lake.ry) < wob) { ground[idx(c, r)] = G.Water; forest[idx(c, r)] = 0 }
    }

  // smooth water so every water region is at least 2 tiles thick (autotile needs it)
  for (let pass = 0; pass < 2; pass++)
    for (let r = 1; r < H - 1; r++)
      for (let c = 1; c < W - 1; c++) {
        if (ground[idx(c, r)] !== G.Water) continue
        const v = ground[idx(c, r - 1)] === G.Water || ground[idx(c, r + 1)] === G.Water
        const h = ground[idx(c - 1, r)] === G.Water || ground[idx(c + 1, r)] === G.Water
        if (!v || !h) ground[idx(c, r)] = G.Grass
      }

  // ── bridges
  const bridgeTiles: { c: number; r: number }[] = []
  for (const b of BRIDGES) {
    for (let r = b.r; r <= b.r + 1; r++) {
      let c0 = W, c1 = 0
      const rx = riverX(r)
      for (let c = Math.floor(rx - 4); c <= Math.ceil(rx + 4); c++) if (ground[idx(c, r)] === G.Water) { c0 = Math.min(c0, c); c1 = Math.max(c1, c) }
      for (let c = c0 - 1; c <= c1 + 1; c++) { ground[idx(c, r)] = G.Bridge; bridgeTiles.push({ c, r }); forest[idx(c, r)] = 0 }
    }
  }

  // ── plaza
  for (let r = PLAZA.r0; r <= PLAZA.r1; r++)
    for (let c = PLAZA.c0; c <= PLAZA.c1; c++) {
      const corner = (r === PLAZA.r0 || r === PLAZA.r1) && (c === PLAZA.c0 || c === PLAZA.c1)
      if (!corner) ground[idx(c, r)] = G.Dirt
    }

  // ── building footprints
  for (const b of BUILDINGS) {
    const a = BUILDING_ART[b.art]
    const tw = Math.ceil(a.rect[2] / TS), th = Math.ceil(a.rect[3] / TS)
    for (let r = b.r - 1; r <= b.r + th + 1; r++)
      for (let c = b.c - 1; c <= b.c + tw; c++) if (inb(c, r)) { forest[idx(c, r)] = 0; reserved[idx(c, r)] = 1 }
  }

  // ── roads: cheapest path from each door to the plaza over noisy costs
  const footprint = (c: number, r: number) => BUILDINGS.some((b) => {
    const a = BUILDING_ART[b.art]
    const tw = Math.ceil(a.rect[2] / TS), th = Math.ceil(a.rect[3] / TS)
    return c >= b.c && c < b.c + tw && r >= b.r && r < b.r + th
  })
  const carve = (sc: number, sr: number, tc: number, tr: number, seed: number) => {
    const N = W * H
    const dist = new Float64Array(N).fill(Infinity)
    const prev = new Int32Array(N).fill(-1)
    const done = new Uint8Array(N)
    const heap: number[] = []
    const push = (i: number) => { heap.push(i); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (dist[heap[p]] <= dist[heap[k]]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p } }
    const pop = () => { const t = heap[0], l = heap.pop()!; if (heap.length) { heap[0] = l; let k = 0; for (;;) { const a = 2 * k + 1, b2 = a + 1; let m = k; if (a < heap.length && dist[heap[a]] < dist[heap[m]]) m = a; if (b2 < heap.length && dist[heap[b2]] < dist[heap[m]]) m = b2; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m } } return t }
    const s = idx(sc, sr), goal = idx(tc, tr)
    dist[s] = 0; push(s)
    while (heap.length) {
      const i = pop()
      if (done[i]) continue
      done[i] = 1
      if (i === goal) break
      const c = i % W, r = (i / W) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dx, nr = r + dy
        if (!inb(nc, nr)) continue
        const g = ground[idx(nc, nr)]
        if (g === G.Water) continue
        if (g === G.Bridge && dy !== 0) continue
        if (ground[i] === G.Bridge && dy !== 0) continue
        if (footprint(nc, nr)) continue
        let cost = 1 + hash(nc, nr, seed) * 1.6
        if (g === G.Dirt || g === G.Bridge) cost = 0.3
        if (forest[idx(nc, nr)]) cost += 12
        const j = idx(nc, nr)
        if (dist[i] + cost < dist[j]) { dist[j] = dist[i] + cost; prev[j] = i; push(j) }
      }
    }
    for (let i = goal; i !== -1 && i !== s; i = prev[i]) {
      if (ground[i] === G.Grass) ground[i] = G.Dirt
      forest[i] = 0
    }
    ground[s] = ground[s] === G.Grass ? G.Dirt : ground[s]
  }
  const pc = Math.round((PLAZA.c0 + PLAZA.c1) / 2), pr = PLAZA.r1
  BUILDINGS.forEach((b, i) => {
    const d = doorOf(b)
    carve(Math.floor(d.x / TS), Math.floor(d.y / TS), pc + ((i % 3) - 1) * 4, i % 2 ? PLAZA.r0 : pr, i + 3)
  })
  // a loop road through the farm and lake for nicer walks
  carve(18, 31, 26, 44, 41)
  carve(22, 44, 30, 52, 42)

  // widen roads irregularly
  const widen: number[] = []
  for (let r = 1; r < H - 1; r++)
    for (let c = 1; c < W - 1; c++)
      if (ground[idx(c, r)] === G.Dirt)
        for (const [dx, dy] of [[1, 0], [0, 1]])
          if (ground[idx(c + dx, r + dy)] === G.Grass && !footprint(c + dx, r + dy) && hash(c, r, 21) < 0.5) widen.push(idx(c + dx, r + dy))
  for (const i of widen) { ground[i] = G.Dirt; forest[i] = 0 }
  // remove 1-tile dirt specks (autotile looks best with blobs)
  for (let r = 1; r < H - 1; r++)
    for (let c = 1; c < W - 1; c++)
      if (ground[idx(c, r)] === G.Grass) {
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => ground[idx(c + dx, r + dy)] === G.Dirt).length
        if (n >= 3) ground[idx(c, r)] = G.Dirt
      }

  // ── sprites, solids, lights, hotspots
  const sprites: Sprite[] = []
  const lights: Light[] = []
  const hotspots: Hotspot[] = []
  const treeMeta: { x: number; y: number; k: string }[] = []
  const tree = (name: keyof typeof TREES, x: number, y: number, dyn = true) => {
    treeMeta.push({ x: Math.round(x), y: Math.round(y), k: name })
    const t = TREES[name]
    const w = t.rect[2], h = t.rect[3]
    const s: Sprite = {
      kind: "sprite", src: sheet("nature"), rect: t.rect, x: x - w / 2, y: y - h, baseY: y,
      solid: dyn ? { x: x - w / 2 + t.trunk[0], y: y - 6, w: t.trunk[1] - t.trunk[0], h: 5 } : undefined,
      sway: dyn ? 0.6 : 0, tag: dyn ? "tree" : "bake",
    }
    sprites.push(s)
  }

  // border forest: dense, overlapping full trees (never cut at tile edges)
  const borderMix = (c: number, r: number): (keyof typeof TREES)[] => {
    if (c > 62 && r > 38) return ["bigOrange", "lime2", "dead", "pine"]
    if (c < 22 && r < 22) return ["pine", "pine", "round", "bigGreen"]
    if (c > 64 && r < 20) return ["pine", "round", "lime"]
    if (r > 48) return ["round", "lime", "bigGreen", "roots"]
    return ["round", "pine", "lime", "roots", "bigGreen"]
  }
  for (let r = -2; r < H + 2; r++)
    for (let c = -2; c < W + 2; c++) {
      const inF = !inb(c, r) || forest[idx(c, r)]
      if (!inF) continue
      if (inb(c, r) && ground[idx(c, r)] !== G.Grass) continue
      if ((c + r) % 2 === 1 && hash(c, r, 5) < 0.55) continue
      const mix = borderMix(c, r)
      const name = mix[Math.floor(hash(c, r, 6) * mix.length)]
      // near the walkable area trees are dynamic so the hero can stand behind them
      let nearOpen = false
      for (let dr = 0; dr <= 3 && !nearOpen; dr++)
        for (let dc = -2; dc <= 2 && !nearOpen; dc++) if (inb(c + dc, r + dr) && !forest[idx(c + dc, r + dr)] && ground[idx(c + dc, r + dr)] !== G.Water) nearOpen = true
      tree(name, c * TS + 8 + (hash(c, r, 7) - 0.5) * 10, r * TS + 14 + (hash(c, r, 8) - 0.5) * 8, nearOpen)
    }
  for (let i = 0; i < W * H; i++) if (forest[i]) blocked[i] = 1

  // groves: cherry blossoms by the academy, autumn wood by the mine
  const grove = (cx: number, cy: number, rad: number, kinds: (keyof typeof TREES)[], n: number, seed: number) => {
    const rr = mulberry(seed)
    for (let k = 0; k < n; k++) {
      const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * rad
      const c = Math.round(cx + Math.cos(a) * d), r = Math.round(cy + Math.sin(a) * d)
      if (!inb(c, r) || ground[idx(c, r)] !== G.Grass || reserved[idx(c, r)] || forest[idx(c, r)]) continue
      if (get(ground, c, r + 1) !== G.Grass || get(ground, c + 1, r) === G.Dirt || get(ground, c - 1, r) === G.Dirt) continue
      reserved[idx(c, r)] = 1
      tree(kinds[Math.floor(rr() * kinds.length)], c * TS + 8, r * TS + 14)
    }
  }
  grove(17, 16, 5, ["cherry", "cherry", "bigPink"], 14, 11)
  grove(66, 41, 5, ["bigOrange", "lime2", "dead"], 12, 12)
  grove(78, 36, 4, ["pine", "round"], 8, 13)
  grove(33, 41, 3, ["round", "lime"], 4, 14)
  grove(53, 16, 4, ["round", "roots", "lime"], 6, 15)
  // lone meadow trees
  for (let k = 0; k < 70; k++) {
    const c = 6 + Math.floor(rnd() * (W - 12)), r = 6 + Math.floor(rnd() * (H - 12))
    if (ground[idx(c, r)] !== G.Grass || reserved[idx(c, r)] || forest[idx(c, r)]) continue
    let ok = true
    for (let dr = -1; dr <= 2 && ok; dr++) for (let dc = -1; dc <= 1 && ok; dc++) if (get(ground, c + dc, r + dr) !== G.Grass || get(reserved, c + dc, r + dr)) ok = false
    if (!ok) continue
    reserved[idx(c, r)] = 1
    const kinds: (keyof typeof TREES)[] = ["round", "lime", "roots", "pine", "tall"]
    tree(kinds[Math.floor(rnd() * kinds.length)], c * TS + 8, r * TS + 14)
  }

  // buildings
  for (const b of BUILDINGS) {
    const a = BUILDING_ART[b.art]
    const [, , w, h] = a.rect
    const x = b.c * TS, y = b.r * TS
    sprites.push({
      kind: "sprite", src: sheet("house"), rect: a.rect, x, y, baseY: y + h - 2,
      solid: { x: x + 2, y: y + a.solidTop, w: w - 4, h: h - a.solidTop - 3 }, tag: `b:${b.id}`,
    })
    const d = doorOf(b)
    // doorway gap: the solid base stops a few px above the door so the hero can step in
    lights.push({ x: d.x, y: d.y - 6, r: 34, color: "255,200,120" })
    if (b.section) {
      hotspots.push({
        id: `door-${b.id}`, box: { x: d.x - 12, y: d.y - 6, w: 24, h: 18 },
        label: `ENTER ${b.label}`, action: { type: "door", to: b.id, label: b.label! }, marker: true, markerX: d.x, markerY: y - 6,
      })
    }
    for (let r = b.r; r < b.r + Math.ceil(h / TS); r++) for (let c = b.c; c < b.c + Math.ceil(w / TS); c++) reserved[idx(c, r)] = 1
  }

  // props
  const prop = (name: string, x: number, y: number, extra?: Partial<Sprite>) => {
    const p = PROPS[name] ?? HOUSE_PROPS[name]
    const src = PROPS[name] ? sheet("element") : sheet("house")
    const [, , w, h] = p.rect
    const s: Sprite = {
      kind: "sprite", src, rect: p.rect, x, y, baseY: y + h - 1,
      solid: p.solid ? { x: x + 2, y: y + h - Math.min(10, h), w: w - 4, h: Math.min(8, h - 2) } : undefined, ...extra,
    }
    sprites.push(s)
    const c0 = Math.floor(x / TS), r0 = Math.floor(y / TS)
    for (let r = r0; r < r0 + Math.ceil(h / TS); r++) for (let c = c0; c < c0 + Math.ceil(w / TS); c++) if (inb(c, r)) reserved[idx(c, r)] = 1
    return s
  }
  const lamp = (c: number, r: number) => {
    prop("lantern", c * TS, r * TS - 16)
    lights.push({ x: c * TS + 8, y: r * TS - 6, r: 64, color: "255,190,100", flicker: 1 })
  }
  const tile = (c: number, r: number) => [c * TS, r * TS] as const

  // plaza: well, statue, market, lamps, banners
  prop("statue", ...tile(39, 26), {})
  prop("well", ...tile(36, 30))
  prop("wellRing", ...tile(43, 30))
  prop("market", ...tile(34, 26))
  prop("market2", ...tile(44, 26))
  prop("crates", ...tile(34, 28))
  prop("barrel", ...tile(47, 27))
  for (const [c, r] of [[33, 25], [47, 25], [33, 34], [47, 34], [36, 23], [43, 23]]) lamp(c, r)
  prop("bannerRed", ...tile(36, 20))
  prop("bannerTeal", ...tile(42, 20))
  // flags on the town hall
  sprites.push({ kind: "sprite", src: img(SHEETS.flagRed), rect: [0, 0, 16, 16], x: 37 * TS - 6, y: 17 * TS - 14, baseY: 17 * TS + 20, anim: { frames: 4, fps: 6, dx: 16 } })
  sprites.push({ kind: "sprite", src: img(SHEETS.flagBlue), rect: [0, 0, 16, 16], x: 41 * TS - 10, y: 17 * TS - 14, baseY: 17 * TS + 20, anim: { frames: 4, fps: 6, dx: 16 } })

  // themed dressing by each building
  prop("bookshelf", ...tile(26, 20))
  prop("scrolls", ...tile(20, 22))
  prop("barrel", ...tile(27, 37)); prop("barrel", ...tile(27, 38)); prop("crate", ...tile(22, 38)); prop("redTable", ...tile(21, 40)); prop("stool", ...tile(20, 40)); prop("stool", ...tile(22, 40))
  prop("logs", ...tile(51, 40)); prop("oven", ...tile(46, 41)); prop("waterBucket", ...tile(51, 41))
  prop("brazier", ...tile(46, 40), { glow: { x: 8, y: 6, r: 50, color: "255,120,50" } })
  lights.push({ x: 46 * TS + 8, y: 40 * TS + 6, r: 70, color: "255,120,50", flicker: 1 })
  prop("orbStatue", ...tile(73, 14)); prop("sign", ...tile(68, 16)); prop("pottedPlant", ...tile(72, 16))
  prop("bannerYellow", ...tile(55, 25)); prop("bannerPurple", ...tile(49, 25)); prop("frogStatue", ...tile(55, 28))
  for (const [c, r] of [[24, 23], [27, 41], [52, 43], [70, 17], [56, 28], [74, 53]]) lamp(c, r)
  // torii on the path to the mine + graves
  prop("torii", 64 * TS, 48 * TS - 8)
  for (const [c, r] of [[66, 53], [68, 54], [65, 55], [69, 56], [67, 57]]) prop(["grave", "stoneA", "stoneB"][(c + r) % 3], ...tile(c, r))
  prop("totem", ...tile(75, 52))
  // farm: tilled plots with crops + windmill house + hay
  const plots: Rect[] = []
  for (const [c0, r0, w, h] of [[8, 39, 6, 3], [8, 43, 6, 2]]) {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) { reserved[idx(c, r)] = 1; blocked[idx(c, r)] = 1 }
    plots.push([c0, r0, w, h])
  }
  prop("hay", ...tile(15, 40)); prop("hay", ...tile(16, 41)); prop("cart", ...tile(15, 43)); prop("laundry", ...tile(9, 31))
  // windmill blades over the timber house
  sprites.push({ kind: "sprite", src: img(SHEETS.mill), rect: [0, 0, 64, 64], x: 13 * TS + 24 - 32, y: 34 * TS - 40, baseY: 34 * TS + 48, anim: { frames: 4, fps: 5, dx: 64 } })
  // watermill on the river bank
  const wmR = 34, wmC = Math.floor(riverX(wmR) - RIVER_W / 2) - 1
  sprites.push({ kind: "sprite", src: img(SHEETS.watermill), rect: [0, 0, 34, 36], x: wmC * TS - 4, y: wmR * TS - 18, baseY: wmR * TS + 18, anim: { frames: 3, fps: 6, dx: 34 }, solid: { x: wmC * TS - 4, y: wmR * TS + 4, w: 30, h: 12 } })
  // lake dock
  const dock = { c: 21, r0: 48, len: 3 }
  for (let k = 0; k < dock.len; k++) {
    const c = dock.c - k
    if (ground[idx(c, dock.r0)] === G.Water) { ground[idx(c, dock.r0)] = G.Bridge; ground[idx(c, dock.r0 + 1)] = G.Bridge; bridgeTiles.push({ c, r: dock.r0 }, { c, r: dock.r0 + 1 }) }
  }
  // signposts with directions
  const sign = (c: number, r: number, lines: string[]) => {
    prop("sign", ...tile(c, r))
    hotspots.push({ id: `sign-${c}-${r}`, box: { x: c * TS - 4, y: r * TS - 2, w: 24, h: 24 }, label: "READ SIGN", action: { type: "sign", lines } })
  }
  sign(31, 32, ["← Academy  ·  Tavern ↓", "Town Hall ↑  ·  Gallery →"])
  sign(58, 18, ["Raven Post →", "Send word to Rayan from here."])
  sign(58, 47, ["Old Mine →", "Locals say it hums with arcade music at night..."])
  sign(21, 46, ["Mirror Lake", "Fish are friends."])

  // decoration on grass: flowers, tufts, bushes, rocks
  const decals: { r: Rect; x: number; y: number; src: "nature" | "floorDetail" }[] = []
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const i = idx(c, r)
      if (ground[i] !== G.Grass || forest[i] || reserved[i]) continue
      const v = hash(c, r, 31)
      const meadow = 0.5 + 0.5 * Math.sin(c * 0.18 + 1) * Math.cos(r * 0.21)
      if (v < 0.035 * (0.5 + meadow)) {
        const b = PLANTS.bush[Math.floor(hash(c, r, 32) * 3)]
        sprites.push({ kind: "sprite", src: sheet("nature"), rect: b, x: c * TS, y: r * TS, baseY: r * TS + 14, solid: { x: c * TS + 3, y: r * TS + 8, w: 10, h: 6 } })
        reserved[i] = 1
      } else if (v < 0.045) {
        const rk = PLANTS.rock[Math.floor(hash(c, r, 33) * 3)]
        sprites.push({ kind: "sprite", src: sheet("nature"), rect: rk, x: c * TS, y: r * TS, baseY: r * TS + 13, solid: { x: c * TS + 3, y: r * TS + 8, w: 10, h: 6 } })
        reserved[i] = 1
      } else if (v < 0.075 + meadow * 0.06) {
        decals.push({ r: PLANTS.flower[Math.floor(hash(c, r, 34) * PLANTS.flower.length)], x: c * TS + (hash(c, r, 35) - 0.5) * 6, y: r * TS + (hash(c, r, 36) - 0.5) * 6, src: "nature" })
      } else if (v < 0.17) {
        decals.push({ r: PLANTS.tuft[Math.floor(hash(c, r, 37) * PLANTS.tuft.length)], x: c * TS, y: r * TS, src: "nature" })
      }
    }

  // ── pre-render ground
  const { c: gcv, ctx: g } = canvas(W * TS, H * TS)
  const isDirt = (c: number, r: number) => { const v = get(ground, c, r, G.Grass); return v === G.Dirt }
  const isWater = (c: number, r: number) => { const v = get(ground, c, r, G.Grass); return v === G.Water || v === G.Bridge }
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const v = ground[idx(c, r)]
      const x = c * TS, y = r * TS
      blit(g, sheet("floor"), GRASS[Math.floor(hash(c, r, 1) * GRASS.length)], x, y)
      if (v === G.Dirt) blit(g, sheet("floor"), autotile(DIRT, isDirt, c, r), x, y)
      if (v === G.Water || v === G.Bridge) blit(g, sheet("water"), autotile(WATER, isWater, c, r), x, y)
    }
  // farm plots (raised tilled soil) + crops
  for (const [c0, r0, w, h] of plots) {
    for (let r = r0; r < r0 + h; r++)
      for (let c = c0; c < c0 + w; c++) {
        const cc = c === c0 ? 0 : c === c0 + w - 1 ? 2 : 1
        const rr = r === r0 ? 0 : r === r0 + h - 1 ? 2 : 1
        blit(g, sheet("field"), [cc * 16, rr * 16, 16, 16], c * TS, r * TS)
        if (rr < 2) blit(g, sheet("floorDetail"), [[5 * 16, 32, 16, 16], [6 * 16, 32, 16, 16], [7 * 16, 32, 16, 16]][(c + r) % 3] as Rect, c * TS, r * TS - 2)
      }
  }
  // bridges & dock planks
  const isBridge = (c: number, r: number) => get(ground, c, r) === G.Bridge
  for (const { c, r } of bridgeTiles) {
    const u = isBridge(c, r - 1), d = isBridge(c, r + 1), l = isBridge(c - 1, r), rt = isBridge(c + 1, r)
    const p = !u ? (!l ? PLANK.tl : !rt ? PLANK.tr : PLANK.t) : !d ? (!l ? PLANK.bl : !rt ? PLANK.br : PLANK.b) : (!l ? PLANK.l : !rt ? PLANK.r : PLANK.c)
    blit(g, sheet("water"), p, c * TS, r * TS)
  }
  for (const d of decals) blit(g, sheet(d.src), d.r, d.x, d.y)

  // bake far-forest trees straight into the ground (they never occlude the hero)
  const baked = sprites.filter((s) => s.tag === "bake").sort((a, b) => a.baseY - b.baseY)
  for (const s of baked) blit(g, s.src as CanvasImageSource, s.rect, s.x, s.y)
  const live = sprites.filter((s) => s.tag !== "bake")

  // water tiles for ripple animation
  const water: { c: number; r: number }[] = []
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (ground[idx(c, r)] === G.Water && isWater(c - 1, r) && isWater(c + 1, r) && isWater(c, r - 1) && isWater(c, r + 1) && hash(c, r, 50) < 0.5) water.push({ c, r })
  for (let i = 0; i < W * H; i++) if (ground[i] === G.Water) blocked[i] = 1
  for (const [c0, r0, w, h] of plots) for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) blocked[idx(c, r)] = 1

  // ── people & animals
  const actors: ActorDef[] = []
  const vill = CHARS.villagers
  const barks = [
    ["The Gallery has all of Rayan's projects!", "Have you seen Ferrite yet?"],
    ["Press M if you get lost.", "The map can fast-travel you."],
    ["The Raven Post delivers messages fast.", "Rayan replies quickly, I hear."],
    ["The forge glows hot tonight.", "Rust... the language, not the metal."],
    ["Something hums inside the old mine...", "Arcade games, they say!"],
    ["Try N for night time ✦", "The lanterns are lovely."],
    ["Ship fast. Break things.", "Fix faster!"],
    ["Tavern folk tell tales of past quests.", "Grab a seat!"],
  ]
  const spots = [[40, 30], [36, 33], [45, 32], [28, 28], [52, 34], [30, 40], [20, 30], [46, 20], [74, 22], [55, 44], [24, 48]]
  spots.forEach(([c, r], i) => {
    const name = vill[i % vill.length]
    actors.push({ id: `v${i}`, kind: "npc", sheet: charSheet(name), face: charFace(name), name, x: c * TS + 8, y: r * TS + 12, wander: 40 + (i % 3) * 16, bark: barks[i % barks.length], speed: 22 + (i % 4) * 3 })
  })
  const animal = (id: string, name: string, c: number, r: number, wander = 30) =>
    actors.push({ id, kind: "animal", sheet: animalSheet(name), x: c * TS + 8, y: r * TS + 12, wander, speed: 14 })
  animal("chick1", "chicken", 11, 46); animal("chick2", "chicken", 16, 46); animal("chick3", "chicken", 13, 37)
  animal("cat", "cat", 41, 32, 20); animal("dog", "dog", 26, 41, 40); animal("cow1", "cow", 6, 30, 20); animal("cow2", "cow", 9, 28, 20)
  animal("frog1", "frog", 22, 45, 16); animal("frog2", "frog", 9, 53, 16)

  return {
    id: "village", title: "Rayan's Village", w: W, h: H, ground: gcv, sprites: live, blocked, hotspots, actors, lights,
    spawn: { x: 40 * TS + 8, y: 24 * TS + 8, facing: "down" }, dark: 0, music: "village", water,
    meta: { trees: treeMeta },
  }
}

export const VILLAGE_PRELOAD = [
  ...Object.values(SHEETS),
  charSheet(CHARS.hero), ...CHARS.villagers.map(charSheet), ...CHARS.villagers.map(charFace),
  ...["chicken", "cat", "dog", "cow", "frog"].map(animalSheet),
]
