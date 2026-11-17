"use client"
import { useEffect, useState } from "react"
import { useContent } from "@/lib/content"
import { useSection } from "@/lib/theme"
import { SectionHeader, Pill } from "./ui"
import { Bar, Well } from "@/components/ui/kit"
import { Hammer, Code2, Layers, Server, Flame } from "lucide-react"

const ICONS = [<Code2 key="a" size={14} />, <Layers key="b" size={14} />, <Server key="c" size={14} />]

function tier(level: number) {
  if (level >= 88) return { name: "LEGENDARY", col: "#f0b400" }
  if (level >= 78) return { name: "EPIC", col: "#a98bff" }
  if (level >= 65) return { name: "RARE", col: "#4aa3e8" }
  return { name: "UNCOMMON", col: "#5fc24a" }
}

export default function ForgeModal({ focus }: { focus?: string | null }) {
  const { skills } = useContent()
  const sec = useSection("forge", { title: "THE FORGE", sub: "Weapons of choice, tempered by shipping" })
  const [lit, setLit] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLit(true), 80); return () => clearTimeout(t) }, [])

  return (
    <div className="sec forge" style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<Hammer size={22} />} accent={sec.accent} kicker={sec.kicker}
        title={sec.title} subtitle={sec.sub}
        right={<Pill bg={sec.accent}><Flame size={10} /> HOT</Pill>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {skills.map((g, gi) => (
          <Well key={g.group} className="forge-col" data-focus={focus === g.group ? "" : undefined}>
            <div className="forge-col__head">
              {ICONS[gi % ICONS.length]} {g.group.toUpperCase()}
            </div>
            <div style={{ padding: "12px 14px 14px", display: "grid", gap: 11 }}>
              {g.items.map((s, i) => {
                const t = tier(s.level)
                return (
                  <div key={s.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5, gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--u-dark-ink)" }}>{s.name}</span>
                      <span style={{ fontFamily: "var(--font-head)", fontSize: 6, color: t.col, letterSpacing: 1 }}>{t.name}</span>
                    </div>
                    <Bar className="forge-bar" segments color={t.col} value={lit ? s.level / 100 : 0} style={{ height: 10, ["--d" as string]: `${gi * 120 + i * 50}ms` }} />
                  </div>
                )
              })}
            </div>
          </Well>
        ))}
      </div>
    </div>
  )
}
