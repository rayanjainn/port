"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { Howl } from "howler"
import { useGameStore } from "@/lib/store"
import { GAMES, Overlay, submitScore } from "./Arcade"

// four glowing rune orbs, each with its own tone
const RUNES = [
  { col: "#5ce1ff", glow: "92,225,255", rate: 0.8, key: "1", sym: "ᚠ" },
  { col: "#e6e1ff", glow: "220,215,255", rate: 1.0, key: "2", sym: "ᚱ" },
  { col: "#ff6a50", glow: "255,106,80", rate: 1.2, key: "3", sym: "ᛟ" },
  { col: "#ffbe55", glow: "255,190,85", rate: 1.45, key: "4", sym: "ᛉ" },
]
let tone: Howl | null = null
function chime(rate: number) {
  if (typeof window === "undefined" || !useGameStore.getState().sfxEnabled) return
  tone ??= new Howl({ src: ["/na/sfx/magic1.wav"], volume: 0.35 })
  const id = tone.play()
  tone.rate(rate, id)
}

export default function Runes() {
  const [seq, setSeq] = useState<number[]>([])
  const [idx, setIdx] = useState(0)
  const [lit, setLit] = useState<number | null>(null)
  const [mode, setMode] = useState<"ready" | "show" | "input" | "over">("ready")
  const [record, setRecord] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const color = GAMES.runes.color

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const play = useCallback((s: number[]) => {
    setMode("show"); setIdx(0)
    const gap = Math.max(260, 620 - s.length * 30)
    s.forEach((r, i) => {
      timers.current.push(setTimeout(() => { setLit(r); chime(RUNES[r].rate) }, 500 + i * gap))
      timers.current.push(setTimeout(() => setLit(null), 500 + i * gap + gap * 0.6))
    })
    timers.current.push(setTimeout(() => setMode("input"), 500 + s.length * gap))
  }, [])

  const start = useCallback(() => {
    clear()
    const s = [Math.floor(Math.random() * 4)]
    setSeq(s); setRecord(false)
    play(s)
  }, [play])

  const press = useCallback((r: number) => {
    if (mode !== "input") return
    setLit(r); chime(RUNES[r].rate)
    timers.current.push(setTimeout(() => setLit(null), 180))
    if (seq[idx] !== r) {
      const score = seq.length - 1
      const better = submitScore("runes", score)
      window.dispatchEvent(new Event("arcade-score"))
      setRecord(better && score > 0)
      setMode("over")
      return
    }
    if (idx + 1 === seq.length) {
      const next = [...seq, Math.floor(Math.random() * 4)]
      setSeq(next)
      timers.current.push(setTimeout(() => play(next), 500))
      setMode("show")
    } else setIdx(idx + 1)
  }, [mode, seq, idx, play])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = RUNES.findIndex((r) => r.key === e.key)
      if (i >= 0) { e.stopImmediatePropagation(); press(i) }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [press])
  useEffect(() => () => clear(), [])

  const round = Math.max(0, seq.length - (mode === "over" ? 1 : 0))
  return (
    <div style={{ position: "relative", aspectRatio: "3 / 2", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 50%, #3a2a4a, #1a120a 75%)" }}>
      <div style={{ position: "absolute", top: 12, left: 14, fontFamily: "var(--font-pixel)", fontSize: 12, color: "#fff4dc", textShadow: "0 2px 0 #1d1006" }}>ROUND {round}</div>
      <div style={{ position: "absolute", top: 12, right: 14, fontFamily: "var(--font-pixel)", fontSize: 9, color: mode === "input" ? "#9cff9c" : "rgba(255,255,255,.6)" }}>{mode === "input" ? "YOUR TURN" : mode === "show" ? "WATCH..." : ""}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: "clamp(14px, 3vw, 28px)", transform: "rotate(45deg)" }}>
        {RUNES.map((r, i) => (
          <button key={i} onClick={() => press(i)} aria-label={`Rune ${i + 1}`} style={{
            width: "clamp(70px, 12vw, 110px)", height: "clamp(70px, 12vw, 110px)", borderRadius: 18, cursor: mode === "input" ? "pointer" : "default",
            border: `3px solid ${r.col}`, transform: lit === i ? "scale(1.08)" : "none", transition: "transform .1s, box-shadow .1s, background .1s",
            background: lit === i ? `radial-gradient(circle, #fff, ${r.col} 60%)` : `radial-gradient(circle, rgba(${r.glow},.25), rgba(${r.glow},.06) 70%)`,
            boxShadow: lit === i ? `0 0 40px ${r.col}, 0 0 80px rgba(${r.glow},.6)` : `0 0 12px rgba(${r.glow},.3)`,
          }}>
            <span style={{ display: "block", transform: "rotate(-45deg)", fontSize: "clamp(26px, 4vw, 40px)", color: lit === i ? "#0b0718" : r.col, textShadow: lit === i ? "none" : `0 0 10px ${r.col}` }}>{r.sym}</span>
          </button>
        ))}
      </div>
      {mode === "ready" && <Overlay title="RUNE RECALL" sub="Watch the runes, then repeat them" cta="▶ START" onStart={start} color={color} />}
      {mode === "over" && <Overlay title={record ? "NEW HIGH SCORE!" : "THE RUNES FADE"} sub={`You recalled ${round} rune${round === 1 ? "" : "s"}`} cta="↻ TRY AGAIN" onStart={start} color={color} />}
    </div>
  )
}
