// Ground mesh from the scene's baked canvas + tile grid: sunken water, raised room walls, bank sides.
import * as THREE from "three"
import { G, TS, hash, type Scene } from "@/lib/world/core"
import { flatMaterial, groundMaterial, waterMaterial, type Shared } from "./shaders"
import { makeTexture } from "./cards"

export const WATER_DEPTH = 5 / 16
const WALL_H = 1, WALL_LOW = 0.25

export interface Terrain { objects: THREE.Object3D[]; dispose: () => void; bg: THREE.Color }

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
  const hOf = (c: number, r: number) => {
    if (!inb(c, r)) return 0
    const t = type(c, r)
    if (t === G.Water) return -WATER_DEPTH
    if (t === G.Void) return inb(c, r - 1) && !isWall(c, r - 1) ? WALL_LOW : WALL_H
    return 0
  }

  // palette cells under the ground: bank (16x5) and wall (16x16)
  let grass: [number, number, number] = [86, 140, 58], wall: [number, number, number] = [110, 90, 80], water: [number, number, number] = [60, 130, 200]
  let gotG = false, gotW = false, gotWa = false
  for (let r = 0; r < H && !(gotG && gotW && gotWa); r++)
    for (let c = 0; c < W; c++) {
      const t = type(c, r)
      if (!gotG && T && t === G.Grass) { grass = avgColor(ctx, c * TS, r * TS); gotG = true }
      if (!gotW && t === G.Void) { wall = avgColor(ctx, c * TS, r * TS); gotW = true }
      if (!gotWa && t === G.Water && type(c - 1, r) === G.Water && type(c + 1, r) === G.Water && type(c, r - 1) === G.Water && type(c, r + 1) === G.Water) { water = avgColor(ctx, c * TS, r * TS); gotWa = true }
    }
  const px = (x: number, y: number, col: [number, number, number], k: number) => { ctx.fillStyle = `rgb(${Math.round(col[0] * k)},${Math.round(col[1] * k)},${Math.round(col[2] * k)})`; ctx.fillRect(x, y, 1, 1) }
  const earth: [number, number, number] = [112, 80, 48]
  for (let y = 0; y < 5; y++) for (let x = 0; x < TS; x++) px(x, gh + y, y < 1 ? grass : earth, (y < 1 ? 0.8 : 1 - y * 0.1) * (0.85 + hash(x, y, 4) * 0.25))
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const brick = y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0
    px(TS + x, gh + y, wall, (brick ? 0.5 : 0.7) * (0.92 + hash(x, y, 9) * 0.16))
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
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const h = hOf(c, r)
      const u0 = (c * TS + E) / gw, u1 = ((c + 1) * TS - E) / gw, v0 = (r * TS + E) / TH, v1 = ((r + 1) * TS - E) / TH
      quad([[c, h, r], [c + 1, h, r], [c, h, r + 1], [c + 1, h, r + 1]], [[u0, v0], [u1, v0], [u0, v1], [u1, v1]], [1, 1, 1, 1])
      // sides toward lower neighbours
      for (const [dc, dr] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const nc = c + dc, nr = r + dr
        if (!inb(nc, nr)) continue
        const hn = hOf(nc, nr)
        if (h - hn < 0.01) continue
        const bank = !isWall(c, r)
        const hpx = (h - hn) * TS
        const cx = bank ? 0 : TS, cy = gh
        const su0 = (cx + E) / gw, su1 = (cx + TS - E) / gw, sv0 = (cy + E) / TH, sv1 = (cy + hpx - E) / TH
        const face = dr === 1 ? 0.95 : dr === -1 ? 0.6 : 0.78
        const top = face * (bank ? 0.95 : 1), bot = face * (bank ? 0.55 : 0.6)
        let p: number[][]
        if (dr === 1) p = [[c, h, r + 1], [c + 1, h, r + 1], [c, hn, r + 1], [c + 1, hn, r + 1]]
        else if (dr === -1) p = [[c + 1, h, r], [c, h, r], [c + 1, hn, r], [c, hn, r]]
        else if (dc === -1) p = [[c, h, r], [c, h, r + 1], [c, hn, r], [c, hn, r + 1]]
        else p = [[c + 1, h, r + 1], [c + 1, h, r], [c + 1, hn, r + 1], [c + 1, hn, r]]
        quad(p, [[su0, sv0], [su1, sv0], [su0, sv1], [su1, sv1]], [top, top, bot, bot])
      }
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

  // animated water skin over open water tiles
  const wp: number[] = [], wk: number[] = [], wi: number[] = []
  const wy = -WATER_DEPTH + 0.004
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      if (type(c, r) !== G.Water) continue
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dc, dr]) => type(c + dc, r + dr) === G.Water)
      const b = wp.length / 3
      wp.push(c, wy, r, c + 1, wy, r, c, wy, r + 1, c + 1, wy, r + 1)
      for (let i = 0; i < 4; i++) wk.push(open ? 1 : 0)
      wi.push(b, b + 1, b + 2, b + 2, b + 1, b + 3)
    }
  if (wp.length) {
    const wg = new THREE.BufferGeometry()
    wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3))
    wg.setAttribute("aK", new THREE.Float32BufferAttribute(wk, 1))
    wg.setIndex(wi)
    const hi = new THREE.Color().setRGB(Math.min(255, water[0] * 1.5 + 40) / 255, Math.min(255, water[1] * 1.35 + 50) / 255, Math.min(255, water[2] * 1.2 + 50) / 255, THREE.SRGBColorSpace)
    const lo = new THREE.Color().setRGB(water[0] * 0.6 / 255, water[1] * 0.65 / 255, water[2] * 0.8 / 255, THREE.SRGBColorSpace)
    const wm = waterMaterial(sh, hi, lo)
    const wmesh = new THREE.Mesh(wg, wm)
    wmesh.frustumCulled = false; wmesh.renderOrder = 1
    objects.push(wmesh)
    disposables.push(wg, wm)
  }

  // everything beyond the map edge
  const bg = new THREE.Color(sc.bg ?? "#4d7a2e")
  const far = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), flatMaterial(sh, bg))
  far.position.set(W / 2, -WATER_DEPTH - 0.02, H / 2)
  far.frustumCulled = false
  objects.push(far)
  disposables.push(far.geometry, far.material as THREE.Material)

  return { objects, bg, dispose: () => disposables.forEach((d) => d.dispose()) }
}
