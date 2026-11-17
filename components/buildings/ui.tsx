"use client"
// Building-card helpers. They are thin adapters over the shared kit (components/ui/kit.tsx), so every section
// card is drawn in the material of the world the player is standing in.
import type { CSSProperties, ReactNode } from "react"
import { LANG_COLORS, type Project } from "@/lib/content"
import { Card as KCard, Chip as KChip, Pill as KPill, Button, SectionHead } from "@/components/ui/kit"

/** colour tokens as CSS variables, so inline styles re-skin with the world */
export const INK = {
  ink: "var(--u-ink)",
  body: "var(--u-body)",
  muted: "var(--u-muted)",
  line: "var(--u-line)",
  lineDk: "var(--u-line-dk)",
  card: "var(--u-card)",
  cardAlt: "var(--u-card-alt)",
  inset: "var(--u-inset)",
  cream: "var(--u-on-accent)",
}

export function SectionHeader({ icon, title, subtitle, accent, right, kicker }: {
  icon: ReactNode; title: string; subtitle: string; accent: string; right?: ReactNode; kicker?: string
}) {
  return <SectionHead icon={icon} title={title} subtitle={subtitle} accent={accent} right={right} kicker={kicker} />
}

export function Card({ children, style, accent, onClick, hover, className }: {
  children: ReactNode; style?: CSSProperties; accent?: string; onClick?: () => void; hover?: boolean; className?: string
}) {
  return <KCard accent={accent} hover={hover} className={className} style={{ ...(onClick ? { cursor: "pointer" } : null), ...style }} onClick={onClick}>{children}</KCard>
}

export function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return <KChip color={color}>{children}</KChip>
}

export function Pill({ children, bg }: { children: ReactNode; bg?: string; fg?: string }) {
  return <KPill color={bg}>{children}</KPill>
}

export function LinkBtn({ href, children, primary, color }: { href: string; children: ReactNode; primary?: boolean; color?: string }) {
  return <Button href={href} variant={primary ? "accent" : "plain"} accent={primary ? (color ?? "var(--u-accent)") : undefined}>{children}</Button>
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

/** Generated cover art for a project. The frame around it (painting, billboard, relic, memory jar) comes from the world's CSS. */
export function ProjectCover({ p, height = 150, big }: { p: Project; height?: number | string; big?: boolean }) {
  if (p.image) {
    return (
      <div className="pc pc-img" style={{ height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    )
  }
  const a = p.accent || "#ffd76a"
  return (
    <div className="pc" style={{ height, ["--a" as string]: a } as CSSProperties}>
      <div className="pc-grid" />
      <div className="pc-stairs">
        {[10, 18, 26, 34, 46].map((h, i) => (
          <div key={i} style={{ width: 12, height: h * (big ? 1.6 : 1), background: a, opacity: 0.18 + i * 0.12 }} />
        ))}
      </div>
      <div className="pc-title" style={{ fontSize: big ? "clamp(18px, 3vw, 28px)" : 15 }}>{p.title}</div>
      <div className="pc-cat">{p.category.toUpperCase()}</div>
    </div>
  )
}
