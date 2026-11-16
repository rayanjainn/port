import { create } from "zustand"
import { gameAchievements } from "./data"
import { DEFAULT_WORLD, OPEN_WORLDS, visitKey } from "./world/worlds"

export type BuildingId = "townhall" | "tavern" | "academy" | "gallery" | "forge" | "wizard" | "cave" | null

export type ViewMode = "2d" | "3d"
const VIEW_KEY = "rayan-world:view"
let gl2: boolean | null = null
export function webgl2Supported() {
  if (gl2 !== null) return gl2
  if (typeof document === "undefined") return false
  try { gl2 = !!document.createElement("canvas").getContext("webgl2") } catch { gl2 = false }
  return gl2
}
function initialView(): ViewMode {
  if (typeof window === "undefined" || !webgl2Supported()) return "2d"
  try { const v = localStorage.getItem(VIEW_KEY); if (v === "2d" || v === "3d") return v } catch { /* private mode */ }
  const small = matchMedia("(pointer: coarse)").matches || Math.min(window.innerWidth, window.innerHeight) < 600
  return small ? "2d" : "3d"
}

const WORLD_KEY = "rayan-world:world"
function initialWorld(): string {
  if (typeof window === "undefined") return DEFAULT_WORLD
  try { const w = localStorage.getItem(WORLD_KEY); if (w && OPEN_WORLDS.some((o) => o.id === w)) return w } catch { /* private mode */ }
  return DEFAULT_WORLD
}

/** where the world-select screen was opened from; the dock / metro origins pick the travel interstitial */
export type WorldSelectOrigin = "title" | "hud" | "dock" | "metro" | "caravan" | "gate"
export interface TravelState { from: string; to: string; origin: WorldSelectOrigin }
export interface WorldLoad { state: "idle" | "loading" | "ready" | "error"; progress: number }

export interface DialogState {
  name: string
  face?: string
  lines: string[]
  onDone?: () => void
}

interface GameStore {
  phase: "title" | "playing" | "building"
  activeBuilding: BuildingId
  focus: string | null
  unlockedAchievements: Set<string>
  visited: Set<string>
  toastQueue: Array<{ id: string; title: string; icon: string; description: string }>
  sfxEnabled: boolean
  musicEnabled: boolean
  mapOpen: boolean
  dialog: DialogState | null
  arcade: string | null
  areaTitle: { title: string; sub: string; key: number } | null
  sceneId: string
  view: ViewMode
  world: string
  worldSelect: WorldSelectOrigin | null
  travel: TravelState | null
  worldLoad: Record<string, WorldLoad>
  /** bumped by the world-select screen when a pick on the title should start the game */
  startRequest: number
  setWorld: (id: string) => void
  openWorldSelect: (origin: WorldSelectOrigin) => void
  closeWorldSelect: () => void
  beginTravel: (t: TravelState) => void
  endTravel: () => void
  setWorldLoad: (id: string, w: Partial<WorldLoad>) => void
  requestStart: () => void
  setView: (v: ViewMode, persist?: boolean) => void
  toggleView: () => void
  startGame: () => void
  openBuilding: (id: BuildingId, focus?: string | null, world?: string) => void
  closeBuilding: () => void
  unlockAchievement: (unlockedBy: string) => void
  popToast: () => void
  toggleSfx: () => void
  toggleMusic: () => void
  setMapOpen: (v: boolean) => void
  say: (d: DialogState | null) => void
  openArcade: (id: string | null) => void
  showArea: (title: string, sub: string) => void
  setScene: (id: string) => void
  markVisited: (id: string) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "title",
  activeBuilding: null,
  focus: null,
  unlockedAchievements: new Set(),
  visited: new Set(),
  toastQueue: [],
  sfxEnabled: true,
  musicEnabled: true,
  mapOpen: false,
  dialog: null,
  arcade: null,
  areaTitle: null,
  sceneId: "village",
  view: initialView(),
  world: initialWorld(),
  worldSelect: null,
  travel: null,
  worldLoad: {},
  startRequest: 0,
  setWorld: (id) => {
    try { localStorage.setItem(WORLD_KEY, id) } catch { /* ignore */ }
    set({ world: id })
    get().markVisited(`world:${id}`)
  },
  openWorldSelect: (origin) => set({ worldSelect: origin, mapOpen: false }),
  closeWorldSelect: () => set({ worldSelect: null }),
  beginTravel: (t) => set({ travel: t, worldSelect: null, mapOpen: false, dialog: null }),
  endTravel: () => {
    set({ travel: null })
    get().unlockAchievement("world_travel")
  },
  setWorldLoad: (id, w) => set((s) => ({ worldLoad: { ...s.worldLoad, [id]: { ...(s.worldLoad[id] ?? { state: "idle", progress: 0 }), ...w } } })),
  requestStart: () => set((s) => ({ startRequest: s.startRequest + 1 })),
  setView: (v, persist = true) => {
    if (v === "3d" && !webgl2Supported()) return
    if (persist) { try { localStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ } }
    set({ view: v })
  },
  toggleView: () => get().setView(get().view === "3d" ? "2d" : "3d"),

  startGame: () => {
    set({ phase: "playing" })
    get().markVisited(`world:${get().world}`)
    setTimeout(() => get().unlockAchievement("game_start"), 1200)
  },

  openBuilding: (id, focus = null, world = "village") => {
    if (!id) return
    set({ activeBuilding: id, focus, phase: "building", mapOpen: false, dialog: null })
    // the same chapters live in every world; each world keeps its own checklist
    get().markVisited(visitKey(world, id))
    if (world !== "village") get().unlockAchievement(`visit_${id}`)
  },

  closeBuilding: () => {
    if (!get().activeBuilding) return
    set({ activeBuilding: null, focus: null, phase: "playing" })
  },

  markVisited: (id) => {
    if (get().visited.has(id)) return
    const visited = new Set(get().visited)
    visited.add(id)
    set({ visited })
    get().unlockAchievement(`visit_${id}`)
    // every open world seen at least once
    if (id.startsWith("world:") && OPEN_WORLDS.every((w) => visited.has(`world:${w.id}`))) setTimeout(() => get().unlockAchievement("worlds_all"), 900)
  },

  unlockAchievement: (unlockedBy) => {
    const { unlockedAchievements, toastQueue } = get()
    const ach = gameAchievements.find((a) => a.unlockedBy === unlockedBy)
    if (!ach || unlockedAchievements.has(ach.id)) return
    const next = new Set(unlockedAchievements)
    next.add(ach.id)
    set({ unlockedAchievements: next, toastQueue: [...toastQueue, { id: ach.id, title: ach.title, icon: ach.icon, description: ach.description }] })
    const all = gameAchievements.filter((a) => a.unlockedBy !== "all_complete").map((a) => a.id)
    if (all.every((id) => next.has(id))) setTimeout(() => get().unlockAchievement("all_complete"), 1200)
  },

  popToast: () => set((s) => ({ toastQueue: s.toastQueue.slice(1) })),
  toggleSfx: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),
  toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
  setMapOpen: (v) => set({ mapOpen: v }),
  say: (d) => set({ dialog: d }),
  openArcade: (id) => set({ arcade: id, phase: id ? "building" : "playing", mapOpen: false }),
  showArea: (title, sub) => set({ areaTitle: { title, sub, key: Date.now() } }),
  setScene: (id) => set({ sceneId: id }),
}))
