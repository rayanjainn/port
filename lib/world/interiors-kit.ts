// Shared builder for the interiors of the city, desert and ruins worlds.
// A room is a floor + a tall painted back wall + thin side / front walls with a doorway. Furniture are standing
// sprites (baseY = their feet), floor decor is painted flat into the ground, wall-mounted things are sprites whose
// bottom edge sits inside the back wall (the 3D view stands those vertically against the real wall).
import { charSheet, charFace } from "@/lib/na"
import { Pen } from "./exhibits"
import { TS, G, canvas, type Scene, type Sprite, type Hotspot, type ActorDef, type Light, type MusicTrack, type Action } from "./core"

type Ctx = CanvasRenderingContext2D

export interface Theme {
  bg: string
  /** paint one floor tile whose top-left is (x, y); c / r are its tile coordinates */
  floor: (g: Ctx, x: number, y: number, c: number, r: number) => void
  /** paint the whole back wall region [0, 0, w, h] px */
  back: (g: Ctx, w: number, h: number) => void
  /** one tile of the left / right wall */
  side: (g: Ctx, x: number, y: number, left: boolean) => void
  /** one tile of the front wall (and the top cap of the side walls) */
  front: (g: Ctx, x: number, y: number) => void
  mat: [string, string]
  dark: number
  music: MusicTrack
  lighting?: Scene["lighting"]
}

export interface RoomOpts { w: number; h: number; wallH?: number; theme: Theme; world: string; dark?: number; music?: MusicTrack }

export const WALL_H = 4

export type SolidOpt = false | [number, number] | undefined
export interface AddOpts { solid?: SolidOpt; glow?: Sprite["glow"]; anim?: Sprite["anim"]; flip?: boolean; dy?: number; baseOff?: number; tag?: string }

export function makeRoom(id: string, title: string, o: RoomOpts) {
  const { w, h, theme } = o
  const NW = o.wallH ?? WALL_H
  const { c: gcv, ctx: g } = canvas(w * TS, h * TS)
  const blocked = new Uint8Array(w * h)
  const tiles = new Uint8Array(w * h).fill(G.Floor)
  const sprites: Sprite[] = []
  const hotspots: Hotspot[] = []
  const actors: ActorDef[] = []
  const lights: Light[] = []
  const doorC = Math.floor(w / 2)

  g.fillStyle = theme.bg
  g.fillRect(0, 0, w * TS, h * TS)
  for (let r = NW; r < h - 1; r++) for (let c = 1; c < w - 1; c++) theme.floor(g, c * TS, r * TS, c, r)
  theme.floor(g, doorC * TS, (h - 1) * TS, doorC, h - 1)
  theme.back(g, w * TS, NW * TS)
  for (let r = NW; r < h - 1; r++) { theme.side(g, 0, r * TS, true); theme.side(g, (w - 1) * TS, r * TS, false) }
  for (let c = 0; c < w; c++) if (c !== doorC) theme.front(g, c * TS, (h - 1) * TS)
  // doormat
  g.fillStyle = theme.mat[0]; g.fillRect(doorC * TS + 2, (h - 1) * TS + 4, 12, 8)
  g.fillStyle = theme.mat[1]; g.fillRect(doorC * TS + 3, (h - 1) * TS + 5, 10, 6)

  for (let r = 0; r < NW; r++) for (let c = 0; c < w; c++) blocked[r * w + c] = 1
  for (let c = 0; c < w; c++) if (c !== doorC) blocked[(h - 1) * w + c] = 1
  for (let r = 0; r < h; r++) { blocked[r * w] = 1; blocked[r * w + w - 1] = 1 }
  for (let i = 0; i < w * h; i++) if (blocked[i]) tiles[i] = G.Void

  /** stand a sprite on the floor: cx = centre x, base = foot y (px). Default solid = its lower strip. */
  const add = (cv: CanvasImageSource & { width: number; height: number }, cx: number, base: number, op: AddOpts = {}): Sprite => {
    const pw = op.anim ? Math.round(cv.width / op.anim.frames) : cv.width, ph = cv.height
    const x = Math.round(cx - pw / 2), y = Math.round(base - ph) + (op.dy ?? 0)
    const sd = op.solid === undefined ? [Math.max(4, pw - 4), Math.min(8, ph)] : op.solid
    const s: Sprite = {
      kind: "sprite", src: cv, rect: [0, 0, pw, ph], x, y, baseY: Math.round(base) + (op.baseOff ?? 0),
      solid: sd ? { x: Math.round(cx - sd[0] / 2), y: Math.round(base - sd[1]), w: sd[0], h: sd[1] } : undefined,
      glow: op.glow, anim: op.anim, flip: op.flip, tag: op.tag,
    }
    sprites.push(s)
    return s
  }
  /** tile-aligned: cx = c * 16 + 8 (or fractional c), feet at the bottom of row r */
  const at = (cv: HTMLCanvasElement, c: number, r: number, op?: AddOpts) => add(cv, c * TS + 8, (r + 1) * TS, op)
  /** hang a sprite on the back wall: its bottom edge lies `inset` px above the wall foot, inside the wall rows */
  const wall = (cv: HTMLCanvasElement, cx: number, top: number, op: AddOpts = {}) => {
    const s = add(cv, cx, top + cv.height, { solid: false, ...op })
    s.baseY = NW * TS - 1
    return s
  }
  /** hang on the back wall, sitting just above the baseboard */
  const wallLow = (cv: HTMLCanvasElement, cx: number, gap = 2, op: AddOpts = {}) => wall(cv, cx, NW * TS - 12 - gap - cv.height, op)
  /** flat decal painted into the ground */
  const decal = (fn: (g: Ctx) => void) => fn(g)
  const spot = (sid: string, x: number, y: number, label: string, action: Action, marker = true, mx?: number, my?: number) =>
    hotspots.push({ id: sid, box: { x: x - 14, y: y - 10, w: 28, h: 22 }, label, action, marker, markerX: mx ?? x, markerY: my ?? y - 30 })
  const light = (x: number, y: number, r: number, color: string, flicker?: number) => lights.push({ x, y, r, color, flicker })
  /** soft coloured pool on the floor (painted into ground) */
  const pool = (x: number, y: number, rx: number, ry: number, rgb: string, a = 0.18) => {
    g.save(); g.translate(x, y); g.scale(1, ry / rx)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx)
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore()
  }

  hotspots.push({ id: "exit", box: { x: doorC * TS - 4, y: (h - 1) * TS, w: 24, h: 16 }, label: "LEAVE", action: { type: "exit" } })

  const finish = (extra: Partial<Scene> = {}): Scene => ({
    id, title, w, h, ground: gcv, sprites, blocked, hotspots, actors, lights, tiles,
    spawn: { x: doorC * TS + 8, y: (h - 2) * TS + 10, facing: "up" }, dark: o.dark ?? theme.dark, music: o.music ?? theme.music, scale: 4, bg: theme.bg,
    world: o.world, outdoor: false, lighting: theme.lighting, ...extra,
  })
  return { g, w, h, NW, doorC, add, at, wall, wallLow, decal, spot, light, pool, sprites, hotspots, actors, lights, blocked, tiles, finish }
}
export type Room = ReturnType<typeof makeRoom>

export function npc(name: string, x: number, y: number, extra: Partial<ActorDef>, sheet = charSheet(name), face = charFace(name)): ActorDef {
  return { id: name, kind: "npc", sheet, face, name, x, y, wander: 0, facing: "down", ...extra }
}

// ── painting helpers ────────────────────────────────────────────
export function pen(w: number, h: number) { return new Pen(w, h) }
export { Pen }

/** soft contact shadow under a prop, drawn into its own canvas bottom */
export function shadow(P: Pen, x: number, y: number, w: number) {
  P.x.fillStyle = "rgba(0,0,0,.28)"; P.x.fillRect(x, y, w, 2); P.x.fillStyle = "rgba(0,0,0,.14)"; P.x.fillRect(x + 1, y + 2, w - 2, 1)
}

export function shade(hex: string, t: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t))))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`
}

/** wrap text to a canvas with the shared pixel fonts is in exhibits; here a bitmap-from-rows shorthand */
export function bitmap(w: number, h: number, rows: string[], pal: Record<string, string>, outline: boolean | string = false) {
  const P = new Pen(w, h)
  P.bm(rows, pal, 0, 0, { outline })
  return P.c
}

/** a strip of `n` frames, built by `draw(P, i)` on a fw x fh pen each */
export function strip(fw: number, fh: number, n: number, draw: (P: Pen, i: number) => void) {
  const { c, ctx } = canvas(fw * n, fh)
  for (let i = 0; i < n; i++) {
    const P = new Pen(fw, fh)
    draw(P, i)
    ctx.drawImage(P.c, i * fw, 0)
  }
  return c
}
