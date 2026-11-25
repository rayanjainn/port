"use client"
import { useMemo, useRef } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { useContent, type Experience, type ShippedItem } from "@/lib/content"
import { STATIC_IDS } from "@/lib/quick/data"
import { durationLabel, fromIndex, monthName, monthsInclusive, parseYm, ymIndex } from "@/lib/quick/time"
import { Reveal } from "./fx"
import { SectionHead, mono } from "./parts"

const REF = new Date(Date.UTC(2026, 10, 17))

function span(e: Experience) {
  const a = parseYm(e.start, "start", REF), b = parseYm(e.end, "end", REF)
  return a && b ? { a, b, n: monthsInclusive(a, b) } : null
}

/** Overlapping roles on one month ruler, so a year of parallel work reads at a glance. */
function Lanes({ items }: { items: Experience[] }) {
  const rows = items.map((e) => ({ e, s: span(e) })).filter((x): x is { e: Experience; s: NonNullable<ReturnType<typeof span>> } => !!x.s)
  const lanes = useMemo(() => {
    if (rows.length < 2) return null
    const lo = Math.min(...rows.map((r) => ymIndex(r.s.a))), hi = Math.max(...rows.map((r) => ymIndex(r.s.b)))
    const total = hi - lo + 1
    return { lo, total, ticks: Array.from({ length: total }, (_, i) => fromIndex(lo + i)) }
  }, [rows])
  if (!lanes) return null
  const pct = (i: number) => ((i - lanes.lo) / lanes.total) * 100
  return (
    <div className="qv-card mt-10 p-4 sm:p-6" role="img" aria-label={`Roles on a timeline: ${rows.map((r) => `${r.e.role} at ${r.e.org}, ${r.e.start} to ${r.e.end}`).join("; ")}`}>
      <div className={`${mono} mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/45`}>
        <span>In parallel</span><span>{monthName(lanes.ticks[0].m)} {lanes.ticks[0].y} to {monthName(lanes.ticks[lanes.total - 1].m)} {lanes.ticks[lanes.total - 1].y}</span>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex" aria-hidden>
          {lanes.ticks.map((t, i) => <div key={i} className={`flex-1 border-l ${t.m === 0 ? "border-white/25" : "border-white/[0.06]"}`} />)}
        </div>
        <div className="relative space-y-2 py-1">
          {rows.map(({ e, s }) => {
            const lead = e.kind === "leadership"
            return (
              <div key={e.id} className="relative h-9">
                <div className={`absolute inset-y-0 flex items-center overflow-hidden rounded-lg px-2.5 text-[12.5px] font-medium sm:px-3 ${lead ? "bg-[#ffb547] text-[#1a0d06]" : "border border-[#ffb547]/55 bg-[#ffb547]/[0.1] text-[#f3ede2]"}`}
                  style={{ left: `${pct(ymIndex(s.a))}%`, width: `${pct(ymIndex(s.b) + 1) - pct(ymIndex(s.a))}%` }}>
                  <span className="truncate">{e.org}{pct(ymIndex(s.b) + 1) - pct(ymIndex(s.a)) >= 30 && <span className="hidden sm:inline"> · {e.role}</span>}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className={`${mono} relative mt-2 flex text-[10px] text-white/40`} aria-hidden>
        {lanes.ticks.map((t, i) => <div key={i} className="flex-1 overflow-hidden">{i === 0 || t.m === 0 || t.m % 3 === 0 ? <span>{monthName(t.m)}{t.m === 0 || i === 0 ? <span className="hidden sm:inline"> &apos;{String(t.y).slice(2)}</span> : null}</span> : null}</div>)}
      </div>
    </div>
  )
}

function Chip({ it }: { it: ShippedItem }) {
  const cls = "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px]"
  if (it.projectId && STATIC_IDS.has(it.projectId)) return <Link href={`/quick/${it.projectId}`} className={`${cls} border-[#ffb547]/45 bg-[#ffb547]/[0.08] text-[#f3ede2] transition hover:bg-[#ffb547]/20`}>{it.label}<ArrowUpRight size={13} className="text-[#ffb547]" /></Link>
  if (it.url) return <a href={it.url} target="_blank" rel="noreferrer" className={`${cls} border-white/20 bg-white/[0.03] text-white/80 transition hover:border-[#ffb547]/50 hover:text-white`}>{it.label}<ArrowUpRight size={13} className="text-white/45" /></a>
  return <span className={`${cls} border-dashed border-white/15 text-white/60`}>{it.label}</span>
}

export default function ExperienceSection() {
  const c = useContent()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] })
  const h = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  return (
    <section id="experience" className="qv-section mx-auto max-w-6xl px-5">
      <SectionHead n="04" label="Experience" title="Where I've been building." aside={`${c.experience.length} roles`} />
      <Lanes items={c.experience} />
      <div ref={ref} className="relative mt-12 pl-8 sm:pl-12">
        <div className="absolute bottom-0 left-[7px] top-0 w-px bg-white/10 sm:left-[11px]" />
        <motion.div style={{ height: h }} className="absolute left-[7px] top-0 w-px bg-gradient-to-b from-[#ffb547] to-[#ffb547]/30 sm:left-[11px]" />
        {c.experience.map((e, i) => {
          const now = e.end.toLowerCase() === "present"
          const sp = span(e)
          const showHl = e.highlights.length > 0
          return (
            <Reveal key={e.id} delay={i * 0.04} className="relative pb-12 last:pb-0">
              <span className="absolute -left-8 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-[#0b0a10] sm:-left-12 sm:h-6 sm:w-6">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffb547] sm:h-2 sm:w-2" style={{ boxShadow: now ? "0 0 12px #ffb547" : "none", opacity: now ? 1 : 0.6 }} />
              </span>
              <div className="grid gap-2 md:grid-cols-[200px_1fr] md:gap-8">
                <div className={`${mono} text-sm text-white/55`}>
                  {[e.start, e.end].filter(Boolean).join(" to ")}
                  {sp && <div className="mt-1 text-white/40">{durationLabel(sp.n)}</div>}
                  {e.location && <div className="mt-1 text-white/40">{e.location}</div>}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{e.role}</h3>
                    {e.kind && <span className={`${mono} rounded-md border border-[#ffb547]/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#ffb547]`}>{e.kind}</span>}
                  </div>
                  <div className="mt-1 text-lg font-medium text-[#ffb547]">{e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center hover:underline">{e.org}</a> : e.org}</div>
                  {e.description && <p className="mt-3 max-w-2xl leading-relaxed text-white/65">{e.description}</p>}
                  {e.shipped && e.shipped.length > 0 && (
                    <div className="mt-5">
                      <div className={`${mono} mb-2.5 text-[11px] uppercase tracking-[0.2em] text-white/45`}>Shipped here</div>
                      <div className="flex flex-wrap gap-2">{e.shipped.map((it) => <Chip key={it.label} it={it} />)}</div>
                    </div>
                  )}
                  {showHl && <ul className="mt-4 max-w-2xl space-y-2 text-[15px] leading-relaxed text-white/70">{e.highlights.map((hl) => <li key={hl} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#ffb547]/70">{hl}</li>)}</ul>}
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
