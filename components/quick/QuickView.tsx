"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { useContent, LANG_COLORS, type Project } from "@/lib/content"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { ArrowUpRight, Mail, MapPin, Play, Copy, Check, Globe, GraduationCap, Medal, ArrowDown, Sparkles, Clock, Gamepad2 } from "lucide-react"
import { SmoothScroll, ScrollProgress, CursorGlow, Grain, RevealText, Scramble, Magnetic, CountUp, Marquee, SpotlightCard, LocalClock, Terminal, scrollToAnchor } from "./fx"

const VoxelIsland = dynamic(() => import("./VoxelIsland"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-full bg-white/[0.02]" /> })

const EASE = [0.16, 1, 0.3, 1] as const
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.9, ease: EASE },
}

function Kicker({ n, label }: { n: string; label: string }) {
  return (
    <motion.div {...fadeUp} className="mb-6 flex items-center gap-4 font-[family-name:var(--font-gmono)] text-xs uppercase tracking-[0.25em] text-white/45">
      <span className="text-[#ffb547]">{n}</span>
      <span className="h-px w-10 bg-white/20" />
      {label}
    </motion.div>
  )
}

function Heading({ children, className = "" }: { children: string; className?: string }) {
  return <RevealText as="h2" text={children} className={`font-[family-name:var(--font-geist)] text-[clamp(40px,6vw,84px)] font-semibold leading-[0.95] tracking-[-0.04em] text-[#f3ede2] ${className}`} />
}

export default function QuickView() {
  const c = useContent()
  const p = c.profile, s = c.socials
  const featured = c.projects.filter((x) => x.featured)
  const rest = c.projects.filter((x) => !x.featured)
  const [copied, setCopied] = useState(false)
  const first = p.name.split(" ")[0], last = p.name.split(" ").slice(1).join(" ")
  const languages = new Set(c.projects.map((x) => x.language)).size
  const allTech = Array.from(new Set(c.projects.flatMap((x) => x.tech).concat(c.skills.flatMap((g) => g.items.map((i) => i.name)))))

  const copy = async () => { try { await navigator.clipboard.writeText(s.email); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {} }
  const socials = [
    { href: s.github, label: "GitHub", icon: <Github size={18} /> },
    { href: s.linkedin, label: "LinkedIn", icon: <Linkedin size={18} /> },
    { href: s.twitter, label: "X", icon: <XLogo size={16} /> },
    { href: s.website, label: "Website", icon: <Globe size={18} /> },
  ].filter((x) => x.href)

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[#0b0a10] font-[family-name:var(--font-geist)] text-[#f3ede2] selection:bg-[#ffb547] selection:text-black">
      <SmoothScroll />
      <ScrollProgress />
      <CursorGlow />
      <Grain />

      {/* ambient light, fixed so it never cuts off between sections */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-[-30%] h-[80vh] w-[120vw] -translate-x-1/2 rounded-[50%] bg-[#ffb547] opacity-[0.06] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 0%, black, transparent 75%)" }} />
      </div>

      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto mt-4 flex h-14 max-w-6xl items-center gap-6 rounded-2xl border border-white/[0.08] bg-[#0b0914]/60 px-4 backdrop-blur-xl sm:px-5 [width:calc(100%-24px)]">
          <Link href="/" className="flex items-center gap-2.5 font-[family-name:var(--font-gmono)] text-[13px] font-medium tracking-[0.12em] text-[#f3ede2]">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#ffb547]" />
            {first.toUpperCase()}.WORLD
          </Link>
          <div className="ml-4 hidden items-center gap-1 text-sm text-white/55 md:flex">
            {[["#about", "About"], ["#work", "Work"], ["#experience", "Experience"], ["#skills", "Skills"], ["#contact", "Contact"]].map(([h, l]) => (
              <a key={h} href={h} className="rounded-lg px-3 py-1.5 transition hover:bg-white/[0.06] hover:text-white">{l}</a>
            ))}
          </div>
          <Link href="/" className="group ml-auto inline-flex items-center gap-2 rounded-xl bg-[#f3ede2] px-3.5 py-2 text-sm font-medium text-[#08070d] transition hover:bg-white">
            <Gamepad2 size={16} className="transition-transform group-hover:-rotate-12" /> Play the world
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        {/* ── HERO ─────────────────────────────────────── */}
        <section className="relative mx-auto grid min-h-[100svh] max-w-7xl items-center gap-6 px-5 pb-16 pt-28 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
          <div className="relative z-10 order-2 lg:order-1">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-2 pr-4 text-sm text-white/70 backdrop-blur">
              <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15">
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {p.availability}
            </motion.div>
            <h1 className="text-[clamp(64px,10vw,150px)] font-semibold leading-[0.86] tracking-[-0.055em]">
              <RevealText text={first} className="block" delay={0.15} />
              <RevealText text={last} delay={0.28} className="block text-[#ffb547]" />
            </h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
              className="mt-8 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl">
              {p.title} building{" "}
              <Scramble words={["browsers AI agents can trust.", "platforms that deploy themselves.", "dev tools developers love.", "fast things in Rust."]} className="font-[family-name:var(--font-gmono)] text-[0.92em] text-[#f3ede2]" />
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.7, ease: EASE }} className="mt-10 flex flex-wrap items-center gap-3">
              <Magnetic>
                <a href="#work" className="group inline-flex items-center gap-2 rounded-2xl bg-[#ffb547] px-6 py-4 font-medium text-[#1a0d06] shadow-[0_10px_40px_-12px_#ffb547] transition hover:brightness-110">
                  See my work <ArrowDown size={17} className="transition-transform group-hover:translate-y-0.5" />
                </a>
              </Magnetic>
              <Magnetic>
                <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 font-medium backdrop-blur transition hover:bg-white/[0.08]">
                  <Mail size={17} /> Get in touch
                </a>
              </Magnetic>
              <span className="ml-2 inline-flex items-center gap-1.5 text-sm text-white/40"><MapPin size={15} /> {p.location}</span>
            </motion.div>
          </div>

          {/* 3D village */}
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.4, delay: 0.2, ease: EASE }}
            className="relative order-1 h-[46vh] min-h-[320px] lg:order-2 lg:h-[82vh]">
            <div className="absolute inset-[12%] rounded-full bg-[#ffb547] opacity-[0.08] blur-[90px]" />
            <VoxelIsland onPick={scrollToAnchor} />
            <div className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 whitespace-nowrap font-[family-name:var(--font-gmono)] text-[11px] sm:block uppercase tracking-[0.2em] text-white/35">
              ↑ my portfolio, as a playable village · tap a tag
            </div>
          </motion.div>

          <motion.a href="#about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
            className="absolute bottom-6 left-5 hidden items-center gap-3 font-[family-name:var(--font-gmono)] text-xs uppercase tracking-[0.2em] text-white/40 lg:flex">
            <span className="relative h-10 w-6 rounded-full border border-white/25"><motion.span animate={{ y: [4, 16, 4] }} transition={{ duration: 1.8, repeat: Infinity }} className="absolute left-1/2 top-0 h-2 w-1 -translate-x-1/2 rounded-full bg-white/70" /></span>
            scroll
          </motion.a>
        </section>

        {/* ── MARQUEE ──────────────────────────────────── */}
        <section className="border-y border-white/[0.06] bg-white/[0.015] py-6">
          <Marquee speed={55} items={allTech.slice(0, 22).map((t) => (
            <span key={t} className="flex items-center gap-10 font-[family-name:var(--font-geist)] text-2xl font-medium tracking-tight text-white/35 sm:text-3xl">
              {t}<span className="text-[#ffb547]">✦</span>
            </span>
          ))} />
        </section>

        {/* ── ABOUT (bento) ─────────────────────────────── */}
        <section id="about" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-32">
          <Kicker n="01" label="About" />
          <Heading>Close to the metal, close to people.</Heading>
          <motion.p {...fadeUp} className="mt-8 max-w-3xl text-lg leading-relaxed text-white/55 sm:text-xl">{p.bio}</motion.p>

          <div className="mt-14 grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 md:grid-cols-6">
            <motion.div {...fadeUp} className="md:col-span-4 md:row-span-2">
              <SpotlightCard className="h-full p-6 sm:p-8" color="#ffb547" tilt={false}>
                <div className="mb-5 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
                  <span className="ml-3 font-[family-name:var(--font-gmono)] text-xs text-white/35">zsh — rayan@world</span>
                </div>
                <Terminal lines={[
                  { cmd: "whoami", out: `${p.name} · ${p.title.toLowerCase()}` },
                  { cmd: "cat now.txt", out: p.now },
                  { cmd: "ls ~/interests", out: p.interests.map((i) => `${i}/`).join("  ") },
                  { cmd: "echo $MOTTO", out: p.motto },
                ]} />
              </SpotlightCard>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="md:col-span-2">
              <SpotlightCard className="h-full p-6" color="#ffb547">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40"><Clock size={14} /> Local time</div>
                <div className="mt-4 font-[family-name:var(--font-gmono)] text-4xl tabular-nums tracking-tight"><LocalClock /></div>
                <div className="mt-2 text-sm text-white/45">{p.location} · IST</div>
              </SpotlightCard>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }} className="md:col-span-2">
              <SpotlightCard className="h-full p-6" color="#ffb547">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Shipped</div>
                <div className="mt-3 flex items-end gap-6">
                  <div><CountUp to={c.projects.length} className="text-5xl font-semibold tracking-tight" /><div className="text-sm text-white/45">projects</div></div>
                  <div><CountUp to={languages} className="text-5xl font-semibold tracking-tight" /><div className="text-sm text-white/45">languages</div></div>
                </div>
              </SpotlightCard>
            </motion.div>
            <motion.div {...fadeUp} className="md:col-span-3">
              <SpotlightCard className="h-full p-6 sm:p-8" color="#ffb547">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Creed</div>
                <div className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#f3ede2] sm:text-4xl">&ldquo;{p.motto}&rdquo;</div>
              </SpotlightCard>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="md:col-span-3">
              <Link href="/" className="block h-full">
                <SpotlightCard className="group h-full overflow-hidden p-6 sm:p-8" color="#ffb547">
                  <div className="absolute inset-0 bg-[url('/opengraph-image.png')] bg-cover bg-center opacity-25 transition-all duration-700 group-hover:scale-105 group-hover:opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08070d] via-[#08070d]/70 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end">
                    <div className="font-[family-name:var(--font-gmono)] text-xs uppercase tracking-[0.2em] text-[#ffb547]">Press start</div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight">This portfolio is also a game.</div>
                    <div className="mt-2 inline-flex items-center gap-2 text-sm text-white/55">Walk the village, talk to the locals, find the arcade <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
                  </div>
                </SpotlightCard>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── WORK (sticky stack) ───────────────────────── */}
        <section id="work" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-36">
          <Kicker n="02" label="Selected work" />
          <Heading>Things I&apos;ve built.</Heading>
          <StackedProjects projects={featured} />

          {rest.length > 0 && (
            <div className="mt-28">
              <motion.div {...fadeUp} className="mb-8 flex items-end justify-between gap-4">
                <div className="text-3xl font-semibold tracking-tight text-white/85 sm:text-4xl">More from the workshop</div>
                <div className="hidden font-[family-name:var(--font-gmono)] text-xs uppercase tracking-[0.2em] text-white/35 sm:block">{rest.length} projects</div>
              </motion.div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((x, i) => (
                  <motion.a key={x.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 3) * 0.07 }} href={x.liveUrl || x.githubUrl} target="_blank" rel="noreferrer" className="block">
                    <SpotlightCard className="group h-full p-6" color="#ffb547">
                      <div className="flex items-start justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffb547]/10 font-[family-name:var(--font-gmono)] text-sm font-semibold text-[#ffb547] ring-1 ring-[#ffb547]/25">{x.title.slice(0, 2).toUpperCase()}</div>
                        <ArrowUpRight size={20} className="text-white/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                      </div>
                      <div className="mt-6 text-xl font-semibold tracking-tight">{x.title}</div>
                      <p className="mt-2 text-[15px] leading-relaxed text-white/55">{x.tagline}</p>
                      <div className="mt-5 flex items-center gap-2 font-[family-name:var(--font-gmono)] text-xs text-white/40">
                        <span className="h-2 w-2 rounded-full" style={{ background: LANG_COLORS[x.language] ?? "#888" }} />{x.language}
                        <span className="text-white/20">/</span>{x.tech.filter((t) => t !== x.language).slice(0, 2).join(" · ")}
                      </div>
                    </SpotlightCard>
                  </motion.a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── EXPERIENCE ───────────────────────────────── */}
        {c.experience.length > 0 && <Experience />}

        {/* ── SKILLS ───────────────────────────────────── */}
        <section id="skills" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-36">
          <Kicker n="04" label="Toolbox" />
          <Heading>What I build with.</Heading>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {c.skills.map((g, gi) => (
              <motion.div key={g.group} {...fadeUp} transition={{ ...fadeUp.transition, delay: gi * 0.08 }}>
                <SpotlightCard className="h-full p-6 sm:p-7" color="#ffb547">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="text-lg font-semibold tracking-tight">{g.group}</div>
                    <div className="font-[family-name:var(--font-gmono)] text-xs text-white/35">{String(g.items.length).padStart(2, "0")}</div>
                  </div>
                  <div className="space-y-4">
                    {g.items.map((it, i) => (
                      <div key={it.name}>
                        <div className="mb-1.5 flex justify-between text-sm"><span className="text-white/80">{it.name}</span><span className="font-[family-name:var(--font-gmono)] text-xs text-white/30">{it.level}</span></div>
                        <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                          <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: it.level / 100 }} viewport={{ once: true }} transition={{ duration: 1.3, delay: 0.15 + i * 0.05, ease: EASE }}
                            className="h-full origin-left rounded-full" style={{ background: "linear-gradient(90deg, #ffb547, #ffd89a)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── STUDIES ──────────────────────────────────── */}
        {(c.education.length > 0 || c.achievements.length > 0) && (
          <section id="studies" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-36">
            <Kicker n="05" label="Studies & honours" />
            <Heading>Always learning.</Heading>
            <div className="mt-14 grid gap-4 md:grid-cols-[1fr_1.3fr]">
              <div className="space-y-4">
                {c.education.map((e) => (
                  <motion.div key={e.id} {...fadeUp}>
                    <SpotlightCard className="p-6 sm:p-7" color="#ffb547">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffb547]/10 text-[#ffb547]"><GraduationCap size={22} /></div>
                      <div className="mt-5 text-xl font-semibold tracking-tight">{e.degree}{e.field ? `, ${e.field}` : ""}</div>
                      <div className="mt-1 text-white/55">{e.school}</div>
                      {(e.start || e.end) && <div className="mt-3 font-[family-name:var(--font-gmono)] text-xs text-white/35">{[e.start, e.end].filter(Boolean).join(" — ")}</div>}
                      {e.note && <div className="mt-3 text-sm text-white/55">{e.note}</div>}
                    </SpotlightCard>
                  </motion.div>
                ))}
              </div>
              <div className="grid content-start gap-3 sm:grid-cols-2">
                {c.achievements.map((a, i) => {
                  const inner = (
                    <SpotlightCard className="group h-full p-5" color="#ffb547" tilt={false}>
                      <div className="flex gap-3">
                        <Medal size={18} className="mt-0.5 shrink-0 text-[#ffb547]" />
                        <div>
                          <div className="font-medium text-white/90">{a.title}</div>
                          <div className="mt-0.5 text-sm text-white/40">{[a.issuer, a.date].filter(Boolean).join(" · ")}</div>
                        </div>
                      </div>
                    </SpotlightCard>
                  )
                  return (
                    <motion.div key={a.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
                      {a.url ? <a href={a.url} target="_blank" rel="noreferrer">{inner}</a> : inner}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── CONTACT ──────────────────────────────────── */}
        <section id="contact" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 pb-24 pt-40">
          <div aria-hidden className="absolute left-1/2 top-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffb547] opacity-[0.07] blur-[140px]" />
          <div className="relative text-center">
            <motion.div {...fadeUp} className="font-[family-name:var(--font-gmono)] text-xs uppercase tracking-[0.3em] text-white/45">06 — Contact</motion.div>
            <h2 className="mt-8 text-[clamp(56px,11vw,170px)] font-semibold leading-[0.88] tracking-[-0.055em]">
              <RevealText text="Let's build" className="block" />
              <RevealText text="something." delay={0.12} className="block text-[#ffb547]" />
            </h2>
            <motion.p {...fadeUp} className="mx-auto mt-8 max-w-lg text-lg text-white/55">{p.availability}. My inbox is always open.</motion.p>
            <motion.div {...fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Magnetic strength={0.25}>
                <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2.5 rounded-2xl bg-[#f3ede2] px-7 py-4 text-lg font-medium text-[#08070d] shadow-[0_20px_60px_-20px_#ffb547] transition hover:bg-white">
                  <Mail size={19} /> {s.email}
                </a>
              </Magnetic>
              <button onClick={copy} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4 font-medium backdrop-blur transition hover:bg-white/[0.08]">
                {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copied!" : "Copy"}
              </button>
            </motion.div>
            <motion.div {...fadeUp} className="mt-8 flex justify-center gap-2">
              {socials.map((x) => (
                <Magnetic key={x.label} strength={0.4}>
                  <a href={x.href} target="_blank" rel="noreferrer" aria-label={x.label}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/65 transition hover:border-white/25 hover:text-white">{x.icon}</a>
                </Magnetic>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} {p.name} · Mumbai</span>
          <Link href="/" className="group inline-flex items-center gap-2 transition hover:text-white">
            <Play size={14} className="text-[#ffb547]" /> Enter the pixel world <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </footer>
    </div>
  )
}

// ── sticky stacking project cards ─────────────────────────────
function StackedProjects({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  return (
    <div ref={ref} className="relative mt-16">
      {projects.map((p, i) => (
        <ProjectPanel key={p.id} p={p} i={i} n={projects.length} progress={scrollYProgress} />
      ))}
    </div>
  )
}

function ProjectPanel({ p, i, n, progress }: { p: Project; i: number; n: number; progress: MotionValue<number> }) {
  const scale = useTransform(progress, [i / n, 1], [1, 1 - (n - 1 - i) * 0.045])
  const dim = useTransform(progress, [i / n, Math.min(1, (i + 1) / n)], [0, i === n - 1 ? 0 : 0.35])
  const a = "#ffb547"
  return (
    <div className="sticky mb-10 h-auto md:h-[78vh] md:max-h-[640px]" style={{ top: `calc(96px + ${i * 22}px)` }}>
      <motion.article style={{ scale, transformOrigin: "50% 0%" }}
        className="relative h-full overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0f0d18] shadow-[0_-20px_60px_-20px_rgba(0,0,0,.8)]">
        <motion.div style={{ opacity: dim }} className="pointer-events-none absolute inset-0 z-20 bg-black" />
        <div className="grid h-full md:grid-cols-[1.05fr_1fr]">
          {/* text */}
          <div className="relative z-10 flex flex-col p-7 sm:p-10">
            <div className="flex items-center gap-3 font-[family-name:var(--font-gmono)] text-xs uppercase tracking-[0.2em] text-white/40">
              <span style={{ color: a }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="h-px w-6 bg-white/20" />{p.category}<span className="text-white/20">·</span>{p.year}
            </div>
            <h3 className="mt-6 text-[clamp(40px,5.5vw,72px)] font-semibold leading-[0.9] tracking-[-0.045em]">{p.title}</h3>
            <div className="mt-4 text-xl font-medium leading-snug tracking-tight text-white/75 sm:text-2xl">{p.tagline}</div>
            <p className="mt-5 line-clamp-4 text-[15px] leading-relaxed text-white/50">{p.description}</p>
            {p.highlights.length > 0 && (
              <ul className="mt-6 space-y-2">
                {p.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="flex items-start gap-3 text-sm text-white/75"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a, boxShadow: `0 0 10px ${a}` }} />{h}</li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-8">
              {p.tech.slice(0, 5).map((t) => <span key={t} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{t}</span>)}
            </div>
            <div className="mt-6 flex items-center gap-5 text-sm">
              {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1.5 font-medium" style={{ color: a }}>Visit live <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>}
              {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white/55 transition hover:text-white"><Github size={15} /> Source</a>}
            </div>
          </div>
          {/* visual */}
          <ProjectVisual p={p} />
        </div>
      </motion.article>
    </div>
  )
}

function ProjectVisual({ p }: { p: Project }) {
  const a = "#ffb547"
  if (p.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image} alt={p.title} className="h-64 w-full object-cover md:h-full" />
  }
  const cells = Array.from({ length: 48 }, (_, k) => k)
  return (
    <div className="relative h-72 overflow-hidden md:h-full" style={{ background: `radial-gradient(120% 90% at 80% 10%, ${a}55, transparent 55%), radial-gradient(80% 70% at 10% 100%, ${a}30, transparent 60%), #0b0914` }}>
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `linear-gradient(${a}33 1px, transparent 1px), linear-gradient(90deg, ${a}33 1px, transparent 1px)`, backgroundSize: "28px 28px" }} />
      {/* floating pixel field */}
      <div className="absolute inset-0 grid grid-cols-8 gap-3 p-8 opacity-90">
        {cells.map((k) => {
          const on = (k * 37 + p.id.length * 11) % 7 < 2
          return on ? (
            <motion.span key={k} className="aspect-square rounded-[4px]" style={{ background: a }}
              animate={{ opacity: [0.15, 0.85, 0.15], scale: [0.85, 1, 0.85] }} transition={{ duration: 3 + (k % 5), repeat: Infinity, delay: (k % 9) * 0.3 }} />
          ) : <span key={k} />
        })}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-[clamp(28px,4vw,52px)] font-semibold tracking-[-0.04em] text-white/90">{p.title}</div>
      </div>
      <div className="absolute bottom-5 right-5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 font-[family-name:var(--font-gmono)] text-xs text-white/70 backdrop-blur">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: LANG_COLORS[p.language] ?? "#888" }} />{p.language}
      </div>
    </div>
  )
}

// ── experience with a scroll-drawn line ───────────────────────
function Experience() {
  const c = useContent()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] })
  const h = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  return (
    <section id="experience" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-36">
      <Kicker n="03" label="Experience" />
      <Heading>Where I&apos;ve been building.</Heading>
      <div ref={ref} className="relative mt-16 pl-8 sm:pl-12">
        <div className="absolute bottom-0 left-[7px] top-0 w-px bg-white/10 sm:left-[11px]" />
        <motion.div style={{ height: h }} className="absolute left-[7px] top-0 w-px bg-gradient-to-b from-[#ffb547] to-[#ffb547]/30 sm:left-[11px]" />
        {c.experience.map((e, i) => (
          <motion.div key={e.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }} className="relative pb-16 last:pb-0">
            <span className="absolute -left-8 top-2 flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-[#0b0a10] sm:-left-12 sm:h-6 sm:w-6">
              <span className="h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2" style={{ background: e.end.toLowerCase() === "present" ? "#ffb547" : "#ffb547", boxShadow: e.end.toLowerCase() === "present" ? "0 0 12px #ffb547" : "none" }} />
            </span>
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="font-[family-name:var(--font-gmono)] text-sm text-white/40">{[e.start, e.end].filter(Boolean).join(" — ")}<div className="mt-1 text-white/30">{e.location}</div></div>
              <div>
                <div className="text-2xl font-semibold tracking-tight sm:text-3xl">{e.role}</div>
                <div className="mt-1 text-lg font-medium text-[#ffb547]">
                  {e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="hover:underline">{e.org}</a> : e.org}
                </div>
                {e.description && <p className="mt-4 max-w-2xl leading-relaxed text-white/55">{e.description}</p>}
                {e.highlights.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {e.highlights.map((hl) => <span key={hl} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/70"><Sparkles size={12} className="mr-1.5 inline text-[#ffb547]" />{hl}</span>)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
