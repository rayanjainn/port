// Sprite catalogue for the Kenney city atlases (CC0, 16x16 tiles, top-down 3/4 view).
// Rects are [x, y, w, h] in source pixels. Helpers below take TILE coordinates.
import type { Rect } from "@/lib/na"

export const KN = "/kenney"
export const CITY_SHEET = `${KN}/city.png`      // 37 x 28 tiles
export const URBAN_SHEET = `${KN}/urban.png`    // 27 x 18 tiles

/** rect on city.png from tile coords */
export const ct = (c: number, r: number, w = 1, h = 1): Rect => [c * 16, r * 16, w * 16, h * 16]
/** rect on urban.png from tile coords */
export const ut = (c: number, r: number, w = 1, h = 1): Rect => [c * 16, r * 16, w * 16, h * 16]

// ── ground ──────────────────────────────────────────────────────
export const GROUND = {
  asphalt: [ct(11, 19)],
  sidewalk: { grey: ct(0, 19), tan: ct(3, 19), blue: ct(6, 19) },
  grass: [ct(0, 24), ct(1, 24)],
  gravel: [ct(2, 24), ct(3, 24)],
  dirt: [ct(4, 24), ct(5, 24)],
  sand: [ct(6, 24), ct(7, 24)],
  cobble: ct(8, 24),
  /** zebra bars: H = bars lie along an east-west road, V = along a north-south road */
  zebraH: [ct(9, 22), ct(10, 22), ct(11, 22)],
  zebraV: [ct(12, 22), ct(13, 22), ct(14, 22)],
  parkingP: ct(13, 24),
  bikeSign: ct(14, 24),
  manhole: ct(9, 24),
}
export const SIDEWALK_VARIANTS = [GROUND.sidewalk.grey, GROUND.sidewalk.tan, GROUND.sidewalk.blue]
/** sidewalk tiles 0..2 x rows 19..22 are plain pavers with the odd gum / leaf decal in rows 21 */
export const PAVER_DECALS: Rect[] = [ct(0, 21), ct(1, 21), ct(3, 21), ct(4, 21), ct(6, 21), ct(7, 21)]

// ── roofs: four sets, 8 tiles wide ──────────────────────────────
export type RoofSet = "red" | "dark" | "light" | "tan"
const ROOF_OFF: Record<RoofSet, number> = { red: 0, dark: 8, light: 16, tan: 24 }
export const roofTiles = (s: RoofSet) => {
  const o = ROOF_OFF[s]
  return {
    plain: [ct(o + 4, 0), ct(o + 5, 0), ct(o + 6, 0), ct(o + 7, 0), ct(o + 4, 1)],
    vent: ct(o + 5, 1),
    hatch: ct(o + 6, 1),
    box: ct(o + 7, 1),
    panel: ct(o + 4, 2, 2, 2),
  }
}

// ── walls: three brick sets and glass ───────────────────────────
export type WallSet = "brick" | "grey" | "tan" | "glass"
const WALL_OFF: Record<WallSet, number> = { brick: 0, grey: 4, tan: 8, glass: 12 }
export const wallTiles = (s: WallSet) => {
  const o = WALL_OFF[s]
  return {
    // upper floors: two rows per storey (plain, then ledge)
    upA: [ct(o + 2, 5)], upB: [ct(o + 2, 6)],
    upAL: ct(o + 1, 5), upAR: ct(o + 3, 5), upBL: ct(o + 1, 6), upBR: ct(o + 3, 6),
    // ground floor: sign band, then base trim
    gA: ct(o + 2, 9), gB: ct(o + 2, 10), gAL: ct(o + 1, 9), gAR: ct(o + 3, 9), gBL: ct(o + 1, 10), gBR: ct(o + 3, 10),
  }
}
export const GLASS = {
  plain: [ct(13, 9), ct(14, 9)], band: ct(13, 7), base: ct(13, 12), pane: ct(14, 10), mull: ct(13, 8),
  left: ct(12, 9), right: ct(15, 9),
}
export const SIGN_BANDS = { green: ct(13, 4, 3, 1), teal: ct(13, 5, 3, 1) }

// ── windows (1x1 / 1x2) ─────────────────────────────────────────
export const WINDOWS = {
  woodSmall: [ct(25, 15), ct(26, 15), ct(27, 15)],
  woodPane: [ct(25, 16), ct(26, 16), ct(27, 16)],
  woodTall: [ct(28, 15, 1, 2), ct(29, 15, 1, 2)],
  greySmall: [ct(25, 18), ct(26, 18), ct(27, 18)],
  greyPane: [ct(25, 19), ct(26, 19), ct(27, 19)],
  greyTall: [ct(28, 18, 1, 2), ct(29, 18, 1, 2)],
}
export const DOORS = {
  glassL: ct(23, 21, 1, 2), glassR: ct(24, 21, 1, 2),
  doubleGlass: ct(23, 24, 2, 2), doublePanel: ct(25, 24, 2, 2), garage: ct(27, 24, 2, 2),
}

// ── awnings & market ────────────────────────────────────────────
export const AWNING = {
  green: ct(23, 10, 3, 2), greenEnd: ct(26, 10, 1, 2),
  orange: ct(27, 10, 3, 2), orangeEnd: ct(30, 10, 1, 2),
}
export const PARASOL = { green: ct(34, 15), orange: ct(35, 15), orange2: ct(36, 15) }

// ── street furniture ────────────────────────────────────────────
export const FURN = {
  trash: ct(15, 13), binWood: ct(16, 13), trash2: ct(17, 13), binWood2: ct(18, 13),
  hydrant: ct(15, 14), mailbox: ct(12, 15, 1, 2), cone: ct(14, 18),
  boxOpen: ct(13, 15), boxOpen2: ct(14, 15), box: ct(13, 16), box2: ct(14, 16), boxes: ct(13, 17, 1, 2),
  tyre: ct(12, 14), tyres: ct(13, 14), tyres2: ct(14, 14),
  benchA: ct(15, 15), benchB: ct(17, 15, 2, 1),
  lampPost: ct(1, 16, 1, 3), lampPostR: ct(2, 16, 1, 3), lampBanner: ct(0, 16, 1, 3), lampBannerR: ct(3, 16, 1, 3),
  lampDouble: ct(4, 16, 3, 3), lanternWhite: ct(4, 17), lanternGreen: ct(4, 18),
  signPole: [ct(8, 14, 1, 2), ct(9, 14, 1, 2), ct(10, 14, 1, 2)],
  tallPole: ct(11, 14, 1, 5),
  barrierA: ct(24, 5), barrierB: ct(25, 5), barrierC: ct(24, 6), barrierD: ct(25, 6), barrierE: ct(24, 7), barrierF: ct(25, 7),
  planter: ct(31, 12), planter2: ct(32, 12), planter3: ct(33, 12),
}
export const KIOSK = { teal: ct(24, 8), grey: ct(25, 8), grey2: ct(26, 8), screen: ct(27, 8), vendOrange: ct(28, 7, 1, 2), vendGreen: ct(29, 7, 1, 2), vendOrange2: ct(30, 7, 1, 2) }
export const CLOTHESLINE = { greenShorts: ct(4, 13), shirt: ct(5, 13), socks: ct(6, 13), rope: [ct(7, 13), ct(8, 13), ct(9, 13)], pole: ct(10, 13), pole2: ct(11, 13) }

// ── trees ───────────────────────────────────────────────────────
export const TREES_CITY = {
  tall: { lime: ct(31, 10, 1, 2), orange: ct(32, 10, 1, 2), green: ct(33, 10, 1, 2), lime2: ct(34, 10, 1, 2), orange2: ct(35, 10, 1, 2), green2: ct(36, 10, 1, 2) },
  potted: { lime: ct(31, 12), orange: ct(32, 12), green: ct(33, 12), lime2: ct(34, 12), orange2: ct(35, 12), green2: ct(36, 12) },
  bush: { lime: ct(31, 13), orange: ct(32, 13), green: ct(33, 13), lime2: ct(34, 13), orange2: ct(35, 13), green2: ct(36, 13) },
}
/** round autumn trees from urban.png */
export const TREES_URBAN = { orangeBig: ut(19, 11, 2, 3), orangeTall: ut(16, 11, 1, 3), orangeSlim: ut(17, 11, 1, 3) }

// ── pond tiles (3x3 stone-rimmed pool, and fountain pool) ───────
export const POND = ct(26, 4, 3, 3)
export const FOUNTAIN = ct(29, 4, 2, 3)
export const LAWN_PLOT = ct(32, 0, 3, 4)
export const STATUES = { a: ct(35, 2, 1, 2), b: ct(36, 2, 1, 2) }

// ── vehicles (pixel rects on city.png): side = faces left, sideR = faces right, up/down vertical ──
export interface CarArt { side: Rect; sideR: Rect; up: Rect; down: Rect }
export const CARS: Record<string, CarArt> = {
  green: { side: [503, 264, 36, 24], sideR: [549, 264, 36, 24], up: [501, 290, 22, 29], down: [533, 290, 22, 29] },
  grey: { side: [503, 328, 36, 24], sideR: [549, 328, 36, 24], up: [501, 354, 22, 29], down: [533, 354, 22, 29] },
  orange: { side: [503, 392, 36, 24], sideR: [549, 392, 36, 24], up: [501, 418, 22, 29], down: [533, 418, 22, 29] },
}

// ── people (converted urban characters, see public/kenney/chars) ──
export const PEOPLE = ["kid", "girl", "elder", "worker", "dude", "runner", "kid_b", "girl_b", "elder_b", "dude_b", "runner_b", "girl_c"] as const
export const personSheet = (n: string) => `${KN}/chars/${n}/sheet.png`
export const personFace = (n: string) => `${KN}/chars/${n}/face.png`
