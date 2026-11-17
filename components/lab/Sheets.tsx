"use client"
// Game-screen versions of the section cards (character sheet, inventory, quest log). Lab-only until approved.
import type { CSSProperties } from "react"
import { useContent } from "@/lib/content"
import { Button, Chip, Bar } from "@/components/ui/kit"
import { MapPin, Mail, Globe, FileText } from "lucide-react"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { ProjectCover } from "@/components/buildings/ui"

const icon = (n: string) => `/ui/icons/${n}.png`
export function Ico({ n, size = 3 }: { n: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={icon(n)} alt="" className="ico" style={{ width: 16 * size, height: 16 * size }} />
}

const GEAR = ["sword", "magicwand", "hammer", "book", "bow", "pickaxe"]
const tier = (l: number) => (l >= 88 ? { n: "LEGENDARY", c: "#f0b400" } : l >= 78 ? { n: "EPIC", c: "#a98bff" } : l >= 65 ? { n: "RARE", c: "#4aa3e8" } : { n: "UNCOMMON", c: "#5fc24a" })

export function AboutSheet() {
  const c = useContent()
  const p = c.profile, s = c.socials
  const langs = new Set(c.projects.map((x) => x.language)).size
  const skillsN = c.skills.reduce((n, g) => n + g.items.length, 0)
  const top = c.skills.flatMap((g) => g.items).sort((a, b) => b.level - a.level).slice(0, 6)
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
          <div className="cs-face">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.avatar} alt={p.name} /></div>
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
            {top.map((sk, i) => {
              const t = tier(sk.level)
              return (
                <div key={sk.name} className="cs-slot" style={{ ["--c" as string]: t.c } as CSSProperties} title={`${sk.name}: ${t.n}`}>
                  <span className="cs-slot__gem" />
                  <Ico n={GEAR[i % GEAR.length]} size={3} />
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
          const r = pj.featured ? RARITY[0] : RARITY[1 + (i % 3)]
          return (
            <article key={pj.id} className="inv-card" style={{ ["--r" as string]: r.c } as CSSProperties} data-rare={r.n.toLowerCase()}>
              <div className="inv-cover"><ProjectCover p={pj} height={118} /><span className="inv-item"><Ico n={["chest-big", "scroll-thunder", "potion", "coin"][RARITY.indexOf(r)]} size={4} /></span><span className="inv-tag">{r.n}</span>{pj.featured && <i className="inv-spark" aria-hidden />}</div>
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

export function QuestLog() {
  const { experience } = useContent()
  return (
    <section className="ql">
      <div className="inv-head"><Ico n="scroll" size={2} /> <b>QUEST LOG</b> <span>{experience.length} chapters</span></div>
      {experience.map((e, i) => {
        const active = e.end.toLowerCase() === "present"
        return (
          <article key={e.id} className="ql-q" data-active={active ? "" : undefined}>
            <div className="ql-seal"><Ico n={active ? ["scroll-fire", "scroll-ice", "scroll-thunder", "scroll-plant"][i % 4] : "chest"} size={3} /></div>
            <div className="ql-main">
              <div className="ql-top">
                <span className="ql-state">{active ? "ACTIVE QUEST" : "COMPLETED"}</span>
                <span className="ql-dates">{[e.start, e.end].filter(Boolean).join(" — ")}</span>
              </div>
              <div className="ql-role">{e.role}</div>
              <div className="ql-org">Chapter {["I", "II", "III", "IV", "V"][experience.length - 1 - i] ?? i + 1} · {e.org}{e.location ? ` · ${e.location}` : ""}</div>
              {e.description && <p>{e.description}</p>}
              <ul>{e.highlights.slice(0, 3).map((h) => <li key={h}><i data-done={!active ? "" : undefined} />{h}</li>)}</ul>
              <div className="ql-reward"><b>REWARDS</b>{e.tech.slice(0, 5).map((t) => <Chip key={t}>{t}</Chip>)}</div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
