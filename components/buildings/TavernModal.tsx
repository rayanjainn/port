"use client"
import { useContent } from "@/lib/content"
import { useSection } from "@/lib/theme"
import { SectionHeader, Card, Chip, Pill } from "./ui"
import { Beer, MapPin, ExternalLink, Swords } from "lucide-react"

export default function TavernModal() {
  const { experience } = useContent()
  const sec = useSection("tavern", { title: "THE TAVERN", sub: "Tales of quests taken and guilds joined" })
  return (
    <div className="sec tavern" style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<Beer size={22} />} accent={sec.accent} kicker={sec.kicker}
        title={sec.title} subtitle={sec.sub}
        right={<Pill>{experience.length} TALES</Pill>}
      />

      <div className="tl">
        <div className="tl-line" />
        {experience.map((e, i) => {
          const now = e.end.toLowerCase() === "present"
          return (
            <div key={e.id} className="rise tl-item" style={{ marginBottom: i < experience.length - 1 ? 18 : 0, animationDelay: `${i * 70}ms` }}>
              <div className="tl-node" data-now={now ? "" : undefined} style={{ ["--c" as string]: sec.accent }}>
                <Swords size={12} />
              </div>
              <Card className="tl-card" accent={now ? sec.accent : undefined} style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="tl-role">{e.role}</div>
                    <div className="tl-org">
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {e.org} <ExternalLink size={12} />
                        </a>
                      ) : e.org}
                      {e.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--u-muted)", fontWeight: 400, fontSize: 14 }}><MapPin size={12} />{e.location}</span>}
                    </div>
                  </div>
                  <Pill bg={now ? sec.accent : undefined}>{[e.start, e.end].filter(Boolean).join(" — ")}</Pill>
                </div>
                {e.description && <p style={{ fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.6, color: "var(--u-body)", margin: "12px 0 0" }}>{e.description}</p>}
                {e.highlights.length > 0 && (
                  <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                    {e.highlights.map((h) => (
                      <li key={h} style={{ display: "flex", gap: 8, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--u-ink)" }}>
                        <span className="tl-bullet">▸</span>{h}
                      </li>
                    ))}
                  </ul>
                )}
                {e.tech.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 12 }}>
                    {e.tech.map((t) => <Chip key={t} color={sec.accent}>{t}</Chip>)}
                  </div>
                )}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
