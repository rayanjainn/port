"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { playSound } from "@/lib/audio"
import { GAMES, Overlay, submitScore } from "./Arcade"

const COLS = 24, ROWS = 16, CELL = 20
type P = { x: number; y: number }

export default function Serpent() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"ready" | "play" | "over">("ready")
  const [score, setScore] = useState(0)
  const [record, setRecord] = useState(false)
  const g = useRef({ snake: [] as P[], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 0, y: 0, gold: false }, acc: 0, step: 0.12, score: 0, sparks: [] as { x: number; y: number; vx: number; vy: number; l: number; c: string }[] })
  const color = GAMES.serpent.color

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
      // draw
      ctx.fillStyle = "#3d5a22"; ctx.fillRect(0, 0, cv.width, cv.height)
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#4a6b2a" : "#456427"
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
      }
      // food
      const f = s.food, pulse = 1 + Math.sin(t / 150) * 0.12
      const fx = f.x * CELL + 10, fy = f.y * CELL + 10
      const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, 18)
      grd.addColorStop(0, f.gold ? "rgba(255,215,106,.55)" : "rgba(255,90,130,.45)"); grd.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = grd; ctx.fillRect(fx - 18, fy - 18, 36, 36)
      ctx.fillStyle = f.gold ? "#ffd76a" : "#ff4d6d"
      const r = 6 * pulse
      ctx.fillRect(fx - r, fy - r + 1, r * 2, r * 2)
      ctx.fillStyle = "#6bd36b"; ctx.fillRect(fx - 1, fy - r - 3, 3, 4)
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(fx - r + 2, fy - r + 3, 3, 3)
      // snake
      s.snake.forEach((p, i) => {
        const k = i / Math.max(1, s.snake.length - 1)
        const x = p.x * CELL, y = p.y * CELL
        ctx.fillStyle = `rgb(${Math.round(255 - 40 * k)},${Math.round(215 - 70 * k)},${Math.round(106 - 50 * k)})`
        ctx.shadowColor = "#1d1006"; ctx.shadowBlur = 0
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4)
        ctx.strokeStyle = "#1d1006"; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4)
        ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x + 3, y + 3, CELL - 6, 3)
        if (i === 0) {
          ctx.fillStyle = "#1d1006"
          const ex = s.dir.x, ey = s.dir.y
          const cx = x + 10 + ex * 4, cy = y + 10 + ey * 4
          ctx.fillRect(cx - 4 * Math.abs(ey) - 2 + (ex ? 0 : 0), cy - 4 * Math.abs(ex) - 2, 3, 3)
          ctx.fillRect(cx + 4 * Math.abs(ey) - 1, cy + 4 * Math.abs(ex) - 1, 3, 3)
        }
      })
      // sparks
      s.sparks.forEach((p) => { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.globalAlpha = Math.max(0, p.l * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3) })
      ctx.globalAlpha = 1
      s.sparks = s.sparks.filter((p) => p.l > 0)
      // HUD
      ctx.font = "12px var(--ff-pixel), monospace"
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state, color])

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={ref} width={COLS * CELL} height={ROWS * CELL} style={{ width: "100%", display: "block", touchAction: "none" }} />
      <div style={{ position: "absolute", top: 10, left: 12, fontFamily: "var(--font-pixel)", fontSize: 11, color: "#fff4dc", textShadow: "0 2px 0 #1d1006" }}>SCORE {score}</div>
      {state === "ready" && <Overlay title="SERPENT" sub="Grow as long as you can" cta="▶ START" onStart={start} color={color} />}
      {state === "over" && <Overlay title={record ? "NEW HIGH SCORE!" : "GAME OVER"} sub={`You scored ${score}`} cta="↻ PLAY AGAIN" onStart={start} color={color} />}
    </div>
  )
}
