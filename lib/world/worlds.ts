// The world registry: every place the hero can travel to, how to load it and how to present it.
// A world is "open" only when its loader is registered below; everything else shows as an uncharted
// "soon" card and is never loaded. To switch a world on, uncomment its single line in LOADERS.
import type { Portfolio } from "@/lib/content"
import type { Scene } from "./core"
import type { Track } from "@/lib/audio"

/** Everything a world needs at runtime: its scenes (entry scene first) and the art it must have on screen. */
export interface WorldModule {
  build: (content: Portfolio) => Record<string, Scene>
  preload: string[]
}

export type TravelKind = "dock" | "metro" | "caravan" | "gate"

export type Material = "parchment" | "neon" | "sandstone" | "spectral"
/** the world's UI palette: two accents, a dark and a light surface, and the material its panels are made of */
export interface WorldTheme { accent: string; accent2: string; dark: string; light: string; material: Material }

export interface WorldDef {
  theme: WorldTheme
  id: string
  name: string
  tagline: string
  scene: string                  // entry scene id
  accent: string
  accent2: string
  music: Track
  /** what the travel point is called here */
  travel: { kind: TravelKind; place: string; verb: string }
  facts: string[]
  /** ids of the places that count towards this world's progress (same ids the quest list uses) */
  landmarks: string[]
  /** pre-baked map renders (see public/worlds); absent = drawn as an uncharted card */
  preview?: { day: string; night?: string; w: number; h: number; pan: [number, number][]; start: "day" | "night" }
  /** silhouette used on the card while the world is uncharted */
  motif?: "dunes" | "ruins"
  roman: string
}

const DEFS: WorldDef[] = [
  {
    theme: { accent: "#9bd45a", accent2: "#ffd76a", dark: "#3a2412", light: "#fbf1d6", material: "parchment" },
    id: "village", name: "Hearthvale", tagline: "A lantern-lit village where every door opens onto a chapter of the story.",
    scene: "village", accent: "#9bd45a", accent2: "#ffd76a", music: "village", roman: "I",
    travel: { kind: "dock", place: "THE LAKE DOCK", verb: "SET SAIL" },
    facts: ["7 LANDMARKS", "4 ARCADE GAMES", "DAY / NIGHT"],
    landmarks: ["townhall", "gallery", "tavern", "forge", "academy", "wizard", "cave"],
    preview: { day: "/worlds/village.png", night: "/worlds/village-night.png", w: 1344, h: 1024, pan: [[34, 36], [58, 70]], start: "day" },
  },
  {
    theme: { accent: "#ff4fa3", accent2: "#5de6ff", dark: "#0e0c22", light: "#e9e4ff", material: "neon" },
    id: "city", name: "Neon Harbor", tagline: "A rain-bright port city that never turns its signs off.",
    scene: "city", accent: "#ff4fa3", accent2: "#5de6ff", music: "city", roman: "II",
    travel: { kind: "metro", place: "HARBOR METRO", verb: "RIDE THE METRO" },
    facts: ["7 LANDMARKS", "4 ARCADE GAMES", "LIVE TRAFFIC", "DAY / NIGHT"],
    landmarks: ["townhall", "gallery", "tavern", "forge", "academy", "wizard", "arcade"],
    preview: { day: "/worlds/city.png", night: "/worlds/city-night.png", w: 1408, h: 1024, pan: [[46, 40], [84, 47]], start: "night" },
  },
  {
    theme: { accent: "#f2a23a", accent2: "#ff6b4a", dark: "#4a2a14", light: "#f6e2b8", material: "sandstone" },
    id: "desert", name: "Ember Dunes", tagline: "Gold sand, a caravan road, and an oasis that is on no map.",
    scene: "desert", accent: "#f2a23a", accent2: "#ff6b4a", music: "desert", roman: "III", motif: "dunes",
    travel: { kind: "caravan", place: "THE CARAVAN", verb: "JOIN THE CARAVAN" },
    facts: ["???"], landmarks: [],
  },
  {
    theme: { accent: "#5fd0a0", accent2: "#9a7be0", dark: "#0c2a2a", light: "#cfe8de", material: "spectral" },
    id: "ruins", name: "Hollow Ruins", tagline: "Moss, broken columns, and something old still humming below.",
    scene: "ruins", accent: "#5fd0a0", accent2: "#9a7be0", music: "ruins", roman: "IV", motif: "ruins",
    travel: { kind: "gate", place: "THE OLD GATE", verb: "STEP THROUGH" },
    facts: ["???"], landmarks: [],
  },
]

// ── registration: one line per world ────────────────────────────
const LOADERS: Record<string, () => Promise<WorldModule>> = {
  village: async () => {
    const [v, i] = await Promise.all([import("./village"), import("./interiors")])
    return { build: (content) => ({ village: v.buildVillage(), ...i.buildInteriors(content) }), preload: [...v.VILLAGE_PRELOAD, ...i.INTERIOR_PRELOAD, "/worlds/village.png", "/worlds/village-night.png"] }
  },
  city: async () => {
    const c = await import("./city")
    return { build: (content) => ({ city: c.buildCity(content) }), preload: [...c.CITY_PRELOAD, "/worlds/city.png", "/worlds/city-night.png"] }
  },
  // TODO(worlds): switch on the desert once lib/world/desert.ts exists (adjust the call if buildDesert takes the content):
  // desert: async () => { const d = await import("./desert"); return { build: () => ({ desert: d.buildDesert() }), preload: d.DESERT_PRELOAD } },
  // TODO(worlds): switch on the ruins once lib/world/ruins.ts exists:
  // ruins: async () => { const r = await import("./ruins"); return { build: () => ({ ruins: r.buildRuins() }), preload: r.RUINS_PRELOAD } },
}

export type WorldStatus = "open" | "soon"
export type World = WorldDef & { status: WorldStatus }

export const WORLDS: World[] = DEFS.map((d) => ({ ...d, status: LOADERS[d.id] ? "open" : "soon" }))
export const OPEN_WORLDS = WORLDS.filter((w) => w.status === "open")
export const DEFAULT_WORLD = "village"

export const worldById = (id: string): World => WORLDS.find((w) => w.id === id) ?? WORLDS[0]
export const loaderFor = (id: string) => LOADERS[id]

/** key in the shared `visited` set: the village keeps its bare ids, every other world is prefixed */
export const visitKey = (world: string, id: string) => (world === "village" ? id : `${world}:${id}`)
export const worldVisitedCount = (world: World, visited: Set<string>) => world.landmarks.filter((l) => visited.has(visitKey(world.id, l))).length
