// 2D renderer for lib/weather.ts: draws the pooled particles into the native-resolution frame (before the night pass).
import { weather, P, R, MIST, CAP, kindOffset } from "./weather"
import type { Light } from "@/lib/world/core"

let mistCv: HTMLCanvasElement | null = null
function mist() {
  if (mistCv) return mistCv
  const c = document.createElement("canvas"); c.width = 128; c.height = 64
  const g = c.getContext("2d")!
  const gr = g.createRadialGradient(64, 32, 2, 64, 32, 62)
  gr.addColorStop(0, "rgba(205,235,230,0.9)"); gr.addColorStop(0.5, "rgba(190,225,222,0.4)"); gr.addColorStop(1, "rgba(190,225,222,0)")
  g.save(); g.scale(1, 0.5); g.translate(0, 32); g.fillStyle = gr; g.fillRect(0, -32, 128, 128); g.restore()
  return (mistCv = c)
}
const streaks = new Map<string, HTMLCanvasElement>()
function streak(color: string) {
  let c = streaks.get(color)
  if (!c) {
    c = document.createElement("canvas"); c.width = 10; c.height = 36
    const g = c.getContext("2d")!
    const gr = g.createLinearGradient(0, 0, 0, 36)
    gr.addColorStop(0, `rgba(${color},0.55)`); gr.addColorStop(1, `rgba(${color},0)`)
    g.fillStyle = gr; g.fillRect(3, 0, 4, 36)
    streaks.set(color, c)
  }
  return c
}

export function drawWeather(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, now: number, night: number, lights: Light[]) {
  const W = weather
  const cx = camX, cy = camY
  // wet ground: a faint cool darkening, light streaks under lamps, and puddle rings
  if (W.wet > 0.02) {
    ctx.fillStyle = `rgba(14,22,52,${0.1 * W.wet})`
    ctx.fillRect(0, 0, vw, vh)
    if (night > 0.3) {
      ctx.globalCompositeOperation = "lighter"
      for (const l of lights) {
        const x = Math.round(l.x - cx), y = Math.round(l.y - cy)
        if (x < -20 || x > vw + 20 || y < -40 || y > vh + 10) continue
        ctx.globalAlpha = W.wet * night * 0.55 * (0.8 + 0.2 * Math.sin(now * 3 + l.x))
        ctx.drawImage(streak(l.color), x - 5, y + 6, 10, 36)
      }
      ctx.globalCompositeOperation = "source-over"
    }
    ctx.globalAlpha = 1
  }
  if (W.rain > 0.02) {
    ctx.strokeStyle = "rgba(205,225,245,0.7)"
    for (let q = 0; q < CAP.ripples; q++) {
      const t = R.t[q]
      if (t >= 1) continue
      ctx.globalAlpha = (1 - t) * 0.7
      ctx.beginPath(); ctx.ellipse(Math.round(R.x[q] - cx), Math.round(R.y[q] - cy), 1 + t * 5, 0.5 + t * 2, 0, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  // rain
  let o = kindOffset(0), n = P.live[0]
  if (n) {
    ctx.fillStyle = night > 0.5 ? "rgba(190,205,240,0.85)" : "rgba(210,228,246,0.9)"
    for (let j = 0; j < n; j++) { const i = o + j; ctx.fillRect(Math.round(P.x[i] - cx), Math.round(P.y[i] - P.h[i] - cy), 1, 4) }
  }
  // petals
  o = kindOffset(1); n = P.live[1]
  for (let j = 0; j < n; j++) {
    const i = o + j
    ctx.fillStyle = P.s[i] < 0.5 ? "#ffc4d8" : P.s[i] < 0.8 ? "#ffe6ef" : "#ff9fc0"
    ctx.fillRect(Math.round(P.x[i] - cx), Math.round(P.y[i] - P.h[i] - cy), 2, (now * 6 + P.s[i] * 9) % 2 > 1 ? 2 : 1)
  }
  // sand
  o = kindOffset(2); n = P.live[2]
  if (n) {
    ctx.fillStyle = "rgba(236,200,140,0.85)"
    for (let j = 0; j < n; j++) { const i = o + j; ctx.fillRect(Math.round(P.x[i] - cx), Math.round(P.y[i] - P.h[i] - cy), P.s[i] > 0.6 ? 3 : 2, 1) }
    ctx.fillStyle = `rgba(226,184,120,${0.07 * W.sand})`
    ctx.fillRect(0, 0, vw, vh)
  }
  // motes
  o = kindOffset(3); n = P.live[3]
  for (let j = 0; j < n; j++) {
    const i = o + j
    ctx.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(now * 1.3 + P.s[i] * 50))) * 0.85
    ctx.fillStyle = P.s[i] < 0.5 ? "#9ff0d0" : "#c7b3ff"
    ctx.fillRect(Math.round(P.x[i] - cx), Math.round(P.y[i] - P.h[i] - cy), 1, 1)
  }
  ctx.globalAlpha = 1
  // fog banks
  if (W.fog > 0.02) {
    const m = mist()
    ctx.globalAlpha = 0.5 * W.fog
    for (let i = 0; i < CAP.mist; i++) {
      const w = vw * 0.9 * MIST.r[i], h = vh * 0.34 * MIST.r[i]
      ctx.drawImage(m, Math.round((MIST.x[i] - 0.2) * vw * 1.25 - w / 2), Math.round(MIST.y[i] * vh - h / 2), Math.round(w), Math.round(h))
    }
    ctx.globalAlpha = 1
  }
  // midday heat shimmer: rows of the frame wobble sideways by a pixel, plus a warm haze
  if (W.shimmer > 0.05) {
    const src = ctx.canvas
    for (let y = 0; y < vh * 0.72; y += 3) {
      const dx = Math.round(Math.sin(now * 2.4 + y * 0.33) * 1.2 * W.shimmer)
      if (dx) ctx.drawImage(src, 0, y, vw, 2, dx, y, vw, 2)
    }
    ctx.fillStyle = `rgba(255,228,170,${0.05 * W.shimmer})`
    ctx.fillRect(0, 0, vw, vh)
  }
}
