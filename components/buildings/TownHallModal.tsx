"use client"
import { useContent } from "@/lib/content"
import { SectionHeader, Card, Chip, LinkBtn, INK, Pill } from "./ui"
import { ScrollText, MapPin, Sparkles, Mail, Globe, FileText, Rocket, Quote } from "lucide-react"
import { Github, Linkedin, XLogo } from "@/components/icons"

const BLUE = "#3a6ea5"

export default function TownHallModal() {
  const c = useContent()
  const p = c.profile
  const s = c.socials
  const langs = new Set(c.projects.map((x) => x.language))

  const stats = [
    { k: "QUESTS", v: c.projects.length, sub: "selected projects" },
    { k: "GUILDS", v: c.experience.length, sub: "roles & teams" },
    { k: "TONGUES", v: langs.size, sub: "languages shipped" },
    { k: "SKILLS", v: c.skills.reduce((n, g) => n + g.items.length, 0), sub: "in the forge" },
  ]

  return (
    <div style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<ScrollText size={22} />} accent={BLUE}
        title="TOWN HALL" subtitle="The hero's chronicle"
        right={p.available ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 14, color: "#2f6b2a", background: "#d8ecc0", border: "2px solid #4d9a3f", padding: "6px 10px" }}>
            <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: 8, background: "#4ade80" }} />
            Available
          </span>
        ) : undefined}
      />

      {/* hero */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, alignItems: "start", marginBottom: 22 }} className="th-hero">
        <div style={{ position: "relative" }}>
          <div style={{
            width: 118, height: 118, border: `3px solid ${INK.ink}`, background: "#2a1a40",
            boxShadow: `0 0 0 3px ${INK.cardAlt}, 0 0 0 5px ${INK.ink}, 0 8px 0 5px rgba(0,0,0,.15)`,
            overflow: "hidden",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)" }}>
            <Pill bg="#c8463b">LV {new Date().getFullYear() - 2021}</Pill>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: "clamp(16px, 2.6vw, 24px)", color: INK.ink, lineHeight: 1.3 }}>{p.name}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 18, color: BLUE, marginTop: 8, fontWeight: 600 }}>{p.title}</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontFamily: "var(--font-body)", fontSize: 15, color: INK.muted }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={14} />{p.location}</span>
            <span>{p.handle}</span>
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.6, color: INK.body, margin: "14px 0 0" }}>{p.bio}</p>
        </div>
      </div>

      {/* now + motto */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 22 }}>
        <Card accent="#c8463b" style={{ padding: "16px 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-pixel)", fontSize: 8, color: "#c8463b", letterSpacing: 1, marginBottom: 10 }}>
            <Rocket size={14} /> CURRENT QUEST
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: INK.ink, lineHeight: 1.5 }}>{p.now}</div>
        </Card>
        <Card accent={BLUE} style={{ padding: "16px 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-pixel)", fontSize: 8, color: BLUE, letterSpacing: 1, marginBottom: 10 }}>
            <Quote size={14} /> CREED
          </div>
          <div style={{ fontFamily: "var(--font-vt)", fontSize: 24, color: INK.ink, lineHeight: 1.1 }}>&ldquo;{p.motto}&rdquo;</div>
        </Card>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 22 }}>
        {stats.map((st) => (
          <div key={st.k} style={{ background: INK.ink, color: INK.cream, padding: "14px 14px 12px", border: `2px solid ${INK.ink}`, boxShadow: "inset 0 0 0 2px #5c3a1c" }}>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 22, color: "#ffd76a" }}>{st.v}</div>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: 1, marginTop: 10 }}>{st.k}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#d9c39a", marginTop: 3 }}>{st.sub}</div>
          </div>
        ))}
      </div>

      {/* interests */}
      {p.interests.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          <Sparkles size={15} color={INK.muted} />
          {p.interests.map((i) => <Chip key={i}>{i}</Chip>)}
        </div>
      )}

      {/* links */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {s.github && <LinkBtn href={s.github} primary color={INK.ink}><Github size={14} /> GITHUB</LinkBtn>}
        {s.linkedin && <LinkBtn href={s.linkedin}><Linkedin size={14} /> LINKEDIN</LinkBtn>}
        {s.twitter && <LinkBtn href={s.twitter}><XLogo size={13} /> X</LinkBtn>}
        {s.website && <LinkBtn href={s.website}><Globe size={14} /> WEBSITE</LinkBtn>}
        {s.email && <LinkBtn href={`mailto:${s.email}`}><Mail size={14} /> EMAIL</LinkBtn>}
        {p.resumeUrl && <LinkBtn href={p.resumeUrl} primary><FileText size={14} /> RESUME</LinkBtn>}
      </div>

      <style>{`@media (max-width: 560px) { .th-hero { grid-template-columns: 1fr !important; justify-items: center; text-align: center; } }`}</style>
    </div>
  )
}
