"use client"
// World-specific layouts for the section cards. Same data, same icons; different furniture:
//   city   ID pass + system-monitor kiosk, app-store tiles, metro line
//   desert cartouche stele, relic tablets on a shelf, caravan route with oases
//   ruins  memorial plaque with candles, memory jars, epitaph timeline
import type { CSSProperties } from "react"
import { useContent, type Project } from "@/lib/content"
import { Button, Chip, Bar } from "@/components/ui/kit"
import { MapPin, Mail, Globe, FileText } from "lucide-react"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { skillIcon } from "@/lib/itemIcons"
import ProjectCover from "@/components/ui/ProjectCover"
import { Ico } from "./Ico"

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
export function when(s: string): number | null {
  const m = s.toLowerCase().match(/([a-z]{3})\w*\s+(\d{4})/)
  return m && MONTHS.includes(m[1]) ? new Date(Number(m[2]), MONTHS.indexOf(m[1]) + 1, 0).getTime() : null
}
const passNo = (name: string) => { let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 100000; return String(h).padStart(5, "0").replace(/(\d{2})(\d{3})/, "$1-$2") }

function useData() {
  const c = useContent()
  const langs = new Set(c.projects.map((x) => x.language)).size
  const skillsN = c.skills.reduce((n, g) => n + g.items.length, 0)
  const top = c.skills.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).sort((a, b) => b.level - a.level).slice(0, 6)
  const stats = [
    { k: "QUESTS", v: c.projects.length, cap: 20, ic: "sword", sub: "projects shipped" },
    { k: "GUILDS", v: c.experience.length, cap: 6, ic: "scroll", sub: "roles & teams" },
    { k: "TONGUES", v: langs, cap: 8, ic: "book", sub: "languages" },
    { k: "SKILLS", v: skillsN, cap: 28, ic: "hammer", sub: "in the forge" },
  ]
  return { c, p: c.profile, s: c.socials, top, stats }
}

function Links() {
  const { s, p } = useData()
  return (
    <div className="cs-links">
      {s.github && <Button href={s.github} variant="key"><Github size={14} /> GITHUB</Button>}
      {s.linkedin && <Button href={s.linkedin}><Linkedin size={14} /> LINKEDIN</Button>}
      {s.twitter && <Button href={s.twitter}><XLogo size={13} /> X</Button>}
      {s.website && <Button href={s.website}><Globe size={14} /> WEBSITE</Button>}
      {s.email && <Button href={`mailto:${s.email}`}><Mail size={14} /> EMAIL</Button>}
      {p.resumeUrl && <Button href={p.resumeUrl} variant="cta"><FileText size={14} /> RESUME</Button>}
    </div>
  )
}

/* ═══════════════ NEON HARBOR ═══════════════ */
export function AboutCity() {
  const { p, top, stats } = useData()
  return (
    <section className="cs cs-city">
      <div className="idp">
        <i className="idp-slot" />
        <div className="idp-head"><b>HARBOR PASS</b><span>RESIDENT · CLASS A</span><i className="idp-seal" aria-hidden /></div>
        <div className="idp-body">
          <div className="idp-photo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/ui/portrait-city.png" alt={p.name} /><i className="idp-holo" /><em>LV {new Date().getFullYear() - 2021}</em></div>
          <div className="idp-fields">
            <div className="idp-f"><span>NAME</span><b className="idp-name">{p.name}</b></div>
            <div className="idp-f"><span>ROLE</span><b>{p.title}</b></div>
            <div className="idp-f idp-f2"><div><span>BASE</span><b><MapPin size={12} /> {p.location}</b></div><div><span>HANDLE</span><b>{p.handle}</b></div></div>
            <p className="idp-bio">{p.bio}</p>
          </div>
        </div>
        <div className="idp-strip" aria-hidden />
        <div className="idp-foot"><span>No. {passNo(p.name)}</span><span className="idp-code" aria-hidden />{p.available && <Chip color="#7dffb0">Available</Chip>}</div>
      </div>
      <div className="kiosk">
        <div className="kwin">
          <div className="kbar"><i /><i /><i /><b>SYSTEM MONITOR</b></div>
          <div className="kbody">
            {stats.map((st) => (
              <div key={st.k} className="kstat"><span><Ico n={st.ic} size={1} /> {st.k}</span><Bar value={st.v / st.cap} segments /><em>{st.v}</em></div>
            ))}
          </div>
        </div>
        <div className="kwin">
          <div className="kbar"><i /><i /><i /><b>DOCK</b></div>
          <div className="kbody dock">
            {top.map((sk) => <div key={sk.name} className="app" title={sk.name}><span><Ico n={skillIcon(sk.name, sk.group)} size={3} /></span><b>{sk.name}</b></div>)}
          </div>
        </div>
        <div className="kwin kwin-wide">
          <div className="kbar"><i /><i /><i /><b>NOW RUNNING</b></div>
          <div className="kbody proc"><span className="proc-run">▶ PID 0042</span><p>{p.now}</p><q>{p.motto}</q></div>
        </div>
      </div>
      <Links />
    </section>
  )
}

export function InventoryCity({ projects }: { projects: Project[] }) {
  const hero = projects.find((x) => x.featured) ?? projects[0]
  const rest = projects.filter((x) => x.id !== hero.id)
  return (
    <section className="inv inv-city">
      <div className="inv-head"><Ico n="chest-big" size={2} /> <b>APP STORE</b> <span>{projects.length} apps installed</span></div>
      <article className="billboard"><div className="bb-lights" aria-hidden /><ProjectCover project={hero} height={190} badge={false} /><div className="bb-txt"><small>NOW SHOWING</small><b>{hero.title}</b><p>{hero.tagline}</p><span className="bb-btn">OPEN</span></div></article>
      <div className="apps">
        {rest.slice(0, 6).map((pj, i) => (
          <article key={pj.id} className="apptile">
            <div className="apptile-ic"><ProjectCover project={pj} height={84} badge={false} /></div>
            <div className="apptile-b"><b>{pj.title}</b><small>{pj.category}</small><div className="stars" aria-label="rating">{"★★★★★".split("").map((s2, k) => <i key={k} data-on={k < 3 + (i % 3) ? "" : undefined}>{s2}</i>)}</div><div className="apptile-t">{pj.tech.slice(0, 2).map((t) => <Chip key={t}>{t}</Chip>)}</div></div>
            <span className="apptile-go">{i % 2 ? "GET" : "OPEN"}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export function QuestCity({ items }: { items: LogItem[] }) {
  const cols = ["#ff4fa3", "#5de6ff", "#9dff7a"]
  return (
    <section className="ql ql-city">
      <div className="inv-head"><Ico n="scroll" size={2} /> <b>METRO · CAREER LINE</b> <span>{items.length} stations</span></div>
      <div className="metro">
        {items.map((it, i) => (
          <article key={it.e.id} className="station" style={{ ["--lc" as string]: cols[i % 3] } as CSSProperties} data-active={it.active ? "" : undefined}>
            <i className="station-dot" aria-hidden />
            <div className="station-card">
              <div className="station-top"><span className="line-badge">{i + 1}</span><b>{it.e.org}</b><em>{[it.e.start, it.e.end].filter(Boolean).join(" → ")}</em></div>
              <div className="station-role">{it.e.role}</div>
              {it.e.description && <p>{it.e.description}</p>}
              {it.e.highlights.length > 0 && <ul>{it.e.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
              <Shipped e={it.e} />
              {it.e.tech.length > 0 && <div className="station-t">{it.e.tech.slice(0, 6).map((t) => <Chip key={t}>{t}</Chip>)}</div>}
            </div>
          </article>
        ))}
        <div className="station station-end"><i className="station-dot" aria-hidden /><div className="station-next">NEXT STOP · <b>YOU?</b></div></div>
      </div>
    </section>
  )
}

/* ═══════════════ SUNSCAR OASIS ═══════════════ */
const notches = (v: number, cap: number) => Math.max(1, Math.round((v / cap) * 12))
export function AboutDesert() {
  const { p, top, stats } = useData()
  return (
    <section className="cs cs-desert">
      <div className="stele">
        <div className="stele-sun" aria-hidden />
        <div className="stele-arch">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/ui/portrait-desert.png" alt={p.name} /></div>
        <div className="stele-lv">LV {new Date().getFullYear() - 2021}</div>
        <h2 className="stele-name"><span>{p.name}</span></h2>
        <div className="stele-title">{p.title}</div>
        <div className="stele-meta"><span><MapPin size={14} /> {p.location}</span><span>{p.handle}</span>{p.available && <Chip color="#16a89e">Available</Chip>}</div>
        <div className="fret" aria-hidden />
        <p className="stele-bio">{p.bio}</p>
        <div className="stele-cols">
          <div className="tablet"><h3>DEEDS CARVED</h3>
            {stats.map((st) => (
              <div key={st.k} className="carve"><b>{st.k}</b><span className="notch-row">{Array.from({ length: 12 }).map((_, i) => <i key={i} data-on={i < notches(st.v, st.cap) ? "" : undefined} />)}</span><em>{st.v}</em></div>
            ))}
          </div>
          <div className="tablet"><h3>TOOLS OF THE TRADE</h3>
            <div className="glyphs">{top.map((sk) => <div key={sk.name} className="glyph" title={sk.name}><Ico n={skillIcon(sk.name, sk.group)} size={3} /><b>{sk.name}</b></div>)}</div>
          </div>
        </div>
        <div className="papyrus"><div className="papyrus-k">THE CURRENT JOURNEY</div><p>{p.now}</p><q>{p.motto}</q></div>
      </div>
      <Links />
    </section>
  )
}

export function InventoryDesert({ projects }: { projects: Project[] }) {
  const list = projects.slice(0, 6)
  const rows = [list.slice(0, 3), list.slice(3, 6)]
  return (
    <section className="inv inv-desert">
      <div className="inv-head"><Ico n="chest-big" size={2} /> <b>RELIC HALL</b> <span>{projects.length} tablets recovered</span></div>
      {rows.map((row, r) => (
        <div key={r} className="shelf">
          {row.map((pj, i) => (
            <article key={pj.id} className="relic" data-hero={pj.featured && r === 0 && i === 0 ? "" : undefined}>
              <div className="relic-niche"><ProjectCover project={pj} height={150} badge={false} /></div>
              <div className="relic-carve"><b>{pj.title}</b><small>{pj.category}</small></div>
              <p>{pj.tagline}</p>
              <div className="relic-t">{pj.tech.slice(0, 2).map((t) => <Chip key={t}>{t}</Chip>)}</div>
            </article>
          ))}
          <i className="shelf-ledge" aria-hidden />
        </div>
      ))}
    </section>
  )
}

export function QuestDesert({ items }: { items: LogItem[] }) {
  return (
    <section className="ql ql-desert">
      <div className="inv-head"><Ico n="scroll" size={2} /> <b>CARAVAN ROUTE</b> <span>{items.length} oases</span></div>
      <div className="route">
        {items.map((it, i) => (
          <article key={it.e.id} className="oasis" data-side={i % 2 ? "r" : "l"}>
            <div className="oasis-pool" aria-hidden><i /><Ico n={it.e.kind === "leadership" ? "cup-gold" : "chest"} size={2} /></div>
            <div className="scroll-card">
              <div className="scroll-top"><b>{it.e.org}</b><em>{[it.e.start, it.e.end].filter(Boolean).join(" — ")}</em></div>
              <div className="scroll-role">{it.e.role}</div>
              {it.e.description && <p>{it.e.description}</p>}
              {it.e.highlights.length > 0 && <ul>{it.e.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
              <Shipped e={it.e} />
              {it.e.tech.length > 0 && <div className="station-t">{it.e.tech.slice(0, 6).map((t) => <Chip key={t}>{t}</Chip>)}</div>}
            </div>
          </article>
        ))}
        <div className="oasis oasis-end"><div className="oasis-pool" aria-hidden><i /></div><div className="route-next">THE ROAD CONTINUES…</div></div>
      </div>
    </section>
  )
}

/* ═══════════════ HOLLOW REACH ═══════════════ */
export function AboutRuins() {
  const { p, top, stats } = useData()
  return (
    <section className="cs cs-ruins">
      <div className="memo">
        <div className="memo-candles" aria-hidden><i /><i /></div>
        <div className="memo-arch">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/ui/portrait-ruins.png" alt={p.name} /></div>
        <div className="memo-kicker">IN LIVING MEMORY OF</div>
        <h2 className="memo-name">{p.name}</h2>
        <div className="memo-dates">{p.title} · LV {new Date().getFullYear() - 2021} · {p.location}</div>
        <div className="memo-runes" aria-hidden>ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ</div>
        <p className="memo-bio">{p.bio}</p>
        {p.available && <Chip color="#5fd0a0">Still answering the living</Chip>}
        <div className="memo-grid">
          <div className="memo-box"><h3>VIRTUES</h3>
            {stats.map((st) => <div key={st.k} className="virtue"><span><Ico n={st.ic} size={1} /> {st.k}</span><span className="pips">{Array.from({ length: 10 }).map((_, i) => <i key={i} data-on={i < Math.max(1, Math.round((st.v / st.cap) * 10)) ? "" : undefined} />)}</span><em>{st.v}</em></div>)}
          </div>
          <div className="memo-box"><h3>RELICS</h3>
            <div className="niches">{top.map((sk) => <div key={sk.name} className="niche" title={sk.name}><Ico n={skillIcon(sk.name, sk.group)} size={3} /><b>{sk.name}</b></div>)}</div>
          </div>
        </div>
        <div className="memo-note"><b>UNFINISHED BUSINESS</b><p>{p.now}</p><q>{p.motto}</q></div>
      </div>
      <Links />
    </section>
  )
}

export function InventoryRuins({ projects }: { projects: Project[] }) {
  return (
    <section className="inv inv-ruins">
      <div className="inv-head"><Ico n="chest-big" size={2} /> <b>MEMORY VAULT</b> <span>{projects.length} memories bottled</span></div>
      <div className="jars">
        {projects.slice(0, 6).map((pj, i) => (
          <article key={pj.id} className="jar" style={{ ["--d" as string]: `${i * 0.7}s` } as CSSProperties}>
            <i className="jar-cork" aria-hidden />
            <div className="jar-glass"><ProjectCover project={pj} height={150} badge={false} /><i className="jar-shine" aria-hidden /><i className="jar-mote" aria-hidden /></div>
            <div className="jar-label"><b>{pj.title}</b><small>{pj.year} · {pj.category}</small></div>
            <p>{pj.tagline}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function QuestRuins({ items }: { items: LogItem[] }) {
  return (
    <section className="ql ql-ruins">
      <div className="inv-head"><Ico n="scroll" size={2} /> <b>EPITAPHS</b> <span>{items.length} lives lived at work</span></div>
      <div className="epi">
        {items.map((it) => (
          <article key={it.e.id} className="grave">
            <div className="grave-top"><small>HERE WORKED</small><b>{it.e.role}</b><span>{it.e.org} · {[it.e.start, it.e.end].filter(Boolean).join(" – ")}</span></div>
            <div className="grave-body">
              {it.e.description && <p>{it.e.description}</p>}
              {it.e.highlights.length > 0 && <ul>{it.e.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
              <Shipped e={it.e} />
              {it.e.tech.length > 0 && <div className="station-t">{it.e.tech.slice(0, 6).map((t) => <Chip key={t}>{t}</Chip>)}</div>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ── shared ── */
export interface LogItem { e: import("@/lib/content").Experience; active: boolean }
export function Shipped({ e }: { e: import("@/lib/content").Experience }) {
  if (!e.shipped || e.shipped.length === 0) return null
  return (
    <div className="ql-ship"><b>SHIPPED</b>
      {e.shipped.map((s) => {
        const href = s.projectId ? `/quick/${s.projectId}` : s.url
        return href ? <a key={s.label} href={href} target={s.projectId ? undefined : "_blank"} rel="noreferrer" className="ql-chip">{s.label} ↗</a> : <Chip key={s.label}>{s.label}</Chip>
      })}
    </div>
  )
}
