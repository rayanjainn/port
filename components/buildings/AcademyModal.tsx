"use client"
import { useContent } from "@/lib/content"
import { SectionHeader, Card, INK, Pill } from "./ui"
import { GraduationCap, Medal, ExternalLink, BookOpen } from "lucide-react"

const TEAL = "#2a8a80"

export default function AcademyModal() {
  const { education, achievements } = useContent()
  return (
    <div style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<GraduationCap size={22} />} accent={TEAL}
        title="THE ACADEMY" subtitle="Studies, honours and badges earned"
      />

      {education.length > 0 && (
        <>
          <Label icon={<BookOpen size={13} />} text="STUDIES" />
          <div style={{ display: "grid", gap: 12, marginBottom: 26 }}>
            {education.map((e) => (
              <Card key={e.id} accent={TEAL} style={{ padding: "16px 18px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 52, height: 52, flexShrink: 0, background: TEAL, border: `3px solid ${INK.ink}`, display: "flex", alignItems: "center", justifyContent: "center", color: INK.cream }}>
                  <GraduationCap size={26} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 19, fontWeight: 700, color: INK.ink }}>{e.degree}{e.field ? ` · ${e.field}` : ""}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: TEAL, fontWeight: 600, marginTop: 3 }}>{e.school}</div>
                  {e.note && <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: INK.body, marginTop: 6 }}>{e.note}</div>}
                </div>
                {(e.start || e.end) && <Pill>{[e.start, e.end].filter(Boolean).join(" — ")}</Pill>}
              </Card>
            ))}
          </div>
        </>
      )}

      {achievements.length > 0 && (
        <>
          <Label icon={<Medal size={13} />} text="HONOURS & BADGES" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {achievements.map((a, i) => {
              const inner = (
                <Card hover={!!a.url} style={{ padding: "14px 14px", display: "flex", gap: 12, alignItems: "center", height: "100%" }}>
                  <div style={{
                    width: 42, height: 42, flexShrink: 0, borderRadius: "50%",
                    background: `conic-gradient(from ${i * 40}deg, #ffd76a, #f5a623, #ffe9a8, #ffd76a)`,
                    border: `3px solid ${INK.ink}`, display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "inset 0 0 0 3px rgba(255,255,255,.35)",
                  }}>
                    <Medal size={18} color={INK.ink} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, color: INK.ink, lineHeight: 1.25 }}>{a.title}</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: INK.muted, marginTop: 3 }}>{[a.issuer, a.date].filter(Boolean).join(" · ")}</div>
                  </div>
                  {a.url && <ExternalLink size={13} color={INK.muted} />}
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
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 1, color: INK.muted, marginBottom: 12 }}>
      {icon}{text}
      <div style={{ flex: 1, height: 2, background: INK.line }} />
    </div>
  )
}
