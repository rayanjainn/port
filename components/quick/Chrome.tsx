"use client"
// Shared page chrome: sticky nav with active-section indicator, command palette,
// and the print-only résumé. Used by the Quick View and the case-study pages.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useContent, type Portfolio } from "@/lib/content"
import { SITE_ANCHORS, projectHref } from "@/lib/quick/data"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { Search, Gamepad2, Download, Mail, Copy, CornerDownLeft, Globe, Hash, FolderOpen, Check, X } from "lucide-react"
import { scrollToAnchor, setScrollLocked } from "./fx"

type Group = "Go to" | "Projects" | "Actions" | "Elsewhere"
interface Cmd { id: string; group: Group; label: string; hint?: string; icon: ReactNode; keywords: string; run: () => void }

const subscribeNone = () => () => {}
function modKey() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const plat = nav.userAgentData?.platform || navigator.platform || navigator.userAgent
  return /mac|iphone|ipad|ipod/i.test(plat) ? "⌘" : "Ctrl "
}

export function printResume(name: string) {
  const prev = document.title
  document.title = `${name} - Resume`
  const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore) }
  window.addEventListener("afterprint", restore)
  window.print()
}

export default function Chrome({ home, staticIds, children }: { home: boolean; staticIds: ReadonlySet<string>; children: ReactNode }) {
  const c = useContent()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState("")
  const [active, setActive] = useState<string>("")

  // active section on the home page
  useEffect(() => {
    if (!home) return
    let raf = 0
    const calc = () => {
      raf = 0
      let cur = ""
      for (const s of SITE_ANCHORS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) cur = s.id
      }
      setActive(cur)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calc) }
    calc()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [home])

  const say = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast(""), 1800) }, [])
  const go = useCallback((id: string) => { if (home) scrollToAnchor(`#${id}`); else router.push(`/quick#${id}`) }, [home, router])

  // global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const cmds = useMemo<Cmd[]>(() => {
    const list: Cmd[] = []
    for (const s of SITE_ANCHORS) {
      if (s.id === "experience" && !c.experience.length) continue
      if (s.id === "studies" && !c.education.length && !c.achievements.length) continue
      if (s.id === "log" && !c.projects.some((x) => x.started)) continue
      list.push({ id: `s-${s.id}`, group: "Go to", label: s.label, hint: home ? "Section" : "Quick View", icon: <Hash size={16} />, keywords: `section ${s.id}`, run: () => go(s.id) })
    }
    c.projects.forEach((p) => {
      const t = projectHref(p, staticIds)
      if (!t) return
      list.push({
        id: `p-${p.id}`, group: "Projects", label: p.title, hint: t.external ? "Opens site" : p.category, icon: <FolderOpen size={16} />, keywords: `${p.tagline} ${p.tech.join(" ")} ${p.category} case study`,
        run: () => (t.external ? window.open(t.href, "_blank", "noopener") : router.push(t.href)),
      })
    })
    list.push(
      { id: "a-copy", group: "Actions", label: "Copy email address", hint: c.socials.email, icon: <Copy size={16} />, keywords: "mail contact", run: () => { navigator.clipboard?.writeText(c.socials.email).then(() => say("Email copied"), () => say(c.socials.email)) } },
      { id: "a-mail", group: "Actions", label: "Send an email", hint: "Opens your mail app", icon: <Mail size={16} />, keywords: "contact hire", run: () => { window.location.assign(`mailto:${c.socials.email}`) } },
      { id: "a-cv", group: "Actions", label: "Download résumé", hint: "Print to PDF", icon: <Download size={16} />, keywords: "resume cv pdf print", run: () => { window.setTimeout(() => printResume(c.profile.name), 120) } },
      { id: "a-play", group: "Actions", label: "Play the world", hint: "Pixel-art village", icon: <Gamepad2 size={16} />, keywords: "game village rpg home", run: () => router.push("/") },
    )
    const soc: [string, string, ReactNode][] = [["GitHub", c.socials.github, <Github key="g" size={16} />], ["LinkedIn", c.socials.linkedin, <Linkedin key="l" size={16} />], ["X", c.socials.twitter, <XLogo key="x" size={14} />], ["Website", c.socials.website, <Globe key="w" size={16} />]]
    soc.forEach(([label, url, icon]) => { if (url) list.push({ id: `e-${label}`, group: "Elsewhere", label, hint: url.replace(/^https?:\/\/(www\.)?/, ""), icon, keywords: "social profile link", run: () => window.open(url, "_blank", "noopener") }) })
    return list
  }, [c, home, go, router, staticIds, say])

  return (
    <>
      <div className="qv-screen">
        <Nav home={home} active={active} onOpen={() => setOpen(true)} name={c.profile.name} onPrint={() => printResume(c.profile.name)} />
        {children}
        <AnimatePresence>{open && <Palette key="pal" cmds={cmds} onClose={() => setOpen(false)} />}</AnimatePresence>
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center">
          <AnimatePresence>{toast && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex items-center gap-2 rounded-full border border-white/15 bg-[#17141f] px-4 py-2.5 text-sm shadow-2xl">
              <Check size={15} className="text-[#ffb547]" /> {toast}
            </motion.div>
          )}</AnimatePresence>
        </div>
      </div>
      <Resume data={c} staticIds={staticIds} />
    </>
  )
}

/* ── nav ─────────────────────────────────────────────────── */
function Nav({ home, active, onOpen, name, onPrint }: { home: boolean; active: string; onOpen: () => void; name: string; onPrint: () => void }) {
  const first = name.split(" ")[0]
  const mod = useSyncExternalStore(subscribeNone, modKey, () => "⌘")
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav aria-label="Primary" className="mx-auto mt-3 flex h-14 max-w-6xl items-center gap-1 rounded-2xl border border-white/10 bg-[#0b0a10]/75 px-2.5 backdrop-blur-xl sm:gap-2 sm:px-3 [width:calc(100%-24px)]">
        <Link href="/quick" onClick={(e) => { if (home) { e.preventDefault(); scrollToAnchor("#top") } }} className="qv-mono mr-1 flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-[13px] font-medium tracking-[0.12em] text-[#f3ede2]">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[#ffb547]" />
          {first.toUpperCase()}.WORLD
        </Link>
        <ul className="ml-2 hidden items-center lg:flex">
          {SITE_ANCHORS.filter((s) => s.nav !== false).map((s) => {
            const on = active === s.id
            const cls = `relative flex min-h-10 items-center rounded-lg px-3 text-sm transition-colors ${on ? "text-white" : "text-white/60 hover:text-white"}`
            const pill = on && <motion.span layoutId="qv-nav-pill" transition={{ type: "spring", stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-lg bg-white/[0.08]" />
            const dot = on && <span className="absolute -bottom-0.5 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full bg-[#ffb547]" />
            return (
              <li key={s.id}>
                {home
                  ? <a href={`#${s.id}`} aria-current={on ? "location" : undefined} className={cls}>{pill}<span className="relative">{s.label}</span>{dot}</a>
                  : <Link href={`/quick#${s.id}`} className={cls}><span className="relative">{s.label}</span></Link>}
              </li>
            )
          })}
        </ul>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={onOpen} aria-label="Open command palette (Cmd or Ctrl K)" aria-keyshortcuts="Meta+K Control+K" title="Jump anywhere (Cmd/Ctrl K)"
            className="flex min-h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] pl-3 pr-2 text-sm text-white/65 transition hover:bg-white/[0.09] hover:text-white">
            <Search size={15} /><span className="hidden sm:inline">Jump to…</span><kbd className="qv-kbd qv-mono whitespace-nowrap">{mod}K</kbd>
          </button>
          <button onClick={onPrint} aria-label="Download résumé" title="Download résumé (print to PDF)" className="flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-2.5 text-sm text-white/70 transition hover:bg-white/[0.09] hover:text-white xl:px-3.5">
            <Download size={16} /><span className="hidden xl:inline">Résumé</span>
          </button>
          <Link href="/" aria-label="Play the world" className="group flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl bg-[#f3ede2] px-2.5 text-sm font-medium text-[#0b0a10] transition hover:bg-white sm:px-3.5">
            <Gamepad2 size={16} className="transition-transform group-hover:-rotate-12" /><span className="hidden sm:inline">Play the world</span>
          </Link>
        </div>
      </nav>
    </header>
  )
}

/* ── command palette ─────────────────────────────────────── */
function Palette({ cmds, onClose }: { cmds: Cmd[]; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [idx, setIdx] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null
    setScrollLocked(true)
    input.current?.focus()
    return () => { setScrollLocked(false); returnTo.current?.focus?.() }
  }, [])

  const results = useMemo(() => {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!toks.length) return cmds
    return cmds
      .map((c) => {
        const hay = `${c.label} ${c.hint ?? ""} ${c.keywords} ${c.group}`.toLowerCase()
        if (!toks.every((t) => hay.includes(t))) return null
        const l = c.label.toLowerCase()
        return { c, s: toks.reduce((n, t) => n + (l.startsWith(t) ? 3 : l.includes(t) ? 2 : 0), 0) }
      })
      .filter((x): x is { c: Cmd; s: number } => !!x)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c)
  }, [q, cmds])

  const sel = Math.min(idx, Math.max(results.length - 1, 0))
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }) }, [sel])

  const run = (c?: Cmd) => { if (!c) return; onClose(); window.setTimeout(c.run, 30) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose() }
    else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((sel + 1) % Math.max(results.length, 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((sel - 1 + results.length) % Math.max(results.length, 1)) }
    else if (e.key === "Home" && e.target === input.current && !q) { e.preventDefault(); setIdx(0) }
    else if (e.key === "Enter") { e.preventDefault(); run(results[sel]) }
    else if (e.key === "Tab") {
      e.preventDefault()
      const to = document.activeElement === input.current ? closeBtn.current : input.current
      to?.focus()
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}
        initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.99 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex max-h-[min(560px,76vh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#120f19] shadow-[0_40px_120px_-20px_rgba(0,0,0,.9)]">
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
          <Search size={17} className="shrink-0 text-white/45" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0) }} placeholder="Jump to a section, project or action…" spellCheck={false} autoComplete="off"
            role="combobox" aria-expanded="true" aria-controls="qv-pal-list" aria-activedescendant={results[sel] ? `qv-opt-${results[sel].id}` : undefined} aria-label="Search commands"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-[#f3ede2] outline-none placeholder:text-white/35" />
          <button ref={closeBtn} onClick={onClose} aria-label="Close palette" className="qv-mono flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-white/50 hover:bg-white/[0.07] hover:text-white">
            <kbd className="qv-kbd">esc</kbd><X size={14} className="sm:hidden" />
          </button>
        </div>
        <div ref={list} id="qv-pal-list" role="listbox" aria-label="Commands" data-lenis-prevent className="overflow-y-auto overscroll-contain p-2">
          {results.length === 0 && <div className="px-4 py-10 text-center text-sm text-white/50">Nothing matches &ldquo;{q}&rdquo;.</div>}
          {results.map((c, i) => {
            const head = i === 0 || results[i - 1].group !== c.group ? c.group : null
            return (
              <div key={c.id}>
                {head && <div className="qv-mono px-3 pb-1 pt-3 text-[11px] uppercase tracking-[0.2em] text-white/40">{head}</div>}
                <div id={`qv-opt-${c.id}`} data-i={i} role="option" aria-selected={i === sel} onMouseMove={() => setIdx(i)} onClick={() => run(c)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[15px] ${i === sel ? "bg-[#ffb547]/[0.13] text-white" : "text-white/75"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${i === sel ? "bg-[#ffb547] text-[#1a0d06]" : "bg-white/[0.06] text-white/60"}`}>{c.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="hidden max-w-[40%] truncate text-xs text-white/40 sm:block">{c.hint}</span>}
                  {i === sel && <CornerDownLeft size={14} className="shrink-0 text-[#ffb547]" />}
                </div>
              </div>
            )
          })}
        </div>
        <div className="qv-mono flex items-center gap-4 border-t border-white/[0.08] px-4 py-2.5 text-[11px] text-white/45">
          <span className="flex items-center gap-1.5"><kbd className="qv-kbd">↑</kbd><kbd className="qv-kbd">↓</kbd> move</span>
          <span className="flex items-center gap-1.5"><kbd className="qv-kbd">↵</kbd> open</span>
          <span className="ml-auto hidden sm:block">⌘K / Ctrl K toggles</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── print résumé ────────────────────────────────────────── */
function Resume({ data: c, staticIds }: { data: Portfolio; staticIds: ReadonlySet<string> }) {
  const p = c.profile, s = c.socials
  const feat = c.projects.filter((x) => x.featured), rest = c.projects.filter((x) => !x.featured)
  const short = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
  void staticIds
  return (
    <div className="qv-print" aria-hidden>
      <h1>{p.name}</h1>
      <div className="rs-title">{p.title} · {p.location}</div>
      <div className="rs-contact">
        <span>{s.email}</span>
        {s.github && <span>{short(s.github)}</span>}
        {s.linkedin && <span>{short(s.linkedin)}</span>}
        {s.website && <span>{short(s.website)}</span>}
      </div>
      <h2>Profile</h2>
      <p>{p.bio}</p>

      {c.experience.length > 0 && (<>
        <h2>Experience</h2>
        {c.experience.map((e) => (
          <div className="rs-item" key={e.id}>
            <div className="rs-row"><b>{e.role} <span className="rs-sub" style={{ fontWeight: 400 }}>· {e.org}{e.location ? `, ${e.location}` : ""}</span></b><em>{[e.start, e.end].filter(Boolean).join(" – ")}</em></div>
            {e.description && <p>{e.description}</p>}
          </div>
        ))}
      </>)}

      <h2>Selected projects</h2>
      {feat.map((x) => (
        <div className="rs-item" key={x.id}>
          <div className="rs-row"><b>{x.title} <span className="rs-sub" style={{ fontWeight: 400 }}>· {x.tagline}</span></b><em>{x.year}</em></div>
          <ul>{x.highlights.slice(0, 2).map((h) => <li key={h}>{h}</li>)}</ul>
          <div className="rs-mono">{x.tech.join(" · ")}{x.githubUrl ? `  ·  ${short(x.githubUrl)}` : ""}</div>
        </div>
      ))}
      {rest.length > 0 && (<>
        <div className="rs-mono" style={{ margin: "6pt 0 3pt" }}>ALSO BUILT</div>
        <ul style={{ paddingLeft: "11pt" }}>{rest.map((x) => <li key={x.id}><b style={{ fontWeight: 600 }}>{x.title}</b>: {x.tagline} <span className="rs-mono">{x.tech.slice(0, 3).join(" · ")}</span></li>)}</ul>
      </>)}

      <h2>Skills</h2>
      {c.skills.map((g) => <p className="rs-skill" key={g.group} style={{ marginBottom: "2pt" }}><b>{g.group}:</b> {g.items.map((i) => i.name).join(", ")}</p>)}

      <div className="rs-grid">
        {c.education.length > 0 && <div><h2>Education</h2>{c.education.map((e) => <div className="rs-item" key={e.id}><div className="rs-row"><b>{e.degree}{e.field ? `, ${e.field}` : ""}</b><em>{[e.start, e.end].filter(Boolean).join(" – ")}</em></div><p className="rs-sub">{e.school}{e.note ? ` · ${e.note}` : ""}</p></div>)}</div>}
        {c.achievements.length > 0 && <div><h2>Honours</h2><ul style={{ paddingLeft: "11pt" }}>{c.achievements.filter((a) => a.kind !== "badge" && a.kind).map((a) => <li key={a.id}>{a.title} ({a.issuer}){a.note ? `. ${a.note}` : ""}</li>)}<li>GitHub: {c.achievements.filter((a) => !a.kind || a.kind === "badge").map((a) => a.title).join(", ")}</li></ul></div>}
      </div>
    </div>
  )
}
