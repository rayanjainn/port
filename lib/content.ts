"use client"
import { create } from "zustand"
import raw from "@/content/portfolio.json"

export interface Project {
  id: string
  repo: string
  title: string
  /** Optional short display name for plaques and signs */
  short?: string
  tagline: string
  description: string
  highlights: string[]
  tech: string[]
  language: string
  category: string
  year: string
  githubUrl: string
  liveUrl: string
  image: string
  accent: string
  featured: boolean
  /** Optional. Month the work started, "YYYY-MM" (repository creation). Drives the build log. */
  started?: string
}

export interface Experience {
  id: string
  role: string
  org: string
  url: string
  start: string
  end: string
  location: string
  description: string
  highlights: string[]
  tech: string[]
  /** Optional. Shown as a small tag on the Quick View timeline. */
  kind?: "internship" | "leadership"
  /** Optional. Things shipped in this role: a chip linking to a project page (projectId) or any URL. */
  shipped?: ShippedItem[]
}

export interface ShippedItem {
  label: string
  /** id of an entry in `projects`; links to its case study. */
  projectId?: string
  url?: string
}

export interface Education {
  id: string
  school: string
  degree: string
  field: string
  start: string
  end: string
  note: string
  /** Optional. Controls how prominent the entry is on the Quick View. Defaults to "university". */
  kind?: "university" | "programme" | "school"
  /** Optional. City or area. */
  place?: string
}

export interface Achievement {
  id: string
  title: string
  issuer: string
  date: string
  url: string
  /** Optional. Where it sits on the honours shelf. Defaults to "badge". */
  kind?: "hackathon" | "package" | "badge"
  /** Optional. One plain line of context. */
  note?: string
  /** Optional. id of the related project. */
  projectId?: string
}

export interface SkillGroup {
  group: string
  items: { name: string; level: number }[]
}

export interface Portfolio {
  meta: {
    siteTitle: string
    description: string
    githubUsername: string
    contentRepo: string
    contentBranch: string
    contentPath: string
  }
  profile: {
    name: string
    handle: string
    title: string
    tagline: string
    bio: string
    location: string
    avatar: string
    available: boolean
    availability: string
    now: string
    motto: string
    interests: string[]
    resumeUrl: string
  }
  socials: {
    email: string
    github: string
    linkedin: string
    twitter: string
    website: string
    leetcode?: string
    codeforces?: string
  }
  projects: Project[]
  experience: Experience[]
  education: Education[]
  achievements: Achievement[]
  skills: SkillGroup[]
}

export const PUBLISHED: Portfolio = raw as Portfolio
export const DRAFT_KEY = "rayan-world:draft"

interface ContentStore {
  data: Portfolio
  preview: boolean
  setData: (d: Portfolio, preview?: boolean) => void
}

export const useContentStore = create<ContentStore>((set) => ({
  data: PUBLISHED,
  preview: false,
  setData: (data, preview = false) => set({ data, preview }),
}))

export const useContent = () => useContentStore((s) => s.data)

/** When the URL carries ?preview, swap in the unpublished draft saved by /admin. */
export function loadPreviewDraft() {
  if (typeof window === "undefined") return
  if (!new URLSearchParams(window.location.search).has("preview")) return
  try {
    const draft = window.localStorage.getItem(DRAFT_KEY)
    if (draft) useContentStore.getState().setData(JSON.parse(draft) as Portfolio, true)
  } catch {}
}

/** Language → colour, GitHub-style. */
export const LANG_COLORS: Record<string, string> = {
  Rust: "#dea584",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Swift: "#f05138",
  Go: "#00add8",
  Java: "#b07219",
  "C++": "#f34b7d",
  Lua: "#000080",
  Ruby: "#701516",
  EJS: "#a91e50",
}
