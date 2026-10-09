"use client"
import { useEffect, useState } from "react"
import { useGameStore } from "@/lib/store"

/** Zelda-style area name that fades in when you enter a new place. */
export default function AreaTitle() {
  const area = useGameStore((s) => s.areaTitle)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!area) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2200)
    return () => clearTimeout(t)
  }, [area])

  if (!area) return null
  return (
    <div key={area.key} style={{
      position: "fixed", top: "8.5%", left: 0, right: 0, zIndex: 60, pointerEvents: "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(-8px)",
      transition: "opacity .7s ease, transform .7s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 60, height: 2, background: "linear-gradient(90deg, transparent, #ffe7b0)" }} />
        <span style={{ fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 4, color: "#ffe7b0", textShadow: "0 2px 0 #1d1006" }}>{area.sub}</span>
        <span style={{ width: 60, height: 2, background: "linear-gradient(90deg, #ffe7b0, transparent)" }} />
      </div>
      <div style={{
        fontFamily: "var(--font-pixel)", fontSize: "clamp(20px, 3.4vw, 40px)", letterSpacing: 4, color: "#fff4dc",
        textShadow: "0 4px 0 #1d1006, 0 -2px 0 #1d1006, 3px 0 0 #1d1006, -3px 0 0 #1d1006, 0 10px 30px rgba(0,0,0,.6)",
      }}>{area.title}</div>
    </div>
  )
}
