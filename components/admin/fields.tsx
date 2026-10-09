"use client"
import type { ReactNode } from "react"

export const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#ffd76a]/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#ffd76a]/15"

export function Field({ label, hint, children, span = 1 }: { label: string; hint?: string; children: ReactNode; span?: 1 | 2 }) {
  return (
    <label className={`block ${span === 2 ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-white/60">
        {label}
        {hint && <span className="font-normal text-white/35">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function Text({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

export function Area({ value, onChange, rows = 4, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <textarea className={`${inputCls} resize-y leading-relaxed`} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

/** Comma-separated list editor */
export function Tags({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <input
      className={inputCls}
      defaultValue={value.join(", ")}
      key={value.join("|")}
      placeholder={placeholder}
      onBlur={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
    />
  )
}

/** One item per line */
export function Lines({ value, onChange, rows = 3, placeholder }: { value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      className={`${inputCls} resize-y leading-relaxed`}
      rows={rows}
      defaultValue={value.join("\n")}
      key={value.join("|")}
      placeholder={placeholder}
      onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
    />
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-sm text-white/75"
    >
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[#ffd76a]" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px] bg-[#3a1d08]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  )
}

export const SWATCHES = ["#f97316", "#facc15", "#4ade80", "#34d399", "#22d3ee", "#60a5fa", "#a78bfa", "#e879f9", "#f472b6", "#fb7185", "#ef4444", "#ffd76a"]

export function ColorPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SWATCHES.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={c}
          className={`h-6 w-6 rounded-md border-2 transition ${value === c ? "border-white scale-110" : "border-transparent hover:scale-110"}`}
          style={{ background: c }} />
      ))}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
    </div>
  )
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.025] ${className}`}>{children}</div>
}

const BTN_BASE = "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
const BTN_VARIANT = {
  primary: "bg-[#ffd76a] text-[#2a1606] hover:bg-[#ffe08a] font-semibold",
  ghost: "border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.07] hover:text-white",
  soft: "bg-white/[0.06] text-white/80 hover:bg-white/[0.1]",
  danger: "border border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/20",
}

export function LinkBtn({ href, children, title }: { href: string; children: ReactNode; title?: string }) {
  return <a href={href} target="_blank" rel="noreferrer" title={title} className={`${BTN_BASE} ${BTN_VARIANT.ghost}`}>{children}</a>
}

export function Btn({ children, onClick, variant = "ghost", disabled, title, className = "" }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger" | "soft"; disabled?: boolean; title?: string; className?: string
}) {
  const v = BTN_VARIANT[variant]
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      className={`${BTN_BASE} ${v} ${className}`}>
      {children}
    </button>
  )
}
