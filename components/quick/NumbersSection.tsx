"use client"
import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { useContent, LANG_COLORS } from "@/lib/content"
import { STATIC_IDS } from "@/lib/quick/data"
import { monthLabel } from "@/lib/quick/time"
import type { QuickStats } from "@/lib/quick/github"
import { CountUp, Reveal } from "./fx"
import { SectionHead, mono } from "./parts"

// Amber tints alternating light and deep so neighbouring groups stay distinct.
const RAMP = ["#ffb547", "#fbe3b4", "#c9852b", "#f1c981", "#9c6420", "#d9a85f", "#76501a", "#b88a48", "#5a4120", "#8d7048", "#3f3427"]
const tint = (i: number) => RAMP[Math.min(i, RAMP.length - 1)]

function Languages({ stats }: { stats: QuickStats }) {
  const [hot, setHot] = useState<string | null>(null)
  const langs = stats.languages
  const tiles = langs.flatMap((l, i) => Array.from({ length: l.repos }, (_, k) => ({ lang: l.name, i, k })))
  return (
    <div className="qv-card p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight">One square per repository</h3>
        <span className={`${mono} text-xs text-white/45`}>{stats.totals.withLanguage} repos · {langs.length} languages</span>
      </div>
      <div role="img" aria-label={`Languages by repository count: ${langs.map((l) => `${l.name} ${l.repos}`).join(", ")}`} className="mt-5 grid gap-[5px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(26px, 1fr))" }}>
        {tiles.map((t, n) => (
          <span key={n} title={t.lang} className="aspect-square rounded-[5px] transition-opacity duration-200"
            style={{ background: tint(t.i), opacity: hot && hot !== t.lang ? 0.16 : 1, outline: hot === t.lang ? "1px solid #fff" : "none" }} />
        ))}
      </div>
      <ul className="mt-6 grid gap-x-6 gap-y-1 sm:grid-cols-2" onMouseLeave={() => setHot(null)}>
        {langs.map((l, i) => (
          <li key={l.name}>
            <button type="button" onMouseEnter={() => setHot(l.name)} onFocus={() => setHot(l.name)} onBlur={() => setHot(null)}
              className="flex min-h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-[14.5px] text-white/80 transition hover:bg-white/[0.05]">
              <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: tint(i) }} />
              <span className="flex-1 truncate">{l.name}</span>
              <span className={`${mono} text-xs text-white/50`}>{l.repos}</span>
              <span className={`${mono} w-10 text-right text-xs text-white/35`}>{Math.round(l.share * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PerYear({ stats }: { stats: QuickStats }) {
  const max = Math.max(...stats.createdByYear.map((y) => y.repos), 1)
  const mmax = Math.max(...stats.createdByMonth.map((m) => m.repos), 1)
  return (
    <div className="qv-card flex flex-col p-5 sm:p-7">
      <h3 className="text-xl font-semibold tracking-tight">Repos created per year</h3>
      <div className="mt-6 flex h-40 items-end gap-3" role="img" aria-label={`Repositories created per year: ${stats.createdByYear.map((y) => `${y.year} ${y.repos}`).join(", ")}`}>
        {stats.createdByYear.map((y, i) => (
          <div key={y.year} className="flex h-full flex-1 flex-col justify-end">
            <div className={`${mono} mb-1.5 text-sm tabular-nums text-white/80`}>{y.repos}</div>
            <div className="rounded-t-lg" style={{ height: `${(y.repos / max) * 78}%`, minHeight: 6, background: `linear-gradient(to top, ${tint(Math.max(0, 3 - i))}, ${tint(Math.max(0, 2 - i))})` }} />
            <div className={`${mono} mt-2 text-xs text-white/50`}>{y.year}</div>
          </div>
        ))}
      </div>
      <div className="mt-7">
        <div className={`${mono} mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40`}>By month</div>
        <div className="flex h-10 items-end gap-[3px]" aria-hidden>
          {stats.createdByMonth.map((m) => <span key={m.month} title={`${monthLabel(m.month)}: ${m.repos}`} className="flex-1 rounded-[2px]" style={{ height: `${Math.max(m.repos ? 12 : 4, (m.repos / mmax) * 100)}%`, background: m.repos ? "#ffb547" : "rgba(255,255,255,0.1)", opacity: m.repos ? 0.45 + (m.repos / mmax) * 0.55 : 1 }} />)}
        </div>
        <div className={`${mono} mt-1.5 flex justify-between text-[10px] text-white/40`}><span>{monthLabel(stats.createdByMonth[0]?.month ?? "")}</span><span>{monthLabel(stats.createdByMonth[stats.createdByMonth.length - 1]?.month ?? "")}</span></div>
      </div>
    </div>
  )
}

function Recent({ stats }: { stats: QuickStats }) {
  const c = useContent()
  return (
    <div className="qv-card p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight">Recently shipped</h3>
        <span className={`${mono} text-xs text-white/45`}>last pushed, as of {stats.asOf}</span>
      </div>
      <ol className="mt-4 divide-y divide-white/[0.07]">
        {stats.recent.map((r) => {
          const p = c.projects.find((x) => x.repo.toLowerCase() === r.name.toLowerCase())
          const label = p?.title ?? r.name
          const inner = <><span className="truncate">{label}</span><ArrowUpRight size={13} className="shrink-0 text-white/35" /></>
          const cls = "inline-flex min-h-9 max-w-full items-center gap-1 font-medium text-[#f3ede2] hover:text-[#ffb547]"
          return (
            <li key={r.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem]">
              <div className="min-w-0">{p && STATIC_IDS.has(p.id) ? <Link href={`/quick/${p.id}`} className={cls}>{inner}</Link> : <a href={r.url} target="_blank" rel="noreferrer" className={cls}>{inner}</a>}</div>
              <span className={`${mono} order-3 col-span-2 flex min-w-0 items-center gap-2 text-xs text-white/45 sm:order-none sm:col-span-1`}>
                {r.language && <><span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: LANG_COLORS[r.language] ?? "#888" }} /><span className="truncate">{r.language}</span></>}
              </span>
              <span className={`${mono} whitespace-nowrap text-right text-xs text-[#ffb547]`}>{r.ago}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function NumbersSection({ stats }: { stats: QuickStats }) {
  const t = stats.totals
  const tiles = [
    { v: t.publicRepos, l: "public repositories" },
    { v: stats.languages.length, l: "languages" },
    { v: t.owned, l: "of them my own work" },
  ]
  return (
    <section id="numbers" className="qv-section mx-auto max-w-6xl px-5">
      <SectionHead n="06" label="By the numbers" title="Counted from GitHub." aside={`snapshot ${stats.asOf}`}>
        <p className="qv-lead">Pulled from the public API at build time, so nothing here is fetched in your browser. Forks of other people&apos;s work are left out of the counts. First repository: {stats.firstRepoLabel}.</p>
      </SectionHead>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {tiles.map((x, i) => (
          <Reveal key={x.l} delay={i * 0.05}>
            <div className="qv-card p-5 sm:p-6"><CountUp to={x.v} className="text-5xl font-semibold tracking-tight text-[#ffb547] sm:text-6xl" /><div className="mt-1 text-white/60">{x.l}</div></div>
          </Reveal>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Reveal><Languages stats={stats} /></Reveal>
        <Reveal delay={0.05}><PerYear stats={stats} /></Reveal>
      </div>
      <Reveal className="mt-4"><Recent stats={stats} /></Reveal>
    </section>
  )
}
