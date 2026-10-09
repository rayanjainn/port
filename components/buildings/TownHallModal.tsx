"use client"
import { personal, contact } from "@/lib/data"
import { PARCH } from "@/lib/modalTheme"
import { User, MapPin, Briefcase, Gamepad2, Zap, Code2, Link, FileText } from "lucide-react"

const BLUE = "#3a6ea5"

export default function TownHallModal() {
  return (
    <div style={{ padding: "28px 24px", fontFamily: "var(--font-pixel)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, paddingBottom: 16, borderBottom: `3px solid ${BLUE}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: `${BLUE}1f`, border: `2px solid ${BLUE}` }}>
          <User size={22} color={BLUE} strokeWidth={1.5} />
        </div>
        <div>
          <div style={{ fontSize: "clamp(10px, 2vw, 15px)", color: BLUE, letterSpacing: 2 }}>TOWN HALL</div>
          <div style={{ fontSize: "clamp(6px, 1vw, 8px)", color: PARCH.muted, marginTop: 5, letterSpacing: 1 }}>CHARACTER PROFILE</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "#cfe0b0", border: "2px solid #4d9a3f", padding: "4px 10px" }}>
          <div style={{ width: 6, height: 6, background: "#4d9a3f", borderRadius: "50%" }} className="blink" />
          <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: "#3a6a2e" }}>AVAILABLE</span>
        </div>
      </div>

      {/* Hero section */}
      <div style={{ display: "flex", gap: 24, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{
          width: 96, height: 96, flexShrink: 0,
          background: `${BLUE}1f`,
          border: `3px solid ${BLUE}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
          boxShadow: `inset 0 0 18px ${BLUE}33, 4px 4px 0 ${PARCH.lineDk}`,
        }}>
          <User size={52} color={`${BLUE}99`} strokeWidth={0.8} />
          <div style={{ position: "absolute", bottom: -2, right: -2, background: BLUE, padding: "2px 5px" }}>
            <span style={{ fontSize: 6, color: PARCH.cream, fontFamily: "var(--font-pixel)" }}>LVL 1</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: "clamp(12px, 2.5vw, 20px)", color: PARCH.ink, marginBottom: 6, letterSpacing: 1 }}>
            {personal.name.toUpperCase()}
          </div>
          <div style={{ fontSize: "clamp(7px, 1.2vw, 10px)", color: BLUE, marginBottom: 14, letterSpacing: 2 }}>
            {personal.title.toUpperCase()}
          </div>
          <div style={{ fontSize: "clamp(10px, 1.8vw, 14px)", color: PARCH.body, lineHeight: 1.9, fontFamily: "var(--font-mono)", borderLeft: `3px solid ${BLUE}`, paddingLeft: 12 }}>
            {personal.bio}
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 28 }}>
        {[
          { icon: <MapPin size={14} color={BLUE} strokeWidth={1.5} />, label: "BASE", value: personal.location },
          { icon: <Briefcase size={14} color={BLUE} strokeWidth={1.5} />, label: "CLASS", value: "Full-Stack" },
          { icon: <Gamepad2 size={14} color={BLUE} strokeWidth={1.5} />, label: "HANDLE", value: personal.handle },
          { icon: <Zap size={14} color="#4d9a3f" strokeWidth={1.5} />, label: "STATUS", value: "FOR HIRE" },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{
            background: PARCH.card, border: `2px solid ${PARCH.line}`,
            padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 8,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: BLUE }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {icon}
              <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.muted, letterSpacing: 1 }}>{label}</span>
            </div>
            <div style={{ fontSize: "clamp(7px, 1.1vw, 9px)", color: PARCH.ink }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {contact.github && (
          <a href={contact.github} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", gap: 7,
            background: PARCH.cardAlt, border: `2px solid ${PARCH.lineDk}`, color: PARCH.ink,
            fontFamily: "var(--font-pixel)", fontSize: "clamp(6px, 1vw, 8px)",
            padding: "9px 16px", textDecoration: "none", cursor: "pointer",
          }}>
            <Code2 size={13} strokeWidth={1.5} /> GITHUB
          </a>
        )}
        {contact.linkedin && (
          <a href={contact.linkedin} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", gap: 7,
            background: PARCH.cardAlt, border: `2px solid ${PARCH.lineDk}`, color: PARCH.ink,
            fontFamily: "var(--font-pixel)", fontSize: "clamp(6px, 1vw, 8px)",
            padding: "9px 16px", textDecoration: "none", cursor: "pointer",
          }}>
            <Link size={13} strokeWidth={1.5} /> LINKEDIN
          </a>
        )}
        {contact.resume && (
          <a href={contact.resume} target="_blank" rel="noreferrer" className="pixel-btn" style={{
            display: "flex", alignItems: "center", gap: 7,
            fontSize: "clamp(6px, 1vw, 8px)", textDecoration: "none",
          }}>
            <FileText size={13} strokeWidth={1.5} /> RESUME
          </a>
        )}
      </div>
    </div>
  )
}
