// Instanced upright cards (sprites, actors, particles). One draw call per texture, plus one for shadows.
import * as THREE from "three"
import { cardMaterial, type CardMode, type Shared } from "./shaders"

export function makeTexture(src: CanvasImageSource) {
  const t = new THREE.Texture(src as HTMLImageElement)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.flipY = false
  t.needsUpdate = true
  return t
}

export function srcSize(src: CanvasImageSource) {
  const s = src as HTMLImageElement & HTMLCanvasElement
  return { w: s.naturalWidth || s.width, h: s.naturalHeight || s.height }
}

const CORNERS = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1, 0, 2, 1, 2])
const INDEX = [0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5]

export class CardBatch {
  mesh: THREE.Mesh
  shadow: THREE.Mesh | null = null
  geo = new THREE.InstancedBufferGeometry()
  private foot: Float32Array; private size: Float32Array; private rect: Float32Array
  private anim: Float32Array; private tint: Float32Array; private dz: Float32Array; private layer: Float32Array; private up: Float32Array; private org: Float32Array
  private attrs: THREE.InstancedBufferAttribute[] = []
  mats: THREE.ShaderMaterial[] = []

  constructor(sh: Shared, public tex: THREE.Texture, public cap: number, mode: CardMode = "opaque", shadow = false, dynamic = false, emis = false) {
    const g = this.geo
    g.setAttribute("aCorner", new THREE.BufferAttribute(CORNERS, 2))
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(18), 3))
    g.setIndex(INDEX)
    const mk = (n: string, size: number) => {
      const arr = new Float32Array(cap * size)
      const a = new THREE.InstancedBufferAttribute(arr, size)
      if (dynamic) a.setUsage(THREE.DynamicDrawUsage)
      g.setAttribute(n, a)
      this.attrs.push(a)
      return arr
    }
    this.foot = mk("aFoot", 3); this.size = mk("aSize", 2); this.rect = mk("aRect", 4)
    this.anim = mk("aAnim", 4); this.tint = mk("aTint", 4); this.dz = mk("aDz", 1); this.layer = mk("aLayer", 2); this.up = mk("aUp", 1); this.org = mk("aOrg", 2)
    for (let i = 0; i < cap; i++) { this.tint.set([1, 1, 1, 1], i * 4); this.layer[i * 2 + 1] = 1 }
    g.instanceCount = 0
    const m = cardMaterial(sh, tex, mode, emis)
    this.mats.push(m)
    this.mesh = new THREE.Mesh(g, m)
    this.mesh.frustumCulled = false
    if (mode === "add" || mode === "blend") this.mesh.renderOrder = 5
    if (shadow) {
      const sm = cardMaterial(sh, tex, "shadow")
      this.mats.push(sm)
      this.shadow = new THREE.Mesh(g, sm)
      this.shadow.frustumCulled = false
      this.shadow.renderOrder = 2
    }
  }

  /** x, y, z = foot position (tiles); w, h in tiles; rect = source px; tex size for uv */
  set(i: number, x: number, y: number, z: number, w: number, h: number, rx: number, ry: number, rw: number, rh: number, tw: number, th: number, flip = false, anim?: { frames: number; fps: number; dx: number }, sway = 0, dz = 0) {
    const e = 0.02
    let u0 = (rx + e) / tw, u1 = (rx + rw - e) / tw
    if (flip) { const t = u0; u0 = u1; u1 = t }
    // written straight into the typed arrays: this runs for every card every frame, so no temporary arrays
    let o = i * 3
    this.foot[o] = x; this.foot[o + 1] = y; this.foot[o + 2] = z
    o = i * 2
    this.size[o] = w; this.size[o + 1] = h
    o = i * 4
    this.rect[o] = u0; this.rect[o + 1] = (ry + e) / th; this.rect[o + 2] = u1; this.rect[o + 3] = (ry + rh - e) / th
    this.anim[o] = anim ? anim.frames : 0; this.anim[o + 1] = anim ? anim.fps : 0; this.anim[o + 2] = anim ? anim.dx / tw : 0; this.anim[o + 3] = sway
    this.dz[i] = dz
  }
  setTint(i: number, r: number, g: number, b: number, a: number) { const o = i * 4; this.tint[o] = r; this.tint[o + 1] = g; this.tint[o + 2] = b; this.tint[o + 3] = a }
  /** thickness layer: offset in tiles behind the front face and its colour shade (front = 0, 1) */
  setLayer(i: number, off: number, shade: number) { this.layer[i * 2] = off; this.layer[i * 2 + 1] = shade }
  /** 1 = stands vertical (no lean): wall-mounted things such as a waterfall on its cliff face */
  setUp(i: number, v: number) { this.up[i] = v }
  /** the sprite's top-left in scene px, so night emissives (lit windows) can be sampled by 2D position */
  setOrg(i: number, x: number, y: number) { this.org[i * 2] = x; this.org[i * 2 + 1] = y }
  hide(i: number) { this.size[i * 2] = 0 }

  flush(n: number) {
    this.geo.instanceCount = n
    for (const a of this.attrs) a.needsUpdate = true
  }

  get objects() { return this.shadow ? [this.mesh, this.shadow] : [this.mesh] }
  dispose() { this.geo.dispose(); for (const m of this.mats) m.dispose(); this.tex.dispose() }
}
