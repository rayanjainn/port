"use client"
import Link from "next/link"
import { ArrowUpRight, GraduationCap, Landmark, Medal, School, Trophy } from "lucide-react"
import { useContent, type Achievement, type Education } from "@/lib/content"
import { STATIC_IDS } from "@/lib/quick/data"
import { parseYm, ymIndex } from "@/lib/quick/time"
import { Reveal } from "./fx"
import { SectionHead, mono } from "./parts"

const REF = new Date(Date.UTC(2026, 10, 17))
const kindOf = (e: Education) => e.kind ?? "university"
const dates = (e: Education) => [e.start, e.end].filter(Boolean).join(" to ")

/** Two degrees on one axis: the overlap is the point. */
function DualTrack({ a, b }: { a: Education; b: Education }) {
  const pa = [parseYm(a.start, "start", REF), parseYm(a.end, "end", REF)], pb = [parseYm(b.start, "start", REF), parseYm(b.end, "end", REF)]
  if (pa.some((x) => !x) || pb.some((x) => !x)) return null
  const lo = ymIndex(pa[0]!), hi = Math.max(ymIndex(pa[1]!), ymIndex(pb[1]!)) + 1
  const pc = (i: number) => ((i - lo) / (hi - lo)) * 100
  const years: number[] = []
  for (let y = pa[0]!.y; y <= pb[1]!.y + 1; y++) if (y * 12 >= lo && y * 12 <= hi) years.push(y)
  const bar = (e: Education, p: typeof pa, solid: boolean) => (
    <div className="relative h-10">
      <div className={`absolute inset-y-0 flex items-center rounded-lg px-3 text-[12.5px] font-medium ${solid ? "bg-[#ffb547] text-[#1a0d06]" : "border border-[#ffb547]/60 bg-[#ffb547]/[0.12] text-[#f3ede2]"}`}
        style={{ left: `${pc(ymIndex(p[0]!))}%`, width: `${pc(ymIndex(p[1]!) + 1) - pc(ymIndex(p[0]!))}%` }}>
        <span className="truncate">{e.degree}</span>
      </div>
    </div>
  )
  const overlapL = pc(Math.max(ymIndex(pa[0]!), ymIndex(pb[0]!))), overlapR = pc(Math.min(ymIndex(pa[1]!), ymIndex(pb[1]!)) + 1)
  return (
    <div className="qv-card mt-4 p-4 sm:p-6" role="img" aria-label={`${a.degree} from ${a.start} to ${a.end} and ${b.degree} from ${b.start} to ${b.end}, running in parallel`}>
      <div className={`${mono} mb-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-white/45`}><span>Two tracks, one calendar</span><span className="text-[#ffb547]">Parallel since {b.start}</span></div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${overlapL}%`, width: `${overlapR - overlapL}%`, background: "repeating-linear-gradient(135deg, rgba(255,181,71,0.07) 0 6px, transparent 6px 12px)" }} aria-hidden />
        <div className="relative space-y-2">{bar(a, pa, true)}{bar(b, pb, false)}</div>
      </div>
      <div className={`${mono} relative mt-2 h-4 text-[10px] text-white/40`} aria-hidden>
        {years.map((y) => <span key={y} className="absolute -translate-x-1/2" style={{ left: `${pc(y * 12)}%` }}>{y}</span>)}
      </div>
    </div>
  )
}

function Plaque({ a, big = false }: { a: Achievement; big?: boolean }) {
  const c = useContent()
  const proj = a.projectId ? c.projects.find((p) => p.id === a.projectId) : undefined
  const first = /^1st\b/i.test(a.title)
  return (
    <div className={`qv-card flex h-full flex-col p-5 ${first ? "!border-[#ffb547]/50 bg-[#ffb547]/[0.05]" : ""} ${big ? "sm:p-6" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        {first ? <Trophy size={22} className="text-[#ffb547]" /> : <Medal size={20} className="text-[#ffb547]/80" />}
        <span className={`${mono} text-xs text-white/45`}>{a.date}</span>
      </div>
      <div className={`mt-5 font-semibold tracking-tight ${first ? "text-[34px] leading-none text-[#ffb547] sm:text-[40px]" : "text-xl"}`}>{a.title}</div>
      <div className="mt-2 text-white/70">{a.issuer}</div>
      {a.note && <div className="mt-2 text-sm leading-relaxed text-white/55">{a.note}</div>}
      <div className="mt-auto flex flex-wrap gap-x-4 pt-4 text-sm">
        {proj && STATIC_IDS.has(proj.id) && <Link href={`/quick/${proj.id}`} className="inline-flex min-h-9 items-center gap-1 text-[#ffb547] hover:underline">{proj.title} <ArrowUpRight size={14} /></Link>}
        {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-white/55 hover:text-white">Source <ArrowUpRight size={14} /></a>}
      </div>
    </div>
  )
}

const Plank = () => <div aria-hidden className="mt-3 h-2 rounded-full bg-gradient-to-b from-white/[0.14] to-white/[0.02] shadow-[0_14px_24px_-14px_rgba(255,181,71,0.25)]" />

function Shelf() {
  const c = useContent()
  const hack = c.achievements.filter((a) => a.kind === "hackathon")
  const pkg = c.achievements.filter((a) => a.kind === "package")
  const badges = c.achievements.filter((a) => !a.kind || a.kind === "badge")
  return (
    <div className="mt-20">
      <div className={`${mono} mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-white/50`}><Trophy size={15} className="text-[#ffb547]" /> Honours shelf<i className="h-px flex-1 bg-white/10" /></div>
      {(hack.length > 0 || pkg.length > 0) && (
        <div>
          <div className="grid gap-4 md:grid-cols-3">
            {hack.map((a, i) => <Reveal key={a.id} delay={i * 0.05} className="h-full"><Plaque a={a} big /></Reveal>)}
            {pkg.map((a, i) => (
              <Reveal key={a.id} delay={0.1 + i * 0.05} className="h-full">
                <div className="qv-card flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between"><span className={`${mono} text-[11px] uppercase tracking-[0.2em] text-white/45`}>Package</span><span className={`${mono} text-xs text-white/45`}>{a.date}</span></div>
                  <div className={`${mono} mt-5 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[15px]`}><span className="text-[#ffb547]">$</span> brew install skrgrep</div>
                  <div className="mt-4 text-xl font-semibold tracking-tight">{a.title}</div>
                  <div className="mt-1 text-white/65">{a.issuer}</div>
                  {a.note && <div className="mt-2 text-sm text-white/55">{a.note}</div>}
                  <div className="mt-auto flex gap-4 pt-4 text-sm">
                    {a.projectId && STATIC_IDS.has(a.projectId) && <Link href={`/quick/${a.projectId}`} className="inline-flex min-h-9 items-center gap-1 text-[#ffb547] hover:underline">skrgrep <ArrowUpRight size={14} /></Link>}
                    {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-white/55 hover:text-white">The tap <ArrowUpRight size={14} /></a>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Plank />
        </div>
      )}
      {badges.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-wrap gap-3">
            {badges.map((a) => {
              const inner = (<><span className="flex h-9 w-9 items-center justify-center bg-[#ffb547]/12 text-[#ffb547]" style={{ clipPath: "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" }}><Medal size={16} /></span><span><span className="block text-[15px] font-medium text-white/90">{a.title}</span><span className="block text-xs text-white/45">{a.issuer}</span></span></>)
              const cls = "qv-card is-hover flex min-h-14 items-center gap-3 rounded-2xl px-4 py-2"
              return a.url ? <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <div key={a.id} className={cls}>{inner}</div>
            })}
          </div>
          <Plank />
        </div>
      )}
    </div>
  )
}

export default function StudiesSection() {
  const c = useContent()
  const uni = c.education.filter((e) => kindOf(e) === "university")
  const prog = c.education.filter((e) => kindOf(e) === "programme")
  const school = c.education.filter((e) => kindOf(e) === "school")
  const lead = [...uni, ...prog]
  const dual = uni[0] && prog[0]
  return (
    <section id="studies" className="qv-section mx-auto max-w-6xl px-5">
      <SectionHead n="07" label="Education & honours" title="Two tracks, always learning." />
      {c.education.length > 0 && (
        <div className="mt-10">
          <div className="grid gap-4 md:grid-cols-2">
            {lead.map((e, i) => (
              <Reveal key={e.id} delay={i * 0.06} className="h-full">
                <div className="qv-card flex h-full flex-col p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffb547]/10 text-[#ffb547]">{kindOf(e) === "programme" ? <Landmark size={21} /> : <GraduationCap size={21} />}</div>
                    <span className={`${mono} text-[11px] uppercase tracking-[0.2em] text-white/45`}>{kindOf(e) === "programme" ? "Management" : "Engineering"}</span>
                  </div>
                  <div className="mt-5 text-2xl font-semibold leading-tight tracking-tight">{e.degree}{e.field ? `, ${e.field}` : ""}</div>
                  <div className="mt-2 text-white/70">{e.school}</div>
                  <div className={`${mono} mt-4 text-sm text-[#ffb547]`}>{dates(e)}</div>
                  {(e.place || e.note) && <div className="mt-2 text-sm text-white/55">{[e.place, e.note].filter(Boolean).join(" · ")}</div>}
                </div>
              </Reveal>
            ))}
          </div>
          {dual && <DualTrack a={uni[0]} b={prog[0]} />}
          {school.length > 0 && (
            <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.09] sm:grid-cols-2">
              {school.map((e) => (
                <div key={e.id} className="flex items-center gap-3 bg-[#0d0b13] px-5 py-4">
                  <School size={17} className="shrink-0 text-white/40" />
                  <div className="min-w-0 flex-1"><div className="text-[15px] leading-snug text-white/85"><b className="font-semibold">{e.degree}</b> · {e.school}</div></div>
                  <span className={`${mono} shrink-0 text-xs text-white/45`}>{dates(e)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {c.achievements.length > 0 && <Shelf />}
    </section>
  )
}
