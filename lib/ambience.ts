// Procedural ambience (Web Audio, no asset files): quiet beds and sparse events per world, under the music.
//   village  birds by day, crickets at night, running water near the river, a breath of wind
//   city     traffic hum with passing swells, a distant horn now and then, rain when it rains
//   desert   wind
//   ruins    low drone, wind and distant chimes
// Follows the sfx toggle, starts only after a user gesture, crossfades when the world changes, hushes indoors,
// and suspends while the tab is hidden. Weather (rain) comes from lib/weather.
import { useGameStore } from "./store"
import { runtime } from "./runtime"
import { engine } from "./engine"
import { weather } from "./weather"

const MASTER = 0.55          // overall ambience level; every layer below is already quiet
type Ctx = AudioContext
let ctx: Ctx | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null

interface Bed {
  world: string
  bus: GainNode
  stop: () => void
  /** per-tick: night 0..1, nearWater 0..1, rain 0..1 */
  tick: (night: number, water: number, rain: number, t: number) => void
  events: (night: number, t: number) => void
}
let bed: Bed | null = null
let hushed = 1

function noiseBuf(c: Ctx) {
  if (noise) return noise
  const len = c.sampleRate * 3
  noise = c.createBuffer(1, len, c.sampleRate)
  const d = noise.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0
  for (let i = 0; i < len; i++) {   // soft pink-ish noise
    const w = Math.random() * 2 - 1
    b0 = 0.997 * b0 + w * 0.0555; b1 = 0.985 * b1 + w * 0.0751; b2 = 0.95 * b2 + w * 0.1538
    d[i] = (b0 + b1 + b2 + w * 0.5) * 0.3
  }
  return noise
}

const lfo = (c: Ctx, rate: number, depth: number, target: AudioParam) => {
  const o = c.createOscillator(), g = c.createGain()
  o.frequency.value = rate; g.gain.value = depth
  o.connect(g); g.connect(target); o.start()
  return o
}

/** looping filtered noise into `dest`; returns its gain so a tick can ride the level */
function bedNoise(c: Ctx, dest: AudioNode, type: BiquadFilterType, freq: number, q: number, wobble?: { rate: number; depth: number }) {
  const src = c.createBufferSource(); src.buffer = noiseBuf(c); src.loop = true
  src.loopStart = Math.random() * 1.5
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
  const g = c.createGain(); g.gain.value = 0
  src.connect(f); f.connect(g); g.connect(dest)
  const nodes: AudioScheduledSourceNode[] = [src]
  if (wobble) nodes.push(lfo(c, wobble.rate, wobble.depth, f.frequency))
  src.start()
  return { g, f, nodes }
}

function tone(c: Ctx, dest: AudioNode, t: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05)
}

const set = (p: AudioParam, v: number, c: Ctx, tc = 0.8) => p.setTargetAtTime(v, c.currentTime, tc)

function makeBed(c: Ctx, world: string): Bed {
  const bus = c.createGain(); bus.gain.value = 0; bus.connect(master!)
  const keep: AudioScheduledSourceNode[] = []
  const rain = bedNoise(c, bus, "highpass", 1800, 0.4); keep.push(...rain.nodes)
  const rainLo = bedNoise(c, bus, "lowpass", 5200, 0.3); keep.push(...rainLo.nodes)
  let wind: ReturnType<typeof bedNoise> | null = null, water: ReturnType<typeof bedNoise> | null = null, hum: GainNode | null = null, traffic: ReturnType<typeof bedNoise> | null = null, drone: GainNode | null = null
  if (world !== "city") { wind = bedNoise(c, bus, "bandpass", world === "desert" ? 520 : 380, 0.7, { rate: 0.07, depth: 140 }); keep.push(...wind.nodes) }
  if (world === "village") { water = bedNoise(c, bus, "lowpass", 900, 0.5, { rate: 0.31, depth: 160 }); keep.push(...water.nodes) }
  if (world === "city") {
    traffic = bedNoise(c, bus, "lowpass", 340, 0.6, { rate: 0.05, depth: 60 }); keep.push(...traffic.nodes)
    hum = c.createGain(); hum.gain.value = 0; hum.connect(bus)
    for (const f of [55, 82.6, 110.3]) { const o = c.createOscillator(); o.frequency.value = f; o.type = "sine"; o.connect(hum); o.start(); keep.push(o) }
    keep.push(lfo(c, 0.11, 0.004, hum.gain))
  }
  if (world === "ruins") {
    drone = c.createGain(); drone.gain.value = 0; drone.connect(bus)
    for (const [f, d] of [[55, 0], [82.5, 0.4], [110.2, -0.3], [164.9, 0.7]] as const) { const o = c.createOscillator(); o.frequency.value = f; o.detune.value = d * 10; o.type = "sine"; o.connect(drone); o.start(); keep.push(o) }
    keep.push(lfo(c, 0.06, 0.012, drone.gain))
  }
  // a little feedback echo for chimes and horns
  const echo = c.createDelay(1.2); echo.delayTime.value = 0.46
  const fb = c.createGain(); fb.gain.value = 0.38
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400
  echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(bus)
  const fx = c.createGain(); fx.connect(bus); fx.connect(echo)

  let next = 0
  return {
    world, bus,
    stop: () => { for (const n of keep) { try { n.stop() } catch { /* already stopped */ } } try { bus.disconnect() } catch { /* ignore */ } },
    tick: (night, nearWater, r) => {
      set(rain.g.gain, r * 0.045, c, 1.2); set(rainLo.g.gain, r * 0.07, c, 1.2)
      if (wind) set(wind.g.gain, (world === "desert" ? 0.1 : world === "ruins" ? 0.07 : 0.026) * (0.8 + 0.5 * night) * (1 + weather.sand * 0.8), c, 1.5)
      if (water) set(water.g.gain, 0.012 + nearWater * 0.075, c, 0.6)
      if (traffic) set(traffic.g.gain, 0.06 + (1 - night) * 0.02, c, 1.5)
      if (hum) set(hum.gain, 0.02 + night * 0.012, c, 1.5)
      if (drone) set(drone.gain, 0.03, c, 2)
    },
    events: (night, t) => {
      if (t < next) return
      const now = c.currentTime
      if (world === "village") {
        if (night < 0.5) {            // birds: a short phrase of two to four chirps
          const n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1800
          for (let i = 0; i < n; i++) tone(c, fx, now + i * 0.13, base * (1 + Math.random() * 0.2), base * (1.3 + Math.random() * 0.4), 0.07 + Math.random() * 0.05, 0.022 * (1 - night * 2), "sine")
          next = t + 2.5 + Math.random() * 6
        } else {                      // crickets: bursts of rapid pulses
          const f = 4200 + Math.random() * 400
          for (let i = 0; i < 4; i++) tone(c, fx, now + i * 0.055, f, f, 0.03, 0.012, "sine")
          next = t + 0.5 + Math.random() * 1.1
        }
      } else if (world === "city") {
        const r = Math.random()
        if (r < 0.35) { const f = 300 + Math.random() * 60; tone(c, fx, now, f, f * 0.97, 0.55, 0.018, "sawtooth"); tone(c, fx, now + 0.02, f * 1.26, f * 1.22, 0.55, 0.012, "sawtooth") }
        else if (r < 0.75) {          // a car going past: a swell of road noise
          const s = c.createBufferSource(); s.buffer = noiseBuf(c)
          const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.8; f.frequency.setValueAtTime(260, now); f.frequency.linearRampToValueAtTime(620, now + 2.4)
          const g = c.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.05, now + 1.1); g.gain.linearRampToValueAtTime(0, now + 2.6)
          s.connect(f); f.connect(g); g.connect(bus); s.start(now, Math.random() * 1.5, 2.7)
        }
        next = t + 4 + Math.random() * 9
      } else if (world === "ruins") {
        const f = [523.25, 659.25, 783.99, 987.77, 1174.66][Math.floor(Math.random() * 5)]
        tone(c, fx, now, f, f * 0.998, 3.6, 0.022, "sine")
        if (Math.random() < 0.5) tone(c, fx, now + 0.32, f * 1.5, f * 1.5, 3, 0.012, "sine")
        next = t + 6 + Math.random() * 12
      } else next = t + 20
    },
  }
}

function ensureCtx(): Ctx | null {
  if (ctx) return ctx
  if (typeof window === "undefined") return null
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try { ctx = new AC() } catch { return null }
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination)
  return ctx
}

let tickTimer = 0
function nearWater(): number {
  const sc = engine.scenes[runtime.scene]?.scene
  if (!sc?.water || !sc.water.length) return 0
  const px = runtime.player.x / 16, py = runtime.player.y / 16
  let best = 1e9
  for (const w of sc.water) { const d = (w.c - px) * (w.c - px) + (w.r - py) * (w.r - py); if (d < best) best = d }
  return Math.max(0, Math.min(1, 1 - (Math.sqrt(best) - 2) / 12))
}

function sync() {
  const c = ctx
  if (!c || !master) return
  const s = useGameStore.getState()
  const on = s.sfxEnabled && s.phase !== "title"
  const sc = engine.scenes[s.sceneId]?.scene
  const outdoor = !!sc && ((sc.outdoor ?? false) || sc.id === sc.world)
  hushed = outdoor ? 1 : 0.22
  const world = s.world
  set(master.gain, on && !document.hidden ? MASTER : 0, c, 0.5)
  if (!on) return
  if (c.state === "suspended" && !document.hidden) void c.resume()
  if (!bed || bed.world !== world) {
    const old = bed
    if (old) { set(old.bus.gain, 0, c, 0.5); setTimeout(() => old.stop(), 2500) }
    bed = makeBed(c, world)
    set(bed.bus.gain, hushed, c, 0.8)
  } else set(bed.bus.gain, hushed, c, 0.6)
}

function tick() {
  const c = ctx
  if (!c || !bed || document.hidden) return
  const s = useGameStore.getState()
  if (!s.sfxEnabled || s.phase === "title") return
  const night = runtime.night
  bed.tick(night, s.world === "village" ? nearWater() : 0, weather.rain, performance.now() / 1000)
  if (!s.travel && hushed > 0.5) bed.events(night, performance.now() / 1000)
}

/** call once from the game canvas; safe to call again. The context itself is only created after the first key / click / tap. */
export function initAmbience() {
  if (typeof window === "undefined" || tickTimer) return
  const wake = () => {
    if (!ensureCtx()) return
    sync()
    window.removeEventListener("pointerdown", wake, true); window.removeEventListener("keydown", wake, true)
  }
  window.addEventListener("pointerdown", wake, true); window.addEventListener("keydown", wake, true)
  useGameStore.subscribe((s, p) => { if (s.world !== p.world || s.sceneId !== p.sceneId || s.sfxEnabled !== p.sfxEnabled || s.phase !== p.phase) sync() })
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return
    if (document.hidden) { set(master!.gain, 0, ctx, 0.2); setTimeout(() => { if (document.hidden) void ctx?.suspend() }, 400) }
    else { void ctx.resume(); sync() }
  })
  tickTimer = window.setInterval(tick, 400)
}
