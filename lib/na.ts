// Sprite catalogue for the Ninja Adventure asset pack (CC0, by Pixel-boy & AAA).
// All rects are in source pixels: [x, y, w, h].

export const NA = "/na"

export type Rect = [number, number, number, number]

export const SHEETS = {
  floor: `${NA}/tiles/TilesetFloor.png`,
  water: `${NA}/tiles/TilesetWater.png`,
  nature: `${NA}/tiles/TilesetNature.png`,
  house: `${NA}/tiles/TilesetHouse.png`,
  element: `${NA}/tiles/TilesetElement.png`,
  dungeon: `${NA}/tiles/TilesetDungeon.png`,
  wall: `${NA}/tiles/TilesetWallSimple.png`,
  ifloor: `${NA}/tiles/TilesetInteriorFloor.png`,
  ielem: `${NA}/tiles/InteriorElements.png`,
  field: `${NA}/tiles/TilesetField.png`,
  floorDetail: `${NA}/tiles/TilesetFloorDetail.png`,
  ripples: `${NA}/anim/ripples.png`,
  flagRed: `${NA}/anim/flag_red.png`,
  flagBlue: `${NA}/anim/flag_blue.png`,
  flagYellow: `${NA}/anim/flag_yellow.png`,
  mill: `${NA}/anim/mill.png`,
  watermill: `${NA}/anim/watermill.png`,
  smoke: `${NA}/fx/smoke.png`,
} as const
export type SheetId = keyof typeof SHEETS

const t = (c: number, r: number, w = 1, h = 1): Rect => [c * 16, r * 16, w * 16, h * 16]

// ── Terrain autotiles (TilesetFloor / TilesetWater share one layout) ──
export interface Autotile {
  tl: Rect; t: Rect; tr: Rect; l: Rect; c: Rect[]; r: Rect; bl: Rect; b: Rect; br: Rect
  vTop: Rect; vMid: Rect; vBot: Rect; hLeft: Rect; hMid: Rect; hRight: Rect; single: Rect
  // inner corners: grass pokes into the given diagonal
  iBR: Rect; iBL: Rect; iTR: Rect; iTL: Rect
}

export const DIRT: Autotile = {
  tl: t(0, 7), t: t(1, 7), tr: t(2, 7), l: t(0, 8), c: [t(1, 8), t(9, 9), t(10, 9), t(8, 10), t(9, 10), t(10, 10), t(1, 11)], r: t(2, 8),
  bl: t(0, 9), b: t(1, 9), br: t(2, 9),
  vTop: t(3, 7), vMid: t(3, 8), vBot: t(3, 9), hLeft: t(0, 10), hMid: t(1, 10), hRight: t(2, 10), single: t(3, 10),
  iBR: t(5, 8), iBL: t(6, 8), iTR: t(5, 9), iTL: t(6, 9),
}

export const WATER: Autotile = {
  tl: t(0, 6), t: t(1, 6), tr: t(2, 6), l: t(0, 7), c: [t(1, 7)], r: t(2, 7),
  bl: t(0, 8), b: t(1, 8), br: t(2, 8),
  vTop: t(3, 6), vMid: t(3, 7), vBot: t(3, 8), hLeft: t(0, 9), hMid: t(1, 9), hRight: t(2, 9), single: t(1, 7),
  iBR: t(5, 7), iBL: t(6, 7), iTR: t(5, 8), iTL: t(6, 8),
}

export const GRASS: Rect[] = [t(0, 12), t(0, 12), t(0, 12), t(0, 12), t(1, 12), t(2, 12), t(3, 12), t(4, 12), t(2, 11), t(3, 11)]

// wooden deck / bridge planks (TilesetWater)
export const PLANK = { tl: t(0, 12), t: t(1, 12), tr: t(2, 12), l: t(0, 13), c: t(1, 13), r: t(2, 13), bl: t(0, 14), b: t(1, 14), br: t(2, 14) }

// ── Buildings (TilesetHouse) ──
export interface BuildingArt {
  rect: Rect
  door: [number, number]      // door x-range within the sprite (px)
  solidTop: number            // px from the sprite top where the solid base starts
}

export const BUILDING_ART: Record<string, BuildingArt> = {
  orange: { rect: [0, 0, 64, 48], door: [17, 30], solidTop: 22 },
  beige: { rect: [64, 0, 64, 48], door: [16, 29], solidTop: 22 },
  orange2: { rect: [128, 0, 64, 48], door: [17, 30], solidTop: 22 },
  redRoof: { rect: [192, 0, 64, 48], door: [17, 30], solidTop: 22 },
  shop: { rect: [256, 0, 48, 48], door: [17, 30], solidTop: 22 },
  izakaya: { rect: [304, 0, 64, 48], door: [19, 26], solidTop: 22 },
  kiln: { rect: [368, 0, 48, 48], door: [16, 31], solidTop: 20 },
  timber: { rect: [416, 0, 48, 47], door: [16, 31], solidTop: 22 },
  lodge: { rect: [464, 0, 64, 64], door: [18, 30], solidTop: 34 },
  cave: { rect: [0, 112, 48, 48], door: [17, 30], solidTop: 20 },
  straw: { rect: [48, 128, 48, 32], door: [16, 30], solidTop: 12 },
  temple: { rect: [400, 112, 64, 112], door: [18, 30], solidTop: 80 },
  hall: { rect: [400, 224, 64, 80], door: [18, 30], solidTop: 50 },
}

// ── Trees & plants (TilesetNature) ──
export interface TreeArt { rect: Rect; trunk: [number, number] /* solid x-range at the base */ }
export const TREES: Record<string, TreeArt> = {
  round: { rect: [0, 0, 32, 32], trunk: [10, 22] },
  pine: { rect: [32, 0, 32, 32], trunk: [10, 22] },
  roots: { rect: [96, 0, 32, 32], trunk: [10, 22] },
  cherry: { rect: [224, 0, 32, 32], trunk: [10, 22] },
  lime: { rect: [256, 0, 32, 32], trunk: [10, 22] },
  lime2: { rect: [288, 0, 32, 32], trunk: [10, 22] },
  dead: { rect: [64, 0, 32, 32], trunk: [10, 22] },
  bigPink: { rect: [0, 288, 48, 48], trunk: [17, 31] },
  bigGreen: { rect: [48, 288, 48, 48], trunk: [17, 31] },
  bigOrange: { rect: [144, 288, 48, 48], trunk: [17, 31] },
  tall: { rect: [208, 256, 16, 48], trunk: [4, 12] },
}

export const PLANTS = {
  bush: [t(0, 10), t(1, 10), t(2, 10)],
  tuft: [t(3, 10), t(4, 10), t(5, 10), t(6, 10), t(7, 10), t(8, 10), t(9, 10)],
  flower: [t(0, 11), t(1, 11), t(3, 11), t(6, 11)],
  clover: [t(2, 11)],
  rock: [t(6, 12), t(7, 12), t(8, 12)],
  stump: [t(4, 13), t(5, 13)],
  bigStump: [[0, 128, 32, 32] as Rect, [32, 128, 32, 32] as Rect],
  boulder: [[208, 128, 32, 32] as Rect, [256, 128, 32, 32] as Rect],
  bamboo: [[176, 128, 16, 48] as Rect],
}

// ── Props (TilesetElement) ──
export const PROPS: Record<string, { rect: Rect; solid?: boolean }> = {
  barrel: { rect: t(0, 0), solid: true },
  pot: { rect: t(1, 0), solid: true },
  candles: { rect: t(2, 0) },
  jar: { rect: t(3, 0), solid: true },
  bucket: { rect: t(4, 0) },
  waterBucket: { rect: t(5, 0) },
  crate: { rect: t(6, 0), solid: true },
  logs: { rect: t(9, 0), solid: true },
  stool: { rect: t(11, 0) },
  oven: { rect: t(12, 0), solid: true },
  redTable: { rect: t(14, 0), solid: true },
  bearStatue: { rect: t(15, 0), solid: true },
  catStatue: { rect: t(0, 1), solid: true },
  tub: { rect: t(2, 1), solid: true },
  chest: { rect: t(3, 1), solid: true },
  cauldron: { rect: t(4, 1), solid: true },
  ricePot: { rect: t(5, 1), solid: true },
  wellRing: { rect: t(6, 1), solid: true },
  plantPot: { rect: t(8, 1), solid: true },
  scrolls: { rect: t(10, 1) },
  longTable: { rect: t(11, 1, 3, 1), solid: true },
  sign: { rect: t(0, 2), solid: true },
  redSign: { rect: t(1, 2), solid: true },
  frogStatue: { rect: t(2, 2), solid: true },
  grave: { rect: t(3, 2), solid: true },
  stoneA: { rect: t(4, 2), solid: true },
  stoneB: { rect: t(5, 2), solid: true },
  well: { rect: t(7, 2), solid: true },
  hay: { rect: t(8, 2), solid: true },
  stall: { rect: t(11, 2, 3, 2), solid: false },
  laundry: { rect: t(14, 2, 2, 2) },
  cart: { rect: t(0, 3, 2, 2), solid: true },
  flowerCart: { rect: t(2, 3, 2, 2), solid: true },
  crates: { rect: t(4, 4, 2, 1), solid: true },
  lantern: { rect: t(6, 3, 1, 2), solid: true },
  brazier: { rect: t(7, 4), solid: true },
  totem: { rect: t(0, 5, 1, 2), solid: true },
  bookshelf: { rect: t(3, 7, 2, 2), solid: true },
  bigShelf: { rect: t(8, 7, 2, 2), solid: true },
  dresser: { rect: t(1, 8), solid: true },
  pottedPlant: { rect: t(0, 8), solid: true },
  chair: { rect: t(0, 9) },
}

// house-sheet extras
export const HOUSE_PROPS: Record<string, { rect: Rect; solid?: boolean }> = {
  torii: { rect: [0, 80, 48, 32], solid: false },
  dojoSign: { rect: [64, 64, 32, 16] },
  banners: { rect: [352, 320, 112, 32] },
  bannerYellow: { rect: [352, 320, 16, 32], solid: true },
  bannerRed: { rect: [368, 320, 16, 32], solid: true },
  bannerTeal: { rect: [384, 320, 16, 32], solid: true },
  bannerGreen: { rect: [400, 320, 16, 32], solid: true },
  bannerPurple: { rect: [432, 320, 16, 32], solid: true },
  statue: { rect: [16, 240, 32, 48], solid: true },
  orbStatue: { rect: [48, 240, 32, 32], solid: true },
  fenceH: { rect: [160, 80, 48, 16] },
  stoneArch: { rect: [464, 320, 64, 48], solid: false },
  market: { rect: [256, 256, 48, 32], solid: true },
  market2: { rect: [304, 256, 48, 32], solid: true },
}

// ── Characters ──
export const CHARS = {
  hero: "Villager3",
  mayor: "OldMan",
  curator: "Woman",
  barkeep: "Hunter",
  smith: "Samurai",
  teacher: "Master",
  postmaster: "Inspector",
  villagers: ["Villager", "Villager2", "Villager4", "Child", "Noble", "Princess", "OldWoman", "EggBoy", "Boy", "Cavegirl", "Monk"],
} as const
export const charSheet = (name: string) => `${NA}/chars/${name}/sheet.png`
export const charFace = (name: string) => `${NA}/chars/${name}/face.png`
export const monsterSheet = (name: string) => `${NA}/monsters/${name}.png`
export const animalSheet = (name: string) => `${NA}/animals/${name}.png`

// sprite-sheet column per facing
export const DIR_COL = { down: 0, up: 1, left: 2, right: 3 } as const
