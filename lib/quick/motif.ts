// Deterministic helpers that turn a project record into a visual motif.
// Pure functions only: usable from server and client components alike.
import type { Project } from "@/lib/content"

export type Motif =
  | "shield" | "network" | "pipeline" | "api" | "cards" | "wave"
  | "terminal" | "dial" | "neural" | "scan" | "hash" | "board" | "dock" | "grid" | "glitch" | "ledger" | "tools" | "mosaic"

type Keyworded = Exclude<Motif, "mosaic">

// Keyword lists per motif. Order doubles as the tie-break.
const KW: Record<Keyworded, string[]> = {
  shield: ["browser", "agent", "agents", "sandbox", "sandboxed", "consent", "audit", "guard", "trust", "safe", "safety", "injection", "servo", "privacy", "permission"],
  network: ["firewall", "monitor", "network", "packet", "connection", "connections", "traffic", "process", "sentinel", "topology", "graph", "mesh", "p2p"],
  pipeline: ["devops", "pipeline", "ci", "cd", "deploy", "kubernetes", "k8s", "terraform", "ansible", "jenkins", "provision", "provisioning", "platform", "helm", "infrastructure", "workflow"],
  api: ["api", "http", "graphql", "websocket", "request", "requests", "postman", "devtools", "cdp", "rest", "rpc", "endpoint", "burp", "inspector", "sdk"],
  cards: ["poker", "card", "cards", "casino", "blackjack", "holdem", "deck", "tabletop"],
  wave: ["audio", "sound", "music", "volume", "equalizer", "eq", "coreaudio", "gain", "podcast", "synth", "midi", "speaker"],
  terminal: ["cli", "grep", "terminal", "shell", "homebrew", "command", "tui", "console", "bash", "zsh"],
  dial: ["credit", "score", "scoring", "risk", "fintech", "loan", "finance", "monte", "twin", "forecast", "payments", "bank"],
  neural: ["transformer", "transformers", "pytorch", "malware", "xai", "neural", "model", "llm", "llms", "tensorflow", "inference", "embedding", "embeddings", "classifier"],
  scan: ["video", "frame", "vision", "image", "images", "reel", "ocr", "camera", "scraping", "visual", "photo", "detection"],
  hash: ["fingerprint", "fingerprints", "watermark", "watermarking", "piracy", "hamming", "hash", "hashing", "checksum", "dedupe", "blockchain"],
  dock: ["launcher", "dock", "notch", "widget", "widgets", "palette", "macos", "spotlight", "island", "appkit", "menubar"],
  grid: ["puzzle", "puzzles", "daily", "streak", "streaks", "wordle", "crossword", "habit"],
  glitch: ["glitch", "bug", "unity", "urp", "systemic", "corrupt", "playtest"],
  ledger: ["sec", "edgar", "filing", "filings", "financial", "statements", "ratios", "investor", "pptx", "benchmarks"],
  tools: ["mcp", "classroom", "assistant", "assistants", "gateway", "oauth"],
  board: ["scoreboard", "leaderboard", "competitive", "ranking", "contest", "tournament", "arena", "hackathon", "live events"],
}
const ORDER = Object.keys(KW) as Keyworded[]

const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
const hit = (toks: string[], kw: string) => toks.some((t) => t === kw || (kw.length >= 5 && t.startsWith(kw)))

type Probe = Pick<Project, "title" | "tagline" | "category" | "tech" | "description" | "highlights">

/** Pick the visual motif for a project from its words. Falls back to "mosaic". */
export function motifFor(p: Probe): Motif {
  const strong = `${p.title} ${p.tagline} ${p.category}`.toLowerCase()
  const mid = p.tech.join(" ").toLowerCase()
  const weak = `${p.description} ${p.highlights.join(" ")}`.toLowerCase()
  const fields: [string, string[], number][] = [[strong, tokens(strong), 3], [mid, tokens(mid), 2], [weak, tokens(weak), 1]]
  let best: Motif = "mosaic", bestScore = 1
  for (const m of ORDER) {
    let score = 0
    for (const [raw, toks, w] of fields) for (const kw of KW[m]) if (kw.includes(" ") ? raw.includes(kw) : hit(toks, kw)) score += w
    if (score > bestScore) { best = m; bestScore = score }
  }
  return best
}

export const MOTIF_LABEL: Record<Motif, string> = {
  shield: "guarded agent", network: "live topology", pipeline: "delivery pipeline", api: "request / response", cards: "card table", wave: "signal path",
  terminal: "command line", dock: "launcher and dock", grid: "daily grid", glitch: "corrupted level", ledger: "filing to report", tools: "assistant tools", dial: "risk model", neural: "model internals", scan: "visual search", hash: "fingerprint match", board: "live standings", mosaic: "system map",
}

/** 32-bit string hash, stable across server and client. */
export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Seeded PRNG (mulberry32): same seed, same sequence, everywhere. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
