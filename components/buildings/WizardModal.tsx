"use client"
import { useState } from "react"
import { contact } from "@/lib/data"
import { PARCH } from "@/lib/modalTheme"
import { Wand2, Mail, Code2, Link, AtSign, Send, CheckCircle, Radio } from "lucide-react"

const VIOLET = "#6b46c1"

export default function WizardModal() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState("")

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#f8efd4",
    border: `2px solid ${PARCH.lineDk}`, color: PARCH.ink,
    fontFamily: "var(--font-mono)", fontSize: 15,
    padding: "10px 12px", outline: "none", display: "block",
    transition: "border-color 0.1s",
  }

  const socials = [
    { icon: <Mail size={18} strokeWidth={1.5} />, label: "EMAIL", href: `mailto:${contact.email}`, value: contact.email },
    { icon: <Code2 size={18} strokeWidth={1.5} />, label: "GITHUB", href: contact.github, value: "View Profile" },
    { icon: <Link size={18} strokeWidth={1.5} />, label: "LINKEDIN", href: contact.linkedin, value: "Connect" },
    { icon: <AtSign size={18} strokeWidth={1.5} />, label: "TWITTER", href: contact.twitter, value: "Follow" },
  ].filter((s) => s.href)

  return (
    <div style={{ padding: "28px 24px", fontFamily: "var(--font-pixel)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, paddingBottom: 16, borderBottom: `3px solid ${VIOLET}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: `${VIOLET}1f`, border: `2px solid ${VIOLET}` }}>
          <Wand2 size={22} color={VIOLET} strokeWidth={1.5} />
        </div>
        <div>
          <div style={{ fontSize: "clamp(10px, 2vw, 15px)", color: VIOLET, letterSpacing: 2 }}>WIZARD TOWER</div>
          <div style={{ fontSize: "clamp(6px, 1vw, 8px)", color: PARCH.muted, marginTop: 5, letterSpacing: 1 }}>TRANSMISSION HQ</div>
        </div>
      </div>

      {/* Social links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 32 }}>
        {socials.map(({ icon, label, href, value }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" style={{
            background: PARCH.card, border: `2px solid ${PARCH.line}`,
            padding: "16px 14px", textDecoration: "none",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            transition: "border-color 0.1s, background 0.1s",
            position: "relative", overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = VIOLET
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = PARCH.line
          }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: VIOLET }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: `${VIOLET}1f`, border: `1px solid ${VIOLET}`, color: VIOLET }}>
              {icon}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: VIOLET, marginBottom: 4, letterSpacing: 2 }}>{label}</div>
              <div style={{ fontSize: "clamp(6px, 0.9vw, 8px)", color: PARCH.body, wordBreak: "break-all" }}>{value}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 2, background: PARCH.line }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Radio size={10} color={VIOLET} strokeWidth={1.5} />
          <span style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: VIOLET, letterSpacing: 2 }}>SEND TRANSMISSION</span>
        </div>
        <div style={{ flex: 1, height: 2, background: PARCH.line }} />
      </div>

      {/* Form / Success */}
      {sent ? (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <CheckCircle size={48} color={VIOLET} strokeWidth={0.8} />
          </div>
          <div style={{ fontSize: "clamp(8px, 1.5vw, 12px)", color: VIOLET, marginBottom: 10 }}>TRANSMISSION SENT!</div>
          <div style={{ fontSize: "clamp(7px, 1vw, 9px)", color: PARCH.body }}>Will respond within 24 hours.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.muted, display: "block", marginBottom: 7, letterSpacing: 1 }}>HERO'S NAME</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name..."
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = VIOLET }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = PARCH.lineDk }}
            />
          </div>
          <div>
            <label style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.muted, display: "block", marginBottom: 7, letterSpacing: 1 }}>REPLY ADDRESS</label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = VIOLET }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = PARCH.lineDk }}
            />
          </div>
          <div>
            <label style={{ fontSize: "clamp(5px, 0.8vw, 7px)", color: PARCH.muted, display: "block", marginBottom: 7, letterSpacing: 1 }}>MESSAGE SCROLL</label>
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Your message..."
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = VIOLET }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = PARCH.lineDk }}
            />
          </div>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 8,
              alignSelf: "flex-start", padding: "11px 22px",
              background: name && email && msg ? VIOLET : PARCH.inset,
              border: `2px solid ${name && email && msg ? VIOLET : PARCH.lineDk}`,
              color: name && email && msg ? PARCH.cream : PARCH.muted,
              fontFamily: "var(--font-pixel)", fontSize: "clamp(6px, 1vw, 8px)",
              cursor: name && email && msg ? "pointer" : "not-allowed",
              transition: "all 0.1s",
              boxShadow: name && email && msg ? `0 4px 0 ${PARCH.lineDk}` : "none",
            }}
            onClick={() => {
              if (name && email && msg) {
                window.open(`mailto:${contact.email}?subject=Hello from ${name}&body=${encodeURIComponent(msg)}`)
                setSent(true)
              }
            }}
          >
            <Send size={12} strokeWidth={1.5} /> TRANSMIT
          </button>
        </div>
      )}
    </div>
  )
}
