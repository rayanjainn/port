"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { useContent, LANG_COLORS, type Project } from "@/lib/content"
import TitleScene from "@/components/ui/TitleScene"
import { Github, Linkedin, XLogo } from "@/components/icons"
import { ArrowUpRight, Mail, MapPin, Play, Copy, Check, Globe, Sparkles, GraduationCap, Medal, ArrowRight } from "lucide-react"

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.2, 0.9, 0.3, 1] as const },
}

function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <motion.div {...reveal} className="mb-10">
      <div className="font-pixel text-[9px] tracking-[0.3em] text-[#ffd76a] mb-4">{kicker}</div>
      <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">{title}</h2>
      {sub && <p className="mt-3 text-base sm:text-lg text-white/55 max-w-2xl">{sub}</p>}
    </motion.div>
  )
}

function Cover({ p, tall }: { p: Project; tall?: boolean }) {
  const a = p.accent || "#ffd76a"
  if (p.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image} alt={p.title} className={`w-full object-cover ${tall ? "h-52 sm:h-64" : "h-40"}`} />
  }
  return (
    <div className={`relative overflow-hidden ${tall ? "h-52 sm:h-64" : "h-40"}`}
      style={{ background: `radial-gradient(120% 90% at 85% 10%, ${a}55 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, ${a}26 0%, transparent 60%), linear-gradient(160deg, #161029 0%, #0d0a1c 100%)` }}>
      <div className="absolute inset-0 opacity-40 transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `linear-gradient(${a}22 1px, transparent 1px), linear-gradient(90deg, ${a}22 1px, transparent 1px)`, backgroundSize: "14px 14px" }} />
      <div className="absolute right-0 bottom-0 flex items-end">
        {[12, 22, 32, 44, 60].map((h, i) => (
          <div key={i} className="transition-all duration-500 group-hover:-translate-y-1" style={{ width: 14, height: h * (tall ? 1.7 : 1), background: a, opacity: 0.15 + i * 0.13, transitionDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <div className="absolute left-5 top-5 font-pixel text-[8px] tracking-[0.25em]" style={{ color: a }}>{p.category.toUpperCase()}</div>
      <div className={`absolute left-5 bottom-5 right-24 font-pixel text-white leading-tight ${tall ? "text-2xl sm:text-4xl" : "text-base"}`}
        style={{ textShadow: `0 3px 0 rgba(0,0,0,.5), 0 0 28px ${a}` }}>{p.title}</div>
    </div>
  )
}

function ProjectCard({ p, big, i }: { p: Project; big?: boolean; i: number }) {
  const a = p.accent || "#ffd76a"
  const href = p.liveUrl || p.githubUrl
  return (
    <motion.article
      {...reveal}
      transition={{ ...reveal.transition, delay: (i % 3) * 0.06 }}
      className={`group relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/25 ${big ? "md:col-span-2" : ""}`}
      style={{ boxShadow: "0 1px 0 rgba(255,255,255,.04) inset" }}
    >
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(500px circle at 50% 0%, ${a}22, transparent 60%)` }} />
      <Cover p={p} tall={big} />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-3 text-sm text-white/50 mb-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: LANG_COLORS[p.language] ?? "#888" }} />{p.language}
          </span>
          <span>·</span><span>{p.year}</span>
          {p.featured && <span className="ml-auto font-pixel text-[7px] tracking-widest px-2 py-1 rounded" style={{ background: `${a}22`, color: a }}>FEATURED</span>}
        </div>
        <h3 className="font-display text-xl sm:text-2xl font-semibold text-white leading-snug">{p.tagline}</h3>
        <p className={`mt-3 text-[15px] leading-relaxed text-white/60 ${big ? "" : "line-clamp-3"}`}>{p.description}</p>
        {big && p.highlights.length > 0 && (
          <ul className="mt-4 grid sm:grid-cols-3 gap-2">
            {p.highlights.map((h) => (
              <li key={h} className="text-sm text-white/75 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">{h}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.tech.slice(0, big ? 8 : 4).map((t) => (
            <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-white/70 bg-white/[0.02]">{t}</span>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-4 text-sm">
          {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline underline-offset-4" style={{ color: a }}>Live <ArrowUpRight size={15} /></a>}
          {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"><Github size={14} /> Source</a>}
        </div>
      </div>
      {href && <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${p.title}`} className="absolute inset-0 z-0 md:hidden" />}
    </motion.article>
  )
}

export default function QuickView() {
  const c = useContent()
  const p = c.profile
  const s = c.socials
  const mouse = useRef({ x: 0.5, y: 0.5 })
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const sceneY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"])
  const [copied, setCopied] = useState(false)
  const featured = c.projects.filter((x) => x.featured)
  const rest = c.projects.filter((x) => !x.featured)

  const copy = async () => {
    try { await navigator.clipboard.writeText(s.email); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {}
  }

  const socials = [
    { href: s.github, label: "GitHub", icon: <Github size={18} /> },
    { href: s.linkedin, label: "LinkedIn", icon: <Linkedin size={18} /> },
    { href: s.twitter, label: "X", icon: <XLogo size={16} /> },
    { href: s.website, label: "Website", icon: <Globe size={18} /> },
  ].filter((x) => x.href)

  return (
    <div className="min-h-dvh bg-[#0b0a1a] text-white font-sans selection:bg-[#ffd76a] selection:text-black"
      onPointerMove={(e) => { mouse.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } }}>
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(closest-side, #c07bff, transparent)" }} />
        <div className="absolute top-[60%] -left-40 w-[700px] h-[700px] rounded-full blur-3xl opacity-[0.12]" style={{ background: "radial-gradient(closest-side, #ffd76a, transparent)" }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at 50% 0%, black 20%, transparent 70%)" }} />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0b0a1a]/60 border-b border-white/[0.06]">
        <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-pixel text-[10px] tracking-[0.2em] text-[#ffe7b0]">
            <span className="w-2.5 h-2.5 bg-[#ffd76a] shadow-[0_0_12px_#ffb347]" />
            {p.name.split(" ")[0].toUpperCase()}.WORLD
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/60 ml-6">
            <a href="#work" className="hover:text-white transition-colors">Work</a>
            <a href="#experience" className="hover:text-white transition-colors">Experience</a>
            <a href="#skills" className="hover:text-white transition-colors">Skills</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <Link href="/" className="ml-auto inline-flex items-center gap-2 font-pixel text-[8px] tracking-widest px-3.5 py-2.5 bg-gradient-to-b from-[#fff1b8] via-[#ffd76a] to-[#f5a623] text-[#3a1d08] border-2 border-[#2a1240] shadow-[0_3px_0_#2a1240] hover:brightness-105 active:translate-y-0.5 transition">
            <Play size={11} fill="currentColor" /> PLAY THE WORLD
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        {/* hero */}
        <section ref={heroRef} className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-16 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-white/70">
              {p.available && <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" /><span className="relative w-2 h-2 rounded-full bg-emerald-400" /></span>}
              {p.availability}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.2, 0.9, 0.3, 1] }}
              className="mt-6 font-display font-bold tracking-[-0.04em] leading-[0.95] text-[clamp(48px,8vw,96px)]">
              <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">{p.name.split(" ")[0]}</span>{" "}
              <span className="bg-gradient-to-br from-[#ffd76a] via-[#ff9ecf] to-[#c07bff] bg-clip-text text-transparent">{p.name.split(" ").slice(1).join(" ")}</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}
              className="mt-6 text-xl sm:text-2xl text-white/85 font-display font-medium">{p.title}</motion.p>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-4 text-base sm:text-lg leading-relaxed text-white/55 max-w-xl">{p.bio}</motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-3">
              {s.email && (
                <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-5 py-3 font-medium hover:bg-white/90 transition shadow-[0_8px_30px_rgba(255,255,255,.15)]">
                  <Mail size={17} /> Get in touch
                </a>
              )}
              {s.github && (
                <a href={s.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 font-medium hover:bg-white/[0.08] transition">
                  <Github size={16} /> GitHub
                </a>
              )}
              <span className="inline-flex items-center gap-1.5 text-white/45 text-sm ml-1"><MapPin size={15} /> {p.location}</span>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.1, ease: [0.2, 0.9, 0.3, 1] }}
            className="relative">
            <div className="absolute -inset-6 rounded-[32px] blur-2xl opacity-40" style={{ background: "conic-gradient(from 180deg, #ffd76a, #ff9ecf, #c07bff, #ffd76a)" }} />
            <Link href="/" className="group relative block aspect-[4/3.3] rounded-2xl overflow-hidden border-4 border-[#2a1240] shadow-[0_8px_0_#2a1240,0_30px_80px_rgba(0,0,0,.5)]">
              <motion.div style={{ y: sceneY }} className="absolute inset-0">
                <TitleScene mouse={mouse} density={0.55} />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-pixel text-[9px] tracking-[0.2em] text-[#ffe7b0]">THIS PORTFOLIO IS A GAME</div>
                  <div className="text-sm text-white/80 mt-1.5">Explore a pixel village where every building is a chapter.</div>
                </div>
                <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 bg-[#ffd76a] text-[#3a1d08] border-2 border-[#2a1240] shadow-[0_3px_0_#2a1240] group-hover:scale-110 transition-transform">
                  <Play size={16} fill="currentColor" />
                </span>
              </div>
            </Link>
          </motion.div>
        </section>

        {/* now strip */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div {...reveal} className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-white/[0.01] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 font-pixel text-[8px] tracking-[0.25em] text-[#ff9ecf] shrink-0"><Sparkles size={14} /> NOW</div>
            <p className="text-white/80 text-base sm:text-lg">{p.now}</p>
            <div className="sm:ml-auto font-mono text-sm text-white/40 shrink-0">&ldquo;{p.motto}&rdquo;</div>
          </motion.div>
        </section>

        {/* work */}
        <section id="work" className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 scroll-mt-16">
          <SectionTitle kicker="◆ SELECTED WORK" title="Things I've built" sub="Systems, platforms and tools, from browser engines to Kubernetes pipelines." />
          <div className="grid md:grid-cols-2 gap-5">
            {featured.map((x, i) => <ProjectCard key={x.id} p={x} big={i === 0} i={i} />)}
          </div>
          {rest.length > 0 && (
            <div className="mt-14">
              <motion.div {...reveal} className="font-pixel text-[9px] tracking-[0.25em] text-white/45 mb-5">MORE FROM THE WORKSHOP</motion.div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((x, i) => (
                  <motion.a key={x.id} {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * 0.05 }}
                    href={x.liveUrl || x.githubUrl} target="_blank" rel="noreferrer"
                    className="group rounded-xl border border-white/10 bg-white/[0.025] p-5 hover:bg-white/[0.05] hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-6 rounded-full" style={{ background: x.accent }} />
                        <span className="font-display text-lg font-semibold">{x.title}</span>
                      </div>
                      <ArrowUpRight size={18} className="text-white/30 group-hover:text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="mt-2.5 text-sm text-white/55 leading-relaxed">{x.tagline}</p>
                    <div className="mt-3.5 flex items-center gap-2 text-xs text-white/45">
                      <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[x.language] ?? "#888" }} />{x.language}
                      <span>·</span>{x.tech.filter((t) => t !== x.language).slice(0, 3).join(" · ")}
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* experience */}
        {c.experience.length > 0 && (
          <section id="experience" className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 scroll-mt-16">
            <SectionTitle kicker="◆ EXPERIENCE" title="Where I've been building" />
            <div className="relative border-l border-white/10 ml-2 sm:ml-3">
              {c.experience.map((e, i) => (
                <motion.div key={e.id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }} className="relative pl-8 sm:pl-10 pb-12 last:pb-0">
                  <span className="absolute -left-[7px] top-1.5 w-3.5 h-3.5 rotate-45 border-2 border-[#0b0a1a]" style={{ background: e.end.toLowerCase() === "present" ? "#ffd76a" : "#5b5470" }} />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-xl sm:text-2xl font-semibold">{e.role}</h3>
                    <span className="text-white/40">·</span>
                    {e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="text-[#ffd76a] hover:underline underline-offset-4">{e.org}</a> : <span className="text-[#ffd76a]">{e.org}</span>}
                    <span className="ml-auto font-mono text-sm text-white/40">{[e.start, e.end].filter(Boolean).join(" — ")}</span>
                  </div>
                  {e.description && <p className="mt-3 text-white/60 leading-relaxed max-w-3xl">{e.description}</p>}
                  {e.highlights.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {e.highlights.map((h) => <span key={h} className="text-sm rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/75">{h}</span>)}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* skills */}
        <section id="skills" className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 scroll-mt-16">
          <SectionTitle kicker="◆ TOOLBOX" title="What I build with" />
          <div className="grid md:grid-cols-3 gap-5">
            {c.skills.map((g, gi) => (
              <motion.div key={g.group} {...reveal} transition={{ ...reveal.transition, delay: gi * 0.07 }} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <div className="font-pixel text-[9px] tracking-[0.2em] text-white/50 mb-5">{g.group.toUpperCase()}</div>
                <div className="space-y-4">
                  {g.items.map((it, i) => (
                    <div key={it.name}>
                      <div className="flex justify-between text-sm mb-1.5"><span className="text-white/85">{it.name}</span></div>
                      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${it.level}%` }} viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.1 + i * 0.05, ease: [0.2, 0.9, 0.3, 1] }}
                          className="h-full rounded-full bg-gradient-to-r from-[#ffd76a] via-[#ff9ecf] to-[#c07bff]" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* education + honours */}
        {(c.education.length > 0 || c.achievements.length > 0) && (
          <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-28">
            <SectionTitle kicker="◆ STUDIES & HONOURS" title="Learning, always" />
            <div className="grid md:grid-cols-[1fr_1.4fr] gap-5">
              <div className="space-y-4">
                {c.education.map((e) => (
                  <motion.div key={e.id} {...reveal} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#3fb3a6]/15 text-[#5fd3c6] flex items-center justify-center shrink-0"><GraduationCap size={21} /></div>
                    <div>
                      <div className="font-display text-lg font-semibold">{e.degree}{e.field ? `, ${e.field}` : ""}</div>
                      <div className="text-white/55 mt-1">{e.school}</div>
                      {(e.start || e.end) && <div className="font-mono text-sm text-white/35 mt-2">{[e.start, e.end].filter(Boolean).join(" — ")}</div>}
                      {e.note && <div className="text-sm text-white/55 mt-2">{e.note}</div>}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3 content-start">
                {c.achievements.map((a, i) => {
                  const inner = (
                    <>
                      <Medal size={18} className="text-[#ffd76a] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-white/90">{a.title}</div>
                        <div className="text-sm text-white/45 mt-0.5">{[a.issuer, a.date].filter(Boolean).join(" · ")}</div>
                      </div>
                    </>
                  )
                  const cls = "rounded-xl border border-white/10 bg-white/[0.025] p-4 flex gap-3 transition hover:bg-white/[0.05]"
                  return a.url
                    ? <motion.a key={a.id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.04 }} href={a.url} target="_blank" rel="noreferrer" className={cls}>{inner}</motion.a>
                    : <motion.div key={a.id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.04 }} className={cls}>{inner}</motion.div>
                })}
              </div>
            </div>
          </section>
        )}

        {/* contact */}
        <section id="contact" className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 pb-20 scroll-mt-16">
          <motion.div {...reveal} className="relative overflow-hidden rounded-3xl border border-white/10 p-8 sm:p-14 text-center"
            style={{ background: "radial-gradient(80% 120% at 50% 0%, rgba(192,123,255,.25), transparent 60%), radial-gradient(60% 80% at 50% 100%, rgba(255,215,106,.12), transparent 60%), rgba(255,255,255,.02)" }}>
            <div className="font-pixel text-[9px] tracking-[0.3em] text-[#ffd76a]">◆ SEND A RAVEN</div>
            <h2 className="mt-5 font-display text-4xl sm:text-6xl font-bold tracking-tight">Let&apos;s build something.</h2>
            <p className="mt-4 text-white/55 text-lg max-w-xl mx-auto">{p.availability}. The inbox is always open.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-6 py-3.5 font-medium hover:bg-white/90 transition">
                <Mail size={18} /> {s.email}
              </a>
              <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3.5 font-medium hover:bg-white/[0.08] transition">
                {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copied" : "Copy email"}
              </button>
            </div>
            <div className="mt-8 flex justify-center gap-2">
              {socials.map((x) => (
                <a key={x.label} href={x.href} target="_blank" rel="noreferrer" aria-label={x.label}
                  className="w-11 h-11 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition">{x.icon}</a>
              ))}
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center gap-4 justify-between text-sm text-white/40">
          <span>© {new Date().getFullYear()} {p.name}</span>
          <Link href="/" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            This site is also a game. <span className="text-[#ffd76a]">Play it</span> <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </div>
  )
}
