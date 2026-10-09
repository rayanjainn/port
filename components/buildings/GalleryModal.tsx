"use client"
import { useState } from "react"
import { projects } from "@/lib/data"
import { PARCH } from "@/lib/modalTheme"
import { LayoutGrid, Star, ExternalLink, Code2, ArrowLeft, Calendar } from "lucide-react"

const PURPLE = "#7c5cba"

export default function GalleryModal() {
  const [selected, setSelected] = useState<string | null>(null)
  const proj = projects.find((p) => p.id === selected)

  return (
    <div style={{ padding: "28px 24px", fontFamily: "var(--font-pixel)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, paddingBottom: 16, borderBottom: `3px solid ${PURPLE}` }}>
        {!selected && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: `${PURPLE}1f`, border: `2px solid ${PURPLE}` }}>
              <LayoutGrid size={22} color={PURPLE} strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontSize: "clamp(10px, 2vw, 15px)", color: PURPLE, letterSpacing: 2 }}>GALLERY</div>
              <div style={{ fontSize: "clamp(6px, 1vw, 8px)", color: PARCH.muted, marginTop: 5, letterSpacing: 1 }}>PROJECT SHOWCASE</div>
            </div>
            <div style={{ marginLeft: "auto", background: PARCH.cardAlt, border: `2px solid ${PURPLE}`, padding: "4px 10px" }}>
              <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.body }}>{projects.length} EXHIBITS</span>
            </div>
          </>
        )}
        {selected && proj && (
          <>
            <button onClick={() => setSelected(null)} style={{
              display: "flex", alignItems: "center", gap: 7, background: PARCH.cardAlt,
              border: `2px solid ${PURPLE}`, color: PURPLE,
              fontFamily: "var(--font-pixel)", fontSize: "clamp(6px, 1vw, 8px)",
              padding: "8px 14px", cursor: "pointer",
            }}>
              <ArrowLeft size={12} strokeWidth={2} /> BACK
            </button>
            <div style={{ fontSize: "clamp(8px, 1.5vw, 12px)", color: PURPLE, letterSpacing: 1 }}>{proj.title}</div>
          </>
        )}
      </div>

      {selected && proj ? (
        /* Detail view */
        <div>
          <div style={{
            height: 140, background: PARCH.card, border: `2px solid ${PURPLE}`,
            marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            {proj.thumbnail
              ? <img src={proj.thumbnail} alt={proj.title} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} />
              : <Code2 size={48} color={`${PURPLE}66`} strokeWidth={0.8} />
            }
            {proj.featured && (
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 4, background: PURPLE, padding: "3px 8px" }}>
                <Star size={8} color={PARCH.cream} fill={PARCH.cream} />
                <span style={{ fontSize: 6, color: PARCH.cream }}>FEATURED</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <Calendar size={10} color={PARCH.muted} strokeWidth={1.5} />
            <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.muted }}>{proj.year}</span>
          </div>

          <div style={{ fontSize: "clamp(10px, 1.8vw, 14px)", color: PARCH.body, lineHeight: 1.9, fontFamily: "var(--font-mono)", marginBottom: 20, borderLeft: `3px solid ${PURPLE}`, paddingLeft: 14 }}>
            {proj.longDescription}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
            {proj.techStack.map((t) => (
              <span key={t} style={{
                fontSize: "clamp(5px, 0.8vw, 7px)", padding: "4px 10px",
                background: `${PURPLE}1f`, border: `1px solid ${PURPLE}`,
                color: PURPLE, fontFamily: "var(--font-pixel)",
              }}>{t}</span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {proj.liveUrl && (
              <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="pixel-btn" style={{
                display: "flex", alignItems: "center", gap: 7,
                fontSize: "clamp(6px, 1vw, 8px)", textDecoration: "none",
              }}>
                <ExternalLink size={12} strokeWidth={1.5} /> LIVE DEMO
              </a>
            )}
            {proj.githubUrl && (
              <a href={proj.githubUrl} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "center", gap: 7,
                background: PARCH.cardAlt, border: `2px solid ${PARCH.lineDk}`, color: PARCH.ink,
                fontFamily: "var(--font-pixel)", fontSize: "clamp(6px, 1vw, 8px)",
                padding: "9px 16px", textDecoration: "none",
              }}>
                <Code2 size={12} strokeWidth={1.5} /> SOURCE
              </a>
            )}
          </div>
        </div>
      ) : (
        /* Grid view */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
          {projects.map((p) => (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              background: PARCH.card,
              border: `2px solid ${p.featured ? PURPLE : PARCH.line}`,
              cursor: "pointer", overflow: "hidden",
              position: "relative",
              transition: "border-color 0.1s, transform 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = PURPLE
              ;(e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = p.featured ? PURPLE : PARCH.line
              ;(e.currentTarget as HTMLElement).style.transform = "translateY(0)"
            }}
            >
              <div style={{ height: 3, background: p.featured ? PURPLE : PARCH.line }} />

              <div style={{ height: 80, background: PARCH.cardAlt, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {p.thumbnail
                  ? <img src={p.thumbnail} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Code2 size={32} color={`${PURPLE}88`} strokeWidth={0.8} />
                }
                <div style={{ position: "absolute", bottom: 6, right: 6, display: "flex", alignItems: "center", gap: 4, background: PARCH.ink, padding: "2px 6px" }}>
                  <Calendar size={7} color={PARCH.cream} strokeWidth={1.5} />
                  <span style={{ fontSize: 6, color: PARCH.cream, fontFamily: "var(--font-pixel)" }}>{p.year}</span>
                </div>
              </div>

              <div style={{ padding: "14px 14px 16px" }}>
                {p.featured && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 7 }}>
                    <Star size={8} color={PURPLE} fill={PURPLE} />
                    <span style={{ fontSize: "clamp(5px, 0.7vw, 6px)", color: PURPLE, letterSpacing: 1 }}>FEATURED</span>
                  </div>
                )}
                <div style={{ fontSize: "clamp(7px, 1.1vw, 9px)", color: PARCH.ink, marginBottom: 7 }}>{p.title}</div>
                <div style={{ fontSize: "clamp(9px, 1.5vw, 12px)", color: PARCH.body, lineHeight: 1.7, fontFamily: "var(--font-mono)", marginBottom: 10 }}>{p.description}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {p.techStack.slice(0, 3).map((t) => (
                    <span key={t} style={{ fontSize: 6, padding: "2px 6px", background: `${PURPLE}1f`, border: `1px solid ${PURPLE}`, color: PURPLE, fontFamily: "var(--font-pixel)" }}>{t}</span>
                  ))}
                  {p.techStack.length > 3 && <span style={{ fontSize: 6, color: PARCH.muted, fontFamily: "var(--font-pixel)", padding: "2px 0" }}>+{p.techStack.length - 3}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
