"use client"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useContent, type Project } from "@/lib/content"
import { STATIC_IDS, TIERS, projectHref, projectsUsing, tierOf, type Tier } from "@/lib/quick/data"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { ArrowUpRight, ArrowDown, Mail, MapPin, Copy, Check, Globe, Clock, Gamepad2, Download, X, Command } from "lucide-react"
import { SmoothScroll, ScrollProgress, Reveal, Scramble, CountUp, Marquee, LocalClock, Terminal, scrollToAnchor } from "./fx"
import Chrome, { printResume } from "./Chrome"
import ProjectArt from "./ProjectArt"
import { LangDot, SectionHead, mono } from "./parts"
import BuildLog from "./BuildLog"
import ExperienceSection from "./ExperienceSection"
import NumbersSection from "./NumbersSection"
import StudiesSection from "./StudiesSection"
import type { QuickStats } from "@/lib/quick/github"

const VoxelIsland = dynamic(() => import("./VoxelIsland"), { ssr: false })

/** Card wrapper: a stretched link when the project has somewhere to go. */
function CardLink({ p, children, className = "" }: { p: Project; children: (link: ReactNode) => ReactNode; className?: string }) {
  const t = projectHref(p, STATIC_IDS)
  const title = t
    ? t.external
      ? <a href={t.href} target="_blank" rel="noreferrer" className="after:absolute after:inset-0 after:content-['']">{p.title}<span className="sr-only"> (opens in a new tab)</span></a>
      : <Link href={t.href} className="after:absolute after:inset-0 after:content-['']">{p.title}</Link>
    : <>{p.title}</>
  return <div className={`${className} ${t ? "qv-card is-hover" : "qv-card"}`}>{children(title)}</div>
}

export default function QuickView({ stats }: { stats: QuickStats }) {
  return (
    <div id="top" className="qv-root relative min-h-dvh overflow-x-clip">
      <Chrome home staticIds={STATIC_IDS}>
        <Page stats={stats} />
      </Chrome>
    </div>
  )
}

function Page({ stats }: { stats: QuickStats }) {
  const c = useContent()
  const p = c.profile, s = c.socials
  const [copied, setCopied] = useState(false)
  const [peek, setPeek] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const first = p.name.split(" ")[0], last = p.name.split(" ").slice(1).join(" ")
  const languages = new Set(c.projects.map((x) => x.language)).size
  const allTech = useMemo(() => Array.from(new Set(c.projects.flatMap((x) => x.tech).concat(c.skills.flatMap((g) => g.items.map((i) => i.name))))), [c])
  const copy = async () => { try { await navigator.clipboard.writeText(s.email); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {} }
  const socials = [
    { href: s.github, label: "GitHub", icon: <Github size={18} /> },
    { href: s.linkedin, label: "LinkedIn", icon: <Linkedin size={18} /> },
    { href: s.twitter, label: "X", icon: <XLogo size={16} /> },
    { href: s.website, label: "Website", icon: <Globe size={18} /> },
  ].filter((x) => x.href)

  const matching = useMemo(() => (filter ? new Set(projectsUsing(filter, c.projects).map((x) => x.id)) : null), [filter, c.projects])
  const pickSkill = useCallback((name: string) => {
    setFilter((cur) => { const next = cur === name ? null : name; if (next) window.setTimeout(() => scrollToAnchor("#work"), 40); return next })
  }, [])
  const featured = c.projects.filter((x) => x.featured)
  const rest = c.projects.filter((x) => !x.featured)

  return (
    <>
      <SmoothScroll />
      <ScrollProgress />

      {/* one continuous ambient background, fixed so no section ever cuts it off */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-[-34%] h-[80vh] w-[120vw] -translate-x-1/2 rounded-[50%] bg-[#ffb547] opacity-[0.07] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.045]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black, transparent 70%)" }} />
      </div>

      <main className="relative z-10">
        {/* ── HERO ───────────────────────────────────────── */}
        <section className="mx-auto grid min-h-[min(100svh,880px)] max-w-7xl items-center gap-4 px-5 pb-10 pt-28 lg:grid-cols-[1.02fr_1fr] lg:gap-6 lg:pt-24">
          <div className="relative z-10">
            <div className="qv-rise mb-7 inline-flex min-h-9 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-2.5 pr-4 text-sm text-white/75" style={{ ["--d" as string]: "0.05s" }}>
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {p.availability}
            </div>
            <h1 className="text-[clamp(60px,10.5vw,148px)] font-semibold leading-[0.88] tracking-[-0.055em]">
              <span className="qv-rise block" style={{ ["--d" as string]: "0.1s" }}>{first}</span>
              <span className="qv-rise block text-[#ffb547]" style={{ ["--d" as string]: "0.2s" }}>{last}</span>
            </h1>
            <p className="qv-rise mt-7 max-w-xl text-lg leading-relaxed text-white/65 sm:text-xl" style={{ ["--d" as string]: "0.35s" }}>
              {p.title} building{" "}
              <span className="block min-h-[3.1em] sm:min-h-[1.6em]">
                <Scramble words={["browsers AI agents can trust.", "platforms that deploy themselves.", "native Mac tools.", "event software that holds up."]} className={`${mono} text-[0.9em] text-[#f3ede2]`} />
              </span>
            </p>
            <div className="qv-rise mt-8 flex flex-wrap items-center gap-3" style={{ ["--d" as string]: "0.5s" }}>
              <a href="#work" className="qv-btn qv-btn-primary group">See my work <ArrowDown size={17} className="transition-transform group-hover:translate-y-0.5" /></a>
              <a href={`mailto:${s.email}`} className="qv-btn qv-btn-ghost"><Mail size={17} /> Get in touch</a>
              <button onClick={() => printResume(p.name)} className="qv-btn qv-btn-ghost"><Download size={17} /> Download résumé</button>
            </div>
            <div className={`qv-rise ${mono} mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-white/50`} style={{ ["--d" as string]: "0.6s" }}>
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {p.location}</span>
              <span className="inline-flex items-center gap-1.5"><Command size={14} /> Press <kbd className="qv-kbd">Cmd/Ctrl K</kbd> to jump anywhere</span>
            </div>
          </div>
          <HeroIsland />
        </section>

        {/* ── TECH STRIP ─────────────────────────────────── */}
        <div className="border-y border-white/[0.07] bg-white/[0.015] py-4" aria-hidden>
          <Marquee speed={60} items={allTech.slice(0, 24).map((t) => (
            <span key={t} className="flex items-center gap-10 text-lg font-medium tracking-tight text-white/45 sm:text-xl">{t}<span className="text-[#ffb547]">✦</span></span>
          ))} />
        </div>

        {/* ── ABOUT ──────────────────────────────────────── */}
        <section id="about" className="qv-section mx-auto max-w-6xl px-5">
          <SectionHead n="01" label="About" title="Close to the metal, close to people.">
            <p className="qv-lead">{p.bio}</p>
          </SectionHead>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6">
            <Reveal className="md:col-span-4 md:row-span-2">
              <div className="qv-card h-full p-6 sm:p-7">
                <div className="mb-5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffb547]" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className={`${mono} ml-3 text-xs text-white/45`}>zsh · rayan@world</span>
                </div>
                <Terminal lines={[
                  { cmd: "whoami", out: `${p.name} · ${p.title.toLowerCase()}` },
                  { cmd: "cat now.txt", out: p.now },
                  { cmd: "ls ~/interests", out: p.interests.map((i) => `${i}/`).join("  ") },
                  { cmd: "ls ~/roles", out: c.experience.map((e) => e.org).join("  ") },
                  { cmd: "echo $MOTTO", out: p.motto },
                ]} />
              </div>
            </Reveal>
            <Reveal className="md:col-span-2" delay={0.05}>
              <div className="qv-card h-full p-6">
                <div className={`${mono} flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50`}><Clock size={14} /> Local time</div>
                <div className={`${mono} mt-3 text-4xl tabular-nums tracking-tight`}><LocalClock /></div>
                <div className="mt-2 text-sm text-white/55">{p.location} · IST</div>
              </div>
            </Reveal>
            <Reveal className="md:col-span-2" delay={0.1}>
              <div className="qv-card h-full p-6">
                <div className={`${mono} text-xs uppercase tracking-[0.18em] text-white/50`}>Shipped</div>
                <div className="mt-3 flex items-end gap-7">
                  <div><CountUp to={c.projects.length} className="text-5xl font-semibold tracking-tight" /><div className="text-sm text-white/55">projects</div></div>
                  <div><CountUp to={languages} className="text-5xl font-semibold tracking-tight" /><div className="text-sm text-white/55">languages</div></div>
                </div>
              </div>
            </Reveal>
            <Reveal className="md:col-span-6">
              <Link href="/" className="qv-card is-hover group flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
                <div>
                  <div className={`${mono} text-xs uppercase tracking-[0.18em] text-[#ffb547]`}>Press start</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">This portfolio is also a game.</div>
                  <div className="mt-1 text-white/60">Walk the village, talk to the locals, find the arcade.</div>
                </div>
                <span className="qv-btn qv-btn-ghost shrink-0 group-hover:bg-white/10"><Gamepad2 size={17} /> Play the world <ArrowUpRight size={15} /></span>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ── WORK ───────────────────────────────────────── */}
        <section id="work" className="qv-section mx-auto max-w-6xl px-5">
          <SectionHead n="02" label="Selected work" title="Things I've built." aside={`${c.projects.length} projects`}>
            <p className="qv-lead">Each one has a case study: what it is, what made it hard, and the stack behind it.</p>
          </SectionHead>

          {filter && (
            <div role="status" className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-[#ffb547]/35 bg-[#ffb547]/[0.07] px-4 py-3 text-sm">
              <span className="text-white/80">Showing projects that use <b className="font-semibold text-[#ffb547]">{filter}</b> · {matching?.size ?? 0} of {c.projects.length}</span>
              <button onClick={() => setFilter(null)} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-white/75 hover:bg-white/10 hover:text-white"><X size={14} /> Clear</button>
            </div>
          )}

          <div className="mt-10 space-y-5">
            {featured.map((x, i) => <FeatureRow key={x.id} p={x} i={i} dim={!!matching && !matching.has(x.id)} hit={!!matching?.has(x.id)} />)}
          </div>

          {rest.length > 0 && (
            <>
              <div className="mb-6 mt-16 flex items-end justify-between gap-4">
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">More from the workshop</h3>
                <span className={`${mono} hidden text-xs uppercase tracking-[0.2em] text-white/45 sm:block`}>{rest.length} more</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((x, i) => <Tile key={x.id} p={x} delay={(i % 3) * 0.05} dim={!!matching && !matching.has(x.id)} hit={!!matching?.has(x.id)} />)}
              </div>
            </>
          )}
        </section>

        {/* ── BUILD LOG ──────────────────────────────────── */}
        {c.projects.some((x) => x.started) && <BuildLog />}

        {/* ── EXPERIENCE ─────────────────────────────────── */}
        {c.experience.length > 0 && <ExperienceSection />}

        {/* ── SKILLS ─────────────────────────────────────── */}
        <section id="skills" className="qv-section mx-auto max-w-6xl px-5">
          <SectionHead n="05" label="Loadout" title="What I build with.">
            <p className="qv-lead">Grouped by role, ranked in three honest tiers. Hover a skill to see where it shipped; click to filter the work above.</p>
          </SectionHead>
          <Loadout peek={peek} setPeek={setPeek} filter={filter} onPick={pickSkill} />
        </section>

        {/* ── NUMBERS ────────────────────────────────────── */}
        <NumbersSection stats={stats} />

        {/* ── STUDIES ────────────────────────────────────── */}
        {(c.education.length > 0 || c.achievements.length > 0) && <StudiesSection />}

        {/* ── CONTACT ────────────────────────────────────── */}
        <section id="contact" className="qv-section relative mx-auto max-w-6xl px-5 pb-24">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[55%] h-[420px] w-[760px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffb547] opacity-[0.07] blur-[130px]" />
          <div className="relative text-center">
            <div className={`qv-eyebrow ${mono} justify-center`}><b>08</b><span>Contact</span></div>
            <h2 className="mt-6 text-[clamp(48px,10vw,140px)] font-semibold leading-[0.9] tracking-[-0.055em]">
              Let&apos;s build<br /><span className="text-[#ffb547]">something.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-lg text-white/65">{p.availability}. My inbox is always open.</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a href={`mailto:${s.email}`} className="qv-btn bg-[#f3ede2] px-6 text-base text-[#0b0a10] hover:bg-white sm:text-lg"><Mail size={19} /> {s.email}</a>
              <button onClick={copy} className="qv-btn qv-btn-ghost">{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copied!" : "Copy"}</button>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              {socials.map((x) => (
                <a key={x.label} href={x.href} target="_blank" rel="noreferrer" aria-label={x.label} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.03] text-white/70 transition hover:border-[#ffb547]/50 hover:text-white">{x.icon}</a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-white/50 sm:flex-row">
          <span>© {new Date().getFullYear()} {p.name} · {p.location}</span>
          <Link href="/" className="group inline-flex min-h-10 items-center gap-2 transition hover:text-white"><Gamepad2 size={15} className="text-[#ffb547]" /> Enter the pixel world <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
        </div>
      </footer>
    </>
  )
}

/* ── hero 3D island: lazy, idle-mounted, with a static fallback ── */
function HeroIsland() {
  const host = useRef<HTMLDivElement>(null)
  const [mount, setMount] = useState(false)
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const go = () => { const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }; if (w.requestIdleCallback) w.requestIdleCallback(() => setMount(true), { timeout: 1800 }); else window.setTimeout(() => setMount(true), 500) }
    if (document.readyState === "complete") go(); else { window.addEventListener("load", go, { once: true }); return () => window.removeEventListener("load", go) }
  }, [])
  useEffect(() => {
    const el = host.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const onReady = useCallback(() => setReady(true), [])

  return (
    <div ref={host} className="qv-rise relative h-[340px] sm:h-[420px] lg:h-[78vh] lg:max-h-[760px]" style={{ ["--d" as string]: "0.25s" }}>
      <div aria-hidden className="absolute inset-[14%] rounded-full bg-[#ffb547] opacity-[0.09] blur-[90px]" />
      {/* static fallback: shows instantly, fades once the canvas is live */}
      <svg aria-hidden viewBox="0 0 400 380" className={`absolute inset-0 m-auto h-full w-full max-w-[560px] transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        <ellipse cx="200" cy="330" rx="90" ry="14" fill="#000" opacity="0.35" />
        <path d="M200 70 L350 150 L200 230 L50 150 Z" fill="#2a2234" stroke="#ffb547" strokeOpacity="0.55" />
        <path d="M50 150 L200 230 V262 L50 182 Z" fill="#1b1624" stroke="#ffb547" strokeOpacity="0.3" />
        <path d="M350 150 L200 230 V262 L350 182 Z" fill="#14101c" stroke="#ffb547" strokeOpacity="0.3" />
        <path d="M120 190 L200 262 L280 190 L200 296 Z" fill="#100d17" opacity="0.8" />
        {[[160, 120, 34], [236, 132, 26], [200, 160, 40], [270, 160, 20]].map(([x, y, h], i) => (
          <g key={i}><path d={`M${x} ${y} l18 9 v${-h} l-18 -9z`} fill="#ffb547" opacity="0.5" /><path d={`M${x} ${y} l-18 9 v${-h} l18 -9z`} fill="#ffb547" opacity="0.28" /><path d={`M${x} ${y - h} l18 9 l-18 9 l-18 -9z`} fill="#ffd89a" opacity="0.7" /></g>
        ))}
      </svg>
      <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
        {mount && <VoxelIsland onPick={scrollToAnchor} onReady={onReady} active={visible} />}
      </div>
      <div className={`${mono} pointer-events-none absolute bottom-1 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[11px] uppercase tracking-[0.2em] text-white/45 sm:block`}>
        My portfolio, as a playable village · tap a tag
      </div>
    </div>
  )
}

/* ── projects ────────────────────────────────────────────── */
function FeatureRow({ p, i, dim, hit }: { p: Project; i: number; dim: boolean; hit: boolean }) {
  const flip = i % 2 === 1
  return (
    <Reveal>
      <CardLink p={p} className={`group overflow-hidden transition-[opacity,filter] duration-300 ${dim ? "opacity-30 saturate-50" : ""} ${hit ? "!border-[#ffb547]/60" : ""}`}>
        {(title) => (
          <div className={`grid md:grid-cols-[1.05fr_1fr] ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[340px]">
              <ProjectArt project={p} className="absolute inset-0 h-full transition-transform duration-700 group-hover:scale-[1.03]" />
            </div>
            <div className="flex flex-col p-6 sm:p-8">
              <div className={`${mono} flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.18em] text-white/50`}>
                <span className="text-[#ffb547]">{String(i + 1).padStart(2, "0")}</span><span>{p.category}</span><span className="text-white/25">/</span><span>{p.year}</span>
                <span className="ml-auto inline-flex items-center gap-1.5 normal-case tracking-normal"><LangDot lang={p.language} />{p.language}</span>
              </div>
              <h3 className="mt-4 text-[clamp(32px,3.6vw,46px)] font-semibold leading-none tracking-[-0.04em]">{title}</h3>
              <p className="mt-3 text-lg font-medium leading-snug tracking-tight text-white/85 sm:text-xl">{p.tagline}</p>
              <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-white/60">{p.description}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">{p.tech.slice(0, 5).map((t) => <span key={t} className="qv-chip">{t}</span>)}</div>
              <div className="mt-auto flex items-center gap-4 pt-6 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#ffb547]">{STATIC_IDS.has(p.id) ? "Read case study" : "Visit"} <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
                {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="relative z-10 inline-flex min-h-10 items-center gap-1.5 text-white/60 hover:text-white"><Globe size={14} /> Live</a>}
                {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className="relative z-10 inline-flex min-h-10 items-center gap-1.5 text-white/60 hover:text-white"><Github size={14} /> Source</a>}
              </div>
            </div>
          </div>
        )}
      </CardLink>
    </Reveal>
  )
}

function Tile({ p, delay, dim, hit }: { p: Project; delay: number; dim: boolean; hit: boolean }) {
  return (
    <Reveal delay={delay} className="h-full">
      <CardLink p={p} className={`group flex h-full flex-col overflow-hidden transition-[opacity,filter] duration-300 ${dim ? "opacity-30 saturate-50" : ""} ${hit ? "!border-[#ffb547]/60" : ""}`}>
        {(title) => (
          <>
            <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.06]">
              <ProjectArt project={p} label={false} className="absolute inset-0 h-full transition-transform duration-700 group-hover:scale-[1.04]" />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                <ArrowUpRight size={19} className="mt-1 shrink-0 text-white/35 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#ffb547]" />
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-white/60">{p.tagline}</p>
              <div className={`${mono} mt-auto flex items-center gap-2 pt-4 text-xs text-white/50`}>
                <LangDot lang={p.language} />{p.language}<span className="text-white/25">/</span>{p.tech.filter((t) => t !== p.language).slice(0, 2).join(" · ")}
              </div>
            </div>
          </>
        )}
      </CardLink>
    </Reveal>
  )
}

/* ── skills loadout ──────────────────────────────────────── */
function Pips({ tier }: { tier: Tier }) {
  return <span aria-hidden className="flex gap-[3px]">{[1, 2, 3].map((k) => <span key={k} className={`h-[5px] w-[5px] rounded-full ${k <= tier ? "bg-[#ffb547]" : "bg-white/15"}`} />)}</span>
}

function Loadout({ peek, setPeek, filter, onPick }: { peek: string | null; setPeek: (s: string | null) => void; filter: string | null; onPick: (s: string) => void }) {
  const c = useContent()
  const usage = useMemo(() => {
    const m = new Map<string, Project[]>()
    c.skills.forEach((g) => g.items.forEach((i) => m.set(i.name, projectsUsing(i.name, c.projects))))
    return m
  }, [c])
  const peeked = c.skills.flatMap((g) => g.items).find((i) => i.name === peek)
  const info = peeked ? { name: peeked.name, tier: tierOf(peeked.level), projects: usage.get(peeked.name) ?? [] } : null

  return (
    <div className="mt-10">
      <div className={`${mono} mb-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/55`} aria-label="Tier legend">
        {([3, 2, 1] as Tier[]).map((t) => <span key={t} className="inline-flex items-center gap-2"><Pips tier={t} /><b className="font-medium text-white/80">{TIERS[t].label}</b><span className="hidden sm:inline">· {TIERS[t].hint}</span></span>)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {c.skills.map((g, gi) => (
          <Reveal key={g.group} delay={gi * 0.05}>
            <div className="qv-card h-full p-5 sm:p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-lg font-semibold tracking-tight">{g.group}</h3>
                <span className={`${mono} text-xs text-white/45`}>{String(g.items.length).padStart(2, "0")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...g.items].sort((a, b) => b.level - a.level).map((it) => {
                  const t = tierOf(it.level), n = usage.get(it.name)?.length ?? 0, on = filter === it.name
                  return (
                    <button key={it.name} type="button" aria-pressed={on} onClick={() => onPick(it.name)}
                      onMouseEnter={() => setPeek(it.name)} onMouseLeave={() => setPeek(null)} onFocus={() => setPeek(it.name)} onBlur={() => setPeek(null)}
                      aria-label={`${it.name}, ${TIERS[t].label}, used in ${n} ${n === 1 ? "project" : "projects"}`}
                      className={`group/t inline-flex min-h-10 items-center gap-2.5 rounded-xl border px-3 text-sm transition ${on ? "border-[#ffb547] bg-[#ffb547]/15 text-white" : t === 3 ? "border-[#ffb547]/30 bg-[#ffb547]/[0.06] text-white/90 hover:border-[#ffb547]/70" : t === 2 ? "border-white/15 bg-white/[0.03] text-white/80 hover:border-[#ffb547]/60" : "border-dashed border-white/15 text-white/60 hover:border-[#ffb547]/60 hover:text-white/85"}`}>
                      {it.name}<Pips tier={t} />
                      {n > 0 && <span className={`${mono} -mr-0.5 text-[11px] text-white/40 group-hover/t:text-[#ffb547]`}>{n}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <div aria-live="polite" className="mt-4 flex min-h-[64px] items-center rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-3 text-[15px]">
        {info ? (
          <p className="text-white/70">
            <b className="font-semibold text-white">{info.name}</b> <span className="text-[#ffb547]">· {TIERS[info.tier].label}</span> ·{" "}
            {info.projects.length ? <>used in <b className="font-semibold text-white">{info.projects.length}</b> {info.projects.length === 1 ? "project" : "projects"}: {info.projects.slice(0, 5).map((x) => x.title).join(", ")}{info.projects.length > 5 ? "…" : ""}</> : "not in a shipped project yet"}
          </p>
        ) : (
          <p className="text-white/50">Hover or focus a skill to see where it shipped. The small number is how many projects use it.</p>
        )}
      </div>
    </div>
  )
}
