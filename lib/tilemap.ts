// Tile type constants
export const T = {
  WATER: 0,
  GRASS: 1,
  GRASS2: 2,
  PATH: 3,
  TREE: 4,
  FLOWER: 5,
  STONE: 6,
  SAND: 7,
  POND: 8,
  BRIDGE: 9,
  MUSHROOM: 10,
  BUSH: 11,
}

export const WALKABLE = new Set([T.GRASS, T.GRASS2, T.PATH, T.FLOWER, T.SAND, T.STONE, T.BRIDGE, T.MUSHROOM])

export const WORLD_W = 60
export const WORLD_H = 40
export const TILE_SIZE = 16
export const SCALE = 3
export const TILE_PX = TILE_SIZE * SCALE // 48px

// Tile colors for canvas rendering
export const TILE_COLORS: Record<number, string> = {
  [T.WATER]:  "#1e3a5f",
  [T.GRASS]:  "#4a7c3f",
  [T.GRASS2]: "#3d6b35",
  [T.PATH]:   "#c9a86c",
  [T.TREE]:   "#2d5a1e",
  [T.FLOWER]: "#5a8a3f",
  [T.STONE]:  "#7a7a7a",
  [T.SAND]:   "#d4b483",
}

// Tile sprite positions in tiny-town tilemap (col, row) — 16px tiles, 1px gap
// Verified via PIL pixel analysis
export const TILE_SPRITES: Record<number, [number, number]> = {
  [T.GRASS]:  [0, 0],   // rgb(132,198,105) bright green ✓
  [T.GRASS2]: [4, 0],   // rgb(96,117,76)  darker green ✓
  [T.PATH]:   [3, 0],   // rgb(158,112,63) warm brown dirt ✓
  [T.WATER]:  [1, 9],   // rgb(192,203,220) blue-grey water ✓
  [T.TREE]:   [5, 0],   // rgb(90,126,75)  dense dark green ✓
  [T.FLOWER]: [2, 0],   // rgb(152,194,103) lighter green ✓
  [T.STONE]:  [0, 4],   // rgb(106,111,134) grey stone ✓
  [T.SAND]:   [0, 1],   // rgb(192,175,106) warm tan ✓
}

export interface Building {
  id: string
  x: number   // tile col
  y: number   // tile row
  w: number   // width in tiles
  h: number   // height in tiles
  label: string
  emoji: string
  color: string
  doorX: number  // col of door (for interaction detection)
  doorY: number  // row of door
  description: string
}

// Buildings spread across the larger world — north of river + south of river
export const BUILDINGS: Building[] = [
  // NORTH half — civic district
  { id: "townhall", x: 22, y: 4,  w: 7, h: 5, label: "TOWN HALL",     emoji: "🏛️", color: "#60a5fa", doorX: 25, doorY: 8,  description: "About Me" },
  { id: "academy",  x: 6,  y: 6,  w: 5, h: 4, label: "ACADEMY",      emoji: "🎓", color: "#4ecdc4", doorX: 8,  doorY: 9,  description: "Certs & Education" },
  { id: "gallery",  x: 44, y: 5,  w: 6, h: 4, label: "GALLERY",       emoji: "🖼️", color: "#a78bfa", doorX: 47, doorY: 8,  description: "Projects" },
  { id: "wizard",   x: 33, y: 12, w: 3, h: 6, label: "WIZARD TOWER",  emoji: "🧙", color: "#8b5cf6", doorX: 34, doorY: 17, description: "Contact" },
  // SOUTH half — across the river
  { id: "tavern",   x: 10, y: 28, w: 4, h: 4, label: "TAVERN",        emoji: "🍺", color: "#f59e0b", doorX: 12, doorY: 31, description: "Work Experience" },
  { id: "forge",    x: 40, y: 27, w: 5, h: 5, label: "FORGE",         emoji: "⚒️", color: "#fb923c", doorX: 42, doorY: 31, description: "Skills" },
  // Cave hidden deep south
  { id: "cave",     x: 50, y: 35, w: 3, h: 2, label: "HIDDEN CAVE",   emoji: "🗝️", color: "#6b7280", doorX: 51, doorY: 36, description: "???" },
]

// River row + bridge cols — exported so renderer can detect bridges
export const RIVER_ROW = 21      // y of river start
export const RIVER_THICK = 2     // tiles tall
export const BRIDGE_COLS = [12, 28, 46]
export const BRIDGE_W = 3

/** Top row of the river at column x — meanders, but runs flat across bridges. */
export function riverTop(x: number) {
  let near = 99
  for (const b of BRIDGE_COLS) near = Math.min(near, Math.abs(x - (b + 1)))
  const damp = Math.min(1, Math.max(0, (near - 2) / 4))
  return RIVER_ROW + Math.round((Math.sin(x * 0.21) * 1.4 + Math.sin(x * 0.083 + 1) * 0.9) * damp)
}

function generateMap(): number[][] {
  const W = WORLD_W, H = WORLD_H
  const map: number[][] = Array.from({ length: H }, () => Array(W).fill(T.GRASS))
  const rng = (s: number) => {
    const x = Math.sin(s * 12.9898) * 43758.5453
    return x - Math.floor(x)
  }
  const inb = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H

  // Outer void border
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (x < 2 || x >= W - 2 || y < 2 || y >= H - 2) map[y][x] = T.WATER

  // Grass texture variation
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++)
      if (rng(y * W + x) < 0.16) map[y][x] = T.GRASS2

  // Organic forest — dense NW + NE + SE pockets, noise-driven
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const nw = Math.max(0, 1 - Math.hypot(x - 2, y - 3)    / 18)
      const ne = Math.max(0, 1 - Math.hypot(x - W + 3, y - 4) / 15)
      const se = Math.max(0, 1 - Math.hypot(x - W + 4, y - H + 3) / 16)
      const sw = Math.max(0, 1 - Math.hypot(x - 3, y - H + 5) / 14)
      const scatter = rng(x * 313 + y * 97) < 0.04 ? 0.35 : 0
      if (rng(x * 7 + y * 131) < nw * 0.9 + ne * 0.85 + se * 0.8 + sw * 0.8 + scatter) {
        map[y][x] = T.TREE
      }
    }
  }

  // Cellular smoothing: turn noisy scatter into cohesive woods
  for (let pass = 0; pass < 3; pass++) {
    const next = map.map((row) => row.slice())
    for (let y = 2; y < H - 2; y++)
      for (let x = 2; x < W - 2; x++) {
        let n = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if ((dx || dy) && (map[y + dy][x + dx] === T.TREE || map[y + dy][x + dx] === T.WATER)) n++
        if (map[y][x] === T.TREE && n <= 3) next[y][x] = T.GRASS
        else if (map[y][x] !== T.TREE && map[y][x] !== T.WATER && n >= 5) next[y][x] = T.TREE
      }
    for (let y = 0; y < H; y++) map[y] = next[y]
  }

  // ── RIVER — meandering channel splitting the world in two, flattened at bridges
  for (let x = 2; x < W - 2; x++) {
    const top = riverTop(x)
    for (let dy = 0; dy < RIVER_THICK; dy++) map[top + dy][x] = T.POND
  }
  for (const bx of BRIDGE_COLS) {
    for (let dx = 0; dx < BRIDGE_W; dx++) {
      const x = bx + dx, top = riverTop(x)
      for (let dy = -1; dy <= RIVER_THICK; dy++) {
        const y = top + dy
        if (!inb(x, y)) continue
        if (dy < 0 || dy >= RIVER_THICK) map[y][x] = T.PATH
        else map[y][x] = T.BRIDGE
      }
    }
  }

  // Ponds — organic blob shapes (asymmetric, noise-driven so none look identical)
  const ponds = [
    { cx: 36, cy: 10, rx: 3, ry: 3, seed: 11 },
    { cx: 15, cy: 14, rx: 3, ry: 2, seed: 31 },
    { cx: 52, cy: 26, rx: 3, ry: 2, seed: 67 },
    { cx: 25, cy: 34, rx: 4, ry: 2, seed: 97 },
  ]
  for (const p of ponds) {
    for (let dy = -p.ry - 1; dy <= p.ry + 1; dy++) {
      for (let dx = -p.rx - 1; dx <= p.rx + 1; dx++) {
        const x = p.cx + dx, y = p.cy + dy
        if (x < 2 || x >= W - 2 || y < 2 || y >= H - 2) continue
        if (y >= RIVER_ROW - 3 && y <= RIVER_ROW + RIVER_THICK + 2) continue
        // distance from centre with directional noise — yields organic outline
        const angle = Math.atan2(dy, dx)
        const wobble = 0.7 + rng(p.seed + Math.round(angle * 3.5)) * 0.5
        const radius = Math.hypot(dx / p.rx, dy / p.ry)
        if (radius <= wobble) map[y][x] = T.POND
      }
    }
  }

  // Roads: cheapest path between doors over noisy costs → organic, always connected
  const carve = (ax: number, ay: number, bx: number, by: number, seed: number) => {
    const N = W * H
    const dist = new Float64Array(N).fill(Infinity)
    const prev = new Int32Array(N).fill(-1)
    const done = new Uint8Array(N)
    const cost = (x: number, y: number) => {
      const t = map[y][x]
      if (t === T.WATER || t === T.POND) return Infinity
      if (BUILDINGS.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h && !(x === b.doorX && y === b.doorY))) return Infinity
      let c = 1 + rng(x * 31.7 + y * 17.3 + seed * 5.1) * 1.4
      if (t === T.PATH || t === T.BRIDGE) c = 0.35       // reuse existing roads
      if (t === T.TREE) c += 7
      return c
    }
    const start = ay * W + ax
    dist[start] = 0
    // tiny binary heap
    const heap: number[] = [start]
    const push = (i: number) => {
      heap.push(i); let k = heap.length - 1
      while (k > 0) { const p = (k - 1) >> 1; if (dist[heap[p]] <= dist[heap[k]]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p }
    }
    const pop = () => {
      const top = heap[0], last = heap.pop()!
      if (heap.length) {
        heap[0] = last; let k = 0
        for (;;) {
          const l = k * 2 + 1, r = l + 1; let m = k
          if (l < heap.length && dist[heap[l]] < dist[heap[m]]) m = l
          if (r < heap.length && dist[heap[r]] < dist[heap[m]]) m = r
          if (m === k) break
          ;[heap[m], heap[k]] = [heap[k], heap[m]]; k = m
        }
      }
      return top
    }
    const goal = by * W + bx
    while (heap.length) {
      const i = pop()
      if (done[i]) continue
      done[i] = 1
      if (i === goal) break
      const x = i % W, y = (i / W) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 2 || ny < 2 || nx >= W - 2 || ny >= H - 2) continue
        // bridges are only entered/exited vertically
        if (dx !== 0 && (map[y][x] === T.BRIDGE || map[ny][nx] === T.BRIDGE)) continue
        const c = cost(nx, ny)
        if (!isFinite(c)) continue
        const j = ny * W + nx
        if (dist[i] + c < dist[j]) { dist[j] = dist[i] + c; prev[j] = i; push(j) }
      }
    }
    for (let i = goal; i !== -1; i = prev[i]) {
      const x = i % W, y = (i / W) | 0
      if (map[y][x] !== T.BRIDGE && !(BUILDINGS.some((b) => b.doorX === x && b.doorY === y))) map[y][x] = T.PATH
      if (i === start) break
    }
  }
  for (let i = 0; i < BUILDINGS.length; i++) {
    const a = BUILDINGS[i], b = BUILDINGS[(i + 1) % BUILDINGS.length]
    carve(a.doorX, a.doorY + 1, b.doorX, b.doorY + 1, i + 1)
  }

  // Widen paths a little irregularly (kept modest so roads stay road-like)
  const widenTargets: [number, number][] = []
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++)
      if (map[y][x] === T.PATH)
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]])
          if (inb(x + dx, y + dy) &&
              (map[y + dy][x + dx] === T.GRASS || map[y + dy][x + dx] === T.GRASS2) &&
              rng((x + dx) * 17 + (y + dy) * 7) < 0.22)
            widenTargets.push([x + dx, y + dy])
  for (const [x, y] of widenTargets) map[y][x] = T.PATH

  // Clear building footprints + 1-tile margin
  BUILDINGS.forEach((b) => {
    for (let dy = -1; dy <= b.h; dy++)
      for (let dx = -1; dx <= b.w; dx++) {
        const tx = b.x + dx, ty = b.y + dy
        if (inb(tx, ty) && map[ty][tx] === T.TREE) map[ty][tx] = T.GRASS
      }
  })

  // Stone plaza in front of each door
  BUILDINGS.forEach((b) => {
    if (b.id === "cave") return
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = 1; dy <= 2; dy++) {
        const tx = b.doorX + dx, ty = b.doorY + dy
        if (inb(tx, ty) && (map[ty][tx] === T.GRASS || map[ty][tx] === T.GRASS2 || map[ty][tx] === T.PATH))
          map[ty][tx] = T.STONE
      }
  })

  // Village → city gate clearing (stone plaza around the signpost)
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = 50 + dx, ty = 33 + dy
      if (!inb(tx, ty)) continue
      if (map[ty][tx] === T.WATER || map[ty][tx] === T.POND || map[ty][tx] === T.BRIDGE) continue
      map[ty][tx] = (Math.abs(dx) + Math.abs(dy) <= 1) ? T.STONE : T.PATH
    }
  }

  // Flower patches scattered across the meadow
  for (let k = 0; k < 30; k++) {
    const cx = 3 + Math.floor(rng(k * 51.7) * (W - 6))
    const cy = 3 + Math.floor(rng(k * 97.3) * (H - 6))
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const tx = cx + dx, ty = cy + dy
        if (inb(tx, ty) &&
            (map[ty][tx] === T.GRASS || map[ty][tx] === T.GRASS2) &&
            rng(tx * 3 + ty * 7) < 0.55)
          map[ty][tx] = T.FLOWER
      }
  }

  // A few lone trees dotted around the meadows
  for (let k = 0; k < 70; k++) {
    const x = 3 + Math.floor(rng(k * 77.7 + 5) * (W - 6))
    const y = 3 + Math.floor(rng(k * 41.3 + 9) * (H - 6))
    if (map[y][x] !== T.GRASS && map[y][x] !== T.GRASS2) continue
    let ok = true
    for (let dy = -1; dy <= 1 && ok; dy++)
      for (let dx = -1; dx <= 1 && ok; dx++) {
        const t = map[y + dy]?.[x + dx]
        if (t === T.PATH || t === T.STONE || t === T.BRIDGE || t === T.POND) ok = false
      }
    if (ok && !BUILDINGS.some((b) => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h + 1)) map[y][x] = T.TREE
  }

  // Mushroom clusters — more clusters, denser
  for (let k = 0; k < 35; k++) {
    const cx = 3 + Math.floor(rng(k * 211.1) * (W - 6))
    const cy = 3 + Math.floor(rng(k * 173.7) * (H - 6))
    if (!inb(cx, cy) || map[cy][cx] !== T.GRASS) continue
    let adjTree = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inb(cx + dx, cy + dy) && map[cy + dy][cx + dx] === T.TREE) { adjTree = true; break }
    }
    if (adjTree) {
      map[cy][cx] = T.MUSHROOM
      // also place neighboring mushroom cluster sometimes
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 1], [1, 1]]) {
        const tx = cx + dx, ty = cy + dy
        if (inb(tx, ty) && map[ty][tx] === T.GRASS && rng(tx * 7 + ty * 5) < 0.35) {
          map[ty][tx] = T.MUSHROOM
        }
      }
    }
  }

  // Bushes — much denser ornamental scatter for richness
  for (let k = 0; k < 120; k++) {
    const x = 3 + Math.floor(rng(k * 311.3) * (W - 6))
    const y = 3 + Math.floor(rng(k * 89.7)  * (H - 6))
    if (!inb(x, y)) continue
    if (map[y][x] === T.GRASS && rng(x * 5 + y * 11) < 0.55) map[y][x] = T.BUSH
  }

  // Asymmetric clusters of bushes near building exteriors (small gardens)
  BUILDINGS.forEach((b, i) => {
    if (b.id === "cave") return
    const side = i % 2 === 0 ? -1 : 1   // alternate which side has the garden
    for (let k = 0; k < 4; k++) {
      const tx = b.x + (side > 0 ? b.w : -1)
      const ty = b.y + b.h - 1 - k
      if (inb(tx, ty) && map[ty][tx] === T.GRASS) map[ty][tx] = T.BUSH
    }
  })

  return map
}

export const WORLD_MAP = generateMap()

// Spawn player on north side near townhall plaza
export const PLAYER_START = { x: 26 * TILE_PX, y: 11 * TILE_PX }

// ── Decorative props ────────────────────────────────────────────
// kind → tiny-town tile index (null = drawn procedurally)
export type DecorKind = "lamp" | "barrel" | "waterBarrel" | "well" | "sign" | "haystack" | "target" | "beehive" | "cart" | "bucket"
export interface Decor { x: number; y: number; kind: DecorKind; solid: boolean }

export const DECOR_TILE: Record<DecorKind, number | null> = {
  lamp: null, barrel: 130, waterBarrel: 131, well: 104, sign: 83,
  haystack: 92, target: 95, beehive: 94, cart: 57, bucket: 107,
}

function placeDecor(map: number[][]): Decor[] {
  const out: Decor[] = []
  const taken = new Set<string>()
  const free = (x: number, y: number) => {
    if (x < 2 || y < 2 || x >= WORLD_W - 2 || y >= WORLD_H - 2) return false
    const t = map[y][x]
    if (t !== T.GRASS && t !== T.GRASS2 && t !== T.FLOWER && t !== T.BUSH && t !== T.MUSHROOM) return false
    if (taken.has(`${x},${y}`)) return false
    for (const b of BUILDINGS) if (x >= b.x - 1 && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return false
    return true
  }
  const put = (x: number, y: number, kind: DecorKind, solid = true) => {
    if (!free(x, y)) return false
    map[y][x] = T.GRASS
    taken.add(`${x},${y}`)
    out.push({ x, y, kind, solid })
    return true
  }
  const near = (cx: number, cy: number, kind: DecorKind, solid = true) => {
    for (let r = 0; r <= 2; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (put(cx + dx, cy + dy, kind, solid)) return
  }

  // lanterns flank every door
  for (const b of BUILDINGS) {
    if (b.id === "cave") continue
    near(b.doorX - 2, b.doorY + 1, "lamp")
    near(b.doorX + 2, b.doorY + 1, "lamp")
  }
  const by = (id: string) => BUILDINGS.find((b) => b.id === id)!
  const th = by("townhall"), tv = by("tavern"), fg = by("forge"), ga = by("gallery"), ac = by("academy"), wz = by("wizard")
  near(th.x + th.w + 1, th.y + th.h + 1, "well")
  near(th.x - 2, th.y + th.h, "cart")
  near(tv.x + tv.w, tv.y + tv.h - 1, "barrel"); near(tv.x + tv.w, tv.y + tv.h - 2, "barrel"); near(tv.x - 1, tv.y + tv.h - 1, "haystack")
  near(fg.x + fg.w, fg.y + fg.h - 1, "waterBarrel"); near(fg.x - 2, fg.y + fg.h, "target"); near(fg.x - 1, fg.y + fg.h - 2, "bucket", false)
  near(ga.x - 2, ga.y + ga.h, "sign")
  near(ac.x + ac.w, ac.y + ac.h - 1, "beehive")
  near(wz.x + wz.w + 1, wz.y + wz.h - 1, "sign")

  // lamps along roads every so often
  const rng = (s: number) => { const x = Math.sin(s * 91.7) * 43758.5453; return x - Math.floor(x) }
  let last = -99
  for (let y = 3; y < WORLD_H - 3; y++)
    for (let x = 3; x < WORLD_W - 3; x++) {
      if (map[y][x] !== T.PATH) continue
      const k = y * WORLD_W + x
      if (k - last < 140 || rng(k) > 0.08) continue
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        if (put(x + dx, y + dy, "lamp")) { last = k; break }
      }
    }
  return out
}

export const DECOR = placeDecor(WORLD_MAP)
export const SOLID_DECOR = new Set(DECOR.filter((d) => d.solid).map((d) => `${d.x},${d.y}`))
