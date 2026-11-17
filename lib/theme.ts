"use client"
// World theme access for code that CSS cannot reach (canvas drawing, 3D overlay, charts).
// The tokens themselves live in app/themes.css under [data-world="…"]; this reads them once per world.
import { useMemo } from "react"
import { useGameStore } from "@/lib/store"
import { worldById, type Material } from "@/lib/world/worlds"
import { runtime } from "@/lib/runtime"

export interface WorldTokens {
  id: string
  material: Material
  accent: string
  accent2: string
  ink: string
  body: string
  muted: string
  dark: string
  sec: Record<string, string>
  sign: { bg: string; edge: string; hi: string; ink: string; sub: string; on: string }
  prompt: { bg: string; edge: string; ink: string; low: string; key: string; keyHi: string; keyInk: string }
  bubble: { bg: string; edge: string; ink: string }
  mark: { fill: string; on: string; edge: string; bang: string }
  mapTint: string
}

const cache = new Map<string, WorldTokens>()
const SECTIONS = ["townhall", "gallery", "tavern", "forge", "academy", "wizard"] as const

/** the world whose skin is currently applied to the document (falls back to the village) */
export function currentWorldId(): string {
  if (typeof document === "undefined") return "village"
  return document.documentElement.dataset.world ?? "village"
}

export function getWorldTokens(id: string = currentWorldId()): WorldTokens {
  const hit = cache.get(id)
  if (hit) return hit
  const w = worldById(id)
  const fallback = (): WorldTokens => ({
    id, material: w.theme.material, accent: w.theme.accent, accent2: w.theme.accent2, ink: "#3a2412", body: "#5c4022", muted: "#7a5f34", dark: w.theme.dark,
    sec: {},
    sign: { bg: "#8a5a2c", edge: "#2a1606", hi: "#a8743c", ink: "#fff4dc", sub: "#fff", on: "#ffe39a" },
    prompt: { bg: "#fbf1d6", edge: "#1d1006", ink: "#3a2412", low: "#e3cf9c", key: "#c8463b", keyHi: "#e86a5c", keyInk: "#fff4dc" },
    bubble: { bg: "#fff", edge: "#1d1006", ink: "#2a1a10" },
    mark: { fill: "#fff4dc", on: "#ffd76a", edge: "#1d1006", bang: "#c8463b" },
    mapTint: "rgba(160,110,40,.1)",
  })
  if (typeof document === "undefined" || document.documentElement.dataset.world !== id) return fallback()
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string, d = "") => cs.getPropertyValue(n).trim() || d
  const t: WorldTokens = {
    id,
    material: (v("--u-material", w.theme.material) as Material),
    accent: v("--u-accent"), accent2: v("--u-accent2"), ink: v("--u-ink"), body: v("--u-body"), muted: v("--u-muted"), dark: v("--u-dark"),
    sec: Object.fromEntries(SECTIONS.map((s) => [s, v(`--u-sec-${s}`)])),
    sign: { bg: v("--cv-sign-bg"), edge: v("--cv-sign-edge"), hi: v("--cv-sign-hi"), ink: v("--cv-sign-ink"), sub: v("--cv-sign-sub"), on: v("--cv-sign-on") },
    prompt: { bg: v("--cv-prompt-bg"), edge: v("--cv-prompt-edge"), ink: v("--cv-prompt-ink"), low: v("--cv-prompt-low"), key: v("--cv-key-bg"), keyHi: v("--cv-key-hi"), keyInk: v("--cv-key-ink") },
    bubble: { bg: v("--cv-bub-bg"), edge: v("--cv-bub-edge"), ink: v("--cv-bub-ink") },
    mark: { fill: v("--cv-mark"), on: v("--cv-mark-on"), edge: v("--cv-mark-edge"), bang: v("--cv-bang") },
    mapTint: v("--cv-map-tint"),
  }
  cache.set(id, t)
  return t
}

/** React hook: the tokens of the world the player is in. Re-resolves when the world changes. */
export function useWorldTheme(): WorldTokens {
  const id = useGameStore((s) => s.world)
  // the data-world attribute is applied by ThemeSync in an effect, so read lazily on first use
  return useMemo(() => getWorldTokens(id), [id])
}

// Keep <html data-world> in lock-step with the store, synchronously: this listener is registered before any
// component subscribes, so the skin is already switched when React re-renders for the new world.
function applyWorld(id: string) {
  if (typeof document === "undefined") return
  if (document.documentElement.dataset.world !== id) document.documentElement.dataset.world = id
}
if (typeof document !== "undefined") {
  applyWorld(useGameStore.getState().world)
  useGameStore.subscribe((s, p) => { if (s.world !== p.world) applyWorld(s.world) })
}

/** flavour names for the six section buildings, per world (the information stays the same) */
export const SECTION_NAMES: Record<string, Record<string, { title: string; sub: string }>> = {
  village: {
    townhall: { title: "TOWN HALL", sub: "The hero's chronicle" }, gallery: { title: "THE GALLERY", sub: "Things I've built, hung on the wall" },
    tavern: { title: "THE TAVERN", sub: "Tales of quests taken and guilds joined" }, forge: { title: "THE FORGE", sub: "Weapons of choice, tempered by shipping" },
    academy: { title: "THE ACADEMY", sub: "Studies, honours and badges earned" }, wizard: { title: "WIZARD TOWER", sub: "" },
  },
  city: {
    townhall: { title: "CITY HALL", sub: "Resident file: the full record" }, gallery: { title: "BILLBOARD ROW", sub: "Everything shipped, lit up on the skyline" },
    tavern: { title: "THE DEPOT", sub: "Career lines, stop by stop" }, forge: { title: "THE GARAGE", sub: "Stack, rigged and tuned" },
    academy: { title: "THE CAMPUS", sub: "Studies, honours and badges earned" }, wizard: { title: "THE UPLINK", sub: "" },
  },
  desert: {
    townhall: { title: "THE PALACE", sub: "The traveller's stele and story" }, gallery: { title: "RELIC HALL", sub: "Tablets of work worth keeping" },
    tavern: { title: "THE CARAVANSERAI", sub: "Roads walked and caravans joined" }, forge: { title: "THE KILN", sub: "Tools of the trade, fired and tested" },
    academy: { title: "THE SCRIPTORIUM", sub: "Studies, honours and seals earned" }, wizard: { title: "THE ORACLE", sub: "" },
  },
  ruins: {
    townhall: { title: "THE CRYPT HALL", sub: "A life remembered in whispers" }, gallery: { title: "THE MEMORY VAULT", sub: "Things I've built, bottled as memories" },
    tavern: { title: "THE WAKE INN", sub: "Hauntings survived and crews joined" }, forge: { title: "THE SOULFORGE", sub: "Skills bound in glowing stone" },
    academy: { title: "THE OSSUARY LIBRARY", sub: "Studies, honours and badges earned" }, wizard: { title: "THE SEANCE ROOM", sub: "" },
  },
}

/** small bits of per-world wording used by the chrome (labels, kickers); layout and content stay identical */
export const VOCAB: Record<string, { pass: string; map: string; toast: string; toastNote: string; hero: string; dialog: string; area: string }> = {
  village: { pass: "ADVENTURER", map: "MAP", toast: "UNLOCKED", toastNote: "ACHIEVEMENT", hero: "A PLAYABLE PORTFOLIO", dialog: "SPEAKING", area: "NOW ENTERING" },
  city: { pass: "HARBOR PASS", map: "METRO", toast: "NEW ALERT", toastNote: "ACHIEVEMENT", hero: "RESIDENT FILE // PLAYABLE PORTFOLIO", dialog: "INCOMING", area: "NOW ARRIVING" },
  desert: { pass: "CARAVAN SEAL", map: "CHART", toast: "SEALED", toastNote: "ACHIEVEMENT", hero: "A PLAYABLE PORTFOLIO", dialog: "SPEAKS", area: "NOW ENTERING" },
  ruins: { pass: "SPIRIT LEDGER", map: "GHOST CHART", toast: "A WHISPER", toastNote: "ACHIEVEMENT", hero: "A PLAYABLE PORTFOLIO", dialog: "WHISPERS", area: "NOW HAUNTING" },
}

/** title / kicker / subtitle / accent of a section building in the current world (labels come from the world's own landmarks) */
export function useSection(id: string, fb: { title: string; sub: string }) {
  const world = useGameStore((s) => s.world)
  return useMemo(() => {
    const lm = runtime.landmarks.find((l) => l.id === id)
    const names = SECTION_NAMES[world]?.[id]
    return { title: lm?.label ?? fb.title, kicker: lm?.sub, sub: names?.sub || fb.sub, accent: getWorldTokens(world).sec[id] || "#8a5a2c" }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, id])
}
