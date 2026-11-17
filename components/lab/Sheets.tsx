"use client"
// Game-screen versions of the section cards (character sheet, inventory, quest log). Lab-only until approved.
import { useState, type CSSProperties } from "react"
import { useContent, type Project } from "@/lib/content"
import { Button, Chip, Bar } from "@/components/ui/kit"
import { MapPin, Mail, Globe, FileText } from "lucide-react"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { skillIcon } from "@/lib/itemIcons"
import ProjectCover from "@/components/ui/ProjectCover"

const icon = (n: string) => `/ui/icons/${n}.png`
export function Ico({ n, size = 3 }: { n: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={icon(n)} alt="" className="ico" style={{ width: 16 * size, height: 16 * size }} />
}

const tier = (l: number) => (l >= 88 ? { n: "LEGENDARY", c: "#f0b400" } : l >= 78 ? { n: "EPIC", c: "#a98bff" } : l >= 65 ? { n: "RARE", c: "#4aa3e8" } : { n: "UNCOMMON", c: "#5fc24a" })

export function AboutSheet({ world = "village" }: { world?: string }) {
  const c = useContent()
  const p = c.profile, s = c.socials
  const langs = new Set(c.projects.map((x) => x.language)).size
  const skillsN = c.skills.reduce((n, g) => n + g.items.length, 0)
  const top = c.skills.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).sort((a, b) => b.level - a.level).slice(0, 6)
  const stats = [
    { k: "QUESTS", v: c.projects.length, cap: 15, ic: "sword", sub: "projects shipped" },
    { k: "GUILDS", v: c.experience.length, cap: 6, ic: "scroll", sub: "roles & teams" },
    { k: "TONGUES", v: langs, cap: 8, ic: "book", sub: "languages" },
    { k: "SKILLS", v: skillsN, cap: 28, ic: "hammer", sub: "in the forge" },
  ]
  return (
    <section className="cs">
      <div className="cs-top">
        <div className="cs-medal">
          <span className="cs-flame cs-flame-l" aria-hidden /><span className="cs-flame cs-flame-r" aria-hidden /><div className="cs-face">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/ui/portrait-${world}.png`} alt={p.name} style={{ imageRendering: "pixelated" }} /></div>
          <span className="cs-lv">LV {new Date().getFullYear() - 2021}</span>
        </div>
        <div className="cs-id">
          <div className="cs-class"><Ico n="stamp" size={1} /> CLASS · {p.title.toUpperCase()}</div>
          <h2 className="cs-name">{p.name}</h2>
          <div className="cs-meta">
            <span><MapPin size={14} />{p.location}</span><span>{p.handle}</span>
            {p.available && <Chip color="#4ade80">Available for quests</Chip>}
          </div>
          <p className="cs-bio">{p.bio}</p>
        </div>
      </div>

      <div className="cs-grid">
        <div className="cs-box">
          <h3 className="cs-h"><Ico n="heart" size={2} />STATS</h3>
          {stats.map((st) => (
            <div key={st.k} className="cs-stat">
              <span className="cs-stat__ic"><Ico n={st.ic} size={2} /></span>
              <div className="cs-stat__body">
                <div className="cs-stat__row"><b>{st.k}</b><span>{st.sub}</span></div>
                <Bar value={st.v / st.cap} segments />
              </div>
              <em>{st.v}</em>
            </div>
          ))}
        </div>
        <div className="cs-box">
          <h3 className="cs-h"><Ico n="chest" size={2} />EQUIPMENT</h3>
          <div className="cs-slots">
            {top.map((sk) => {
              const t = tier(sk.level)
              return (
                <div key={sk.name} className="cs-slot" style={{ ["--c" as string]: t.c } as CSSProperties} title={`${sk.name}: ${t.n}`}>
                  <span className="cs-slot__gem" />
                  <Ico n={skillIcon(sk.name, sk.group)} size={3} />
                  <b>{sk.name}</b>
                  <i>{t.n}</i>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="cs-quest">
        <div className="cs-quest__ic"><Ico n="scroll-fire" size={3} /></div>
        <div className="cs-quest__txt">
          <div className="cs-quest__k">CURRENT QUEST</div>
          <p>{p.now}</p>
        </div>
        <div className="cs-creed">&ldquo;{p.motto}&rdquo;</div>
      </div>

      <div className="cs-links">
        {s.github && <Button href={s.github} variant="key"><Github size={14} /> GITHUB</Button>}
        {s.linkedin && <Button href={s.linkedin}><Linkedin size={14} /> LINKEDIN</Button>}
        {s.twitter && <Button href={s.twitter}><XLogo size={13} /> X</Button>}
        {s.website && <Button href={s.website}><Globe size={14} /> WEBSITE</Button>}
        {s.email && <Button href={`mailto:${s.email}`}><Mail size={14} /> EMAIL</Button>}
        {p.resumeUrl && <Button href={p.resumeUrl} variant="cta"><FileText size={14} /> RESUME</Button>}
      </div>
    </section>
  )
}

const RARITY = [{ n: "LEGENDARY", c: "#f0b400" }, { n: "EPIC", c: "#a98bff" }, { n: "RARE", c: "#4aa3e8" }, { n: "COMMON", c: "#9aa68a" }]

export function ProjectsInventory() {
  const { projects } = useContent()
  const list = projects.slice(0, 6)
  return (
    <section className="inv">
      <div className="inv-head"><Ico n="chest-big" size={2} /> <b>INVENTORY</b> <span>{projects.length} items collected</span></div>
      <div className="inv-grid">
        {list.map((pj, i) => {
          const r = i < 2 && pj.featured ? RARITY[0] : RARITY[1 + (i % 3)]
          return (
            <article key={pj.id} className="inv-card" style={{ ["--r" as string]: r.c } as CSSProperties} data-rare={r.n.toLowerCase()}>
              <div className="inv-cover"><ProjectCover project={pj} height={128} /><span className="inv-tag">{r.n}</span>{pj.featured && <i className="inv-spark" aria-hidden />}</div>
              <div className="inv-body">
                <div className="inv-t">{pj.title}</div>
                <p>{pj.tagline}</p>
                <div className="inv-chips">{pj.tech.slice(0, 3).map((t) => <Chip key={t}>{t}</Chip>)}</div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
function when(s: string): number | null {
  const m = s.toLowerCase().match(/([a-z]{3})\w*\s+(\d{4})/)
  return m && MONTHS.includes(m[1]) ? new Date(Number(m[2]), MONTHS.indexOf(m[1]) + 1, 0).getTime() : null
}
function progress(start: string, end: string, now: number) {
  const a = when(start), b = when(end)
  if (a === null || b === null) return 0.5
  return Math.max(0.05, Math.min(0.97, (now - a) / Math.max(1, b - a)))
}

export function QuestLog() {
  const { experience } = useContent()
  const [now] = useState(() => Date.now())
  return (
    <section className="ql">
      <div className="inv-head"><Ico n="scroll" size={2} /> <b>QUEST LOG</b> <span>{experience.length} chapters</span></div>
      {experience.map((e, i) => {
        const endT = when(e.end)
        const open = /present|now/i.test(e.end)
        const active = open || (endT !== null && endT > now)
        const pr = active ? progress(e.start, open ? "Dec 2099" : e.end, now) : 1
        return (
          <article key={e.id} className="ql-q" data-active={active ? "" : undefined}>
            <div className="ql-seal"><Ico n={active ? ["scroll-fire", "scroll-ice", "scroll-thunder"][i % 3] : e.kind === "leadership" ? "cup-gold" : "chest"} size={3} /></div>
            <div className="ql-main">
              <div className="ql-top">
                <span className="ql-state">{active ? "ACTIVE QUEST" : "COMPLETED"}</span>
                {e.kind && <span className="ql-kind">{e.kind === "leadership" ? "LEADERSHIP" : "INTERNSHIP"}</span>}
                <span className="ql-dates">{[e.start, e.end].filter(Boolean).join(" — ")}</span>
              </div>
              <div className="ql-role">{e.role}</div>
              <div className="ql-org">Chapter {["I", "II", "III", "IV", "V"][experience.length - 1 - i] ?? i + 1} · {e.org}{e.location ? ` · ${e.location}` : ""}</div>
              {e.description && <p>{e.description}</p>}
              <div className="ql-prog"><Bar value={pr} segments /><span>{active ? `${Math.round(pr * 100)}% of the term` : "QUEST COMPLETE"}</span></div>
              {e.highlights.length > 0 && <ul>{e.highlights.map((h) => <li key={h}><i data-done={!active ? "" : undefined} />{h}</li>)}</ul>}
              {e.shipped && e.shipped.length > 0 && (
                <div className="ql-ship"><b>SHIPPED</b>
                  {e.shipped.map((s) => {
                    const href = s.projectId ? `/quick/${s.projectId}` : s.url
                    return href ? <a key={s.label} href={href} target={s.projectId ? undefined : "_blank"} rel="noreferrer" className="ql-chip">{s.label} ↗</a> : <Chip key={s.label}>{s.label}</Chip>
                  })}
                </div>
              )}
              {e.tech.length > 0 && <div className="ql-reward"><b>REWARDS</b>{e.tech.slice(0, 6).map((t) => <Chip key={t}>{t}</Chip>)}</div>}
            </div>
          </article>
        )
      })}
    </section>
  )
}
