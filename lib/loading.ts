import { create } from "zustand"

/** Boot progress for the world: 0..1, and `done` once the title screen is ready to show. */
export const useLoading = create<{ progress: number; done: boolean }>(() => ({ progress: 0, done: false }))
export const bootStart = typeof performance !== "undefined" ? performance.now() : 0
