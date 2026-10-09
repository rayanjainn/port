import { create } from "zustand"
import { gameAchievements } from "./data"

export type BuildingId = "townhall" | "tavern" | "academy" | "gallery" | "forge" | "wizard" | "cave" | null

interface GameStore {
  phase: "title" | "playing" | "building"
  activeBuilding: BuildingId
  unlockedAchievements: Set<string>
  visited: Set<string>
  toastQueue: Array<{ id: string; title: string; icon: string; description: string }>
  sfxEnabled: boolean
  mapOpen: boolean
  startGame: () => void
  openBuilding: (id: BuildingId) => void
  closeBuilding: () => void
  unlockAchievement: (unlockedBy: string) => void
  popToast: () => void
  toggleSfx: () => void
  setMapOpen: (v: boolean) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "title",
  activeBuilding: null,
  unlockedAchievements: new Set(),
  visited: new Set(),
  toastQueue: [],
  sfxEnabled: true,
  mapOpen: false,

  startGame: () => {
    set({ phase: "playing" })
    setTimeout(() => get().unlockAchievement("game_start"), 900)
  },

  openBuilding: (id) => {
    if (!id) return
    const visited = new Set(get().visited)
    visited.add(id)
    set({ activeBuilding: id, phase: "building", visited, mapOpen: false })
    get().unlockAchievement(`visit_${id}`)
  },

  closeBuilding: () => {
    if (!get().activeBuilding) return
    set({ activeBuilding: null, phase: "playing" })
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
  setMapOpen: (v) => set({ mapOpen: v }),
}))
