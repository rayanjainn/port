"use client"
import { useState } from "react"
import { useContent } from "@/lib/content"
import { playSound } from "@/lib/audio"
import { SectionHeader, Card, INK } from "./ui"
import { Wand2, Mail, Globe, Send, Copy, Check, Sparkles } from "lucide-react"
import { Github, Linkedin, XLogo } from "@/components/icons"

const VIOLET = "#6b46c1"

export default function WizardModal() {
  const { socials, profile } = useContent()
  const [name, setName] = useState("")
  const [msg, setMsg] = useState("")
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  const channels = [
    { icon: <Mail size={20} />, label: "Email", value: socials.email, href: socials.email && `mailto:${socials.email}`, col: "#c8463b" },
    { icon: <Github size={20} />, label: "GitHub", value: socials.github.replace(/^https?:\/\/(www\.)?/, ""), href: socials.github, col: "#24292f" },
    { icon: <Linkedin size={20} />, label: "LinkedIn", value: socials.linkedin.replace(/^https?:\/\/(www\.)?/, ""), href: socials.linkedin, col: "#0a66c2" },
    { icon: <XLogo size={18} />, label: "X / Twitter", value: socials.twitter.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, "@"), href: socials.twitter, col: "#111" },
    { icon: <Globe size={20} />, label: "Website", value: socials.website.replace(/^https?:\/\//, ""), href: socials.website, col: "#2a8a80" },
  ].filter((c) => c.href)

  const copy = async () => {
    try { await navigator.clipboard.writeText(socials.email); setCopied(true); playSound("click"); setTimeout(() => setCopied(false), 1600) } catch {}
  }

  const send = () => {
    if (!msg.trim()) return
    const subject = encodeURIComponent(`Hello from ${name || "a traveller"} (via your portfolio)`)
    window.location.href = `mailto:${socials.email}?subject=${subject}&body=${encodeURIComponent(msg)}`
    playSound("achievement")
    setSent(true)
  }

  const input: React.CSSProperties = {
    width: "100%", background: "#fffaf0", border: `2px solid ${INK.lineDk}`, color: INK.ink,
    fontFamily: "var(--font-body)", fontSize: 16, padding: "11px 12px", outline: "none",
    boxShadow: `inset 0 2px 0 ${INK.inset}`,
  }

  return (
    <div style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader icon={<Wand2 size={22} />} accent={VIOLET} title="WIZARD TOWER" subtitle={profile.availability} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10, marginBottom: 26 }}>
        {channels.map((c) => (
          <a key={c.label} href={c.href} target={c.label === "Email" ? undefined : "_blank"} rel="noreferrer" style={{ textDecoration: "none" }}>
            <Card hover style={{ padding: "14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, flexShrink: 0, background: c.col, color: "#fff", border: `3px solid ${INK.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {c.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: INK.muted, letterSpacing: 1 }}>{c.label.toUpperCase()}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: INK.ink, marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.value}</div>
              </div>
            </Card>
          </a>
        ))}
      </div>

      <div style={{ background: "linear-gradient(160deg, #2b1d4a, #1a1030)", border: `3px solid ${INK.ink}`, boxShadow: `0 4px 0 ${INK.lineDk}`, padding: "20px clamp(14px, 2.5vw, 22px)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none", backgroundImage: "radial-gradient(#c4b5fd 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-pixel)", fontSize: 9, letterSpacing: 1, color: "#e9d5ff", marginBottom: 16 }}>
            <Sparkles size={14} /> SEND A RAVEN
          </div>
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontFamily: "var(--font-pixel)", fontSize: 12, color: "#ffd76a" }}>RAVEN DISPATCHED!</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "#e9d5ff", marginTop: 12 }}>Your mail app should have opened. I usually reply within a day.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <input style={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <textarea style={{ ...input, minHeight: 110, resize: "vertical" }} placeholder="What should we build together?" value={msg} onChange={(e) => setMsg(e.target.value)} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={send} disabled={!msg.trim()} className="parch-btn" style={{
                  display: "inline-flex", alignItems: "center", gap: 8, cursor: msg.trim() ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-pixel)", fontSize: 9, letterSpacing: 1, padding: "13px 16px",
                  background: msg.trim() ? "linear-gradient(180deg, #fff1b8, #ffd76a 45%, #f5a623)" : "#6b5a7e",
                  color: msg.trim() ? "#3a1d08" : "#cbbfdc", border: "3px solid #0f0820", boxShadow: "0 4px 0 #0f0820",
                }}>
                  <Send size={13} /> DISPATCH
                </button>
                {socials.email && (
                  <button onClick={copy} style={{
                    display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", background: "transparent",
                    border: "2px dashed rgba(233,213,255,.5)", color: "#e9d5ff", padding: "10px 12px",
                    fontFamily: "var(--font-body)", fontSize: 15,
                  }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied!" : socials.email}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
