"use client"
import { useContent } from "@/lib/content"
import { useSection, useWorldTheme, VOCAB } from "@/lib/theme"
import { SectionHeader, Card, Chip, LinkBtn, Pill } from "./ui"
import { Well } from "@/components/ui/kit"
import { ScrollText, MapPin, Sparkles, Mail, Globe, FileText, Rocket, Quote } from "lucide-react"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { useGameStore } from "@/lib/store"

/** a stable, pass-looking number from the hero's name */
function passNo(name: string) {
  let h = 7
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 100000
  return `${String(h).padStart(5, "0").replace(/(\d{2})(\d{3})/, "$1-$2")}`
}

export default function TownHallModal() {
  const c = useContent()
  const p = c.profile
  const s = c.socials
  const langs = new Set(c.projects.map((x) => x.language))
  const sec = useSection("townhall", { title: "TOWN HALL", sub: "The hero's chronicle" })
  const th = useWorldTheme()
  const worldId = useGameStore((st) => st.world)
  const vocab = VOCAB[worldId] ?? VOCAB.village
  const a2 = th.sec.gallery

  const stats = [
    { k: "QUESTS", v: c.projects.length, sub: "selected projects" },
    { k: "GUILDS", v: c.experience.length, sub: "roles & teams" },
    { k: "TONGUES", v: langs.size, sub: "languages shipped" },
    { k: "SKILLS", v: c.skills.reduce((n, g) => n + g.items.length, 0), sub: "in the forge" },
  ]

  return (
    <div className="sec about" style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<ScrollText size={22} />} accent={sec.accent} kicker={sec.kicker}
        title={sec.title} subtitle={sec.sub}
        right={p.available ? (
          <span className="about-avail">
            <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: 8, background: "#4ade80" }} />
            Available
          </span>
        ) : undefined}
      />

      {/* the showpiece: a chronicle, an ID pass, a stele, a crypt niche */}
      <section className="about-hero" aria-label={`${p.name}, profile`}>
        <div className="about-deco" aria-hidden><i /><i /><i /><i /></div>
        <div className="about-portrait-wrap">
          <div className="about-portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt={p.name} />
          </div>
          <div className="about-lv"><Pill bg="var(--u-accent)">LV {new Date().getFullYear() - 2021}</Pill></div>
        </div>
        <div className="about-info">
          <div className="about-pass">{vocab.pass}</div>
          <div className="about-name">{p.name}</div>
          <div className="about-role" style={{ color: sec.accent }}>{p.title}</div>
          <div className="about-meta">
            <span><MapPin size={14} />{p.location}</span>
            <span>{p.handle}</span>
          </div>
          <p className="about-bio">{p.bio}</p>
        </div>
        <div className="about-foot" aria-hidden>
          <span>{vocab.pass}</span>
          <span className="about-no">No. {passNo(p.name)}</span>
          <span className="about-code" />
        </div>
      </section>

      {/* now + motto */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 22 }}>
        <Card accent="var(--u-danger)" style={{ padding: "16px 16px 14px" }}>
          <div className="about-card-k" style={{ color: "var(--u-link)" }}><Rocket size={14} /> CURRENT QUEST</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--u-ink)", lineHeight: 1.5 }}>{p.now}</div>
        </Card>
        <Card accent={a2} style={{ padding: "16px 16px 14px" }}>
          <div className="about-card-k" style={{ color: "var(--u-link)" }}><Quote size={14} /> CREED</div>
          <div className="about-creed">&ldquo;{p.motto}&rdquo;</div>
        </Card>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 22 }}>
        {stats.map((st) => (
          <Well key={st.k} className="about-stat" style={{ padding: "14px 14px 12px" }}>
            <div className="about-stat__v">{st.v}</div>
            <div className="about-stat__k">{st.k}</div>
            <div className="about-stat__s">{st.sub}</div>
          </Well>
        ))}
      </div>

      {/* interests */}
      {p.interests.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          <Sparkles size={15} color="var(--u-muted)" />
          {p.interests.map((i) => <Chip key={i}>{i}</Chip>)}
        </div>
      )}

      {/* links */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {s.github && <LinkBtn href={s.github} primary color="var(--u-dark)"><Github size={14} /> GITHUB</LinkBtn>}
        {s.linkedin && <LinkBtn href={s.linkedin}><Linkedin size={14} /> LINKEDIN</LinkBtn>}
        {s.twitter && <LinkBtn href={s.twitter}><XLogo size={13} /> X</LinkBtn>}
        {s.website && <LinkBtn href={s.website}><Globe size={14} /> WEBSITE</LinkBtn>}
        {s.email && <LinkBtn href={`mailto:${s.email}`}><Mail size={14} /> EMAIL</LinkBtn>}
        {p.resumeUrl && <LinkBtn href={p.resumeUrl} primary><FileText size={14} /> RESUME</LinkBtn>}
      </div>
    </div>
  )
}
