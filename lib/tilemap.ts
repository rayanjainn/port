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

  // ── RIVER — horizontal water channel splitting the world in two
  for (let dy = 0; dy < RIVER_THICK; dy++) {
    for (let x = 2; x < W - 2; x++) {
      map[RIVER_ROW + dy][x] = T.POND
    }
  }
  // BRIDGES — gaps in the river, walkable plank tiles
  for (const bx of BRIDGE_COLS) {
    for (let dx = 0; dx < BRIDGE_W; dx++) {
      for (let dy = -1; dy <= RIVER_THICK; dy++) {
        const x = bx + dx, y = RIVER_ROW + dy
        if (!inb(x, y)) continue
        if (dy < 0 || dy >= RIVER_THICK) {
          // approach pads on both banks
          if (map[y][x] === T.GRASS || map[y][x] === T.GRASS2 || map[y][x] === T.TREE) map[y][x] = T.PATH
        } else {
          map[y][x] = T.BRIDGE
        }
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
        if (y >= RIVER_ROW && y < RIVER_ROW + RIVER_THICK) continue
        // distance from centre with directional noise — yields organic outline
        const angle = Math.atan2(dy, dx)
        const wobble = 0.7 + rng(p.seed + Math.round(angle * 3.5)) * 0.5
        const radius = Math.hypot(dx / p.rx, dy / p.ry)
        if (radius <= wobble) map[y][x] = T.POND
      }
    }
  }

  // Curvy dirt road tour — routes around ponds, uses bridges to cross river
  const nearestBridge = (x: number) =>
    BRIDGE_COLS.reduce((best, bx) =>
      Math.abs(bx - x) < Math.abs(best - x) ? bx : best, BRIDGE_COLS[0]) + 1
  const carve = (ax: number, ay: number, bx: number, by: number, seed: number) => {
    let x = ax, y = ay, i = 0
    while ((x !== bx || y !== by) && i < 600) {
      if (inb(x, y) && map[y][x] !== T.WATER && map[y][x] !== T.POND && map[y][x] !== T.BRIDGE) {
        map[y][x] = T.PATH
      }
      const r = rng(seed * 7.3 + i * 13.1)
      const needX = x !== bx, needY = y !== by
      // route through bridge when crossing the river
      const crossing = (y < RIVER_ROW && by >= RIVER_ROW + RIVER_THICK) ||
                       (y >= RIVER_ROW + RIVER_THICK && by < RIVER_ROW)
      let stepX = Math.sign(bx - x), stepY = Math.sign(by - y)
      if (crossing && Math.abs(y - RIVER_ROW) <= 2) {
        const bridgeX = nearestBridge(x)
        if (Math.abs(x - bridgeX) > 0) stepX = Math.sign(bridgeX - x)
        else stepX = 0
        stepY = Math.sign(by - y)
      }
      const sx = x + stepX, sy = y + stepY
      const okX = needX && inb(sx, y) && map[y][sx] !== T.POND
      const okY = needY && inb(x, sy) && map[sy][x] !== T.POND
      if (okX && (!okY || r < 0.6)) x = sx
      else if (okY) y = sy
      else if (needX && inb(sx, y)) x = sx
      else if (needY && inb(x, sy)) y = sy
      i++
    }
    if (inb(bx, by) && map[by][bx] !== T.BRIDGE) map[by][bx] = T.PATH
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
