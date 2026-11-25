// Module-level handles shared by the canvas stage, the DOM overlay and the pointer layer (kept out of React state on purpose).
import type * as THREE from "three"

export type Proj = (x: number, y: number, h: number) => readonly [number, number, boolean]
export const overlay = { update: null as ((proj: Proj, now: number, w: number, h: number) => void) | null }
export const rig = { camera: null as THREE.Camera | null, zoom: 1, mx: 0, my: 0, w: 1, h: 1 }
export const ui = { fade: null as HTMLDivElement | null, vig: null as HTMLDivElement | null, shift: null as HTMLDivElement | null }

/** open-air world: sky, hills and the day/night cycle apply (flag set by the world builder; village and city until they all set it) */
export const isOutdoor = (sc: { outdoor?: boolean; id: string }) => sc.outdoor ?? (sc.id === "village" || sc.id === "city")
