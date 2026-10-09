"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import {
  WORLD_MAP, WORLD_W, WORLD_H, TILE_PX, SCALE,
  WALKABLE, BUILDINGS, PLAYER_START, T,
} from "@/lib/tilemap"
import { NPCS } from "@/lib/npcs"
import TitleScreen from "@/components/ui/TitleScreen"
import HUD from "@/components/ui/HUD"
import AchievementToast from "@/components/ui/AchievementToast"
import BuildingModal from "@/components/ui/BuildingModal"

const PLAYER_SPEED = 180 // px/sec
const INTERACT_DIST = TILE_PX * 1.5
const STEP_INTERVAL = 0.32 // seconds between step sounds

// ── Building interior dimensions (in tiles)
const INT_W = 14, INT_H = 10
const INT_PX_W = INT_W * TILE_PX
const INT_PX_H = INT_H * TILE_PX
const INT_PODIUM = { x: 7, y: 5 }
const INT_EXIT   = { x: 7, y: INT_H - 1 }

// ── City scene dimensions
const CITY_W = 36, CITY_H = 24
const CITY_PX_W = CITY_W * TILE_PX
const CITY_PX_H = CITY_H * TILE_PX
// Gate tile in city (north side, return to village)
const CITY_GATE_OUT = { x: 17, y: 1 }
// Gate tile in village (south end, enter city) — placed in open SE area
const VILLAGE_GATE  = { x: 50, y: 33 }

// Procedural city map: 1 = walkable (street/sidewalk), 0 = block (building/wall)
function buildCityMap(): number[][] {
  const m: number[][] = Array.from({ length: CITY_H }, () => Array(CITY_W).fill(0))
  for (let r = 0; r < CITY_H; r++) {
    for (let c = 0; c < CITY_W; c++) {
      if (r === 0 || r === CITY_H - 1 || c === 0 || c === CITY_W - 1) {
        m[r][c] = 0  // outer wall (impassable)
        continue
      }
      // main horizontal street + vertical street + sidewalks
      const hStreet = r >= 10 && r <= 14   // 5-wide (3 road + 2 sidewalk)
      const vStreet = c >= 15 && c <= 19
      // secondary cross streets
      const hSec    = r === 5 || r === 19
      const vSec    = c === 6 || c === 28
      if (hStreet || vStreet || hSec || vSec) m[r][c] = 1
    }
  }
  // Gate opening through top wall
  m[0][CITY_GATE_OUT.x] = 1
  m[1][CITY_GATE_OUT.x] = 1
  return m
}
const CITY_MAP = buildCityMap()

// Top-down RPG character — sprite + procedural walk overlay
// No sheet has multi-frame walk cycles, so we layer:
//   bob (Y) + lean (rotate) + squash (scale) + forward-arm (side stance)
//   + 2-frame boot toggle clipped under the body
function drawPlayer(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, px: number, py: number, facing: string, animT: number) {
  const moving = animT > 0
  const cyc   = Math.sin(animT * 11)         // -1..1 walk cycle
  const cyc2  = Math.cos(animT * 11)
  const step  = moving && cyc > 0 ? 1 : -1   // -1/+1 leg phase (sharp toggle)
  const bob   = moving ? Math.abs(cyc) * 2.6 : 0
  const lean  = moving ? cyc * 0.06 : 0
  const squashY = moving ? 1 - Math.abs(cyc) * 0.06 : 1
  const squashX = moving ? 1 + Math.abs(cyc) * 0.04 : 1
  const horiz = facing === "left" || facing === "right"
  const flipX = facing === "left" ? -1 : 1

  // ground shadow — pulses with bob (wider when airborne)
  ctx.globalAlpha = 0.32
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.ellipse(px, py + 4, 13 + bob * 0.6, 5 - bob * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  if (!img) return

  // Source: bearded adventurer at col 1, row 6 — clear masculine sprite
  const w = 38, h = 48
  const sx = 1 * 17, sy = 6 * 17

  ctx.save()
  ctx.translate(px, py - bob)
  ctx.rotate(lean)
  ctx.scale(flipX * squashX, squashY)
  ctx.imageSmoothingEnabled = false

  // BODY + HEAD (top portion of sprite, crop bottom 4 src-px to draw legs ourselves)
  // Sprite is 16px tall — top 12 = head/torso, bottom 4 = feet area
  const bodyH = (h * 12) / 16
  ctx.drawImage(img, sx, sy, 16, 12, -w / 2, -h + 8, w, bodyH)

  // LEGS — two boots toggling forward/back for step illusion
  if (moving) {
    const bw = 6, bh = 7
    const baseY = -h + 8 + bodyH - 2
    const fwd = step * 2.4, back = -step * 2.4
    // back boot (darker)
    ctx.fillStyle = "#3a2418"
    ctx.fillRect(-bw - 1 + back, baseY + 1, bw, bh - 1)
    // front boot
    ctx.fillStyle = "#5c3a22"
    ctx.fillRect(1 + fwd, baseY, bw, bh)
  } else {
    // idle stance — both boots flat under body
    const bw = 6, bh = 6
    const baseY = -h + 8 + bodyH - 1
    ctx.fillStyle = "#4a2e18"
    ctx.fillRect(-bw - 1, baseY, bw, bh)
    ctx.fillRect(1,        baseY, bw, bh)
  }

  // FORWARD-ARM OVERLAY — sells side-stance when moving horizontally
  if (horiz && moving) {
    const armX = w / 2 - 7
    const armY = -h * 0.55 + cyc2 * 2.5
    // sleeve (matches sprite tunic colour — warm brown)
    ctx.fillStyle = "#7c4a26"
    ctx.fillRect(armX, armY, 5, 9)
    // hand (skin)
    ctx.fillStyle = "#caa581"
    ctx.fillRect(armX, armY + 9, 5, 3)
  }

  ctx.restore()
}

// ── Tilemap helpers ───────────────────────────────────────────
// Tiny Town tilemap: 12 cols × 11 rows, 16px tiles + 1px gap → 17px stride
function tsrc(idx: number): [number, number] {
  return [(idx % 12) * 17, Math.floor(idx / 12) * 17]
}

function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function drawTile(ctx: CanvasRenderingContext2D, img: HTMLImageElement, idx: number, dx: number, dy: number) {
  const [sx, sy] = tsrc(idx)
  // +1px so neighbouring tiles overlap — kills the grid seam
  ctx.drawImage(img, sx, sy, 16, 16, dx, dy, TILE_PX + 1, TILE_PX + 1)
}

// Kenney Tiny Town roof/wall tile sets — kept independent so houses vary.
// Gable triangle colour: grey roof ↔ brown wall, orange roof ↔ stone wall.
const ROOFS = {
  grey:   { top: [48, 49, 50], body: [60, 61, 62], gable: 63, dormer: 51 },
  orange: { top: [52, 53, 54], body: [64, 65, 66], gable: 67, dormer: 55 },
}
const WALLS = {
  brown: { top: [72, 73, 74], doorTop: 75, window: 84, door: 85 },
  stone: { top: [76, 77, 78], doorTop: 79, window: 88, door: 89 },
}
const HOUSE: Record<string, { roof: keyof typeof ROOFS; wall: keyof typeof WALLS; gable: boolean; dormer: boolean }> = {
  townhall: { roof: "grey",   wall: "brown", gable: true,  dormer: true  },
  academy:  { roof: "orange", wall: "stone", gable: true,  dormer: false },
  gallery:  { roof: "grey",   wall: "brown", gable: false, dormer: true  },
  tavern:   { roof: "orange", wall: "stone", gable: true,  dormer: false },
  forge:    { roof: "grey",   wall: "brown", gable: true,  dormer: false },
  wizard:   { roof: "orange", wall: "stone", gable: false, dormer: true  },
}

// Tree types — tall trees are 2 tiles (canopy top + base), short trees 1 tile
const TREES = [
  { tall: true,  top: 4,  base: 16 },  // green pine
  { tall: true,  top: 4,  base: 16 },
  { tall: true,  top: 3,  base: 15 },  // autumn orange
  { tall: false, top: 28, base: 28 },  // small green tree
  { tall: false, top: 27, base: 27 },  // small orange tree
  { tall: false, top: 5,  base: 5  },  // round bush
  { tall: false, top: 6,  base: 6  },  // leafy bush
]

function drawTree(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, seed: number) {
  // Per-tree pixel jitter breaks the grid symmetry — trees no longer aligned on a perfect grid
  const jx = (rand(seed * 1.31) - 0.5) * TILE_PX * 0.35
  const jy = (rand(seed * 2.17) - 0.5) * TILE_PX * 0.22
  dx += jx; dy += jy
  // Pick variant; if not enough vertical space for a tall tree's canopy, fall back to a short variant
  let tr = TREES[Math.floor(rand(seed) * TREES.length)]
  if (tr.tall && dy < TILE_PX) {
    tr = TREES[3 + (Math.floor(rand(seed * 1.7)) % 4)] ?? TREES[3]
  }
  // ground shadow
  ctx.globalAlpha = 0.28
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.ellipse(dx + TILE_PX / 2, dy + TILE_PX * 0.82, TILE_PX * 0.32, TILE_PX * 0.13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  if (tr.tall) {
    drawTile(ctx, img, tr.top, dx, dy - TILE_PX)
    drawTile(ctx, img, tr.base, dx, dy)
  } else {
    drawTile(ctx, img, tr.top, dx, dy)
  }
}

// Wood nameplate above a building — auto-sized to the text, no overflow
function drawLabel(ctx: CanvasRenderingContext2D, text: string, cx: number, topY: number) {
  ctx.font = `${SCALE * 3}px 'Press Start 2P', monospace`
  const tw = ctx.measureText(text).width
  const padX = 9
  const h = SCALE * 3 + 11
  const w = tw + padX * 2
  const x = Math.round(cx - w / 2)
  const y = Math.round(topY - h - 8)
  ctx.fillStyle = "#241307"; ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
  ctx.fillStyle = "#6b4423"; ctx.fillRect(x, y, w, h)
  ctx.fillStyle = "#caa066"; ctx.fillRect(x, y, w, 3)
  ctx.fillStyle = "#1a0e04"; ctx.fillRect(x, y + h - 3, w, 3)
  ctx.textAlign = "center"
  ctx.fillStyle = "#000"; ctx.fillText(text, cx + 1, y + h - 7)
  ctx.fillStyle = "#f6e8c8"; ctx.fillText(text, cx, y + h - 8)
  ctx.textAlign = "left"
}

// NPCs — same procedural walk overlay as player
function drawNpc(ctx: CanvasRenderingContext2D, img: HTMLImageElement, px: number, py: number, tile: number, facing: string, animT: number) {
  const moving = animT > 0
  const cyc   = Math.sin(animT * 10)
  const cyc2  = Math.cos(animT * 10)
  const step  = moving && cyc > 0 ? 1 : -1
  const bob   = moving ? Math.abs(cyc) * 2.2 : 0
  const lean  = moving ? cyc * 0.05 : 0
  const horiz = facing === "left" || facing === "right"
  const flipX = facing === "left" ? -1 : 1

  ctx.globalAlpha = 0.3
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.ellipse(px, py + 3, 11 + bob * 0.5, 4 - bob * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  const w = 34, h = 42
  const sx = (tile % 54) * 17
  const sy = Math.floor(tile / 54) * 17

  ctx.save()
  ctx.translate(px, py - bob)
  ctx.rotate(lean)
  ctx.scale(flipX, 1)
  ctx.imageSmoothingEnabled = false
  const bodyH = (h * 12) / 16
  ctx.drawImage(img, sx, sy, 16, 12, -w / 2, -h + 8, w, bodyH)

  if (moving) {
    const bw = 5, bh = 6
    const baseY = -h + 8 + bodyH - 1
    const fwd = step * 2, back = -step * 2
    ctx.fillStyle = "#3a2418"
    ctx.fillRect(-bw - 1 + back, baseY + 1, bw, bh - 1)
    ctx.fillStyle = "#5c3a22"
    ctx.fillRect(1 + fwd, baseY, bw, bh)
  } else {
    const bw = 5, bh = 5
    const baseY = -h + 8 + bodyH
    ctx.fillStyle = "#4a2e18"
    ctx.fillRect(-bw - 1, baseY, bw, bh)
    ctx.fillRect(1,        baseY, bw, bh)
  }

  if (horiz && moving) {
    const armX = w / 2 - 6
    const armY = -h * 0.55 + cyc2 * 2
    ctx.fillStyle = "#7c4a26"
    ctx.fillRect(armX, armY, 4, 8)
    ctx.fillStyle = "#caa581"
    ctx.fillRect(armX, armY + 8, 4, 3)
  }

  ctx.restore()
}

// ── NPCs (runtime, wandering) ─────────────────────────────────
interface NpcRuntime {
  x: number; y: number          // pixel coords, feet-center
  homeX: number; homeY: number  // pixel anchor
  tile: number
  facing: "up" | "down" | "left" | "right"
  animT: number
  tx: number | null; ty: number | null  // target pixel
  idleT: number
  speed: number
}

// ── Combat ────────────────────────────────────────────────────
interface Monster {
  x: number; y: number; type: string; hp: number; maxHp: number; hurt: number
  facing: "up" | "down" | "left" | "right"
  animT: number
  wTx: number | null; wTy: number | null; wIdle: number
}
interface Projectile { x: number; y: number; vx: number; vy: number; life: number }

// tile = index into tiny-dungeon tilemap
const MONSTER_TYPES: Record<string, { hp: number; speed: number; dmg: number; tile: number }> = {
  slime:    { hp: 2, speed: 44, dmg: 1, tile: 108 },
  spider:   { hp: 3, speed: 78, dmg: 1, tile: 122 },
  ghost:    { hp: 4, speed: 60, dmg: 2, tile: 121 },
  skeleton: { hp: 7, speed: 54, dmg: 2, tile: 85  },
}

function currentWeapon(kills: number) {
  if (kills >= 16) return { name: "PISTOL", dmg: 5, range: 0,  ranged: true,  tile: 105 }
  if (kills >= 6)  return { name: "SWORD",  dmg: 4, range: 56, ranged: false, tile: 106 }
  return { name: "KNIFE", dmg: 2, range: 42, ranged: false, tile: 105 }
}

function drawMonster(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, tile: number, hpFrac: number, hurt: number, facing: string, animT: number) {
  const moving = animT > 0
  const cyc   = Math.sin(animT * 9)
  const bob   = moving ? Math.abs(cyc) * 2.2 : 0
  const lean  = moving ? cyc * 0.07 : 0
  const flipX = facing === "left" ? -1 : 1

  ctx.globalAlpha = 0.32
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.ellipse(dx, dy + 3, 12 + bob * 0.5, 4.5 - bob * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  const [sx, sy] = tsrc(tile)
  const base = hurt > 0 ? 38 : 34   // slimmer (was 44/50)
  const s = base
  ctx.save()
  ctx.translate(dx, dy - bob)
  ctx.rotate(lean)
  ctx.scale(flipX, 1)
  ctx.imageSmoothingEnabled = false
  if (hurt > 0) { ctx.filter = "brightness(1.6) saturate(0.6)" }
  ctx.drawImage(img, sx, sy, 16, 16, -s / 2, -s + 6, s, s)
  ctx.filter = "none"
  ctx.restore()

  if (hpFrac < 1) {
    ctx.fillStyle = "#2a1a0a"; ctx.fillRect(dx - 14, dy - s + 2, 28, 4)
    ctx.fillStyle = "#c8463b"; ctx.fillRect(dx - 13, dy - s + 3, 26 * hpFrac, 2)
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: typeof BUILDINGS[0], camX: number, camY: number, tileImg: HTMLImageElement | null, revealed = true) {
  const sx = Math.floor(b.x * TILE_PX - camX)
  const sy = Math.floor(b.y * TILE_PX - camY)
  const W = b.w, H = b.h
  const bw = W * TILE_PX
  const bh = H * TILE_PX
  const cx = sx + bw / 2

  // ── CAVE — hidden until the player stumbles onto it ────────
  if (b.id === "cave") {
    if (!revealed) {
      // disguised as a forest thicket
      if (tileImg) {
        for (let i = 0; i < W; i++) {
          drawTile(ctx, tileImg, 4, sx + i * TILE_PX, sy)
          drawTile(ctx, tileImg, 16, sx + i * TILE_PX, sy + TILE_PX)
        }
      }
      return
    }
    // Stone cave entrance — Tiny Town castle tiles
    if (tileImg) {
      const top = [96, 97, 98]
      const bot = [108, 124, 110]
      for (let c = 0; c < W; c++) {
        drawTile(ctx, tileImg, top[c] ?? 97, sx + c * TILE_PX, sy)
        drawTile(ctx, tileImg, bot[c] ?? 109, sx + c * TILE_PX, sy + TILE_PX)
      }
    }
    drawLabel(ctx, b.label, cx, sy)
    return
  }

  // ── STANDARD BUILDINGS — composed from Kenney tiles ────────
  const cfg = HOUSE[b.id] ?? { roof: "grey" as const, wall: "brown" as const, gable: true, dormer: false }
  const roof = ROOFS[cfg.roof]
  const wall = WALLS[cfg.wall]
  const dc = b.doorX - b.x

  // ground shadow
  ctx.globalAlpha = 0.3
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.ellipse(cx, sy + bh - 2, bw * 0.5, TILE_PX * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  if (tileImg) {
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const ei = c === 0 ? 0 : c === W - 1 ? 2 : 1
        let idx: number
        if (r === 0) {
          idx = roof.top[ei]                                // ridge
        } else if (r <= H - 3) {
          idx = roof.body[ei]
          if (cfg.dormer && r === 1 && c === W - 2) idx = roof.dormer
          if (cfg.gable && r === H - 3 && c === dc) idx = roof.gable
        } else if (r === H - 2) {
          idx = (cfg.gable && c === dc) ? wall.doorTop : wall.top[ei]
        } else {
          idx = c === dc ? wall.door : wall.window          // wall: door + windows
        }
        drawTile(ctx, tileImg, idx, sx + c * TILE_PX, sy + r * TILE_PX)
      }
    }
  } else {
    ctx.fillStyle = b.color
    ctx.fillRect(sx, sy, bw, bh)
  }

  // ── AESTHETIC POLISH — chimney smoke, window glow, door lantern, pennant
  const now = performance.now() / 1000
  const seed = b.id.charCodeAt(0)

  // Warm window glow — each window tile gets a soft yellow rect
  for (let c = 0; c < W; c++) {
    if (c === dc) continue                      // skip door
    const wx = sx + c * TILE_PX + TILE_PX * 0.28
    const wy = sy + (H - 1) * TILE_PX + TILE_PX * 0.18
    const ww = TILE_PX * 0.44, wh = TILE_PX * 0.38
    const flick = 0.55 + Math.sin(now * 2 + c + seed) * 0.05
    const grad = ctx.createRadialGradient(wx + ww / 2, wy + wh / 2, 1, wx + ww / 2, wy + wh / 2, ww * 0.9)
    grad.addColorStop(0, `rgba(255, 220, 120, ${flick})`)
    grad.addColorStop(1, "rgba(255, 200, 80, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8)
  }

  // Door lantern — sprite tile (key/torch icon from tiny-town) with warm halo
  const lanX = sx + dc * TILE_PX + TILE_PX * 0.92
  const lanY = sy + (H - 1) * TILE_PX + TILE_PX * 0.22
  const lanGlow = ctx.createRadialGradient(lanX, lanY, 1, lanX, lanY, 28)
  lanGlow.addColorStop(0, "rgba(255, 230, 140, 0.95)")
  lanGlow.addColorStop(0.5, "rgba(255, 180, 60, 0.4)")
  lanGlow.addColorStop(1, "rgba(255, 160, 40, 0)")
  ctx.fillStyle = lanGlow
  ctx.fillRect(lanX - 28, lanY - 28, 56, 56)
  if (tileImg) drawTile(ctx, tileImg, 105, lanX - TILE_PX / 2, lanY - TILE_PX / 2)

  // Pennant flag — flower/banner tile from sheet (idx 43 flower as marker)
  const penX = sx + dc * TILE_PX + TILE_PX * 0.5
  const penY = sy + (H - 3) * TILE_PX
  if (tileImg) drawTile(ctx, tileImg, 43, penX - TILE_PX / 2, penY - TILE_PX * 0.6)

  // Chimney — wall-top tile + animated smoke
  if (W >= 4) {
    const chimC = cfg.dormer ? 1 : W - 2
    const chimX = sx + chimC * TILE_PX
    const chimTopY = sy - TILE_PX * 0.6
    if (tileImg) drawTile(ctx, tileImg, 76, chimX, chimTopY)
    // smoke puffs (atmospheric particles — kept procedural)
    for (let i = 0; i < 4; i++) {
      const t = (now * 0.4 + i * 0.25 + seed * 0.1) % 1
      const ppx = chimX + TILE_PX / 2 + Math.sin(t * 6 + i + seed) * 8
      const ppy = chimTopY - t * 60
      const rr = 3 + t * 10
      ctx.globalAlpha = (1 - t) * 0.55
      ctx.fillStyle = "#d8ccc0"
      ctx.beginPath()
      ctx.arc(ppx, ppy, rr, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  drawLabel(ctx, b.label, cx, sy)
}

// ── INTERIOR — themed room per building (procedural rect-based)
const INT_THEME: Record<string, { wall: string; wallDk: string; floor: string; floorAlt: string; accent: string }> = {
  townhall: { wall: "#7a6648", wallDk: "#4a3624", floor: "#c8a26a", floorAlt: "#b8915a", accent: "#3a6ea5" },
  academy:  { wall: "#6e6a82", wallDk: "#3a3848", floor: "#bcb59a", floorAlt: "#a8a088", accent: "#2a8a80" },
  gallery:  { wall: "#7c5a82", wallDk: "#3e2a44", floor: "#d4c8a8", floorAlt: "#c0b294", accent: "#7c5cba" },
  tavern:   { wall: "#7a4a26", wallDk: "#3a2410", floor: "#c2884a", floorAlt: "#a8743a", accent: "#b06d1a" },
  forge:    { wall: "#5e4636", wallDk: "#2e2218", floor: "#8a7058", floorAlt: "#705a44", accent: "#c2531d" },
  wizard:   { wall: "#403a5a", wallDk: "#1e1a30", floor: "#5a5078", floorAlt: "#4a4068", accent: "#6b46c1" },
}

// Furniture layout per building — uses tiny-town tile indices
// References: 44 stone, 45/46/47 wood fence, 29 mushroom, 5/6 bushes, 105 key, 106 sword,
//   117 hammer, 118 anvil, 119 barrel, 84 window, 75 doorTop
type Furn = { c: number; r: number; tile: number }
const INT_FURN: Record<string, Furn[]> = {
  townhall: [
    { c: 2, r: 2, tile: 84 }, { c: 11, r: 2, tile: 84 },    // window banners
    { c: 2, r: 7, tile: 119 }, { c: 11, r: 7, tile: 119 },  // barrels in corners
    { c: 4, r: 3, tile: 88 }, { c: 9, r: 3, tile: 88 },     // wall hangings
    { c: 3, r: 7, tile: 105 }, { c: 10, r: 7, tile: 105 },  // ceremonial keys
  ],
  academy: [
    { c: 2, r: 2, tile: 119 }, { c: 2, r: 3, tile: 119 },   // bookshelves (barrel stand-in)
    { c: 11, r: 2, tile: 119 }, { c: 11, r: 3, tile: 119 },
    { c: 2, r: 7, tile: 84 }, { c: 11, r: 7, tile: 84 },
    { c: 4, r: 4, tile: 117 }, { c: 9, r: 4, tile: 117 },   // tools (hammers)
  ],
  gallery: [
    { c: 2, r: 2, tile: 84 }, { c: 4, r: 2, tile: 88 },     // paintings
    { c: 9, r: 2, tile: 88 }, { c: 11, r: 2, tile: 84 },
    { c: 3, r: 7, tile: 44 }, { c: 10, r: 7, tile: 44 },    // sculpture bases
  ],
  tavern: [
    { c: 2, r: 7, tile: 119 }, { c: 3, r: 7, tile: 119 },   // barrels
    { c: 10, r: 7, tile: 119 }, { c: 11, r: 7, tile: 119 },
    { c: 2, r: 2, tile: 84 }, { c: 11, r: 2, tile: 84 },    // windows
    { c: 5, r: 4, tile: 105 }, { c: 8, r: 4, tile: 105 },   // tankard / props
  ],
  forge: [
    { c: 2, r: 7, tile: 118 }, { c: 11, r: 7, tile: 118 },  // anvils
    { c: 3, r: 7, tile: 117 }, { c: 10, r: 7, tile: 117 },  // hammers
    { c: 2, r: 2, tile: 119 }, { c: 11, r: 2, tile: 119 },  // material crates
    { c: 5, r: 3, tile: 106 }, { c: 8, r: 3, tile: 106 },   // swords on display
  ],
  wizard: [
    { c: 2, r: 7, tile: 119 }, { c: 11, r: 7, tile: 119 },
    { c: 2, r: 2, tile: 88 }, { c: 11, r: 2, tile: 88 },    // arcane symbols
    { c: 5, r: 3, tile: 105 }, { c: 8, r: 3, tile: 105 },   // keys/scrolls
    { c: 6, r: 7, tile: 29 }, { c: 7, r: 7, tile: 29 },     // mushrooms
  ],
}

function drawInterior(ctx: CanvasRenderingContext2D, id: string, tileImg: HTMLImageElement | null, originX: number, originY: number, t: number) {
  const theme = INT_THEME[id] ?? INT_THEME.townhall
  // ── FLOOR — alternating sprite tiles (stone plaza tile 44 + dirt tile 25 alternating bands)
  for (let r = 1; r < INT_H - 1; r++) {
    for (let c = 1; c < INT_W - 1; c++) {
      const px = originX + c * TILE_PX
      const py = originY + r * TILE_PX
      // alternating plank pattern via stone + dirt-centre tiles
      if (tileImg) {
        const useStone = (r + Math.floor(c / 2)) % 2 === 0
        drawTile(ctx, tileImg, useStone ? 44 : 25, px, py)
      } else {
        ctx.fillStyle = (r + c) % 2 === 0 ? theme.floor : theme.floorAlt
        ctx.fillRect(px, py, TILE_PX + 1, TILE_PX + 1)
      }
    }
  }
  // theme wash over floor for accent (subtle)
  ctx.fillStyle = `${theme.accent}10`
  ctx.fillRect(originX + TILE_PX, originY + TILE_PX, (INT_W - 2) * TILE_PX, (INT_H - 2) * TILE_PX)

  // ── WALLS — sprite tiles from tiny-town wall set
  if (tileImg) {
    // top row of walls (north wall) — use roof body tiles as decorative stone wall
    for (let c = 0; c < INT_W; c++) {
      drawTile(ctx, tileImg, 76, originX + c * TILE_PX, originY)
      drawTile(ctx, tileImg, 88, originX + c * TILE_PX, originY + TILE_PX * 0.4)
    }
    // bottom row (south wall) — door gap at INT_EXIT
    for (let c = 0; c < INT_W; c++) {
      const tileIdx = c === INT_EXIT.x ? 89 : (c === 0 ? 76 : c === INT_W - 1 ? 78 : 77)
      drawTile(ctx, tileImg, tileIdx, originX + c * TILE_PX, originY + (INT_H - 1) * TILE_PX)
    }
    // left + right walls
    for (let r = 1; r < INT_H - 1; r++) {
      drawTile(ctx, tileImg, 76, originX, originY + r * TILE_PX)
      drawTile(ctx, tileImg, 78, originX + (INT_W - 1) * TILE_PX, originY + r * TILE_PX)
    }
  } else {
    ctx.fillStyle = theme.wallDk
    ctx.fillRect(originX, originY, INT_PX_W, TILE_PX)
    ctx.fillRect(originX, originY + (INT_H - 1) * TILE_PX, INT_PX_W, TILE_PX)
    ctx.fillRect(originX, originY, TILE_PX, INT_PX_H)
    ctx.fillRect(originX + (INT_W - 1) * TILE_PX, originY, TILE_PX, INT_PX_H)
  }

  // ── FURNITURE — themed sprites placed inside the room
  const furn = INT_FURN[id] ?? []
  if (tileImg) {
    for (const f of furn) {
      drawTile(ctx, tileImg, f.tile, originX + f.c * TILE_PX, originY + f.r * TILE_PX)
    }
  }

  // ── EXIT DOOR LABEL — parchment plate above exit
  {
    const dx = originX + INT_EXIT.x * TILE_PX
    const dy = originY + INT_EXIT.y * TILE_PX
    ctx.font = `${SCALE * 2}px 'Press Start 2P', monospace`
    ctx.textAlign = "center"
    ctx.fillStyle = "#241307"
    ctx.fillRect(dx - 24, dy - 28, TILE_PX + 50, 18)
    ctx.fillStyle = "#ede0bd"
    ctx.fillRect(dx - 22, dy - 26, TILE_PX + 46, 14)
    ctx.fillStyle = "#8a3026"
    ctx.fillText("EXIT", dx + TILE_PX / 2, dy - 15)
    ctx.textAlign = "left"
  }

  // ── PODIUM — central content trigger, themed banner + hovering accent rune
  const px = originX + INT_PODIUM.x * TILE_PX + TILE_PX / 2
  const py = originY + INT_PODIUM.y * TILE_PX + TILE_PX / 2
  // shadow
  ctx.globalAlpha = 0.35
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.ellipse(px, py + 20, 28, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  // pedestal sprite — stone tile stack
  if (tileImg) {
    drawTile(ctx, tileImg, 44, px - TILE_PX / 2, py - TILE_PX / 2)
  }
  // accent halo + hovering rune (kept procedural, it's a magical effect)
  const bob = Math.sin(t * 2.4) * 4
  const glow = ctx.createRadialGradient(px, py - 28 + bob, 1, px, py - 28 + bob, 32)
  glow.addColorStop(0, `${theme.accent}cc`)
  glow.addColorStop(1, `${theme.accent}00`)
  ctx.fillStyle = glow
  ctx.fillRect(px - 32, py - 60 + bob, 64, 64)
  if (tileImg) {
    // hovering item sprite themed per building (key, sword, etc)
    const items: Record<string, number> = {
      townhall: 44, academy: 105, gallery: 88, tavern: 119, forge: 106, wizard: 105,
    }
    const itemIdx = items[id] ?? 105
    drawTile(ctx, tileImg, itemIdx, px - TILE_PX * 0.4, py - 36 + bob)
  }

  // ── DECORATIVE STAGE BANNER above podium ──
  ctx.fillStyle = "#241307"
  ctx.fillRect(px - 56, py - 70, 112, 16)
  ctx.fillStyle = theme.accent
  ctx.fillRect(px - 54, py - 68, 108, 12)
  ctx.font = `${SCALE * 2}px 'Press Start 2P', monospace`
  ctx.textAlign = "center"
  ctx.fillStyle = "#f6e8c8"
  const titles: Record<string, string> = {
    townhall: "ABOUT ME", academy: "EDUCATION", gallery: "PROJECTS",
    tavern: "EXPERIENCE", forge: "SKILLS", wizard: "CONTACT",
  }
  ctx.fillText(titles[id] ?? "VIEW", px, py - 58)
  ctx.textAlign = "left"
}

// Returns true if the px/py position is walkable inside the room.
function isInteriorWalkable(px: number, py: number) {
  const col = Math.floor(px / TILE_PX)
  const row = Math.floor(py / TILE_PX)
  if (col < 1 || col > INT_W - 2) return false
  if (row < 1 || row > INT_H - 1) return false
  if (row === INT_H - 1 && col !== INT_EXIT.x) return false
  return true
}

function isCityWalkable(px: number, py: number) {
  const col = Math.floor(px / TILE_PX)
  const row = Math.floor(py / TILE_PX)
  if (col < 0 || col >= CITY_W || row < 0 || row >= CITY_H) return false
  return CITY_MAP[row][col] === 1
}

// rpg-urban packed sheet: 27 cols × 18 rows, 16px tiles, NO gap
function urb(ctx: CanvasRenderingContext2D, img: HTMLImageElement, idx: number, dx: number, dy: number) {
  const sx = (idx % 27) * 16, sy = Math.floor(idx / 27) * 16
  ctx.drawImage(img, sx, sy, 16, 16, dx, dy, TILE_PX + 1, TILE_PX + 1)
}

// Tile indices into rpg-urban sheet (best-effort mapping from visual catalog)
const URB = {
  GRASS:     0,    // green lawn
  GRASS_DK:  27,   // darker grass border
  SIDEWALK:  6,    // gray paving
  SIDEWALK2: 33,   // gray paving variant
  ASPHALT_C: 87,   // dark center asphalt
  ASPHALT_L: 86,
  ASPHALT_R: 88,
  ASPHALT_T: 60,
  ASPHALT_B: 114,
  LANE_DASH_V: 6 + 27 * 4,   // crosswalk-ish stripe (best guess)
  WALL_RED:  56,
  WALL_RED2: 57,
  WALL_BROWN: 110,
  WALL_BROWN2: 111,
  WALL_BLUE: 53,
  WALL_BLUE2: 54,
  ROOF_RED: 29,
  ROOF_BR:  83,
  TREE_GREEN: 17 + 27 * 9,    // single-tile green tree (top)
  TREE_GREEN_B: 17 + 27 * 10, // base
  TREE_RED: 17 + 27 * 11,
  TREE_RED_B: 17 + 27 * 12,
  LAMP:     0 + 27 * 6,
  STOP_SIGN: 4 + 27 * 6,
  TRAFFIC_RED: 6 + 27 * 14,
  CAR_RED_FRONT:  13 + 27 * 14,
  CAR_RED_BACK:   13 + 27 * 16,
  CAR_BLUE_FRONT: 17 + 27 * 14,
  CAR_BLUE_BACK:  17 + 27 * 16,
  WIN_RED: 56,
  BENCH:   8 + 27 * 11,
}

// CITY RENDER — uses rpg-urban tile sprites where available, procedural fallback if not loaded
function drawCity(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, originX: number, originY: number, t: number) {
  // ── Tile pass: use real urban sheet sprites
  if (img) {
    for (let r = 0; r < CITY_H; r++) {
      for (let c = 0; c < CITY_W; c++) {
        const px = originX + c * TILE_PX
        const py = originY + r * TILE_PX
        const walkable = CITY_MAP[r][c] === 1
        if (walkable) {
          const isEdge =
            (CITY_MAP[r - 1]?.[c] !== 1) ||
            (CITY_MAP[r + 1]?.[c] !== 1) ||
            (CITY_MAP[r]?.[c - 1] !== 1) ||
            (CITY_MAP[r]?.[c + 1] !== 1)
          // ground base = asphalt; sidewalk on street edges
          const baseTile = isEdge ? URB.SIDEWALK : URB.ASPHALT_C
          urb(ctx, img, baseTile, px, py)
          // center lane dashes on main horizontal street
          if (r === 12 && !isEdge && c % 2 === 0) {
            ctx.fillStyle = "#e8c350"
            ctx.fillRect(px + TILE_PX * 0.35, py + TILE_PX * 0.45, TILE_PX * 0.3, 4)
          }
          // vertical street dashes
          if (c === 17 && !isEdge && r % 2 === 0) {
            ctx.fillStyle = "#e8c350"
            ctx.fillRect(px + TILE_PX * 0.45, py + TILE_PX * 0.35, 4, TILE_PX * 0.3)
          }
        } else {
          // building block tile — vary by super-cell so blocks look distinct
          const block = (Math.floor(c / 3) * 7 + Math.floor(r / 3) * 13) % 4
          const wallTiles = [URB.WALL_RED, URB.WALL_BROWN, URB.WALL_BLUE, URB.WALL_RED2]
          urb(ctx, img, wallTiles[block], px, py)
          // windows on top half of each block
          if ((r % 3 === 1) && (c % 2 === 0)) {
            const wx = px + TILE_PX * 0.32
            const wy = py + TILE_PX * 0.28
            const lit = Math.sin(t * 0.6 + r * 1.3 + c * 0.7) > -0.3
            ctx.fillStyle = lit ? "#ffd76a" : "#2a2418"
            ctx.fillRect(wx, wy, TILE_PX * 0.36, TILE_PX * 0.36)
            ctx.fillStyle = "rgba(0,0,0,0.4)"
            ctx.fillRect(wx - 1, wy - 1, TILE_PX * 0.36 + 2, 1)
            ctx.fillRect(wx + TILE_PX * 0.18 - 1, wy, 1, TILE_PX * 0.36)
          }
        }
      }
    }
  } else {
    // image not loaded — flat fallback so map is still visible
    ctx.fillStyle = "#1a1a20"
    ctx.fillRect(originX, originY, CITY_PX_W, CITY_PX_H)
  }

  // STREETLAMPS — at sidewalk corners along main streets
  const lampSpots = [
    [5, 9], [12, 9], [22, 9], [30, 9],
    [5, 15], [12, 15], [22, 15], [30, 15],
    [14, 6], [21, 6], [14, 18], [21, 18],
  ]
  for (const [c, r] of lampSpots) {
    const lx = originX + c * TILE_PX + TILE_PX / 2
    const ly = originY + r * TILE_PX + TILE_PX / 2
    if (img) {
      urb(ctx, img, URB.LAMP, originX + c * TILE_PX, originY + r * TILE_PX - TILE_PX)
    }
    // warm glow halo
    const g2 = ctx.createRadialGradient(lx, ly - 16, 1, lx, ly - 16, 44)
    g2.addColorStop(0, "rgba(255, 220, 130, 0.7)")
    g2.addColorStop(0.5, "rgba(255, 180, 60, 0.25)")
    g2.addColorStop(1, "rgba(255, 160, 40, 0)")
    ctx.fillStyle = g2
    ctx.fillRect(lx - 44, ly - 60, 88, 88)
  }

  // STREET TREES along sidewalks
  if (img) {
    const treeSpots = [
      [3, 4], [8, 4], [13, 4], [21, 4], [26, 4], [32, 4],
      [3, 20], [8, 20], [13, 20], [21, 20], [26, 20], [32, 20],
      [3, 8], [3, 16], [32, 8], [32, 16],
    ]
    for (const [c, r] of treeSpots) {
      if (CITY_MAP[r]?.[c] === 0) continue   // tree must sit on walkable area
      const tx = originX + c * TILE_PX
      const ty = originY + r * TILE_PX
      urb(ctx, img, URB.TREE_GREEN, tx, ty - TILE_PX)
      urb(ctx, img, URB.TREE_GREEN_B, tx, ty)
    }
  }

  // CARS — real urban vehicle sprites drifting along main horizontal street
  if (img) {
    for (let i = 0; i < 4; i++) {
      const speed = 30 + i * 8
      const startX = (t * speed + i * 200) % (CITY_W * TILE_PX + 100) - 60
      const cx = originX + startX
      const cy = originY + 12 * TILE_PX + (i % 2 === 0 ? 0 : TILE_PX)
      const carTiles = i % 2 === 0
        ? [URB.CAR_RED_FRONT, URB.CAR_BLUE_FRONT]
        : [URB.CAR_RED_BACK, URB.CAR_BLUE_BACK]
      const front = carTiles[i % 2]
      urb(ctx, img, front, cx, cy)
      urb(ctx, img, front + 27, cx, cy + TILE_PX)
    }
  }

  // GATE arch — north side, return-to-village (use brick wall tile + label)
  if (img) {
    const gx = originX + CITY_GATE_OUT.x * TILE_PX
    const gy = originY + CITY_GATE_OUT.y * TILE_PX
    // arch crossbeam
    for (let dc = -1; dc <= 1; dc++) {
      urb(ctx, img, URB.WALL_BROWN, gx + dc * TILE_PX, gy - TILE_PX)
    }
  }
  // label above gate
  {
    const gx = originX + CITY_GATE_OUT.x * TILE_PX
    const gy = originY + CITY_GATE_OUT.y * TILE_PX
    ctx.font = `${SCALE * 2}px 'Press Start 2P', monospace`
    ctx.textAlign = "center"
    ctx.fillStyle = "rgba(0,0,0,0.75)"
    ctx.fillRect(gx - 30, gy - TILE_PX - 22, TILE_PX + 60, 16)
    ctx.fillStyle = "#ffd76a"
    ctx.fillText("← VILLAGE", gx + TILE_PX / 2, gy - TILE_PX - 10)
    ctx.textAlign = "left"
  }
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tileImgRef = useRef<HTMLImageElement | null>(null)
  const charImgRef = useRef<HTMLImageElement | null>(null)
  const tdImgRef = useRef<HTMLImageElement | null>(null)
  const rgImgRef = useRef<HTMLImageElement | null>(null)
  const urbanImgRef = useRef<HTMLImageElement | null>(null)
  const animFrameIdRef = useRef<number>(0)

  const gameRef = useRef({
    player: { ...PLAYER_START },
    facing: "down" as "up" | "down" | "left" | "right",
    moving: false,
    animT: 0,
    stepT: 0,
    keys: {} as Record<string, boolean>,
    camera: { x: 0, y: 0 },
    nearBuilding: null as string | null,
    lastTime: 0,
    // Scene state — overworld vs inside a building vs city
    scene: "world" as "world" | "interior" | "city",
    interiorId: null as string | null,
    interiorReturn: { x: 0, y: 0, facing: "down" as "up" | "down" | "left" | "right" },
    interiorPrompt: null as "podium" | "exit" | null,
    cityReturn: { x: 0, y: 0, facing: "down" as "up" | "down" | "left" | "right" },
    nearGate: null as "to_city" | "to_village" | null,
    npcs: [] as NpcRuntime[],
    monsters: [] as Monster[],
    projectiles: [] as Projectile[],
    hp: 10,
    maxHp: 10,
    kills: 0,
    attackT: 0,
    attackCd: 0,
    hurtT: 0,
    spawnT: 3,
    deadT: 0,
    combat: false,
  })

  const { phase, openBuilding, activeBuilding } = useGameStore()
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches)
  }, [])

  // Seed NPC runtime from static NPCS list
  useEffect(() => {
    const g = gameRef.current
    if (g.npcs.length > 0) return
    g.npcs = NPCS.map((n) => ({
      x: (n.x + 0.5) * TILE_PX,
      y: (n.y + 1) * TILE_PX,
      homeX: (n.x + 0.5) * TILE_PX,
      homeY: (n.y + 1) * TILE_PX,
      tile: n.tile,
      facing: "down" as const,
      animT: 0,
      tx: null, ty: null,
      idleT: Math.random() * 1.5,
      speed: 28 + Math.random() * 14,
    }))
  }, [])

  // Load tileset + character sheet
  useEffect(() => {
    const img = new Image()
    img.src = "/assets/tiny-town/Tilemap/tilemap.png"
    img.onload = () => { tileImgRef.current = img }
    const ch = new Image()
    ch.src = "/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png"
    ch.onload = () => { charImgRef.current = ch }
    const td = new Image()
    td.src = "/assets/tiny-dungeon/Tilemap/tilemap.png"
    td.onload = () => { tdImgRef.current = td }
    const rg = new Image()
    rg.src = "/assets/roguelike/Spritesheet/roguelikeSheet_transparent.png"
    rg.onload = () => { rgImgRef.current = rg }
    const ur = new Image()
    ur.src = "/assets/rpg-urban/Tilemap/tilemap_packed.png"
    ur.onload = () => { urbanImgRef.current = ur }
  }, [])

  // Input
  useEffect(() => {
    const enterInterior = (id: string) => {
      const g = gameRef.current
      g.interiorReturn = { x: g.player.x, y: g.player.y, facing: g.facing }
      g.scene = "interior"
      g.interiorId = id
      g.player.x = INT_EXIT.x * TILE_PX + TILE_PX / 2
      g.player.y = (INT_EXIT.y - 1) * TILE_PX + TILE_PX * 0.7
      g.facing = "up"
      g.animT = 0
      g.combat = false
      g.monsters = []
      g.projectiles = []
      g.nearBuilding = null
      playSound("open")
    }
    const exitInterior = () => {
      const g = gameRef.current
      g.scene = "world"
      g.interiorId = null
      g.player.x = g.interiorReturn.x
      g.player.y = g.interiorReturn.y
      g.facing = g.interiorReturn.facing
      g.animT = 0
      g.interiorPrompt = null
      playSound("close")
    }
    const enterCity = () => {
      const g = gameRef.current
      g.cityReturn = { x: g.player.x, y: g.player.y, facing: g.facing }
      g.scene = "city"
      // spawn just south of city gate, facing into the city
      g.player.x = CITY_GATE_OUT.x * TILE_PX + TILE_PX / 2
      g.player.y = (CITY_GATE_OUT.y + 1) * TILE_PX + TILE_PX / 2
      g.facing = "down"
      g.animT = 0
      g.combat = false
      g.monsters = []
      g.projectiles = []
      g.nearGate = null
      g.nearBuilding = null
      playSound("open")
    }
    const exitCity = () => {
      const g = gameRef.current
      g.scene = "world"
      g.player.x = g.cityReturn.x
      g.player.y = g.cityReturn.y
      g.facing = g.cityReturn.facing
      g.animT = 0
      g.nearGate = null
      playSound("close")
    }
    const onKeyDown = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key.toLowerCase()] = true
      const g = gameRef.current
      if (e.key === "e" || e.key === "E") {
        if (g.scene === "world") {
          if (g.nearGate === "to_city") { enterCity(); return }
          if (g.nearBuilding) {
            if (g.nearBuilding === "cave") {
              openBuilding(g.nearBuilding as any)
              playSound("open")
            } else {
              enterInterior(g.nearBuilding)
            }
          }
        } else if (g.scene === "interior") {
          if (g.interiorPrompt === "podium" && g.interiorId) {
            openBuilding(g.interiorId as any)
            playSound("open")
          } else if (g.interiorPrompt === "exit") {
            exitInterior()
          }
        } else if (g.scene === "city") {
          if (g.nearGate === "to_village") exitCity()
        }
      }
      if (e.key === " ") e.preventDefault() // space = attack, don't scroll
      if (e.key === "t" || e.key === "T") {
        g.combat = !g.combat
        if (!g.combat) { g.monsters = []; g.projectiles = [] }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key.toLowerCase()] = false
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [openBuilding])

  const isWalkable = useCallback((px: number, py: number) => {
    const col = Math.floor(px / TILE_PX)
    const row = Math.floor(py / TILE_PX)
    if (col < 0 || col >= WORLD_W || row < 0 || row >= WORLD_H) return false
    if (!WALKABLE.has(WORLD_MAP[row][col])) return false
    // Check building collisions (except door area)
    for (const b of BUILDINGS) {
      const bx1 = b.x * TILE_PX + 4
      const bx2 = (b.x + b.w) * TILE_PX - 4
      const by1 = b.y * TILE_PX + 4
      const by2 = (b.y + b.h) * TILE_PX - 4
      const isDoor = col === b.doorX && row === b.doorY
      if (!isDoor && px > bx1 && px < bx2 && py > by1 && py < by2) return false
    }
    return true
  }, [])

  // Main game loop
  useEffect(() => {
    if (phase !== "playing") return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    ctx.imageSmoothingEnabled = false

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const loop = (time: number) => {
      if (phase !== "playing") return
      const g = gameRef.current
      const dt = Math.min((time - g.lastTime) / 1000, 0.05)
      g.lastTime = time

      // Movement
      const { keys } = g
      let dx = 0, dy = 0
      if (keys["arrowleft"]  || keys["a"]) { dx = -1; g.facing = "left" }
      if (keys["arrowright"] || keys["d"]) { dx =  1; g.facing = "right" }
      if (keys["arrowup"]    || keys["w"]) { dy = -1; g.facing = "up" }
      if (keys["arrowdown"]  || keys["s"]) { dy =  1; g.facing = "down" }

      g.moving = (dx !== 0 || dy !== 0) && g.deadT <= 0

      if (g.moving) {
        const len = Math.sqrt(dx * dx + dy * dy)
        dx = (dx / len) * PLAYER_SPEED * dt
        dy = (dy / len) * PLAYER_SPEED * dt

        const nx = g.player.x + dx
        const ny = g.player.y + dy
        const pad = 12

        const walkCheck =
          g.scene === "interior" ? isInteriorWalkable :
          g.scene === "city"     ? isCityWalkable     :
                                   isWalkable
        if (walkCheck(nx + pad, g.player.y) && walkCheck(nx - pad, g.player.y)) g.player.x = nx
        if (walkCheck(g.player.x, ny + pad) && walkCheck(g.player.x, ny - pad)) g.player.y = ny

        g.animT += dt
        g.stepT += dt
        if (g.stepT >= STEP_INTERVAL) { g.stepT = 0; playSound("step") }
      } else {
        g.animT = 0
      }

      // Interior prompt detection — podium vs exit
      if (g.scene === "interior") {
        const pcol = Math.floor(g.player.x / TILE_PX)
        const prow = Math.floor(g.player.y / TILE_PX)
        if (pcol === INT_PODIUM.x && prow === INT_PODIUM.y) g.interiorPrompt = "podium"
        else if (pcol === INT_EXIT.x && prow === INT_EXIT.y) g.interiorPrompt = "exit"
        else g.interiorPrompt = null
      }

      // ── NPCs wander (skip while inside a building) ──
      const WANDER_R = TILE_PX * 4
      if (g.scene === "world") for (const n of g.npcs) {
        if (n.idleT > 0) { n.idleT -= dt; n.animT = 0; continue }
        if (n.tx === null || n.ty === null) {
          let picked = false
          for (let tries = 0; tries < 14; tries++) {
            const ang = Math.random() * Math.PI * 2
            const r   = TILE_PX + Math.random() * WANDER_R
            const tx = n.homeX + Math.cos(ang) * r
            const ty = n.homeY + Math.sin(ang) * r
            if (isWalkable(tx, ty)) { n.tx = tx; n.ty = ty; picked = true; break }
          }
          if (!picked) { n.idleT = 1 + Math.random(); continue }
        }
        const ddx = (n.tx as number) - n.x
        const ddy = (n.ty as number) - n.y
        const d = Math.hypot(ddx, ddy)
        if (d < 4) {
          n.tx = null; n.ty = null
          n.idleT = 1 + Math.random() * 2.5
          n.animT = 0
          continue
        }
        const stepDist = n.speed * dt
        const nx = n.x + (ddx / d) * stepDist
        const ny = n.y + (ddy / d) * stepDist
        // avoid overlapping player
        const dpx = nx - g.player.x, dpy = ny - g.player.y
        if (Math.hypot(dpx, dpy) < 28) {
          n.tx = null; n.ty = null; n.idleT = 0.4 + Math.random() * 0.6
          continue
        }
        if (isWalkable(nx, ny)) {
          n.x = nx; n.y = ny
          n.facing = Math.abs(ddx) > Math.abs(ddy)
            ? (ddx < 0 ? "left" : "right")
            : (ddy < 0 ? "up" : "down")
          n.animT += dt
        } else {
          n.tx = null; n.ty = null; n.idleT = 0.4
        }
      }

      // ── Combat (world only) ──
      const wpn = currentWeapon(g.kills)
      if (g.scene === "world" && g.deadT > 0) {
        g.deadT -= dt
        if (g.deadT <= 0) {
          g.player.x = PLAYER_START.x; g.player.y = PLAYER_START.y
          g.hp = g.maxHp; g.monsters = []; g.projectiles = []; g.hurtT = 0
        }
      } else if (g.scene === "world") {
        g.attackT  = Math.max(0, g.attackT - dt)
        g.attackCd = Math.max(0, g.attackCd - dt)
        g.hurtT    = Math.max(0, g.hurtT - dt)

        // spawn (only while fight mode is on)
        g.spawnT -= dt
        if (g.combat && g.spawnT <= 0 && g.monsters.length < 9) {
          g.spawnT = 2.4
          const roll = Math.random()
          let type = "slime"
          if (g.kills > 12 && roll < 0.32) type = "skeleton"
          else if (g.kills > 6 && roll < 0.5) type = "ghost"
          else if (roll < 0.45) type = "spider"
          for (let tries = 0; tries < 24; tries++) {
            const ang = Math.random() * Math.PI * 2
            const dist = (7 + Math.random() * 6) * TILE_PX
            const mx = g.player.x + Math.cos(ang) * dist
            const my = g.player.y + Math.sin(ang) * dist
            if (isWalkable(mx, my)) {
              const mt = MONSTER_TYPES[type]
              g.monsters.push({
                x: mx, y: my, type, hp: mt.hp, maxHp: mt.hp, hurt: 0,
                facing: "down", animT: 0,
                wTx: null, wTy: null, wIdle: Math.random() * 1.2,
              })
              break
            }
          }
        }

        // attack
        if (g.keys[" "] && g.attackCd <= 0) {
          g.attackCd = wpn.ranged ? 0.34 : 0.42
          g.attackT = 0.25
          playSound("open")
          const fv = g.facing
          const fx = fv === "left" ? -1 : fv === "right" ? 1 : 0
          const fy = fv === "up" ? -1 : fv === "down" ? 1 : 0
          if (wpn.ranged) {
            g.projectiles.push({ x: g.player.x, y: g.player.y - 18, vx: fx * 340, vy: fy * 340, life: 1.1 })
          } else {
            const ax = g.player.x + fx * wpn.range * 0.6
            const ay = g.player.y - 16 + fy * wpn.range * 0.6
            for (const m of g.monsters) {
              if (Math.hypot(m.x - ax, m.y - ay) < wpn.range) {
                m.hp -= wpn.dmg; m.hurt = 0.18
                const kx = m.x - g.player.x, ky = m.y - g.player.y
                const kl = Math.hypot(kx, ky) || 1
                m.x += (kx / kl) * 18; m.y += (ky / kl) * 18
              }
            }
          }
        }

        // projectiles
        for (const p of g.projectiles) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt
          for (const m of g.monsters) {
            if (m.hp > 0 && Math.hypot(m.x - p.x, m.y - p.y) < 24) {
              m.hp -= wpn.dmg; m.hurt = 0.18; p.life = 0; break
            }
          }
        }
        g.projectiles = g.projectiles.filter((p) => p.life > 0)

        // monster AI — wander when far, chase when close
        const AGGRO = TILE_PX * 7
        for (const m of g.monsters) {
          m.hurt = Math.max(0, m.hurt - dt)
          const mt = MONSTER_TYPES[m.type]
          const mdx = g.player.x - m.x, mdy = g.player.y - m.y
          const ml = Math.hypot(mdx, mdy) || 1

          let vx = 0, vy = 0
          let moved = false

          if (ml < AGGRO || m.hurt > 0) {
            // CHASE
            const step = mt.speed * dt
            vx = (mdx / ml) * step
            vy = (mdy / ml) * step
            const nmx = m.x + vx, nmy = m.y + vy
            if (isWalkable(nmx, m.y)) { m.x = nmx; moved = true }
            if (isWalkable(m.x, nmy)) { m.y = nmy; moved = true }
            m.wTx = null; m.wTy = null
          } else {
            // WANDER
            if (m.wIdle > 0) { m.wIdle -= dt }
            else {
              if (m.wTx === null || m.wTy === null) {
                for (let t = 0; t < 10; t++) {
                  const ang = Math.random() * Math.PI * 2
                  const r = TILE_PX * (2 + Math.random() * 3)
                  const tx = m.x + Math.cos(ang) * r
                  const ty = m.y + Math.sin(ang) * r
                  if (isWalkable(tx, ty)) { m.wTx = tx; m.wTy = ty; break }
                }
                if (m.wTx === null) { m.wIdle = 0.8 + Math.random() }
              } else {
                const wdx = m.wTx - m.x, wdy = m.wTy - m.y
                const wd = Math.hypot(wdx, wdy)
                if (wd < 4) {
                  m.wTx = null; m.wTy = null
                  m.wIdle = 0.6 + Math.random() * 1.6
                } else {
                  const ws = mt.speed * 0.45 * dt
                  vx = (wdx / wd) * ws
                  vy = (wdy / wd) * ws
                  const nmx = m.x + vx, nmy = m.y + vy
                  if (isWalkable(nmx, nmy)) { m.x = nmx; m.y = nmy; moved = true }
                  else { m.wTx = null; m.wTy = null; m.wIdle = 0.4 }
                }
              }
            }
          }

          if (moved) {
            m.facing = Math.abs(vx) > Math.abs(vy)
              ? (vx < 0 ? "left" : "right")
              : (vy < 0 ? "up" : "down")
            m.animT += dt
          } else {
            m.animT = 0
          }

          if (ml < 28 && g.hurtT <= 0) {
            g.hp -= mt.dmg
            g.hurtT = 0.9
            playSound("close")
            if (g.hp <= 0) { g.hp = 0; g.deadT = 2.6 }
          }
        }

        // resolve kills
        g.monsters = g.monsters.filter((m) => {
          if (m.hp <= 0) { g.kills += 1; return false }
          return true
        })
      }

      // Camera with lerp — in interior, snap; in city, follow player
      let camX: number, camY: number
      if (g.scene === "interior") {
        camX = Math.round(INT_PX_W / 2 - canvas.width / 2)
        camY = Math.round(INT_PX_H / 2 - canvas.height / 2)
        g.camera.x = camX; g.camera.y = camY
      } else {
        const targetCamX = g.player.x - canvas.width / 2
        const targetCamY = g.player.y - canvas.height / 2
        g.camera.x += (targetCamX - g.camera.x) * 0.12
        g.camera.y += (targetCamY - g.camera.y) * 0.12
        camX = Math.round(g.camera.x)
        camY = Math.round(g.camera.y)
      }

      // Check nearby building (world only) + gate proximity
      g.nearBuilding = null
      g.nearGate = null
      if (g.scene === "world") {
        for (const b of BUILDINGS) {
          const doorPx = (b.doorX + 0.5) * TILE_PX
          const doorPy = (b.doorY + 0.5) * TILE_PX
          const dist = Math.hypot(g.player.x - doorPx, g.player.y - doorPy)
          if (dist < INTERACT_DIST) { g.nearBuilding = b.id; break }
        }
        const gateX = (VILLAGE_GATE.x + 0.5) * TILE_PX
        const gateY = (VILLAGE_GATE.y + 0.5) * TILE_PX
        if (Math.hypot(g.player.x - gateX, g.player.y - gateY) < INTERACT_DIST) {
          g.nearGate = "to_city"
        }
      } else if (g.scene === "city") {
        const gateX = (CITY_GATE_OUT.x + 0.5) * TILE_PX
        const gateY = (CITY_GATE_OUT.y + 0.5) * TILE_PX
        if (Math.hypot(g.player.x - gateX, g.player.y - gateY) < INTERACT_DIST) {
          g.nearGate = "to_village"
        }
      }

      // ── CITY RENDER ──
      if (g.scene === "city") {
        ctx.fillStyle = "#0a0d12"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        drawCity(ctx, urbanImgRef.current, -camX, -camY, performance.now() / 1000)
        // player on top
        const psx = g.player.x - camX, psy = g.player.y - camY
        drawPlayer(ctx, charImgRef.current, psx, psy, g.facing, g.moving ? g.animT : 0)
        // gate prompt
        if (g.nearGate === "to_village") {
          const txt = "[E] RETURN TO VILLAGE"
          ctx.font = `${SCALE * 3}px 'Press Start 2P', monospace`
          const tw = ctx.measureText(txt).width
          const pw = tw + 26, ph = SCALE * 3 + 16
          const ppx = Math.round(psx - pw / 2)
          const ppy = Math.round(psy - TILE_PX * 1.6 - ph)
          ctx.fillStyle = "#241307"; ctx.fillRect(ppx - 2, ppy - 2, pw + 4, ph + 4)
          ctx.fillStyle = "#ede0bd"; ctx.fillRect(ppx, ppy, pw, ph)
          ctx.fillStyle = "#8a5a2c"; ctx.fillRect(ppx, ppy, pw, 3); ctx.fillRect(ppx, ppy + ph - 3, pw, 3)
          ctx.textAlign = "center"
          ctx.fillStyle = "#8a3026"
          ctx.fillText(txt, psx, ppy + ph - 9)
          ctx.textAlign = "left"
        }
        animFrameIdRef.current = requestAnimationFrame(loop)
        return
      }

      // ── INTERIOR RENDER ──
      if (g.scene === "interior") {
        // dim ambient backdrop
        ctx.fillStyle = "#0a0708"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const ox = -camX, oy = -camY
        drawInterior(ctx, g.interiorId ?? "townhall", tileImgRef.current, ox, oy, performance.now() / 1000)
        // player on top
        const psx = g.player.x - camX, psy = g.player.y - camY
        drawPlayer(ctx, charImgRef.current, psx, psy, g.facing, g.moving ? g.animT : 0)
        // interior prompt — parchment plate above player
        if (g.interiorPrompt) {
          const txt = g.interiorPrompt === "exit" ? "[E] EXIT" : "[E] VIEW"
          ctx.font = `${SCALE * 3}px 'Press Start 2P', monospace`
          const tw = ctx.measureText(txt).width
          const pw = tw + 26, ph = SCALE * 3 + 16
          const px = Math.round(psx - pw / 2)
          const py = Math.round(psy - TILE_PX * 1.6 - ph)
          ctx.fillStyle = "#241307"; ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4)
          ctx.fillStyle = "#ede0bd"; ctx.fillRect(px, py, pw, ph)
          ctx.fillStyle = "#8a5a2c"; ctx.fillRect(px, py, pw, 3); ctx.fillRect(px, py + ph - 3, pw, 3)
          ctx.textAlign = "center"
          ctx.fillStyle = "#8a3026"
          ctx.fillText(txt, psx, py + ph - 9)
          ctx.textAlign = "left"
        }
        // skip world render + HUD's combat panel below — request next frame
        animFrameIdRef.current = requestAnimationFrame(loop)
        return
      }

      // Render — flat grass base (kills tile-seam grid, 1 fillRect vs ~1000 drawImage)
      ctx.fillStyle = "#84c669"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw tiles — covers the full viewport (out-of-world = forest, no black edges)
      const startCol = Math.floor(camX / TILE_PX) - 1
      const endCol   = Math.ceil((camX + canvas.width)  / TILE_PX) + 1
      const startRow = Math.floor(camY / TILE_PX) - 1
      const endRow   = Math.ceil((camY + canvas.height) / TILE_PX) + 1

      const tImg = tileImgRef.current
      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const dx = col * TILE_PX - camX
          const dy = row * TILE_PX - camY
          const oob = row < 0 || row >= WORLD_H || col < 0 || col >= WORLD_W
          const type = oob ? T.WATER : WORLD_MAP[row][col]

          if (!tImg) continue // flat grass already filled

          // Out-of-world + border → continuous dense forest
          if (oob || type === T.WATER) {
            const fv = rand(col * 53 + row * 131)
            const enoughHead = dy >= TILE_PX  // room for canopy above
            if (fv < 0.62 && enoughHead) {
              drawTile(ctx, tImg, 4, dx, dy - TILE_PX)
              drawTile(ctx, tImg, 16, dx, dy)
            } else if (fv < 0.62) {
              // canopy would clip — use single-tile bush instead
              drawTile(ctx, tImg, 28, dx, dy)
            } else if (fv < 0.78) drawTile(ctx, tImg, 5, dx, dy)
            else if (fv < 0.84) drawTile(ctx, tImg, 6, dx, dy)
            else if (fv < 0.88) drawTile(ctx, tImg, 29, dx, dy)  // mushroom
            continue
          }

          if (type === T.POND) {
            // pond — autotiled water from the Roguelike RPG sheet (57-col)
            const rg = rgImgRef.current
            if (rg) {
              const isW = (r: number, c: number) =>
                r >= 0 && r < WORLD_H && c >= 0 && c < WORLD_W &&
                (WORLD_MAP[r][c] === T.POND || WORLD_MAP[r][c] === T.BRIDGE)
              const wr = !isW(row - 1, col) ? 0 : !isW(row + 1, col) ? 2 : 1
              const wc = !isW(row, col - 1) ? 0 : !isW(row, col + 1) ? 2 : 1
              const pidx = 2 + wr * 57 + wc
              ctx.drawImage(rg, (pidx % 57) * 17, Math.floor(pidx / 57) * 17, 16, 16, dx, dy, TILE_PX + 1, TILE_PX + 1)
            }
          } else if (type === T.BRIDGE) {
            // water underneath
            const rg = rgImgRef.current
            if (rg) {
              const isW = (r: number, c: number) =>
                r >= 0 && r < WORLD_H && c >= 0 && c < WORLD_W &&
                (WORLD_MAP[r][c] === T.POND || WORLD_MAP[r][c] === T.BRIDGE)
              const wr = !isW(row - 1, col) ? 0 : !isW(row + 1, col) ? 2 : 1
              const wc = !isW(row, col - 1) ? 0 : !isW(row, col + 1) ? 2 : 1
              const pidx = 2 + wr * 57 + wc
              ctx.drawImage(rg, (pidx % 57) * 17, Math.floor(pidx / 57) * 17, 16, 16, dx, dy, TILE_PX + 1, TILE_PX + 1)
            }
            // wooden plank deck
            ctx.fillStyle = "#7a4a22"
            ctx.fillRect(dx, dy + 2, TILE_PX + 1, TILE_PX - 4)
            ctx.fillStyle = "#5e3618"
            for (let i = 0; i < 4; i++) {
              const py = dy + 4 + i * (TILE_PX / 4)
              ctx.fillRect(dx, Math.floor(py), TILE_PX + 1, 2)
            }
            // rail beams
            ctx.fillStyle = "#3a2410"
            ctx.fillRect(dx, dy + 1, TILE_PX + 1, 2)
            ctx.fillRect(dx, dy + TILE_PX - 3, TILE_PX + 1, 2)
          } else if (type === T.PATH || type === T.STONE || type === T.SAND) {
            // dirt — autotiled against grass so it has soft rounded edges
            const isDirt = (r: number, c: number) => {
              if (r < 0 || r >= WORLD_H || c < 0 || c >= WORLD_W) return false
              const tt = WORLD_MAP[r][c]
              return tt === T.PATH || tt === T.STONE || tt === T.SAND
            }
            const drow = !isDirt(row - 1, col) ? 0 : !isDirt(row + 1, col) ? 2 : 1
            const dcol = !isDirt(row, col - 1) ? 0 : !isDirt(row, col + 1) ? 2 : 1
            drawTile(ctx, tImg, 12 + drow * 12 + dcol, dx, dy)
          } else if (type === T.FLOWER) {
            drawTile(ctx, tImg, 43, dx, dy)
          } else if (type === T.MUSHROOM) {
            drawTile(ctx, tImg, 29, dx, dy)  // red mushrooms
          } else if (type === T.BUSH) {
            drawTile(ctx, tImg, 5, dx, dy)  // small bush
          } else {
            // grass — flat fill already shows; sparse detail tufts only
            const v = rand(row * 100 + col)
            if (v < 0.08) drawTile(ctx, tImg, v < 0.05 ? 1 : 2, dx, dy)
          }
        }
      }

      // Y-sorted pass: trees + buildings + NPCs + monsters + player so taller
      // sprites in front correctly occlude things behind, never get sliced.
      type SortItem =
        | { kind: "tree"; sortY: number; row: number; col: number }
        | { kind: "building"; sortY: number; b: typeof BUILDINGS[0] }
        | { kind: "npc"; sortY: number; n: NpcRuntime }
        | { kind: "monster"; sortY: number; m: Monster }
        | { kind: "player"; sortY: number }
      const items: SortItem[] = []

      if (tImg) {
        for (let row = Math.max(0, startRow - 1); row < Math.min(WORLD_H, endRow + 1); row++) {
          for (let col = Math.max(0, startCol - 1); col < Math.min(WORLD_W, endCol + 1); col++) {
            if (WORLD_MAP[row][col] === T.TREE) {
              items.push({ kind: "tree", sortY: (row + 1) * TILE_PX, row, col })
            }
          }
        }
      }
      for (const b of BUILDINGS) {
        const screenX = b.x * TILE_PX - camX
        const screenX2 = (b.x + b.w) * TILE_PX - camX
        if (screenX2 < -TILE_PX * 2 || screenX > canvas.width + TILE_PX * 2) continue
        items.push({ kind: "building", sortY: (b.y + b.h) * TILE_PX, b })
      }
      for (const n of g.npcs) {
        if (n.x - camX < -TILE_PX * 2 || n.x - camX > canvas.width + TILE_PX * 2) continue
        if (n.y - camY < -TILE_PX * 2 || n.y - camY > canvas.height + TILE_PX * 2) continue
        items.push({ kind: "npc", sortY: n.y, n })
      }
      for (const m of g.monsters) {
        if (m.x - camX < -64 || m.x - camX > canvas.width + 64) continue
        if (m.y - camY < -64 || m.y - camY > canvas.height + 64) continue
        items.push({ kind: "monster", sortY: m.y, m })
      }
      items.push({ kind: "player", sortY: g.player.y })

      items.sort((a, b) => a.sortY - b.sortY)

      const npcImg = charImgRef.current
      const tdImgY = tdImgRef.current
      for (const it of items) {
        if (it.kind === "tree") {
          drawTree(ctx, tImg!, it.col * TILE_PX - camX, it.row * TILE_PX - camY, it.row * 977 + it.col * 131)
        } else if (it.kind === "building") {
          drawBuilding(ctx, it.b, camX, camY, tImg, it.b.id !== "cave" || g.nearBuilding === "cave")
        } else if (it.kind === "npc" && npcImg) {
          drawNpc(ctx, npcImg, it.n.x - camX, it.n.y - camY, it.n.tile, it.n.facing, it.n.animT)
        } else if (it.kind === "monster" && tdImgY) {
          const mt = MONSTER_TYPES[it.m.type]
          drawMonster(ctx, tdImgY, it.m.x - camX, it.m.y - camY, mt.tile, it.m.hp / it.m.maxHp, it.m.hurt, it.m.facing, it.m.animT)
        } else if (it.kind === "player") {
          const psx = g.player.x - camX, psy = g.player.y - camY
          if (g.hurtT > 0.55) ctx.globalAlpha = 0.5
          drawPlayer(ctx, charImgRef.current, psx, psy, g.facing, g.moving ? g.animT : 0)
          ctx.globalAlpha = 1
        }
      }

      // Projectiles draw on top of Y-sorted layer
      const tdImg = tdImgRef.current
      if (tdImg) {
        const [psx, psy] = tsrc(105)
        for (const p of g.projectiles) {
          ctx.drawImage(tdImg, psx, psy, 16, 16, p.x - camX - 12, p.y - camY - 12, 24, 24)
        }
      }

      const playerScreenX = g.player.x - camX
      const playerScreenY = g.player.y - camY

      // Weapon swing
      if (g.attackT > 0 && tdImg) {
        const prog = 1 - g.attackT / 0.25
        const fv = g.facing
        const reach = 24
        const ox = (fv === "left" ? -1 : fv === "right" ? 1 : 0) * reach
        const oy = (fv === "up" ? -1 : fv === "down" ? 1 : 0) * reach - 16
        const [wsx, wsy] = tsrc(wpn.tile)
        ctx.save()
        ctx.translate(playerScreenX + ox, playerScreenY + oy)
        ctx.rotate((fv === "left" ? -1 : 1) * (prog - 0.5) * 1.7)
        ctx.drawImage(tdImg, wsx, wsy, 16, 16, -14, -14, 28, 28)
        ctx.restore()
      }

      // City gate marker in village world — visible signpost arrow at VILLAGE_GATE
      {
        const vgx = VILLAGE_GATE.x * TILE_PX + TILE_PX / 2 - camX
        const vgy = VILLAGE_GATE.y * TILE_PX + TILE_PX - camY
        if (vgx > -64 && vgx < canvas.width + 64 && vgy > -64 && vgy < canvas.height + 64) {
          // signpost
          ctx.fillStyle = "#3a2410"
          ctx.fillRect(vgx - 2, vgy - 28, 4, 28)
          ctx.fillStyle = "#7a4a26"
          ctx.fillRect(vgx - 22, vgy - 32, 44, 18)
          ctx.fillStyle = "#5e3a18"
          ctx.fillRect(vgx - 22, vgy - 32, 44, 3)
          ctx.fillRect(vgx - 22, vgy - 17, 44, 3)
          ctx.font = `7px 'Press Start 2P', monospace`
          ctx.textAlign = "center"
          ctx.fillStyle = "#000"
          ctx.fillText("→ CITY", vgx + 1, vgy - 19)
          ctx.fillStyle = "#f6e8c8"
          ctx.fillText("→ CITY", vgx, vgy - 20)
          ctx.textAlign = "left"
          // soft glow when nearby
          if (g.nearGate === "to_city") {
            const glow = ctx.createRadialGradient(vgx, vgy - 14, 1, vgx, vgy - 14, 40)
            glow.addColorStop(0, "rgba(255, 220, 130, 0.5)")
            glow.addColorStop(1, "rgba(255, 200, 80, 0)")
            ctx.fillStyle = glow
            ctx.fillRect(vgx - 40, vgy - 54, 80, 80)
          }
        }
      }

      // Interaction prompt — parchment plate, auto-sized to text
      const promptTxt = g.nearGate === "to_city"
        ? "[E] TRAVEL TO CITY"
        : g.nearBuilding
          ? `[E] ENTER ${BUILDINGS.find((b) => b.id === g.nearBuilding)?.label ?? ""}`
          : null
      if (promptTxt) {
        ctx.font = `${SCALE * 3}px 'Press Start 2P', monospace`
        const tw = ctx.measureText(promptTxt).width
        const pw = tw + 26
        const ph = SCALE * 3 + 16
        const px = Math.round(playerScreenX - pw / 2)
        const py = Math.round(playerScreenY - TILE_PX * 1.5 - ph)
        ctx.fillStyle = "#241307"; ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4)
        ctx.fillStyle = "#ede0bd"; ctx.fillRect(px, py, pw, ph)
        ctx.fillStyle = "#8a5a2c"; ctx.fillRect(px, py, pw, 3); ctx.fillRect(px, py + ph - 3, pw, 3)
        ctx.textAlign = "center"
        ctx.fillStyle = "#8a3026"
        ctx.fillText(promptTxt, playerScreenX, py + ph - 9)
        ctx.textAlign = "left"
      }

      // Combat HUD — parchment plate (top-left)
      {
        const hx = 14, hy = 14
        const hw = 198
        const hh = g.combat ? 96 : 80
        // dark backing border
        ctx.fillStyle = "#241307"; ctx.fillRect(hx - 2, hy - 2, hw + 4, hh + 4)
        // parchment fill
        ctx.fillStyle = "#ede0bd"; ctx.fillRect(hx, hy, hw, hh)
        // inner gold trim
        ctx.fillStyle = "#c79a5e"; ctx.fillRect(hx + 3, hy + 3, hw - 6, 2)
        ctx.fillRect(hx + 3, hy + hh - 5, hw - 6, 2)
        // outer brown frame
        ctx.strokeStyle = "#5e3a18"; ctx.lineWidth = 2
        ctx.strokeRect(hx + 1, hy + 1, hw - 2, hh - 2)
        // metal corners
        ctx.fillStyle = "#8a5a2c"
        for (const [cx, cy] of [[hx + 2, hy + 2], [hx + hw - 8, hy + 2], [hx + 2, hy + hh - 8], [hx + hw - 8, hy + hh - 8]]) {
          ctx.fillRect(cx, cy, 6, 6)
        }
        // HP bar — recessed, blood-red fill
        const bx = hx + 12, by = hy + 14, bw = hw - 24, bh = 14
        ctx.fillStyle = "#2a1408"; ctx.fillRect(bx, by, bw, bh)
        ctx.fillStyle = "#5a1010"; ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2)
        ctx.fillStyle = "#c8463b"; ctx.fillRect(bx + 1, by + 1, (bw - 2) * (g.hp / g.maxHp), bh - 2)
        // tick highlight
        ctx.fillStyle = "#e8745a"; ctx.fillRect(bx + 1, by + 1, (bw - 2) * (g.hp / g.maxHp), 2)
        // text
        ctx.font = `7px 'Press Start 2P', monospace`
        ctx.fillStyle = "#f6e8c8"
        ctx.fillText(`HP ${Math.ceil(g.hp)}/${g.maxHp}`, bx + 4, by + 10)
        // KILLS
        ctx.fillStyle = "#5e3a18"
        ctx.fillText(`KILLS  ${g.kills}`, hx + 12, hy + 46)
        // FIGHT line
        const fightCol = g.combat ? "#2f7a26" : "#7a5a32"
        ctx.fillStyle = fightCol
        ctx.fillText(`[T] FIGHT ${g.combat ? "ON" : "OFF"}`, hx + 12, hy + 62)
        if (g.combat) {
          ctx.fillStyle = "#8a3026"
          ctx.fillText(`[SPACE] ${wpn.name}`, hx + 12, hy + 78)
        }
      }

      // Death overlay
      if (g.deadT > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.72)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = "#c8463b"
        ctx.font = `${SCALE * 6}px 'Press Start 2P', monospace`
        ctx.textAlign = "center"
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2)
        ctx.fillStyle = "#f6e8c8"
        ctx.font = `${SCALE * 3}px 'Press Start 2P', monospace`
        ctx.fillText("respawning...", canvas.width / 2, canvas.height / 2 + 36)
        ctx.textAlign = "left"
      }

      animFrameIdRef.current = requestAnimationFrame(loop)
    }

    gameRef.current.lastTime = performance.now()
    animFrameIdRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameIdRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [phase, isWalkable])

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d1117" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", imageRendering: "pixelated" }}
      />

      {phase === "title"    && <TitleScreen />}
      {phase !== "title"    && <HUD />}
      {phase !== "title"    && <AchievementToast />}
      {activeBuilding       && <BuildingModal />}

      {/* Mobile controls — touch devices only */}
      {phase === "playing" && isTouch && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          display: "grid", gridTemplateColumns: "48px 48px 48px",
          gridTemplateRows: "48px 48px 48px", gap: 4,
          opacity: 0.75,
        }}>
          {[
            { label: "↑", col: 2, row: 1, key: "w" },
            { label: "←", col: 1, row: 2, key: "a" },
            { label: "↓", col: 2, row: 2, key: "s" },
            { label: "→", col: 3, row: 2, key: "d" },
          ].map(({ label, col, row, key }) => (
            <button
              key={key}
              onPointerDown={() => { gameRef.current.keys[key] = true }}
              onPointerUp={() => { gameRef.current.keys[key] = false }}
              onPointerLeave={() => { gameRef.current.keys[key] = false }}
              style={{
                gridColumn: col, gridRow: row,
                background: "rgba(255,215,0,0.2)",
                border: "2px solid #ffd700",
                color: "#ffd700",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 0, cursor: "pointer",
                touchAction: "none",
              }}
            >{label}</button>
          ))}
          <button
            onPointerDown={() => {
              if (gameRef.current.nearBuilding) {
                openBuilding(gameRef.current.nearBuilding as any)
                playSound("open")
              }
            }}
            style={{
              gridColumn: 2, gridRow: 3,
              background: "rgba(255,215,0,0.3)",
              border: "2px solid #ffd700",
              color: "#ffd700",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", touchAction: "none",
            }}
          >E</button>
        </div>
      )}
    </div>
  )
}
