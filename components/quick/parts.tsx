"use client"
import type { ReactNode } from "react"
import { LANG_COLORS } from "@/lib/content"

export const mono = "qv-mono"

export function SectionHead({ n, label, title, aside, children }: { n: string; label: string; title: string; aside?: ReactNode; children?: ReactNode }) {
  return (
    <header>
      <div className={`qv-eyebrow ${mono}`}><b>{n}</b><span>{label}</span><i />{aside && <span className="normal-case tracking-normal">{aside}</span>}</div>
      <h2 className="qv-h2">{title}</h2>
      {children && <div className="mt-5">{children}</div>}
    </header>
  )
}

export const LangDot = ({ lang }: { lang: string }) => <span className="inline-block h-2 w-2 rounded-full" style={{ background: LANG_COLORS[lang] ?? "#888" }} />
