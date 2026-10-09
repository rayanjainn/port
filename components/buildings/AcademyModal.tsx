"use client"
import { certifications, education } from "@/lib/data"
import { PARCH } from "@/lib/modalTheme"
import { GraduationCap, Award, ExternalLink, BookOpen, Shield } from "lucide-react"

const TEAL = "#2a8a80"

export default function AcademyModal() {
  return (
    <div style={{ padding: "28px 24px", fontFamily: "var(--font-pixel)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, paddingBottom: 16, borderBottom: `3px solid ${TEAL}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: `${TEAL}1f`, border: `2px solid ${TEAL}` }}>
          <GraduationCap size={22} color={TEAL} strokeWidth={1.5} />
        </div>
        <div>
          <div style={{ fontSize: "clamp(10px, 2vw, 15px)", color: TEAL, letterSpacing: 2 }}>ACADEMY</div>
          <div style={{ fontSize: "clamp(6px, 1vw, 8px)", color: PARCH.muted, marginTop: 5, letterSpacing: 1 }}>KNOWLEDGE CODEX</div>
        </div>
        <div style={{ marginLeft: "auto", background: PARCH.cardAlt, border: `2px solid ${TEAL}`, padding: "4px 10px" }}>
          <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.body }}>{certifications.length} CERTS</span>
        </div>
      </div>

      {/* Education */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <BookOpen size={12} color={TEAL} strokeWidth={1.5} />
          <span style={{ fontSize: "clamp(6px, 1vw, 8px)", color: TEAL, letterSpacing: 2 }}>EDUCATION</span>
        </div>

        {education.map((edu) => (
          <div key={edu.id} style={{
            background: PARCH.card,
            border: `2px solid ${TEAL}`,
            padding: "20px 22px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: TEAL }} />

            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: "clamp(8px, 1.5vw, 12px)", color: PARCH.ink, marginBottom: 6 }}>{edu.institution}</div>
                <div style={{ fontSize: "clamp(7px, 1.1vw, 10px)", color: TEAL, marginBottom: 4 }}>{edu.degree}</div>
                <div style={{ fontSize: "clamp(6px, 1vw, 9px)", color: PARCH.body }}>{edu.field}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.muted, marginBottom: 8 }}>{edu.startYear} — {edu.endYear}</div>
                {edu.gpa && (
                  <div style={{ background: `${TEAL}1f`, border: `1px solid ${TEAL}`, padding: "4px 10px" }}>
                    <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: TEAL }}>GPA {edu.gpa}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Certifications */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Shield size={12} color={TEAL} strokeWidth={1.5} />
          <span style={{ fontSize: "clamp(6px, 1vw, 8px)", color: TEAL, letterSpacing: 2 }}>CERTIFICATIONS</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
          {certifications.map((cert) => (
            <div key={cert.id} style={{
              background: PARCH.card,
              border: `2px solid ${PARCH.line}`,
              padding: "18px 16px",
              display: "flex", flexDirection: "column", gap: 10,
              position: "relative", overflow: "hidden",
              transition: "border-color 0.1s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = TEAL }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = PARCH.line }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: TEAL }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: `${TEAL}1f`, border: `1px solid ${TEAL}`, margin: "0 auto" }}>
                <Award size={18} color={TEAL} strokeWidth={1.5} />
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(7px, 1vw, 9px)", color: PARCH.ink, marginBottom: 6, lineHeight: 1.5 }}>{cert.name}</div>
                <div style={{ fontSize: "clamp(6px, 0.9vw, 8px)", color: TEAL, marginBottom: 4 }}>{cert.issuer}</div>
                <div style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.muted }}>
                  {cert.date}{cert.expiryDate ? ` — ${cert.expiryDate}` : ""}
                </div>
              </div>

              {cert.credentialUrl && (
                <a href={cert.credentialUrl} target="_blank" rel="noreferrer" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  fontSize: "clamp(5px, 0.7vw, 7px)", color: TEAL,
                  textDecoration: "none", border: `1px solid ${TEAL}`, padding: "4px 8px",
                }}>
                  <ExternalLink size={9} strokeWidth={1.5} /> VERIFY
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
