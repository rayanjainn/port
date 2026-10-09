// Mutable per-frame game state shared between the canvas loop and React HUD.
// Kept outside React so 60fps updates never trigger re-renders.

export type Facing = "up" | "down" | "left" | "right"

export const runtime = {
  scene: "village",
  player: { x: 0, y: 0 },          // scene px (native, 16px tiles)
  facing: "down" as Facing,
  nearLabel: null as string | null,
  /** 0 = full day, 1 = full night (smoothed) */
  night: 0,
  nightTarget: 0,
  /** analog input from the touch joystick, -1..1 */
  joy: { x: 0, y: 0 },
  /** set by HUD/minimap to request travel to a building */
  teleportTo: null as string | null,
  /** set by the touch action button */
  actionPressed: false,
  attackPressed: false,
  kills: 0,
  /** village map (native px) shared with the minimap and world map */
  mapCanvas: null as HTMLCanvasElement | null,
  mapSize: { w: 0, h: 0 },
  doors: {} as Record<string, { x: number; y: number }>,
}

export function requestTeleport(id: string) {
  runtime.teleportTo = id
}

export function toggleNight() {
  runtime.nightTarget = runtime.nightTarget > 0.5 ? 0 : 1
}
