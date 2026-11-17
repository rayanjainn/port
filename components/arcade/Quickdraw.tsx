"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { playSound } from "@/lib/audio"
import { charFace, CHARS } from "@/lib/na"
import { GAMES, Overlay, submitScore } from "./Arcade"
import { useWorldTheme } from "@/lib/theme"

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
  const mat = useWorldTheme().material

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
  const names: Record<string, string> = { parchment: "RONIN", neon: "ENFORCER", sandstone: "BANDIT", spectral: "REVENANT" }
  return (
    <div className="qd" data-m={mat} data-flash={flash ? "" : undefined} onPointerDown={() => (mode === "wait" || mode === "draw") && strike()} style={{ cursor: mode === "wait" || mode === "draw" ? "crosshair" : "default" }}>
      <div className="qd-sky" /><div className="qd-orb" /><div className="qd-far" /><div className="qd-ground" />
      <i className="qd-p qd-p1" /><i className="qd-p qd-p2" /><i className="qd-p qd-p3" /><i className="qd-p qd-p4" />
      {/* duelists */}
      {[{ face: charFace(CHARS.hero), side: "left", name: "YOU" }, { face: charFace(CHARS.smith), side: "right", name: `${names[mat]} · ${cpu}ms` }].map((d) => (
        <div key={d.side} className="qd-duelist" style={{ [d.side]: "8%",
          transform: (mode === "win" && d.side === "right") || (mode === "lose" && d.side === "left") ? "rotate(-12deg) translateY(10px)" : "none",
          filter: (mode === "win" && d.side === "right") || (mode === "lose" && d.side === "left") ? "grayscale(1) brightness(.6)" : "none" } as React.CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qd-face" src={d.face} alt="" style={{ transform: d.side === "right" ? "scaleX(-1)" : "none" }} />
          <span className="qd-name">{d.name}</span>
        </div>
      ))}
      {/* center signal */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "16%", textAlign: "center" }}>
        {mode === "wait" && <div className="qd-wait">WAIT FOR IT...</div>}
        {mode === "draw" && <div className="qd-bang">!</div>}
      </div>
      <div className="arc-hud arc-hud--l">STREAK {streak}</div>
      {mode === "ready" && <Overlay title="QUICKDRAW" sub="Strike the instant you see the !" cta="▶ DUEL" onStart={start} color={color} />}
      {mode === "win" && <Overlay title={record ? `NEW BEST · ${ms}ms` : `VICTORY · ${ms}ms`} sub={`The ${names[mat].toLowerCase()} needed ${cpu}ms. Next one is faster.`} cta="⚔ NEXT DUEL" onStart={start} color={color} />}
      {mode === "lose" && <Overlay title="TOO SLOW" sub={`The ${names[mat].toLowerCase()} struck in ${cpu}ms`} cta="↻ REMATCH" onStart={start} color={color} />}
      {mode === "foul" && <Overlay title="FOUL!" sub="You drew before the signal" cta="↻ REMATCH" onStart={start} color={color} />}
    </div>
  )
}
