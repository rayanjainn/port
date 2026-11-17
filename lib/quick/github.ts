// Shapes content/github.json (written at build time by scripts/sync-github.mjs) for the Quick View.
// Everything here is computed on the server during prerender, so the page needs no client fetching.
import raw from "@/content/github.json"
import { monthLabel } from "./time"

export interface RecentRepo {
  name: string
  description: string
  language: string
  url: string
  homepage: string
  pushedAt: string
  /** "3 days ago", relative to the build. */
  ago: string
}

export interface QuickStats {
  generatedAt: string
  /** "17 Nov 2026" */
  asOf: string
  username: string
  totals: { publicRepos: number; owned: number; forks: number; withLanguage: number }
  firstRepoAt: string
  firstRepoLabel: string
  languages: { name: string; repos: number; share: number }[]
  createdByYear: { year: string; repos: number }[]
  createdByMonth: { month: string; repos: number }[]
  recent: RecentRepo[]
}

const DAY = 86_400_000

export function relativeDay(iso: string, now: Date): string {
  const d = Math.round((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.parse(`${iso}T00:00:00Z`)) / DAY)
  if (d <= 0) return "today"
  if (d === 1) return "yesterday"
  if (d < 14) return `${d} days ago`
  if (d < 60) return `${Math.round(d / 7)} weeks ago`
  if (d < 365) return `${Math.round(d / 30.4)} months ago`
  const y = Math.round(d / 365)
  return `${y} ${y === 1 ? "year" : "years"} ago`
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function buildStats(now: Date = new Date()): QuickStats {
  const g = raw as unknown as Omit<QuickStats, "asOf" | "firstRepoLabel" | "recent"> & { recent: Omit<RecentRepo, "ago">[] }
  const gen = new Date(g.generatedAt)
  return {
    ...g,
    asOf: `${gen.getUTCDate()} ${MONTHS[gen.getUTCMonth()]} ${gen.getUTCFullYear()}`,
    firstRepoLabel: monthLabel(g.firstRepoAt.slice(0, 7)),
    recent: g.recent.map((r) => ({ ...r, ago: relativeDay(r.pushedAt, now) })),
  }
}
