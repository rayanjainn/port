"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { playSound } from "@/lib/audio"
import { GAMES, Overlay, submitScore } from "./Arcade"
import { useWorldTheme } from "@/lib/theme"
import type { Material } from "@/lib/world/worlds"

const COLS = 24, ROWS = 16, CELL = 20
type P = { x: number; y: number }

export default function Serpent() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"ready" | "play" | "over">("ready")
  const [score, setScore] = useState(0)
  const [record, setRecord] = useState(false)
  const g = useRef({ snake: [] as P[], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 0, y: 0, gold: false }, acc: 0, step: 0.12, score: 0, sparks: [] as { x: number; y: number; vx: number; vy: number; l: number; c: string }[] })
  const color = GAMES.serpent.color
  const mat = useWorldTheme().material

  const spawn = () => {
    const s = g.current
    let f: P
    do f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
    while (s.snake.some((p) => p.x === f.x && p.y === f.y))
    s.food = { ...f, gold: Math.random() < 0.15 }
  }

  const start = useCallback(() => {
    const s = g.current
    s.snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]
    s.dir = { x: 1, y: 0 }; s.next = { x: 1, y: 0 }; s.acc = 0; s.step = 0.12; s.score = 0; s.sparks = []
    spawn()
    setScore(0); setRecord(false); setState("play")
    playSound("bong")
  }, [])

  // input
  useEffect(() => {
    const turn = (x: number, y: number) => { const s = g.current; if (s.dir.x === -x && s.dir.y === -y) return; s.next = { x, y } }
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const map: Record<string, [number, number]> = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }
      if (map[k]) { e.preventDefault(); e.stopImmediatePropagation(); turn(...map[k]) }
    }
    let t0: { x: number; y: number } | null = null
    const ts = (e: TouchEvent) => { t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    const te = (e: TouchEvent) => {
      if (!t0) return
      const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) { if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy)) }
      t0 = null
    }
    window.addEventListener("keydown", onKey, true)
    const cv = ref.current
    cv?.addEventListener("touchstart", ts, { passive: true })
    cv?.addEventListener("touchend", te)
    return () => { window.removeEventListener("keydown", onKey, true); cv?.removeEventListener("touchstart", ts); cv?.removeEventListener("touchend", te) }
  }, [])

  // loop
  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext("2d")!
    let raf = 0, last = performance.now()
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (t - last) / 1000); last = t
      const s = g.current
      if (state === "play") {
        s.acc += dt
        while (s.acc >= s.step) {
          s.acc -= s.step
          s.dir = s.next
          const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y }
          if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || s.snake.some((p) => p.x === head.x && p.y === head.y)) {
            playSound("gameover")
            const better = submitScore("serpent", s.score)
            window.dispatchEvent(new Event("arcade-score"))
            setRecord(better && s.score > 0)
            setState("over")
            return
          }
          s.snake.unshift(head)
          if (head.x === s.food.x && head.y === s.food.y) {
            const pts = s.food.gold ? 5 : 1
            s.score += pts
            setScore(s.score)
            playSound(s.food.gold ? "bonus" : "coin")
            for (let i = 0; i < 14; i++) s.sparks.push({ x: head.x * CELL + 10, y: head.y * CELL + 10, vx: (Math.random() - 0.5) * 180, vy: (Math.random() - 0.5) * 180, l: 0.5, c: s.food.gold ? "#ffd76a" : "#ff6a8a" })
            s.step = Math.max(0.055, s.step * 0.975)
            spawn()
          } else s.snake.pop()
        }
      }
      // draw: each world has its own board, food and serpent
      drawBoard(ctx, mat, s, t, cv.width, cv.height, dt)
      // sparks
      s.sparks.forEach((p) => { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.globalAlpha = Math.max(0, p.l * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3) })
      ctx.globalAlpha = 1
      s.sparks = s.sparks.filter((p) => p.l > 0)
      // HUD
      ctx.font = "12px var(--ff-pixel), monospace"
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state, color, mat])

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={ref} width={COLS * CELL} height={ROWS * CELL} style={{ width: "100%", display: "block", touchAction: "none" }} />
      <div className="arc-hud arc-hud--l">SCORE {score}</div>
      {state === "ready" && <Overlay title="SERPENT" sub="Grow as long as you can" cta="▶ START" onStart={start} color={color} />}
      {state === "over" && <Overlay title={record ? "NEW HIGH SCORE!" : "GAME OVER"} sub={`You scored ${score}`} cta="↻ PLAY AGAIN" onStart={start} color={color} />}
    </div>
  )
}

type SerpentState = { snake: P[]; dir: P; food: { x: number; y: number; gold: boolean }; sparks: unknown[] }

/** the board, food and serpent, drawn in the material of the current world */
function drawBoard(ctx: CanvasRenderingContext2D, mat: Material, s: SerpentState, t: number, W: number, H: number, dt: number) {
  void dt
  const f = s.food, pulse = 1 + Math.sin(t / 150) * 0.12
  const fx = f.x * CELL + 10, fy = f.y * CELL + 10
  // ── board
  if (mat === "neon") {
    ctx.fillStyle = "#090720"; ctx.fillRect(0, 0, W, H)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? "#0d0a2a" : "#0b0925"; ctx.fillRect(x * CELL, y * CELL, CELL, CELL) }
    ctx.strokeStyle = "rgba(93,230,255,.16)"; ctx.lineWidth = 1
    ctx.beginPath(); for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * CELL + .5, 0); ctx.lineTo(x * CELL + .5, H) } for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * CELL + .5); ctx.lineTo(W, y * CELL + .5) } ctx.stroke()
    ctx.strokeStyle = "rgba(255,79,163,.4)"; ctx.beginPath(); for (let x = 0; x <= COLS; x += 6) { ctx.moveTo(x * CELL + .5, 0); ctx.lineTo(x * CELL + .5, H) } for (let y = 0; y <= ROWS; y += 4) { ctx.moveTo(0, y * CELL + .5); ctx.lineTo(W, y * CELL + .5) } ctx.stroke()
    ctx.strokeStyle = "#5de6ff"; ctx.lineWidth = 2; ctx.shadowColor = "#5de6ff"; ctx.shadowBlur = 10; ctx.strokeRect(1, 1, W - 2, H - 2); ctx.shadowBlur = 0
  } else if (mat === "sandstone") {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? "#e8c47c" : "#e0b96e"; ctx.fillRect(x * CELL, y * CELL, CELL, CELL) }
    ctx.fillStyle = "rgba(160,100,30,.22)"
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const h = (x * 7 + y * 13) % 11; if (h < 3) ctx.fillRect(x * CELL + 3 + h * 3, y * CELL + 6 + h, 8, 1); if (h === 5) ctx.fillRect(x * CELL + 12, y * CELL + 14, 2, 2) }
    ctx.strokeStyle = "#8f6a35"; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, W - 3, H - 3)
  } else if (mat === "spectral") {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? "#2d4045" : "#283a3f"; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x * CELL, y * CELL + CELL - 1, CELL, 1); ctx.fillRect(x * CELL + CELL - 1, y * CELL, 1, CELL) }
    ctx.fillStyle = "rgba(63,122,90,.45)"
    for (let i = 0; i < 26; i++) { const x = (i * 97) % COLS, y = (i * 53) % ROWS; ctx.fillRect(x * CELL + (i % 3) * 5, y * CELL + (i % 4) * 4, 7, 3) }
    for (let i = 0; i < 3; i++) { ctx.fillStyle = "rgba(190,230,225,.07)"; const mx = ((t / 40 + i * 190) % (W + 200)) - 100; ctx.beginPath(); ctx.ellipse(mx, 60 + i * 110, 120, 22, 0, 0, Math.PI * 2); ctx.fill() }
    ctx.strokeStyle = "rgba(95,208,160,.6)"; ctx.lineWidth = 2; ctx.shadowColor = "#5fd0a0"; ctx.shadowBlur = 8; ctx.strokeRect(1, 1, W - 2, H - 2); ctx.shadowBlur = 0
  } else {
    ctx.fillStyle = "#3d5a22"; ctx.fillRect(0, 0, W, H)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? "#4a6b2a" : "#456427"; ctx.fillRect(x * CELL, y * CELL, CELL, CELL) }
  }
  // ── food
  const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, 18)
  const glowCol = mat === "neon" ? (f.gold ? "rgba(255,79,163,.6)" : "rgba(93,230,255,.55)") : mat === "spectral" ? (f.gold ? "rgba(255,170,80,.55)" : "rgba(170,140,255,.6)") : (f.gold ? "rgba(255,215,106,.55)" : mat === "sandstone" ? "rgba(120,60,20,.3)" : "rgba(255,90,130,.45)")
  grd.addColorStop(0, glowCol); grd.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = grd; ctx.fillRect(fx - 18, fy - 18, 36, 36)
  const r = 6 * pulse
  if (mat === "neon") {
    ctx.shadowColor = f.gold ? "#ff4fa3" : "#5de6ff"; ctx.shadowBlur = 12; ctx.fillStyle = f.gold ? "#ff4fa3" : "#5de6ff"
    ctx.beginPath(); ctx.moveTo(fx, fy - r - 2); ctx.lineTo(fx + r + 2, fy); ctx.lineTo(fx, fy + r + 2); ctx.lineTo(fx - r - 2, fy); ctx.closePath(); ctx.fill()
    ctx.shadowBlur = 0; ctx.fillStyle = "#fff"; ctx.fillRect(fx - 1, fy - 1, 3, 3)
  } else if (mat === "sandstone") {
    if (f.gold) { ctx.fillStyle = "#c4572b"; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.fillRect(fx + Math.cos(a) * (r + 3) - 1, fy + Math.sin(a) * (r + 3) - 1, 3, 3) } ctx.fillStyle = "#4a2c14"; ctx.beginPath(); ctx.arc(fx, fy, r + 1.5, 0, 7); ctx.fill(); ctx.fillStyle = "#ffd76a"; ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.fill(); ctx.fillStyle = "#fff1b8"; ctx.fillRect(fx - 3, fy - 3, 3, 3) }
    else { ctx.fillStyle = "#3a1c0c"; ctx.beginPath(); ctx.ellipse(fx, fy + 1, r + 1.5, r - 1, -0.5, 0, 7); ctx.fill(); ctx.fillStyle = "#8a4a22"; ctx.beginPath(); ctx.ellipse(fx, fy + 1, r, r - 2.5, -0.5, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(255,220,170,.6)"; ctx.fillRect(fx - 3, fy - 2, 3, 2) }
  } else if (mat === "spectral") {
    ctx.shadowColor = f.gold ? "#ff9a3c" : "#b79bff"; ctx.shadowBlur = 14
    ctx.fillStyle = f.gold ? "#ffb347" : "#c3adff"
    if (f.gold) { ctx.beginPath(); ctx.moveTo(fx, fy - r - 4); ctx.quadraticCurveTo(fx + r + 2, fy, fx, fy + r); ctx.quadraticCurveTo(fx - r - 2, fy, fx, fy - r - 4); ctx.fill() }
    else { ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.fill() }
    ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(fx - 2, fy - 2, 3, 3)
  } else {
    ctx.fillStyle = f.gold ? "#ffd76a" : "#ff4d6d"
    ctx.fillRect(fx - r, fy - r + 1, r * 2, r * 2)
    ctx.fillStyle = "#6bd36b"; ctx.fillRect(fx - 1, fy - r - 3, 3, 4)
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(fx - r + 2, fy - r + 3, 3, 3)
  }
  // ── serpent
  const n = s.snake.length
  s.snake.forEach((p, i) => {
    const k = i / Math.max(1, n - 1)
    const x = p.x * CELL, y = p.y * CELL
    if (mat === "neon") {
      const c = i === 0 ? "#ffffff" : `rgb(${Math.round(255 - 110 * k)},${Math.round(79 + 60 * k)},${Math.round(163 + 80 * k)})`
      ctx.shadowColor = i === 0 ? "#5de6ff" : "#ff4fa3"; ctx.shadowBlur = 10
      ctx.fillStyle = c; ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6); ctx.shadowBlur = 0
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(x + 4, y + 4, CELL - 8, 2)
    } else if (mat === "sandstone") {
      ctx.fillStyle = "#1a0d04"; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
      ctx.fillStyle = i === 0 ? "#12857f" : i % 2 ? "#2f9a5a" : "#e0a21f"; ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6)
      ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(x + 4, y + 4, CELL - 8, 3)
    } else if (mat === "spectral") {
      ctx.globalAlpha = Math.max(0.18, 0.9 - k * 0.75)
      ctx.shadowColor = "#5fd0a0"; ctx.shadowBlur = 12
      ctx.fillStyle = i === 0 ? "#d8fff0" : `rgb(${Math.round(120 + 60 * k)},${Math.round(230 - 40 * k)},${Math.round(200 + 30 * k)})`
      const wob = Math.round(Math.sin(t / 220 + i * 0.7) * 1.5)
      ctx.fillRect(x + 3 + wob, y + 3, CELL - 6, CELL - 6); ctx.shadowBlur = 0; ctx.globalAlpha = 1
    } else {
      ctx.fillStyle = `rgb(${Math.round(255 - 40 * k)},${Math.round(215 - 70 * k)},${Math.round(106 - 50 * k)})`
      ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4)
      ctx.strokeStyle = "#1d1006"; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4)
      ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x + 3, y + 3, CELL - 6, 3)
    }
    if (i === 0) {
      ctx.fillStyle = mat === "spectral" ? "#7a3bff" : mat === "sandstone" ? "#c4572b" : "#1d1006"
      const ex = s.dir.x, ey = s.dir.y
      const cx = x + 10 + ex * 4, cy = y + 10 + ey * 4
      if (mat === "spectral") { ctx.shadowColor = "#9a7be0"; ctx.shadowBlur = 8 }
      ctx.fillRect(cx - 4 * Math.abs(ey) - 2, cy - 4 * Math.abs(ex) - 2, 3, 3)
      ctx.fillRect(cx + 4 * Math.abs(ey) - 1, cy + 4 * Math.abs(ex) - 1, 3, 3)
      ctx.shadowBlur = 0
    }
  })
}
