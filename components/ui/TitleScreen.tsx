"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { useContent } from "@/lib/content"
import { charSheet, CHARS } from "@/lib/na"
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

const panel: React.CSSProperties = {
  background: "linear-gradient(180deg, #fff8e4 0%, #f1e0b4 100%)",
  border: "4px solid #1d1006",
  boxShadow: "inset 0 0 0 3px #e9c98a, inset 0 0 0 6px #8a5a2c, 0 10px 0 #1d1006, 0 30px 80px rgba(20,10,0,.55)",
}

export default function TitleScreen() {
  const startGame = useGameStore((s) => s.startGame)
  const c = useContent()
  const [leaving, setLeaving] = useState(false)
  const lines = useMemo(() => [c.profile.title.toLowerCase(), c.profile.tagline.toLowerCase(), c.profile.motto].filter(Boolean), [c.profile.title, c.profile.tagline, c.profile.motto])
  const typed = useTypewriter(lines)

  const start = () => {
    if (leaving) return
    playSound("bong")
    setLeaving(true)
    setTimeout(startGame, 650)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") start() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, overflow: "hidden", background: "#4d7a2e" }}>
      {/* the actual village, drifting slowly underneath */}
      <div className="title-map" aria-hidden />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,190,110,.18) 0%, rgba(40,20,10,.15) 45%, rgba(20,10,4,.65) 100%)" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(18,9,2,.6) 100%)" }} />
      {/* drifting petals */}
      <div aria-hidden className="petals">{Array.from({ length: 14 }).map((_, i) => <span key={i} style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${11 + (i % 5) * 2}s` }} />)}</div>

      {/* top bar */}
      <div className="fade-in" style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px clamp(14px, 3vw, 28px)", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 3 }}>
        <div style={{ ...panel, boxShadow: "inset 0 0 0 2px #e9c98a, 0 4px 0 #1d1006", border: "3px solid #1d1006", padding: "8px 12px", fontFamily: "var(--font-pixel)", fontSize: 9, letterSpacing: 2, color: "#3a2412" }}>
          {c.profile.name.split(" ")[0].toUpperCase()}.WORLD
        </div>
        <a href={c.socials.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="parch-btn" style={{ ...panel, border: "3px solid #1d1006", boxShadow: "inset 0 0 0 2px #e9c98a, 0 4px 0 #1d1006", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "#3a2412" }}>
          <Github size={17} />
        </a>
      </div>

      {/* parchment title card */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 14px 40px",
        transition: "opacity .6s ease, transform .6s ease", opacity: leaving ? 0 : 1, transform: leaving ? "scale(1.05)" : "none",
      }}>
        <div className="title-card" style={{ ...panel, position: "relative", width: "min(640px, 100%)", padding: "54px clamp(20px, 5vw, 48px) 34px", textAlign: "center" }}>
          {/* ribbon */}
          <div style={{ position: "absolute", top: -22, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <div style={{ padding: "11px 22px", background: "linear-gradient(180deg, #d9574b, #a8382f)", border: "3px solid #1d1006", boxShadow: "inset 0 0 0 2px #f08a7c, 0 4px 0 #1d1006", fontFamily: "var(--font-pixel)", fontSize: "clamp(7px, 1.4vw, 9px)", letterSpacing: 3, color: "#fff4dc", whiteSpace: "nowrap" }}>
              ◆ A PLAYABLE PORTFOLIO ◆
            </div>
          </div>
          {/* hero + portrait */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 18, marginBottom: 18 }}>
            <div className="hero-walk" style={{ backgroundImage: `url(${charSheet(CHARS.hero)})` }} />
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-pixel)", fontWeight: 400, fontSize: "clamp(26px, 6vw, 54px)", lineHeight: 1.15, color: "#3a2412", textShadow: "0 4px 0 #e2c48a", letterSpacing: "0.02em" }}>
            {c.profile.name.toUpperCase()}
          </h1>
          <div style={{ marginTop: 18, minHeight: 28, fontFamily: "var(--font-body)", fontSize: "clamp(17px, 2.2vw, 22px)", color: "#8a5a2c" }}>
            <span style={{ color: "#c8463b" }}>❯ </span><span className="caret">{typed}</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={start} onMouseEnter={() => playSound("click")} className="parch-btn" style={{
              display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer",
              fontFamily: "var(--font-pixel)", fontSize: "clamp(9px, 1.2vw, 11px)", letterSpacing: 2, color: "#3a1d08", padding: "16px 22px",
              background: "linear-gradient(180deg, #fff1b8 0%, #ffd76a 45%, #f5a623 100%)", border: "3px solid #1d1006",
              boxShadow: "inset 0 -4px 0 rgba(160,80,0,.35), inset 0 3px 0 rgba(255,255,255,.6), 0 5px 0 #1d1006",
            }}>
              <Play size={13} fill="currentColor" /> START ADVENTURE
            </button>
            <Link href="/quick" onClick={() => playSound("click")} className="parch-btn" style={{
              display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none",
              fontFamily: "var(--font-pixel)", fontSize: "clamp(9px, 1.2vw, 11px)", letterSpacing: 2, color: "#3a2412", padding: "16px 20px",
              background: "#f4e6c0", border: "3px solid #1d1006", boxShadow: "inset 0 0 0 2px #fff8e2, 0 5px 0 #1d1006",
            }}>
              QUICK VIEW <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="kb-only fade-in" style={{ marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", fontFamily: "var(--font-pixel)", fontSize: 7, color: "#fff4dc", letterSpacing: 1, textShadow: "0 2px 0 #1d1006" }}>
          <span style={hint}><span className="kbd">W</span><span className="kbd">A</span><span className="kbd">S</span><span className="kbd">D</span> MOVE</span>
          <span style={hint}><span className="kbd" style={{ minWidth: 44 }}>CLICK</span> WALK</span>
          <span style={hint}><span className="kbd">E</span> TALK</span>
          <span style={hint}><span className="kbd">M</span> MAP</span>
          <span style={hint}><span className="kbd">N</span> NIGHT</span>
        </div>
        <div className="kb-only blink" style={{ marginTop: 18, fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 3, color: "#fff4dc", textShadow: "0 2px 0 #1d1006" }}>PRESS ENTER</div>
      </div>

      <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", background: "#07060d", clipPath: leaving ? "circle(150% at 50% 50%)" : "circle(0% at 50% 50%)", transition: "clip-path .65s cubic-bezier(.7,0,.3,1)" }} />
    </div>
  )
}

const hint: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6 }
