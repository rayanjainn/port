"use client"
import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight, Briefcase, Medal } from "lucide-react"
import { useContent, type Project } from "@/lib/content"
import { STATIC_IDS, projectHref } from "@/lib/quick/data"
import { monthLabel, parseYm } from "@/lib/quick/time"
import { Reveal } from "./fx"
import { LangDot, SectionHead, mono } from "./parts"

interface Entry { key: string; kind: "project" | "role"; project?: Project; text?: string; sub?: string }
const ym = (s: string) => { const p = parseYm(s, "start", new Date(0)); return p ? `${p.y}-${String(p.m + 1).padStart(2, "0")}` : "" }

export default function BuildLog() {
  const c = useContent()
  const months = useMemo(() => {
    const m = new Map<string, Entry[]>()
    const add = (k: string, e: Entry) => { if (k >= "2024-01") m.set(k, [...(m.get(k) ?? []), e]) }
    for (const p of c.projects) if (p.started) add(ym(p.started), { key: p.id, kind: "project", project: p })
    for (const e of c.experience) {
      const s = ym(e.start), f = e.end.toLowerCase() === "present" ? "" : ym(e.end)
      if (s) add(s, { key: `${e.id}-in`, kind: "role", text: `Started as ${e.role}`, sub: [e.org, e.location].filter(Boolean).join(", ") })
      if (f) add(f, { key: `${e.id}-out`, kind: "role", text: `Finished as ${e.role}`, sub: [e.org, e.location].filter(Boolean).join(", ") })
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [c.projects, c.experience])
  const honour = (p: Project) => c.achievements.find((a) => a.projectId === p.id && a.kind === "hackathon")
  const count = c.projects.filter((p) => p.started).length
  return (
    <section id="log" className="qv-section mx-auto max-w-6xl px-5">
      <SectionHead n="03" label="Build log" title="What I started, and when." aside={`${count} projects`}>
        <p className="qv-lead">Newest first. The date is when each repository was created, with the internships and the CSI-SPIT year marked in between.</p>
      </SectionHead>
      <div className="relative mt-10">
        <div aria-hidden className="absolute bottom-0 left-[5.2rem] top-0 hidden w-px bg-white/10 sm:block" />
        {months.map(([k, items], mi) => {
          const year = k.slice(0, 4), showYear = mi === 0 || year !== months[mi - 1][0].slice(0, 4)
          return (
            <Reveal key={k} className="relative">
              {showYear && <div className={`${mono} pb-3 pt-6 text-sm text-white/30 first:pt-0`}>{year}</div>}
              <div className="grid gap-x-8 gap-y-1 pb-6 sm:grid-cols-[4.5rem_1fr]">
                <div className={`${mono} relative pt-1 text-[13px] text-white/55`}>
                  {monthLabel(k).split(" ")[0]}
                  <span aria-hidden className="absolute -right-[1.15rem] top-[0.55rem] hidden h-2 w-2 rounded-full bg-[#ffb547] sm:block" style={{ boxShadow: "0 0 0 4px #0b0a10" }} />
                </div>
                <ul className="grid gap-x-6 sm:grid-cols-2">
                  {items.map((e) => {
                    if (e.kind === "role") return (
                      <li key={e.key} className="flex min-h-10 items-start gap-2.5 py-1.5 text-[14.5px] text-white/50">
                        <Briefcase size={15} className="mt-[3px] shrink-0 text-white/35" /><span>{e.text}<span className="block text-xs text-white/35">{e.sub}</span></span>
                      </li>
                    )
                    const p = e.project!, t = projectHref(p, STATIC_IDS), h = honour(p)
                    const title = t ? (t.external ? <a href={t.href} target="_blank" rel="noreferrer">{p.title}</a> : <Link href={t.href}>{p.title}</Link>) : p.title
                    return (
                      <li key={e.key} className="group flex min-h-10 items-start gap-2.5 py-1.5">
                        <span className="mt-[7px]"><LangDot lang={p.language} /></span>
                        <div className="min-w-0 text-[14.5px]">
                          <span className="font-medium text-[#f3ede2] transition group-hover:text-[#ffb547] [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1">{title}{t && <ArrowUpRight size={12} className="ml-0.5 inline text-white/30" />}</span>
                          {h && <span className={`${mono} ml-2 inline-flex items-center gap-1 rounded border border-[#ffb547]/40 px-1.5 text-[10px] uppercase tracking-wider text-[#ffb547]`}><Medal size={10} />{h.title.split(",")[0]}</span>}
                          <span className="block text-white/50">{p.tagline}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
