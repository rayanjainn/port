"use client"
import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import { useContent, loadPreviewDraft, LANG_COLORS, type Project } from "@/lib/content"
import { STATIC_IDS, emphasize, projectHref } from "@/lib/quick/data"
import { Github } from "@/components/icons"
import PreviewBadge from "@/components/ui/PreviewBadge"
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe, Medal } from "lucide-react"
import { monthLabel } from "@/lib/quick/time"
import Chrome from "./Chrome"
import ProjectArt from "./ProjectArt"
import { Reveal, ScrollProgress } from "./fx"

const mono = "qv-mono"

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Reveal className="grid gap-4 border-t border-white/[0.09] py-9 lg:grid-cols-[220px_1fr] lg:gap-10 lg:py-12">
      <h2 className={`${mono} text-xs uppercase tracking-[0.22em] text-white/50`}>{label}</h2>
      <div>{children}</div>
    </Reveal>
  )
}

export default function CaseStudy({ id }: { id: string }) {
  const c = useContent()
  useEffect(() => { loadPreviewDraft() }, [])
  const i = c.projects.findIndex((x) => x.id === id)
  const p = c.projects[i]

  return (
    <div id="top" className="qv-root relative min-h-dvh overflow-x-clip">
      <Chrome home={false} staticIds={STATIC_IDS}>
        <ScrollProgress />
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute left-1/2 top-[-34%] h-[80vh] w-[120vw] -translate-x-1/2 rounded-[50%] bg-[#ffb547] opacity-[0.07] blur-[120px]" />
        </div>
        <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-28">
          {p ? <Body p={p} i={i} all={c.projects} /> : (
            <div className="py-32 text-center">
              <h1 className="text-4xl font-semibold tracking-tight">Project not found</h1>
              <Link href="/quick#work" className="qv-btn qv-btn-primary mt-8">Back to the work</Link>
            </div>
          )}
        </main>
        <footer className="relative z-10 border-t border-white/[0.07]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-white/50 sm:flex-row">
            <span>© {new Date().getFullYear()} {c.profile.name}</span>
            <Link href="/quick" className="inline-flex min-h-10 items-center gap-2 hover:text-white"><ArrowLeft size={14} /> Back to the Quick View</Link>
          </div>
        </footer>
      </Chrome>
      <PreviewBadge />
    </div>
  )
}

function Body({ p, i, all }: { p: Project; i: number; all: Project[] }) {
  const n = all.length
  const prev = all[(i - 1 + n) % n], next = all[(i + 1) % n]
  const honour = useContent().achievements.find((a) => a.projectId === p.id && a.kind === "hackathon" && /^1st/i.test(a.title))
  const meta: [string, ReactNode][] = [
    [p.started ? "Started" : "Year", p.started ? monthLabel(p.started) : p.year],
    ["Category", p.category],
    ["Primary language", <span key="l" className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: LANG_COLORS[p.language] ?? "#888" }} />{p.language}</span>],
    ["Links", (
      <span key="k" className="flex flex-wrap gap-x-4 gap-y-1">
        {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 text-[#ffb547] hover:underline">Live <ArrowUpRight size={14} /></a>}
        {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 text-[#ffb547] hover:underline">Source <ArrowUpRight size={14} /></a>}
        {!p.liveUrl && !p.githubUrl && <span className="text-white/45">Private</span>}
      </span>
    )],
  ]
  return (
    <article>
      <div className="qv-rise flex items-center justify-between gap-4">
        <Link href="/quick#work" className="inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm text-white/60 transition hover:text-white"><ArrowLeft size={16} /> All work</Link>
        <span className={`${mono} text-xs tracking-[0.2em] text-white/50`}>{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
      </div>

      <header className="qv-rise mt-8" style={{ ["--d" as string]: "0.08s" }}>
        <div className={`${mono} text-xs uppercase tracking-[0.22em] text-[#ffb547]`}>{p.category} · {p.year}</div>
        {honour && <div className={`${mono} mt-4 inline-flex items-center gap-2 rounded-lg border border-[#ffb547]/45 bg-[#ffb547]/[0.08] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#ffb547]`}><Medal size={14} />{honour.title} · {honour.issuer}</div>}
        <h1 className="mt-4 text-[clamp(52px,10vw,132px)] font-semibold leading-[0.9] tracking-[-0.055em]">{p.title}</h1>
        <p className="mt-6 max-w-3xl text-[clamp(21px,2.6vw,32px)] font-medium leading-snug tracking-tight text-white/80">{p.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="qv-btn qv-btn-primary"><Globe size={17} /> Visit live <ArrowUpRight size={16} /></a>}
          {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className={`qv-btn ${p.liveUrl ? "qv-btn-ghost" : "qv-btn-primary"}`}><Github size={17} /> View source</a>}
        </div>
      </header>

      <div className="qv-rise mt-12 overflow-hidden rounded-3xl border border-white/10" style={{ ["--d" as string]: "0.16s" }}>
        <div className="relative aspect-[16/10] sm:aspect-[16/9]">
          <ProjectArt project={p} className="absolute inset-0 h-full" />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.09] lg:grid-cols-4">
        {meta.map(([k, v]) => (
          <div key={k} className="bg-[#0d0b13] p-4 sm:p-5">
            <dt className={`${mono} text-[11px] uppercase tracking-[0.2em] text-white/45`}>{k}</dt>
            <dd className="mt-2 text-base font-medium sm:text-lg">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-14">
        <Block label="What it is">
          <p className="max-w-3xl text-[clamp(19px,2vw,24px)] leading-[1.55] tracking-[-0.01em] text-white/85">{p.description}</p>
        </Block>

        {p.highlights.length > 0 && (
          <Block label="Highlights">
            <ol className="divide-y divide-white/[0.08]">
              {p.highlights.map((h, k) => (
                <li key={h} className="grid grid-cols-[48px_1fr] items-baseline gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[72px_1fr]">
                  <span className={`${mono} text-2xl text-[#ffb547] sm:text-3xl`}>{String(k + 1).padStart(2, "0")}</span>
                  <p className="text-xl leading-snug tracking-tight text-white/65 sm:text-2xl">
                    {emphasize(h).map((s, j) => s.strong ? <strong key={j} className="font-semibold text-[#f3ede2]">{s.text}</strong> : <span key={j}>{s.text}</span>)}
                  </p>
                </li>
              ))}
            </ol>
          </Block>
        )}

        <Block label="Stack">
          <div className="flex flex-wrap gap-2">
            {p.tech.map((t) => <span key={t} className="qv-chip !min-h-10 !px-4 text-sm text-white/80">{t}</span>)}
          </div>
        </Block>
      </div>

      <nav aria-label="More projects" className="mt-6 grid gap-4 sm:grid-cols-2">
        {[{ q: prev, label: "Previous", icon: <ArrowLeft size={16} />, left: true }, { q: next, label: "Next", icon: <ArrowRight size={16} />, left: false }].map(({ q, label, icon, left }) => {
          const t = projectHref(q, STATIC_IDS)
          const inner = (
            <>
              <div className="relative aspect-[16/8] overflow-hidden border-b border-white/[0.07]"><ProjectArt project={q} label={false} className="absolute inset-0 h-full transition-transform duration-700 group-hover:scale-[1.04]" /></div>
              <div className={`p-5 ${left ? "" : "sm:text-right"}`}>
                <div className={`${mono} flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50 ${left ? "" : "sm:justify-end"}`}>{left && icon}{label}{!left && icon}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{q.title}</div>
                <div className="mt-1 text-[15px] text-white/60">{q.tagline}</div>
              </div>
            </>
          )
          const cls = "qv-card is-hover group block overflow-hidden"
          return t
            ? (t.external ? <a key={label} href={t.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <Link key={label} href={t.href} className={cls}>{inner}</Link>)
            : <div key={label} className={cls}>{inner}</div>
        })}
      </nav>
    </article>
  )
}
