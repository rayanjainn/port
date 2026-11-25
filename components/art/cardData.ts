// Shared data helpers for the Skills / Education & Honours / Contact cards. Same data in every world; the
// world files only decide how it is drawn.
import type { Achievement, Education, Portfolio, SkillGroup } from "@/lib/content"
type Socials = Portfolio["socials"]

export type Tier = 1 | 2 | 3
/** Three tiers, no percentages. 3 = expert, 2 = fluent, 1 = familiar. */
export const skillTier = (level: number): Tier => (level >= 84 ? 3 : level >= 74 ? 2 : 1)

export const TIER_WORDS: Record<string, [string, string, string]> = {
  village: ["APPRENTICE", "ADEPT", "MASTER"],
  city: ["INSTALLED", "TUNED", "OPTIMISED"],
  desert: ["NOVICE", "SKILLED", "MASTER"],
  ruins: ["FAINT", "KINDLED", "BLAZING"],
}

export const groupCount = (g: SkillGroup[]) => g.reduce((n, x) => n + x.items.length, 0)
export const tierCounts = (g: SkillGroup[]) => {
  const c: [number, number, number] = [0, 0, 0]
  for (const x of g) for (const i of x.items) c[skillTier(i.level) - 1]++
  return c
}
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/** Honour tiers: 1st places are the top tier, "Top N" results (and shipped packages) the second, badges the third. */
export type HonourTier = "first" | "top" | "badge"
export const honourTier = (a: Achievement): HonourTier => (/^1st/i.test(a.title) ? "first" : /^top\s*\d+/i.test(a.title) || a.kind === "package" ? "top" : "badge")

/** "Top 800, Meta Hackathon" + "Out of 31,000+ teams." → { rank: "TOP 800", of: "31,000+" } */
export function topOf(a: Achievement): { rank: string; of: string } | null {
  const m = a.title.match(/^top\s*(\d+(?:,\d{3})*)/i)
  if (!m) return null
  const of = (a.note ?? "").match(/out of\s*([\d,]+\+?)/i)
  return { rank: `TOP ${m[1]}`, of: of ? of[1] : "" }
}
/** "1st Place, Ignisa '26" → "Ignisa '26" */
export const eventName = (a: Achievement) => a.title.replace(/^(1st place|top\s*\d+(?:,\d{3})*),?\s*/i, "") || a.title

export function cgpa(e: Education): { last: string; avg: string; scale: string } | null {
  const m = (e.note ?? "").match(/CGPA\s*([\d.]+)\s*\/\s*(\d+)[^,.]*?(?:[,.]\s*([\d.]+)\s*\/\s*\d+)?/i)
  if (!m) return null
  const all = [...(e.note ?? "").matchAll(/([\d.]+)\s*\/\s*(\d+)/g)]
  return { last: all[0]?.[1] ?? m[1], avg: all[1]?.[1] ?? "", scale: all[0]?.[2] ?? m[2] }
}

export const years = (e: Education) => [e.start, e.end].filter(Boolean).join(" — ")

export interface Channel { id: string; label: string; value: string; href: string; kind: "mail" | "ext" }
export function channels(s: Socials): Channel[] {
  const strip = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
  const list: Channel[] = [
    { id: "email", label: "Email", value: s.email, href: s.email ? `mailto:${s.email}` : "", kind: "mail" },
    { id: "github", label: "GitHub", value: strip(s.github), href: s.github, kind: "ext" },
    { id: "linkedin", label: "LinkedIn", value: strip(s.linkedin), href: s.linkedin, kind: "ext" },
    { id: "x", label: "X / Twitter", value: s.twitter.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, "@"), href: s.twitter, kind: "ext" },
    { id: "web", label: "Website", value: strip(s.website), href: s.website, kind: "ext" },
    { id: "leetcode", label: "LeetCode", value: (s.leetcode ?? "").replace(/^https?:\/\/(www\.)?leetcode\.com\/u\//, "@").replace(/\/$/, ""), href: s.leetcode ?? "", kind: "ext" },
    { id: "codeforces", label: "Codeforces", value: (s.codeforces ?? "").replace(/^https?:\/\/(www\.)?codeforces\.com\/profile\//, "@"), href: s.codeforces ?? "", kind: "ext" },
  ]
  return list.filter((c) => c.href)
}

export const mailto = (email: string, name: string, msg: string) =>
  `mailto:${email}?subject=${encodeURIComponent(`Hello from ${name || "a traveller"} (via your portfolio)`)}&body=${encodeURIComponent(msg)}`
