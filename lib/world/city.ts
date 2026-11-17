// Neon Harbor: a modern city built from Kenney's city atlases. Hand-placed districts, procedural detail.
import { animalSheet, PROPS, type Rect } from "@/lib/na"
import {
  CITY_SHEET, URBAN_SHEET, ct, GROUND, roofTiles, wallTiles, GLASS, WINDOWS, DOORS, AWNING, PARASOL, FURN, KIOSK, TREES_CITY, TREES_URBAN,
  CARS, PEOPLE, STATUES, personSheet, personFace, type RoofSet, type WallSet,
} from "@/lib/kenney"
import { runtime } from "@/lib/runtime"
import { ordered, billboard, titledArt, exhibitArt, type ExProject } from "./exhibits"
import type { Portfolio } from "@/lib/content"
import { TS, img, sheet, blit, hash, mulberry, canvas, type Scene, type SceneSign, type Landmark, type Sprite, type Hotspot, type ActorDef, type Light, type Box } from "./core"

export const CW = 88
export const CH = 64
const W = CW, H = CH
const PW = W * TS, PH = H * TS

// ── 5x7 bitmap font for crisp in-world lettering ────────────────
const GLYPHS: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 10001 11110 10001 10001 11110", C: "01110 10001 10000 10000 10000 10001 01110",
  D: "11110 10001 10001 10001 10001 10001 11110", E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001", I: "01110 00100 00100 00100 00100 00100 01110",
  J: "00111 00010 00010 00010 00010 10010 01100", K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 11001 10101 10011 10001 10001 10001", O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000", Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100", U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100", W: "10001 10001 10001 10101 10101 11011 10001", X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
  "0": "01110 10001 10011 10101 11001 10001 01110", "1": "00100 01100 00100 00100 00100 00100 01110", "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11110 00001 00001 01110 00001 00001 11110", "4": "00010 00110 01010 10010 11111 00010 00010", "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110", "7": "11111 00001 00010 00100 01000 01000 01000", "8": "01110 10001 10001 01110 10001 10001 01110",
  "9": "01110 10001 10001 01111 00001 00010 01100",
  "&": "01100 10010 10100 01000 10101 10010 01101", "-": "00000 00000 00000 11111 00000 00000 00000", ".": "00000 00000 00000 00000 00000 01100 01100",
  "!": "00100 00100 00100 00100 00100 00000 00100", "/": "00001 00001 00010 00100 01000 10000 10000", ":": "00000 01100 01100 00000 01100 01100 00000",
  "'": "00100 00100 01000 00000 00000 00000 00000", "+": "00000 00100 00100 11111 00100 00100 00000", " ": "00000 00000 00000 00000 00000 00000 00000",
}
const GROWS: Record<string, number[][]> = {}
for (const [k, v] of Object.entries(GLYPHS)) GROWS[k] = v.split(" ").map((r) => r.split("").map(Number))
const textW = (s: string) => Math.max(0, s.length * 6 - 1)
function drawText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, shadow?: string) {
  const pass = (ox: number, oy: number, col: string) => {
    ctx.fillStyle = col
    let cx = x + ox
    for (const ch of s.toUpperCase()) {
      const gl = GROWS[ch] ?? GROWS[" "]
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c]) ctx.fillRect(cx + c, y + oy + r, 1, 1)
      cx += 6
    }
  }
  if (shadow) pass(1, 1, shadow)
  pass(0, 0, color)
}

// 3x5 micro font for small print on posters
const MICRO: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011",
  H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101",
  O: "010101101101010", P: "110101110100100", Q: "010101101111011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111",
  V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
  "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110", "4": "101101111001001", "5": "111100110001110",
  "6": "011100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001110",
  ".": "000000000000010", "+": "000010111010000", "-": "000000111000000", "/": "001001010100100", "'": "010010000000000", "!": "010010010000010", ":": "000010000010000", " ": "000000000000000",
}
function micro(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string) {
  ctx.fillStyle = color
  let cx = x
  for (const ch of s.toUpperCase()) {
    const gl = MICRO[ch] ?? MICRO[" "]
    for (let i = 0; i < 15; i++) if (gl[i] === "1") ctx.fillRect(cx + (i % 3), y + Math.floor(i / 3), 1, 1)
    cx += 4
  }
}
/** two short lines of pitch per project, set in the micro font (15 characters a line) */
const PITCH: Record<string, [string, string]> = {
  "ferrite-browser": ["AGENTS CAN'T BE", "TALKED INTO IT"], sentinel: ["A MONITOR THAT", "EXPLAINS ITSELF"], duckops: ["PICK A STACK.", "SHIP TO K8S."],
  devhub: ["POSTMAN + BURP", "IN ONE TAB"], neurocred: ["A LIVE TWIN FOR", "SMALL BUSINESS"], nebula: ["MALWARE CAUGHT", "BY TRANSFORMERS"],
  vendex: ["REEL TO REAL", "RANKED SUPPLY"], dapdap: ["STOP SPORTS", "PIRACY. FAST."], ctrlfixit: ["LIVE CODING", "FOR EVENTS"],
  boomsuite: ["4X LOUDER", "ON YOUR MAC"], skrgrep: ["GREP IN RUST.", "MULTI-THREADED"], poker: ["REAL-TIME POKER", "RUST BACKEND"],
}
interface Win { x: number; y: number; w: number; h: number; kind: "glass" | "wall" | "shop" }

// ── street grid ─────────────────────────────────────────────────
// every road is four tiles wide; cars run on lanes 20px either side of the centre line
interface HRoad { r0: number; c0: number; c1: number }
interface VRoad { c0: number; r0: number; r1: number }
const HROADS: HRoad[] = [{ r0: 11, c0: 3, c1: 85 }, { r0: 30, c0: 3, c1: 85 }, { r0: 46, c0: 3, c1: 85 }]
const VROADS: VRoad[] = [{ c0: 26, r0: 3, r1: 57 }, { c0: 56, r0: 3, r1: 57 }]
const LANE = 20
const MID_H = [{ r0: 11, c: 42 }, { r0: 30, c: 43 }, { r0: 46, c: 43 }, { r0: 30, c: 13 }, { r0: 30, c: 70 }, { r0: 46, c: 14 }]
const MID_V = [{ c0: 26, r: 22 }, { c0: 56, r: 22 }, { c0: 56, r: 40 }, { c0: 26, r: 40 }]

// ── buildings ───────────────────────────────────────────────────
interface BSpec {
  id: string; c: number; bottom: number; w: number
  rr: number; fr: number                 // roof rows, facade rows (ground floor included)
  wall: WallSet; roof: RoofSet
  awning?: "green" | "orange"            // gives the ground floor a third row
  doorAt?: number; door?: "glass" | "double" | "panel" | "garage"
  win?: "wood" | "grey"
  band?: string; bandColor?: string       // shop name on the sign band (needs an awning)
  deck?: boolean                          // rooftop terrace
  garage?: boolean
  landmark?: { section: string; label: string; sub: string; accent: string }
  light?: string                          // window glow colour
}

const BUILDINGS: BSpec[] = [
  // old town, north-west, facing H0
  { id: "ot1", c: 3, bottom: 8, w: 7, rr: 2, fr: 5, wall: "brick", roof: "red", awning: "green", door: "glass", win: "wood", band: "BAKERY", bandColor: "#2f7d57", light: "255,200,120" },
  { id: "ot2", c: 10, bottom: 8, w: 6, rr: 2, fr: 5, wall: "tan", roof: "tan", awning: "orange", door: "glass", win: "wood", band: "BOOKS", bandColor: "#b4561f", light: "255,214,150" },
  { id: "ot3", c: 19, bottom: 8, w: 5, rr: 2, fr: 4, wall: "grey", roof: "dark", door: "glass", win: "grey", light: "255,230,170" },
  // downtown north
  { id: "t1", c: 62, bottom: 8, w: 8, rr: 2, fr: 6, wall: "glass", roof: "light", door: "double", light: "190,230,255" },
  { id: "t2", c: 71, bottom: 8, w: 7, rr: 2, fr: 6, wall: "glass", roof: "dark", door: "double", light: "255,225,170" },
  { id: "t3", c: 79, bottom: 8, w: 5, rr: 2, fr: 6, wall: "grey", roof: "light", door: "glass", win: "grey", light: "190,230,255" },
  // north-west of the avenue
  { id: "cafe", c: 4, bottom: 27, w: 11, rr: 3, fr: 7, wall: "brick", roof: "red", awning: "orange", door: "panel", win: "wood", deck: true, band: "", bandColor: "#b4561f",
    landmark: { section: "tavern", label: "ROOFTOP CAFE", sub: "EXPERIENCE", accent: "#e09a3a" }, light: "255,190,110" },
  { id: "w2", c: 17, bottom: 27, w: 7, rr: 2, fr: 5, wall: "tan", roof: "tan", awning: "green", door: "glass", win: "wood", band: "FLOWERS", bandColor: "#2f7d57", light: "255,214,150" },
  // city hall and flanks
  { id: "hall", c: 37, bottom: 24, w: 12, rr: 2, fr: 6, wall: "tan", roof: "light", door: "double", win: "wood",
    landmark: { section: "townhall", label: "CITY HALL", sub: "ABOUT", accent: "#5b8fd6" }, light: "255,226,160" },
  { id: "h-l", c: 32, bottom: 24, w: 5, rr: 2, fr: 4, wall: "brick", roof: "red", door: "glass", win: "wood", light: "255,200,120" },
  { id: "h-r", c: 49, bottom: 24, w: 5, rr: 2, fr: 4, wall: "grey", roof: "dark", door: "glass", win: "grey", light: "255,230,170" },
  // downtown south
  { id: "studio", c: 62, bottom: 27, w: 10, rr: 2, fr: 8, wall: "glass", roof: "light", door: "double",
    landmark: { section: "gallery", label: "PROJECT STUDIO", sub: "PROJECTS", accent: "#9a7be0" }, light: "190,170,255" },
  { id: "t4", c: 74, bottom: 27, w: 7, rr: 2, fr: 10, wall: "glass", roof: "dark", door: "double", light: "190,230,255" },
  // south-west
  { id: "lab", c: 14, bottom: 43, w: 10, rr: 2, fr: 4, wall: "grey", roof: "dark", door: "garage", win: "grey", garage: true,
    landmark: { section: "forge", label: "HARDWARE LAB", sub: "SKILLS", accent: "#e2683a" }, light: "255,160,90" },
  // south-middle
  { id: "uni", c: 36, bottom: 43, w: 16, rr: 2, fr: 6, wall: "tan", roof: "tan", door: "double", win: "wood",
    landmark: { section: "academy", label: "UNIVERSITY", sub: "EDUCATION", accent: "#3fb3a6" }, light: "255,226,160" },
  // south-east
  { id: "post", c: 62, bottom: 43, w: 9, rr: 2, fr: 4, wall: "brick", roof: "red", door: "panel", win: "wood",
    landmark: { section: "wizard", label: "POST OFFICE", sub: "CONTACT", accent: "#8e66e8" }, light: "255,200,120" },
  // residential corner and harbour
  { id: "r1", c: 3, bottom: 55, w: 5, rr: 2, fr: 3, wall: "tan", roof: "red", door: "panel", win: "wood", light: "255,200,120" },
  { id: "r2", c: 9, bottom: 55, w: 6, rr: 2, fr: 4, wall: "brick", roof: "dark", door: "panel", win: "wood", light: "255,214,150" },
  { id: "r3", c: 16, bottom: 55, w: 5, rr: 2, fr: 3, wall: "grey", roof: "tan", door: "panel", win: "grey", light: "255,200,120" },
  { id: "arcade", c: 35, bottom: 56, w: 14, rr: 2, fr: 3, wall: "grey", roof: "dark", awning: "green", door: "glass", win: "grey", light: "255,120,200" },
  { id: "harbour", c: 63, bottom: 55, w: 7, rr: 2, fr: 3, wall: "tan", roof: "dark", door: "glass", win: "grey", light: "255,230,170" },
]

const QUEST: Record<string, string> = {
  townhall: "Meet the Mayor in City Hall",
  gallery: "Tour the Project Studio",
  tavern: "Read the board at the Rooftop Cafe",
  forge: "Inspect the Hardware Lab",
  academy: "Study at the University",
  wizard: "Send word from the Post Office",
  arcade: "Drop a coin in the Street Arcade",
}
const LANDMARK_ORDER = ["townhall", "gallery", "tavern", "forge", "academy", "wizard", "arcade"]

const ROOF_COL: Record<RoofSet, [string, string, string]> = {
  red: ["#9c6257", "#b97467", "#7a4a41"], dark: ["#787a7e", "#8c8f93", "#5c5e62"], light: ["#a6a9ae", "#c0c3c8", "#85888d"], tan: ["#c1b191", "#d9caa9", "#9d8f72"],
}

/** hue shift of every saturated pixel (used for car and building variants) */
function tintCanvas(cv: HTMLCanvasElement, deg: number) {
  const ctx = cv.getContext("2d")!
  const d = ctx.getImageData(0, 0, cv.width, cv.height)
  const a = d.data
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] === 0) continue
    const r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn
    if (dl < 0.18 || mx < 0.15) continue
    let h = dl === 0 ? 0 : mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4
    h = ((h * 60 + deg) % 360 + 360) % 360
    const s = mx === 0 ? 0 : dl / mx, v = mx
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
    const [rr, gg, bb] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
    a[i] = Math.round((rr + m) * 255); a[i + 1] = Math.round((gg + m) * 255); a[i + 2] = Math.round((bb + m) * 255)
  }
  ctx.putImageData(d, 0, 0)
}

function renderBuilding(b: BSpec) {
  const city = img(CITY_SHEET)
  const gRows = b.awning ? 3 : 2
  const rows = b.rr + b.fr
  const { c: cv, ctx } = canvas(b.w * TS, rows * TS)
  const rnd = mulberry(b.c * 977 + b.bottom * 31)
  const rh = b.rr * TS
  const [base, edge, shade] = ROOF_COL[b.roof]
  const T = (r: Rect, x: number, y: number) => blit(ctx, city, r, x, y)
  const bw = b.w * TS
  const lit: Win[] = []

  // roof: flat colour, parapet, a few rooftop fittings
  ctx.fillStyle = base; ctx.fillRect(0, 0, bw, rh)
  ctx.fillStyle = edge; ctx.fillRect(0, 0, bw, 2); ctx.fillRect(0, 0, 2, rh); ctx.fillRect(bw - 2, 0, 2, rh)
  ctx.fillStyle = shade; ctx.fillRect(2, 2, bw - 4, 1); ctx.fillRect(2, 2, 1, rh - 2); ctx.fillRect(bw - 3, 2, 1, rh - 2)
  const rt = roofTiles(b.roof)
  const taken = new Set<string>()
  const putRoof = (r: Rect, c: number, rr: number, w = 1, h = 1) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (taken.has(`${c + x},${rr + y}`)) return false
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) taken.add(`${c + x},${rr + y}`)
    T(r, c * TS, rr * TS); return true
  }
  if (b.deck) {
    // terrace: awning-topped seating, planters along the edge
    for (let c = 1; c + 3 <= b.w - 1; c += 4) putRoof(ct(23, 12, 4, 2), c, 1, 4, 2) // striped sunshade seen from above
    for (let c = 1; c < b.w - 1; c += 2) T(TREES_CITY.potted[c % 4 < 2 ? "green" : "lime"], c * TS, 0)
    T(PARASOL.green, 3 * TS, 2 * TS); T(PARASOL.orange, (b.w - 4) * TS, 2 * TS)
  } else if (b.wall !== "glass") {
    for (let k = 0; k < b.w * b.rr * 0.35; k++) {
      const c = 1 + Math.floor(rnd() * (b.w - 2)), r = Math.floor(rnd() * b.rr)
      const kind = rnd()
      if (kind < 0.3 && r + 1 < b.rr && c + 1 < b.w - 1) putRoof(rt.panel, c, r, 2, 2)
      else if (kind < 0.6) putRoof(rt.box, c, r)
      else if (kind < 0.8) putRoof(rt.hatch, c, r)
      else if (!taken.has(`${c},${r}`)) {
        // AC unit
        taken.add(`${c},${r}`)
        const x = c * TS + 2, y = r * TS + 3
        ctx.fillStyle = "#4a4d52"; ctx.fillRect(x, y + 9, 12, 2)
        ctx.fillStyle = "#cfd4d9"; ctx.fillRect(x, y, 12, 9)
        ctx.fillStyle = "#e6eaee"; ctx.fillRect(x, y, 12, 2)
        ctx.fillStyle = "#6b7077"; ctx.fillRect(x + 2, y + 3, 8, 5)
        ctx.fillStyle = "#a9aeb4"; ctx.fillRect(x + 5, y + 4, 2, 3)
      }
    }
  } else {
    // tower crown: plant room, heli pad ring
    ctx.fillStyle = shade; ctx.fillRect(TS, 5, bw - 2 * TS, rh - 12)
    ctx.fillStyle = edge; ctx.fillRect(TS + 1, 6, bw - 2 * TS - 2, 1)
    for (let c = 1; c < b.w - 1; c += 3) { ctx.fillStyle = "#c9ced3"; ctx.fillRect(c * TS + 3, 10, 10, 8); ctx.fillStyle = "#5f656c"; ctx.fillRect(c * TS + 6, 12, 4, 4) }
  }
  // cornice and its shadow on the wall below
  ctx.fillStyle = edge; ctx.fillRect(0, rh - 3, bw, 3)
  ctx.fillStyle = shade; ctx.fillRect(0, rh - 1, bw, 1)

  // facade
  const wt = wallTiles(b.wall)
  const upper = b.fr - gRows
  const wins = b.win === "grey" ? [WINDOWS.greySmall, WINDOWS.greyPane, WINDOWS.greyTall] : [WINDOWS.woodSmall, WINDOWS.woodPane, WINDOWS.woodTall]
  const fy = (i: number) => (b.rr + i) * TS
  for (let i = 0; i < b.fr; i++) {
    const fromBottom = b.fr - 1 - i
    const isGround = fromBottom < gRows
    for (let j = 0; j < b.w; j++) {
      const L = j === 0, R = j === b.w - 1
      let rect: Rect
      if (b.wall === "glass") {
        const gr = 9 + (i % 2)
        rect = L ? ct(12, gr) : R ? ct(15, gr) : ct(13 + (j % 2), gr)
        if (!L && !R && i < b.fr - 2) lit.push({ x: j * TS + 1, y: fy(i) + 2, w: 14, h: 12, kind: "glass" })
      } else if (isGround) {
        const top = fromBottom === gRows - 1
        rect = top ? (L ? wt.gAL : R ? wt.gAR : wt.gA) : (L ? wt.gBL : R ? wt.gBR : wt.gB)
      } else {
        const fb = fromBottom - gRows
        const isB = fb % 2 === 0
        rect = isB ? (L ? wt.upBL : R ? wt.upBR : wt.upB[0]) : (L ? wt.upAL : R ? wt.upAR : wt.upA[0])
      }
      T(rect, j * TS, fy(i))
    }
  }
  // windows on the plain rows of each storey
  if (b.wall !== "glass") {
    for (let i = 0; i < upper; i++) {
      const fromBottom = b.fr - 1 - i - gRows
      if (fromBottom % 2 === 0) continue
      for (let j = 1; j < b.w - 1; j += 2) {
        const hv = hash(j, i, b.c)
        if (hv < 0.3 && i + 1 < upper) { T(wins[2][Math.floor(hv * 10) % 2], j * TS, fy(i)); lit.push({ x: j * TS + 4, y: fy(i) + 4, w: 8, h: 23, kind: "wall" }) }
        else { lit.push({ x: j * TS + 3, y: fy(i) + 4, w: 10, h: 9, kind: "wall" }); T(hv < 0.65 ? wins[0][Math.floor(hv * 30) % 3] : wins[1][Math.floor(hv * 30) % 3], j * TS, fy(i)) }
      }
    }
  }
  // ground floor: shop windows, awning, door
  const dc = b.doorAt ?? Math.floor((b.w - (b.door === "double" || b.door === "panel" || b.door === "garage" ? 2 : 1)) / 2)
  const dw = b.door === "double" || b.door === "panel" || b.door === "garage" ? 2 : 1
  const gTop = b.rr + b.fr - gRows
  if (b.wall !== "glass") {
    for (let j = 1; j < b.w - 1; j++) {
      if (j >= dc && j < dc + dw) continue
      if (b.garage || (!b.awning && j % 3 === 0)) continue
      T(GLASS.pane, j * TS, (b.rr + b.fr - 1) * TS)
      lit.push({ x: j * TS + 1, y: (b.rr + b.fr - 1) * TS + 2, w: 14, h: 11, kind: "shop" })
    }
  }
  if (b.awning) {
    const a = b.awning === "green" ? AWNING.green : AWNING.orange
    for (let j = 1; j < b.w - 1; j++) {
      if (j >= dc && j < dc + dw) continue
      T([a[0] + (j % 3) * 16, a[1] + 16, 16, 16], j * TS, (gTop + 1) * TS)
    }
    if (b.band) {
      const tw = textW(b.band)
      ctx.fillStyle = b.bandColor ?? "#2f7d57"; ctx.fillRect(TS, gTop * TS + 3, bw - 2 * TS, 10)
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(TS, gTop * TS + 3, bw - 2 * TS, 1)
      drawText(ctx, b.band, Math.round((bw - tw) / 2), gTop * TS + 5, "#fff4dc", "rgba(0,0,0,.4)")
    }
  }
  const dY = (b.rr + b.fr - 2) * TS
  const door = b.door ?? "glass"
  if (door === "glass") T(DOORS.glassL, dc * TS, dY)
  else if (door === "double") T(DOORS.doubleGlass, dc * TS, dY)
  else if (door === "panel") T(DOORS.doublePanel, dc * TS, dY)
  else T(DOORS.garage, dc * TS, dY)
  const doorX = (dc + dw / 2) * TS
  return { cv, doorX, rows, gTop, gRows, lit }
}

// ── build ───────────────────────────────────────────────────────
export function buildCity(content?: Portfolio): Scene {
  void content
  const cityImg = img(CITY_SHEET)
  const urbanImg = img(URBAN_SHEET)
  const idx = (c: number, r: number) => r * W + c
  const inb = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H
  const blocked = new Uint8Array(W * H)
  const occ = new Uint8Array(W * H)       // decoration already here
  const sprites: Sprite[] = []
  const lights: Light[] = []
  const hotspots: Hotspot[] = []
  const actors: ActorDef[] = []
  const water: { c: number; r: number }[] = []
  const signs: SceneSign[] = []
  const landmarks: Record<string, Landmark> = {}

  const road = new Uint8Array(W * H)
  const rd = (c: number, r: number) => inb(c, r) && road[idx(c, r)] === 1
  for (const h of HROADS) for (let r = h.r0; r < h.r0 + 4; r++) for (let c = h.c0; c < h.c1; c++) road[idx(c, r)] = 1
  for (const v of VROADS) for (let c = v.c0; c < v.c0 + 4; c++) for (let r = v.r0; r < v.r1; r++) road[idx(c, r)] = 1

  // ── ground ──
  const { c: gcv, ctx: g } = canvas(PW, PH)
  const sidewalkAt = (c: number, r: number): Rect => (c < 26 && r < 46 ? GROUND.sidewalk.tan : c >= 60 && r < 46 ? GROUND.sidewalk.blue : GROUND.sidewalk.grey)
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      blit(g, cityImg, sidewalkAt(c, r), c * TS, r * TS)
    }

  // roads: rounded kerbs by pixel mask
  const R = 8
  const roadPx = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= PW || y >= PH) return false
    const c = x >> 4, r = y >> 4
    const lx = (x & 15) + 0.5, ly = (y & 15) + 0.5
    const isR = road[idx(c, r)] === 1
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const inX = sx < 0 ? lx < R : lx > 16 - R, inY = sy < 0 ? ly < R : ly > 16 - R
        if (!inX || !inY) continue
        const cx = sx < 0 ? R : 16 - R, cy = sy < 0 ? R : 16 - R
        if (Math.hypot(lx - cx, ly - cy) <= R) continue
        if (!isR) { if (rd(c + sx, r) && rd(c, r + sy) && rd(c + sx, r + sy)) return true }
        else if (!rd(c + sx, r) && !rd(c, r + sy) && !rd(c + sx, r + sy)) return false
      }
    return isR
  }
  {
    const id = g.getImageData(0, 0, PW, PH)
    const d = id.data
    const put = (x: number, y: number, r: number, gg: number, b: number) => { const i = (y * PW + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255 }
    const nearRoad = (c: number, r: number) => { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (rd(c + dc, r + dr)) return true; return false }
    for (let r = 0; r < H; r++)
      for (let c = 0; c < W; c++) {
        if (!nearRoad(c, r)) continue
        for (let ly = 0; ly < 16; ly++)
          for (let lx = 0; lx < 16; lx++) {
            const x = c * 16 + lx, y = r * 16 + ly
            if (roadPx(x, y)) {
              const n = hash(x, y, 5)
              const v = 64 + (n > 0.95 ? 7 : n < 0.04 ? -6 : 0)
              put(x, y, v, v, v)
              continue
            }
            let k = 0
            for (let s = 1; s <= 3 && !k; s++) if (roadPx(x + s, y) || roadPx(x - s, y) || roadPx(x, y + s) || roadPx(x, y - s)) k = s
            if (k === 1) put(x, y, 78, 84, 90)
            else if (k === 2) put(x, y, 216, 221, 224)
            else if (k === 3) put(x, y, 178, 187, 190)
          }
      }
    g.putImageData(id, 0, 0)
  }

  // lane markings, crosswalks, stop lines
  const YEL = "#e7b422", WHT = "#dfe3ee"
  const inInter = (c: number, r: number) => HROADS.some((h) => r >= h.r0 && r < h.r0 + 4) && VROADS.some((v) => c >= v.c0 && c < v.c0 + 4)
  const zebraTiles = new Set<string>()
  const zebra = (c: number, r: number, horizontalBars: boolean) => {
    zebraTiles.add(`${c},${r}`)
    blit(g, cityImg, (horizontalBars ? GROUND.zebraH : GROUND.zebraV)[(c + r) % 3], c * TS, r * TS)
  }
  for (const h of HROADS)
    for (const v of VROADS) {
      for (let k = 0; k < 4; k++) {
        zebra(v.c0 - 1, h.r0 + k, true); zebra(v.c0 + 4, h.r0 + k, true)
        zebra(v.c0 + k, h.r0 - 1, false); zebra(v.c0 + k, h.r0 + 4, false)
      }
      // stop lines: one per approach lane
      g.fillStyle = WHT
      g.fillRect((v.c0 - 1) * TS - 5, (h.r0 + 2) * TS + 2, 3, 28)           // eastbound (south lane)
      g.fillRect((v.c0 + 5) * TS + 2, h.r0 * TS + 2, 3, 28)                 // westbound
      g.fillRect(v.c0 * TS + 2, (h.r0 - 1) * TS - 5, 28, 3)                 // southbound (west lane)
      g.fillRect((v.c0 + 2) * TS + 2, (h.r0 + 5) * TS + 2, 28, 3)           // northbound
    }
  for (const m of MID_H) for (let k = 0; k < 4; k++) zebra(m.c, m.r0 + k, true)
  for (const m of MID_V) for (let k = 0; k < 4; k++) zebra(m.c0 + k, m.r, false)
  g.fillStyle = YEL
  for (const h of HROADS) {
    const cy = (h.r0 + 2) * TS
    for (let c = h.c0 + 3; c < h.c1 - 3; c++) {
      if (inInter(c, h.r0) || zebraTiles.has(`${c},${h.r0}`)) continue
      g.fillRect(c * TS, cy - 2, TS, 1); g.fillRect(c * TS, cy + 1, TS, 1)
    }
  }
  for (const v of VROADS) {
    const cx = (v.c0 + 2) * TS
    for (let r = v.r0 + 3; r < v.r1 - 3; r++) {
      if (inInter(v.c0, r) || zebraTiles.has(`${v.c0},${r}`)) continue
      g.fillRect(cx - 2, r * TS, 1, TS); g.fillRect(cx + 1, r * TS, 1, TS)
    }
  }
  // lane arrows and little wear: manhole covers
  for (const [c, r] of [[20, 31], [50, 32], [69, 31], [40, 47], [12, 12], [74, 13], [27, 20], [57, 36], [28, 52]]) blit(g, cityImg, GROUND.manhole, c * TS, r * TS)

  // ── shapes on top of the roads ──
  const rrPath = (x: number, y: number, w: number, h: number, rad: number) => {
    g.beginPath()
    const inset = (dy: number) => Math.max(0, Math.round(rad - Math.sqrt(Math.max(0, rad * rad - dy * dy))))
    for (let i = 0; i < Math.min(rad, h / 2); i++) { const o = inset(rad - i - 0.5); g.rect(x + o, y + i, w - 2 * o, 1); g.rect(x + o, y + h - 1 - i, w - 2 * o, 1) }
    if (h - 2 * rad > 0) g.rect(x, y + rad, w, h - 2 * rad)
  }
  const fillRR = (x: number, y: number, w: number, h: number, rad: number, col: string) => { rrPath(x, y, w, h, rad); g.fillStyle = col; g.fill() }
  const tiledRR = (x: number, y: number, w: number, h: number, rad: number, rects: Rect[], seed: number) => {
    g.save(); rrPath(x, y, w, h, rad); g.clip()
    for (let ty = Math.floor(y / TS); ty * TS < y + h; ty++) for (let tx = Math.floor(x / TS); tx * TS < x + w; tx++) blit(g, cityImg, rects[Math.floor(hash(tx, ty, seed) * rects.length)], tx * TS, ty * TS)
    g.restore()
  }
  /** lawn or basin with a stone rim (outer shadow, light coping, inner shade) */
  const rimmed = (c0: number, r0: number, c1: number, r1: number, rad: number, fill: (x: number, y: number, w: number, h: number, rad: number) => void) => {
    const x = c0 * TS, y = r0 * TS, w = (c1 - c0) * TS, h = (r1 - r0) * TS
    fillRR(x - 1, y - 1, w + 2, h + 2, rad + 1, "#566066")
    fillRR(x, y, w, h, rad, "#c9d0d1")
    fill(x + 2, y + 2, w - 4, h - 4, Math.max(2, rad - 2))
    g.save(); rrPath(x + 2, y + 2, w - 4, h - 4, Math.max(2, rad - 2)); g.clip()
    g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x + 2, y + 2, w, 1); g.fillRect(x + 2, y + 2, 1, h)
    g.restore()
  }
  const lawn = (c0: number, r0: number, c1: number, r1: number, rad = 8, seed = 1) => {
    rimmed(c0, r0, c1, r1, rad, (x, y, w, h, rr) => tiledRR(x, y, w, h, rr, GROUND.grass, seed))
    // flowers and tufts
    for (let r = r0; r < r1; r++)
      for (let c = c0; c < c1; c++) {
        if (hash(c, r, seed + 40) < 0.5) {
          const px = c * TS + 3 + Math.floor(hash(c, r, seed + 41) * 9), py = r * TS + 3 + Math.floor(hash(c, r, seed + 42) * 9)
          if (px > c0 * TS + 4 && py > r0 * TS + 4 && px < c1 * TS - 5 && py < r1 * TS - 5) {
            const col = ["#fff1b0", "#ff9ecf", "#ffffff", "#ffd76a", "#a6d8ff"][Math.floor(hash(c, r, seed + 43) * 5)]
            g.fillStyle = col; g.fillRect(px, py, 1, 1)
            g.fillStyle = "#2f7d4a"; g.fillRect(px, py + 1, 1, 1)
          }
        }
      }
  }
  const markBlocked = (c0: number, r0: number, c1: number, r1: number) => { for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (inb(c, r)) blocked[idx(c, r)] = 1 }
  const markOcc = (c0: number, r0: number, c1: number, r1: number) => { for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (inb(c, r)) occ[idx(c, r)] = 1 }

  // plaza in front of city hall: warm paving with an inlaid ring
  tiledRR(30 * TS, 24 * TS, 26 * TS, 6 * TS, 0, [GROUND.sidewalk.tan], 3)
  g.fillStyle = "rgba(120,96,60,.28)"
  for (let c = 30; c < 56; c++) { g.fillRect(c * TS, 24 * TS, TS, 1); g.fillRect(c * TS, 29 * TS + 15, TS, 1) }
  const ring = (cx: number, cy: number, rad: number, col: string) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.stroke() }
  g.imageSmoothingEnabled = false
  ring(43 * TS, 27 * TS, 42, "rgba(140,106,62,.35)")
  ring(43 * TS, 27 * TS, 34, "rgba(255,240,200,.35)")

  // central park (north-middle): lawn, paved ring path, pond
  lawn(32, 2, 54, 9, 9, 7)
  tiledRR(36 * TS, 2 * TS + 2, 14 * TS, 7 * TS - 4, 14, [GROUND.sidewalk.tan], 5)
  rimmed(39, 3, 47, 7, 12, (x, y, w, h, rr) => {
    fillRR(x, y, w, h, rr, "#63c5cf")
    g.save(); rrPath(x, y, w, h, rr); g.clip()
    for (let yy = y + 3; yy < y + h; yy += 5) for (let xx = x + ((yy / 5) % 2) * 5; xx < x + w; xx += 10) { g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(xx, yy, 4, 1); g.fillStyle = "rgba(20,100,130,.25)"; g.fillRect(xx + 2, yy + 2, 3, 1) }
    g.restore()
  })
  markBlocked(39, 3, 47, 7)
  for (let r = 3; r < 7; r++) for (let c = 39; c < 47; c++) if (r > 3 && r < 6 && c > 39 && c < 46) water.push({ c, r })
  markOcc(32, 2, 54, 9)

  // small lawns and gardens
  lawn(31, 15, 36, 20, 6, 11); markOcc(31, 15, 36, 20)       // beside city hall
  lawn(50, 15, 55, 20, 6, 12); markOcc(50, 15, 55, 20)
  lawn(33, 36, 36, 43, 5, 13); markOcc(33, 36, 36, 43)       // university lawns
  lawn(52, 36, 55, 43, 5, 14); markOcc(52, 36, 55, 43)
  lawn(3, 56, 25, 58, 4, 15); markOcc(3, 56, 25, 58)         // residential front gardens
  lawn(18, 17, 24, 19, 5, 16)

  // asphalt alley (north-west) and a back lane
  tiledRR(16 * TS, 2 * TS, 3 * TS, 9 * TS, 0, GROUND.gravel, 19)
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(16 * TS, 2 * TS, 2, 9 * TS); g.fillRect(19 * TS - 2, 2 * TS, 2, 9 * TS)

  // parking lot (south-west) with painted stalls
  fillRR(3 * TS, 37 * TS, 10 * TS, 6 * TS, 3, "#404040")
  g.fillStyle = "#4a4a4a"; for (let i = 0; i < 160; i++) g.fillRect(3 * TS + Math.floor(hash(i, 1, 9) * 10 * TS), 37 * TS + Math.floor(hash(i, 2, 9) * 6 * TS), 1, 1)
  g.fillStyle = WHT
  for (let c = 3; c <= 13; c += 2) { g.fillRect(c * TS - (c === 13 ? 1 : 0), 37 * TS + 2, 1, 28); g.fillRect(c * TS - (c === 13 ? 1 : 0), 41 * TS + 2, 1, 28) }
  g.fillRect(3 * TS + 2, 37 * TS + 1, 10 * TS - 4, 1); g.fillRect(3 * TS + 2, 43 * TS - 2, 10 * TS - 4, 1)
  blit(g, cityImg, GROUND.parkingP, 12 * TS, 39 * TS)

  // construction site: churned dirt
  tiledRR(73 * TS, 36 * TS, 11 * TS, 8 * TS, 6, GROUND.dirt, 23)
  g.fillStyle = "rgba(60,36,20,.35)"
  for (let i = 0; i < 90; i++) g.fillRect(73 * TS + 4 + Math.floor(hash(i, 5, 3) * (11 * TS - 8)), 36 * TS + 4 + Math.floor(hash(i, 6, 3) * (8 * TS - 8)), 2, 1)
  g.fillStyle = "#c9ced1"; g.fillRect(76 * TS, 38 * TS, 6 * TS, 4 * TS)           // poured slab
  g.fillStyle = "#aeb4b8"; g.fillRect(76 * TS, 41 * TS + 8, 6 * TS, 8)

  // harbour: quay, water, piers
  for (let c = 0; c < W; c++) {
    blit(g, cityImg, GROUND.cobble, c * TS, 58 * TS)
    for (let r = 59; r < H; r++) {
      g.fillStyle = r < 60 ? "#4fb3c9" : r < 62 ? "#3f9fba" : "#3589ac"
      g.fillRect(c * TS, r * TS, TS, TS)
    }
  }
  for (let y = 59 * TS; y < PH; y += 6)
    for (let x = ((y / 6) % 2) * 7; x < PW; x += 14) {
      const o = Math.floor(hash(x, y, 8) * 5)
      g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(x + o, y, 5, 1)
      g.fillStyle = "rgba(10,60,100,.22)"; g.fillRect(x + o + 3, y + 3, 4, 1)
    }
  g.fillStyle = "#7d8688"; g.fillRect(0, 58 * TS + 13, PW, 3)       // quay wall
  g.fillStyle = "#c9d0d1"; g.fillRect(0, 58 * TS + 11, PW, 2)
  g.fillStyle = "rgba(10,40,70,.4)"; g.fillRect(0, 59 * TS, PW, 3)   // shadow on water
  markBlocked(0, 59, W, H)
  for (let r = 60; r < H; r++) for (let c = 0; c < W; c++) if (hash(c, r, 50) < 0.35) water.push({ c, r })
  const pier = (c0: number, c1: number, r0: number, r1: number) => {
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
      g.fillStyle = (c + r) % 2 ? "#a9763f" : "#b98a4e"; g.fillRect(c * TS, r * TS, TS, TS)
      g.fillStyle = "#7d5428"; for (let k = 0; k < 4; k++) g.fillRect(c * TS, r * TS + k * 4 + 3, TS, 1)
      blocked[idx(c, r)] = 0
    }
    g.fillStyle = "#5a3a18"; g.fillRect(c0 * TS, r0 * TS, 2, (r1 - r0) * TS); g.fillRect(c1 * TS - 2, r0 * TS, 2, (r1 - r0) * TS)
  }
  pier(70, 73, 59, 62)           // chest pier
  pier(48, 51, 59, 61)           // sightseeing jetty

  // shadows under buildings
  const bsp = BUILDINGS.map((b) => ({ b, ...renderBuilding(b) }))
  for (const { b, cv } of bsp) {
    g.fillStyle = "rgba(10,14,24,.28)"; g.fillRect(b.c * TS, b.bottom * TS, cv.width, 4)
    g.fillStyle = "rgba(10,14,24,.14)"; g.fillRect(b.c * TS, b.bottom * TS + 4, cv.width, 3)
  }

  // ── sprites ──
  const add = (s: Sprite) => { sprites.push(s); return s }
  /** place a sprite of the city atlas by its foot point */
  const put = (rect: Rect, fx: number, fy: number, o: Partial<Omit<Sprite, "solid">> & { solid?: Box | true } = {}) => {
    const solid = o.solid === true ? { x: fx - 4, y: fy - 5, w: 8, h: 5 } : o.solid || undefined
    return add({ kind: "sprite", src: o.src ?? cityImg, rect, x: Math.round(fx - rect[2] / 2), y: Math.round(fy - rect[3]), baseY: fy, ...o, solid })
  }
  const lamp = (c: number, r: number, side: "l" | "r" = "r", glowCol = "255,184,104") => {
    const fx = c * TS + 8, fy = r * TS + 14
    put(side === "r" ? FURN.lampPost : FURN.lampPostR, fx, fy, { solid: true })
    lights.push({ x: fx + (side === "r" ? 4 : -4), y: fy - 38, r: 38, color: glowCol, flicker: 0.3 })
    occ[idx(c, r)] = 1
  }

  const wins: { x: number; y: number; w: number; h: number; on: boolean; col: string; tv: boolean }[] = []
  for (const { b, cv, doorX, gTop, lit } of bsp) {
    const x = b.c * TS, y = (b.bottom - b.rr - b.fr) * TS
    add({ kind: "sprite", src: cv, rect: [0, 0, cv.width, cv.height], x, y, baseY: b.bottom * TS - 1, solid: { x: x + 1, y: y + 3, w: cv.width - 2, h: cv.height - 6 }, tag: `b:${b.id}` })
    markOcc(b.c, b.bottom - b.rr - b.fr, b.c + b.w, b.bottom + 1)
    const dX = x + doorX
    // warm doorway
    lights.push({ x: dX, y: b.bottom * TS - 8, r: 24, color: b.light ?? "255,200,120" })
    // lit panes, painted after dark: a warm, cool or violet few at a time, never a white blob
    const palette = b.wall === "glass" ? ["#bfe6ff", "#9fd2ff", "#ffe2a0", "#d0b4ff", "#7fe0ff"] : ["#ffd98a", "#ffc46b", "#ffe9b8", "#ff9f6b", "#a8d8ff"]
    for (const w of lit) {
      const hv = hash(x + w.x, y + w.y, 7)
      wins.push({ x: x + w.x, y: y + w.y, w: w.w, h: w.h, on: w.kind === "shop" ? hv < 0.9 : hv < (b.wall === "glass" ? 0.5 : 0.5), col: w.kind === "shop" ? "#ffce70" : palette[Math.floor(hash(x + w.x, y + w.y, 9) * palette.length)], tv: w.kind !== "shop" && hv > 0.46 && hv < 0.5 })
    }
    if (b.landmark) {
      const L = b.landmark
      signs.push({ x: dX, y: y - 2, label: L.label, sub: L.sub, accent: L.accent, hotspot: `door-${b.id}` })
      landmarks[L.section] = { id: L.section, label: L.label, sub: L.sub, accent: L.accent, x: dX, y: b.bottom * TS + 4, quest: QUEST[L.section] }
      lights.push({ x: dX, y: y + gTop * TS - 10, r: 44, color: L.accent === "#5b8fd6" ? "150,190,255" : "255,230,190" })
      hotspots.push({
        id: `door-${b.id}`, box: { x: dX - 14, y: b.bottom * TS - 6, w: 28, h: 20 }, label: `ENTER ${L.label}`,
        action: { type: "section", id: L.section }, marker: true, markerX: dX, markerY: y + gTop * TS - 22,
      })
    }
  }
  // ───────────────────────────────────────────────────────────
  // everything below is dressing: edges, lamps, signals, districts
  // ───────────────────────────────────────────────────────────
  const mk = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => { const { c, ctx } = canvas(w, h); draw(ctx); return c }
  const spr = (cv: HTMLCanvasElement, x: number, y: number, baseY: number, extra: Partial<Sprite> = {}) =>
    add({ kind: "sprite", src: cv, rect: [0, 0, cv.width, cv.height], x: Math.round(x), y: Math.round(y), baseY, ...extra })
  const free = (c: number, r: number) => inb(c, r) && !occ[idx(c, r)] && !road[idx(c, r)] && !blocked[idx(c, r)]
  const tallKeys = Object.keys(TREES_CITY.tall) as (keyof typeof TREES_CITY.tall)[]
  const pottedKeys = Object.keys(TREES_CITY.potted) as (keyof typeof TREES_CITY.potted)[]
  const bushKeys = Object.keys(TREES_CITY.bush) as (keyof typeof TREES_CITY.bush)[]
  const tallTree = (c: number, r: number, k?: keyof typeof TREES_CITY.tall) => {
    put(TREES_CITY.tall[k ?? tallKeys[Math.floor(hash(c, r, 3) * tallKeys.length)]], c * TS + 8, r * TS + 15, { solid: true, sway: 0.5 })
    occ[idx(c, r)] = 1
  }
  const potted = (c: number, r: number, k?: keyof typeof TREES_CITY.potted) => {
    put(TREES_CITY.potted[k ?? pottedKeys[Math.floor(hash(c, r, 4) * pottedKeys.length)]], c * TS + 8, r * TS + 15, { solid: true })
    occ[idx(c, r)] = 1
  }
  const bush = (c: number, r: number) => {
    put(TREES_CITY.bush[bushKeys[Math.floor(hash(c, r, 5) * bushKeys.length)]], c * TS + 8, r * TS + 15, { solid: true })
    occ[idx(c, r)] = 1
  }
  const prop = (rect: Rect, c: number, r: number, solid = true, dx = 0) => {
    put(rect, c * TS + 8 + dx, r * TS + 15, { solid: solid ? true : undefined })
    occ[idx(c, r)] = 1
  }
  const warm = "255,214,150"
  const emitters: { cv: HTMLCanvasElement; x: number; y: number; rgb: string; blur?: number }[] = []
  const neon = (text: string, cx: number, y: number, col: string, rgb: string, baseY: number) => {
    const w = textW(text) + 8, h = 13
    const cv = mk(w, h, (s) => {
      s.fillStyle = "#15111f"; s.fillRect(0, 0, w, h)
      s.fillStyle = col; s.fillRect(0, 0, w, 1); s.fillRect(0, h - 1, w, 1); s.fillRect(0, 0, 1, h); s.fillRect(w - 1, 0, 1, h)
      drawText(s, text, 4, 3, "#ffffff", col)
    })
    spr(cv, cx - w / 2, y, baseY)
    emitters.push({ cv, x: Math.round(cx - w / 2), y: Math.round(y), rgb, blur: 9 })
    lights.push({ x: cx, y: y + h / 2, r: Math.max(26, w * 0.5), color: rgb, flicker: 0.5 })
  }

  // closed edges: a wall of trees west, north and east, water south
  markBlocked(0, 0, W, 2); markBlocked(0, 0, 2, H); markBlocked(W - 2, 0, W, H)
  for (let c = 0; c < W; c += 2) if (free(c, 1)) tallTree(c, 1)
  for (let r = 2; r < 59; r++) {
    if (r % 2 === 0 && free(0, r)) tallTree(0, r)
    if (r % 2 === 1 && free(1, r)) tallTree(1, r)
    if (r % 2 === 1 && free(W - 1, r)) tallTree(W - 1, r)
    if (r % 2 === 0 && free(W - 2, r)) tallTree(W - 2, r)
  }
  for (let r = 3; r < 58; r += 4) { if (free(2, r)) bush(2, r); if (free(W - 3, r)) bush(W - 3, r) }

  // street lamps along every road
  for (const h of HROADS)
    for (let c = 9; c < W - 6; c += 9) {
      if (VROADS.some((v) => c >= v.c0 - 3 && c <= v.c0 + 6)) continue
      if (free(c, h.r0 - 1)) lamp(c, h.r0 - 1, "r")
      if (free(c + 4, h.r0 + 4)) lamp(c + 4, h.r0 + 4, "l")
    }
  for (const v of VROADS)
    for (let r = 8; r < 56; r += 9) {
      if (HROADS.some((h) => r >= h.r0 - 3 && r <= h.r0 + 6)) continue
      if (free(v.c0 - 1, r)) lamp(v.c0 - 1, r, "r")
      if (free(v.c0 + 4, r + 4)) lamp(v.c0 + 4, r + 4, "l")
    }

  // traffic signals: cars obey these, so the heads are drawn live
  const SIG_CYCLE = 24
  const sigState = (axis: "h" | "v", t: number, off: number) => {
    const u = (t + off) % SIG_CYCLE
    if (axis === "h") return u < 9 ? 0 : u < 11 ? 1 : 2
    return u >= 12 && u < 21 ? 0 : u >= 21 && u < 23 ? 1 : 2
  }
  interface Signal { cv: HTMLCanvasElement; axis: "h" | "v"; off: number; last: number; light: Light }
  const signals: Signal[] = []
  const LAMP_ON = ["#4dff86", "#ffc233", "#ff4a3d"], LAMP_RGB = ["90,255,150", "255,190,60", "255,80,60"]
  const drawSignal = (s: Signal, st: number) => {
    const x = s.cv.getContext("2d")!
    x.clearRect(0, 0, s.cv.width, s.cv.height)
    x.fillStyle = "#c9ced3"; x.fillRect(3, 14, 2, 18)
    x.fillStyle = "#6b7077"; x.fillRect(4, 14, 1, 18)
    x.fillStyle = "#1c1f23"; x.fillRect(0, 0, 8, 15)
    x.fillStyle = "#3a3f46"; x.fillRect(1, 1, 6, 1)
    for (let i = 0; i < 3; i++) {
      const lit = i === (st === 0 ? 2 : st === 1 ? 1 : 0)   // lamp rows: red, amber, green
      x.fillStyle = lit ? LAMP_ON[st] : ["#3a1d1b", "#3a2f17", "#173a22"][i]
      x.fillRect(2, 2 + i * 4, 4, 3)
    }
    s.light.color = LAMP_RGB[st]
  }
  HROADS.forEach((h, hi) => VROADS.forEach((v, vi) => {
    const off = (hi * 2 + vi) * 5
    const corners: [number, number, "h" | "v"][] = [[v.c0 - 1, h.r0 - 1, "h"], [v.c0 + 4, h.r0 + 4, "h"], [v.c0 + 4, h.r0 - 1, "v"], [v.c0 - 1, h.r0 + 4, "v"]]
    for (const [c, r, axis] of corners) {
      const cv = mk(8, 32, () => undefined)
      const fx = c * TS + (c < v.c0 ? 9 : 7), fy = r * TS + (r < h.r0 ? 12 : 15)
      const light: Light = { x: fx, y: fy - 28, r: 13, color: LAMP_RGB[2] }
      lights.push(light)
      const sg: Signal = { cv, axis, off, last: -1, light }
      signals.push(sg)
      drawSignal(sg, sigState(axis, 0, off)); sg.last = sigState(axis, 0, off)
      spr(cv, fx - 4, fy - 32, fy, { solid: { x: fx - 2, y: fy - 4, w: 4, h: 4 } })
    }
  }))

  const statueCv = (r: Rect) => {
    const cv = mk(r[2], r[3], (c) => c.drawImage(cityImg, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]))
    const x = cv.getContext("2d")!, d = x.getImageData(0, 0, cv.width, cv.height)
    for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 1] > d.data[i] + 25 && d.data[i + 1] > d.data[i + 2] + 15) d.data[i + 3] = 0
    x.putImageData(d, 0, 0)
    return cv
  }
  const STATUE_A = statueCv(STATUES.a), STATUE_B = statueCv(STATUES.b)
  const statue = (k: "a" | "b", fx: number, fy: number, solid: Box | true = true) => put([0, 0, 16, 32], fx, fy, { src: k === "a" ? STATUE_A : STATUE_B, solid })
  const sprayRef = { cv: null as HTMLCanvasElement | null, fx: 0, fy: 0 }
  // ── procedural art ──
  const cabinet = (body: string, trim: string, kind: "serpent" | "runes" | "quickdraw" | "slimes") => mk(20, 30, (s) => {
    s.fillStyle = "#0e0c16"; s.fillRect(1, 2, 18, 28)
    s.fillStyle = body; s.fillRect(2, 3, 16, 26)
    s.fillStyle = "rgba(255,255,255,.18)"; s.fillRect(2, 3, 16, 1); s.fillRect(2, 3, 1, 26)
    s.fillStyle = "#0e0c16"; s.fillRect(3, 4, 14, 5)                     // marquee
    s.fillStyle = trim; s.fillRect(4, 5, 12, 3)
    s.fillStyle = "#fff"; s.fillRect(5, 6, 2, 1); s.fillRect(9, 6, 2, 1); s.fillRect(13, 6, 2, 1)
    s.fillStyle = "#0e0c16"; s.fillRect(3, 10, 14, 11)                   // screen bezel
    s.fillStyle = "#050509"; s.fillRect(4, 11, 12, 9)
    s.fillStyle = trim
    if (kind === "serpent") { s.fillRect(5, 17, 6, 1); s.fillRect(10, 14, 1, 4); s.fillRect(10, 14, 4, 1); s.fillStyle = "#ff4a3d"; s.fillRect(13, 18, 2, 2) }
    else if (kind === "runes") { s.fillRect(9, 12, 2, 1); s.fillRect(8, 13, 4, 1); s.fillRect(7, 14, 6, 2); s.fillRect(8, 16, 4, 1); s.fillRect(9, 17, 2, 1); s.fillStyle = "#fff"; s.fillRect(9, 14, 2, 2) }
    else if (kind === "quickdraw") { s.fillRect(9, 12, 2, 7); s.fillRect(6, 15, 8, 1); s.fillStyle = "#fff"; s.fillRect(9, 15, 2, 1); s.fillStyle = "#ff4a3d"; s.fillRect(5, 12, 2, 2) }
    else { s.fillRect(6, 16, 8, 3); s.fillRect(7, 15, 6, 1); s.fillStyle = "#050509"; s.fillRect(8, 16, 1, 1); s.fillRect(11, 16, 1, 1) }
    s.fillStyle = "#2a2740"; s.fillRect(2, 21, 16, 4)                    // control deck
    s.fillStyle = "#ff4a3d"; s.fillRect(5, 22, 2, 2); s.fillStyle = "#cfd4d9"; s.fillRect(5, 21, 1, 1)
    s.fillStyle = "#ffd23d"; s.fillRect(11, 22, 2, 2); s.fillStyle = "#3dc4ff"; s.fillRect(14, 22, 2, 2)
    s.fillStyle = "#0e0c16"; s.fillRect(7, 26, 6, 3); s.fillStyle = "#ffd23d"; s.fillRect(9, 27, 2, 1)
    s.fillStyle = "rgba(0,0,0,.3)"; s.fillRect(2, 25, 16, 1)
  })
  const dumpster = mk(24, 16, (s) => {
    s.fillStyle = "#1c3d2a"; s.fillRect(0, 4, 24, 12)
    s.fillStyle = "#2f7d57"; s.fillRect(1, 5, 22, 9)
    s.fillStyle = "#245c40"; for (let i = 3; i < 23; i += 5) s.fillRect(i, 5, 1, 9)
    s.fillStyle = "#3a4a44"; s.fillRect(0, 2, 24, 4)
    s.fillStyle = "#5d6f66"; s.fillRect(0, 2, 24, 2)
    s.fillStyle = "#15171a"; s.fillRect(2, 14, 3, 2); s.fillRect(19, 14, 3, 2)
  })
  const container = (col: string, lite: string, dark: string, stack: boolean) => mk(40, stack ? 34 : 22, (s) => {
    const one = (y: number) => {
      s.fillStyle = dark; s.fillRect(0, y + 8, 40, 14)
      s.fillStyle = col; s.fillRect(1, y + 9, 38, 12)
      s.fillStyle = dark; for (let i = 4; i < 38; i += 4) s.fillRect(i, y + 9, 1, 12)
      s.fillStyle = lite; s.fillRect(0, y, 40, 9); s.fillStyle = col; s.fillRect(1, y + 1, 38, 7)
      s.fillStyle = lite; s.fillRect(1, y + 1, 38, 1); s.fillStyle = dark; s.fillRect(0, y + 8, 40, 1)
      s.fillStyle = "#e9edf0"; s.fillRect(36, y + 14, 3, 5)
    }
    if (stack) { one(0); one(12) } else one(0)
  })
  const crane = mk(76, 150, (s) => {
    s.fillStyle = "#f2c230"; s.fillRect(10, 20, 6, 128)
    s.fillStyle = "#b8901c"; for (let y = 24; y < 146; y += 8) { s.fillRect(10, y, 6, 1); s.fillRect(10 + ((y / 8) % 2) * 4, y, 2, 4) }
    s.fillRect(10, 20, 1, 128); s.fillRect(15, 20, 1, 128)
    s.fillStyle = "#f2c230"; s.fillRect(0, 12, 76, 6); s.fillStyle = "#b8901c"; s.fillRect(0, 17, 76, 1)
    for (let x = 2; x < 74; x += 6) { s.fillStyle = "#b8901c"; s.fillRect(x, 12, 1, 6) }
    s.fillStyle = "#f2c230"; s.fillRect(8, 6, 10, 8); s.fillStyle = "#4a5560"; s.fillRect(10, 8, 6, 3)
    s.fillStyle = "#5c6670"; s.fillRect(0, 8, 8, 8)
    s.fillStyle = "#2b2f34"; s.fillRect(56, 18, 1, 40); s.fillStyle = "#f2c230"; s.fillRect(54, 58, 5, 4)
    s.fillStyle = "#6b7077"; s.fillRect(6, 144, 14, 6)
  })
  const sailboat = mk(30, 42, (s) => {
    s.fillStyle = "#e9edf0"; s.fillRect(14, 2, 2, 28)
    s.fillStyle = "#ffffff"; for (let i = 0; i < 24; i++) s.fillRect(15, 4 + i, 1 + Math.floor(i * 0.5), 1)
    s.fillStyle = "#dfe6ea"; for (let i = 0; i < 18; i++) s.fillRect(13 - Math.floor(i * 0.5), 12 + i, 1 + Math.floor(i * 0.5), 1)
    s.fillStyle = "#ff4a3d"; s.fillRect(16, 2, 4, 2)
    s.fillStyle = "#233a55"; s.fillRect(2, 31, 26, 4); s.fillRect(4, 35, 22, 2)
    s.fillStyle = "#e9edf0"; s.fillRect(3, 31, 24, 1)
    s.fillStyle = "rgba(255,255,255,.5)"; s.fillRect(0, 38, 30, 1); s.fillRect(4, 40, 22, 1)
  })
  const ferry = mk(62, 30, (s) => {
    s.fillStyle = "#1f3f66"; s.fillRect(2, 18, 58, 8); s.fillRect(6, 26, 50, 2)
    s.fillStyle = "#f2f4f6"; s.fillRect(3, 12, 56, 7); s.fillStyle = "#c9d0d4"; s.fillRect(3, 18, 56, 1)
    s.fillStyle = "#6bb8e6"; for (let x = 6; x < 54; x += 6) s.fillRect(x, 14, 4, 3)
    s.fillStyle = "#f2f4f6"; s.fillRect(14, 6, 30, 7); s.fillStyle = "#6bb8e6"; for (let x = 17; x < 42; x += 6) s.fillRect(x, 8, 4, 3)
    s.fillStyle = "#e2683a"; s.fillRect(40, 1, 5, 6); s.fillStyle = "#2a2f35"; s.fillRect(40, 1, 5, 1)
    s.fillStyle = "rgba(255,255,255,.5)"; s.fillRect(0, 28, 62, 1)
  })
  const station = mk(96, 80, (s) => {
    s.fillStyle = "#2c353f"; s.fillRect(0, 12, 96, 68)
    s.fillStyle = "#44515e"; s.fillRect(0, 12, 96, 3); s.fillRect(0, 12, 3, 68); s.fillRect(93, 12, 3, 68)
    s.fillStyle = "#1b2128"; s.fillRect(3, 15, 90, 1)
    s.fillStyle = "#7d8996"; for (let x = 6; x < 90; x += 8) { s.fillRect(x, 18, 5, 7); s.fillStyle = "#cfe8ff"; s.fillRect(x + 1, 19, 3, 5); s.fillStyle = "#7d8996" }
    s.fillStyle = "#1c5fd0"; s.fillRect(0, 0, 96, 12)                         // blue roof band
    s.fillStyle = "#3b86ff"; s.fillRect(0, 0, 96, 2); s.fillStyle = "#123f8f"; s.fillRect(0, 10, 96, 2)
    drawText(s, "METRO", 48 - Math.floor(textW("METRO") / 2), 2, "#ffffff", "#123f8f")
    s.fillStyle = "#1c5fd0"; s.beginPath(); s.arc(14, 30, 9, 0, 7); s.fill()
    s.fillStyle = "#ffffff"; s.beginPath(); s.arc(14, 30, 7, 0, 7); s.fill()
    s.fillStyle = "#1c5fd0"; s.beginPath(); s.arc(14, 30, 5, 0, 7); s.fill()
    drawText(s, "M", 12, 27, "#ffffff")
    s.fillStyle = "#7fb8e8"; s.fillRect(24, 38, 48, 5); s.fillStyle = "#cfe8ff"; s.fillRect(24, 38, 48, 1)  // glass canopy
    s.fillStyle = "#9aa5b0"; s.fillRect(24, 43, 2, 20); s.fillRect(70, 43, 2, 20)
    for (let i = 0; i < 6; i++) { s.fillStyle = ["#d5dbe0", "#aab3bb", "#838d97", "#5d6770", "#3e4650", "#262d34"][i]; s.fillRect(27, 48 + i * 5, 42, 5); s.fillStyle = "rgba(0,0,0,.25)"; s.fillRect(27, 48 + i * 5 + 4, 42, 1) }
    s.fillStyle = "#ffc233"; s.fillRect(27, 48, 1, 32); s.fillRect(68, 48, 1, 32)
    s.fillStyle = "#0b0f14"; s.fillRect(0, 76, 96, 4)
  })

  // ── fountain at the heart of the plaza ──
  {
    const fx = 43 * TS, fy = 28 * TS + 8
    const disc = (rad: number, col: string) => fillRR(fx - rad, fy - rad, rad * 2, rad * 2, rad, col)
    disc(23, "#4c565c"); disc(22, "#c9d0d1"); disc(19, "#8aa0a6"); disc(18, "#63c5cf")
    g.save(); rrPath(fx - 18, fy - 18, 36, 36, 18); g.clip()
    g.fillStyle = "rgba(255,255,255,.35)"; for (let y = fy - 16; y < fy + 16; y += 5) g.fillRect(fx - 14 + ((y / 5) % 2) * 6, y, 5, 1)
    g.fillStyle = "rgba(20,100,130,.25)"; g.fillRect(fx - 18, fy + 8, 36, 10)
    g.restore()
    fillRR(fx - 4, fy - 4, 8, 8, 4, "#c9d0d1")
    const stat = statue("a", fx, fy + 3, { x: fx - 19, y: fy - 8, w: 38, h: 26 })
    void stat
    const spray = mk(40, 36, () => undefined)
    const sp = spr(spray, fx - 20, fy - 34, fy + 4, { dynamic: true })
    void sp
    sprayRef.cv = spray; sprayRef.fx = fx; sprayRef.fy = fy
    lights.push({ x: fx, y: fy - 6, r: 58, color: "110,220,255", flicker: 0.5 })
    water.push({ c: 42, r: 27 }, { c: 43, r: 27 }, { c: 42, r: 28 }, { c: 43, r: 28 })
  }

  // ── old town: market street and the back alley ──
  const cartAt = (c: number, r: number, k: number, dx = 0) => put(ct(34 + (k % 3), 14, 1, 2), c * TS + 8 + dx, r * TS + 15, { solid: true })
  for (const [c, r, k] of [[4, 9, 0], [9, 9, 1], [14, 9, 2], [20, 9, 0], [23, 9, 1]]) { cartAt(c, r, k); occ[idx(c, r)] = 1 }
  for (const [c, r] of [[3, 10], [8, 10], [13, 10], [19, 10], [24, 10]]) potted(c, r)
  prop(FURN.boxOpen, 5, 9); prop(FURN.box, 10, 9); prop(FURN.boxes, 15, 9); prop(FURN.boxOpen2, 21, 9)
  prop(FURN.binWood, 7, 8); prop(FURN.trash, 12, 8); prop(FURN.hydrant, 24, 8)
  prop(FURN.benchB, 22, 10, true, 8)
  // alley dressing
  spr(dumpster, 16 * TS + 1, 6 * TS + 2, 7 * TS, { solid: { x: 16 * TS + 1, y: 6 * TS + 8, w: 24, h: 8 } })
  prop(FURN.trash2, 18, 9); prop(FURN.binWood2, 18, 3); prop(FURN.boxes, 17, 2); prop(FURN.tyres, 16, 9)
  prop(FURN.tyre, 17, 9); prop(FURN.boxOpen, 18, 5)
  for (const row of [4, 6]) {
    for (let k = 0; k < 3; k++) add({ kind: "sprite", src: cityImg, rect: ct(4 + k + (row === 6 ? 3 : 0), 13), x: (16 + k) * TS, y: row * TS - 8, baseY: row * TS + 400 })
  }
  neon("NOODLES", 21 * TS, 4 * TS + 2, "#ff4fa3", "255,90,170", 8 * TS + 6)
  lights.push({ x: 17 * TS + 8, y: 8 * TS, r: 46, color: "255,90,170", flicker: 0.4 })

  // ── central park ──
  for (const [c, r, k] of [[33, 3, "orange"], [34, 6, "green"], [52, 3, "lime"], [53, 6, "orange2"], [35, 8, "green2"], [51, 8, "lime2"], [32, 5, "lime"], [34, 3, "lime2"], [51, 4, "green"]] as [number, number, keyof typeof TREES_CITY.tall][]) tallTree(c, r, k)
  put(TREES_URBAN.orangeBig, 50 * TS + 8, 7 * TS + 15, { solid: true, src: urbanImg })
  put(TREES_URBAN.orangeBig, 36 * TS + 8, 4 * TS + 15, { solid: true, src: urbanImg })
  for (const [c, r] of [[33, 7], [52, 7], [32, 8], [53, 4], [33, 4]]) bush(c, r)
  for (const c of [40, 44]) prop(FURN.benchB, c, 7, true, 8)
  prop(FURN.benchA, 37, 5); prop(FURN.benchA, 48, 5); prop(FURN.benchA, 37, 7); prop(FURN.benchA, 48, 7)
  for (const [c, r] of [[36, 8], [49, 8], [36, 2], [49, 2], [42, 2], [43, 8]]) lamp(c, r, c < 43 ? "r" : "l")
  cartAt(47, 8, 1)
  occ[idx(47, 8)] = 1
  statue("a", 31 * TS + 8, 9 * TS + 15)

  // ── city hall and its plaza ──
  statue("a", 39 * TS + 8, 25 * TS + 14); statue("b", 47 * TS + 8, 25 * TS + 14)
  put(FURN.lampBanner, 36 * TS + 8, 27 * TS + 14, { solid: true }); put(FURN.lampBannerR, 50 * TS + 8, 27 * TS + 14, { solid: true })
  lights.push({ x: 36 * TS + 8, y: 27 * TS - 24, r: 60, color: warm }, { x: 50 * TS + 8, y: 27 * TS - 24, r: 60, color: warm })
  for (const [c, r] of [[31, 28], [35, 29], [40, 29], [46, 29], [51, 29], [55, 28], [33, 25], [53, 25]]) potted(c, r)
  prop(FURN.benchB, 33, 27, true, 8); prop(FURN.benchB, 52, 27, true, 8)
  cartAt(54, 26, 2); occ[idx(54, 26)] = 1
  prop(KIOSK.teal, 31, 24); prop(KIOSK.grey, 55, 24)
  for (const [c, r, k] of [[33, 17, "green"], [32, 19, "lime"], [52, 17, "orange"], [53, 19, "green2"]] as [number, number, keyof typeof TREES_CITY.tall][]) tallTree(c, r, k)
  prop(FURN.benchA, 34, 18); prop(FURN.benchA, 51, 18)

  // ── west of the avenue: rooftop cafe and florist ──
  for (const [c, r] of [[5, 28], [9, 28], [13, 28], [18, 28], [22, 28], [3, 28]]) potted(c, r)
  prop(FURN.benchB, 7, 28, true, 8); prop(FURN.benchB, 15, 28, true, 8)
  prop(FURN.hydrant, 16, 27); prop(FURN.mailbox, 2, 27); prop(FURN.binWood, 24, 27)
  cartAt(8, 28, 0)
  for (const [c, r] of [[4, 16], [8, 16], [12, 16], [20, 16], [22, 16]]) { if (free(c, r)) potted(c, r) }
  for (const [c, r] of [[10, 17], [21, 17]]) if (free(c, r)) bush(c, r)
  tallTree(5, 17, "green"); tallTree(22, 18, "orange")
  prop(FURN.benchB, 12, 17, true, 8)

  // ── south-west: parking lot, hardware lab ──
  const parked: [number, number, "up" | "down", string][] = [[4, 38, "down", "green"], [6, 38, "down", "grey"], [10, 38, "down", "orange"], [12, 38, "down", "blue"], [4, 42, "up", "orange"], [8, 42, "up", "grey"], [10, 42, "up", "red"]]
  void parked
  for (const [c, r] of [[3, 44], [13, 44], [3, 36], [13, 36]]) potted(c, r)
  for (const [c, r] of [[2, 37], [2, 40], [2, 43]]) bush(c, r)
  lamp(14, 36, "r")
  prop(FURN.tyres, 13, 42); prop(FURN.tyres2, 24, 44); prop(FURN.boxes, 25, 43); prop(FURN.boxOpen, 24, 43); prop(FURN.binWood, 14, 44)
  prop(FURN.tyre, 23, 44)
  put(FURN.tallPole, 22 * TS + 8, 38 * TS + 13, { baseY: 43 * TS + 3 })
  neon("LAB", 14 * TS + 8, 38 * TS + 6, "#ff7a3a", "255,150,80", 43 * TS + 3)

  // ── south-middle: university ──
  for (const [c, r, k] of [[34, 38, "green"], [34, 41, "orange"], [53, 38, "lime"], [53, 41, "green2"], [34, 36, "lime2"], [53, 36, "orange2"]] as [number, number, keyof typeof TREES_CITY.tall][]) tallTree(c, r, k)
  for (const [c, r] of [[33, 40], [35, 39], [52, 40], [54, 39], [35, 42], [52, 42]]) if (free(c, r)) bush(c, r)
  statue("a", 41 * TS + 8, 44 * TS + 14); statue("b", 46 * TS + 8, 44 * TS + 14)
  put(FURN.lampBanner, 36 * TS + 8, 44 * TS + 14, { solid: true }); put(FURN.lampBannerR, 51 * TS + 8, 44 * TS + 14, { solid: true })
  lights.push({ x: 36 * TS + 8, y: 44 * TS - 24, r: 60, color: warm }, { x: 51 * TS + 8, y: 44 * TS - 24, r: 60, color: warm })
  for (const [c, r] of [[38, 45], [44, 45], [49, 45], [32, 44], [55, 44]]) potted(c, r)
  prop(FURN.benchB, 39, 44, true, 8); prop(FURN.benchB, 47, 44, true, 8)
  prop(FURN.benchA, 35, 41); prop(FURN.benchA, 52, 38)

  // ── south-east: post office, construction site ──
  for (const c of [62, 66, 70]) prop(FURN.mailbox, c, 44)
  prop(FURN.benchB, 64, 44, true, 8); prop(FURN.boxes, 71, 44); prop(FURN.box2, 61, 43)
  for (const [c, r] of [[63, 45], [68, 45], [72, 44]]) potted(c, r)
  lamp(61, 36, "l"); lamp(72, 36, "r")
  for (let c = 73; c <= 83; c++) {
    prop(FURN.barrierA, c, 36, false)
    if (c < 77 || c > 78) prop([FURN.barrierC, FURN.barrierD, FURN.barrierE, FURN.barrierF][c % 4], c, 43, false)
  }
  for (let r = 37; r <= 42; r++) { prop(FURN.barrierB, 73, r, false); prop(FURN.barrierB, 83, r, false) }
  for (const [c, r] of [[76, 43], [79, 43], [75, 41], [81, 38]]) prop(FURN.cone, c, r, false)
  put(ct(20, 17, 5, 3), 78 * TS + 8, 41 * TS + 12, { solid: { x: 76 * TS, y: 39 * TS, w: 80, h: 28 } })
  prop(FURN.boxes, 82, 41); prop(FURN.boxOpen, 82, 42); prop(FURN.tyres2, 74, 38); prop(FURN.tyres, 75, 39)
  spr(crane, 82 * TS + 8 - 13, 38 * TS + 14 - 150, 38 * TS + 14, { solid: { x: 82 * TS + 2, y: 38 * TS + 6, w: 14, h: 8 } })

  // ── downtown: planters, kiosks, benches, neon ──
  for (const c of [63, 67, 72, 76, 80]) potted(c, 10)
  for (const [c, r] of [[64, 9], [70, 9], [78, 9]]) prop(FURN.benchA, c, r)
  prop(KIOSK.teal, 61, 9); prop(KIOSK.grey2, 83, 9)
  for (const c of [63, 68, 73, 78]) lamp(c, 9, "r")
  for (const c of [63, 69, 74, 79, 83]) potted(c, 28)
  prop(FURN.benchB, 66, 28, true, 8); prop(FURN.benchB, 76, 28, true, 8); prop(KIOSK.screen, 72, 28); prop(KIOSK.vendOrange, 61, 28); prop(KIOSK.vendGreen, 82, 28)
  prop(FURN.hydrant, 74, 29); prop(FURN.mailbox, 62, 29); prop(FURN.binWood2, 70, 29)
  neon("HOTEL", 77 * TS + 8, 17 * TS + 6, "#5de6ff", "100,230,255", 27 * TS + 1)
  neon("STUDIO", 67 * TS, 18 * TS + 2, "#c79bff", "200,150,255", 27 * TS + 1)

  // ── harbour: station, arcade, quay, yard ──
  {
    const sx = 81 * TS
    spr(station, sx, 27 * TS - 80, 27 * TS - 1, { solid: { x: sx + 1, y: 27 * TS - 77, w: 94, h: 74 } })
    markOcc(81, 22, 87, 28)
    lights.push({ x: sx + 48, y: 27 * TS - 18, r: 56, color: "90,160,255" }, { x: sx + 14, y: 27 * TS - 50, r: 40, color: "80,140,255" })
    hotspots.push({
      id: "travel", label: "TAKE THE METRO", box: { x: sx + 30, y: 27 * TS - 6, w: 36, h: 20 },
      action: { type: "travel" },
      marker: true, markerX: sx + 48, markerY: 27 * TS - 84,
    })
    for (const [c, r] of [[81, 28], [86, 28]]) potted(c, r)
  }
  const GAMES: { id: string; label: string; body: string; trim: string; rgb: string; kind: "serpent" | "runes" | "quickdraw" | "slimes" }[] = [
    { id: "serpent", label: "PLAY SERPENT", body: "#1d6b46", trim: "#4dff86", rgb: "80,255,140", kind: "serpent" },
    { id: "runes", label: "PLAY RUNES", body: "#51308f", trim: "#c79bff", rgb: "190,130,255", kind: "runes" },
    { id: "quickdraw", label: "PLAY QUICKDRAW", body: "#a8461b", trim: "#ffb35e", rgb: "255,170,80", kind: "quickdraw" },
    { id: "slimes", label: "PLAY SLIMES", body: "#1c6a86", trim: "#5de6ff", rgb: "90,230,255", kind: "slimes" },
  ]
  GAMES.forEach((gm, i) => {
    const cx = (38.5 + i * 3) * TS, fy = 56 * TS + 12
    spr(cabinet(gm.body, gm.trim, gm.kind), cx - 10, fy - 30, fy, { solid: { x: cx - 9, y: fy - 5, w: 18, h: 5 } })
    lights.push({ x: cx, y: fy - 16, r: 40, color: gm.rgb, flicker: 0.8 })
    hotspots.push({ id: `game-${gm.id}`, label: gm.label, box: { x: cx - 12, y: fy - 2, w: 24, h: 16 }, action: { type: "game", id: gm.id }, marker: true, markerX: cx, markerY: fy - 34 })
  })
  neon("STREET ARCADE", 42 * TS + 8, 51 * TS + 4, "#ff4fa3", "255,90,170", 56 * TS)
  occ.fill(1, idx(35, 56), idx(49, 56))
  for (const [c, r] of [[34, 57], [50, 57], [36, 58], [48, 58]]) potted(c, r)
  prop(FURN.benchB, 41, 58, true, 8); prop(FURN.benchB, 45, 58, true, 8)
  cartAt(32, 57, 0); occ[idx(32, 57)] = 1
  cartAt(52, 57, 2); occ[idx(52, 57)] = 1
  for (let c = 6; c < W - 4; c += 12) if (free(c, 58)) lamp(c, 58, c % 24 === 6 ? "r" : "l")
  for (const [c, r] of [[10, 58], [24, 58], [58, 58], [66, 58], [78, 58]]) if (free(c, r)) prop(FURN.benchB, c, r, true, 8)
  // container yard
  const CONT: [number, number, string, string, string, boolean][] = [
    [66, 51, "#2a6fd0", "#4a8ff0", "#1a4a94", true], [71, 51, "#d0482a", "#f06a4a", "#942e1a", false], [76, 51, "#2fa35b", "#4fc47b", "#1d6b3a", true],
    [81, 51, "#e0a22a", "#f2bf50", "#9a6e18", false], [67, 54, "#7a4ad0", "#9a6af0", "#4e2e94", false], [78, 54, "#d0482a", "#f06a4a", "#942e1a", true],
  ]
  for (const [c, r, a, b2, d2, st] of CONT) {
    const cv = container(a, b2, d2, st)
    spr(cv, c * TS, r * TS, r * TS + cv.height, { solid: { x: c * TS, y: r * TS + cv.height - 10, w: 40, h: 10 } })
    markOcc(c, r, c + 3, r + 2)
  }
  for (const [c, r] of [[72, 56], [64, 57], [80, 57]]) { const cv = container(c % 2 ? "#2a6fd0" : "#2fa35b", c % 2 ? "#4a8ff0" : "#4fc47b", c % 2 ? "#1a4a94" : "#1d6b3a", false); spr(cv, c * TS, r * TS - 10, r * TS + 8, { solid: { x: c * TS, y: r * TS - 2, w: 40, h: 10 } }); markOcc(c, r - 1, c + 3, r + 1) }
  // boats, bobbing in the harbour
  const boats: { sp: Sprite; y0: number; ph: number }[] = []
  for (const [cv, x, y] of [[sailboat, 14 * TS, 60 * TS + 4], [ferry, 56 * TS, 60 * TS + 2], [sailboat, 30 * TS, 61 * TS + 6], [ferry, 80 * TS, 61 * TS + 2]] as [HTMLCanvasElement, number, number][]) {
    boats.push({ sp: spr(cv, x, y, y + cv.height - 6, { dynamic: true }), y0: y, ph: x })
  }
  // the chest at the end of the pier
  put(PROPS.chest.rect, 71 * TS + 8, 60 * TS + 16, { src: sheet("element") })
  hotspots.push({ id: "chest-harbor", label: "OPEN CHEST", box: { x: 71 * TS - 2, y: 60 * TS - 4, w: 20, h: 20 }, action: { type: "chest", id: "chest-harbor" } })
  lights.push({ x: 71 * TS + 8, y: 60 * TS + 4, r: 30, color: "255,215,110", flicker: 1 })
  // bollards on the quay
  g.fillStyle = "#3a4048"; for (let c = 3; c < W; c += 4) { g.fillRect(c * TS + 6, 58 * TS + 6, 4, 4); g.fillStyle = "#6b7480"; g.fillRect(c * TS + 6, 58 * TS + 6, 4, 1); g.fillStyle = "#3a4048" }

  // ── traffic ──
  interface Stop { s: number; axis: "h" | "v"; off: number }
  interface Loop { kind: "h" | "v"; a: number; b: number; cl: number; S: number; A: number; L: number; stops: Stop[]; cars: Car[] }
  interface Variant { cv: HTMLCanvasElement; side: Rect; sideR: Rect; up: Rect; down: Rect }
  interface Car { loop: Loop; s: number; v: number; vmax: number; art: Variant; sp: Sprite; head: Light }
  const variant = (base: "green" | "grey" | "orange", deg: number): Variant => {
    const art = CARS[base]
    const y0 = art.side[1], x0 = 496
    const cv = mk(96, 56, (c) => c.drawImage(cityImg, x0, y0, 96, 56, 0, 0, 96, 56))
    if (deg) tintCanvas(cv, deg)
    const rel = (r: Rect): Rect => [r[0] - x0, r[1] - y0, r[2], r[3]]
    return { cv, side: rel(art.side), sideR: rel(art.sideR), up: rel(art.up), down: rel(art.down) }
  }
  const VARIANTS: Record<string, Variant> = {
    green: variant("green", 0), blue: variant("green", 105), violet: variant("green", 185), lime: variant("green", -55),
    orange: variant("orange", 0), red: variant("orange", -28), yellow: variant("orange", 34), grey: variant("grey", 0),
  }
  const VKEYS = Object.keys(VARIANTS)
  const loops: Loop[] = []
  const mkLoop = (kind: "h" | "v", a: number, b: number, cl: number) => {
    const lp: Loop = { kind, a, b, cl, S: b - a, A: Math.PI * LANE, L: 2 * (b - a) + 2 * Math.PI * LANE, stops: [], cars: [] }
    loops.push(lp); return lp
  }
  HROADS.forEach((h, hi) => {
    const lp = mkLoop("h", (h.c0 + 2) * TS, (h.c1 - 2) * TS, (h.r0 + 2) * TS)
    VROADS.forEach((v, vi) => {
      const off = (hi * 2 + vi) * 5
      lp.stops.push({ s: (v.c0 - 1) * TS - 6 - lp.a, axis: "h", off })
      lp.stops.push({ s: lp.S + lp.A + (lp.b - ((v.c0 + 5) * TS + 6)), axis: "h", off })
    })
  })
  VROADS.forEach((v, vi) => {
    const lp = mkLoop("v", (v.r0 + 2) * TS, (v.r1 - 2) * TS, (v.c0 + 2) * TS)
    HROADS.forEach((h, hi) => {
      const off = (hi * 2 + vi) * 5
      lp.stops.push({ s: (h.r0 - 1) * TS - 6 - lp.a, axis: "v", off })
      lp.stops.push({ s: lp.S + lp.A + (lp.b - ((h.r0 + 5) * TS + 6)), axis: "v", off })
    })
  })
  /** position and heading at distance s along a lane loop (right-hand traffic, anticlockwise) */
  const pose = (lp: Loop, s: number, out: { x: number; y: number; dx: number; dy: number }) => {
    const { a, b, cl, S, A } = lp
    if (lp.kind === "h") {
      if (s < S) { out.x = a + s; out.y = cl + LANE; out.dx = 1; out.dy = 0 }
      else if (s < S + A) { const t = (s - S) / LANE; out.x = b + LANE * Math.sin(t); out.y = cl + LANE * Math.cos(t); out.dx = Math.cos(t); out.dy = -Math.sin(t) }
      else if (s < 2 * S + A) { out.x = b - (s - S - A); out.y = cl - LANE; out.dx = -1; out.dy = 0 }
      else { const t = (s - 2 * S - A) / LANE; out.x = a - LANE * Math.sin(t); out.y = cl - LANE * Math.cos(t); out.dx = -Math.cos(t); out.dy = Math.sin(t) }
    } else {
      if (s < S) { out.y = a + s; out.x = cl - LANE; out.dx = 0; out.dy = 1 }
      else if (s < S + A) { const t = (s - S) / LANE; out.x = cl - LANE * Math.cos(t); out.y = b + LANE * Math.sin(t); out.dx = Math.sin(t); out.dy = Math.cos(t) }
      else if (s < 2 * S + A) { out.y = b - (s - S - A); out.x = cl + LANE; out.dx = 0; out.dy = -1 }
      else { const t = (s - 2 * S - A) / LANE; out.x = cl + LANE * Math.cos(t); out.y = a - LANE * Math.sin(t); out.dx = -Math.sin(t); out.dy = -Math.cos(t) }
    }
  }
  const CAR_LEN = 34
  const pv = { x: 0, y: 0, dx: 0, dy: 0 }
  loops.forEach((lp, li) => {
    const n = lp.kind === "h" ? 4 : 3
    for (let k = 0; k < n; k++) {
      const key = VKEYS[(li * 3 + k * 5) % VKEYS.length]
      const art = VARIANTS[key]
      const sp: Sprite = { kind: "sprite", src: art.cv, rect: art.side, x: 0, y: 0, baseY: 0, dynamic: true, tag: "car" }
      sprites.push(sp)
      const head: Light = { x: 0, y: 0, r: 22, color: "255,236,190" }
      lights.push(head)
      lp.cars.push({ loop: lp, s: ((k + 0.37 * (li % 3)) / n) * lp.L, v: 0, vmax: 34 + ((li * 7 + k * 5) % 5) * 4, art, sp, head })
    }
  })

  // parked cars in the lot
  const parkedCars: [number, number, "up" | "down", string][] = [[4, 38, "down", "green"], [6, 38, "down", "grey"], [10, 38, "down", "orange"], [12, 38, "down", "blue"], [4, 42, "up", "orange"], [8, 42, "up", "grey"], [10, 42, "up", "red"], [12, 42, "up", "violet"]]
  for (const [c, r, dir, key] of parkedCars) {
    const art = VARIANTS[key], rect = art[dir]
    const cx = c * TS, cy = r * TS
    sprites.push({ kind: "sprite", src: art.cv, rect, x: cx - rect[2] / 2, y: cy - rect[3] / 2, baseY: cy + 12, solid: { x: cx - 10, y: cy - 10, w: 20, h: 22 } })
  }
  // a delivery van outside the post office
  {
    const art = VARIANTS.orange
    sprites.push({ kind: "sprite", src: art.cv, rect: art.sideR, x: 66 * TS, y: 45 * TS + 8 - 24, baseY: 45 * TS + 10, solid: { x: 66 * TS + 2, y: 45 * TS - 8, w: 32, h: 14 } })
  }

  // ── people and pets ──
  const npc = (id: string, look: (typeof PEOPLE)[number], name: string, c: number, r: number, wander: number, bark: string[], lines?: string[], speed = 18) =>
    actors.push({ id, kind: "npc", sheet: personSheet(look), face: personFace(look), name, x: c * TS + 8, y: r * TS + 12, wander, bark, lines, speed })
  npc("priya", "girl", "Priya", 45, 26, 18, ["Welcome to Neon Harbor!", "City Hall is right behind you."], [
    "Welcome to Neon Harbor!",
    "That's City Hall. Step inside and you'll meet Rayan: the bio, the motto, the lot.",
    "He builds close to the metal and close to people. Right now it's Ferrite, a Rust browser that AI agents can't prompt-inject.",
  ])
  npc("dev", "dude", "Dev", 66, 28, 18, ["Twelve projects, one Studio.", "Ferrite, Sentinel, DuckOps..."], [
    "The Project Studio has a dozen builds on display.",
    "Ferrite, Sentinel, DuckOps, DevHub... Sentinel even explains its own firewall decisions. I wish my router did.",
    "My favourite is DevHub: Postman, DevTools and Burp Suite in one workspace. One tab fewer, one coffee more.",
  ])
  npc("sam", "kid", "Sam", 40, 58, 20, ["Insert coin. Or just press E.", "Serpent has a bug. Allegedly a feature."], [
    "Four cabinets: Serpent, Runes, Quickdraw and Slimes.",
    "None of my high scores made it onto Rayan's CV. Rude.",
    "Try Quickdraw. GitHub gave him an achievement with that exact name, apparently.",
  ])
  npc("nora", "girl_b", "Nora", 10, 28, 18, ["The flat whites here power half the commits in town."], [
    "The Rooftop Cafe's flat white powers half this city's commits.",
    "Rayan's experience is on the board up there: a Barclays internship, LazerBelieve, and a year as Technical Head of CSI-SPIT.",
    "Plus a first place at Ignisa '26 with CreditIQ. The man does not sleep.",
  ])
  npc("gus", "elder", "Gus", 38, 8, 20, ["Back in my day we debugged with printf.", "Rust? Fine. But the compile times, young man."])
  npc("bo", "worker", "Bo", 78, 44, 14, ["Break things, fix faster. Not on MY site, though.", "No hard hat, no entry."])
  npc("kai", "runner", "Kai", 30, 57, 70, ["CtrlFixIt ran 120+ players at once. My cardio can't.", "On my way to the Post Office. Rayan replies fast, I'm told."], undefined, 30)
  npc("mina", "girl_c", "Mina", 12, 9, 14, ["skrgrep is multi-threaded. My shopping list isn't.", "Fresh bread! And a grep written in Rust."])
  npc("lee", "dude_b", "Lee", 80, 28, 14, ["The metro is pending. Check the sign.", "BoomSuite makes a Mac up to 4x louder. The train is still louder."])
  npc("tess", "kid_b", "Tess", 40, 44, 16, ["NeuroCred models a small business as a live digital twin. I just model my sleep.", "Rayan studies Computer Engineering in Mumbai."])
  npc("ravi", "runner_b", "Ravi", 64, 43, 14, ["Poker with a Rust backend, real-time. I still lost.", "The Post Office is where you send Rayan a message."])
  npc("ola", "elder_b", "Ola", 17, 9, 12, ["Nebula catches malware with transformer networks. My cat catches mice.", "Mind the clothesline."])
  const pet = (id: string, kind: "dog" | "cat", c: number, r: number, wander: number) => actors.push({ id, kind: "animal", sheet: animalSheet(kind), x: c * TS + 8, y: r * TS + 12, wander, speed: 16 })
  pet("dog1", "dog", 34, 5, 40); pet("dog2", "dog", 20, 28, 24); pet("cat1", "cat", 17, 3, 20)

  // ───────────────────────────────────────────────────────────
  // polish: districts, signage and the night look
  // ───────────────────────────────────────────────────────────
  const glowSprite = (cv: HTMLCanvasElement, x: number, y: number, rgb: string, blur = 10) => emitters.push({ cv, x: Math.round(x), y: Math.round(y), rgb, blur })
  const stubs: ExProject[] = Object.keys(PITCH).map((id) => ({ id, title: id.toUpperCase(), tagline: "", accent: "#ff4fa3", year: "", featured: false, category: "", tech: [], description: "", highlights: [] }))
  const projects: ExProject[] = ordered((content?.projects ?? []).length ? content!.projects : stubs)
  const ptitle = (p: { title: string }) => p.title.toUpperCase().slice(0, 11)
  const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}` }
  const mix = (h: string, k: number, to = 0) => { const n = parseInt(h.slice(1), 16); const f = (v: number) => Math.round(v + (to - v) * k); return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})` }
  const pitchOf = (p: { id: string; tagline: string }): [string, string] => PITCH[p.id] ?? [p.tagline.toUpperCase().slice(0, 15), p.tagline.toUpperCase().slice(15, 30).trim()]

  /** a project poster board: accent field, bitmap title, two lines of pitch */
  const board = (p: { id: string; title: string; tagline: string; accent: string }, w: number, h: number, flat = false) => mk(w, h, (s) => {
    s.fillStyle = "#0d0b16"; s.fillRect(0, 0, w, h)
    const gr = s.createLinearGradient(0, 0, w, h)
    gr.addColorStop(0, mix(p.accent, 0.55)); gr.addColorStop(1, mix(p.accent, 0.82))
    s.fillStyle = gr; s.fillRect(2, 2, w - 4, h - 4)
    for (let x = -h; x < w; x += 7) { s.fillStyle = "rgba(255,255,255,.07)"; for (let k = 0; k < h; k++) s.fillRect(x + k, k, 2, 1) }
    s.fillStyle = "rgba(0,0,0,.35)"; s.fillRect(2, 2, w - 4, 11)
    s.fillStyle = p.accent; s.fillRect(2, 12, w - 4, 1)
    const t = ptitle(p), tx = Math.round((w - textW(t)) / 2)
    drawText(s, t, tx, 4, "#ffffff", "rgba(0,0,0,.6)")
    const [l1, l2] = pitchOf(p)
    micro(s, l1, Math.round((w - l1.length * 4) / 2), 16, mix(p.accent, 0.1, 255))
    if (h > 26) micro(s, l2, Math.round((w - l2.length * 4) / 2), 23, "#ffffff")
    if (h > 31 && !flat) { s.fillStyle = p.accent; s.fillRect(6, h - 6, w - 12, 1); micro(s, "NOW SHIPPING", Math.round((w - 48) / 2), h - 11, "rgba(255,255,255,.55)") }
    s.fillStyle = "rgba(255,255,255,.2)"; s.fillRect(2, 2, w - 4, 1)
  })
  const focusSpot = (id: string, p: ExProject, x: number, y: number, w = 40, marker = true, my?: number) =>
    hotspots.push({ id, label: `VIEW ${p.title.toUpperCase()}`, box: { x: x - w / 2, y, w, h: 18 }, action: { type: "section", id: "gallery", focus: p.id }, marker, markerX: x, markerY: my ?? y - 70 })
  const pitchFor = (p: ExProject) => PITCH[p.id] as string[] | undefined
  /** a lit billboard on two posts at street level: the art, the title and a pitch line */
  const ground = (p: ExProject, fx: number, fy: number) => {
    const bb = billboard(p, { pitch: true, lines: pitchFor(p) })
    const w = bb.width, h = bb.height, legs = 10
    const cv = mk(w, h + legs, (s) => {
      s.fillStyle = "#2b2f36"; s.fillRect(10, h, 4, legs); s.fillRect(w - 14, h, 4, legs)
      s.fillStyle = "#5c636c"; s.fillRect(10, h, 1, legs); s.fillRect(w - 14, h, 1, legs)
      s.drawImage(bb, 0, 0)
    })
    spr(cv, fx - w / 2, fy - (h + legs), fy, { solid: { x: fx - (w - 20) / 2, y: fy - 4, w: w - 20, h: 4 } })
    glowSprite(bb, fx - w / 2, fy - (h + legs), hexRgb(p.accent), 8)
    lights.push({ x: fx, y: fy - 36, r: 50, color: hexRgb(p.accent) })
    markOcc(Math.floor((fx - 38) / TS), Math.floor((fy - 8) / TS), Math.floor((fx + 38) / TS) + 1, Math.floor(fy / TS) + 1)
    focusSpot(`ad-${p.id}-${Math.round(fx)}`, p, fx, fy - 20, 44, true, fy - h - legs - 6)
  }
  /** billboard standing on a roof line: drawn just over its building */
  const roofBoard = (bid: string, pi: number) => {
    const b = BUILDINGS.find((q) => q.id === bid)!
    const p = projects[pi % projects.length]
    const bb = billboard(p)
    const w = bb.width, h = bb.height
    const cx = (b.c + b.w / 2) * TS, top = (b.bottom - b.rr - b.fr) * TS
    const cv = mk(w, h + 10, (s) => {
      s.fillStyle = "#2b2f36"; s.fillRect(8, h, 3, 10); s.fillRect(w - 11, h, 3, 10); s.fillRect(8, h + 4, w - 19, 2)
      s.drawImage(bb, 0, 0)
    })
    const x = Math.round(cx - w / 2), y = top + 12 - (h + 10)
    spr(cv, x, y, b.bottom * TS + 1)
    glowSprite(bb, x, y, hexRgb(p.accent), 8)
    lights.push({ x: cx, y: y + 20, r: 52, color: hexRgb(p.accent) })
  }
  /** an LED wall: cycles through projects, pixel-grid overlay, glows at night */
  const ledScreens: ((t: number) => void)[] = []
  const ledScreen = (x: number, y: number, baseY: number, picks: number[], period = 3.2, pole = true) => {
    const ps = picks.map((i) => projects[i % projects.length])
    const first = billboard(ps[0])
    const w = first.width, h = first.height
    const cv = mk(w, h, () => undefined)
    const cx = cv.getContext("2d")!
    if (pole) spr(mk(8, 16, (s) => { s.fillStyle = "#4a525c"; s.fillRect(3, 0, 2, 16) }), x + w / 2 - 4, y + h, baseY, { solid: { x: x + w / 2 - 3, y: baseY - 4, w: 6, h: 4 } })
    spr(cv, x, y, baseY + 1, { dynamic: true })
    const em = { cv, x, y, rgb: "255,110,190", blur: 12 }
    emitters.push(em)
    const cache = new Map<string, HTMLCanvasElement>()
    let last = -1
    const draw = (t: number) => {
      const i = Math.floor(t / period) % ps.length, k = (t % period) / period
      const p = ps[i]
      let bbk = cache.get(p.id)
      if (!bbk) { bbk = billboard(p); cache.set(p.id, bbk) }
      cx.clearRect(0, 0, w, h)
      cx.drawImage(bbk, 0, 0)
      // wipe-in from the left, then LED pixel grid
      if (k < 0.12) { const wipe = Math.floor((k / 0.12) * w); cx.fillStyle = "#0d0b16"; cx.fillRect(wipe, 0, w - wipe, h); cx.fillStyle = "#ffffff"; cx.fillRect(wipe, 0, 2, h) }
      cx.fillStyle = "rgba(0,0,0,.22)"
      for (let yy = 4; yy < h - 4; yy += 2) cx.fillRect(4, yy, w - 8, 1)
      for (let xx = 5; xx < w - 4; xx += 2) cx.fillRect(xx, 4, 1, h - 8)
      if (i !== last) { last = i; em.rgb = rgbOf(p.accent) }
    }
    ledScreens.push(draw)
    draw(0)
    lights.push({ x: x + w / 2, y: y + h / 2, r: 54, color: "255,120,190", flicker: 0.3 })
  }
  const rgbOf = (hex: string) => hexRgb(hex)

  // ── planters, trees and bus stops along the avenues ──
  const planter = (c: number, r: number) => {
    g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(c * TS + 1, r * TS + 4, 15, 12)
    g.fillStyle = "#6a4a3a"; g.fillRect(c * TS + 1, r * TS + 3, 14, 12)
    g.fillStyle = "#a07a62"; g.fillRect(c * TS + 1, r * TS + 3, 14, 2)
    g.fillStyle = "#3a2a22"; g.fillRect(c * TS + 3, r * TS + 5, 10, 8)
    g.fillStyle = "#3f8a4a"; for (let i = 0; i < 6; i++) g.fillRect(c * TS + 3 + Math.floor(hash(c, r, i) * 9), r * TS + 5 + Math.floor(hash(c, r, i + 9) * 6), 1, 1)
  }
  const streetTree = (c: number, r: number) => {
    if (!free(c, r) || !free(c, r - 1)) return false
    planter(c, r)
    put(TREES_CITY.tall[tallKeys[Math.floor(hash(c, r, 21) * tallKeys.length)]], c * TS + 8, r * TS + 12, { solid: { x: c * TS + 4, y: r * TS + 7, w: 8, h: 5 }, sway: 0.5 })
    occ[idx(c, r)] = 1
    return true
  }
  for (const h of HROADS)
    for (let c = 7; c < W - 6; c += 6) {
      if (VROADS.some((v) => c >= v.c0 - 3 && c <= v.c0 + 6)) continue
      if (c % 12 === 1) streetTree(c + 1, h.r0 - 1)
      else streetTree(c, h.r0 + 4)
    }
  for (const v of VROADS)
    for (let r = 6; r < 56; r += 6) {
      if (HROADS.some((h) => r >= h.r0 - 3 && r <= h.r0 + 6)) continue
      streetTree(v.c0 - 1, r + 1); streetTree(v.c0 + 4, r + 4)
    }

  const busStop = (c: number, r: number, pi: number, facing: "n" | "s") => {
    if (![0, 1, 2].every((k) => free(c + k, r))) return
    const w = 48, h = 34
    const p = projects[pi % projects.length]
    const cv = mk(w, h, (s) => {
      s.fillStyle = "rgba(0,0,0,.22)"; s.fillRect(2, h - 4, w - 2, 4)
      s.fillStyle = "#4a525c"; s.fillRect(2, 8, 2, h - 10); s.fillRect(w - 16, 8, 2, h - 10)
      s.fillStyle = "#9fd6e8"; s.globalAlpha = 0.55; s.fillRect(4, 10, w - 22, 16); s.globalAlpha = 1
      s.fillStyle = "#e9edf0"; s.fillRect(4, 10, w - 22, 1)
      s.fillStyle = facing === "n" ? "#1c5fd0" : "#2fa35b"; s.fillRect(0, 4, w - 12, 5)
      s.fillStyle = "#fff"; s.fillRect(0, 4, w - 12, 1)
      s.fillStyle = "#6a4a2a"; s.fillRect(8, 24, 22, 3); s.fillStyle = "#3a2a18"; s.fillRect(9, 27, 2, 5); s.fillRect(27, 27, 2, 5)
      // ad panel at the end
      s.fillStyle = "#15131c"; s.fillRect(w - 13, 6, 12, 24)
      s.drawImage(board(p, 10, 22, true), w - 12, 7)
      s.fillStyle = "#6b7077"; s.fillRect(w - 18, 0, 1, 1)
      s.fillStyle = "#1c5fd0"; s.beginPath(); s.arc(w - 5, 3, 3, 0, 7); s.fill(); s.fillStyle = "#fff"; s.fillRect(w - 6, 2, 2, 2)
    })
    const fy = r * TS + 15
    spr(cv, c * TS, fy - h, fy, { solid: { x: c * TS + 2, y: fy - 5, w: w - 4, h: 5 } })
    glowSprite(cv, c * TS, fy - h, "150,210,255", 6)
    lights.push({ x: c * TS + 20, y: fy - 22, r: 30, color: "170,215,255" })
    markOcc(c, r, c + 3, r + 1)
  }
  busStop(12, 16, 10, "n"); busStop(66, 16, 11, "n"); busStop(40, 34, 12, "s"); busStop(46, 50, 13, "s"); busStop(20, 15 + 19, 14, "s")

  const bikeRack = (c: number, r: number) => {
    if (!free(c, r) || !free(c + 1, r)) return
    const cv = mk(32, 16, (s) => {
      s.fillStyle = "#8a9099"; for (let i = 0; i < 4; i++) { s.fillRect(2 + i * 8, 6, 1, 8); s.fillRect(6 + i * 8, 6, 1, 8); s.fillRect(2 + i * 8, 5, 5, 1) }
      const cols = ["#e2683a", "#3b86ff", "#2fa35b", "#f2c230"]
      for (let i = 0; i < 4; i++) if (hash(c, r, i) < 0.75) {
        const x = 3 + i * 8
        s.fillStyle = "#15131c"; s.fillRect(x, 9, 4, 4); s.fillRect(x + 4, 9, 1, 1)
        s.fillStyle = "#6b7077"; s.fillRect(x + 1, 10, 2, 2)
        s.fillStyle = cols[i]; s.fillRect(x + 1, 6, 3, 1); s.fillRect(x + 1, 6, 1, 4)
      }
    })
    spr(cv, c * TS, r * TS, r * TS + 15, { solid: { x: c * TS + 1, y: r * TS + 8, w: 30, h: 6 } })
    markOcc(c, r, c + 2, r + 1)
  }
  for (const [c, r] of [[28, 44], [16, 45], [56, 44], [32, 28], [57, 29], [8, 29], [20, 51]]) bikeRack(c, r)

  // ── half court (east) ──
  {
    const c0 = 81, r0 = 16, c1 = 86, r1 = 22
    const x = c0 * TS, y = r0 * TS, w = (c1 - c0) * TS, h = (r1 - r0) * TS
    g.fillStyle = "#1d3d54"; g.fillRect(x - 2, y - 2, w + 4, h + 4)
    g.fillStyle = "#2f6f8f"; g.fillRect(x, y, w, h)
    for (let yy = y; yy < y + h; yy += 8) { g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(x, yy, w, 1) }
    g.fillStyle = "#d9702a"; g.fillRect(x + 22, y, 36, 48)                              // the key
    g.strokeStyle = "#f2f4f6"; g.lineWidth = 1; g.strokeRect(x + 22.5, y + 0.5, 35, 48); g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
    g.beginPath(); g.arc(x + 40, y + 48, 12, 0, Math.PI); g.stroke()
    g.beginPath(); g.arc(x + 40, y + 6, 38, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke()
    g.fillStyle = "#f2f4f6"; g.fillRect(x + 36, y + 70, 8, 1)
    // hoop: pole, backboard and net
    const hoop = mk(30, 40, (s) => {
      s.fillStyle = "#4a525c"; s.fillRect(14, 8, 2, 32); s.fillStyle = "#e9edf0"; s.fillRect(6, 0, 18, 11); s.fillStyle = "#15131c"; s.fillRect(6, 0, 18, 1); s.fillRect(6, 10, 18, 1)
      s.fillStyle = "#e2683a"; s.fillRect(11, 5, 8, 1); s.fillStyle = "#f2f4f6"; for (let i = 0; i < 4; i++) s.fillRect(12 + i * 2, 6, 1, 3)
    })
    spr(hoop, x + 25, y - 6, y + 14, { solid: { x: x + 38, y: y + 1, w: 4, h: 6 } })
    markOcc(c0, r0, c1, r1); markBlocked(c0, r0, c1, r0 + 1)
    prop(FURN.benchB, 82, 22, true, 8); prop(FURN.binWood, 85, 22)
    lights.push({ x: x + 40, y: y + 10, r: 54, color: "255,236,190" })
    npc("hoop1", "runner", "Zee", 83, 19, 34, ["Next game to 11.", "Ball is life. So is a clean commit history."], undefined, 26)
    npc("hoop2", "kid_b", "Ty", 84, 20, 30, ["Swish. Another point for the home team."], undefined, 24)
  }

  // ── skate line (west) ──
  {
    const x0 = 4 * TS, y0 = 34 * TS
    g.fillStyle = "#9aa1a6"; g.fillRect(x0, y0 + 2, 20 * TS, 2 * TS + 4)
    g.fillStyle = "rgba(0,0,0,.08)"; for (let xx = x0; xx < x0 + 20 * TS; xx += 16) g.fillRect(xx, y0 + 2, 1, 2 * TS + 4)
    const tag = (xx: number, yy: number, col: string, s: string) => { g.fillStyle = col; for (let i = 0; i < 18; i++) g.fillRect(xx + i * 2, yy + Math.round(Math.sin(i * 0.8 + s.length) * 3), 2, 2) }
    tag(x0 + 40, y0 + 22, "#ff4fa3", "a"); tag(x0 + 150, y0 + 10, "#5de6ff", "bb"); tag(x0 + 240, y0 + 24, "#ffd23d", "ccc")
    const ledge = (len: number, col = "#cfd4d9") => mk(len, 14, (s) => { s.fillStyle = "#6b7077"; s.fillRect(0, 6, len, 8); s.fillStyle = col; s.fillRect(0, 2, len, 6); s.fillStyle = "#fff"; s.fillRect(0, 2, len, 1); s.fillStyle = "#e7b422"; for (let i = 0; i < len; i += 8) s.fillRect(i, 8, 4, 1) })
    const kicker = mk(32, 18, (s) => { for (let i = 0; i < 32; i++) { const hgt = Math.round(i * 0.4); s.fillStyle = "#7d6a58"; s.fillRect(i, 18 - hgt - 2, 1, hgt + 2); s.fillStyle = "#b09a86"; s.fillRect(i, 18 - hgt - 2, 1, 1) } s.fillStyle = "#4a3a2e"; s.fillRect(31, 4, 1, 14) })
    const rail = mk(40, 12, (s) => { s.fillStyle = "#4a525c"; s.fillRect(0, 2, 40, 2); s.fillStyle = "#e9edf0"; s.fillRect(0, 2, 40, 1); s.fillStyle = "#3a4048"; for (const px of [4, 20, 36]) s.fillRect(px, 4, 2, 8) })
    spr(ledge(48), 9 * TS, 35 * TS + 2, 36 * TS + 2, { solid: { x: 9 * TS, y: 35 * TS + 8, w: 48, h: 8 } })
    spr(rail, 14 * TS, 34 * TS + 6, 35 * TS + 14, { solid: { x: 14 * TS + 2, y: 35 * TS + 8, w: 36, h: 5 } })
    spr(kicker, 19 * TS, 34 * TS + 4, 35 * TS + 14, { solid: { x: 19 * TS, y: 35 * TS + 4, w: 32, h: 9 } })
    spr(ledge(32, "#f2c230"), 5 * TS, 34 * TS + 8, 35 * TS + 6, { solid: { x: 5 * TS, y: 35 * TS, w: 32, h: 8 } })
    markOcc(4, 34, 24, 36); markBlocked(0, 0, 0, 0)
    npc("skate", "dude_b", "Rook", 12, 35, 70, ["Kickflip? Never heard of her.", "This spot is better lit than Rayan's first CSS."], undefined, 32)
    npc("skate2", "girl_c", "Jun", 22, 35, 50, ["Grind rails, not deadlines."], undefined, 28)
    lights.push({ x: 10 * TS, y: 34 * TS + 4, r: 44, color: "255,210,150" }, { x: 20 * TS, y: 34 * TS + 4, r: 44, color: "255,210,150" })
  }

  // ── canal walk (south-west): water cut through the lawn and out to the harbour ──
  {
    const cc0 = 22, cc1 = 24, r0 = 51, r1 = 59
    for (let r = r0; r < r1; r++) for (let c = cc0; c < cc1; c++) { g.fillStyle = r % 2 ? "#4fb3c9" : "#3f9fba"; g.fillRect(c * TS, r * TS, TS, TS); blocked[idx(c, r)] = 1; if (hash(c, r, 61) < 0.6) water.push({ c, r }) }
    for (let y = r0 * TS; y < r1 * TS; y += 6) { g.fillStyle = "rgba(255,255,255,.28)"; g.fillRect(cc0 * TS + 4 + (y % 12), y, 5, 1); g.fillStyle = "rgba(10,60,100,.22)"; g.fillRect(cc0 * TS + 18, y + 3, 4, 1) }
    // stone coping on both banks
    g.fillStyle = "#566066"; g.fillRect(cc0 * TS - 2, r0 * TS, 2, (r1 - r0) * TS); g.fillRect(cc1 * TS, r0 * TS, 2, (r1 - r0) * TS)
    g.fillStyle = "#c9d0d1"; g.fillRect(cc0 * TS - 4, r0 * TS, 2, (r1 - r0) * TS); g.fillRect(cc1 * TS + 2, r0 * TS, 2, (r1 - r0) * TS)
    g.fillStyle = "#3a4048"; g.fillRect(cc0 * TS, r0 * TS - 1, (cc1 - cc0) * TS, 2)
    // footbridge
    const br = 54
    for (let r = br; r < br + 2; r++) for (let c = cc0 - 1; c <= cc1; c++) {
      g.fillStyle = (c + r) % 2 ? "#a9763f" : "#b98a4e"; g.fillRect(c * TS, r * TS, TS, TS)
      g.fillStyle = "#7d5428"; for (let k = 0; k < 4; k++) g.fillRect(c * TS + 0, r * TS + k * 4 + 3, TS, 1)
      blocked[idx(c, r)] = 0
    }
    g.fillStyle = "#5a3a18"; g.fillRect((cc0 - 1) * TS, br * TS, (cc1 - cc0 + 2) * TS, 2); g.fillRect((cc0 - 1) * TS, (br + 2) * TS - 2, (cc1 - cc0 + 2) * TS, 2)
    markOcc(cc0 - 1, br, cc1 + 1, br + 2)
    // moored rowboats
    const rowboat = (col: string) => mk(34, 14, (s) => { s.fillStyle = "#1d1006"; s.fillRect(2, 4, 30, 9); s.fillRect(0, 3, 4, 4); s.fillRect(30, 3, 4, 4); s.fillStyle = col; s.fillRect(3, 5, 28, 7); s.fillStyle = "#e9d6b0"; s.fillRect(3, 5, 28, 2); s.fillStyle = "#3a2a18"; s.fillRect(10, 8, 14, 3) })
    for (const [rb, rr, col] of [[cc0 * TS - 1, 52, "#d9574b"], [cc0 * TS + 12, 56, "#3b86ff"]] as [number, number, string][]) { const sp = spr(rowboat(col), rb, rr * TS + 2, rr * TS + 14, { dynamic: true }); boats.push({ sp, y0: rr * TS + 2, ph: rb }) }
    for (const r of [52, 56]) { tallTree(cc0 - 2, r, "green"); tallTree(cc1 + 1, r + 1, "orange"); prop(FURN.benchA, cc1 + 1, r - 1) }
    lamp(cc0 - 2, 54, "r", "255,190,120"); lamp(cc1 + 1, 54, "l", "255,190,120")
    lights.push({ x: (cc0 + 1) * TS, y: 55 * TS, r: 38, color: "90,200,230" })
    prop(KIOSK.vendGreen, cc1 + 2, 52); prop(KIOSK.teal, cc1 + 2, 56)
    npc("canal", "elder", "Mei", 25, 54, 24, ["The canal was here before the skyscrapers.", "Feed the ducks. There are no ducks. Feed them anyway."], undefined, 14)
  }

  // ── park: diagonal paths cutting the lawns ──
  const diag = (x0: number, y0: number, x1: number, y1: number, wd: number) => {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0))
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n)
      g.fillStyle = "#b39a6c"; g.fillRect(x - wd / 2 - 1, y - wd / 2 - 1, wd + 2, wd + 2)
    }
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n)
      g.fillStyle = (x + y) % 5 ? "#e3d2a4" : "#d6c392"; g.fillRect(x - wd / 2, y - wd / 2, wd, wd)
    }
  }
  diag(32 * TS + 4, 9 * TS - 6, 37 * TS, 5 * TS + 4, 10)
  diag(50 * TS + 8, 6 * TS + 4, 54 * TS - 4, 2 * TS + 10, 10)
  diag(48 * TS + 4, 8 * TS + 8, 54 * TS - 2, 9 * TS - 2, 8)

  // ── edge gardens: the outer sidewalks were empty, so they become green strips with benches ──
  for (const [c0, r0, c1, r1, sd] of [[2, 15, 4, 29, 71], [2, 32, 3, 36, 72], [85, 34, 86, 45, 73], [85, 51, 86, 57, 74], [85, 9, 86, 11, 75]] as [number, number, number, number, number][]) {
    lawn(c0, r0, c1, r1, 4, sd); markOcc(c0, r0, c1, r1)
  }

  // ── skybridge across the avenue, between the city hall annex and the studio ──
  {
    const x0 = 54 * TS, x1 = 62 * TS, y0 = 20 * TS - 4, w = x1 - x0, h = 26
    g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(x0 + 4, y0 + 40, w - 8, 14)
    const cv = mk(w, h, (s) => {
      s.fillStyle = "#15191f"; s.fillRect(0, 0, w, h)
      s.fillStyle = "#6b7480"; s.fillRect(0, 2, w, 4); s.fillStyle = "#cfd8e0"; s.fillRect(0, 2, w, 1)
      s.fillStyle = "#7fb8e8"; s.fillRect(2, 7, w - 4, 11)
      s.fillStyle = "#cfe8ff"; for (let x = 4; x < w - 4; x += 3) s.fillRect(x, 8, 1, 9)
      s.fillStyle = "#4a525c"; for (let x = 0; x < w; x += 16) s.fillRect(x, 6, 2, 13)
      s.fillStyle = "#6b7480"; s.fillRect(0, 19, w, 5); s.fillStyle = "#3a4048"; s.fillRect(0, 23, w, 3)
      s.fillStyle = "#ffe08a"; for (let x = 7; x < w - 8; x += 16) s.fillRect(x, 20, 5, 1)
    })
    spr(cv, x0, y0, 40 * TS)
    glowSprite(mk(w, 11, (s) => { s.fillStyle = "#ffe9b0"; s.fillRect(2, 0, w - 4, 11); s.fillStyle = "rgba(0,0,0,.28)"; for (let x = 0; x < w; x += 16) s.fillRect(x + 4, 0, 2, 11) }), x0, y0 + 7, "255,225,160", 4)
    lights.push({ x: x0 + w / 2, y: y0 + 40, r: 54, color: "255,214,150" })
  }

  // ── billboards that sell the work ──
  ground(projects[0], 10 * TS + 8, 16 * TS + 15)
  ground(projects[1 % projects.length], 70 * TS, 16 * TS + 15)
  ground(projects[2 % projects.length], 20 * TS, 35 * TS + 14)
  ground(projects[3 % projects.length], 68 * TS, 35 * TS + 14)
  roofBoard("w2", 4); roofBoard("post", 6); roofBoard("harbour", 8); roofBoard("r3", 9); roofBoard("h-r", 10)
  const b3 = BUILDINGS.find((q) => q.id === "h-l")!, b2 = BUILDINGS.find((q) => q.id === "t4")!
  ledScreen(Math.round((b3.c + b3.w / 2) * TS - 36), (b3.bottom - b3.rr - b3.fr) * TS + 12 - 58, b3.bottom * TS + 1, [5, 0, 2], 3.4, false)
  ledScreen(Math.round((b2.c + b2.w / 2) * TS - 36), (b2.bottom - b2.rr - b2.fr) * TS + 12 - 58, b2.bottom * TS + 1, [7, 1, 3], 3.8, false)

  // ── Project Studio: glass storefront with the featured work boxed up on shelves ──
  {
    const st = BUILDINGS.find((q) => q.id === "studio")!
    const feat = projects.slice(0, Math.min(6, projects.length))
    const wh = 44
    const y0 = st.bottom * TS - 2 - wh
    const box = (p: ExProject, bw: number, bh: number) => mk(bw, bh, (s) => {
      const body = mix(p.accent, 0.1), lid = mix(p.accent, 0.45, 255), dk = mix(p.accent, 0.45)
      s.fillStyle = "#120f1c"; s.fillRect(0, 0, bw, bh)
      s.fillStyle = body; s.fillRect(1, 1, bw - 2, bh - 2)
      s.fillStyle = lid; s.fillRect(1, 1, bw - 2, 2)
      s.fillStyle = dk; s.fillRect(bw - 4, 3, 3, bh - 4)
      s.fillStyle = "#f4c430"; s.fillRect(Math.floor((bw - 4) / 2), 1, 2, bh - 2)
      const ch = (p.title[0] ?? "?").toUpperCase()
      if (bw >= 14) drawText(s, ch, Math.floor((bw - 4 - 5) / 2) + 1, Math.floor((bh - 7) / 2) + 2, "#ffffff", "rgba(0,0,0,.5)")
      else micro(s, ch, Math.floor((bw - 3) / 2), Math.floor((bh - 5) / 2) + 1, "#ffffff")
    })
    for (let side = 0; side < 2; side++) {
      const big = feat.slice(side * 3, side * 3 + 3)
      if (!big.length) continue
      const wx = (st.c + (side ? 6 : 1)) * TS, ww = 48
      const tint = big[0].accent
      const cv = mk(ww, wh, (s) => {
        const gr = s.createLinearGradient(0, 0, 0, wh); gr.addColorStop(0, mix(tint, 0.78)); gr.addColorStop(1, "#150f26")
        s.fillStyle = gr; s.fillRect(0, 0, ww, wh)
        s.fillStyle = "rgba(255,255,255,.07)"; for (let x = 0; x < ww; x += 6) s.fillRect(x, 0, 1, wh)
        // top shelf and floor
        s.fillStyle = "#120f1c"; s.fillRect(0, 22, ww, 2); s.fillStyle = "#cfd4d9"; s.fillRect(0, 22, ww, 1)
        s.fillStyle = "#120f1c"; s.fillRect(0, wh - 3, ww, 3); s.fillStyle = "#8a9099"; s.fillRect(0, wh - 3, ww, 1)
        for (let k = 0; k < 3; k++) {
          const q = feat[(side * 3 + k + 1) % feat.length]
          s.drawImage(box(q, 13, 11), 3 + k * 15, 10)
          const bp = big[k]
          if (bp) s.drawImage(box(bp, 14, 17), 2 + k * 16, wh - 3 - 17)
        }
        micro(s, "NEW DROPS", 6, 3, "#ffe9a8")
      })
      // glass: a pale reflection streak and a dark mullion frame
      const gl = mk(ww, wh, (s) => {
        s.fillStyle = "rgba(255,255,255,.14)"; for (let k = 0; k < 10; k++) s.fillRect(10 + k + 18, 0, 1, wh)
        s.fillStyle = "rgba(255,255,255,.09)"; for (let k = 0; k < 6; k++) s.fillRect(3 + k, 0, 1, wh)
        s.fillStyle = "#1a2230"; s.fillRect(0, 0, ww, 1); s.fillRect(0, wh - 1, ww, 1); s.fillRect(0, 0, 1, wh); s.fillRect(ww - 1, 0, 1, wh)
      })
      const full = mk(ww, wh, (s) => { s.drawImage(cv, 0, 0); s.drawImage(gl, 0, 0) })
      spr(full, wx, y0, st.bottom * TS + 3)
      glowSprite(cv, wx, y0, "255,226,190", 6)
      lights.push({ x: wx + ww / 2, y: y0 + 22, r: 44, color: "255,232,200" })
      big.forEach((bp, k) => hotspots.push({ id: `shop-${bp.id}`, label: `VIEW ${bp.title.toUpperCase()}`, box: { x: wx + 2 + k * 16 - 1, y: st.bottom * TS - 2, w: 18, h: 20 }, action: { type: "section", id: "gallery", focus: bp.id } }))
    }
  }

  // a live ticker over the court: cycles through the whole portfolio
  {
    const fx = 83 * TS + 8, fy = 16 * TS + 4
    ledScreen(fx - 36, fy - 16 - 48, fy, projects.map((_, i) => i), 4)
  }

  // ── more neon, in more colours ──
  neon("DINER", 34 * TS, 20 * TS, "#ff7a3a", "255,140,80", 24 * TS + 2)
  neon("RAMEN", 17 * TS + 8, 7 * TS + 2, "#7dff8a", "110,255,140", 8 * TS + 2)
  neon("FISH", 66 * TS + 8, 52 * TS, "#5de6ff", "100,230,255", 55 * TS + 2)
  neon("PIZZA", 12 * TS, 52 * TS, "#ffd23d", "255,210,80", 55 * TS + 2)
  neon("KARAOKE", 18 * TS + 8, 52 * TS, "#c79bff", "200,150,255", 55 * TS + 2)

  // ── self-lit things after dark: window panes, signs, screens ──
  const winList = wins
  const emissiveFn: NonNullable<Scene["emissive"]> = (ctx, camX, camY, vw, vh, a, t) => {
    if (a < 0.04) return
    ctx.save()
    for (const w of winList) {
      const x = w.x - camX, y = w.y - camY
      if (x < -20 || y < -40 || x > vw || y > vh) continue
      if (!w.on) continue
      const fl = w.tv ? 0.75 + 0.25 * Math.sin(t * 5 + w.x) : 1
      ctx.globalAlpha = a * fl * (w.col === "#ffce70" ? 0.62 : 1)
      ctx.fillStyle = w.col; ctx.fillRect(Math.round(x), Math.round(y), w.w, w.h)
      ctx.globalAlpha = a * 0.5 * fl; ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(x), Math.round(y), w.w, 1)
      ctx.globalAlpha = a * 0.25; ctx.fillStyle = "#000"; ctx.fillRect(Math.round(x), Math.round(y + w.h - 1), w.w, 1)
    }
    for (const e of emitters) {
      const x = e.x - camX, y = e.y - camY
      if (x < -e.cv.width - 20 || y < -e.cv.height - 20 || x > vw + 20 || y > vh + 20) continue
      ctx.globalAlpha = a
      ctx.shadowColor = `rgba(${e.rgb},${0.9 * a})`; ctx.shadowBlur = e.blur ?? 8
      ctx.drawImage(e.cv, x, y)
    }
    ctx.restore()
  }

  // ── per-frame simulation ──
  const hv = { x: 0, y: 0, dx: 0, dy: 0 }
  const tick = (t: number, dt: number) => {
    for (const sg of signals) {
      const st = sigState(sg.axis, t, sg.off)
      if (st !== sg.last) { sg.last = st; drawSignal(sg, st) }
    }
    const hx = runtime.player.x, hy = runtime.player.y - 6
    for (const lp of loops) {
      for (const c of lp.cars) {
        pose(lp, c.s, pv)
        const half = CAR_LEN / 2
        let D = Infinity
        for (const o of lp.cars) {
          if (o === c) continue
          const dd = (((o.s - c.s) % lp.L) + lp.L) % lp.L - CAR_LEN - 6
          if (dd < D) D = dd
        }
        for (const st of lp.stops) {
          const dist = (((st.s - (c.s + half)) % lp.L) + lp.L) % lp.L
          if (dist > 120) continue
          const state = sigState(st.axis, t, st.off)
          if (state === 2 || (state === 1 && dist > 14)) D = Math.min(D, dist)
        }
        const rx = hx - pv.x, ry = hy - pv.y
        const along = rx * pv.dx + ry * pv.dy, lat = Math.abs(rx * pv.dy - ry * pv.dx)
        if (along > 0 && along < half + 46 && lat < 16) D = Math.min(D, along - half - 6)
        const vsafe = Math.sqrt(2 * 90 * Math.max(0, D))
        const target = Math.min(c.vmax, vsafe)
        c.v = c.v < target ? Math.min(target, c.v + 45 * dt) : Math.max(target, c.v - 160 * dt)
        c.s = (c.s + c.v * dt) % lp.L
        pose(lp, c.s, hv)
        const horiz = Math.abs(hv.dx) >= Math.abs(hv.dy)
        const rect = horiz ? (hv.dx > 0 ? c.art.sideR : c.art.side) : hv.dy > 0 ? c.art.down : c.art.up
        c.sp.rect = rect
        c.sp.x = Math.round(hv.x - rect[2] / 2); c.sp.y = Math.round(hv.y - rect[3] / 2)
        c.sp.baseY = Math.round(hv.y + rect[3] / 2 - 4)
        c.head.x = hv.x + hv.dx * 18; c.head.y = hv.y + hv.dy * 18
      }
    }
    for (const l of ledScreens) l(t)
    // fountain spray
    if (sprayRef.cv) {
      const x = sprayRef.cv.getContext("2d")!
      x.clearRect(0, 0, 40, 36)
      for (let k = 0; k < 14; k++) {
        const ph = (t * 0.9 + k / 14) % 1, ang = k * 2.4
        const px = 20 + Math.cos(ang) * ph * 15, py = 30 - ph * (1 - ph) * 4 * 20
        x.fillStyle = ph < 0.5 ? "rgba(255,255,255,.95)" : "rgba(190,240,255,.8)"
        x.fillRect(Math.round(px), Math.round(py), 2, 2)
      }
      const jh = 16 + Math.round(Math.sin(t * 4) * 3)
      x.fillStyle = "rgba(220,248,255,.9)"; x.fillRect(19, 30 - jh, 2, jh)
      x.fillStyle = "rgba(255,255,255,.95)"; x.fillRect(19, 30 - jh, 2, 2)
    }
    for (const b of boats) { b.sp.y = Math.round(b.y0 + Math.sin(t * 0.9 + b.ph) * 1.5); b.sp.baseY = b.sp.y + b.sp.rect[3] - 6 }
  }

  landmarks.arcade = { id: "arcade", label: "STREET ARCADE", sub: "ARCADE", accent: "#ff4fa3", x: 43 * TS, y: 57 * TS + 8, quest: QUEST.arcade }
  tick(0, 0)
  return {
    id: "city", title: "Neon Harbor", w: W, h: H, ground: gcv, sprites, blocked, hotspots, actors, lights,
    spawn: { x: 43 * TS + 8, y: 26 * TS + 10, facing: "down" }, dark: 0, music: "city", water, bg: "#10131f", tick,
    outdoor: true, world: "city", signs, emissive: emissiveFn,
    lighting: { dark: 0.8, holeStrength: 0.4, heroRadius: 40, radiusScale: 1, glow: 0.36, tint: "10,12,46" }, landmarks: LANDMARK_ORDER.map((id) => landmarks[id]),
    arrive: { x: 84 * TS + 8, y: 28 * TS + 6, facing: "left" },
  }
}

export const CITY_PRELOAD: string[] = [
  CITY_SHEET, URBAN_SHEET,
  ...PEOPLE.map(personSheet), ...PEOPLE.map(personFace),
  animalSheet("dog"), animalSheet("cat"),
  "/na/tiles/TilesetElement.png",
]
