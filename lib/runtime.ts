// Mutable per-frame game state shared between the canvas loop and React HUD.
// Kept outside React so 60fps updates never trigger re-renders.

export type Facing = "up" | "down" | "left" | "right"

export const runtime = {
  player: { x: 0, y: 0 },
  facing: "down" as Facing,
  nearBuilding: null as string | null,
  /** 0 = full day, 1 = full night (smoothed) */
  night: 0,
  nightTarget: 0,
  /** analog input from the touch joystick, -1..1 */
  joy: { x: 0, y: 0 },
  /** set by HUD/minimap to request a teleport to a building door */
  teleportTo: null as string | null,
  /** set by the touch action button */
  actionPressed: false,
  combat: false,
  hp: 10,
  maxHp: 10,
  kills: 0,
  weapon: "DAGGER",
  /** pre-rendered world (native res) shared with the map overlay */
  baseCanvas: null as HTMLCanvasElement | null,
  propsCanvas: null as HTMLCanvasElement | null,
  buildingSprites: {} as Record<string, { canvas: HTMLCanvasElement; offY: number }>,
}

export function requestTeleport(id: string) {
  runtime.teleportTo = id
}

export function toggleNight() {
  runtime.nightTarget = runtime.nightTarget > 0.5 ? 0 : 1
}
