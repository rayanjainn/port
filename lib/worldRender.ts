// World renderer — everything static is pre-rendered once at native 16px
// resolution, then blitted at SCALE with nearest-neighbour sampling so the
// whole village stays pixel-perfect and cheap to draw every frame.
import { WORLD_MAP, WORLD_W, WORLD_H, T, DECOR, DECOR_TILE, type Building } from "./tilemap"

export const TS = 16          // native tile size
export const MARGIN = 12      // tiles of forest rendered outside the playable map

export function hash2(x: number, y: number, s = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
  return n - Math.floor(n)
}

// tiny-town tilemap: 12 cols, 16px tiles + 1px gap
export function tsrc(idx: number): [number, number] {
  return [(idx % 12) * 17, Math.floor(idx / 12) * 17]
}
export function blit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, idx: number, dx: number, dy: number, size = TS) {
  const [sx, sy] = tsrc(idx)
  ctx.drawImage(img, sx, sy, 16, 16, dx, dy, size, size)
}

const tileAt = (r: number, c: number) =>
  r < 0 || r >= WORLD_H || c < 0 || c >= WORLD_W ? T.WATER : WORLD_MAP[r][c]
const isForest = (r: number, c: number) => {
  const t = tileAt(r, c)
  return t === T.TREE || t === T.WATER
}
const isWater = (r: number, c: number) => {
  const t = tileAt(r, c)
  return t === T.POND || t === T.BRIDGE
}
const isDirt = (r: number, c: number) => {
  const t = tileAt(r, c)
  return t === T.PATH || t === T.SAND
}

// ── Forest regions: flood-fill so each connected wood picks one palette
function forestPalette(): Int8Array {
  const W = WORLD_W + MARGIN * 2, H = WORLD_H + MARGIN * 2
  const pal = new Int8Array(W * H).fill(-1)
  for (let r0 = 0; r0 < H; r0++)
    for (let c0 = 0; c0 < W; c0++) {
      if (pal[r0 * W + c0] !== -1) continue
      if (!isForest(r0 - MARGIN, c0 - MARGIN)) continue
      const outer = tileAt(r0 - MARGIN, c0 - MARGIN) === T.WATER
      // the outer wall stays green; inner woods are sometimes autumnal
      const v = outer ? 0 : hash2(r0, c0, 3) < 0.4 ? 1 : 0
      const stack = [[r0, c0]]
      pal[r0 * W + c0] = v
      while (stack.length) {
        const [r, c] = stack.pop()!
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr, nc = c + dc
          if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue
          if (pal[nr * W + nc] !== -1) continue
          if (!isForest(nr - MARGIN, nc - MARGIN)) continue
          if ((tileAt(nr - MARGIN, nc - MARGIN) === T.WATER) !== outer) continue
          pal[nr * W + nc] = v
          stack.push([nr, nc])
        }
      }
    }
  return pal
}

const FOREST = [
  { top: 7, mid: 19, bot: 31, left: 18, right: 20, single: 16, corner: 28 },
  { top: 10, mid: 22, bot: 34, left: 21, right: 23, single: 15, corner: 27 },
]

// ── Water palette
const WATER_DEEP = [72, 160, 204]
const WATER_MID = [94, 182, 220]
const WATER_SHALLOW = [134, 210, 232]
const FOAM = [232, 246, 244]
const BANK = [92, 150, 72]
const BANK_DK = [74, 124, 60]

export function buildBase(tt: HTMLImageElement): HTMLCanvasElement {
  const W = (WORLD_W + MARGIN * 2) * TS
  const H = (WORLD_H + MARGIN * 2) * TS
  const cv = document.createElement("canvas")
  cv.width = W; cv.height = H
  const ctx = cv.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  const O = MARGIN * TS

  // 1. grass everywhere
  for (let r = -MARGIN; r < WORLD_H + MARGIN; r++)
    for (let c = -MARGIN; c < WORLD_W + MARGIN; c++) {
      const h = hash2(c, r)
      blit(ctx, tt, h < 0.1 ? 1 : 0, O + c * TS, O + r * TS)
    }

  // 2. dirt roads (9-slice autotile) + stepping-stone plazas + flowers/props on ground
  for (let r = 0; r < WORLD_H; r++)
    for (let c = 0; c < WORLD_W; c++) {
      const t = WORLD_MAP[r][c]
      const x = O + c * TS, y = O + r * TS
      if (t === T.PATH || t === T.SAND) {
        const dr = !isDirt(r - 1, c) ? 0 : !isDirt(r + 1, c) ? 2 : 1
        const dc = !isDirt(r, c - 1) ? 0 : !isDirt(r, c + 1) ? 2 : 1
        blit(ctx, tt, 12 + dr * 12 + dc, x, y)
      } else if (t === T.STONE) {
        blit(ctx, tt, 43, x, y)
      } else if (t === T.FLOWER) {
        blit(ctx, tt, 2, x, y)
      } else if (t === T.MUSHROOM) {
        blit(ctx, tt, 29, x, y)
      } else if (t === T.BUSH) {
        blit(ctx, tt, 5, x, y)
      }
    }

  // 3. water with pixel shorelines, done per-pixel on the image data
  const img = ctx.getImageData(0, 0, W, H)
  const d = img.data
  const waterPx = (px: number, py: number) => {
    const c = Math.floor(px / TS) - MARGIN, r = Math.floor(py / TS) - MARGIN
    if (!isWater(r, c)) return false
    // round off convex corners of each water tile
    const lx = ((px % TS) + TS) % TS, ly = ((py % TS) + TS) % TS
    const R = 6
    const up = isWater(r - 1, c), dn = isWater(r + 1, c), lf = isWater(r, c - 1), rt = isWater(r, c + 1)
    const corner = (cx: number, cy: number) => Math.hypot(lx + 0.5 - cx, ly + 0.5 - cy) > R
    if (!up && !lf && lx < R && ly < R && corner(R, R)) return false
    if (!up && !rt && lx >= TS - R && ly < R && corner(TS - R, R)) return false
    if (!dn && !lf && lx < R && ly >= TS - R && corner(R, TS - R)) return false
    if (!dn && !rt && lx >= TS - R && ly >= TS - R && corner(TS - R, TS - R)) return false
    return true
  }
  const x0 = O, y0 = O, x1 = O + WORLD_W * TS, y1 = O + WORLD_H * TS
  const mask = new Uint8Array(W * H)
  for (let py = y0; py < y1; py++)
    for (let px = x0; px < x1; px++)
      if (waterPx(px, py)) mask[py * W + px] = 1
  const setPx = (i: number, c: number[]) => { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255 }
  for (let py = y0 - 2; py < y1 + 2; py++)
    for (let px = x0 - 2; px < x1 + 2; px++) {
      const i = py * W + px
      const water = mask[i] === 1
      // distance to the opposite medium (max 4px)
      let best = 9
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const j = (py + dy) * W + (px + dx)
          if (j < 0 || j >= mask.length) continue
          if ((mask[j] === 1) !== water) {
            const dist = Math.hypot(dx, dy)
            if (dist < best) best = dist
          }
        }
      if (water) {
        if (best <= 1.01) setPx(i, FOAM)
        else if (best <= 2.3) setPx(i, WATER_SHALLOW)
        else if (best <= 4.3) setPx(i, WATER_MID)
        else {
          // gentle depth noise
          const n = hash2(Math.floor(px / 8), Math.floor(py / 4), 5)
          const line = (px + Math.floor(py / 4) * 5) % 13 === 0 && n < 0.35
          setPx(i, line ? WATER_MID : WATER_DEEP)
        }
      } else if (best <= 1.01) setPx(i, BANK_DK)
      else if (best <= 2.01) setPx(i, BANK)
    }
  ctx.putImageData(img, 0, 0)

  // 4. bridges — chunky planks with rails
  for (let r = 0; r < WORLD_H; r++)
    for (let c = 0; c < WORLD_W; c++) {
      if (WORLD_MAP[r][c] !== T.BRIDGE) continue
      const x = O + c * TS, y = O + r * TS
      const lf = tileAt(r, c - 1) === T.BRIDGE, rt = tileAt(r, c + 1) === T.BRIDGE
      ctx.fillStyle = "#3b2414"; ctx.fillRect(x, y, TS, TS)
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k % 2 ? "#a8723f" : "#b98149"
        ctx.fillRect(x, y + k * 4, TS, 3)
        ctx.fillStyle = "#d29a5a"
        ctx.fillRect(x, y + k * 4, TS, 1)
        ctx.fillStyle = "#6e4222"
        ctx.fillRect(x + ((k * 5 + c * 3) % 13) + 1, y + k * 4 + 1, 1, 1)
      }
      if (!lf) { ctx.fillStyle = "#4a2c16"; ctx.fillRect(x, y, 2, TS); ctx.fillStyle = "#8a5a2c"; ctx.fillRect(x + 2, y, 1, TS) }
      if (!rt) { ctx.fillStyle = "#4a2c16"; ctx.fillRect(x + TS - 2, y, 2, TS); ctx.fillStyle = "#8a5a2c"; ctx.fillRect(x + TS - 3, y, 1, TS) }
    }

  // 5. forests — autotiled canopy masses
  const pal = forestPalette()
  const PW = WORLD_W + MARGIN * 2
  for (let r = -MARGIN; r < WORLD_H + MARGIN; r++)
    for (let c = -MARGIN; c < WORLD_W + MARGIN; c++) {
      if (!isForest(r, c)) continue
      const f = FOREST[Math.max(0, pal[(r + MARGIN) * PW + (c + MARGIN)])]
      const up = isForest(r - 1, c), dn = isForest(r + 1, c), lf = isForest(r, c - 1), rt = isForest(r, c + 1)
      const x = O + c * TS, y = O + r * TS
      let idx: number
      if ((!up && !dn) || (!lf && !rt)) idx = f.single
      else if ((!up || !dn) && (!lf || !rt)) idx = f.corner
      else if (!up) idx = f.top
      else if (!dn) idx = f.bot
      else if (!lf) idx = f.left
      else if (!rt) idx = f.right
      else idx = f.mid
      blit(ctx, tt, idx, x, y)
    }

  return cv
}

// ── Buildings ────────────────────────────────────────────────────
export interface BuildingSprite {
  canvas: HTMLCanvasElement
  offY: number                // native px of extra headroom above the footprint
  windows: { x: number; y: number }[]   // native px, relative to footprint top-left
  door: { x: number; y: number }
  chimney: { x: number; y: number } | null
}

const ROOFS = {
  grey: { top: [48, 49, 50], body: [60, 61, 62], gable: 63, dormer: 51 },
  red: { top: [52, 53, 54], body: [64, 65, 66], gable: 67, dormer: 55 },
}
const WALLS = {
  wood: { plain: [72, 73, 72], window: 84, door: 85 },
  stone: { plain: [76, 77, 76], window: 88, door: 89 },
}
const STYLE: Record<string, { roof: keyof typeof ROOFS; wall: keyof typeof WALLS }> = {
  townhall: { roof: "grey", wall: "stone" },
  academy: { roof: "red", wall: "stone" },
  gallery: { roof: "grey", wall: "wood" },
  tavern: { roof: "red", wall: "wood" },
  forge: { roof: "grey", wall: "wood" },
}

export function buildBuilding(tt: HTMLImageElement, b: Building): BuildingSprite {
  const head = 10
  const cv = document.createElement("canvas")
  cv.width = b.w * TS + 8
  cv.height = b.h * TS + head
  const ctx = cv.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  const ox = 4, oy = head
  const dc = b.doorX - b.x
  const windows: { x: number; y: number }[] = []
  let chimney: { x: number; y: number } | null = null

  if (b.id === "wizard") {
    // stone tower with battlements, arrow-slit windows and a glowing top
    for (let r = 0; r < b.h; r++)
      for (let c = 0; c < b.w; c++) {
        let idx: number
        if (r === 0) idx = [96, 97, 98][c] ?? 97
        else if (r === b.h - 1) idx = c === dc ? 103 : [120, 121, 122][c] ?? 121
        else if (r === 1 || r === 3) idx = c === 1 ? 125 : [108, 109, 110][c] ?? 109
        else idx = [108, 109, 110][c] ?? 109
        blit(ctx, tt, idx, ox + c * TS, oy + r * TS)
        if ((r === 1 || r === 3) && c === 1) windows.push({ x: c * TS + 8, y: r * TS + 8 })
      }
    return { canvas: cv, offY: head, windows, door: { x: dc * TS + 8, y: (b.h - 1) * TS + 10 }, chimney: null }
  }

  if (b.id === "cave") {
    const top = [96, 97, 98], bot = [120, 124, 122]
    for (let c = 0; c < b.w; c++) {
      blit(ctx, tt, top[c] ?? 97, ox + c * TS, oy)
      blit(ctx, tt, bot[c] ?? 121, ox + c * TS, oy + TS)
    }
    return { canvas: cv, offY: head, windows, door: { x: TS * 1.5, y: TS * 1.6 }, chimney: null }
  }

  const st = STYLE[b.id] ?? STYLE.townhall
  const roof = ROOFS[st.roof], wall = WALLS[st.wall]
  const roofRows = b.h - (b.h >= 5 ? 2 : 1)
  for (let r = 0; r < b.h; r++)
    for (let c = 0; c < b.w; c++) {
      const ei = c === 0 ? 0 : c === b.w - 1 ? 2 : 1
      let idx: number
      if (r === 0) idx = roof.top[ei]
      else if (r < roofRows) {
        idx = roof.body[ei]
        if (r === roofRows - 1 && c === dc) idx = roof.gable
        if (r === 1 && b.w >= 5 && c === (dc > b.w / 2 ? 1 : b.w - 2) && roofRows >= 3) idx = roof.dormer
      } else if (r < b.h - 1) idx = wall.plain[ei]
      else {
        idx = c === dc ? wall.door : wall.window
        if (c !== dc) windows.push({ x: c * TS + 8, y: r * TS + 7 })
      }
      blit(ctx, tt, idx, ox + c * TS, oy + r * TS)
    }
  // brick chimney
  const chC = dc > b.w / 2 ? 0 : b.w - 1
  const chx = ox + chC * TS + 5, chy = oy - 6
  ctx.fillStyle = "#3a1e10"; ctx.fillRect(chx - 1, chy - 1, 8, 12)
  ctx.fillStyle = "#b5523a"; ctx.fillRect(chx, chy, 6, 10)
  ctx.fillStyle = "#d9775a"; ctx.fillRect(chx, chy, 6, 2)
  ctx.fillStyle = "#7e3524"; ctx.fillRect(chx, chy + 5, 6, 1)
  chimney = { x: chC * TS + 8, y: -6 }
  return { canvas: cv, offY: head, windows, door: { x: dc * TS + 8, y: (b.h - 1) * TS + 10 }, chimney }
}

// ── Props layer (pre-rendered, drawn under entities) ───────────────
export function buildProps(tt: HTMLImageElement): HTMLCanvasElement {
  const W = (WORLD_W + MARGIN * 2) * TS, H = (WORLD_H + MARGIN * 2) * TS
  const cv = document.createElement("canvas")
  cv.width = W; cv.height = H
  const ctx = cv.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  const O = MARGIN * TS
  for (const p of DECOR) {
    const x = O + p.x * TS, y = O + p.y * TS
    // soft contact shadow
    ctx.fillStyle = "rgba(20,40,10,0.28)"
    ctx.fillRect(x + 3, y + 13, 10, 2)
    ctx.fillRect(x + 4, y + 14, 8, 2)
    if (p.kind === "lamp") {
      ctx.fillStyle = "#2a1a10"; ctx.fillRect(x + 7, y + 4, 2, 11)
      ctx.fillStyle = "#4a3020"; ctx.fillRect(x + 6, y + 14, 4, 2)
      ctx.fillStyle = "#2a1a10"; ctx.fillRect(x + 5, y - 2, 6, 7)
      ctx.fillStyle = "#ffd76a"; ctx.fillRect(x + 6, y - 1, 4, 4)
      ctx.fillStyle = "#fff4c2"; ctx.fillRect(x + 7, y, 2, 2)
      ctx.fillStyle = "#2a1a10"; ctx.fillRect(x + 6, y - 3, 4, 1)
      continue
    }
    const idx = DECOR_TILE[p.kind]
    if (idx != null) blit(ctx, tt, idx, x, y)
  }
  return cv
}
