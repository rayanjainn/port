// Content helpers shared by the Quick View and the case-study pages.
import type { Project } from "@/lib/content"
import raw from "@/content/portfolio.json"

/** Ids that have a prerendered /quick/[id] page (the published content). */
export const STATIC_IDS: ReadonlySet<string> = new Set(raw.projects.map((p) => p.id))

export const SITE_ANCHORS = [
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "studies", label: "Education" },
  { id: "contact", label: "Contact" },
] as const

export type SectionId = (typeof SITE_ANCHORS)[number]["id"]

/** Where a project's card should go: its case study when one is prerendered, else its own URL. */
export function projectHref(p: Project, staticIds: ReadonlySet<string>): { href: string; external: boolean } | null {
  if (staticIds.has(p.id)) return { href: `/quick/${p.id}`, external: false }
  const ext = p.liveUrl || p.githubUrl
  return ext ? { href: ext, external: true } : null
}

export type Tier = 1 | 2 | 3
export const TIERS: Record<Tier, { label: string; hint: string }> = {
  3: { label: "Daily driver", hint: "What I reach for first" },
  2: { label: "Comfortable", hint: "Productive without the docs" },
  1: { label: "Familiar", hint: "Shipped with it, still sharpening" },
}
/** Collapse the numeric level into three honest tiers. */
export const tierOf = (level: number): Tier => (level >= 82 ? 3 : level >= 70 ? 2 : 1)

const ALIAS: Record<string, string[]> = { "gh actions": ["github actions"], "node.js": ["node"] }
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, "")

/** Projects that use a skill, matched against tags (tech), language and description. */
export function projectsUsing(skill: string, projects: Project[]): Project[] {
  const parts = skill.split("/").map((s) => s.trim().toLowerCase()).filter(Boolean)
  const toks = parts.flatMap((t) => [t, ...(ALIAS[t] ?? [])])
  return projects.filter((p) => {
    const tags = [...p.tech, p.language].map(norm)
    const desc = `${p.description} ${p.highlights.join(" ")}`.toLowerCase()
    return toks.some((t) => {
      if (tags.includes(norm(t))) return true
      return t.length >= 4 && new RegExp(`(^|[^a-z0-9])${esc(t)}([^a-z0-9]|$)`).test(desc)
    })
  })
}

export interface Seg { text: string; strong: boolean }

/** Split a highlight into plain and emphasised runs: metrics first, else the leading words. */
export function emphasize(text: string): Seg[] {
  const re = /\d[\d.,]*(?:\s?(?:%|×|x\b|\+|k\b))?(?:\s(?:accuracy|AUC-ROC|concurrent|simultaneous|players|louder))?/g
  const segs: Seg[] = []
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), strong: false })
    segs.push({ text: m[0], strong: true })
    last = m.index + m[0].length
  }
  if (segs.some((s) => s.strong)) {
    if (last < text.length) segs.push({ text: text.slice(last), strong: false })
    return segs
  }
  const words = text.split(" ")
  const n = Math.min(3, Math.max(1, Math.ceil(words.length / 3)))
  return [{ text: words.slice(0, n).join(" "), strong: true }, { text: " " + words.slice(n).join(" "), strong: false }]
}
