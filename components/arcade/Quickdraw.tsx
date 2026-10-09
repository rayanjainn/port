"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { playSound } from "@/lib/audio"
import { charFace, CHARS } from "@/lib/na"
import { GAMES, Overlay, submitScore } from "./Arcade"

type Mode = "ready" | "wait" | "draw" | "win" | "lose" | "foul"

export default function Quickdraw() {
  const [mode, setMode] = useState<Mode>("ready")
  const [ms, setMs] = useState<number | null>(null)
  const [cpu, setCpu] = useState(0)
  const [streak, setStreak] = useState(0)
  const [record, setRecord] = useState(false)
  const t0 = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const color = GAMES.quickdraw.color

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const start = useCallback(() => {
    clear()
    setMode("wait"); setMs(null); setRecord(false)
    const delay = 1400 + Math.random() * 2600
    const cpuMs = Math.max(190, 360 - streak * 22 + Math.random() * 90)
    setCpu(Math.round(cpuMs))
    timers.current.push(setTimeout(() => {
      t0.current = performance.now(); setMode("draw"); playSound("jump")
      timers.current.push(setTimeout(() => {
        setMode((m) => {
          if (m !== "draw") return m
          playSound("hit"); setStreak(0)
          return "lose"
        })
      }, cpuMs))
    }, delay))
  }, [streak])

  const strike = useCallback(() => {
    if (mode === "wait") { clear(); setMode("foul"); playSound("error"); setStreak(0); return }
    if (mode !== "draw") return
    clear()
    const t = Math.round(performance.now() - t0.current)
    setMs(t)
    playSound("sword")
    setMode("win")
    setStreak((s) => s + 1)
    const better = submitScore("quickdraw", t)
    window.dispatchEvent(new Event("arcade-score"))
    setRecord(better)
  }, [mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.key === " " || e.key === "Enter") && (mode === "wait" || mode === "draw")) { e.preventDefault(); e.stopImmediatePropagation(); strike() } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [strike, mode])
  useEffect(() => () => clear(), [])

  const flash = mode === "draw"
  return (
    <div onPointerDown={() => (mode === "wait" || mode === "draw") && strike()} style={{
      position: "relative", aspectRatio: "3 / 2", overflow: "hidden", userSelect: "none", cursor: mode === "wait" || mode === "draw" ? "crosshair" : "default",
      background: flash ? "linear-gradient(180deg, #ffefe0, #ffb08a)" : "linear-gradient(180deg, #2a1240 0%, #6b2a4a 55%, #e0704a 100%)",
      transition: "background .08s",
    }}>
      {/* sun + ground */}
      <div style={{ position: "absolute", left: "50%", top: "48%", width: "28%", aspectRatio: "1", transform: "translate(-50%,-50%)", borderRadius: "50%", background: flash ? "#fff" : "#ffcf7a", opacity: 0.85 }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", background: flash ? "#d78a5a" : "#1e0e22" }} />
      {/* duelists */}
      {[{ face: charFace(CHARS.hero), side: "left", name: "YOU" }, { face: charFace(CHARS.smith), side: "right", name: `RONIN · ${cpu}ms` }].map((d) => (
        <div key={d.side} style={{ position: "absolute", bottom: "18%", [d.side]: "8%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          transform: (mode === "win" && d.side === "right") || (mode === "lose" && d.side === "left") ? "rotate(-12deg) translateY(10px)" : "none", transition: "transform .2s",
          filter: (mode === "win" && d.side === "right") || (mode === "lose" && d.side === "left") ? "grayscale(1) brightness(.6)" : "none" } as React.CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.face} alt="" style={{ width: "clamp(70px, 12vw, 120px)", imageRendering: "pixelated", transform: d.side === "right" ? "scaleX(-1)" : "none", border: "4px solid #1d1006", background: "#2a1d4a" }} />
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: 8, color: "#fff", textShadow: "0 2px 0 #000" }}>{d.name}</span>
        </div>
      ))}
      {/* center signal */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "16%", textAlign: "center" }}>
        {mode === "wait" && <div style={{ fontFamily: "var(--font-pixel)", fontSize: "clamp(14px, 2.4vw, 22px)", color: "#ffe7b0", letterSpacing: 4 }}>WAIT FOR IT...</div>}
        {mode === "draw" && <div style={{ fontFamily: "var(--font-pixel)", fontSize: "clamp(48px, 9vw, 90px)", color: "#c8102e", textShadow: "0 6px 0 #1d1006" }}>!</div>}
      </div>
      <div style={{ position: "absolute", top: 12, left: 14, fontFamily: "var(--font-pixel)", fontSize: 10, color: "#fff", textShadow: "0 2px 0 #000" }}>STREAK {streak}</div>
      {mode === "ready" && <Overlay title="QUICKDRAW" sub="Strike the instant you see the !" cta="▶ DUEL" onStart={start} color={color} />}
      {mode === "win" && <Overlay title={record ? `NEW BEST · ${ms}ms` : `VICTORY · ${ms}ms`} sub={`The ronin needed ${cpu}ms. Next one is faster.`} cta="⚔ NEXT DUEL" onStart={start} color={color} />}
      {mode === "lose" && <Overlay title="TOO SLOW" sub={`The ronin struck in ${cpu}ms`} cta="↻ REMATCH" onStart={start} color={color} />}
      {mode === "foul" && <Overlay title="FOUL!" sub="You drew before the signal" cta="↻ REMATCH" onStart={start} color={color} />}
    </div>
  )
}
