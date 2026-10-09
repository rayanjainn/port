// Browser-side GitHub helpers for the admin panel. No backend involved:
// public reads are anonymous, publishing uses the visitor's own token.
import type { Portfolio, Project } from "./content"

export interface Repo {
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  topics?: string[]
  stargazers_count: number
  forks_count: number
  fork: boolean
  archived: boolean
  created_at: string
  pushed_at: string
}

const API = "https://api.github.com"

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export async function fetchRepos(username: string, token?: string): Promise<Repo[]> {
  const all: Repo[] = []
  for (let page = 1; page <= 5; page++) {
    const url = token
      ? `${API}/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner&visibility=public`
      : `${API}/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=pushed`
    const res = await fetch(url, { headers: headers(token) })
    if (!res.ok) throw new Error(`GitHub responded ${res.status}${res.status === 403 ? " (rate limited — add a token or try later)" : ""}`)
    const batch = (await res.json()) as Repo[]
    all.push(...batch)
    if (batch.length < 100) break
  }
  return all
}

const ACCENTS = ["#f97316", "#22d3ee", "#facc15", "#a78bfa", "#f472b6", "#60a5fa", "#34d399", "#fb7185", "#4ade80", "#e879f9"]

export function prettyName(name: string) {
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

export function projectFromRepo(r: Repo, index = 0): Project {
  const tech = Array.from(new Set([r.language, ...(r.topics ?? []).map(prettyName)].filter(Boolean) as string[]))
  return {
    id: r.name.toLowerCase(),
    repo: r.name,
    title: prettyName(r.name),
    tagline: r.description ?? "",
    description: r.description ?? "",
    highlights: [],
    tech,
    language: r.language ?? "",
    category: "Project",
    year: r.created_at.slice(0, 4),
    githubUrl: r.html_url,
    liveUrl: r.homepage ?? "",
    image: "",
    accent: ACCENTS[index % ACCENTS.length],
    featured: false,
  }
}

/** UTF-8 safe base64 for the contents API. */
function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let bin = ""
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export async function publishContent(opts: {
  token: string; repo: string; branch: string; path: string; message: string; data: Portfolio
}): Promise<{ commitUrl: string }> {
  const { token, repo, branch, path, message, data } = opts
  const url = `${API}/repos/${repo}/contents/${path}`
  let sha: string | undefined
  const cur = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: headers(token), cache: "no-store" })
  if (cur.ok) sha = ((await cur.json()) as { sha: string }).sha
  else if (cur.status !== 404) throw new Error(`Could not read ${path} (${cur.status}). Check the repo name and token permissions.`)

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, branch, sha, content: toBase64(JSON.stringify(data, null, 2) + "\n") }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(`Publish failed (${res.status}): ${body.message ?? "unknown error"}`)
  }
  const out = (await res.json()) as { commit: { html_url: string } }
  return { commitUrl: out.commit.html_url }
}
