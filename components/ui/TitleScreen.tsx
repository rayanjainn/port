"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { useContent } from "@/lib/content"
import TitleScene from "./TitleScene"
import { ArrowRight, Play } from "lucide-react"
import { Github } from "@/components/icons"

function useTypewriter(lines: string[]) {
  const [text, setText] = useState("")
  useEffect(() => {
    let li = 0, ci = 0, del = false
    let id: ReturnType<typeof setTimeout>
    const tick = () => {
      const line = lines[li % lines.length]
      if (!del) {
        ci++
        setText(line.slice(0, ci))
        if (ci >= line.length) { del = true; id = setTimeout(tick, 2200); return }
        id = setTimeout(tick, 38 + Math.random() * 40)
      } else {
        ci--
        setText(line.slice(0, ci))
        if (ci <= 0) { del = false; li++; id = setTimeout(tick, 350); return }
        id = setTimeout(tick, 16)
      }
    }
    id = setTimeout(tick, 900)
    return () => clearTimeout(id)
  }, [lines])
  return text
}

export default function TitleScreen() {
  const startGame = useGameStore((s) => s.startGame)
  const c = useContent()
  const mouse = useRef({ x: 0.5, y: 0.5 })
  const [leaving, setLeaving] = useState(false)
  const lines = useMemo(() => [c.profile.title.toLowerCase(), c.profile.tagline.toLowerCase(), c.profile.motto].filter(Boolean), [c.profile.title, c.profile.tagline, c.profile.motto])
  const typed = useTypewriter(lines)
  const [first, ...rest] = c.profile.name.toUpperCase().split(" ")

  const start = () => {
    if (leaving) return
    playSound("bong")
    setLeaving(true)
    setTimeout(startGame, 650)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") start() }
    const onMove = (e: PointerEvent) => { mouse.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointermove", onMove)
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointermove", onMove) }
  })

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, overflow: "hidden", background: "#0c0a26" }}>
      <TitleScene mouse={mouse} />

      {/* soft vignette + scanlines for depth */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(6,4,20,0.55) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.08, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 3px)" }} />

      {/* top bar */}
      <div className="fade-in" style={{
        position: "absolute", top: 0, left: 0, right: 0, padding: "18px clamp(16px, 3vw, 32px)",
        display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 3,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-pixel)", fontSize: 10, color: "#ffe7b0", letterSpacing: 2 }}>
          <span style={{ width: 10, height: 10, background: "#ffd76a", boxShadow: "0 0 12px #ffb347" }} />
          {first}.WORLD
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href={c.socials.github} target="_blank" rel="noreferrer" aria-label="GitHub" style={glassBtn}>
            <Github size={15} />
          </a>
        </div>
      </div>

      {/* hero copy */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 16px 12vh", textAlign: "center",
        transition: "opacity .6s ease, transform .6s ease, filter .6s ease",
        opacity: leaving ? 0 : 1, transform: leaving ? "scale(1.06)" : "none", filter: leaving ? "blur(6px)" : "none",
      }}>
        <div className="rise title-ribbon" style={{
          fontFamily: "var(--font-pixel)", fontSize: "clamp(7px, 1vw, 9px)", letterSpacing: 4, whiteSpace: "nowrap",
          color: "#ffe7b0", padding: "8px 16px", marginBottom: 26,
          background: "linear-gradient(180deg, rgba(200,70,59,.95), rgba(143,47,40,.95))",
          border: "2px solid #f6dcae", boxShadow: "0 4px 0 rgba(0,0,0,0.35)",
        }}>
          ◆ A PLAYABLE PORTFOLIO ◆
        </div>

        <h1 className="rise" style={{
          animationDelay: "80ms",
          margin: 0, fontFamily: "var(--font-pixel)", fontWeight: 400,
          fontSize: "clamp(30px, 7.4vw, 104px)", lineHeight: 1.05, letterSpacing: "0.02em",
          display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.45em",
        }}>
          {[first, rest.join(" ")].filter(Boolean).map((w, i) => (
            <span key={i} style={{
              background: i === 0
                ? "linear-gradient(180deg, #fff6d6 0%, #ffd76a 45%, #ff9f43 100%)"
                : "linear-gradient(180deg, #ffe0f0 0%, #ff9ecf 45%, #c07bff 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              filter: "drop-shadow(0 4px 0 #2a1240) drop-shadow(0 -2px 0 #2a1240) drop-shadow(3px 0 0 #2a1240) drop-shadow(-3px 0 0 #2a1240) drop-shadow(0 12px 18px rgba(20,6,40,.6))",
            }}>{w}</span>
          ))}
        </h1>

        <div className="rise" style={{
          animationDelay: "160ms", marginTop: 26, minHeight: 28,
          fontFamily: "var(--font-vt)", fontSize: "clamp(20px, 2.4vw, 30px)", color: "#ffeccd",
          textShadow: "0 2px 0 #2a1240",
        }}>
          <span style={{ color: "#ff9ecf" }}>❯ </span><span className="caret">{typed}</span>
        </div>

        <div className="rise" style={{ animationDelay: "240ms", display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={start} style={startBtn}
            onMouseEnter={() => playSound("click")}
          >
            <Play size={14} fill="currentColor" /> START ADVENTURE
          </button>
          <Link href="/quick" style={quickBtn} onClick={() => playSound("click")}>
            QUICK VIEW <ArrowRight size={14} />
          </Link>
        </div>

        <div className="rise kb-only" style={{
          animationDelay: "320ms", marginTop: 34, display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center",
          fontFamily: "var(--font-pixel)", fontSize: 7, color: "#e9d9ff", letterSpacing: 1,
        }}>
          <span style={hintRow}><span className="kbd">W</span><span className="kbd">A</span><span className="kbd">S</span><span className="kbd">D</span> MOVE</span>
          <span style={hintRow}><span className="kbd">E</span> ENTER</span>
          <span style={hintRow}><span className="kbd">N</span> DAY / NIGHT</span>
          <span style={hintRow}><span className="kbd">M</span> MAP</span>
        </div>
      </div>

      <div className="blink kb-only" style={{
        position: "absolute", bottom: 22, left: 0, right: 0, textAlign: "center", zIndex: 2,
        fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 3, color: "#ffe7b0",
        opacity: leaving ? 0 : 1,
      }}>
        PRESS ENTER
      </div>

      {/* iris transition into the world */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
        background: "#07051a",
        clipPath: leaving ? "circle(150% at 50% 55%)" : "circle(0% at 50% 55%)",
        transition: "clip-path .65s cubic-bezier(.7,0,.3,1)",
      }} />
    </div>
  )
}

const glassBtn: React.CSSProperties = {
  width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "#ffe7b0", background: "rgba(20,10,40,0.45)", border: "2px solid rgba(255,231,176,0.35)",
  backdropFilter: "blur(6px)",
}

const startBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 10,
  fontFamily: "var(--font-pixel)", fontSize: "clamp(10px, 1.1vw, 12px)", letterSpacing: 2,
  color: "#3a1d08", padding: "18px 26px", cursor: "pointer",
  background: "linear-gradient(180deg, #fff1b8 0%, #ffd76a 40%, #f5a623 100%)",
  border: "3px solid #2a1240",
  boxShadow: "inset 0 -4px 0 rgba(160,80,0,.35), inset 0 3px 0 rgba(255,255,255,.6), 0 6px 0 #2a1240, 0 0 40px rgba(255,190,90,.45)",
}

const quickBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none",
  fontFamily: "var(--font-pixel)", fontSize: "clamp(10px, 1.1vw, 12px)", letterSpacing: 2,
  color: "#fbe9ff", padding: "18px 24px", cursor: "pointer",
  background: "rgba(30, 14, 60, 0.55)", backdropFilter: "blur(8px)",
  border: "3px solid rgba(233, 217, 255, 0.55)",
  boxShadow: "0 6px 0 rgba(42,18,64,.9)",
}

const hintRow: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6 }
