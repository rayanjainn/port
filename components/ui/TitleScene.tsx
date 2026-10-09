"use client"
import { useEffect, useRef } from "react"
import { CHAR_SHEET, composeHero } from "@/lib/hero"

/**
 * Animated dusk landscape rendered at a low internal resolution and scaled up
 * with nearest-neighbour sampling so every element reads as real pixel art.
 */


function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}
function noise1(x: number, seed: number) {
  const i = Math.floor(x), f = x - i
  const a = hash(i + seed * 1000), b = hash(i + 1 + seed * 1000)
  const t = f * f * (3 - 2 * f)
  return a + (b - a) * t
}
function ridge(x: number, seed: number, oct = 4) {
  let v = 0, amp = 1, freq = 1, norm = 0
  for (let o = 0; o < oct; o++) {
    v += noise1(x * freq, seed + o) * amp
    norm += amp; amp *= 0.5; freq *= 2
  }
  return v / norm
}

const SKY = [
  [12, 10, 38], [22, 16, 58], [40, 22, 78], [66, 30, 96], [104, 42, 104],
  [148, 58, 100], [196, 86, 92], [236, 128, 86], [252, 176, 102], [255, 214, 140],
]

export default function TitleScene({ mouse, density = 1 }: { mouse: React.MutableRefObject<{ x: number; y: number }>; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext("2d")!
    let W = 0, H = 0, raf = 0
    let hero: HTMLCanvasElement | null = null
    const sprite = new Image()
    sprite.onload = () => { hero = composeHero(sprite) }
    sprite.src = CHAR_SHEET

    const sky = document.createElement("canvas")
    const resize = () => {
      const cw = canvas.clientWidth || window.innerWidth
      const chh = canvas.clientHeight || window.innerHeight
      const s = Math.max(2, Math.round(chh / (230 * density)))
      W = Math.ceil(cw / s)
      H = Math.ceil(chh / s)
      canvas.width = W
      canvas.height = H
      ctx.imageSmoothingEnabled = false
      // pre-render the dithered sky once per size
      const horizon = Math.floor(H * 0.62)
      sky.width = W; sky.height = H
      const sc = sky.getContext("2d")!
      const img = sc.createImageData(W, H)
      for (let y = 0; y < H; y++) {
        const f = (Math.min(y, horizon) / horizon) * (SKY.length - 1)
        const i = Math.floor(f), frac = f - i
        const a = SKY[i], b = SKY[Math.min(SKY.length - 1, i + 1)]
        for (let x = 0; x < W; x++) {
          const thr = ((x & 1) * 2 + (y & 1)) / 4 + 0.125
          const c = frac > thr ? b : a
          const o = (y * W + x) * 4
          img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255
        }
      }
      sc.putImageData(img, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const stars = Array.from({ length: 140 }, (_, i) => ({
      x: hash(i * 3.1), y: hash(i * 7.7) * 0.55, p: hash(i * 1.9) * 6.28, b: hash(i * 5.3),
    }))
    const flies = Array.from({ length: 26 }, (_, i) => ({
      x: hash(i * 9.1), y: 0.7 + hash(i * 4.4) * 0.28, p: hash(i * 2.2) * 6.28, s: 0.3 + hash(i) * 0.7,
    }))
    const clouds = Array.from({ length: 7 }, (_, i) => ({
      x: hash(i * 13.3), y: 0.12 + hash(i * 3.7) * 0.28, w: 26 + hash(i * 8.1) * 46, sp: 0.6 + hash(i * 2.9) * 1.6,
    }))

    const draw = (tms: number) => {
      const t = tms / 1000
      const mx = (mouse.current.x - 0.5) * 2
      const my = (mouse.current.y - 0.5) * 2

      // ── sky (cached): hard colour bands with ordered dither
      const horizon = Math.floor(H * 0.62)
      ctx.drawImage(sky, 0, 0)

      // stars
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * (1 + s.b * 2) + s.p)
        const y = s.y * horizon
        const fade = 1 - y / (horizon * 0.75)
        if (fade <= 0) continue
        ctx.globalAlpha = Math.max(0, fade) * (0.35 + tw * 0.65)
        ctx.fillStyle = s.b > 0.85 ? "#ffe9a8" : "#ffffff"
        const sx = Math.floor(s.x * W - mx * 2)
        ctx.fillRect(sx, Math.floor(y), 1, 1)
        if (s.b > 0.92 && tw > 0.8) {
          ctx.fillRect(sx - 1, Math.floor(y), 3, 1)
          ctx.fillRect(sx, Math.floor(y) - 1, 1, 3)
        }
      }
      ctx.globalAlpha = 1

      // big setting sun with pixel rings
      const sunX = Math.floor(W * 0.72 - mx * 3), sunY = Math.floor(horizon - H * 0.06 - my * 2)
      const sunR = Math.max(14, Math.floor(H * 0.12))
      for (let r = sunR + 10; r > sunR; r -= 3) {
        ctx.globalAlpha = 0.08
        ctx.fillStyle = "#ffd28a"
        ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = "#ffe7a3"
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#ffcf7a"
      // horizontal stripes cut through the lower half of the sun (retro look)
      for (let k = 0; k < 5; k++) {
        const yy = sunY + 2 + k * Math.max(3, Math.floor(sunR / 5))
        ctx.fillStyle = `rgb(${SKY[7 + (k % 2)].join(",")})`
        ctx.fillRect(sunX - sunR, yy, sunR * 2, Math.max(1, k))
      }

      // clouds
      for (const c of clouds) {
        const cx = ((c.x * (W + 120) + t * c.sp) % (W + 120)) - 60 - mx * 4
        const cy = Math.floor(c.y * horizon)
        const w = Math.floor(c.w)
        ctx.fillStyle = "rgba(255, 196, 160, 0.55)"
        ctx.fillRect(Math.floor(cx), cy, w, 3)
        ctx.fillRect(Math.floor(cx + w * 0.15), cy - 2, Math.floor(w * 0.5), 2)
        ctx.fillRect(Math.floor(cx + w * 0.35), cy - 4, Math.floor(w * 0.3), 2)
        ctx.fillStyle = "rgba(120, 50, 100, 0.45)"
        ctx.fillRect(Math.floor(cx + 2), cy + 3, w - 4, 1)
      }

      // mountain layers
      const layer = (seed: number, base: number, amp: number, scale: number, color: string, par: number, snow = false) => {
        ctx.fillStyle = color
        const off = mx * par
        for (let x = 0; x < W; x++) {
          const h = ridge((x + off) / scale, seed)
          const y = Math.floor(base - h * amp - my * par * 0.5)
          ctx.fillRect(x, y, 1, H - y)
          if (snow && h > 0.68) {
            ctx.fillStyle = "#f3c7c9"
            ctx.fillRect(x, y, 1, Math.floor((h - 0.68) * 30))
            ctx.fillStyle = color
          }
        }
      }
      layer(1, horizon + 4, H * 0.42, 60, "#8a4a86", 2, true)
      layer(2, horizon + 10, H * 0.26, 42, "#5a3170", 4)
      layer(3, horizon + 22, H * 0.18, 30, "#33204f", 7)

      // village silhouette on the near hill
      const vBase = Math.floor(horizon + H * 0.2 - my * 6)
      const vx0 = Math.floor(W * 0.06 - mx * 10)
      ctx.fillStyle = "#1a1030"
      ctx.fillRect(0, vBase, W, H - vBase)
      const k = Math.max(1, Math.min(2.2, H / 110, W / 70))
      const houses = [
        { x: 0, w: 14, h: 10, roof: 7 }, { x: 18, w: 10, h: 8, roof: 6 }, { x: 31, w: 8, h: 26, roof: 9, tower: true },
        { x: 43, w: 16, h: 12, roof: 8 }, { x: 63, w: 11, h: 9, roof: 6 }, { x: 78, w: 14, h: 11, roof: 7 },
        { x: 96, w: 9, h: 7, roof: 5 }, { x: 110, w: 12, h: 9, roof: 6 },
      ].map((q) => ({ ...q, x: Math.round(q.x * k), w: Math.round(q.w * k), h: Math.round(q.h * k), roof: Math.round(q.roof * k) }))
      for (const hs of houses) {
        const x = vx0 + hs.x, top = vBase - hs.h
        ctx.fillStyle = "#1a1030"
        ctx.fillRect(x, top, hs.w, hs.h + 1)
        for (let r = 0; r < hs.roof; r++) {
          const inset = Math.floor((r / hs.roof) * (hs.w / 2 + 1))
          ctx.fillRect(x - 1 + inset, top - r - 1, hs.w + 2 - inset * 2, 1)
        }
        // lit windows flicker softly
        for (let wy = top + 3; wy < vBase - 2; wy += 4) {
          for (let wx = x + 2; wx < x + hs.w - 2; wx += 4) {
            const on = hash(wx * 3 + wy * 7) > 0.35
            if (!on) continue
            const fl = 0.75 + 0.25 * Math.sin(t * 3 + wx + wy)
            ctx.globalAlpha = 0.25 * fl
            ctx.fillStyle = "#ffb347"
            ctx.fillRect(wx - 1, wy - 1, 4, 4)
            ctx.globalAlpha = 1
            ctx.fillStyle = fl > 0.8 ? "#ffe08a" : "#ffc861"
            ctx.fillRect(wx, wy, 2, 2)
          }
        }
        if (hs.tower) {
          ctx.fillStyle = "#c084fc"
          const gl = 0.5 + 0.5 * Math.sin(t * 2)
          ctx.globalAlpha = 0.5 + gl * 0.5
          ctx.fillRect(x + hs.w / 2 - 1, top - hs.roof - 3, 2, 2)
          ctx.globalAlpha = 1
        }
        // chimney smoke
        if (hs.w >= 14) {
          for (let k = 0; k < 6; k++) {
            const p = (t * 0.25 + k / 6) % 1
            ctx.globalAlpha = (1 - p) * 0.35
            ctx.fillStyle = "#c9a3c4"
            const sx = x + hs.w - 4 + Math.sin(p * 6 + hs.x) * 2 + p * 6
            ctx.fillRect(Math.floor(sx), Math.floor(top - hs.roof - p * 18), 2, 2)
          }
          ctx.globalAlpha = 1
        }
      }

      // foreground hill + path
      const fgBase = Math.floor(H * 0.86 - my * 10)
      for (let x = 0; x < W; x++) {
        const h = ridge((x + mx * 16) / 50, 9, 3)
        const y = Math.floor(fgBase - h * H * 0.08)
        ctx.fillStyle = "#120a22"
        ctx.fillRect(x, y, 1, H - y)
        ctx.fillStyle = "#2b1840"
        ctx.fillRect(x, y, 1, 1)
        // grass blades
        if (hash(x * 1.7) > 0.6) {
          const sway = Math.round(Math.sin(t * 2 + x * 0.3) * 0.6)
          ctx.fillStyle = "#24163a"
          ctx.fillRect(x + sway, y - 2, 1, 2)
        }
      }

      // pine silhouettes in the foreground, swaying
      for (let i = 0; i < 9; i++) {
        const side = i < 5 ? 0 : 1
        const px = side === 0 ? Math.floor(hash(i) * W * 0.16 - mx * 20) : Math.floor(W - hash(i) * W * 0.16 - mx * 20)
        const ph = 26 + Math.floor(hash(i * 3.3) * 34)
        const py = H + 2
        const sway = Math.sin(t * 0.9 + i) * 1.2
        ctx.fillStyle = "#0b0616"
        for (let r = 0; r < ph; r++) {
          const w = Math.floor(((r % 9) + 3) * (r / ph) * 0.9 + 1)
          const off = Math.round(sway * (1 - r / ph))
          ctx.fillRect(px - w + off, py - ph + r, w * 2 + 1, 1)
        }
      }

      // the hero walking along the ridge
      if (hero) {
        const walkW = W + 40
        const hx = ((t * 14) % walkW) - 20
        const hy = Math.floor(fgBase - ridge((hx + mx * 16) / 50, 9, 3) * H * 0.08)
        const bob = Math.abs(Math.sin(t * 9)) > 0.5 ? 1 : 0
        ctx.drawImage(hero, Math.floor(hx), hy - 15 - bob)
      }

      // fireflies
      for (const f of flies) {
        const fx = (f.x * W + Math.sin(t * f.s + f.p) * 14 - mx * 12) % W
        const fy = f.y * H + Math.cos(t * f.s * 1.3 + f.p) * 6
        const gl = 0.5 + 0.5 * Math.sin(t * 3 * f.s + f.p)
        ctx.globalAlpha = gl * 0.35
        ctx.fillStyle = "#fff3a0"
        ctx.fillRect(Math.floor(fx) - 1, Math.floor(fy) - 1, 3, 3)
        ctx.globalAlpha = gl
        ctx.fillRect(Math.floor(fx), Math.floor(fy), 1, 1)
      }
      ctx.globalAlpha = 1

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [mouse, density])

  return (
    <canvas
      ref={ref}
      className="pixelated"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  )
}
