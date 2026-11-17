"use client"
// Shared UI primitives. They carry no colours: every world draws them differently through the classes in
// app/skins.css (frame shapes, ornaments, materials and motion), driven by the tokens in app/themes.css.
import Link from "next/link"
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentType, CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react"

type Div = Omit<HTMLAttributes<HTMLDivElement>, "color">
const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(" ")

/** The main frame: HUD cards, title card, dialogue, toasts, modals. `v` picks the size-specific ornament set. */
export function Panel({ v, fx, className, children, as, ...rest }: Div & { v?: "hud" | "title" | "dialog" | "toast" | "modal" | "map" | "tile"; fx?: boolean; as?: ElementType }) {
  const Tag = (as ?? "div") as unknown as ComponentType<Record<string, unknown>>
  return (
    <Tag className={cx("k-panel", className)} data-v={v} {...rest}>
      {fx && <i className="k-fx" aria-hidden />}
      {children}
    </Tag>
  )
}

/** A content card inside a frame. `accent` colours its top rule / edge light. */
export function Card({ accent, hover, className, style, children, ...rest }: Div & { accent?: string; hover?: boolean }) {
  return (
    <div className={cx("k-card", hover && "k-hover", className)} style={{ ...(accent ? { ["--c" as string]: accent } : null), ...style } as CSSProperties} {...rest}>
      {children}
    </div>
  )
}

/** Dark inset well (stat tiles, skill columns). */
export function Well({ className, children, ...rest }: Div) {
  return <div className={cx("k-well", className)} {...rest}>{children}</div>
}

type BtnProps = {
  variant?: "plain" | "cta" | "key" | "accent" | "danger" | "ghost"
  accent?: string
  href?: string
  external?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style"> & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "style" | "href">

/** Button / link. Village: gold button. City: illuminated key. Desert: inlaid stone. Ruins: rune stone. */
export function Button({ variant = "plain", accent, href, external, className, style, children, ...rest }: BtnProps) {
  const st = { ...(accent ? { ["--c" as string]: accent } : null), ...style } as CSSProperties
  const cls = cx("k-btn", className)
  if (href) {
    const isExt = external ?? /^(https?:|mailto:)/.test(href)
    const a = rest as AnchorHTMLAttributes<HTMLAnchorElement>
    if (isExt) return <a href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" className={cls} data-v={variant} style={st} {...a}>{children}</a>
    return <Link href={href} className={cls} data-v={variant} style={st} {...a}>{children}</Link>
  }
  return <button type="button" className={cls} data-v={variant} style={st} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
}

/** Square icon button (HUD toolbar, close buttons). 42px, so it is a comfortable touch target. */
export function IconButton({ title, active = true, danger, href, onClick, className, children }: {
  title: string; active?: boolean; danger?: boolean; href?: string; onClick?: () => void; className?: string; children: ReactNode
}) {
  const props = { title, "aria-label": title, className: cx("k-ibtn", className), "data-off": active ? undefined : "", "data-v": danger ? "danger" : undefined }
  if (href) return <Link href={href} {...props}>{children}</Link>
  return <button type="button" onClick={onClick} {...props}>{children}</button>
}

/** Title banner: red ribbon, LED header, cartouche, tombstone. */
export function Ribbon({ children, className, style, small }: { children: ReactNode; className?: string; style?: CSSProperties; small?: boolean }) {
  return <div className={cx("k-ribbon", className)} data-small={small ? "" : undefined} style={style}><span>{children}</span></div>
}

export function Chip({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return <span className={cx("k-chip", className)} style={color ? ({ ["--c" as string]: color } as CSSProperties) : undefined}>{children}</span>
}

export function Pill({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return <span className={cx("k-pill", className)} style={color ? ({ ["--c" as string]: color } as CSSProperties) : undefined}>{children}</span>
}

/** Progress / skill bar. `value` 0..1. */
export function Bar({ value, color, className, segments, style }: { value: number; color?: string; className?: string; segments?: boolean; style?: CSSProperties }) {
  return (
    <div className={cx("k-bar", className)} data-seg={segments ? "" : undefined} style={{ ...(color ? { ["--c" as string]: color } : null), ...style } as CSSProperties} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  )
}

export function Kbd({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <span className="k-kbd" data-wide={wide ? "" : undefined}>{children}</span>
}

/** Divider with the world's own flourish. */
export function Rule({ className }: { className?: string }) {
  return <div className={cx("k-rule", className)} aria-hidden><i /></div>
}

/** Round / faceted badge tile that holds an icon. */
export function Seal({ children, color, size = 48, className }: { children: ReactNode; color?: string; size?: number; className?: string }) {
  return <div className={cx("k-seal", className)} style={{ ["--c" as string]: color, width: size, height: size } as CSSProperties}>{children}</div>
}

/** Section header used at the top of every building card. */
export function SectionHead({ icon, title, subtitle, accent, right, kicker }: { icon: ReactNode; title: string; subtitle?: string; accent: string; right?: ReactNode; kicker?: string }) {
  return (
    <header className="k-head" style={{ ["--c" as string]: accent } as CSSProperties}>
      <Seal color={accent} size={48}>{icon}</Seal>
      <div className="k-head__txt">
        {kicker && <div className="k-head__kick">{kicker}</div>}
        <h2 className="k-head__title">{title}</h2>
        {subtitle && <div className="k-head__sub">{subtitle}</div>}
      </div>
      {right && <div className="k-head__right">{right}</div>}
    </header>
  )
}
