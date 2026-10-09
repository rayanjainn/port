"use client"

import { useEffect, useRef } from "react"
import { useGameStore, type BuildingId } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { WORLD_MAP, WORLD_W, WORLD_H, TILE_PX, SCALE, WALKABLE, BUILDINGS, PLAYER_START, T, DECOR, SOLID_DECOR } from "@/lib/tilemap"
import { NPCS } from "@/lib/npcs"
import { buildBase, buildBuilding, buildProps, hash2, MARGIN, TS, tsrc, type BuildingSprite } from "@/lib/worldRender"
import { CHAR_SHEET, composeHero } from "@/lib/hero"
import { runtime, toggleNight, type Facing } from "@/lib/runtime"
import { useContentStore } from "@/lib/content"
import { fontFamily } from "@/lib/fonts"
import TitleScreen from "@/components/ui/TitleScreen"
import HUD from "@/components/ui/HUD"
import AchievementToast from "@/components/ui/AchievementToast"
import BuildingModal from "@/components/ui/BuildingModal"
import TouchControls from "@/components/ui/TouchControls"

const PLAYER_SPEED = 200 // world px / sec
const INTERACT_DIST = TILE_PX * 1.6
const STEP_INTERVAL = 0.3

const ACCENT: Record<string, string> = {
  townhall: "#5b8fd6", tavern: "#e09a3a", academy: "#3fb3a6", gallery: "#9a7be0",
  forge: "#e2683a", wizard: "#8e66e8", cave: "#9a8a72",
}
const SECTION: Record<string, string> = {
  townhall: "ABOUT", tavern: "EXPERIENCE", academy: "EDUCATION", gallery: "PROJECTS",
  forge: "SKILLS", wizard: "CONTACT", cave: "???",
}

// ── Characters ────────────────────────────────────────────────
// Sprites have no walk frames, so the walk is procedural: bob + lean +
// squash, plus two boots that alternate under the body.
function drawCharacter(
  ctx: CanvasRenderingContext2D, src: CanvasImageSource, sx: number, sy: number,
  px: number, py: number, facing: Facing, animT: number, size = 40, boot = "#2b2f3a",
) {
  const moving = animT > 0
  const cyc = Math.sin(animT * 11)
  const cyc2 = Math.cos(animT * 11)
  const step = moving && cyc > 0 ? 1 : -1
  const bob = moving ? Math.abs(cyc) * 2.6 : Math.sin(performance.now() / 420) * 0.6
  const lean = moving ? cyc * 0.06 : 0
  const sqY = moving ? 1 - Math.abs(cyc) * 0.05 : 1
  const sqX = moving ? 1 + Math.abs(cyc) * 0.04 : 1
  const flip = facing === "left" ? -1 : 1
  const w = size, h = size * 1.25

  ctx.fillStyle = "rgba(10,30,10,0.32)"
  ctx.beginPath()
  ctx.ellipse(px, py + 3, size * 0.32 + bob * 0.5, size * 0.12 - bob * 0.15, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(Math.round(px), Math.round(py - bob))
  ctx.rotate(lean)
  ctx.scale(flip * sqX, sqY)
  ctx.imageSmoothingEnabled = false
  const bodyH = (h * 12) / 16
  ctx.drawImage(src, sx, sy, 16, 12, -w / 2, -h + 8, w, bodyH)
  const bw = Math.round(size / 6.5), bh = Math.round(size / 6)
  const baseY = -h + 8 + bodyH - 2
  if (moving) {
    ctx.fillStyle = "#151821"
    ctx.fillRect(-bw - 1 - step * 2.4, baseY + 1, bw, bh - 1)
    ctx.fillStyle = boot
    ctx.fillRect(1 + step * 2.4, baseY, bw, bh)
  } else {
    ctx.fillStyle = boot
    ctx.fillRect(-bw - 1, baseY + 1, bw, bh - 1)
    ctx.fillRect(1, baseY + 1, bw, bh - 1)
  }
  if ((facing === "left" || facing === "right") && moving) {
    ctx.fillStyle = "#2f9c95"
    ctx.fillRect(w / 2 - 7, -h * 0.55 + cyc2 * 2.5, 5, 8)
    ctx.fillStyle = "#c49a72"
    ctx.fillRect(w / 2 - 7, -h * 0.55 + cyc2 * 2.5 + 8, 5, 3)
  }
  ctx.restore()
}

// ── Combat (opt-in with [T]) ──────────────────────────────────
interface Monster {
  x: number; y: number; type: string; hp: number; maxHp: number; hurt: number
  facing: Facing; animT: number; wTx: number | null; wTy: number | null; wIdle: number
}
interface Projectile { x: number; y: number; vx: number; vy: number; life: number }
const MONSTER_TYPES: Record<string, { hp: number; speed: number; dmg: number; tile: number }> = {
  slime: { hp: 2, speed: 44, dmg: 1, tile: 108 },
  spider: { hp: 3, speed: 78, dmg: 1, tile: 122 },
  ghost: { hp: 4, speed: 60, dmg: 2, tile: 121 },
  brute: { hp: 7, speed: 54, dmg: 2, tile: 110 },
}
function currentWeapon(kills: number) {
  if (kills >= 16) return { name: "WAND", dmg: 5, range: 0, ranged: true, tile: 130 }
  if (kills >= 6) return { name: "SWORD", dmg: 4, range: 58, ranged: false, tile: 104 }
  return { name: "DAGGER", dmg: 2, range: 44, ranged: false, tile: 103 }
}

interface Npc {
  x: number; y: number; homeX: number; homeY: number; tile: number
  facing: Facing; animT: number; tx: number | null; ty: number | null; idleT: number; speed: number
  line: number; talkT: number
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: "dust" | "leaf" | "spark"; col: string }

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const assets = useRef<{
    tt: HTMLImageElement | null; chars: HTMLImageElement | null; td: HTMLImageElement | null
    base: HTMLCanvasElement | null; props: HTMLCanvasElement | null; hero: HTMLCanvasElement | null
    bsprites: Record<string, BuildingSprite>
  }>({ tt: null, chars: null, td: null, base: null, props: null, hero: null, bsprites: {} })

  const gRef = useRef({
    player: { ...PLAYER_START },
    facing: "down" as Facing,
    moving: false, animT: 0, stepT: 0,
    keys: {} as Record<string, boolean>,
    camera: { x: PLAYER_START.x, y: PLAYER_START.y, init: false },
    near: null as string | null,
    last: 0,
    npcs: [] as Npc[],
    monsters: [] as Monster[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    attackT: 0, attackCd: 0, hurtT: 0, spawnT: 3, deadT: 0,
    caveSeen: false,
  })

  const phase = useGameStore((s) => s.phase)
  const openBuilding = useGameStore((s) => s.openBuilding)

  // seed NPCs
  useEffect(() => {
    const g = gRef.current
    if (g.npcs.length) return
    g.npcs = NPCS.map((n, i) => ({
      x: (n.x + 0.5) * TILE_PX, y: (n.y + 1) * TILE_PX,
      homeX: (n.x + 0.5) * TILE_PX, homeY: (n.y + 1) * TILE_PX,
      tile: n.tile, facing: "down", animT: 0, tx: null, ty: null,
      idleT: Math.random() * 1.5, speed: 28 + Math.random() * 14, line: i, talkT: 0,
    }))
    // night by default when it is night for the visitor
    const h = new Date().getHours()
    runtime.nightTarget = h >= 19 || h < 6 ? 1 : 0
    runtime.night = runtime.nightTarget
  }, [])

  // assets
  useEffect(() => {
    const a = assets.current
    const tt = new Image()
    tt.onload = () => {
      a.tt = tt
      a.base = buildBase(tt)
      a.props = buildProps(tt)
      runtime.baseCanvas = a.base
      runtime.propsCanvas = a.props
      for (const b of BUILDINGS) a.bsprites[b.id] = buildBuilding(tt, b)
      runtime.buildingSprites = a.bsprites
    }
    tt.src = "/assets/tiny-town/Tilemap/tilemap.png"
    const ch = new Image()
    ch.onload = () => { a.chars = ch; a.hero = composeHero(ch) }
    ch.src = CHAR_SHEET
    const td = new Image()
    td.onload = () => { a.td = td }
    td.src = "/assets/tiny-dungeon/Tilemap/tilemap.png"
  }, [])

  // walkability
  const walkable = (px: number, py: number) => {
    const col = Math.floor(px / TILE_PX), row = Math.floor(py / TILE_PX)
    if (col < 0 || col >= WORLD_W || row < 0 || row >= WORLD_H) return false
    if (!WALKABLE.has(WORLD_MAP[row][col])) return false
    if (SOLID_DECOR.has(`${col},${row}`)) return false
    for (const b of BUILDINGS) {
      if (col === b.doorX && row === b.doorY) continue
      if (px > b.x * TILE_PX + 4 && px < (b.x + b.w) * TILE_PX - 4 && py > b.y * TILE_PX + 4 && py < (b.y + b.h) * TILE_PX - 4) return false
    }
    return true
  }

  // input
  useEffect(() => {
    const interact = () => {
      const g = gRef.current
      const st = useGameStore.getState()
      if (st.phase !== "playing") return
      if (g.near) {
        openBuilding(g.near as BuildingId)
        playSound("open")
      }
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault()
      gRef.current.keys[k] = true
      if (useGameStore.getState().phase === "title") return
      if (k === "e" || k === "enter") interact()
      if (k === "n" && !e.repeat) { toggleNight(); playSound("click") }
      if (k === "t" && !e.repeat) {
        runtime.combat = !runtime.combat
        playSound(runtime.combat ? "bong" : "close")
        if (!runtime.combat) { gRef.current.monsters = []; gRef.current.projectiles = [] }
      }
    }
    const up = (e: KeyboardEvent) => { gRef.current.keys[e.key.toLowerCase()] = false }
    const blur = () => { gRef.current.keys = {} }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", blur)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", blur)
    }
  }, [openBuilding])

  // main loop
  useEffect(() => {
    if (phase === "title") return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const light = document.createElement("canvas")
    const lctx = light.getContext("2d")!
    let raf = 0
    let cw = 0, ch = 0

    const resize = () => {
      const dpr = 1 // pixel art: keep 1:1 CSS pixels for crisp nearest-neighbour scaling
      cw = window.innerWidth; ch = window.innerHeight
      canvas.width = cw * dpr; canvas.height = ch * dpr
      light.width = Math.ceil(cw / 4); light.height = Math.ceil(ch / 4)
      ctx.imageSmoothingEnabled = false
    }
    resize()
    window.addEventListener("resize", resize)

    const g = gRef.current
    const npcLines = (() => {
      const c = useContentStore.getState().data
      const top = c.projects[0]?.title ?? "something big"
      return [
        "The Gallery holds every project. Go look!",
        `I hear ${c.profile.name.split(" ")[0]} is building ${top}...`,
        "Lost? Press M for the map.",
        "The Wizard Tower delivers messages. Fast.",
        "Try pressing N when the sun goes down ✦",
        "The Forge smells like Rust. Literally.",
        "Tavern folk tell tales of past quests.",
        "They say a cave hides deep in the south-east...",
        "Ship fast. Break things. Fix faster!",
        "Psst, press T if you're feeling brave.",
      ]
    })()

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop)
      const a = assets.current
      const dt = Math.min((time - g.last) / 1000, 0.05)
      g.last = time
      const now = time / 1000
      const st = useGameStore.getState()
      const paused = st.phase !== "playing"

      runtime.night += (runtime.nightTarget - runtime.night) * Math.min(1, dt * 2.2)
      const night = runtime.night

      // ── teleport (fast travel from map)
      if (runtime.teleportTo) {
        const b = BUILDINGS.find((x) => x.id === runtime.teleportTo)
        runtime.teleportTo = null
        if (b) {
          g.player.x = (b.doorX + 0.5) * TILE_PX
          g.player.y = (b.doorY + 1.7) * TILE_PX
          g.facing = "up"
          for (let i = 0; i < 26; i++) {
            const ang = (i / 26) * Math.PI * 2
            g.particles.push({ x: g.player.x, y: g.player.y - 20, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.6, max: 0.6, kind: "spark", col: "#ffe39a" })
          }
          playSound("achievement")
        }
      }

      // ── movement
      let dx = 0, dy = 0
      if (!paused && g.deadT <= 0) {
        const k = g.keys
        if (k["arrowleft"] || k["a"]) dx -= 1
        if (k["arrowright"] || k["d"]) dx += 1
        if (k["arrowup"] || k["w"]) dy -= 1
        if (k["arrowdown"] || k["s"]) dy += 1
        if (Math.abs(runtime.joy.x) > 0.15 || Math.abs(runtime.joy.y) > 0.15) { dx = runtime.joy.x; dy = runtime.joy.y }
        if (runtime.actionPressed) {
          runtime.actionPressed = false
          if (g.near) { openBuilding(g.near as BuildingId); playSound("open") }
          else if (runtime.combat) {
            g.keys[" "] = true
            setTimeout(() => { g.keys[" "] = false }, 80)
          }
        }
      }
      g.moving = dx !== 0 || dy !== 0
      if (g.moving) {
        if (Math.abs(dx) > Math.abs(dy)) g.facing = dx < 0 ? "left" : "right"
        else g.facing = dy < 0 ? "up" : "down"
        const len = Math.hypot(dx, dy)
        const mag = Math.min(1, len)
        const vx = (dx / len) * PLAYER_SPEED * mag * dt
        const vy = (dy / len) * PLAYER_SPEED * mag * dt
        const pad = 12
        const nx = g.player.x + vx, ny = g.player.y + vy
        if (walkable(nx + pad * Math.sign(vx || 1), g.player.y) && walkable(nx + pad * Math.sign(vx || 1), g.player.y - 8)) g.player.x = nx
        if (walkable(g.player.x - pad + 2, ny) && walkable(g.player.x + pad - 2, ny)) g.player.y = ny
        g.animT += dt
        g.stepT += dt
        if (g.stepT >= STEP_INTERVAL) {
          g.stepT = 0
          playSound("step")
          g.particles.push({ x: g.player.x + (Math.random() - 0.5) * 10, y: g.player.y, vx: -vx * 4 + (Math.random() - 0.5) * 20, vy: -12, life: 0.45, max: 0.45, kind: "dust", col: "#e8d9b0" })
        }
      } else g.animT = 0
      runtime.player.x = g.player.x
      runtime.player.y = g.player.y
      runtime.facing = g.facing

      // ── nearest door
      g.near = null
      let best = INTERACT_DIST
      for (const b of BUILDINGS) {
        const d = Math.hypot(g.player.x - (b.doorX + 0.5) * TILE_PX, g.player.y - (b.doorY + 0.9) * TILE_PX)
        if (d < best) { best = d; g.near = b.id }
      }
      if (g.near === "cave" && !g.caveSeen) { g.caveSeen = true; playSound("achievement") }
      runtime.nearBuilding = g.near

      // ── NPCs
      for (const n of g.npcs) {
        n.talkT = Math.max(0, n.talkT - dt)
        const dp = Math.hypot(n.x - g.player.x, n.y - g.player.y)
        if (dp < TILE_PX * 1.3 && n.talkT <= 0) { n.talkT = 4; n.line = (n.line + 3) % npcLines.length; n.facing = g.player.x < n.x ? "left" : "right"; n.tx = null; n.idleT = 3 }
        if (n.idleT > 0) { n.idleT -= dt; n.animT = 0; continue }
        if (n.tx === null || n.ty === null) {
          let ok = false
          for (let i = 0; i < 12; i++) {
            const ang = Math.random() * Math.PI * 2, r = TILE_PX + Math.random() * TILE_PX * 4
            const tx = n.homeX + Math.cos(ang) * r, ty = n.homeY + Math.sin(ang) * r
            if (walkable(tx, ty)) { n.tx = tx; n.ty = ty; ok = true; break }
          }
          if (!ok) { n.idleT = 1; continue }
        }
        const ddx = (n.tx as number) - n.x, ddy = (n.ty as number) - n.y
        const d = Math.hypot(ddx, ddy)
        if (d < 4) { n.tx = null; n.idleT = 1 + Math.random() * 2.5; n.animT = 0; continue }
        const nx = n.x + (ddx / d) * n.speed * dt, ny = n.y + (ddy / d) * n.speed * dt
        if (Math.hypot(nx - g.player.x, ny - g.player.y) < 30) { n.tx = null; n.idleT = 0.6; continue }
        if (walkable(nx, ny)) {
          n.x = nx; n.y = ny
          n.facing = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? "left" : "right") : (ddy < 0 ? "up" : "down")
          n.animT += dt
        } else { n.tx = null; n.idleT = 0.4 }
      }

      // ── combat
      const wpn = currentWeapon(runtime.kills)
      runtime.weapon = wpn.name
      if (g.deadT > 0) {
        g.deadT -= dt
        if (g.deadT <= 0) { g.player = { ...PLAYER_START }; runtime.hp = runtime.maxHp; g.monsters = []; g.projectiles = [] }
      } else if (!paused) {
        g.attackT = Math.max(0, g.attackT - dt)
        g.attackCd = Math.max(0, g.attackCd - dt)
        g.hurtT = Math.max(0, g.hurtT - dt)
        g.spawnT -= dt
        if (runtime.combat && g.spawnT <= 0 && g.monsters.length < 8) {
          g.spawnT = 2.4
          const roll = Math.random()
          let type = "slime"
          if (runtime.kills > 12 && roll < 0.32) type = "brute"
          else if (runtime.kills > 6 && roll < 0.5) type = "ghost"
          else if (roll < 0.45) type = "spider"
          for (let i = 0; i < 24; i++) {
            const ang = Math.random() * Math.PI * 2, dist = (7 + Math.random() * 6) * TILE_PX
            const mx = g.player.x + Math.cos(ang) * dist, my = g.player.y + Math.sin(ang) * dist
            if (walkable(mx, my)) {
              const mt = MONSTER_TYPES[type]
              g.monsters.push({ x: mx, y: my, type, hp: mt.hp, maxHp: mt.hp, hurt: 0, facing: "down", animT: 0, wTx: null, wTy: null, wIdle: Math.random() })
              break
            }
          }
        }
        if (runtime.combat && g.keys[" "] && g.attackCd <= 0) {
          g.attackCd = wpn.ranged ? 0.34 : 0.42
          g.attackT = 0.25
          playSound("click")
          const fx = g.facing === "left" ? -1 : g.facing === "right" ? 1 : 0
          const fy = g.facing === "up" ? -1 : g.facing === "down" ? 1 : 0
          if (wpn.ranged) g.projectiles.push({ x: g.player.x, y: g.player.y - 18, vx: fx * 360, vy: fy * 360, life: 1.1 })
          else {
            const ax = g.player.x + fx * wpn.range * 0.6, ay = g.player.y - 16 + fy * wpn.range * 0.6
            for (const m of g.monsters) if (Math.hypot(m.x - ax, m.y - ay) < wpn.range) {
              m.hp -= wpn.dmg; m.hurt = 0.18
              const kl = Math.hypot(m.x - g.player.x, m.y - g.player.y) || 1
              m.x += ((m.x - g.player.x) / kl) * 18; m.y += ((m.y - g.player.y) / kl) * 18
            }
          }
        }
        for (const p of g.projectiles) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt
          for (const m of g.monsters) if (m.hp > 0 && Math.hypot(m.x - p.x, m.y - p.y) < 24) { m.hp -= wpn.dmg; m.hurt = 0.18; p.life = 0; break }
        }
        g.projectiles = g.projectiles.filter((p) => p.life > 0)
        for (const m of g.monsters) {
          m.hurt = Math.max(0, m.hurt - dt)
          const mt = MONSTER_TYPES[m.type]
          const mdx = g.player.x - m.x, mdy = g.player.y - m.y
          const ml = Math.hypot(mdx, mdy) || 1
          let vx = 0, vy = 0, moved = false
          if (ml < TILE_PX * 7 || m.hurt > 0) {
            vx = (mdx / ml) * mt.speed * dt; vy = (mdy / ml) * mt.speed * dt
            if (walkable(m.x + vx, m.y)) { m.x += vx; moved = true }
            if (walkable(m.x, m.y + vy)) { m.y += vy; moved = true }
          } else if (m.wIdle > 0) m.wIdle -= dt
          else if (m.wTx === null || m.wTy === null) {
            const ang = Math.random() * Math.PI * 2, r = TILE_PX * (2 + Math.random() * 3)
            const tx = m.x + Math.cos(ang) * r, ty = m.y + Math.sin(ang) * r
            if (walkable(tx, ty)) { m.wTx = tx; m.wTy = ty } else m.wIdle = 0.8
          } else {
            const wdx = m.wTx - m.x, wdy = m.wTy - m.y, wd = Math.hypot(wdx, wdy)
            if (wd < 4) { m.wTx = null; m.wIdle = 0.6 + Math.random() * 1.6 }
            else {
              vx = (wdx / wd) * mt.speed * 0.45 * dt; vy = (wdy / wd) * mt.speed * 0.45 * dt
              if (walkable(m.x + vx, m.y + vy)) { m.x += vx; m.y += vy; moved = true } else { m.wTx = null; m.wIdle = 0.4 }
            }
          }
          if (moved) { m.facing = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? "left" : "right") : (vy < 0 ? "up" : "down"); m.animT += dt } else m.animT = 0
          if (ml < 28 && g.hurtT <= 0) {
            runtime.hp -= mt.dmg; g.hurtT = 0.9; playSound("error")
            if (runtime.hp <= 0) { runtime.hp = 0; g.deadT = 2.6 }
          }
        }
        g.monsters = g.monsters.filter((m) => {
          if (m.hp > 0) return true
          runtime.kills += 1
          for (let i = 0; i < 10; i++) g.particles.push({ x: m.x, y: m.y - 12, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140, life: 0.5, max: 0.5, kind: "spark", col: "#ffd76a" })
          return false
        })
      }

      // ── camera (snapped to the pixel grid so tiles never shimmer)
      const tx = g.player.x - cw / 2, ty = g.player.y - ch / 2 - 20
      if (!g.camera.init) { g.camera.x = tx; g.camera.y = ty; g.camera.init = true }
      g.camera.x += (tx - g.camera.x) * Math.min(1, dt * 7)
      g.camera.y += (ty - g.camera.y) * Math.min(1, dt * 7)
      const minX = -MARGIN * TILE_PX, maxX = (WORLD_W + MARGIN) * TILE_PX - cw
      const minY = -MARGIN * TILE_PX, maxY = (WORLD_H + MARGIN) * TILE_PX - ch
      g.camera.x = Math.max(minX, Math.min(maxX, g.camera.x))
      g.camera.y = Math.max(minY, Math.min(maxY, g.camera.y))
      const camX = Math.round(g.camera.x / SCALE) * SCALE
      const camY = Math.round(g.camera.y / SCALE) * SCALE

      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = "#3d7a3a"
      ctx.fillRect(0, 0, cw, ch)

      if (!a.base || !a.tt) return
      // ── ground + props
      const sx = camX / SCALE + MARGIN * TS, sy = camY / SCALE + MARGIN * TS
      const sw = Math.ceil(cw / SCALE) + 1, sh = Math.ceil(ch / SCALE) + 1
      ctx.drawImage(a.base, sx, sy, sw, sh, 0, 0, sw * SCALE, sh * SCALE)

      // water: drifting glints
      const c0 = Math.max(0, Math.floor(camX / TILE_PX)), c1 = Math.min(WORLD_W - 1, Math.ceil((camX + cw) / TILE_PX))
      const r0 = Math.max(0, Math.floor(camY / TILE_PX)), r1 = Math.min(WORLD_H - 1, Math.ceil((camY + ch) / TILE_PX))
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (WORLD_MAP[r][c] !== T.POND) continue
        for (let k = 0; k < 2; k++) {
          const ph = (now * 0.35 + hash2(c, r, k)) % 1
          if (ph > 0.55) continue
          const gx = c * TILE_PX + Math.floor(hash2(c, r, k + 7) * 12 + 2) * SCALE + Math.floor(ph * 6) * SCALE - camX
          const gy = r * TILE_PX + Math.floor(hash2(c, r, k + 3) * 10 + 3) * SCALE - camY
          ctx.globalAlpha = Math.sin((ph / 0.55) * Math.PI) * 0.8
          ctx.fillStyle = "#eaf8ff"
          ctx.fillRect(gx, gy, SCALE * 3, SCALE)
        }
      }
      ctx.globalAlpha = 1

      if (a.props) ctx.drawImage(a.props, sx, sy, sw, sh, 0, 0, sw * SCALE, sh * SCALE)

      // ── door highlight under entities
      if (g.near) {
        const b = BUILDINGS.find((x) => x.id === g.near)!
        const dxp = (b.doorX + 0.5) * TILE_PX - camX, dyp = (b.doorY + 1.05) * TILE_PX - camY
        const pulse = 0.5 + 0.5 * Math.sin(now * 5)
        ctx.fillStyle = `rgba(255, 230, 140, ${0.25 + pulse * 0.25})`
        ctx.beginPath(); ctx.ellipse(dxp, dyp, 30 + pulse * 4, 10 + pulse, 0, 0, Math.PI * 2); ctx.fill()
      }

      // ── y-sorted sprites
      type Item = { y: number; draw: () => void }
      const items: Item[] = []
      for (const b of BUILDINGS) {
        const spr = a.bsprites[b.id]
        if (!spr) continue
        const bx = b.x * TILE_PX - camX, by = b.y * TILE_PX - camY
        if (bx > cw + 100 || bx + b.w * TILE_PX < -100 || by > ch + 100 || by + b.h * TILE_PX < -200) continue
        items.push({ y: (b.y + b.h) * TILE_PX, draw: () => {
          // contact shadow
          ctx.fillStyle = "rgba(20, 40, 10, 0.28)"
          ctx.fillRect(bx + 6, by + b.h * TILE_PX - 6, b.w * TILE_PX, 12)
          if (b.id === "cave" && !g.caveSeen) {
            // the cave is disguised as thicket until you stumble onto it
            for (let i = 0; i < b.w; i++) {
              const [tsx, tsy] = tsrc(i % 2 ? 16 : 28)
              ctx.drawImage(a.tt!, tsx, tsy, 16, 16, bx + i * TILE_PX, by + TILE_PX * 0.5, TILE_PX, TILE_PX)
            }
            return
          }
          ctx.drawImage(spr.canvas, bx - 4 * SCALE, by - spr.offY * SCALE, spr.canvas.width * SCALE, spr.canvas.height * SCALE)
        } })
      }
      for (const n of g.npcs) {
        if (n.x - camX < -60 || n.x - camX > cw + 60 || n.y - camY < -80 || n.y - camY > ch + 60) continue
        items.push({ y: n.y, draw: () => {
          if (a.chars) drawCharacter(ctx, a.chars, (n.tile % 54) * 17, Math.floor(n.tile / 54) * 17, n.x - camX, n.y - camY, n.facing, n.animT, 36, "#3a2418")
        } })
      }
      for (const m of g.monsters) {
        items.push({ y: m.y, draw: () => {
          if (!a.td) return
          const mt = MONSTER_TYPES[m.type]
          const [msx, msy] = tsrc(mt.tile)
          const bob = m.animT > 0 ? Math.abs(Math.sin(m.animT * 9)) * 2.2 : 0
          const mx = m.x - camX, my = m.y - camY
          ctx.fillStyle = "rgba(10,20,10,.32)"
          ctx.beginPath(); ctx.ellipse(mx, my + 3, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill()
          ctx.save(); ctx.translate(mx, my - bob); ctx.scale(m.facing === "left" ? -1 : 1, 1)
          if (m.hurt > 0) ctx.filter = "brightness(1.8)"
          ctx.drawImage(a.td, msx, msy, 16, 16, -18, -34, 36, 36)
          ctx.filter = "none"; ctx.restore()
          if (m.hp < m.maxHp) {
            ctx.fillStyle = "#2a1a0a"; ctx.fillRect(mx - 14, my - 42, 28, 5)
            ctx.fillStyle = "#e0523f"; ctx.fillRect(mx - 13, my - 41, 26 * (m.hp / m.maxHp), 3)
          }
        } })
      }
      items.push({ y: g.player.y, draw: () => {
        if (!a.hero) return
        if (g.hurtT > 0.5 && Math.floor(now * 20) % 2) return
        drawCharacter(ctx, a.hero, 0, 0, g.player.x - camX, g.player.y - camY, g.facing, g.moving ? g.animT : 0, 40)
      } })
      items.sort((p, q) => p.y - q.y)
      for (const it of items) it.draw()

      // weapon swing + projectiles
      if (a.td && g.attackT > 0) {
        const prog = 1 - g.attackT / 0.25
        const fx = g.facing === "left" ? -1 : g.facing === "right" ? 1 : 0
        const fy = g.facing === "up" ? -1 : g.facing === "down" ? 1 : 0
        const [wsx, wsy] = tsrc(wpn.tile)
        ctx.save()
        ctx.translate(g.player.x - camX + fx * 26, g.player.y - camY - 18 + fy * 24)
        ctx.rotate((g.facing === "left" ? -1 : 1) * (prog - 0.5) * 1.8)
        ctx.drawImage(a.td, wsx, wsy, 16, 16, -15, -15, 30, 30)
        ctx.restore()
      }
      for (const p of g.projectiles) {
        ctx.fillStyle = "#c4a5ff"; ctx.fillRect(p.x - camX - 5, p.y - camY - 5, 10, 10)
        ctx.fillStyle = "#fff"; ctx.fillRect(p.x - camX - 2, p.y - camY - 2, 4, 4)
      }

      // ── chimney smoke + building labels
      for (const b of BUILDINGS) {
        const spr = a.bsprites[b.id]
        if (!spr) continue
        const bx = b.x * TILE_PX - camX, by = b.y * TILE_PX - camY
        if (bx > cw + 200 || bx + b.w * TILE_PX < -200 || by > ch + 200 || by + b.h * TILE_PX < -260) continue
        if (spr.chimney) {
          const cx0 = bx + spr.chimney.x * SCALE, cy0 = by + spr.chimney.y * SCALE
          for (let i = 0; i < 5; i++) {
            const t = (now * 0.35 + i / 5 + b.x * 0.13) % 1
            const r = 3 + t * 9
            ctx.globalAlpha = (1 - t) * 0.5
            ctx.fillStyle = night > 0.5 ? "#8d8aa8" : "#ece6dc"
            ctx.fillRect(Math.round(cx0 + Math.sin(t * 5 + i) * 8 + t * 14 - r / 2), Math.round(cy0 - t * 70 - r / 2), Math.round(r), Math.round(r))
          }
          ctx.globalAlpha = 1
        }
      }

      // ── particles
      for (const p of g.particles) {
        p.life -= dt
        p.x += p.vx * dt; p.y += p.vy * dt
        p.vx *= 0.92; p.vy = p.kind === "spark" ? p.vy + 260 * dt : p.vy * 0.92
        const k = Math.max(0, p.life / p.max)
        ctx.globalAlpha = k * (p.kind === "dust" ? 0.6 : 1)
        ctx.fillStyle = p.col
        const s = p.kind === "dust" ? 6 - k * 3 : 4
        ctx.fillRect(Math.round(p.x - camX - s / 2), Math.round(p.y - camY - s / 2), s, s)
      }
      ctx.globalAlpha = 1
      g.particles = g.particles.filter((p) => p.life > 0)
      if (g.particles.length > 220) g.particles.splice(0, g.particles.length - 220)

      // ── ambient: butterflies & petals by day, fireflies by night (world-anchored)
      for (let i = 0; i < 40; i++) {
        const hx = hash2(i, 1), hy = hash2(i, 2)
        const wx = hx * WORLD_W * TILE_PX + Math.sin(now * (0.3 + hx * 0.4) + i) * 60
        const wy = hy * WORLD_H * TILE_PX + Math.cos(now * (0.25 + hy * 0.3) + i * 2) * 40
        const px = wx - camX, py = wy - camY
        if (px < -10 || px > cw + 10 || py < -10 || py > ch + 10) continue
        if (night > 0.3) {
          const gl = 0.5 + 0.5 * Math.sin(now * 3 + i * 1.7)
          ctx.globalAlpha = night * gl * 0.35
          ctx.fillStyle = "#fff7a8"
          ctx.fillRect(Math.round(px) - 4, Math.round(py) - 4, 9, 9)
          ctx.globalAlpha = night * (0.4 + gl * 0.6)
          ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3)
        } else if (i % 3 === 0) {
          const flap = Math.sin(now * 16 + i) > 0 ? 3 : 1
          ctx.globalAlpha = 1 - night
          ctx.fillStyle = ["#ffffff", "#ffd76a", "#ff9ecf", "#9ad9ff"][i % 4]
          ctx.fillRect(Math.round(px) - flap - 1, Math.round(py), flap, 3)
          ctx.fillRect(Math.round(px) + 1, Math.round(py), flap, 3)
          ctx.fillStyle = "#3a2418"
          ctx.fillRect(Math.round(px), Math.round(py), 1, 3)
        }
      }
      ctx.globalAlpha = 1

      // ── day: drifting cloud shadows + warm grade
      if (night < 0.95) {
        for (let i = 0; i < 6; i++) {
          const wx = ((hash2(i, 9) * 4000 + now * 18) % 4400) - 400 - camX * 0.9
          const wy = hash2(i, 10) * WORLD_H * TILE_PX - camY * 0.9
          const rx = 240 + hash2(i, 11) * 160
          if (wx < -rx || wx > cw + rx || wy < -rx || wy > ch + rx) continue
          ctx.save()
          ctx.translate(wx, wy); ctx.scale(1, 0.45)
          const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
          grd.addColorStop(0, `rgba(10, 40, 20, ${0.11 * (1 - night)})`)
          grd.addColorStop(1, "rgba(10, 40, 20, 0)")
          ctx.fillStyle = grd
          ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
          ctx.restore()
        }
      }

      // ── night lighting: darken, then punch light holes
      if (night > 0.01) {
        const LS = 4 // light map is quarter-res; it is smooth by nature
        lctx.globalCompositeOperation = "source-over"
        lctx.clearRect(0, 0, light.width, light.height)
        lctx.fillStyle = `rgba(8, 12, 44, ${0.72 * night})`
        lctx.fillRect(0, 0, light.width, light.height)
        lctx.globalCompositeOperation = "destination-out"
        const hole = (x: number, y: number, r: number, s: number) => {
          const lx = (x - camX) / LS, ly = (y - camY) / LS, lr = r / LS
          if (lx < -lr || ly < -lr || lx > light.width + lr || ly > light.height + lr) return
          const grd = lctx.createRadialGradient(lx, ly, 0, lx, ly, lr)
          grd.addColorStop(0, `rgba(0,0,0,${s})`)
          grd.addColorStop(1, "rgba(0,0,0,0)")
          lctx.fillStyle = grd
          lctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2)
        }
        const flick = (s: number) => 0.92 + Math.sin(now * 9 + s) * 0.04 + Math.sin(now * 23 + s * 3) * 0.03
        hole(g.player.x, g.player.y - 20, 190, 0.85)
        for (const d of DECOR) if (d.kind === "lamp") hole((d.x + 0.5) * TILE_PX, d.y * TILE_PX + 4, 150 * flick(d.x), 0.95)
        for (const b of BUILDINGS) {
          const spr = a.bsprites[b.id]
          if (!spr || (b.id === "cave" && !g.caveSeen)) continue
          for (const w of spr.windows) hole(b.x * TILE_PX + w.x * SCALE, b.y * TILE_PX + w.y * SCALE + 20, 90 * flick(w.x + b.x), 0.8)
          hole((b.doorX + 0.5) * TILE_PX, (b.doorY + 1) * TILE_PX, 110, 0.7)
        }
        ctx.drawImage(light, 0, 0, light.width * LS, light.height * LS)

        // warm additive glows
        ctx.globalCompositeOperation = "lighter"
        const glow = (x: number, y: number, r: number, col: string, s: number) => {
          const px = x - camX, py = y - camY
          if (px < -r || py < -r || px > cw + r || py > ch + r) return
          const grd = ctx.createRadialGradient(px, py, 0, px, py, r)
          grd.addColorStop(0, col.replace("A", String(s)))
          grd.addColorStop(1, col.replace("A", "0"))
          ctx.fillStyle = grd
          ctx.fillRect(px - r, py - r, r * 2, r * 2)
        }
        for (const d of DECOR) if (d.kind === "lamp") glow((d.x + 0.5) * TILE_PX, d.y * TILE_PX + 2, 60, "rgba(255,190,90,A)", 0.45 * night)
        for (const b of BUILDINGS) {
          const spr = a.bsprites[b.id]
          if (!spr || (b.id === "cave" && !g.caveSeen)) continue
          const col = b.id === "wizard" ? "rgba(170,120,255,A)" : b.id === "forge" ? "rgba(255,120,50,A)" : "rgba(255,200,110,A)"
          for (const w of spr.windows) glow(b.x * TILE_PX + w.x * SCALE, b.y * TILE_PX + w.y * SCALE, 34, col, 0.55 * night * flick(w.y + b.y))
          if (b.id === "wizard") glow((b.x + b.w / 2) * TILE_PX, b.y * TILE_PX - 10, 90 + Math.sin(now * 2) * 10, "rgba(160,110,255,A)", 0.35 * night)
        }
        ctx.globalCompositeOperation = "source-over"
      } else {
        // daytime golden grade
        ctx.fillStyle = "rgba(255, 210, 140, 0.05)"
        ctx.fillRect(0, 0, cw, ch)
      }

      // ── vignette
      const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75)
      vg.addColorStop(0, "rgba(0,0,0,0)")
      vg.addColorStop(1, `rgba(6, 10, 30, ${0.35 + night * 0.25})`)
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, cw, ch)

      // ── building signs stay readable at night
      for (const b of BUILDINGS) {
        const spr = a.bsprites[b.id]
        if (!spr || (b.id === "cave" && !g.caveSeen)) continue
        const bx = b.x * TILE_PX - camX, by = b.y * TILE_PX - camY
        if (bx > cw + 200 || bx + b.w * TILE_PX < -200 || by > ch + 200 || by + b.h * TILE_PX < -260) continue
        drawSign(ctx, b.label, SECTION[b.id], ACCENT[b.id], bx + (b.w * TILE_PX) / 2, by - spr.offY * SCALE - 8, g.near === b.id)
      }

      // ── speech bubbles + interaction prompt (drawn above lighting)
      for (const n of g.npcs) {
        if (n.talkT <= 0) continue
        if (g.near && Math.abs(n.x - g.player.x) < 190 && Math.abs(n.y - g.player.y) < 120) continue
        const k = Math.min(1, n.talkT * 2, (4 - n.talkT) * 6)
        drawBubble(ctx, npcLines[n.line % npcLines.length], n.x - camX, n.y - camY - 52, k)
      }
      if (g.near && !paused) {
        const b = BUILDINGS.find((x) => x.id === g.near)!
        drawPrompt(ctx, `ENTER ${b.label}`, g.player.x - camX, g.player.y - camY - 74, now, isTouchDevice())
      }

      if (g.deadT > 0) {
        ctx.fillStyle = "rgba(20,0,0,0.65)"; ctx.fillRect(0, 0, cw, ch)
        ctx.textAlign = "center"
        ctx.font = `28px ${fontFamily("--ff-pixel")}`
        ctx.fillStyle = "#ff6a5a"; ctx.fillText("YOU FAINTED", cw / 2, ch / 2)
        ctx.font = `10px ${fontFamily("--ff-pixel")}`
        ctx.fillStyle = "#ffe7b0"; ctx.fillText("waking up at the town hall...", cw / 2, ch / 2 + 36)
        ctx.textAlign = "left"
      }
    }

    g.last = performance.now()
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "title"])

  return (
    <>
      <canvas ref={canvasRef} className="pixelated" style={{ display: "block", position: "absolute", inset: 0 }} />
      {phase === "title" && <TitleScreen />}
      {phase !== "title" && <HUD />}
      {phase !== "title" && <AchievementToast />}
      {phase !== "title" && <TouchControls />}
      <BuildingModal />
    </>
  )
}

function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
}

// Wooden sign with the building name and what it holds
function drawSign(ctx: CanvasRenderingContext2D, title: string, sub: string, accent: string, cx: number, bottom: number, active: boolean) {
  ctx.font = `10px ${fontFamily("--ff-pixel")}`
  const tw = ctx.measureText(title).width
  ctx.font = `7px ${fontFamily("--ff-pixel")}`
  const sw2 = ctx.measureText(sub).width
  const w = Math.round(Math.max(tw, sw2) + 26)
  const h = 34
  const x = Math.round(cx - w / 2), y = Math.round(bottom - h - (active ? 4 : 0))
  // posts
  ctx.fillStyle = "#2a1606"
  ctx.fillRect(x + 6, y + h - 2, 4, 8); ctx.fillRect(x + w - 10, y + h - 2, 4, 8)
  // board
  ctx.fillStyle = "#2a1606"; ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
  ctx.fillStyle = "#8a5a2c"; ctx.fillRect(x, y, w, h)
  ctx.fillStyle = "#a8743c"; ctx.fillRect(x, y, w, 3)
  ctx.fillStyle = "#6e4420"; ctx.fillRect(x, y + h - 3, w, 3)
  ctx.fillStyle = accent; ctx.fillRect(x, y + h - 13, w, 10)
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x, y + h - 13, w, 1)
  ctx.textAlign = "center"
  ctx.font = `10px ${fontFamily("--ff-pixel")}`
  ctx.fillStyle = "#2a1606"; ctx.fillText(title, cx + 1, y + 16)
  ctx.fillStyle = "#fff4dc"; ctx.fillText(title, cx, y + 15)
  ctx.font = `7px ${fontFamily("--ff-pixel")}`
  ctx.fillStyle = "#fff"; ctx.fillText(sub, cx, y + h - 5)
  ctx.textAlign = "left"
  if (active) {
    ctx.strokeStyle = "#ffe39a"; ctx.lineWidth = 2
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8)
  }
}

function drawPrompt(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, now: number, touch: boolean) {
  const bounce = Math.round(Math.sin(now * 6) * 2)
  ctx.font = `9px ${fontFamily("--ff-pixel")}`
  const tw = ctx.measureText(text).width
  const key = touch ? "TAP" : "E"
  const kw = touch ? 34 : 22
  const w = Math.round(tw + kw + 26), h = 30
  const x = Math.round(cx - w / 2), yy = Math.round(y - h + bounce)
  ctx.fillStyle = "rgba(10, 6, 2, 0.35)"; ctx.fillRect(x + 3, yy + 5, w, h)
  ctx.fillStyle = "#1d1006"; ctx.fillRect(x - 2, yy - 2, w + 4, h + 4)
  ctx.fillStyle = "#fbf1d6"; ctx.fillRect(x, yy, w, h)
  ctx.fillStyle = "#e3cf9c"; ctx.fillRect(x, yy + h - 3, w, 3)
  // key cap
  ctx.fillStyle = "#1d1006"; ctx.fillRect(x + 6, yy + 5, kw, 20)
  ctx.fillStyle = "#c8463b"; ctx.fillRect(x + 7, yy + 6, kw - 2, 16)
  ctx.fillStyle = "#e86a5c"; ctx.fillRect(x + 7, yy + 6, kw - 2, 2)
  ctx.textAlign = "center"
  ctx.fillStyle = "#fff4dc"; ctx.fillText(key, x + 6 + kw / 2, yy + 19)
  ctx.textAlign = "left"
  ctx.fillStyle = "#3a2412"; ctx.fillText(text, x + kw + 14, yy + 19)
  // tail
  ctx.fillStyle = "#1d1006"; ctx.fillRect(Math.round(cx) - 5, yy + h + 2, 10, 3)
  ctx.fillStyle = "#fbf1d6"; ctx.fillRect(Math.round(cx) - 3, yy + h, 6, 3)
}

function drawBubble(ctx: CanvasRenderingContext2D, text: string, cx: number, by: number, alpha: number) {
  if (alpha <= 0) return
  ctx.globalAlpha = alpha
  ctx.font = `15px ${fontFamily("--ff-pixelify")}`
  const maxW = 200
  const words = text.split(" ")
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    const t = cur ? cur + " " + w : w
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w } else cur = t
  }
  if (cur) lines.push(cur)
  const lw = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const w = Math.round(lw + 20), h = lines.length * 18 + 12
  const x = Math.round(cx - w / 2), y = Math.round(by - h)
  ctx.fillStyle = "#1d1006"; ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, w, h)
  ctx.fillStyle = "#1d1006"; ctx.fillRect(Math.round(cx) - 2, y + h + 2, 6, 4); ctx.fillRect(Math.round(cx), y + h + 6, 3, 3)
  ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(cx) - 1, y + h, 4, 4)
  ctx.fillStyle = "#2a1a10"
  lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 21 + i * 18 - 4))
  ctx.globalAlpha = 1
}
