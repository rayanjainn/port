"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { playSound } from "@/lib/audio"
import { monsterSheet } from "@/lib/na"
import { GAMES, Overlay, submitScore } from "./Arcade"

type Kind = "slime" | "gold" | "skull"
interface Hole { kind: Kind | null; until: number; bonked: number }
const DURATION = 30

export default function Slimes() {
  const [holes, setHoles] = useState<Hole[]>(() => Array.from({ length: 9 }, () => ({ kind: null, until: 0, bonked: 0 })))
  const [mode, setMode] = useState<"ready" | "play" | "over">("ready")
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(DURATION)
  const [record, setRecord] = useState(false)
  const [pops, setPops] = useState<{ id: number; i: number; txt: string; col: string }[]>([])
  const scoreRef = useRef(0)
  const color = GAMES.slimes.color

  const start = useCallback(() => {
    scoreRef.current = 0
    setScore(0); setLeft(DURATION); setRecord(false)
    setHoles(Array.from({ length: 9 }, () => ({ kind: null, until: 0, bonked: 0 })))
    setMode("play")
    playSound("bong")
  }, [])

  // spawner + timer
  useEffect(() => {
    if (mode !== "play") return
    const t0 = performance.now()
    const iv = setInterval(() => {
      const now = performance.now()
      const elapsed = (now - t0) / 1000
      const remaining = Math.max(0, DURATION - elapsed)
      setLeft(Math.ceil(remaining))
      if (remaining <= 0) {
        clearInterval(iv)
        setMode("over")
        playSound("gameover")
        const better = submitScore("slimes", scoreRef.current)
        window.dispatchEvent(new Event("arcade-score"))
        setRecord(better && scoreRef.current > 0)
        return
      }
      const rate = 0.28 + elapsed / DURATION * 0.35
      setHoles((hs) => hs.map((h) => {
        if (h.kind && now > h.until) return { kind: null, until: 0, bonked: 0 }
        if (!h.kind && Math.random() < rate * 0.22) {
          const r = Math.random()
          const kind: Kind = r < 0.1 ? "gold" : r < 0.24 ? "skull" : "slime"
          return { kind, until: now + Math.max(520, 1300 - elapsed * 22), bonked: 0 }
        }
        return h
      }))
    }, 100)
    return () => clearInterval(iv)
  }, [mode])

  const bonk = useCallback((i: number) => {
    if (mode !== "play") return
    setHoles((hs) => {
      const h = hs[i]
      if (!h.kind || h.bonked) return hs
      const pts = h.kind === "gold" ? 5 : h.kind === "skull" ? -3 : 1
      scoreRef.current = Math.max(0, scoreRef.current + pts)
      setScore(scoreRef.current)
      playSound(h.kind === "skull" ? "error" : h.kind === "gold" ? "bonus" : "hit")
      const id = Math.random()
      setPops((p) => [...p, { id, i, txt: pts > 0 ? `+${pts}` : `${pts}`, col: pts > 0 ? (h.kind === "gold" ? "#ffd76a" : "#9cff9c") : "#ff6a6a" }])
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 700)
      const next = hs.slice()
      next[i] = { ...h, bonked: performance.now(), until: performance.now() + 220 }
      return next
    })
  }, [mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 9) { e.stopImmediatePropagation(); bonk(n - 1) } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [bonk])

  return (
    <div style={{ position: "relative", aspectRatio: "3 / 2", background: "radial-gradient(ellipse at 50% 30%, #3a2a1a, #140c06 75%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 12, left: 14, fontFamily: "var(--font-pixel)", fontSize: 12, color: "#fff4dc", textShadow: "0 2px 0 #1d1006" }}>SCORE {score}</div>
      <div style={{ position: "absolute", top: 12, right: 14, fontFamily: "var(--font-pixel)", fontSize: 12, color: left <= 5 ? "#ff6a6a" : "#fff" }}>⏱ {left}s</div>
      <div style={{ position: "absolute", top: 34, left: 14, right: 14, height: 4, background: "rgba(255,255,255,.1)", borderRadius: 4 }}>
        <div style={{ height: "100%", width: `${(left / DURATION) * 100}%`, background: color, borderRadius: 4, transition: "width .1s linear", boxShadow: `0 0 8px ${color}` }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(10px, 2.4vw, 22px)", width: "min(78%, 420px)", marginTop: 26 }}>
        {holes.map((h, i) => (
          <button key={i} onPointerDown={() => bonk(i)} aria-label={`Hole ${i + 1}`} style={{ position: "relative", aspectRatio: "1.25", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "6%", height: "38%", borderRadius: "50%", background: "radial-gradient(ellipse at 50% 40%, #050302, #2b1a0c 70%)", boxShadow: "inset 0 6px 10px rgba(0,0,0,.8), 0 2px 0 #5a3a1c" }} />
            <div style={{
              position: "absolute", left: "50%", bottom: "16%", width: "62%", aspectRatio: "1", transform: `translateX(-50%) translateY(${h.kind ? (h.bonked ? "20%" : "0") : "70%"}) scaleY(${h.bonked ? 0.6 : 1})`,
              opacity: h.kind ? 1 : 0, transition: "transform .12s cubic-bezier(.2,1.6,.4,1), opacity .1s",
              backgroundImage: `url(${monsterSheet(h.kind === "skull" ? "Skull" : "Slime")})`, backgroundSize: "400% 400%", backgroundPosition: "0 0",
              imageRendering: "pixelated", filter: h.kind === "gold" ? "sepia(1) saturate(4) hue-rotate(5deg) brightness(1.3) drop-shadow(0 0 8px #ffd76a)" : "drop-shadow(0 3px 0 rgba(0,0,0,.4))",
              clipPath: "inset(0 0 22% 0)",
            }} />
            <span style={{ position: "absolute", top: 2, left: 4, fontFamily: "var(--font-pixel)", fontSize: 7, color: "rgba(255,255,255,.3)" }}>{i + 1}</span>
            {pops.filter((p) => p.i === i).map((p) => (
              <span key={p.id} className="score-pop" style={{ position: "absolute", left: "50%", top: "10%", fontFamily: "var(--font-pixel)", fontSize: 14, color: p.col, textShadow: "0 2px 0 #000" }}>{p.txt}</span>
            ))}
          </button>
        ))}
      </div>
      {mode === "ready" && <Overlay title="SLIME SMASH" sub="Gold = +5 · Skulls = -3" cta="▶ START" onStart={start} color={color} />}
      {mode === "over" && <Overlay title={record ? "NEW HIGH SCORE!" : "TIME'S UP!"} sub={`You smashed ${score} points of slime`} cta="↻ PLAY AGAIN" onStart={start} color={color} />}
    </div>
  )
}
