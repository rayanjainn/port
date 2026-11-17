#!/usr/bin/env node
// Refreshes content/github.json from the public GitHub API. Plain Node, no dependencies.
//
//   node scripts/sync-github.mjs                 fetch live data
//   node scripts/sync-github.mjs --from file     summarise a saved API response instead (array, or { items })
//
// It runs as `prebuild`, so a deploy picks up fresh numbers. It must never break a build:
// on any network, rate-limit or parse failure the existing file is kept and the exit code is 0.
// Optional env: GITHUB_TOKEN (higher rate limit), GITHUB_API_BASE (testing).

import { readFile, writeFile, rename, mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const USER = "rayanjainn"
const API = process.env.GITHUB_API_BASE || "https://api.github.com"
const OUT = fileURLToPath(new URL("../content/github.json", import.meta.url))
const TIMEOUT_MS = 12_000
const MAX_PAGES = 5
const RECENT = 8

// GitHub flags a few of my own team repositories as forks. They are my work, so they count.
const KEEP_FORKS = new Set(["ferrite-browser", "creditiq"])

const log = (...a) => console.log("[sync-github]", ...a)

function headers() {
  const h = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "portfolio-build-sync" }
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

async function getJson(url) {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

async function fetchUsersApi() {
  const all = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await getJson(`${API}/users/${USER}/repos?per_page=100&page=${page}&sort=pushed`)
    if (!Array.isArray(batch)) throw new Error("unexpected users response")
    all.push(...batch)
    if (batch.length < 100) break
  }
  return all
}

async function fetchSearchApi() {
  const all = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await getJson(`${API}/search/repositories?q=${encodeURIComponent(`user:${USER} fork:true`)}&per_page=100&page=${page}`)
    if (!body || !Array.isArray(body.items)) throw new Error("unexpected search response")
    all.push(...body.items)
    if (body.items.length < 100) break
  }
  return all
}

const day = (iso) => String(iso).slice(0, 10)

function* monthsBetween(a, b) {
  let [y, m] = a.split("-").map(Number)
  const [ey, em] = b.split("-").map(Number)
  while (y < ey || (y === ey && m <= em)) {
    yield `${y}-${String(m).padStart(2, "0")}`
    if (++m > 12) { m = 1; y++ }
  }
}

export function summarise(repos, source, now = new Date()) {
  // Only public repositories ever reach the site, whatever the source file contains.
  const valid = repos.filter((r) => r && r.name && r.created_at && r.pushed_at && !r.private && r.visibility !== "private")
  const owned = valid.filter((r) => (!r.fork || KEEP_FORKS.has(r.name.toLowerCase())) && r.name.toLowerCase() !== USER)

  const langCount = new Map()
  for (const r of owned) if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1)
  const withLanguage = [...langCount.values()].reduce((a, b) => a + b, 0)
  const languages = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, repos]) => ({ name, repos, share: Math.round((repos / withLanguage) * 1000) / 1000 }))

  const created = owned.map((r) => day(r.created_at)).sort()
  const byYear = new Map()
  const byMonth = new Map()
  for (const d of created) {
    byYear.set(d.slice(0, 4), (byYear.get(d.slice(0, 4)) ?? 0) + 1)
    byMonth.set(d.slice(0, 7), (byMonth.get(d.slice(0, 7)) ?? 0) + 1)
  }
  const createdByYear = [...byYear.entries()].sort().map(([year, repos]) => ({ year, repos }))
  const createdByMonth = created.length
    ? [...monthsBetween(created[0].slice(0, 7), created[created.length - 1].slice(0, 7))].map((m) => ({ month: m, repos: byMonth.get(m) ?? 0 }))
    : []

  const recent = [...owned]
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, RECENT)
    .map((r) => ({
      name: r.name,
      description: r.description || "",
      language: r.language || "",
      url: r.html_url || `https://github.com/${USER}/${r.name}`,
      homepage: r.homepage || "",
      pushedAt: day(r.pushed_at),
    }))

  return {
    generatedAt: now.toISOString(),
    username: USER,
    source,
    totals: { publicRepos: valid.length, owned: owned.length, forks: valid.length - owned.length - (valid.some((r) => r.name.toLowerCase() === USER) ? 1 : 0), withLanguage },
    firstRepoAt: created[0] ?? "",
    languages,
    createdByYear,
    createdByMonth,
    recent,
  }
}

async function main() {
  const fromIdx = process.argv.indexOf("--from")
  let repos, source
  if (fromIdx > -1) {
    const raw = JSON.parse(await readFile(process.argv[fromIdx + 1], "utf8"))
    repos = Array.isArray(raw) ? raw : raw.items
    source = "file"
  } else {
    try {
      repos = await fetchUsersApi()
      source = "users-api"
    } catch (e) {
      log(`users endpoint failed (${e.message}); trying the search endpoint`)
      repos = await fetchSearchApi()
      source = "search-api"
    }
  }
  if (!Array.isArray(repos) || repos.length === 0) throw new Error("no repositories returned")
  const next = summarise(repos, source)
  await mkdir(dirname(OUT), { recursive: true })
  const tmp = `${OUT}.tmp`
  await writeFile(tmp, JSON.stringify(next, null, 2) + "\n")
  await rename(tmp, OUT)
  log(`wrote content/github.json from ${source}: ${next.totals.publicRepos} public repos, ${next.totals.owned} counted`)
}

main().catch((e) => {
  log(`kept the existing content/github.json (${e && e.message ? e.message : e})`)
}).finally(() => { process.exitCode = 0 })
