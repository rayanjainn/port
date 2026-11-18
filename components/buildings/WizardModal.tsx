"use client"
import { useState } from "react"
import { useContent } from "@/lib/content"
import { playSound } from "@/lib/audio"
import { useSection, useWorldTheme } from "@/lib/theme"
import { SectionHeader, Card } from "./ui"
import { Button, Well } from "@/components/ui/kit"
import { Wand2, Mail, Globe, Send, Copy, Check, Sparkles, Code, Trophy } from "lucide-react"
import { Github, Linkedin, XLogo } from "@/components/icons"

export default function WizardModal() {
  const { socials, profile } = useContent()
  const sec = useSection("wizard", { title: "WIZARD TOWER", sub: "" })
  const th = useWorldTheme()
  const [name, setName] = useState("")
  const [msg, setMsg] = useState("")
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  const channels = [
    { icon: <Mail size={20} />, label: "Email", value: socials.email, href: socials.email && `mailto:${socials.email}`, col: "#c8463b" },
    { icon: <Github size={20} />, label: "GitHub", value: socials.github.replace(/^https?:\/\/(www\.)?/, ""), href: socials.github, col: "#24292f" },
    { icon: <Linkedin size={20} />, label: "LinkedIn", value: socials.linkedin.replace(/^https?:\/\/(www\.)?/, ""), href: socials.linkedin, col: "#0a66c2" },
    { icon: <XLogo size={18} />, label: "X / Twitter", value: socials.twitter.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, "@"), href: socials.twitter, col: "#2b2b33" },
    { icon: <Globe size={20} />, label: "Website", value: socials.website.replace(/^https?:\/\//, ""), href: socials.website, col: "#2a8a80" },
    { icon: <Code size={20} />, label: "LeetCode", value: (socials.leetcode ?? "").replace(/^https?:\/\/(www\.)?leetcode\.com\/u\//, "@").replace(/\/$/, ""), href: socials.leetcode ?? "", col: "#b8741a" },
    { icon: <Trophy size={20} />, label: "Codeforces", value: (socials.codeforces ?? "").replace(/^https?:\/\/(www\.)?codeforces\.com\/profile\//, "@"), href: socials.codeforces ?? "", col: "#1f6fb2" },
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

  const WORDS: Record<string, { head: string; done: string; doneSub: string; cta: string; hint: string }> = {
    village: { head: "SEND A RAVEN", done: "RAVEN DISPATCHED!", doneSub: "Your mail app should have opened. I usually reply within a day.", cta: "DISPATCH", hint: "What should we build together?" },
    city: { head: "OPEN A CHANNEL", done: "MESSAGE TRANSMITTED", doneSub: "Your mail app should have opened. I usually reply within a day.", cta: "TRANSMIT", hint: "What should we build together?" },
    desert: { head: "CONSULT THE ORACLE", done: "THE SEAL IS SET!", doneSub: "Your mail app should have opened. I usually reply within a day.", cta: "SEAL & SEND", hint: "What should we build together?" },
    ruins: { head: "HOLD A SEANCE", done: "THE SPIRITS HEARD YOU", doneSub: "Your mail app should have opened. I usually reply within a day.", cta: "SUMMON", hint: "What should we build together?" },
  }
  const w = WORDS[th.id] ?? WORDS.village

  return (
    <div className="sec wizard" style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader icon={<Wand2 size={22} />} accent={sec.accent} kicker={sec.kicker} title={sec.title} subtitle={profile.availability} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10, marginBottom: 26 }}>
        {channels.map((c) => (
          <a key={c.label} href={c.href} target={c.label === "Email" ? undefined : "_blank"} rel="noreferrer" style={{ textDecoration: "none" }}>
            <Card hover className="channel" style={{ padding: "14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div className="channel-ico" style={{ background: c.col }}>
                {c.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 7, color: "var(--u-muted)", letterSpacing: 1 }}>{c.label.toUpperCase()}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--u-ink)", marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.value}</div>
              </div>
            </Card>
          </a>
        ))}
      </div>

      <Well className="wiz-box" style={{ padding: "20px clamp(14px, 2.5vw, 22px)" }}>
        <div className="wiz-dots" aria-hidden />
        <div style={{ position: "relative" }}>
          <div className="wiz-head">
            <Sparkles size={14} /> {w.head}
          </div>
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 12, color: "var(--u-accent2)" }}>{w.done}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--u-dark-ink)", marginTop: 12 }}>{w.doneSub}</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <input className="k-field" placeholder="Your name" aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <textarea className="k-field" style={{ minHeight: 110, resize: "vertical" }} placeholder={w.hint} aria-label="Message" value={msg} onChange={(e) => setMsg(e.target.value)} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="cta" onClick={send} disabled={!msg.trim()}>
                  <Send size={13} /> {w.cta}
                </Button>
                {socials.email && (
                  <Button variant="ghost" onClick={copy} className="wiz-copy">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied!" : socials.email}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Well>
    </div>
  )
}
