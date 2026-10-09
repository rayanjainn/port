"use client"
import type { CSSProperties, ReactNode } from "react"
import { LANG_COLORS, type Project } from "@/lib/content"

export const INK = {
  ink: "#3a2412",
  body: "#5c4022",
  muted: "#8f7246",
  line: "#d1b47a",
  lineDk: "#a07c45",
  card: "#f7eccd",
  cardAlt: "#efdfb4",
  inset: "#e4cf9a",
  cream: "#fff8e6",
}

export function SectionHeader({ icon, title, subtitle, accent, right }: {
  icon: ReactNode; title: string; subtitle: string; accent: string; right?: ReactNode
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 16,
      borderBottom: `2px dashed ${INK.lineDk}`,
    }}>
      <div style={{
        width: 48, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: accent, color: INK.cream, border: `3px solid ${INK.ink}`,
        boxShadow: `inset 0 0 0 2px rgba(255,255,255,.25), 0 3px 0 ${INK.ink}`,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "clamp(11px, 1.6vw, 15px)", color: INK.ink, letterSpacing: 1 }}>{title}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: INK.muted, marginTop: 6 }}>{subtitle}</div>
      </div>
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  )
}

export function Card({ children, style, accent, onClick, hover }: {
  children: ReactNode; style?: CSSProperties; accent?: string; onClick?: () => void; hover?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={hover ? "parch-card-hover" : undefined}
      style={{
        position: "relative", background: INK.card,
        border: `2px solid ${INK.lineDk}`,
        boxShadow: `0 3px 0 ${INK.line}`,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {accent && <div style={{ position: "absolute", left: -2, right: -2, top: -2, height: 4, background: accent }} />}
      {children}
    </div>
  )
}

export function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1,
      padding: "5px 9px", color: INK.ink,
      background: color ? `${color}22` : INK.cardAlt,
      border: `1.5px solid ${color ?? INK.lineDk}`,
      whiteSpace: "nowrap",
    }}>{children}</span>
  )
}

export function Pill({ children, bg = INK.ink, fg = INK.cream }: { children: ReactNode; bg?: string; fg?: string }) {
  return (
    <span style={{
      fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: 1,
      padding: "5px 8px", background: bg, color: fg, display: "inline-flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap",
    }}>{children}</span>
  )
}

export function LinkBtn({ href, children, primary, color }: { href: string; children: ReactNode; primary?: boolean; color?: string }) {
  const bg = primary ? (color ?? "#c8463b") : INK.cardAlt
  return (
    <a
      href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer"
      className="parch-btn"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
        fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 1,
        padding: "11px 14px",
        color: primary ? INK.cream : INK.ink,
        background: bg,
        border: `2px solid ${INK.ink}`,
        boxShadow: `inset 0 0 0 2px ${primary ? "rgba(255,255,255,.25)" : "#fff6dc"}, 0 3px 0 ${INK.ink}`,
      }}
    >{children}</a>
  )
}

export function LangDot({ lang }: { lang: string }) {
  const col = LANG_COLORS[lang] ?? "#888"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontSize: 14, color: INK.body }}>
      <span style={{ width: 10, height: 10, borderRadius: 10, background: col, border: "1.5px solid rgba(0,0,0,.35)" }} />
      {lang}
    </span>
  )
}

/** Generated cover art for a project — accent glow, pixel grid and monogram. */
export function ProjectCover({ p, height = 150, big }: { p: Project; height?: number | string; big?: boolean }) {
  if (p.image) {
    return (
      <div style={{ height, background: "#1a1028", overflow: "hidden", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    )
  }
  const a = p.accent || "#ffd76a"
  return (
    <div style={{
      height, position: "relative", overflow: "hidden",
      background: `radial-gradient(120% 90% at 85% 10%, ${a}66 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, ${a}33 0%, transparent 60%), linear-gradient(160deg, #1b1230 0%, #120b22 100%)`,
    }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.35,
        backgroundImage: `linear-gradient(${a}22 1px, transparent 1px), linear-gradient(90deg, ${a}22 1px, transparent 1px)`,
        backgroundSize: "12px 12px",
      }} />
      {/* pixel stairs decoration */}
      <div style={{ position: "absolute", right: 0, bottom: 0, display: "flex", alignItems: "flex-end" }}>
        {[10, 18, 26, 34, 46].map((h, i) => (
          <div key={i} style={{ width: 12, height: h * (big ? 1.6 : 1), background: a, opacity: 0.18 + i * 0.12 }} />
        ))}
      </div>
      <div style={{
        position: "absolute", left: 16, bottom: 14, right: 70,
        fontFamily: "var(--font-pixel)", fontSize: big ? "clamp(18px, 3vw, 28px)" : 15,
        color: "#fff", lineHeight: 1.2, textShadow: `0 3px 0 rgba(0,0,0,.5), 0 0 24px ${a}`,
        wordBreak: "break-word",
      }}>{p.title}</div>
      <div style={{
        position: "absolute", left: 16, top: 14,
        fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: 2, color: a,
      }}>{p.category.toUpperCase()}</div>
    </div>
  )
}
