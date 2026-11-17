"use client"
// The art area of a project card. Today: the Quick View's generative illustration (same motif system), rendered
// through a pixelating SVG filter so it reads as pixel art inside the world frame.
// To swap in hand-made exhibit illustrations later, return an image URL from `exhibitArt()` below and the cover
// draws that (crisp, image-rendering: pixelated) instead; nothing else has to change.
import type { CSSProperties } from "react"
import type { Project } from "@/lib/content"
import ProjectArt from "@/components/quick/ProjectArt"
import { motifFor } from "@/lib/quick/motif"
import { MOTIF_ICON } from "@/lib/itemIcons"
import { exhibitArtPath } from "@/lib/world/exhibits"

/** Hook for per-project pixel illustrations (lib/world/exhibits.ts). Return a PNG/GIF URL, or undefined to use the generative art. */
const BAKED = new Set(["aio", "boomsuite", "chess", "classroom-mcp", "creatorai", "creditiq", "ctrlfixit", "daily-games", "dapdap", "devhub", "draw-app", "duckops", "ferrite-browser", "financial-research-automation", "glitch", "ip-sniffer", "nebula", "neurocred", "poker", "sentinel", "skrgrep", "stackit", "vendex"])
export function exhibitArt(id: string): string | undefined {
  return BAKED.has(id) ? exhibitArtPath(id) : undefined
}

/** One shared pixelate filter (4px cells). Mounted once per page by the first cover. */
export function PixelFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <filter id="px4" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feFlood x="2" y="2" width="1" height="1" />
        <feComposite width="4" height="4" />
        <feTile result="cells" />
        <feComposite in="SourceGraphic" in2="cells" operator="in" />
        <feMorphology operator="dilate" radius="2" />
      </filter>
    </svg>
  )
}

export default function ProjectCover({ project, height = 140, className = "", badge = true }: { project: Project; height?: number | string; className?: string; badge?: boolean }) {
  const art = exhibitArt(project.id)
  const icon = MOTIF_ICON[motifFor(project)]
  return (
    <div className={`pcv ${className}`} style={{ height, ["--a" as string]: project.accent || "#ffd76a" } as CSSProperties}>
      {art
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={art} alt={project.title} className="pcv-img" />
        : <div className="pcv-art"><ProjectArt project={project} label={false} className="h-full w-full" /></div>}
      {badge && <span className="pcv-badge" aria-hidden>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/ui/icons/${icon}.png`} alt="" /></span>}
    </div>
  )
}
