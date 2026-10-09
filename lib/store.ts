import { create } from "zustand"
import { gameAchievements } from "./data"

export type BuildingId = "townhall" | "tavern" | "academy" | "gallery" | "forge" | "wizard" | "cave" | null

interface GameStore {
  phase: "title" | "playing" | "building"
  activeBuilding: BuildingId
  unlockedAchievements: Set<string>
  toastQueue: Array<{ id: string; title: string; icon: string }>
  musicEnabled: boolean
  sfxEnabled: boolean
  startGame: () => void
  openBuilding: (id: BuildingId) => void
  closeBuilding: () => void
  unlockAchievement: (unlockedBy: string) => void
  popToast: () => void
  toggleMusic: () => void
  toggleSfx: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "title",
  activeBuilding: null,
  unlockedAchievements: new Set(),
  toastQueue: [],
  musicEnabled: true,
  sfxEnabled: true,

  startGame: () => {
    set({ phase: "playing" })
    setTimeout(() => get().unlockAchievement("game_start"), 800)
  },

  openBuilding: (id) => {
    if (!id) return
    set({ activeBuilding: id, phase: "building" })
    const map: Record<string, string> = {
      townhall: "visit_townhall", tavern: "visit_tavern", academy: "visit_academy",
      gallery: "visit_gallery", forge: "visit_forge", wizard: "visit_wizard", cave: "visit_cave",
    }
    if (map[id]) get().unlockAchievement(map[id])
  },

  closeBuilding: () => set({ activeBuilding: null, phase: "playing" }),

  unlockAchievement: (unlockedBy) => {
    const { unlockedAchievements, toastQueue } = get()
    const ach = gameAchievements.find((a) => a.unlockedBy === unlockedBy)
    if (!ach || unlockedAchievements.has(ach.id)) return
    const newUnlocked = new Set(unlockedAchievements)
    newUnlocked.add(ach.id)
    const newQueue = [...toastQueue, { id: ach.id, title: ach.title, icon: ach.icon }]
    set({ unlockedAchievements: newUnlocked, toastQueue: newQueue })
    const allIds = gameAchievements.filter((a) => a.unlockedBy !== "all_complete").map((a) => a.id)
    if (allIds.every((id) => newUnlocked.has(id))) {
      setTimeout(() => get().unlockAchievement("all_complete"), 1200)
    }
  },

  popToast: () => set((s) => ({ toastQueue: s.toastQueue.slice(1) })),
  toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
  toggleSfx: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),
}))
