"use client"
import { useEffect, useRef, useState } from "react"
import { useGameStore } from "@/lib/store"
import { engine } from "@/lib/engine"
import { img } from "@/lib/world/core"
import { worldById, type World } from "@/lib/world/worlds"
import { playSound } from "@/lib/audio"

const W = 320, H = 180
const COVER = 1.15      // seconds: the world swaps under the scene here
const END = 2.1

/** Short skippable interstitial: a boat crossing a pixel sea, a metro car in its tunnel, or a swirling gate. */
export default function TravelTransition() {
  const travel = useGameStore((s) => s.travel)
  if (!travel) return null
  return <Run key={`${travel.from}>${travel.to}`} from={worldById(travel.from)} to={worldById(travel.to)} />
}

function Run({ from, to }: { from: World; to: World }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const clock = useRef({ t: 0, swapped: false, done: false })
  const [phase, setPhase] = useState<"in" | "out">("in")
  const [name, setName] = useState(false)
  const load = useGameStore((s) => s.worldLoad[to.id])
  const kind = from.travel.kind === "dock" ? "boat" : from.travel.kind === "metro" ? "metro" : "gate"

  useEffect(() => {
    playSound(kind === "boat" ? "magic" : "jump")
    void engine.ensureWorld(to.id)
    const boat = img("/na/vehicles/Boat.png"), sail = img("/na/vehicles/Sail.png")
    const ctx = cv.current!.getContext("2d")!
    ctx.imageSmoothingEnabled = false
    let raf = 0, last = performance.now()
    const skip = () => { const c = clock.current; if (c.t < COVER) c.t = COVER }
    const onKey = (e: KeyboardEvent) => { if (["escape", "enter", " "].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopPropagation(); skip() } }
    window.addEventListener("keydown", onKey, true)
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const c = clock.current
      const ready = useGameStore.getState().worldLoad[to.id]?.state === "ready"
      // hold at the cover point until the destination exists
      if (!(c.t >= COVER && !c.swapped && !ready)) c.t += dt
      if (c.t >= 0.6) setName(true)
      if (c.t >= COVER && !c.swapped && ready) {
        c.swapped = true
        engine.enterWorld(to.id, "arrive")
        playSound("bong")
      }
      if (c.t >= END - 0.55) setPhase("out")
      if (c.t >= END && !c.done) { c.done = true; useGameStore.getState().endTravel(); return }
      const tt = Math.min(c.t, COVER + 0.3) + (c.t > COVER ? (c.t - COVER) * 0.3 : 0)
      if (kind === "boat") drawBoat(ctx, tt, boat, sail, to)
      else if (kind === "metro") drawMetro(ctx, tt, to)
      else drawGate(ctx, tt, to)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey, true) }
  }, [kind, to])

  const waiting = !!load && load.state !== "ready"
  return (
    <div className={`tr-root${phase === "out" ? " tr-out" : ""}`} role="status" aria-label={`Travelling to ${to.name}`} onClick={() => { if (clock.current.t < COVER) clock.current.t = COVER }}
      style={{ ["--acc" as string]: to.accent }}>
      <canvas ref={cv} width={W} height={H} className="tr-canvas" style={{ objectFit: "cover" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(5,3,14,.7) 100%)" }} />
      <div style={{
        position: "absolute", top: "30%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, pointerEvents: "none",
        opacity: name ? 1 : 0, transform: name ? "none" : "translateY(-10px)", transition: "opacity .6s ease, transform .6s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 60, height: 2, background: "linear-gradient(90deg, transparent, #ffe7b0)" }} />
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 4, color: "#ffe7b0", textShadow: "0 2px 0 #1d1006" }}>WORLD {to.roman}</span>
          <span style={{ width: 60, height: 2, background: "linear-gradient(90deg, #ffe7b0, transparent)" }} />
        </div>
        <div style={{
          fontFamily: "var(--font-pixel)", fontSize: "clamp(20px, 4.4vw, 46px)", letterSpacing: 4, color: "#fff4dc", textAlign: "center", padding: "0 12px",
          textShadow: "0 4px 0 #1d1006, 0 -2px 0 #1d1006, 3px 0 0 #1d1006, -3px 0 0 #1d1006, 0 10px 30px rgba(0,0,0,.6)",
        }}>{to.name.toUpperCase()}</div>
      </div>
      {waiting && (
        <div className="tr-load">CHARTING THE ROUTE {Math.round((load?.progress ?? 0) * 100)}%<div><i style={{ width: `${(load?.progress ?? 0) * 100}%` }} /></div></div>
      )}
      <div className="tr-skip kb-only">CLICK / ESC TO SKIP</div>
    </div>
  )
}

const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s) }

function sky(ctx: CanvasRenderingContext2D, top: string, mid: string, bot: string, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, top); g.addColorStop(0.6, mid); g.addColorStop(1, bot)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, h)
}

function skyline(ctx: CanvasRenderingContext2D, x0: number, base: number, t: number, w: World) {
  if (w.id === "city") {
    for (let i = 0; i < 16; i++) {
      const bw = 8 + Math.floor(hash(i) * 8), bh = 14 + Math.floor(hash(i + 9) * 40), x = x0 + i * 11
      ctx.fillStyle = "#1a1730"; ctx.fillRect(x, base - bh, bw, bh)
      for (let y = base - bh + 3; y < base - 2; y += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 3) {
        if (hash(i * 31 + y + xx) < 0.55) { ctx.fillStyle = hash(xx + y) < 0.3 ? w.accent : hash(xx + y) < 0.6 ? w.accent2 : "#ffd98a"; ctx.fillRect(xx, y, 1, 2) }
      }
    }
  } else {
    ctx.fillStyle = "#2a3a22"
    for (let i = 0; i < 40; i++) { const x = x0 + i * 4, h = 8 + Math.sin(i * 0.5 + t) * 2 + hash(i) * 8; ctx.fillRect(x, base - h, 5, h) }
  }
}

function drawBoat(ctx: CanvasRenderingContext2D, t: number, boat: HTMLImageElement, sail: HTMLImageElement, to: World) {
  const hz = 92
  sky(ctx, "#1b1236", to.id === "city" ? "#5a2a6e" : "#c2603a", to.id === "city" ? "#ff8a6a" : "#ffd98a", hz)
  for (let i = 0; i < 30; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i); ctx.fillStyle = "#fff"; ctx.fillRect(Math.floor(hash(i) * W), Math.floor(hash(i + 3) * 50), 1, 1) }
  ctx.globalAlpha = 1
  skyline(ctx, 330 - t * 70, hz, t, to)
  // sea
  for (let y = hz; y < H; y++) {
    const k = (y - hz) / (H - hz)
    ctx.fillStyle = `rgb(${Math.round(20 + 20 * (1 - k))},${Math.round(60 + 50 * (1 - k))},${Math.round(110 + 40 * (1 - k))})`
    ctx.fillRect(0, y, W, 1)
  }
  for (let r = 0; r < 14; r++) {
    const y = hz + 4 + r * r * 0.42 + 2, sp = 20 + r * 14
    for (let x = -((t * sp) % 40); x < W; x += 40) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(Math.round(x + hash(r) * 30), Math.round(y), 6 + r, 1) }
  }
  const bob = Math.round(Math.sin(t * 4) * 1.5)
  const bx = 120 + Math.round(Math.sin(t * 0.8) * 4), by = 108 + bob
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(bx + 4, by + 31, 74, 3)
  if (boat.complete) ctx.drawImage(boat, bx, by)
  if (sail.complete) ctx.drawImage(sail, bx + 26, by - 33)
  // wake
  for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,255,255,${0.5 - i * 0.06})`; ctx.fillRect(bx - 4 - i * 9 - ((t * 40) % 9), by + 29 + (i % 2), 6, 1) }
  // gulls
  for (let i = 0; i < 3; i++) { const gx = (t * 24 + i * 120) % (W + 40) - 20, gy = 26 + i * 12 + Math.sin(t * 3 + i) * 3; ctx.fillStyle = "#fff4dc"; ctx.fillRect(gx, gy, 3, 1); ctx.fillRect(gx - 2, gy + 1, 2, 1); ctx.fillRect(gx + 3, gy + 1, 2, 1) }
}

function drawMetro(ctx: CanvasRenderingContext2D, t: number, to: World) {
  ctx.fillStyle = "#0a0b18"; ctx.fillRect(0, 0, W, H)
  const v = 260
  // far wall with streaking ceiling lights
  for (let y = 0; y < 60; y++) { ctx.fillStyle = `rgb(${14 + y / 3},${16 + y / 3},${34 + y / 2})`; ctx.fillRect(0, y, W, 1) }
  for (let x = -((t * v) % 64); x < W; x += 64) { ctx.fillStyle = "#cfe8ff"; ctx.fillRect(x, 6, 30, 2); ctx.fillStyle = "rgba(160,210,255,.25)"; ctx.fillRect(x - 6, 8, 42, 5) }
  for (let x = -((t * v * 0.5) % 40); x < W; x += 40) { ctx.fillStyle = "#1c2442"; ctx.fillRect(x, 70, 3, 60); ctx.fillStyle = to.accent; ctx.fillRect(x, 74, 3, 2) }
  // rails and floor
  ctx.fillStyle = "#14152a"; ctx.fillRect(0, 132, W, 48)
  for (let x = -((t * v) % 24); x < W; x += 24) { ctx.fillStyle = "#2a2d4a"; ctx.fillRect(x, 140, 10, 40) }
  ctx.fillStyle = "#6a6f9a"; ctx.fillRect(0, 138, W, 1); ctx.fillRect(0, 158, W, 1)
  // the car
  const sh = Math.round(Math.sin(t * 30) * 0.6)
  const x = 46, y = 74 + sh
  ctx.fillStyle = "#0b1030"; ctx.fillRect(x - 2, y - 2, 232, 64)
  ctx.fillStyle = "#1c5fd0"; ctx.fillRect(x, y, 228, 58)
  ctx.fillStyle = "#3b86ff"; ctx.fillRect(x, y, 228, 3)
  ctx.fillStyle = "#e9f2ff"; ctx.fillRect(x, y + 38, 228, 6)
  ctx.fillStyle = to.accent; ctx.fillRect(x, y + 45, 228, 3)
  for (let i = 0; i < 6; i++) {
    const wx = x + 8 + i * 37
    ctx.fillStyle = "#0b1030"; ctx.fillRect(wx - 1, y + 8, 30, 26)
    ctx.fillStyle = "#ffe9a8"; ctx.fillRect(wx, y + 9, 28, 24)
    // passengers
    ctx.fillStyle = ["#3a2a4a", "#4a3a2a", "#2a3a4a"][i % 3]; if (i !== 2 && i !== 4) { ctx.fillRect(wx + 8, y + 17, 7, 16); ctx.fillStyle = "#e8b890"; ctx.fillRect(wx + 9, y + 13, 5, 5) }
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(wx + 2, y + 9, 3, 24)
  }
  ctx.fillStyle = "#0b1030"; ctx.fillRect(x + 2, y + 56, 224, 4)
  for (const wx of [x + 22, x + 170]) { ctx.fillStyle = "#222"; ctx.fillRect(wx, y + 58, 28, 6) }
  // speed lines
  for (let i = 0; i < 14; i++) { const ly = 20 + hash(i) * 150, lx = (-(t * (300 + i * 20)) + hash(i + 5) * 400) % 400; ctx.fillStyle = "rgba(200,225,255,.35)"; ctx.fillRect(lx < 0 ? lx + 400 - 80 : lx, ly, 26 + hash(i) * 30, 1) }
}

function drawGate(ctx: CanvasRenderingContext2D, t: number, to: World) {
  ctx.fillStyle = "#07051a"; ctx.fillRect(0, 0, W, H)
  for (let i = 14; i > 0; i--) {
    const k = ((i + t * 3) % 14) / 14
    const s = k * 190, a = t * 0.9 + i * 0.3
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(a)
    ctx.strokeStyle = i % 2 ? to.accent : to.accent2; ctx.globalAlpha = 1 - k * 0.7; ctx.lineWidth = 3
    ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.restore()
  }
  ctx.globalAlpha = 1
}
