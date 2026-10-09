"use client"
import { useEffect, useState } from "react"
import { useContent } from "@/lib/content"
import { SectionHeader, INK, Pill } from "./ui"
import { Hammer, Code2, Layers, Server, Flame } from "lucide-react"

const ORANGE = "#c2531d"
const ICONS = [<Code2 key="a" size={14} />, <Layers key="b" size={14} />, <Server key="c" size={14} />]

function tier(level: number) {
  if (level >= 88) return { name: "LEGENDARY", col: "#e2a400" }
  if (level >= 78) return { name: "EPIC", col: "#8b5cf6" }
  if (level >= 65) return { name: "RARE", col: "#2f80c2" }
  return { name: "UNCOMMON", col: "#4f9a3f" }
}

export default function ForgeModal({ focus }: { focus?: string | null }) {
  const { skills } = useContent()
  const [lit, setLit] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLit(true), 80); return () => clearTimeout(t) }, [])

  return (
    <div style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<Hammer size={22} />} accent={ORANGE}
        title="THE FORGE" subtitle="Weapons of choice, tempered by shipping"
        right={<Pill bg={ORANGE}><Flame size={10} /> HOT</Pill>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {skills.map((g, gi) => (
          <div key={g.group} style={{ background: INK.ink, border: `3px solid ${INK.ink}`, boxShadow: focus === g.group ? `0 0 0 3px #ffd76a, 0 0 24px rgba(255,190,80,.6)` : `0 4px 0 ${INK.lineDk}`, transform: focus === g.group ? "translateY(-3px)" : "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
              fontFamily: "var(--font-pixel)", fontSize: 9, letterSpacing: 1, color: "#ffd76a",
              borderBottom: "2px solid #5c3a1c", background: "linear-gradient(180deg, #4a2c14, #3a2412)",
            }}>
              {ICONS[gi % ICONS.length]} {g.group.toUpperCase()}
            </div>
            <div style={{ padding: "12px 14px 14px", display: "grid", gap: 11 }}>
              {g.items.map((s, i) => {
                const t = tier(s.level)
                return (
                  <div key={s.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5, gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#fff1d6" }}>{s.name}</span>
                      <span style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: t.col, letterSpacing: 1 }}>{t.name}</span>
                    </div>
                    <div style={{ height: 10, background: "#1f130a", border: "2px solid #0f0904", position: "relative", overflow: "hidden" }}>
                      <div style={{
                        position: "absolute", inset: 0, width: lit ? `${s.level}%` : "0%",
                        background: `repeating-linear-gradient(90deg, ${t.col} 0 8px, ${t.col}cc 8px 10px)`,
                        boxShadow: `0 0 10px ${t.col}`,
                        transition: `width 0.9s cubic-bezier(.2,.9,.3,1) ${gi * 120 + i * 50}ms`,
                      }} />
                      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: "rgba(255,255,255,.18)" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
