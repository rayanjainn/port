"use client"
// Per-world layouts for Skills, Education & Honours and Contact. Same data everywhere (components/art/cardData.ts),
// different furniture in each world:
//   Skills     village forge racks + gem slots · city system settings + LED meters · desert merchant's ledger · ruins spell book
//   Honours    village trophy room + diploma  · city leaderboard wall · desert treasure vault · ruins hall of lanterns
//   Contact    village letter + wax seal      · city phone chat       · desert falcon post   · ruins whisper lantern
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useContent } from "@/lib/content"
import { playSound } from "@/lib/audio"
import { Button } from "@/components/ui/kit"
import { Check, Copy, Send, Mail, Globe, Code, Trophy, ExternalLink } from "lucide-react"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { skillIcon } from "@/lib/itemIcons"
import { Ico } from "./Ico"
import { TIER_WORDS, channels, cgpa, eventName, groupCount, honourTier, mailto, skillTier, slug, tierCounts, topOf, years, type Channel, type Tier } from "./cardData"

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]
const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ".split("")

const chanIcon = (id: string, s = 16): ReactNode =>
  id === "email" ? <Mail size={s} aria-hidden /> : id === "github" ? <Github size={s} /> : id === "linkedin" ? <Linkedin size={s} /> : id === "x" ? <XLogo size={s - 2} /> : id === "web" ? <Globe size={s} aria-hidden /> : id === "leetcode" ? <Code size={s} aria-hidden /> : <Trophy size={s} aria-hidden />

function Head({ ic, title, sub }: { ic: string; title: string; sub: string }) {
  return <div className="inv-head"><Ico n={ic} size={2} /> <h2>{title}</h2> <span>{sub}</span></div>
}

/** 3 gems / LEDs / notches / runes: a tier is never shown as a percentage */
function Pips({ t, word, n = 3 }: { t: Tier; word: string; n?: number }) {
  return <span className="pips3" data-t={t} role="img" aria-label={`${word}, tier ${t} of 3`}>{Array.from({ length: n }, (_, i) => <i key={i} data-on={i < t ? "" : undefined} />)}</span>
}

/* ═══════════════════════════════ SKILLS ═══════════════════════════════ */
export function SkillsCard({ world, focus }: { world: string; focus?: string | null }) {
  const { skills } = useContent()
  const words = TIER_WORDS[world] ?? TIER_WORDS.village
  const total = groupCount(skills)
  const [c1, c2, c3] = tierCounts(skills)
  const refs = useRef<Record<string, HTMLElement | null>>({})
  useEffect(() => {
    if (!focus) return
    const el = refs.current[focus]
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 250)
  }, [focus])
  const reg = (g: string) => (el: HTMLElement | null) => { refs.current[g] = el }
  const legend = (
    <p className="sk-legend">
      <span><Pips t={3} word={words[2]} /> {words[2]} <b>{c3}</b></span>
      <span><Pips t={2} word={words[1]} /> {words[1]} <b>{c2}</b></span>
      <span><Pips t={1} word={words[0]} /> {words[0]} <b>{c1}</b></span>
    </p>
  )

  if (world === "city") {
    const go = (g: string) => refs.current[g]?.scrollIntoView({ behavior: "smooth", block: "start" })
    return (
      <section className="sk sk-city" aria-label="Skills">
        <div className="sys">
          <div className="kbar"><i /><i /><i /><b>SYSTEM SETTINGS › INSTALLED PACKAGES</b></div>
          <div className="sys-in">
            <nav className="sys-nav" aria-label="Skill groups">
              <span className="sys-nav__k">CATEGORIES</span>
              {skills.map((g) => <button key={g.group} type="button" onClick={() => go(g.group)}>{g.group}<em>{g.items.length}</em></button>)}
            </nav>
            <div className="sys-main">
              <div className="sys-sum"><h2>{total} packages installed</h2>{legend}</div>
              {skills.map((g) => (
                <section key={g.group} ref={reg(g.group)} className="sys-grp" data-focus={focus === g.group ? "" : undefined} aria-label={g.group}>
                  <h3><i aria-hidden />{g.group}<em>{g.items.length} pkgs</em></h3>
                  <ul className="sys-list">
                    {g.items.map((s) => { const t = skillTier(s.level); return (
                      <li key={s.name} className="pkg" data-t={t}><Ico n={skillIcon(s.name, g.group)} size={1} /><span className="pkg-n">{s.name}</span><Pips t={t} word={words[t - 1]} /></li>
                    ) })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (world === "desert") {
    return (
      <section className="sk sk-desert" aria-label="Skills">
        <div className="ledger">
          <div className="ledger-top"><h2>THE MERCHANT&rsquo;S LEDGER</h2><span>{total} glyphs carved in {skills.length} tablets</span></div>
          {legend}
          <div className="ledger-pages">
            {skills.map((g, gi) => (
              <section key={g.group} ref={reg(g.group)} className="ledger-page" data-focus={focus === g.group ? "" : undefined} aria-label={g.group}>
                <h3><span className="ledger-no" aria-hidden>{ROMAN[gi]}</span>{g.group}<em>{g.items.length}</em></h3>
                <ul>
                  {g.items.map((s) => { const t = skillTier(s.level); return (
                    <li key={s.name} className="lrow" data-t={t}><span className="glyph-tab" aria-hidden><Ico n={skillIcon(s.name, g.group)} size={1} /></span><b>{s.name}</b><i className="lead" aria-hidden /><Pips t={t} word={words[t - 1]} /></li>
                  ) })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (world === "ruins") {
    let k = 0
    return (
      <section className="sk sk-ruins" aria-label="Skills">
        <div className="grim">
          <div className="grim-top"><h2>THE SPELL BOOK</h2><span>{total} runes · {skills.length} chapters</span></div>
          {legend}
          <div className="grim-pages">
            {skills.map((g, gi) => (
              <section key={g.group} ref={reg(g.group)} className="spell" data-focus={focus === g.group ? "" : undefined} aria-label={g.group}>
                <h3><span aria-hidden>{RUNES[gi * 3]}</span> Chapter {ROMAN[gi]}<b>{g.group}</b></h3>
                <ul>
                  {g.items.map((s) => { const t = skillTier(s.level); const r = RUNES[k++ % RUNES.length]; return (
                    <li key={s.name} className="rune" data-t={t}><span className="rune-g" aria-hidden>{r}</span><span className="rune-n">{s.name}</span><small className="sr-only">{words[t - 1]}, tier {t} of 3</small></li>
                  ) })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // village: forge racks, item icons, gem-slot tiers
  return (
    <section className="sk sk-village" aria-label="Skills">
      <Head ic="hammer" title="THE FORGE RACKS" sub={`${total} tools on ${skills.length} racks`} />
      {legend}
      <div className="racks">
        {skills.map((g, gi) => (
          <section key={g.group} ref={reg(g.group)} className="rack" data-focus={focus === g.group ? "" : undefined} aria-label={g.group}>
            <h3 className="rack-h"><Ico n={["sword", "scroll-ice", "scroll-thunder", "chest", "hammer", "book"][gi % 6]} size={2} />{g.group}<em>{g.items.length}</em></h3>
            <ul className="rack-grid">
              {g.items.map((s) => { const t = skillTier(s.level); return (
                <li key={s.name} className="slot" data-t={t}><Ico n={skillIcon(s.name, g.group)} size={2} /><b>{s.name}</b><Pips t={t} word={words[t - 1]} /></li>
              ) })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════════ EDUCATION & HONOURS ═══════════════════════ */
function Linked({ href, className, children, label }: { href?: string; className: string; children: ReactNode; label?: string }) {
  if (!href) return <div className={className}>{children}</div>
  return <a href={href} target="_blank" rel="noreferrer" className={className} aria-label={label ? `${label} (opens in a new tab)` : undefined}>{children}</a>
}

export function HonoursCard({ world, focus }: { world: string; focus?: string | null }) {
  const { education, achievements } = useContent()
  const firsts = achievements.filter((a) => honourTier(a) === "first")
  const tops = achievements.filter((a) => honourTier(a) === "top")
  const badges = achievements.filter((a) => honourTier(a) === "badge")
  const anchor = (el: HTMLElement | null) => { if (el && focus === "honours") setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 250) }
  const main = education[0]
  const rest = education.slice(1)
  const score = (e: typeof main, big = true) => { const c = e && cgpa(e); return c ? (
    <div className="cg" role="group" aria-label={`CGPA ${c.last} out of ${c.scale}${c.avg ? `, average ${c.avg}` : ""}`}>
      <small>CGPA</small><b className={big ? "cg-n" : ""}>{c.last}</b><span>/ {c.scale} last semester{c.avg ? ` · ${c.avg} average` : ""}</span>
    </div>
  ) : e?.note ? <p className="edu-note">{e.note}</p> : null }
  const eduLine = (e: typeof main) => `${e.degree}${e.field ? ` · ${e.field}` : ""}`
  const top = (a: (typeof achievements)[number]) => { const t = topOf(a); return t ? <><b>{t.rank}</b>{t.of && <span> of {t.of}</span>}</> : <b>{a.title}</b> }

  if (world === "city") {
    return (
      <section className="hn hn-city" aria-label="Education and honours">
        <div className="sys">
          <div className="kbar"><i /><i /><i /><b>ACHIEVEMENTS WALL · LEADERBOARD</b></div>
          <div className="lb-in">
            {main && (
              <div className="trn">
                <div className="trn-main"><small>PRIMARY PROGRAMME</small><h2>{eduLine(main)}</h2><p>{main.school}</p><span className="trn-yr">{years(main)}</span></div>
                {score(main)}
              </div>
            )}
            {rest.length > 0 && <ul className="trn-rest">{rest.map((e) => <li key={e.id}><b>{e.degree}{e.field ? ` · ${e.field}` : ""}</b><span>{e.school}</span><em>{years(e)}</em></li>)}</ul>}
            <div ref={anchor} />
            <h3 className="lb-h">RANK 1 · FIRST PLACE <em>{firsts.length}</em></h3>
            <ol className="lb">
              {firsts.map((a) => (
                <li key={a.id}><Linked href={a.url} className="lb-row" data-r="first" label={a.title}>
                  <span className="lb-rank" aria-hidden>★</span><span className="lb-ev"><b>{eventName(a)}</b><small>{a.issuer}{a.note ? ` · ${a.note}` : ""}</small></span><span className="lb-score">1ST PLACE</span><span className="lb-yr">{a.date}</span>{a.url && <ExternalLink size={14} aria-hidden />}
                </Linked></li>
              ))}
            </ol>
            <h3 className="lb-h lb-h2">RANK 2 · TOP FINISHES <em>{tops.length}</em></h3>
            <ol className="lb">
              {tops.map((a) => (
                <li key={a.id}><Linked href={a.url} className="lb-row" data-r="top" label={a.title}>
                  <span className="lb-rank" aria-hidden>▲</span><span className="lb-ev"><b>{a.kind === "package" ? a.title : eventName(a)}</b><small>{a.issuer}{a.kind === "package" ? ` · ${a.note ?? ""}` : ""}</small></span><span className="lb-score">{a.kind === "package" ? "RELEASED" : <>{top(a)}</>}</span><span className="lb-yr">{a.date}</span>{a.url && <ExternalLink size={14} aria-hidden />}
                </Linked></li>
              ))}
            </ol>
            <h3 className="lb-h lb-h3">UNLOCKED BADGES <em>{badges.length}</em></h3>
            <ul className="lb-badges">{badges.map((a) => <li key={a.id}><Linked href={a.url} className="lb-badge" label={`${a.title}, ${a.issuer}`}><i aria-hidden />{a.title}<small>{a.issuer}</small></Linked></li>)}</ul>
          </div>
        </div>
      </section>
    )
  }

  if (world === "desert") {
    return (
      <section className="hn hn-desert" aria-label="Education and honours">
        <div className="vault">
          <div className="vault-door" aria-hidden />
          <div className="vault-top"><h2>THE TREASURE VAULT</h2><span>{firsts.length} golden idols · {tops.length} seals · {badges.length} scarabs</span></div>
          {main && (
            <div className="stele-edu">
              <div><small>THE GREAT STUDY</small><h3>{eduLine(main)}</h3><p>{main.school}</p><em>{years(main)}</em></div>
              {score(main)}
            </div>
          )}
          {rest.length > 0 && <ul className="tabl-rest">{rest.map((e) => <li key={e.id}><b>{e.degree}{e.field ? ` · ${e.field}` : ""}</b><span>{e.school}</span><em>{years(e)}</em></li>)}</ul>}
          <div ref={anchor} />
          <h3 className="vault-h">GOLDEN IDOLS <em>first places</em></h3>
          <ul className="idols">
            {firsts.map((a) => (
              <li key={a.id}><Linked href={a.url} className="idol" label={a.title}>
                <span className="idol-fig" aria-hidden><Ico n="cup-gold" size={3} /></span><b>{eventName(a)}</b><small>{a.issuer} · {a.date}</small>{a.note && <p>{a.note}</p>}
              </Linked></li>
            ))}
          </ul>
          <h3 className="vault-h">CLAY SEALS <em>top finishes</em></h3>
          <ul className="seals">
            {tops.map((a) => (
              <li key={a.id}><Linked href={a.url} className="seal" label={a.title}>
                <span className="seal-disc" aria-hidden>{a.kind === "package" ? <Ico n="chest" size={2} /> : <Ico n="cup-silver" size={2} />}</span>
                <span className="seal-txt">{a.kind === "package" ? <><b>{a.title}</b><small>{a.note}</small></> : <>{top(a)}<small>{eventName(a)} · {a.issuer}</small></>}</span>
              </Linked></li>
            ))}
          </ul>
          <h3 className="vault-h">SCARABS <em>badges</em></h3>
          <ul className="scarabs">{badges.map((a) => <li key={a.id}><Linked href={a.url} className="scarab" label={`${a.title}, ${a.issuer}`}><i aria-hidden />{a.title}</Linked></li>)}</ul>
        </div>
      </section>
    )
  }

  if (world === "ruins") {
    return (
      <section className="hn hn-ruins" aria-label="Education and honours">
        <div className="hall">
          <div className="hall-top"><h2>THE HALL OF LANTERNS</h2><span>{firsts.length} bright · {tops.length} steady · {badges.length} embers</span></div>
          {main && (
            <div className="plaque plaque-main">
              <div><small>THE LONG VIGIL</small><h3>{eduLine(main)}</h3><p>{main.school}</p><em>{years(main)}</em></div>
              {score(main)}
            </div>
          )}
          {rest.length > 0 && <ul className="plaque-rest">{rest.map((e) => <li key={e.id} className="plaque"><b>{e.degree}{e.field ? ` · ${e.field}` : ""}</b><span>{e.school}</span><em>{years(e)}</em></li>)}</ul>}
          <div ref={anchor} />
          <ul className="lanterns lanterns-1">
            {firsts.map((a) => (
              <li key={a.id}><Linked href={a.url} className="lamp" label={a.title}>
                <span className="lamp-chain" aria-hidden /><span className="lamp-body" aria-hidden><i /></span>
                <span className="lamp-plate"><small>1ST PLACE</small><b>{eventName(a)}</b><span>{a.issuer} · {a.date}</span></span>
              </Linked></li>
            ))}
          </ul>
          <ul className="lanterns lanterns-2">
            {tops.map((a) => (
              <li key={a.id}><Linked href={a.url} className="lamp" label={a.title}>
                <span className="lamp-chain" aria-hidden /><span className="lamp-body" aria-hidden><i /></span>
                <span className="lamp-plate">{a.kind === "package" ? <><small>RELEASED</small><b>{a.title}</b></> : <><small>{top(a)}</small><b>{eventName(a)}</b></>}<span>{a.issuer} · {a.date}</span></span>
              </Linked></li>
            ))}
          </ul>
          <ul className="embers">{badges.map((a) => <li key={a.id}><Linked href={a.url} className="ember" label={`${a.title}, ${a.issuer}`}><i aria-hidden />{a.title}</Linked></li>)}</ul>
        </div>
      </section>
    )
  }

  // village: trophy room, a diploma scroll for the main degree, medals on the shelf
  return (
    <section className="hn hn-village" aria-label="Education and honours">
      <Head ic="cup-gold" title="THE TROPHY ROOM" sub={`${education.length} studies · ${achievements.length} honours`} />
      {main && (
        <div className="diploma">
          <i className="diploma-roll diploma-roll-l" aria-hidden /><i className="diploma-roll diploma-roll-r" aria-hidden />
          <div className="diploma-in">
            <small>BE IT KNOWN THAT</small>
            <h3>{eduLine(main)}</h3>
            <p>{main.school}</p>
            <em>{years(main)}</em>
            {score(main)}
          </div>
          <span className="diploma-seal" aria-hidden><Ico n="stamp" size={2} /></span>
        </div>
      )}
      {rest.length > 0 && <ul className="scrolls">{rest.map((e) => <li key={e.id}><Ico n="scroll" size={2} /><span><b>{e.degree}{e.field ? ` · ${e.field}` : ""}</b><small>{e.school}</small><em>{years(e)}</em></span></li>)}</ul>}
      <div ref={anchor} />
      <h3 className="tr-h"><Ico n="cup-gold" size={1} /> GOLD MEDALS <em>first places</em></h3>
      <ul className="shelf-gold">
        {firsts.map((a) => (
          <li key={a.id}><Linked href={a.url} className="medal-g" label={a.title}>
            <span className="medal-ribbon" aria-hidden /><span className="medal-disc" aria-hidden><Ico n="cup-gold" size={2} /></span>
            <b>{eventName(a)}</b><small>{a.issuer} · {a.date}</small>
          </Linked></li>
        ))}
      </ul>
      <h3 className="tr-h"><Ico n="cup-silver" size={1} /> SILVER RIBBONS <em>top finishes</em></h3>
      <ul className="shelf-silver">
        {tops.map((a) => (
          <li key={a.id}><Linked href={a.url} className="medal-s" label={a.title}>
            <span className="medal-disc" aria-hidden><Ico n={a.kind === "package" ? "chest" : "cup-silver"} size={2} /></span>
            <span><span className="medal-s__r">{a.kind === "package" ? a.title : top(a)}</span><small>{a.kind === "package" ? a.note : `${eventName(a)} · ${a.issuer}`}</small></span>
          </Linked></li>
        ))}
      </ul>
      <h3 className="tr-h"><Ico n="coin" size={1} /> BADGES <em>pinned on the board</em></h3>
      <ul className="pins">{badges.map((a) => <li key={a.id}><Linked href={a.url} className="pin" label={`${a.title}, ${a.issuer}`}><i aria-hidden />{a.title}</Linked></li>)}</ul>
    </section>
  )
}

/* ═══════════════════════════════ CONTACT ═══════════════════════════════ */
function useMail() {
  const { socials } = useContent()
  const [name, setName] = useState("")
  const [msg, setMsg] = useState("")
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(socials.email); setCopied(true); playSound("click"); setTimeout(() => setCopied(false), 1600) } catch {} }
  const send = () => {
    if (!msg.trim()) return
    window.location.href = mailto(socials.email, name, msg)
    playSound("achievement"); setSent(true)
  }
  return { socials, name, setName, msg, setMsg, copied, copy, sent, setSent, send }
}

function CopyBtn({ m, className }: { m: ReturnType<typeof useMail>; className?: string }) {
  if (!m.socials.email) return null
  return <Button variant="ghost" onClick={m.copy} className={className} aria-label={m.copied ? "Email address copied" : `Copy email address ${m.socials.email}`}>{m.copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {m.copied ? "Copied!" : m.socials.email}</Button>
}

function Links({ list, className, ext = true }: { list: Channel[]; className: string; ext?: boolean }) {
  return (
    <ul className={className}>
      {list.map((c) => (
        <li key={c.id}>
          <a href={c.href} target={c.kind === "mail" ? undefined : "_blank"} rel="noreferrer" aria-label={`${c.label}: ${c.value}${c.kind === "ext" && ext ? " (opens in a new tab)" : ""}`}>
            <span className="ch-ic" aria-hidden>{chanIcon(c.id)}</span><span className="ch-t"><small>{c.label}</small><b>{c.value}</b></span>
          </a>
        </li>
      ))}
    </ul>
  )
}

const FALCON = [
  "......XXXXX.......",
  ".....XXXXXXX......",
  ".....XXXWXXXYY....",
  ".....XXKXXXXYYY...",
  ".....XXXKXXXY.....",
  ".....XXXXXXX......",
  "....XXZZZXXXX.....",
  "...XXXZZZZXXD.....",
  "..XXXXZZZZXXDD....",
  "..XXXXXZZZXXDD....",
  ".XXXXXXXZZXXDD....",
  ".XXXXXXXXXXDD.....",
  "DXXXXXXXXXDD......",
  "DDXXXXXXXDD.......",
  "DD..XX.XX.........",
  "D...Y..Y..........",
]
const FALCON_COL: Record<string, string> = { X: "#7a4a1e", Z: "#e9d3a0", W: "#fff6dc", K: "#1a0d04", D: "#3a2210", Y: "#e0a21f" }
function Falcon() {
  return (
    <svg className="falcon-svg" viewBox="0 0 18 16" shapeRendering="crispEdges" aria-hidden>
      {FALCON.flatMap((row, y) => row.split("").map((ch, x) => FALCON_COL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={FALCON_COL[ch]} /> : null))}
    </svg>
  )
}

export function ContactCard({ world }: { world: string }) {
  const m = useMail()
  const { profile } = useContent()
  const list = channels(m.socials)
  const ph = "What should we build together?"
  const nameField = (cls = "") => <input className={`k-field ${cls}`} placeholder="Your name" aria-label="Your name" value={m.name} onChange={(e) => m.setName(e.target.value)} autoComplete="name" />
  const msgField = (cls = "", rows = 5) => <textarea className={`k-field ${cls}`} rows={rows} placeholder={ph} aria-label="Your message" value={m.msg} onChange={(e) => m.setMsg(e.target.value)} />
  const sentNote = <p className="ct-sent" role="status">Your mail app should have opened. I usually reply within a day.</p>

  if (world === "city") {
    const initial = (profile.name || "R").slice(0, 1)
    return (
      <section className="ct ct-city" aria-label="Contact">
        <div className="chat">
          <aside className="chat-side" aria-label="Contacts">
            <div className="chat-side__h">CHATS</div>
            <Links list={list} className="chat-list" />
          </aside>
          <div className="chat-main">
            <div className="chat-bar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ui/portrait-city.png" alt="" aria-hidden className="chat-av" />
              <div><b>{profile.name}</b><small><i aria-hidden />online · {profile.availability}</small></div>
            </div>
            <div className="chat-log" role="log" aria-live="polite">
              <p className="bub bub-in">hey, I&rsquo;m {profile.name.split(" ")[0]}. {profile.availability.toLowerCase()}.</p>
              <p className="bub bub-in">drop a message below, or ping me anywhere in the contact list.</p>
              {m.sent && <><p className="bub bub-out">{m.msg}<small>{m.name || "you"} · delivered ✓✓</small></p><p className="bub bub-in">got it. your mail app should have opened. I usually reply within a day.</p></>}
            </div>
            {m.sent ? (
              <div className="chat-in"><Button variant="plain" onClick={() => { m.setSent(false); m.setMsg("") }}>New message</Button></div>
            ) : (
              <form className="chat-in" onSubmit={(e) => { e.preventDefault(); m.send() }}>
                {nameField("chat-name")}
                <div className="chat-row">
                  {msgField("chat-msg", 2)}
                  <button type="submit" className="chat-send" disabled={!m.msg.trim()} aria-label="Send message"><Send size={18} aria-hidden /></button>
                </div>
                <CopyBtn m={m} className="chat-copy" />
              </form>
            )}
            <span className="chat-init" aria-hidden>{initial}</span>
          </div>
        </div>
      </section>
    )
  }

  if (world === "desert") {
    return (
      <section className="ct ct-desert" aria-label="Contact">
        <div className="falcon">
          <div className="falcon-perch" aria-hidden><Falcon /><i /></div>
          <div className="falcon-scroll">
            <h2>FALCON POST</h2>
            <p className="ct-lead">{profile.availability}. Write on the scroll and the falcon carries it.</p>
            {m.sent ? sentNote : (
              <form onSubmit={(e) => { e.preventDefault(); m.send() }}>
                {nameField()}{msgField("", 5)}
                <div className="ct-actions"><Button variant="cta" type="submit" disabled={!m.msg.trim()}><Send size={13} aria-hidden /> RELEASE THE FALCON</Button><CopyBtn m={m} /></div>
              </form>
            )}
            {m.sent && <div className="ct-actions"><Button variant="plain" onClick={() => { m.setSent(false); m.setMsg("") }}>Write another</Button></div>}
          </div>
        </div>
        <h3 className="ct-sub">WAYSTATIONS <em>other roads to me</em></h3>
        <Links list={list} className="way" />
      </section>
    )
  }

  if (world === "ruins") {
    return (
      <section className="ct ct-ruins" aria-label="Contact">
        <div className="whisper">
          <div className="lantern" aria-hidden data-lit={m.sent ? "" : undefined}><i className="lantern-ring" /><i className="lantern-flame" /><i className="lantern-glass" /></div>
          <div className="whisper-in">
            <h2>WHISPER INTO THE LANTERN</h2>
            <p className="ct-lead">{profile.availability}. Lean in; the flame carries every word.</p>
            {m.sent ? <p className="ct-sent" role="status">The flame flares. Your mail app should have opened. I usually reply within a day.</p> : (
              <form onSubmit={(e) => { e.preventDefault(); m.send() }}>
                {nameField()}{msgField("", 4)}
                <div className="ct-actions"><Button variant="cta" type="submit" disabled={!m.msg.trim()}><Send size={13} aria-hidden /> WHISPER</Button><CopyBtn m={m} /></div>
              </form>
            )}
            {m.sent && <div className="ct-actions"><Button variant="plain" onClick={() => { m.setSent(false); m.setMsg("") }}>Whisper again</Button></div>}
          </div>
        </div>
        <h3 className="ct-sub">ECHOES <em>where else I answer</em></h3>
        <Links list={list} className="echoes" />
      </section>
    )
  }

  // village: write and seal a letter
  return (
    <section className="ct ct-village" aria-label="Contact">
      <div className="letter">
        <div className="letter-top"><Ico n="letter" size={2} /> <h2>A LETTER TO {profile.name.split(" ")[0].toUpperCase()}</h2></div>
        {m.sent ? (
          <div className="letter-done"><span className="wax wax-lg" aria-hidden><Ico n="stamp" size={3} /></span>{sentNote}<Button variant="plain" onClick={() => { m.setSent(false); m.setMsg("") }}>Write another letter</Button></div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); m.send() }}>
            <p className="letter-dear">Dear {profile.name.split(" ")[0]},</p>
            {msgField("letter-body", 6)}
            <div className="letter-from"><span>Yours,</span>{nameField("letter-name")}</div>
            <div className="ct-actions">
              <Button variant="cta" type="submit" disabled={!m.msg.trim()}><span className="wax" aria-hidden /> SEAL &amp; SEND</Button>
              <CopyBtn m={m} />
            </div>
          </form>
        )}
      </div>
      <aside className="post">
        <h3 className="ct-sub"><Ico n="key" size={1} /> THE POST OFFICE <em>other roads</em></h3>
        <Links list={list} className="holes" />
      </aside>
    </section>
  )
}

