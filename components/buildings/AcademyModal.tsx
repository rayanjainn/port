"use client"
import { useContent } from "@/lib/content"
import { useSection } from "@/lib/theme"
import { SectionHeader, Card, Pill } from "./ui"
import { Rule } from "@/components/ui/kit"
import { GraduationCap, Medal, ExternalLink, BookOpen } from "lucide-react"

export default function AcademyModal({ focus }: { focus?: string | null }) {
  const { education, achievements } = useContent()
  const sec = useSection("academy", { title: "THE ACADEMY", sub: "Studies, honours and badges earned" })
  return (
    <div className="sec academy" style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<GraduationCap size={22} />} accent={sec.accent} kicker={sec.kicker}
        title={sec.title} subtitle={sec.sub}
      />

      {education.length > 0 && (
        <>
          <Label icon={<BookOpen size={13} />} text="STUDIES" />
          <div style={{ display: "grid", gap: 12, marginBottom: 26 }}>
            {education.map((e) => (
              <Card key={e.id} accent={sec.accent} className="study" style={{ padding: "16px 18px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div className="study-seal" style={{ ["--c" as string]: sec.accent }}>
                  <GraduationCap size={26} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 19, fontWeight: 700, color: "var(--u-ink)" }}>{e.degree}{e.field ? ` · ${e.field}` : ""}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--u-link)", fontWeight: 600, marginTop: 3 }}>{e.school}</div>
                  {e.note && <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--u-body)", marginTop: 6 }}>{e.note}</div>}
                </div>
                {(e.start || e.end) && <Pill>{[e.start, e.end].filter(Boolean).join(" — ")}</Pill>}
              </Card>
            ))}
          </div>
        </>
      )}

      {achievements.length > 0 && (
        <>
          <div ref={(el) => { if (el && focus === "honours") setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 250) }} />
          <Label icon={<Medal size={13} />} text="HONOURS & BADGES" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {achievements.map((a, i) => {
              const inner = (
                <Card hover={!!a.url} className="honour" style={{ padding: "14px 14px", display: "flex", gap: 12, alignItems: "center", height: "100%" }}>
                  <div className="medal" style={{ ["--r" as string]: `${i * 40}deg` }}>
                    <Medal size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, color: "var(--u-ink)", lineHeight: 1.25 }}>{a.title}</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--u-muted)", marginTop: 3 }}>{[a.issuer, a.date].filter(Boolean).join(" · ")}</div>
                  </div>
                  {a.url && <ExternalLink size={13} color="var(--u-muted)" />}
                </Card>
              )
              return a.url
                ? <a key={a.id} href={a.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{inner}</a>
                : <div key={a.id}>{inner}</div>
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-head)", fontSize: 8, letterSpacing: 1, color: "var(--u-muted)", marginBottom: 12 }}>
      {icon}{text}
      <div style={{ flex: 1 }}><Rule className="academy-rule" /></div>
    </div>
  )
}
