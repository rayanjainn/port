"use client"
import { useContent } from "@/lib/content"
import { SectionHeader, Card, Chip, INK, Pill } from "./ui"
import { Beer, MapPin, ExternalLink, Swords } from "lucide-react"

const AMBER = "#b06d1a"

export default function TavernModal() {
  const { experience } = useContent()
  return (
    <div style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<Beer size={22} />} accent={AMBER}
        title="THE TAVERN" subtitle="Tales of quests taken and guilds joined"
        right={<Pill>{experience.length} TALES</Pill>}
      />

      <div style={{ position: "relative", paddingLeft: 34 }}>
        <div style={{ position: "absolute", left: 11, top: 6, bottom: 6, width: 4, background: `repeating-linear-gradient(180deg, ${INK.lineDk} 0 8px, transparent 8px 14px)` }} />
        {experience.map((e, i) => (
          <div key={e.id} className="rise" style={{ position: "relative", marginBottom: i < experience.length - 1 ? 18 : 0, animationDelay: `${i * 70}ms` }}>
            <div style={{
              position: "absolute", left: -34, top: 14, width: 26, height: 26,
              background: e.end.toLowerCase() === "present" ? AMBER : INK.inset,
              border: `3px solid ${INK.ink}`, display: "flex", alignItems: "center", justifyContent: "center",
              color: INK.cream, boxShadow: `0 3px 0 ${INK.ink}`,
            }}>
              <Swords size={12} />
            </div>
            <Card style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 20, fontWeight: 700, color: INK.ink }}>{e.role}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4, fontFamily: "var(--font-body)", fontSize: 16, color: AMBER, fontWeight: 600 }}>
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noreferrer" style={{ color: AMBER, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {e.org} <ExternalLink size={12} />
                      </a>
                    ) : e.org}
                    {e.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: INK.muted, fontWeight: 400, fontSize: 14 }}><MapPin size={12} />{e.location}</span>}
                  </div>
                </div>
                <Pill bg={e.end.toLowerCase() === "present" ? AMBER : INK.ink}>{[e.start, e.end].filter(Boolean).join(" — ")}</Pill>
              </div>
              {e.description && <p style={{ fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.6, color: INK.body, margin: "12px 0 0" }}>{e.description}</p>}
              {e.highlights.length > 0 && (
                <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                  {e.highlights.map((h) => (
                    <li key={h} style={{ display: "flex", gap: 8, fontFamily: "var(--font-body)", fontSize: 15, color: INK.ink }}>
                      <span style={{ color: AMBER }}>▸</span>{h}
                    </li>
                  ))}
                </ul>
              )}
              {e.tech.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 12 }}>
                  {e.tech.map((t) => <Chip key={t} color={AMBER}>{t}</Chip>)}
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
