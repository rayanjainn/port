// Scene model shared by the village, building interiors and the dungeon.
import { SHEETS, type Rect, type SheetId, type Autotile } from "@/lib/na"

export type Facing = "up" | "down" | "left" | "right"

export const TS = 16

// ── image cache ─────────────────────────────────────────────────
const cache = new Map<string, HTMLImageElement>()
export function img(src: string): HTMLImageElement {
  let im = cache.get(src)
  if (!im) {
    im = new Image()
    im.src = src
    cache.set(src, im)
  }
  return im
}
export const sheet = (id: SheetId) => img(SHEETS[id])
export function loadAll(srcs: string[]): Promise<void> {
  return Promise.all([...new Set(srcs)].map((s) => {
    const im = img(s)
    if (im.complete && im.naturalWidth) return Promise.resolve()
    return new Promise<void>((res) => {
      im.addEventListener("load", () => res(), { once: true })
      im.addEventListener("error", () => res(), { once: true })
    })
  })).then(() => undefined)
}
export const ready = (im: HTMLImageElement) => im.complete && im.naturalWidth > 0

export function blit(ctx: CanvasRenderingContext2D, src: CanvasImageSource, r: Rect, dx: number, dy: number, flip = false) {
  if (flip) {
    ctx.save()
    ctx.translate(Math.round(dx) + r[2], Math.round(dy))
    ctx.scale(-1, 1)
    ctx.drawImage(src, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3])
    ctx.restore()
  } else ctx.drawImage(src, r[0], r[1], r[2], r[3], Math.round(dx), Math.round(dy), r[2], r[3])
}

// deterministic noise
export function hash(x: number, y = 0, s = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
  return n - Math.floor(n)
}
export function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── terrain ─────────────────────────────────────────────────────
export const G = { Grass: 0, Dirt: 1, Water: 2, Bridge: 3, Floor: 4, Void: 5, Plaza: 6 } as const

/** Pick the autotile piece for cell (c, r) of a region defined by `inside`. */
export function autotile(at: Autotile, inside: (c: number, r: number) => boolean, c: number, r: number): Rect {
  const u = inside(c, r - 1), d = inside(c, r + 1), l = inside(c - 1, r), rt = inside(c + 1, r)
  if (!u && !d && !l && !rt) return at.single
  if (!l && !rt) return !u ? at.vTop : !d ? at.vBot : at.vMid
  if (!u && !d) return !l ? at.hLeft : !rt ? at.hRight : at.hMid
  if (!u) return !l ? at.tl : !rt ? at.tr : at.t
  if (!d) return !l ? at.bl : !rt ? at.br : at.b
  if (!l) return at.l
  if (!rt) return at.r
  if (!inside(c + 1, r + 1)) return at.iBR
  if (!inside(c - 1, r + 1)) return at.iBL
  if (!inside(c + 1, r - 1)) return at.iTR
  if (!inside(c - 1, r - 1)) return at.iTL
  return at.c[Math.floor(hash(c, r, 3) * at.c.length) % at.c.length]
}

// ── objects ─────────────────────────────────────────────────────
export interface Box { x: number; y: number; w: number; h: number }

export interface Sprite {
  kind: "sprite"
  src: CanvasImageSource | (() => CanvasImageSource | null)
  rect: Rect
  x: number; y: number      // top-left in scene px
  baseY: number              // y used for depth sorting
  solid?: Box
  flip?: boolean
  anim?: { frames: number; fps: number; dx: number }   // horizontal strip animation
  sway?: number              // gentle canopy sway amplitude
  glow?: { x: number; y: number; r: number; color: string }   // light source when dark
  tag?: string
}

export type Action =
  | { type: "section"; id: string; focus?: string }
  | { type: "talk"; npc: string }
  | { type: "game"; id: string }
  | { type: "chest"; id: string }
  | { type: "door"; to: string; label: string }
  | { type: "exit" }
  | { type: "sign"; lines: string[] }

export interface Hotspot {
  id: string
  box: Box            // interaction area in scene px
  label: string       // shown in the prompt
  action: Action
  marker?: boolean    // draw a floating marker above it
  markerX?: number; markerY?: number
}

export interface Light { x: number; y: number; r: number; color: string; flicker?: number }

export interface ActorDef {
  id: string
  kind: "npc" | "animal" | "monster"
  sheet: string
  x: number; y: number
  facing?: Facing
  wander?: number        // radius in px, 0 = stand still
  name?: string
  face?: string          // faceset for dialogue
  lines?: string[]       // dialogue
  bark?: string[]        // speech bubbles when the player walks by
  speed?: number
  action?: Action        // what talking leads to
}

export interface Scene {
  id: string
  title: string
  w: number; h: number           // in tiles
  ground: HTMLCanvasElement      // pre-rendered static ground
  overlay?: HTMLCanvasElement    // pre-rendered static layer drawn above actors (e.g. forest canopy)
  sprites: Sprite[]
  blocked: Uint8Array            // per tile: 1 = not walkable
  hotspots: Hotspot[]
  actors: ActorDef[]
  lights: Light[]
  spawn: { x: number; y: number; facing: Facing }
  dark: number                   // ambient darkness 0..1 (interiors/dungeon)
  music: "village" | "dungeon" | "chill"
  scale?: number                 // preferred zoom
  water?: { c: number; r: number }[]   // water tiles for ripples
  bg?: string
  meta?: { trees: { x: number; y: number; k: string }[] }
}

export function canvas(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const ctx = c.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  return { c, ctx }
}

export function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Spatial index of solid boxes for fast collision. */
export class SolidIndex {
  private cells = new Map<number, Box[]>()
  constructor(private cols: number) {}
  add(b: Box) {
    for (let r = Math.floor(b.y / TS); r <= Math.floor((b.y + b.h - 0.01) / TS); r++)
      for (let c = Math.floor(b.x / TS); c <= Math.floor((b.x + b.w - 0.01) / TS); c++) {
        const k = r * this.cols + c
        const arr = this.cells.get(k)
        if (arr) arr.push(b); else this.cells.set(k, [b])
      }
  }
  hits(b: Box) {
    for (let r = Math.floor(b.y / TS); r <= Math.floor((b.y + b.h - 0.01) / TS); r++)
      for (let c = Math.floor(b.x / TS); c <= Math.floor((b.x + b.w - 0.01) / TS); c++) {
        const arr = this.cells.get(r * this.cols + c)
        if (arr) for (const s of arr) if (overlaps(s, b)) return true
      }
    return false
  }
}
