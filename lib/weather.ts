// Weather, once for both views. A world's entry scene carries a `weather` profile; this module owns a fixed pool of
// particles (no per-frame allocation) that live in scene px in a box around the camera and wrap as it moves, plus the
// seeded schedule that decides what is happening right now. The 2D canvas and the 3D view both just read `weather`.
//
//   village  gentle rain or falling petals, now and then
//   city     light rain with puddle ripples; wet reflections on some nights
//   desert   drifting sand, heat shimmer at midday
//   ruins    fog banks and drifting motes
import { hash } from "@/lib/world/core"

export type WeatherProfile = "village" | "city" | "desert" | "ruins"
export type WeatherKind = "rain" | "petals" | "sand" | "shimmer" | "fog" | "motes"

export const CAP = { rain: 320, petals: 80, sand: 190, motes: 60, ripples: 20, mist: 7 } as const
export const SLOT = 210   // seconds: the schedule changes every few minutes, not constantly

/** current strength of every effect, 0..1, eased toward the schedule */
export const weather = {
  profile: null as WeatherProfile | null,
  rain: 0, petals: 0, sand: 0, shimmer: 0, fog: 0, motes: 0,
  /** wet ground / reflections (rain, and a while after it on some city nights) */
  wet: 0,
  /** box the particles fill (scene px), centred on (cx, cy) */
  cx: 0, cy: 0, w: 400, h: 260,
  reduced: false,
}

// particle pool: structure of arrays. kind 0 rain, 1 petal, 2 sand, 3 mote
export const P = {
  n: 0,
  x: new Float32Array(CAP.rain + CAP.petals + CAP.sand + CAP.motes),
  y: new Float32Array(CAP.rain + CAP.petals + CAP.sand + CAP.motes),
  h: new Float32Array(CAP.rain + CAP.petals + CAP.sand + CAP.motes),
  vx: new Float32Array(CAP.rain + CAP.petals + CAP.sand + CAP.motes),
  vy: new Float32Array(CAP.rain + CAP.petals + CAP.sand + CAP.motes),
  vh: new Float32Array(CAP.rain + CAP.petals + CAP.sand + CAP.motes),
  s: new Float32Array(CAP.rain + CAP.petals + CAP.sand + CAP.motes),   // seed / phase
  kind: new Uint8Array(CAP.rain + CAP.petals + CAP.sand + CAP.motes),
  /** number alive per kind (set each frame from the strengths) */
  live: [0, 0, 0, 0] as number[],
}
const OFF = [0, CAP.rain, CAP.rain + CAP.petals, CAP.rain + CAP.petals + CAP.sand]
export const kindOffset = (k: number) => OFF[k]
// puddle ripples: x, y (scene px), age 0..1
export const R = { x: new Float32Array(CAP.ripples), y: new Float32Array(CAP.ripples), t: new Float32Array(CAP.ripples).fill(2), next: 0 }
// fog banks: x, y in the box (0..1), drift speed
export const MIST = { x: new Float32Array(CAP.mist), y: new Float32Array(CAP.mist), v: new Float32Array(CAP.mist), r: new Float32Array(CAP.mist) }
for (let i = 0; i < CAP.mist; i++) { MIST.x[i] = hash(i, 1, 5); MIST.y[i] = 0.15 + hash(i, 2, 5) * 0.8; MIST.v[i] = 0.004 + hash(i, 3, 5) * 0.006; MIST.r[i] = 0.7 + hash(i, 4, 5) * 0.8 }

const seedOf = (id: string) => [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 997

let forced: string | null = null
if (typeof window !== "undefined") forced = new URLSearchParams(window.location.search).get("weather")

/** what the schedule wants right now, 0..1 per effect */
export function scheduled(profile: WeatherProfile, night: number, timeSec = Date.now() / 1000) {
  const slot = Math.floor(timeSec / SLOT), r = hash(slot, seedOf(profile), 11), r2 = hash(slot, seedOf(profile), 29)
  const w = { rain: 0, petals: 0, sand: 0, shimmer: 0, fog: 0, motes: 0, wet: 0 }
  const lvl = 0.55 + 0.45 * hash(slot, seedOf(profile), 3)
  if (profile === "village") { if (r < 0.14) w.rain = 0.55 * lvl; else if (r < 0.34) w.petals = lvl }
  else if (profile === "city") { if (r < 0.3) w.rain = 0.7 * lvl; if (w.rain > 0 || (r2 < 0.3 && night > 0.4)) w.wet = w.rain > 0 ? 1 : 0.7 }
  else if (profile === "desert") { if (r < 0.45) w.sand = lvl; w.shimmer = Math.max(0, 1 - night * 2.2) * 0.9 }
  else { w.motes = 0.6 + 0.4 * lvl; if (r < 0.55) w.fog = lvl }
  if (forced) {
    const f = forced
    if (f === "clear") return { rain: 0, petals: 0, sand: 0, shimmer: 0, fog: 0, motes: 0, wet: 0 }
    if (f in w) { (w as Record<string, number>)[f] = 1; if (f === "rain") w.wet = 1 }
  }
  return w
}

const ease = (a: number, b: number, k: number) => a + (b - a) * k
const spawn = (i: number, kind: number, fresh: boolean) => {
  const { cx, cy, w, h } = weather
  P.kind[i] = kind
  P.s[i] = Math.random()
  P.x[i] = cx + (Math.random() - 0.5) * w
  P.y[i] = cy + (Math.random() - 0.5) * h
  if (kind === 0) { P.h[i] = fresh ? Math.random() * 90 : 90 + Math.random() * 20; P.vh[i] = -150 - Math.random() * 40; P.vx[i] = -14; P.vy[i] = 0 }
  else if (kind === 1) { P.h[i] = fresh ? Math.random() * 90 : 90; P.vh[i] = -(14 + Math.random() * 10); P.vx[i] = 8 + Math.random() * 10; P.vy[i] = Math.random() * 6 - 3 }
  else if (kind === 2) { P.h[i] = Math.random() * 26 + 1; P.vh[i] = 0; P.vx[i] = 34 + Math.random() * 40; P.vy[i] = (Math.random() - 0.5) * 6 }
  else { P.h[i] = 4 + Math.random() * 24; P.vh[i] = 0; P.vx[i] = (Math.random() - 0.5) * 5; P.vy[i] = (Math.random() - 0.5) * 3 }
}

/** advance the weather one frame. `box` is the area to fill (scene px) centred on (cx, cy). */
export function updateWeather(profile: WeatherProfile | null, dt: number, cx: number, cy: number, w: number, h: number, night: number, paused = false) {
  const W = weather
  if (typeof window !== "undefined") W.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
  if (profile !== W.profile) { W.profile = profile; for (let i = 0; i < R.t.length; i++) R.t[i] = 2 }
  const want = profile && !W.reduced ? scheduled(profile, night) : { rain: 0, petals: 0, sand: 0, shimmer: 0, fog: 0, motes: 0, wet: 0 }
  const k = Math.min(1, dt * 0.35)
  W.rain = ease(W.rain, want.rain, k); W.petals = ease(W.petals, want.petals, k); W.sand = ease(W.sand, want.sand, k)
  W.shimmer = ease(W.shimmer, want.shimmer, k); W.fog = ease(W.fog, want.fog, k * 0.6); W.motes = ease(W.motes, want.motes, k)
  W.wet = ease(W.wet, want.wet, Math.min(1, dt * 0.12))
  W.cx = cx; W.cy = cy; W.w = w; W.h = h
  const area = Math.min(1.6, (w * h) / (320 * 200))
  const target = [W.rain * CAP.rain * area, W.petals * CAP.petals * area, W.sand * CAP.sand * area, W.motes * CAP.motes * area]
  for (let kd = 0; kd < 4; kd++) {
    const cap = [CAP.rain, CAP.petals, CAP.sand, CAP.motes][kd]
    const n = Math.min(cap, Math.round(target[kd]))
    const o = OFF[kd]
    for (let i = P.live[kd]; i < n; i++) spawn(o + i, kd, true)   // newly needed particles appear spread through the box
    P.live[kd] = n
  }
  if (paused) return
  const t = performance.now() / 1000
  const hw = w / 2, hh = h / 2
  for (let kd = 0; kd < 4; kd++) {
    const o = OFF[kd], n = P.live[kd]
    for (let j = 0; j < n; j++) {
      const i = o + j
      P.x[i] += (P.vx[i] + (kd === 1 ? Math.sin(t * 1.6 + P.s[i] * 20) * 9 : kd === 3 ? Math.sin(t * 0.7 + P.s[i] * 30) * 3 : 0)) * dt
      P.y[i] += P.vy[i] * dt
      P.h[i] += P.vh[i] * dt
      if (kd === 3) P.h[i] += Math.sin(t * 0.9 + P.s[i] * 40) * 3 * dt
      if (P.h[i] <= 0 && kd <= 1) {
        // landed: rain leaves a ripple in the city, then both start over at the top
        if (kd === 0 && W.profile === "city" && W.rain > 0.2 && Math.random() < 0.18) {
          const q = R.next++ % CAP.ripples
          R.x[q] = P.x[i]; R.y[q] = P.y[i]; R.t[q] = 0
        }
        spawn(i, kd, false)
        continue
      }
      // wrap around the box so the field follows the camera without any spawning
      if (P.x[i] < cx - hw) P.x[i] += w; else if (P.x[i] > cx + hw) P.x[i] -= w
      if (P.y[i] < cy - hh) P.y[i] += h; else if (P.y[i] > cy + hh) P.y[i] -= h
    }
  }
  for (let q = 0; q < CAP.ripples; q++) if (R.t[q] < 1.5) R.t[q] += dt * 1.6
  for (let i = 0; i < CAP.mist; i++) { MIST.x[i] += MIST.v[i] * dt; if (MIST.x[i] > 1.4) MIST.x[i] -= 1.8 }
}

export const weatherActive = () => weather.rain + weather.petals + weather.sand + weather.shimmer + weather.fog + weather.motes + weather.wet > 0.01
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf")) (window as unknown as { __weather: unknown }).__weather = { weather, P }
