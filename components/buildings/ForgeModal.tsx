"use client"
import { skills } from "@/lib/data"
import { PARCH } from "@/lib/modalTheme"
import { Hammer, Monitor, Server, Cloud, Palette, Flame } from "lucide-react"

const ORANGE = "#c2531d"

const CATEGORIES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  frontend: { color: "#3a6ea5", icon: <Monitor size={12} strokeWidth={1.5} />, label: "FRONTEND" },
  backend:  { color: "#2a8a5a", icon: <Server size={12} strokeWidth={1.5} />, label: "BACKEND" },
  devops:   { color: ORANGE,    icon: <Cloud size={12} strokeWidth={1.5} />, label: "DEVOPS" },
  design:   { color: "#b0468a", icon: <Palette size={12} strokeWidth={1.5} />, label: "DESIGN" },
}

function SkillBar({ name, level, color }: { name: string; level: number; color: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: "clamp(6px, 1vw, 8px)", color: PARCH.ink }}>{name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {level >= 85 && <Flame size={9} color={ORANGE} strokeWidth={1.5} />}
          <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color, fontFamily: "var(--font-pixel)" }}>{level}%</span>
        </div>
      </div>
      <div style={{ height: 10, background: PARCH.inset, border: `1px solid ${PARCH.lineDk}`, position: "relative", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${level}%`,
          background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 8px, ${color}bb 8px, ${color}bb 10px)`,
          transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  )
}

export default function ForgeModal() {
  const categories = [...new Set(skills.map((s) => s.category))]
  const total = skills.length
  const avgLevel = Math.round(skills.reduce((a, s) => a + s.level, 0) / total)

  return (
    <div style={{ padding: "28px 24px", fontFamily: "var(--font-pixel)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, paddingBottom: 16, borderBottom: `3px solid ${ORANGE}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: `${ORANGE}1f`, border: `2px solid ${ORANGE}` }}>
          <Hammer size={22} color={ORANGE} strokeWidth={1.5} />
        </div>
        <div>
          <div style={{ fontSize: "clamp(10px, 2vw, 15px)", color: ORANGE, letterSpacing: 2 }}>THE FORGE</div>
          <div style={{ fontSize: "clamp(6px, 1vw, 8px)", color: PARCH.muted, marginTop: 5, letterSpacing: 1 }}>SKILL REGISTRY</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <div style={{ background: PARCH.cardAlt, border: `2px solid ${ORANGE}`, padding: "4px 10px" }}>
            <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.body }}>{total} SKILLS</span>
          </div>
          <div style={{ background: `${ORANGE}1f`, border: `1px solid ${ORANGE}`, padding: "3px 8px" }}>
            <span style={{ fontSize: "clamp(5px, 0.7vw, 6px)", color: ORANGE }}>AVG {avgLevel}%</span>
          </div>
        </div>
      </div>

      {/* Skill categories */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {categories.map((cat) => {
          const catData = CATEGORIES[cat] ?? { color: ORANGE, icon: <Hammer size={12} />, label: cat.toUpperCase() }
          const catSkills = skills.filter((s) => s.category === cat)

          return (
            <div key={cat}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                padding: "8px 12px",
                background: PARCH.card,
                border: `1px solid ${PARCH.line}`,
                borderLeft: `3px solid ${catData.color}`,
              }}>
                <div style={{ color: catData.color }}>{catData.icon}</div>
                <span style={{ fontSize: "clamp(6px, 1vw, 8px)", color: catData.color, letterSpacing: 2 }}>{catData.label}</span>
                <div style={{ marginLeft: "auto", fontSize: "clamp(5px, 0.7vw, 6px)", color: PARCH.muted }}>
                  {catSkills.length} TOOLS
                </div>
              </div>

              <div style={{ paddingLeft: 12 }}>
                {catSkills.map((skill) => (
                  <SkillBar key={skill.id} name={skill.name} level={skill.level} color={catData.color} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
