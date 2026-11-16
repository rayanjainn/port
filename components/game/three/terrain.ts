// Ground mesh from the scene's baked canvas + tile grid: sunken water, raised room walls, bridge decks with rails,
// bank/wall sides, and a height mask that clips shadows over water.
import * as THREE from "three"
import { G, TS, hash, type Scene } from "@/lib/world/core"
import { flatMaterial, groundMaterial, waterMaterial, type Shared } from "./shaders"
import { makeTexture } from "./cards"
import { isOutdoor } from "./bus"
import { fx } from "./fx"

export const WATER_DEPTH = 5 / 16
const WALL_H = 1, WALL_LOW = 0.25, BRIDGE_H = 0.08

export interface Terrain {
  objects: THREE.Object3D[]; dispose: () => void; bg: THREE.Color
  heightAt: (x: number, z: number) => number
  outdoor: boolean
  pad: number
}

function avgColor(ctx: CanvasRenderingContext2D, x: number, y: number): [number, number, number] {
  try {
    const d = ctx.getImageData(x, y, TS, TS).data
    let r = 0, g = 0, b = 0, n = 0
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
    return n ? [r / n, g / n, b / n] : [90, 70, 60]
  } catch { return [90, 70, 60] }
}

export function buildTerrain(sc: Scene, sh: Shared): Terrain {
  const W = sc.w, H = sc.h
  const outdoor = isOutdoor(sc)
  const hills = fx.relief.on && outdoor
  const PAD = hills ? 18 : 0
  const CAP = Math.max(0.5, fx.relief.strength)
  const PW = W + 2 * PAD, PH = H + 2 * PAD
  const src = sc.ground3d ?? sc.ground
  const gw = src.width, gh = src.height
  const cv = document.createElement("canvas")
  cv.width = gw; cv.height = gh + TS
  const ctx = cv.getContext("2d", { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, 0, 0)

  const T = sc.tiles
  const inb = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H
  const type = (c: number, r: number) => (T && inb(c, r) ? T[r * W + c] : G.Floor)
  const isWall = (c: number, r: number) => inb(c, r) && type(c, r) === G.Void
  const pi = (c: number, r: number) => (r + PAD) * PW + (c + PAD)
  const pin = (c: number, r: number) => c >= -PAD && r >= -PAD && c < W + PAD && r < H + PAD

  // ── relief (optional): the far rim only. Distance from anything walkable / watery / built-on; only land more than
  // 4 tiles deep rises, in 0.5-tile terraces, and keeps rising beyond the map edge so the edge is never a flat cut.
  const relief = new Float32Array(PW * PH)
  if (hills) {
    const dist = new Int16Array(PW * PH).fill(-1)
    const queue: number[] = []
    const raisable = (c: number, r: number) => !inb(c, r) || (sc.blocked[r * W + c] === 1 && type(c, r) !== G.Water && type(c, r) !== G.Bridge && type(c, r) !== G.Void)
    const seed = (c: number, r: number) => { if (inb(c, r) && dist[pi(c, r)] < 0) { dist[pi(c, r)] = 0; queue.push(c, r) } }
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (!raisable(c, r)) seed(c, r)
    for (const sp of sc.sprites) {   // never under or next to anything solid / a building
      const box = sp.solid ?? (sp.tag?.startsWith("b:") ? { x: sp.x, y: sp.y, w: sp.rect[2], h: sp.rect[3] } : null)
      if (!box) continue
      for (let r = Math.floor(box.y / TS) - 1; r <= Math.floor((box.y + box.h) / TS) + 1; r++)
        for (let c = Math.floor(box.x / TS) - 1; c <= Math.floor((box.x + box.w) / TS) + 1; c++) seed(c, r)
    }
    for (let q = 0; q < queue.length; q += 2) {
      const c = queue[q], r = queue[q + 1], d = dist[pi(c, r)]
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nc = c + dc, nr = r + dr
        if (!pin(nc, nr) || dist[pi(nc, nr)] >= 0) continue
        dist[pi(nc, nr)] = d + 1
        queue.push(nc, nr)
      }
    }
    for (let r = -PAD; r < H + PAD; r++)
      for (let c = -PAD; c < W + PAD; c++) {
        const d = dist[pi(c, r)]
        if (d >= 5 && raisable(c, r)) relief[pi(c, r)] = Math.min(CAP, 0.5 * (d - 4))
      }
  }

  const hOf = (c: number, r: number) => {
    if (!pin(c, r)) return 0
    if (!inb(c, r)) return relief[pi(c, r)]
    const t = type(c, r)
    if (t === G.Water) return -WATER_DEPTH
    if (t === G.Bridge) return BRIDGE_H
    if (t === G.Void) return inb(c, r - 1) && !isWall(c, r - 1) ? WALL_LOW : WALL_H
    return relief[pi(c, r)]
  }
  const hArr = new Float32Array(PW * PH)
  for (let r = -PAD; r < H + PAD; r++) for (let c = -PAD; c < W + PAD; c++) hArr[pi(c, r)] = hOf(c, r)
  const heightAt = (x: number, z: number) => { const c = Math.floor(x), r = Math.floor(z); return pin(c, r) ? hArr[pi(c, r)] : 0 }

  // ── palette cells under the ground: bank, wall, rock (16x16 each) and wood
  let grass: [number, number, number] = [86, 140, 58], wall: [number, number, number] = [110, 90, 80], water: [number, number, number] = [60, 130, 200], wood: [number, number, number] = [150, 100, 55]
  let wsx = -1, wsy = -1
  let gotG = false, gotW = false, gotB = false
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const t = type(c, r)
      if (!gotG && T && t === G.Grass) { grass = avgColor(ctx, c * TS, r * TS); gotG = true }
      if (!gotW && t === G.Void) { wall = avgColor(ctx, c * TS, r * TS); gotW = true }
      if (!gotB && t === G.Bridge) { wood = avgColor(ctx, c * TS, r * TS); gotB = true }
      if (wsx < 0 && t === G.Water && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].every(([dc, dr]) => type(c + dc, r + dr) === G.Water)) { water = avgColor(ctx, c * TS, r * TS); wsx = c * TS; wsy = r * TS }
    }
  // every water tile gets the plain interior water art, so the sunken surface has no stray grass fringe
  if (wsx >= 0) {
    const tile = document.createElement("canvas"); tile.width = tile.height = TS
    tile.getContext("2d")!.drawImage(cv, wsx, wsy, TS, TS, 0, 0, TS, TS)
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (type(c, r) === G.Water) ctx.drawImage(tile, c * TS, r * TS)
  }
  const px = (x: number, y: number, col: [number, number, number], k: number) => { ctx.fillStyle = `rgb(${Math.round(Math.min(255, col[0] * k))},${Math.round(Math.min(255, col[1] * k))},${Math.round(Math.min(255, col[2] * k))})`; ctx.fillRect(x, y, 1, 1) }
  const earth: [number, number, number] = [104, 78, 50]
  const rockBase: [number, number, number] = [grass[0] * 0.3 + 78, grass[1] * 0.3 + 62, grass[2] * 0.2 + 46]
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const n = 0.85 + hash(x, y, 4) * 0.25
    px(x, gh + y, y < 1 ? grass : earth, (y < 1 ? 0.8 : 1 - y * 0.035) * n)                        // bank
    const brick = y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0
    px(TS + x, gh + y, wall, (brick ? 0.5 : 0.7) * (0.92 + hash(x, y, 9) * 0.16))                   // wall
    // rock / earth for terrace sides: grassy lip, then strata bands with a few cracks (reads as deliberate pixel art)
    const band = Math.floor((y - 2) / 3) % 2 === 0 ? 0.92 : 0.78
    const crack = y > 3 && hash(Math.floor(x / 2), Math.floor(y / 3), 13) > 0.9 ? 0.72 : 1
    px(2 * TS + x, gh + y, y < 2 ? grass : rockBase, (y < 2 ? (y === 0 ? 0.85 : 0.65) : band * crack) * (0.94 + hash(x, y, 12) * 0.1))   // rock
    px(3 * TS + x, gh + y, wood, (y % 5 === 0 ? 0.6 : 0.82) * (0.9 + hash(x, y, 15) * 0.2))        // wood
  }
  const tex = makeTexture(cv)
  const TH = gh + TS

  const pos: number[] = [], uv: number[] = [], shade: number[] = [], idx: number[] = []
  const quad = (p: number[][], u: number[][], s: number[]) => {
    const b = pos.length / 3
    for (let i = 0; i < 4; i++) { pos.push(...p[i]); uv.push(...u[i]); shade.push(s[i]) }
    idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3)
  }
  const E = 0.02
  const refl = (i: number, n: number) => Math.max(0, Math.min(n - 1, i < 0 ? -i - 1 : i >= n ? 2 * n - 1 - i : i))
  const cellUv = (cell: number, hpx: number) => {
    const u0 = (cell * TS + E) / gw, u1 = ((cell + 1) * TS - E) / gw, v0 = (gh + E) / TH, v1 = (gh + Math.min(TS, hpx) - E) / TH
    return [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]
  }
  const side = (c: number, r: number, h: number, hn: number, dc: number, dr: number, cell: number, k: number) => {
    const hpx = (h - hn) * TS
    let p: number[][]
    if (dr === 1) p = [[c, h, r + 1], [c + 1, h, r + 1], [c, hn, r + 1], [c + 1, hn, r + 1]]
    else if (dr === -1) p = [[c + 1, h, r], [c, h, r], [c + 1, hn, r], [c, hn, r]]
    else if (dc === -1) p = [[c, h, r], [c, h, r + 1], [c, hn, r], [c, hn, r + 1]]
    else p = [[c + 1, h, r + 1], [c + 1, h, r], [c + 1, hn, r + 1], [c + 1, hn, r]]
    const face = dr === 1 ? 0.95 : dr === -1 ? 0.6 : 0.78
    const top = face * k, bot = face * k * 0.6
    quad(p, cellUv(cell, hpx), [top, top, bot, bot])
  }
  for (let r = -PAD; r < H + PAD; r++)
    for (let c = -PAD; c < W + PAD; c++) {
      const h = hArr[pi(c, r)]
      const mc = refl(c, W), mr = refl(r, H)
      const u0 = (mc * TS + E) / gw, u1 = ((mc + 1) * TS - E) / gw, v0 = (mr * TS + E) / TH, v1 = ((mr + 1) * TS - E) / TH
      const sh2 = h > 0.05 && !isWall(c, r) ? 0.97 + Math.min(0.06, h * 0.03) : 1
      quad([[c, h, r], [c + 1, h, r], [c, h, r + 1], [c + 1, h, r + 1]], [[u0, v0], [u1, v0], [u0, v1], [u1, v1]], [sh2, sh2, sh2, sh2])
      const t = type(c, r), wallT = isWall(c, r)
      for (const [dc, dr] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const nc = c + dc, nr = r + dr
        if (!pin(nc, nr)) continue
        const hn = hArr[pi(nc, nr)]
        if (h - hn < 0.01) continue
        const cell = t === G.Bridge && inb(c, r) ? 3 : wallT ? 1 : hn < 0 ? 0 : 2
        side(c, r, h, hn, dc, dr, cell, cell === 0 ? 0.95 : 1)
      }
    }
  // bridge rails + posts along the water edges
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    const u = cellUv(3, 3)
    quad([[x0, y1, z0], [x1, y1, z0], [x0, y1, z1], [x1, y1, z1]], u, [1.1, 1.1, 1.1, 1.1])
    quad([[x0, y1, z1], [x1, y1, z1], [x0, y0, z1], [x1, y0, z1]], u, [0.95, 0.95, 0.6, 0.6])
    quad([[x1, y1, z0], [x0, y1, z0], [x1, y0, z0], [x0, y0, z0]], u, [0.6, 0.6, 0.4, 0.4])
    quad([[x0, y1, z0], [x0, y1, z1], [x0, y0, z0], [x0, y0, z1]], u, [0.8, 0.8, 0.5, 0.5])
    quad([[x1, y1, z1], [x1, y1, z0], [x1, y0, z1], [x1, y0, z0]], u, [0.8, 0.8, 0.5, 0.5])
  }
  const y0 = BRIDGE_H
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      if (type(c, r) !== G.Bridge) continue
      const wn = (dc: number, dr: number) => type(c + dc, r + dr) === G.Water
      const rail = 0.3, th = 0.07
      if (wn(0, -1)) { box(c, c + 1, y0, y0 + rail, r, r + th); box(c, c + 0.1, y0, y0 + 0.5, r, r + 0.1) }
      if (wn(0, 1)) { box(c, c + 1, y0, y0 + rail, r + 1 - th, r + 1); box(c, c + 0.1, y0, y0 + 0.5, r + 0.9, r + 1) }
      if (wn(-1, 0)) box(c, c + th, y0, y0 + rail, r, r + 1)
      if (wn(1, 0)) box(c + 1 - th, c + 1, y0, y0 + rail, r, r + 1)
      if (wn(0, -1) || wn(0, 1)) { if (wn(0, -1)) box(c + 0.9, c + 1, y0, y0 + 0.5, r, r + 0.1); if (wn(0, 1)) box(c + 0.9, c + 1, y0, y0 + 0.5, r + 0.9, r + 1) }
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  geo.setAttribute("aShade", new THREE.Float32BufferAttribute(shade, 1))
  geo.setIndex(idx)
  const gmat = groundMaterial(sh, tex)
  const ground = new THREE.Mesh(geo, gmat)
  ground.frustumCulled = false

  const objects: THREE.Object3D[] = [ground]
  const disposables: { dispose: () => void }[] = [geo, gmat, tex]

  // ── animated water skin over every water tile (sky tint, ripples, foam)
  const wp: number[] = [], we: number[] = [], wl: number[] = [], wi: number[] = []
  const wy = -WATER_DEPTH + 0.004
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      if (type(c, r) !== G.Water) continue
      const e = [type(c, r - 1) !== G.Water, type(c + 1, r) !== G.Water, type(c, r + 1) !== G.Water, type(c - 1, r) !== G.Water].map((v) => (v ? 1 : 0))
      const b = wp.length / 3
      wp.push(c, wy, r, c + 1, wy, r, c, wy, r + 1, c + 1, wy, r + 1)
      wl.push(0, 0, 1, 0, 0, 1, 1, 1)
      for (let i = 0; i < 4; i++) we.push(...e)
      wi.push(b, b + 1, b + 2, b + 2, b + 1, b + 3)
    }
  if (wp.length) {
    const wg = new THREE.BufferGeometry()
    wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3))
    wg.setAttribute("aEdge", new THREE.Float32BufferAttribute(we, 4))
    wg.setAttribute("aLocal", new THREE.Float32BufferAttribute(wl, 2))
    wg.setIndex(wi)
    const hi = new THREE.Color().setRGB(Math.min(255, water[0] * 1.5 + 40) / 255, Math.min(255, water[1] * 1.35 + 50) / 255, Math.min(255, water[2] * 1.2 + 50) / 255, THREE.SRGBColorSpace)
    const lo = new THREE.Color().setRGB(water[0] * 0.6 / 255, water[1] * 0.65 / 255, water[2] * 0.8 / 255, THREE.SRGBColorSpace)
    const wm = waterMaterial(sh, hi, lo)
    const wmesh = new THREE.Mesh(wg, wm)
    wmesh.frustumCulled = false; wmesh.renderOrder = 1
    objects.push(wmesh)
    disposables.push(wg, wm)
  }

  // shadow clip mask: terrain height per tile, so shadows never float over water or off a terrace
  const md = new Uint8Array(PW * PH)
  for (let i = 0; i < md.length; i++) md[i] = Math.max(0, Math.min(255, Math.round(((hArr[i] + 0.5) / 5) * 255)))
  const mask = new THREE.DataTexture(md, PW, PH, THREE.RedFormat)
  mask.magFilter = THREE.NearestFilter; mask.minFilter = THREE.NearestFilter; mask.unpackAlignment = 1; mask.needsUpdate = true
  sh.uMask.value = mask
  sh.uMaskInfo.value.set(PAD, PAD, PW, PH)
  disposables.push(mask)

  // everything beyond the padded map
  const bg = new THREE.Color(sc.bg ?? "#4d7a2e")
  let farGeo: THREE.BufferGeometry
  if (hills) {
    // plateau at hill height beyond the padded map, with a hole where the map is
    const o = new THREE.Shape()
    o.moveTo(-600, -600); o.lineTo(600, -600); o.lineTo(600, 600); o.lineTo(-600, 600); o.closePath()
    const hole = new THREE.Path()
    const x0 = -PAD + 1, x1 = W + PAD - 1, z0 = -PAD + 1, z1 = H + PAD - 1
    hole.moveTo(x0, -z0); hole.lineTo(x0, -z1); hole.lineTo(x1, -z1); hole.lineTo(x1, -z0); hole.closePath()
    o.holes.push(hole)
    farGeo = new THREE.ShapeGeometry(o).rotateX(-Math.PI / 2)
  } else farGeo = new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2)
  const far = new THREE.Mesh(farGeo, flatMaterial(sh, hills ? new THREE.Color().setRGB(grass[0] / 255 * 0.8, grass[1] / 255 * 0.8, grass[2] / 255 * 0.8, THREE.SRGBColorSpace) : bg))
  far.position.set(hills ? 0 : W / 2, hills ? CAP - 0.04 : -WATER_DEPTH - 0.02, hills ? 0 : H / 2)
  far.frustumCulled = false
  objects.push(far)
  disposables.push(far.geometry, far.material as THREE.Material)

  return { objects, bg, heightAt, outdoor, pad: PAD, dispose: () => disposables.forEach((d) => d.dispose()) }
}
