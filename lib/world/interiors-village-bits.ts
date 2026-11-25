// Small helpers shared by the Hearthvale room builders.
import type { Room } from "./interiors-kit"
import { lanternStrip } from "./interiors-village-kit"

/** a lit hanging lantern on the back wall */
export const lanternLight = (R: Room, cx: number, top: number, r = 64) => {
  R.wall(lanternStrip(), cx, top, { anim: { frames: 3, fps: 4, dx: 16 } })
  R.light(cx, top + 18, r, "255,200,110", 1)
}
export const splitCamel = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase().split(" ")
/** "JUN-AUG" / "2026" or "AUG'25-" / "JUL'26": a date span in two micro lines */
export const dash = (e: { start: string; end: string }) => {
  const a = e.start, b = e.end, ya = a.slice(-2), yb = b.slice(-2)
  return ya === yb ? [`${a.slice(0, 3)}-${b.slice(0, 3)}`.toUpperCase(), `20${yb}`] : [`${a.slice(0, 3)}'${ya}-`.toUpperCase(), `${b.slice(0, 3)}'${yb}`.toUpperCase()]
}
