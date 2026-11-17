// Builds and animates the 3D version of one SceneRT. Pure three.js, driven by World3D's frame loop.
import * as THREE from "three"
import { TS, hash, ready, img, type Sprite } from "@/lib/world/core"
import { engine, type SceneRT } from "@/lib/engine"
import { runtime } from "@/lib/runtime"
import { CHARS, charSheet, DIR_COL, SHEETS } from "@/lib/na"
import { makeShared, TILT, NL, skyMaterial, type Shared } from "./shaders"
import { CardBatch, makeTexture, srcSize } from "./cards"
import { buildTerrain, type Terrain } from "./terrain"
import { isOutdoor } from "./bus"
import { fx } from "./fx"

const COS = Math.cos(TILT), SIN = Math.sin(TILT)
const P = 1 / TS


const col = new THREE.Color()
function parseCss(s: string): [number, number, number, number] {
  const m = /rgba?\(([^)]+)\)/.exec(s)
  let a = 1
  if (m) { const p = m[1].split(","); a = p[3] !== undefined ? parseFloat(p[3]) : 1 }
  col.set(s.startsWith("rgba") ? `rgb(${s.slice(5, -1).split(",").slice(0, 3).join(",")})` : s)
  return [col.r, col.g, col.b, a]
}
const rgbOf = (s: string) => s.split(",").map((v) => parseInt(v, 10) / 255)

interface Attached { parent: Sprite; dx: number; dyPx: number }

export class World {
  group = new THREE.Group()
  sh: Shared = makeShared()
  terrain: Terrain
  private batches: CardBatch[] = []
  private dyn: { b: CardBatch; list: Sprite[]; src: () => CanvasImageSource | null }[] = []
  private actorGroups: { b: CardBatch; list: { a: import("@/lib/engine").ActorRT | "hero" }[]; sheet: string; size: { w: number; h: number } }[] = []
  private parts!: CardBatch
  private smoke: CardBatch | null = null
  private life!: CardBatch
  private glow!: CardBatch
  private slash!: CardBatch
  res = new THREE.Vector2(1, 1)
  private emisCv: HTMLCanvasElement | null = null
  private emisTex: THREE.Texture | null = null
  private emisT = -9
  dark = 0
  private sky: THREE.Mesh
  private skyMat = skyMaterial()
  private ambient = new THREE.Color()
  private readonly fogDay = new THREE.Color("#a9c6a0")
  private readonly fogNight = new THREE.Color("#0a0e2c")
  private top = new THREE.Color()
  private hor = new THREE.Color()
  private c = {
    dayTop: new THREE.Color("#4f9ae6"), dayHor: new THREE.Color("#cfe9f2"),
    nightTop: new THREE.Color("#050818"), nightHor: new THREE.Color("#18214e"),
    duskTop: new THREE.Color("#7a4f9a"), duskHor: new THREE.Color("#ffa96c"), duskBand: new THREE.Color("#ff8f5a"),
  }
  private lightIdx: { i: number; d: number }[] = []

  constructor(public rt: SceneRT) {
    const sc = rt.scene
    this.terrain = buildTerrain(sc, this.sh)
    for (const o of this.terrain.objects) this.group.add(o)
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.skyMat)
    this.sky.frustumCulled = false; this.sky.renderOrder = 100; this.sky.visible = this.terrain.outdoor   // thin strip along the top, outdoor scenes only
    this.group.add(this.sky)
    if (sc.emissive) {
      this.emisCv = document.createElement("canvas")
      this.emisCv.width = sc.w * TS; this.emisCv.height = sc.h * TS
      this.emisTex = makeTexture(this.emisCv)
      this.sh.uEmis.value = this.emisTex
      this.sh.uEmisInfo.value.set(sc.w * TS, sc.h * TS, 0)
    }
    this.buildSprites()
    this.buildActors()
    this.buildFx()
  }

  // ── static / dynamic sprites ───────────────────────────────────
  private resolve(s: Sprite) { return typeof s.src === "function" ? s.src() : s.src }

  private buildSprites() {
    const sc = this.rt.scene
    const all = [...sc.sprites, ...(sc.baked ?? [])]
    // relief on: mirror the far forest past the map edge so the hills beyond it are wooded too
    if (this.terrain.pad > 0 && sc.baked?.length) {
      const Wp = sc.w * TS, Hp = sc.h * TS, lim = (this.terrain.pad - 2) * TS
      for (const s of sc.baked) {
        const rw = s.rect[2]
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = dx === 0 ? s.x : dx < 0 ? -(s.x + rw) : 2 * Wp - (s.x + rw)
          const nb = dy === 0 ? s.baseY : dy < 0 ? -s.baseY : 2 * Hp - s.baseY
          const ncx = nx + rw / 2
          if (ncx < -lim || ncx > Wp + lim || nb < -lim || nb > Hp + lim) continue
          if (dx && (dx < 0 ? s.x + rw / 2 : Wp - s.x - rw / 2) > lim) continue
          if (dy && (dy < 0 ? s.baseY : Hp - s.baseY) > lim) continue
          all.push({ ...s, x: nx, y: nb - (s.baseY - s.y), baseY: nb })
        }
      }
    }
    const staticMap = new Map<CanvasImageSource, Sprite[]>()
    const dynMap = new Map<CanvasImageSource, Sprite[]>()
    for (const s of all) {
      const src = this.resolve(s)
      if (!src) continue
      const m = s.dynamic ? dynMap : staticMap
      const l = m.get(src)
      if (l) l.push(s); else m.set(src, [s])
    }
    // sprites floating above their sort line (flags, mill blades, weapons on racks) ride on the sprite they overlap
    const attach = new Map<Sprite, Attached>()
    for (const s of all) {
      if (s.dynamic || s.baseY - (s.y + s.rect[3]) <= 6) continue
      const cx = s.x + s.rect[2] / 2, cyb = s.y + s.rect[3]
      let best: Sprite | null = null, bd = 1e9
      for (const p of all) {
        if (p === s || p.dynamic || p.baseY - (p.y + p.rect[3]) > 6) continue
        if (cx < p.x || cx > p.x + p.rect[2] || cyb < p.y - 4 || cyb > p.y + p.rect[3]) continue
        const d = Math.abs(p.baseY - s.baseY)
        if (d < bd) { bd = d; best = p }
      }
      if (best) attach.set(s, { parent: best, dx: cx, dyPx: best.y + best.rect[3] - cyb })
    }
    this.attach = attach
    for (const [src, list] of staticMap) {
      const tex = makeTexture(src), { w: tw, h: th } = srcSize(src)
      const n = list.reduce((a, s) => a + this.layersOf(s), 0)
      const b = new CardBatch(this.sh, tex, n, "opaque", true, false, !!sc.emissive)
      let at = 0
      for (const s of list) at += this.place(b, at, s, tw, th)
      b.flush(n)
      this.batches.push(b)
      for (const o of b.objects) this.group.add(o)
    }
    for (const [src, list] of dynMap) {
      const tex = makeTexture(src), { w: tw, h: th } = srcSize(src)
      const n = list.reduce((a, s) => a + this.layersOf(s), 0)
      const b = new CardBatch(this.sh, tex, n, "opaque", true, true, !!sc.emissive)
      this.dyn.push({ b, list, src: () => src })
      let at = 0
      for (const s of list) at += this.place(b, at, s, tw, th)
      b.flush(n)
      this.batches.push(b)
      for (const o of b.objects) this.group.add(o)
    }
  }
  private attach = new Map<Sprite, Attached>()

  /** thickness (optional): buildings ~10px deep, mid props 6, small props 3; never trees, characters, thin/tall posts, wall hangings or riders */
  private layersOf(s: Sprite) {
    if (!fx.thickness.on) return 1
    let n = this.thick.get(s)
    if (n === undefined) {
      const [, , w, h] = s.rect
      const area = w * h
      const bad = s.dynamic || s.anim || s.sway || s.tag === "tree" || this.attach.has(s) || s.y + h - s.baseY > 6 || (w <= 16 && h >= 32) || area < 200
      n = bad ? 0 : Math.round((area >= 2800 ? 10 : area >= 1200 ? 6 : 3) * fx.thickness.strength)
      this.thick.set(s, n)
    }
    return 1 + n
  }
  private thick = new Map<Sprite, number>()

  /** writes one sprite card (plus its thickness layers) at index i0; returns how many instances it used */
  private place(b: CardBatch, i0: number, s: Sprite, tw: number, th: number) {
    const [rx, ry, rw, rh] = s.rect
    const at = this.attach.get(s)
    const gy = (x: number, z: number) => this.terrain.heightAt(x, z)
    let x = (s.x + rw / 2) * P, y = gy((s.x + rw / 2) * P, s.baseY * P), z = s.baseY * P, dz = 0
    if (at) {
      const hPx = at.dyPx, pz = at.parent.baseY * P
      y = gy(at.dx * P, pz) + hPx * P * COS; z = pz - hPx * P * SIN
      dz = pz - z + (s.baseY >= at.parent.baseY ? 0.02 : -0.02)
      x = at.dx * P
    }
    // wall-mounted: a sprite painted on a cliff face (a waterfall) stands vertical against the real wall
    let up = 0
    if (!at && !s.dynamic && rw > 0) {
      const wl = this.terrain.wallAt(s.x + rw / 2, s.y + rh - 1)
      if (wl) { up = 1; z = wl.z + 0.01; y = this.terrain.heightAt(x, wl.z + 0.5) + Math.max(0, (wl.z * TS - (s.y + rh)) * P); dz = 0 }
    }
    // ground decals (rugs, quicksand swirls: sorted below everything, baseY above their own top) lie flat
    if (!at && !s.dynamic && !up && s.baseY < s.y && rw > 0) { up = -1; z = (s.y + rh) * P; y = gy(x, z) + 0.002 }
    const L = up < 0 ? 1 : this.layersOf(s)
    for (let k = 0; k < L; k++) {
      const i = i0 + k
      b.set(i, x, y, z, rw * P, rh * P, rx, ry, rw, rh, tw, th, s.flip, s.anim, s.sway ?? 0, dz - k * 0.004)
      if (k) b.setLayer(i, k * P, 1 - 0.26 * (k / (L - 1)))
      b.setUp(i, up); b.setOrg(i, s.x, s.y)
      b.setTint(i, 1, 1, 1, at || k || up ? 0 : 1)   // only a ground sprite's front face casts a shadow
    }
    return L
  }

  // ── actors ─────────────────────────────────────────────────────
  private buildActors() {
    const by = new Map<string, { a: import("@/lib/engine").ActorRT | "hero" }[]>()
    for (const a of this.rt.actors) { const l = by.get(a.def.sheet); if (l) l.push({ a }); else by.set(a.def.sheet, [{ a }]) }
    const hs = charSheet(CHARS.hero)
    const hl = by.get(hs)
    if (hl) hl.push({ a: "hero" }); else by.set(hs, [{ a: "hero" }])
    this.pendingActors = by
  }
  private pendingActors: Map<string, { a: import("@/lib/engine").ActorRT | "hero" }[]> | null = null

  private initActorTextures() {
    if (!this.pendingActors) return
    for (const [sheet, list] of [...this.pendingActors]) {
      const im = img(sheet)
      if (!ready(im)) continue
      const tex = makeTexture(im)
      const b = new CardBatch(this.sh, tex, list.length, "opaque", true, true)
      b.flush(list.length)
      this.actorGroups.push({ b, list, sheet, size: { w: im.naturalWidth, h: im.naturalHeight } })
      for (const o of b.objects) this.group.add(o)
      this.pendingActors.delete(sheet)
    }
    if (!this.pendingActors.size) this.pendingActors = null
  }

  // ── particles, ambient life, glows, slash ──────────────────────
  private buildFx() {
    const one = document.createElement("canvas"); one.width = one.height = 2
    const o = one.getContext("2d")!; o.fillStyle = "#fff"; o.fillRect(0, 0, 2, 2)
    this.parts = new CardBatch(this.sh, makeTexture(one), 512, "blend", false, true)
    this.life = new CardBatch(this.sh, makeTexture(one), 64, "add", false, true)
    // radial glow
    const gc = document.createElement("canvas"); gc.width = gc.height = 64
    const g = gc.getContext("2d")!
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.5)"); gr.addColorStop(0.6, "rgba(255,255,255,.14)"); gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
    this.glow = new CardBatch(this.sh, makeTexture(gc), Math.max(1, this.rt.scene.lights.length), "add", false, true)
    // slash arcs: one cell per facing (right, down, left, up)
    const sc2 = document.createElement("canvas"); sc2.width = 128; sc2.height = 32
    const s = sc2.getContext("2d")!
    ;[0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((ang, k) => {
      s.save(); s.translate(k * 32 + 16, 16); s.rotate(ang)
      s.strokeStyle = "#fff"; s.lineWidth = 2; s.beginPath(); s.arc(-2, 0, 10, -1.2, 1.2); s.stroke(); s.restore()
    })
    this.slash = new CardBatch(this.sh, makeTexture(sc2), 1, "blend", false, true)
    this.slash.mats[0].depthTest = false
    for (const b of [this.parts, this.life, this.glow, this.slash]) for (const ob of b.objects) this.group.add(ob)
    const sm = img(SHEETS.smoke)
    if (ready(sm)) { this.smoke = new CardBatch(this.sh, makeTexture(sm), 32, "blend", false, true); for (const ob of this.smoke.objects) this.group.add(ob) }
  }

  /** world position of a point `hPx` above a ground spot (scene px), following the card lean */
  anchor(xPx: number, yPx: number, hPx: number, out = new THREE.Vector3()) {
    return out.set(xPx * P, this.terrain.heightAt(xPx * P, yPx * P) + hPx * P * COS, yPx * P - hPx * P * SIN)
  }

  // ── per frame ──────────────────────────────────────────────────
  update(now: number, target: THREE.Vector3) {
    const S = engine.state
    if (!S) return
    const sc = this.rt.scene
    const H = S.hero
    const sh = this.sh
    sh.uTime.value = now
    this.initActorTextures()

    // lighting ------------------------------------------------------
    const village = isOutdoor(sc)
    const night = village ? runtime.night : 0
    const LT = sc.lighting
    const dark = village ? night * (LT?.dark ?? 0.78) : sc.dark
    const deep = !village && sc.dark >= 0.6
    const amb = this.ambient
    if (village) amb.setRGB(1 - night * 0.82, 0.98 - night * 0.76, 0.93 - night * 0.48, THREE.SRGBColorSpace)
    else {
      const v = 1 - dark * 0.92
      if (LT?.tint) {
        // the scene's own cold (or warm) twilight: base light dimmed by `dark`, pulled toward its tint
        const t = LT.tint.split(",").map((q) => parseInt(q, 10) / 255)
        amb.setRGB(1 - dark + dark * t[0] * 1.8, 1 - dark + dark * t[1] * 1.8, 1 - dark + dark * t[2] * 1.8, THREE.SRGBColorSpace)
      } else if (deep) amb.setRGB(v * 0.85, v * 0.95, v * 1.2, THREE.SRGBColorSpace)
      else amb.setRGB(v, v * 0.94, v * 0.88, THREE.SRGBColorSpace)
    }
    sh.uAmb.value.copy(amb)
    const ambAvg = (amb.r + amb.g + amb.b) / 3
    const k = 1.05 * (1 - ambAvg) * Math.min(1.3, (LT?.holeStrength ?? 0.9) / 0.9 + 0.25)
    // nearest lights to the camera focus + the hero's own light
    const L = sc.lights
    const idx = this.lightIdx
    idx.length = 0
    if (k > 0.02) for (let i = 0; i < L.length; i++) idx.push({ i, d: Math.hypot(L[i].x * P - target.x, L[i].y * P - target.z) })
    idx.sort((a, b) => a.d - b.d)
    let n = 0
    if (dark > 0.02) {
      sh.uLP.value[0].set(H.x * P, 0.7, (H.y - 4) * P, (LT?.heroRadius ?? (deep ? 56 : 60)) / TS * 1.1)
      sh.uLC.value[0].set(0.95 * k, 0.9 * k, 0.8 * k)
      n = 1
    }
    for (let j = 0; n < NL && j < idx.length; j++, n++) {
      const l = L[idx[j].i]
      const fl = l.flicker ? 1 + Math.sin(now * 9 + l.x) * 0.04 * l.flicker + Math.sin(now * 23 + l.y) * 0.03 * l.flicker : 1
      const [r, g, b] = rgbOf(l.color)
      sh.uLP.value[n].set(l.x * P, 1.0, (l.y + 16) * P, (l.r / TS) * fl * (LT?.radiusScale ? LT.radiusScale * 1.05 : village ? 0.85 : 1.05))
      sh.uLC.value[n].set(r * k, g * k, b * k)
    }
    for (; n < NL; n++) { sh.uLP.value[n].set(1e4, 1e4, 1e4, 1); sh.uLC.value[n].set(0, 0, 0) }
    // sky + fog: day blue, a warm dusk band while the night value is in transition, night navy
    this.dark = dark
    const dusk = village ? Math.max(0, 1 - Math.abs(2 * night - 1)) : 0
    this.top.copy(this.c.dayTop).lerp(this.c.nightTop, night).lerp(this.c.duskTop, dusk * 0.55)
    this.hor.copy(this.c.dayHor).lerp(this.c.nightHor, night).lerp(this.c.duskHor, dusk * 0.7)
    const sm = this.skyMat.uniforms
    sm.uTop.value.copy(this.top); sm.uHor.value.copy(this.hor); sm.uBand.value.copy(this.c.duskBand)
    sm.uBandAmt.value = dusk; sm.uNight.value = night; sm.uTime.value = now
    sm.uScroll.value = target.x * 6; sm.uRes.value.copy(this.res); sm.uAspect.value = this.res.x / this.res.y
    sh.uFogColor.value.copy(this.terrain.outdoor ? this.fogDay.clone().lerp(this.fogNight, night).lerp(this.c.duskHor, dusk * 0.3) : this.terrain.bg)
    sh.uFog.value.z = 0.75
    // self-lit window panes / neon: re-rasterise the scene's emissive layer a couple of times a second while it is dark
    if (this.emisCv && sc.emissive) {
      sh.uEmisInfo.value.z = night
      if (night > 0.04 && now - this.emisT > 0.4) {
        this.emisT = now
        const g = this.emisCv.getContext("2d")!
        g.clearRect(0, 0, this.emisCv.width, this.emisCv.height)
        sc.emissive(g, 0, 0, this.emisCv.width, this.emisCv.height, 1, now)
        this.emisTex!.needsUpdate = true
      }
    }
    sh.uSky.value.copy(this.hor).lerp(this.top, 0.5)

    // glow halos ----------------------------------------------------
    let gn = 0
    if (dark > 0.05) {
      for (const l of L) {
        const [r, g, b] = rgbOf(l.color)
        const fl = l.flicker ? 1 + Math.sin(now * 11 + l.x) * 0.06 * l.flicker : 1
        const d = (l.r / TS) * fl * 0.7
        this.glow.set(gn, l.x * P, 0.9 - d / 2, (l.y + 16) * P, d, d, 0, 0, 64, 64, 64, 64)
        this.glow.setTint(gn, r, g, b, 0.34 * dark * Math.min(1.5, Math.sqrt((LT?.glow ?? 0.16) / 0.16)))
        gn++
      }
    }
    this.glow.flush(gn)

    // dynamic sprites ----------------------------------------------
    for (const d of this.dyn) {
      const { w: tw, h: th } = srcSize(d.src()!)
      let at = 0
      for (const s of d.list) at += this.place(d.b, at, s, tw, th)
      d.b.flush(at)
    }

    // actors ----------------------------------------------------------
    for (const g of this.actorGroups) {
      const { w: tw, h: th } = g.size
      const put = (i: number, x: number, y: number, z: number, rx: number, ry: number, flip: boolean, tr: number, tg: number, tb: number) => {
        g.b.set(i, x, y, z, 1, 1, rx, ry, 16, 16, tw, th, flip)
        g.b.setTint(i, tr, tg, tb, 1)
      }
      g.list.forEach((e, i) => {
        const b = g.b
        const hide = () => b.hide(i)
        if (e.a === "hero") {
          if (H.hurtT > 0 && Math.floor(now * 16) % 2) { hide(); return }
          const row = H.attackT > 0 ? 4 : H.moving ? Math.floor(H.animT * 9) % 4 : 0
          put(i, H.x * P, this.terrain.heightAt(H.x * P, H.y * P), (H.y + 1) * P, DIR_COL[H.facing] * 16, row * 16, false, 1, 1, 1)
          return
        }
        const a = e.a
        if (a.dead > 0) { hide(); return }
        const kind = a.def.kind
        const gy = this.terrain.heightAt(a.x * P, a.y * P)
        if (kind === "animal") {
          const f = a.moving ? Math.floor(a.animT * 6) % 2 : Math.floor(now * 1.5 + a.def.x) % 2
          put(i, a.x * P, gy, (a.y + 2) * P, f * 16, 0, a.facing === "right", 1, 1, 1)
          return
        }
        const row = a.moving ? Math.floor(a.animT * 8) % 4 : 0
        const bob = kind === "monster" ? Math.round(Math.sin(now * 5 + a.def.x)) : 0
        const hurt = a.hurt > 0
        put(i, a.x * P, gy - bob * P, (a.y + 1) * P, DIR_COL[a.facing] * 16, row * 16, false, hurt ? 1.5 : 1, hurt ? 0.7 : 1, hurt ? 0.7 : 1)
      })
      g.b.flush(g.list.length)
    }

    // slash ---------------------------------------------------------
    if (H.attackT > 0) {
      const p = 1 - H.attackT / 0.28
      const k2 = { right: 0, down: 1, left: 2, up: 3 }[H.facing]
      this.slash.set(0, H.x * P, 7 * P - 1 + 0.0, (H.y + 8) * P, 2, 2, k2 * 32, 0, 32, 32, 128, 32)
      this.slash.setTint(0, 1, 1, 1, 1 - p)
      this.slash.flush(1)
    } else this.slash.flush(0)

    // particles -------------------------------------------------------
    let pn = 0, sn = 0
    for (const p of S.particles) {
      const k3 = Math.max(0, p.life / p.max)
      const gy = p.gy ?? p.y
      const hgt = Math.max(0, gy - p.y)
      if (p.kind === "smoke") {
        if (this.smoke && sn < 32) {
          const f = Math.min(5, Math.floor((1 - k3) * 6))
          this.smoke.set(sn, p.x * P, hgt * P * COS, gy * P - hgt * P * SIN, 2, 2, f * 32, 0, 32, 32, srcSize(img(SHEETS.smoke)).w, srcSize(img(SHEETS.smoke)).h)
          sn++
        }
        continue
      }
      if (pn >= 512) break
      const [r, g, b, a] = parseCss(p.col)
      const s = Math.max(1, p.size) * P
      this.parts.set(pn, p.x * P, (hgt * COS) * P, gy * P - hgt * P * SIN, s, s, 0, 0, 2, 2, 2, 2)
      this.parts.setTint(pn, r, g, b, a * k3)
      pn++
    }
    this.parts.flush(pn); this.smoke?.flush(sn)

    // butterflies by day, fireflies at night / in the mine
    let ln = 0
    const amb2 = sc.ambient ?? (village && sc.meta?.trees?.length ? "meadow" : deep ? "cave" : null)
    const cave = amb2 === "cave"
    if (amb2) {
      const sw = sc.w * TS, shh = sc.h * TS
      for (let i = 0; i < 46; i++) {
        const wx = hash(i, 1, sc.w) * sw + Math.sin(now * (0.4 + hash(i, 3) * 0.5) + i) * 30
        const wy = hash(i, 2, sc.h) * shh + Math.cos(now * (0.3 + hash(i, 4) * 0.4) + i * 2) * 20
        if (night > 0.3 || cave) {
          const gl = 0.5 + 0.5 * Math.sin(now * 3 + i * 1.7)
          this.life.set(ln, wx * P, 0.5 + 0.2 * Math.sin(now + i), wy * P, P * 1.5, P * 1.5, 0, 0, 2, 2, 2, 2)
          this.life.setTint(ln, cave ? 0.5 : 1, cave ? 0.9 : 0.95, cave ? 1 : 0.5, gl * 0.95)
          ln++
        } else if (i % 3 === 0) {
          const flap = Math.sin(now * 14 + i) > 0 ? 3 : 1.5
          const c = [[1, 1, 1], [1, 0.84, 0.42], [1, 0.62, 0.81], [0.6, 0.85, 1]][i % 4]
          this.life.set(ln, wx * P, 0.55 + 0.25 * Math.sin(now * 2 + i), wy * P, flap * P, 2 * P, 0, 0, 2, 2, 2, 2)
          this.life.setTint(ln, c[0], c[1], c[2], 1)
          ln++
        }
      }
    }
    this.life.flush(ln)
  }

  /** dev stats: instance and batch counts */
  counts() {
    let inst = 0
    const all = [...this.batches, ...this.actorGroups.map((g) => g.b), this.parts, this.life, this.glow, this.slash, ...(this.smoke ? [this.smoke] : [])]
    for (const b of all) inst += b.geo.instanceCount
    return { batches: all.length, instances: inst }
  }

  dispose() {
    for (const b of [...this.batches, ...this.actorGroups.map((g) => g.b), this.parts, this.life, this.glow, this.slash, ...(this.smoke ? [this.smoke] : [])]) b.dispose()
    this.emisTex?.dispose()
    this.terrain.dispose(); this.sky.geometry.dispose(); this.skyMat.dispose()
    this.group.clear()
  }
}
