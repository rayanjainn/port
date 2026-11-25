// First-visit intro (about 5 s): the camera opens on the world's landmark, the hero walks in, the world's guide greets
// the traveller in the normal dialogue box, then control is handed over. Any key or click skips. Plays once
// (localStorage `rayan-world:intro-seen`) and never with reduced motion. Both views use `engine.introFocus` as the camera target.
import { engine, type EngineState, type SceneRT } from "@/lib/engine"
import { useGameStore } from "@/lib/store"
import { runtime } from "@/lib/runtime"
import { TS, type Box } from "@/lib/world/core"
import { worldById } from "@/lib/world/worlds"

const KEY = "rayan-world:intro-seen"
const HOLD = 1.5        // seconds on the landmark before the camera comes down to the hero
const GLIDE = 1.5       // seconds for the camera to travel to the hero
const WALK_FROM = 0.5   // the hero starts walking in
const WALK = 56         // px the hero walks

let state: { t: number; focus: { x: number; y: number }; from: { x: number; y: number }; said: boolean; spawn: { x: number; y: number } } | null = null

const footBox = (x: number, y: number): Box => ({ x: x - 5, y: y - 6, w: 10, h: 6 })
const seen = () => { try { return localStorage.getItem(KEY) === "1" } catch { return true } }
const mark = () => { try { localStorage.setItem(KEY, "1") } catch { /* private mode */ } }

export const introActive = () => state !== null

function end(S: EngineState) {
  if (!state) return
  engine.introFocus = null
  S.hero.path = []
  state = null
  window.removeEventListener("keydown", skip, true)
  window.removeEventListener("pointerdown", skip, true)
}

function skip() {
  const S = engine.state
  if (!state || !S) return
  // keys that start moving must not also be read as the first step of play
  S.keys = {}
  if (!state.said) { S.hero.x = state.spawn.x; S.hero.y = state.spawn.y; S.cam.init = false }
  end(S)
}

/** call once when play begins */
export function maybeStartIntro(S: EngineState, rt: SceneRT | undefined) {
  if (state || !rt || seen() || matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const store = useGameStore.getState()
  const w = worldById(store.world)
  if (S.scene !== w.scene) return
  mark()
  const sp = rt.scene.spawn
  // somewhere free to walk in from: straight back along the first open direction
  let from = { x: sp.x, y: sp.y }
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
    for (const d of [WALK, WALK * 0.6, WALK * 0.35]) {
      const x = sp.x + dx * d, y = sp.y + dy * d
      let clear = x > 8 && y > 8 && x < rt.scene.w * TS - 8 && y < rt.scene.h * TS - 8
      for (let k = 1; clear && k <= 6; k++) { const q = k / 6; if (rt.solids.hits(footBox(sp.x + dx * d * q, sp.y + dy * d * q))) clear = false }
      if (clear) { from = { x, y }; break }
    }
    if (from.x !== sp.x || from.y !== sp.y) break
  }
  // open on the first landmark (its door), a little above so the facade is in frame
  const lm = rt.scene.landmarks?.[0]
  const focus = lm ? { x: lm.x, y: lm.y - 36 } : { x: sp.x, y: sp.y - 70 }
  S.hero.x = from.x; S.hero.y = from.y; S.hero.facing = from.y > sp.y ? "up" : from.x > sp.x ? "left" : from.x < sp.x ? "right" : "down"
  S.hero.path = []
  S.cam.init = false
  engine.introFocus = { ...focus }
  state = { t: 0, focus, from, said: false, spawn: { x: sp.x, y: sp.y } }
  window.addEventListener("keydown", skip, true)
  window.addEventListener("pointerdown", skip, true)
}

const ease = (k: number) => k * k * (3 - 2 * k)

/** call every frame while playing (before hero movement) */
export function tickIntro(dt: number, S: EngineState, rt: SceneRT) {
  const I = state
  if (!I) return
  if (S.scene !== rt.scene.id) { end(S); return }
  I.t += dt
  S.keys = {}                       // no steering during the intro (a key press skips it instead)
  runtime.joy.x = 0; runtime.joy.y = 0
  if (I.t >= WALK_FROM && S.hero.path.length === 0 && !I.said && Math.hypot(S.hero.x - I.spawn.x, S.hero.y - I.spawn.y) > 2) S.hero.path = [{ x: I.spawn.x, y: I.spawn.y }]
  // camera: hold on the landmark, then glide down onto the hero
  const k = ease(Math.max(0, Math.min(1, (I.t - HOLD) / GLIDE)))
  const f = engine.introFocus
  if (f) { f.x = I.focus.x + (S.hero.x - I.focus.x) * k; f.y = I.focus.y + (S.hero.y - I.focus.y) * k }
  // arrived (and the camera is home): the guide says hello
  if (!I.said && I.t >= HOLD + GLIDE && Math.hypot(S.hero.x - I.spawn.x, S.hero.y - I.spawn.y) < 3) {
    I.said = true
    S.hero.path = []
    const w = worldById(useGameStore.getState().world)
    const guide = rt.actors
      .filter((a) => a.def.kind === "npc" && (a.def.lines || a.def.bark))
      .sort((a, b) => Math.hypot(a.x - I.spawn.x, a.y - I.spawn.y) - Math.hypot(b.x - I.spawn.x, b.y - I.spawn.y))[0]
    useGameStore.getState().say({
      name: guide?.def.name ?? "Guide", face: guide?.def.face,
      lines: [`Welcome to ${w.name}, traveller. Every building here is a chapter of Rayan's story.`],
    })
    end(S)
  }
}
