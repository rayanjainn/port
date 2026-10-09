"use client"
import { workExperience } from "@/lib/data"
import { PARCH } from "@/lib/modalTheme"
import { Briefcase, Calendar, ChevronRight, Star } from "lucide-react"

const AMBER = "#b06d1a"

export default function TavernModal() {
  return (
    <div style={{ padding: "28px 24px", fontFamily: "var(--font-pixel)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32, paddingBottom: 16, borderBottom: `3px solid ${AMBER}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: `${AMBER}1f`, border: `2px solid ${AMBER}` }}>
          <Briefcase size={22} color={AMBER} strokeWidth={1.5} />
        </div>
        <div>
          <div style={{ fontSize: "clamp(10px, 2vw, 15px)", color: AMBER, letterSpacing: 2 }}>TAVERN</div>
          <div style={{ fontSize: "clamp(6px, 1vw, 8px)", color: PARCH.muted, marginTop: 5, letterSpacing: 1 }}>QUEST LOG</div>
        </div>
        <div style={{ marginLeft: "auto", background: PARCH.cardAlt, border: `2px solid ${AMBER}`, padding: "4px 10px" }}>
          <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.body }}>{workExperience.length} QUESTS</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative", paddingLeft: 24 }}>
        <div style={{
          position: "absolute", left: 7, top: 0, bottom: 0,
          width: 2, background: `linear-gradient(to bottom, ${AMBER}, ${AMBER}44)`,
        }} />

        {workExperience.map((job, i) => (
          <div key={job.id} style={{ position: "relative", marginBottom: i < workExperience.length - 1 ? 28 : 0 }}>
            <div style={{
              position: "absolute", left: -23, top: 4,
              width: 14, height: 14,
              background: i === 0 ? AMBER : PARCH.inset,
              border: `2px solid ${i === 0 ? AMBER : PARCH.lineDk}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {i === 0 && <div style={{ width: 4, height: 4, background: PARCH.cream }} />}
            </div>

            <div style={{
              background: PARCH.card,
              border: `2px solid ${i === 0 ? AMBER : PARCH.line}`,
              padding: "18px 20px",
              position: "relative", overflow: "hidden",
            }}>
              {i === 0 && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: AMBER }} />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div>
                  {i === 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                      <Star size={8} color={AMBER} fill={AMBER} />
                      <span style={{ fontSize: "clamp(5px, 0.7vw, 6px)", color: AMBER, letterSpacing: 2 }}>ACTIVE QUEST</span>
                    </div>
                  )}
                  <div style={{ fontSize: "clamp(8px, 1.5vw, 12px)", color: PARCH.ink, marginBottom: 5 }}>{job.role}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ChevronRight size={10} color={AMBER} strokeWidth={2} />
                    <span style={{ fontSize: "clamp(7px, 1.2vw, 10px)", color: AMBER }}>{job.company}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: PARCH.cardAlt, border: `1px solid ${PARCH.line}`, padding: "5px 10px" }}>
                  <Calendar size={9} color={PARCH.muted} strokeWidth={1.5} />
                  <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.muted }}>
                    {job.startDate} — {job.endDate}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "clamp(10px, 1.6vw, 14px)", color: PARCH.body, lineHeight: 1.8, fontFamily: "var(--font-mono)", marginBottom: 14 }}>
                {job.description}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {job.technologies.map((t) => (
                  <span key={t} style={{
                    fontSize: "clamp(5px, 0.8vw, 7px)", padding: "3px 8px",
                    background: `${AMBER}1f`, border: `1px solid ${AMBER}`,
                    color: AMBER, fontFamily: "var(--font-pixel)",
                  }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
