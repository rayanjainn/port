"use client"

import { useEffect, useRef } from "react"
import { useGameStore, type BuildingId } from "@/lib/store"
import { playSound, playMusic } from "@/lib/audio"
import { useContentStore } from "@/lib/content"
import { runtime, toggleNight } from "@/lib/runtime"
import { fontFamily } from "@/lib/fonts"
import { CHARS, charSheet, DIR_COL, SHEETS } from "@/lib/na"
import { TS, img, ready, loadAll, hash, canvas, SolidIndex, overlaps, type Scene, type Facing, type ActorDef, type Hotspot, type Box, type Action } from "@/lib/world/core"
import { buildVillage, BUILDINGS, doorOf, VILLAGE_PRELOAD } from "@/lib/world/village"
import { buildInteriors, INTERIOR_PRELOAD } from "@/lib/world/interiors"
import TitleScreen from "@/components/ui/TitleScreen"
import { useLoading, bootStart } from "@/lib/loading"
import HUD from "@/components/ui/HUD"
import AchievementToast from "@/components/ui/AchievementToast"
import BuildingModal from "@/components/ui/BuildingModal"
import TouchControls from "@/components/ui/TouchControls"
import DialogBox from "@/components/ui/DialogBox"
import AreaTitle from "@/components/ui/AreaTitle"
import Arcade from "@/components/arcade/Arcade"

const SPEED = 62           // native px / sec
const FOOT = { w: 10, h: 6 }

interface ActorRT {
  def: ActorDef
  x: number; y: number
  facing: Facing
  animT: number
  moving: boolean
  tx: number | null; ty: number | null
  idle: number
  talkT: number
  barkI: number
  hurt: number
  dead: number
}

interface SceneRT {
  scene: Scene
  solids: SolidIndex
  actors: ActorRT[]
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; size: number; kind?: "smoke" }

const footBox = (x: number, y: number): Box => ({ x: x - FOOT.w / 2, y: y - FOOT.h, w: FOOT.w, h: FOOT.h })

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phase = useGameStore((s) => s.phase)
  const scenes = useRef<Record<string, SceneRT>>({})
  const st = useRef({
    scene: "village",
    hero: { x: 0, y: 0, facing: "down" as Facing, animT: 0, moving: false, attackT: 0, hurtT: 0, path: [] as { x: number; y: number }[], pending: null as Hotspot | null, pendingNpc: null as ActorRT | null },
    keys: {} as Record<string, boolean>,
    cam: { x: 0, y: 0, init: false },
    particles: [] as Particle[],
    fade: { a: 1, dir: -1 as 1 | -1, then: null as (() => void) | null },
    near: null as Hotspot | null,
    nearNpc: null as ActorRT | null,
    returnTo: null as { x: number; y: number } | null,
    chests: new Set<string>(),
    ready: false,
    last: 0,
    scale: 4,
  })

  // ── build world once the art is loaded
  useEffect(() => {
    let cancelled = false
    // art (85%) + fonts; the title screen's map and hero are part of the boot set
    const fonts = typeof document !== "undefined" && document.fonts ? document.fonts.ready.catch(() => undefined) : Promise.resolve()
    Promise.all([
      loadAll([...VILLAGE_PRELOAD, ...INTERIOR_PRELOAD, "/village-map.png", charSheet(CHARS.hero)], (n, total) => useLoading.setState({ progress: 0.08 + (n / total) * 0.82 })),
      fonts,
    ]).then(() => {
      if (cancelled) return
      const content = useContentStore.getState().data
      const all: Record<string, Scene> = { village: buildVillage(), ...buildInteriors(content) }
      for (const [id, sc] of Object.entries(all)) scenes.current[id] = prepare(sc)
      // shared village map for the minimap / world map
      const v = all.village
      const { c, ctx } = canvas(v.w * TS, v.h * TS)
      ctx.drawImage(v.ground, 0, 0)
      for (const s of [...v.sprites].sort((a, b) => a.baseY - b.baseY)) {
        const src = typeof s.src === "function" ? s.src() : s.src
        if (src) ctx.drawImage(src, s.rect[0], s.rect[1], s.rect[2], s.rect[3], Math.round(s.x), Math.round(s.y), s.rect[2], s.rect[3])
      }
      runtime.mapCanvas = c
      runtime.mapSize = { w: v.w * TS, h: v.h * TS }
      for (const b of BUILDINGS) if (b.section) { const d = doorOf(b); runtime.doors[b.id] = { x: d.x, y: d.y + 10 } }
      const S = st.current
      S.hero.x = v.spawn.x; S.hero.y = v.spawn.y; S.hero.facing = v.spawn.facing
      S.ready = true
      useLoading.setState({ progress: 1 })
      setTimeout(() => useLoading.setState({ done: true }), Math.max(350, 1400 - (performance.now() - bootStart)))
      if (process.env.NODE_ENV !== "production") {
        // dev-only hooks for automated screenshots
        (window as unknown as { __rw: unknown }).__rw = { goTo, doAction, hero: S.hero, mapURL: () => runtime.mapCanvas?.toDataURL(), trees: () => scenes.current.village.scene.meta?.trees }
      }
    })
    const h = new Date().getHours()
    runtime.nightTarget = h >= 19 || h < 6 ? 1 : 0
    runtime.night = runtime.nightTarget
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function prepare(scene: Scene): SceneRT {
    const solids = new SolidIndex(scene.w)
    for (let r = 0; r < scene.h; r++)
      for (let c = 0; c < scene.w; c++) if (scene.blocked[r * scene.w + c]) solids.add({ x: c * TS, y: r * TS, w: TS, h: TS })
    for (const s of scene.sprites) if (s.solid) solids.add(s.solid)
    const actors: ActorRT[] = scene.actors.map((def) => ({
      def, x: def.x, y: def.y, facing: def.facing ?? "down", animT: 0, moving: false, tx: null, ty: null,
      idle: Math.random() * 2, talkT: 0, barkI: 0, hurt: 0, dead: 0,
    }))
    // nudge anyone spawned inside a wall
    for (const a of actors) {
      for (let k = 0; k < 40 && solids.hits(footBox(a.x, a.y)); k++) { a.x += (k % 2 ? 1 : -1) * k; a.y += 2 }
    }
    return { scene, solids, actors }
  }

  // ── scene switching with an iris fade
  function goTo(id: string, at?: { x: number; y: number; facing?: Facing }) {
    const S = st.current
    S.fade = {
      a: 0, dir: 1, then: () => {
        const rt = scenes.current[id]
        if (!rt) return
        S.scene = id
        runtime.scene = id
        useGameStore.getState().setScene(id)
        const sp = at ?? rt.scene.spawn
        S.hero.x = sp.x; S.hero.y = sp.y; S.hero.facing = at?.facing ?? rt.scene.spawn.facing
        S.hero.path = []; S.cam.init = false
        playMusic(rt.scene.music)
        if (id !== "village") {
          const b = BUILDINGS.find((x) => x.id === id)
          useGameStore.getState().showArea(rt.scene.title.toUpperCase(), b?.section ?? "")
          useGameStore.getState().markVisited(id)
        } else useGameStore.getState().showArea("THE VILLAGE", "WELCOME BACK")
      },
    }
  }

  function doAction(a: Action) {
    const store = useGameStore.getState()
    const S = st.current
    if (a.type === "door") {
      playSound("open")
      S.returnTo = runtime.doors[a.to] ?? { x: S.hero.x, y: S.hero.y + 12 }
      goTo(a.to)
    } else if (a.type === "exit") {
      playSound("close")
      goTo("village", S.returnTo ? { ...S.returnTo, facing: "down" } : undefined)
    } else if (a.type === "section") {
      playSound("open")
      store.openBuilding(a.id as BuildingId, a.focus ?? null)
    } else if (a.type === "game") {
      playSound("magic")
      store.openArcade(a.id)
    } else if (a.type === "sign") {
      playSound("menu")
      store.say({ name: "Signpost", lines: a.lines })
    } else if (a.type === "chest") {
      if (S.chests.has(a.id)) { store.say({ name: "Chest", lines: ["It's empty now. You already took the loot!"] }); return }
      S.chests.add(a.id)
      playSound("secret")
      for (let i = 0; i < 24; i++) S.particles.push({ x: S.hero.x, y: S.hero.y - 20, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 60, life: 0.9, max: 0.9, col: i % 2 ? "#ffd76a" : "#fff4c2", size: 2 })
      store.unlockAchievement("chest_mine")
      const c = useContentStore.getState().data
      store.say({ name: "Treasure!", lines: [`You found a scroll: "${c.profile.motto}"`, `It's signed ${c.profile.name}. Thanks for exploring this far ✦`] })
    }
  }

  function talkTo(a: ActorRT) {
    const store = useGameStore.getState()
    const S = st.current
    // face each other
    const dx = S.hero.x - a.x, dy = S.hero.y - a.y
    a.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down")
    a.tx = null; a.idle = 4
    if (a.def.kind !== "npc") return
    const lines = a.def.lines ?? (a.def.bark ? [a.def.bark[a.barkI % a.def.bark.length]] : ["Hello there!"])
    a.barkI++
    playSound(Math.random() < 0.5 ? "talk" : "talk2")
    store.say({
      name: a.def.name ?? "Villager", face: a.def.face, lines,
      onDone: a.def.action ? () => doAction(a.def.action!) : undefined,
    })
  }

  // ── input
  useEffect(() => {
    const interact = () => {
      const S = st.current
      const store = useGameStore.getState()
      if (store.phase !== "playing" || store.dialog || store.mapOpen) return
      if (S.nearNpc) talkTo(S.nearNpc)
      else if (S.near) doAction(S.near.action)
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault()
      const S = st.current
      S.keys[k] = true
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) S.hero.path = []
      const store = useGameStore.getState()
      if (store.phase === "title") return
      if ((k === "e" || k === "enter") && !e.repeat) interact()
      if (k === " " && !e.repeat) attack()
      if (k === "n" && !e.repeat && S.scene === "village") { toggleNight(); playSound("click") }
    }
    const up = (e: KeyboardEvent) => { st.current.keys[e.key.toLowerCase()] = false }
    const blur = () => { st.current.keys = {} }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", blur)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", blur)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function attack() {
    const S = st.current
    if (S.hero.attackT > 0) return
    S.hero.attackT = 0.28
    playSound("sword")
    const rt = scenes.current[S.scene]
    if (!rt) return
    const fx = S.hero.facing === "left" ? -1 : S.hero.facing === "right" ? 1 : 0
    const fy = S.hero.facing === "up" ? -1 : S.hero.facing === "down" ? 1 : 0
    const hx = S.hero.x + fx * 12, hy = S.hero.y - 6 + fy * 12
    for (const a of rt.actors) {
      if (a.def.kind !== "monster" || a.dead > 0) continue
      if (Math.hypot(a.x - hx, a.y - 6 - hy) < 16) {
        a.dead = 6 + Math.random() * 4
        playSound("kill")
        runtime.kills++
        if (runtime.kills >= 10) useGameStore.getState().unlockAchievement("kills_10")
        S.particles.push({ x: a.x, y: a.y - 8, vx: 0, vy: 0, life: 0.5, max: 0.5, col: "", size: 32, kind: "smoke" })
      }
    }
  }

  // tap / click to walk (and interact on arrival)
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const onDown = (e: PointerEvent) => {
      const S = st.current
      const store = useGameStore.getState()
      if (store.phase !== "playing" || store.dialog || !S.ready) return
      const rt = scenes.current[S.scene]
      const wx = e.clientX / S.scale + S.cam.x, wy = e.clientY / S.scale + S.cam.y
      // clicked a hotspot or an NPC?
      const hs = rt.scene.hotspots.find((h) => wx >= h.box.x - 6 && wx <= h.box.x + h.box.w + 6 && wy >= h.box.y - 30 && wy <= h.box.y + h.box.h + 6)
      const npc = rt.actors.find((a) => a.def.kind === "npc" && Math.abs(a.x - wx) < 10 && wy > a.y - 20 && wy < a.y + 4)
      const target = npc ? { x: npc.x, y: npc.y + 12 } : hs ? { x: hs.box.x + hs.box.w / 2, y: hs.box.y + hs.box.h / 2 } : { x: wx, y: wy }
      const path = findPath(rt, S.hero.x, S.hero.y, target.x, target.y)
      if (path) {
        S.hero.path = path
        S.hero.pending = npc ? null : hs ?? null
        S.hero.pendingNpc = npc ?? null
        S.particles.push({ x: target.x, y: target.y, vx: 0, vy: 0, life: 0.5, max: 0.5, col: "#fff4c2", size: 3 })
      }
    }
    cv.addEventListener("pointerdown", onDown)
    return () => cv.removeEventListener("pointerdown", onDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "title"])

  function findPath(rt: SceneRT, sx: number, sy: number, tx: number, ty: number) {
    const { w, h } = rt.scene
    const free = (c: number, r: number) => c >= 0 && r >= 0 && c < w && r < h && !rt.solids.hits({ x: c * TS + 3, y: r * TS + 6, w: 10, h: 6 })
    const sc = Math.floor(sx / TS), sr = Math.floor((sy - 3) / TS)
    let tc = Math.floor(tx / TS), tr = Math.floor((ty - 3) / TS)
    if (!free(tc, tr)) {
      // nearest free tile to the target
      let best: [number, number] | null = null, bd = 1e9
      for (let r = tr - 3; r <= tr + 3; r++) for (let c = tc - 3; c <= tc + 3; c++) if (free(c, r)) { const d = Math.hypot(c - tc, r - tr); if (d < bd) { bd = d; best = [c, r] } }
      if (!best) return null
      ;[tc, tr] = best
    }
    const prev = new Int32Array(w * h).fill(-2)
    const q = [sr * w + sc]
    prev[sr * w + sc] = -1
    while (q.length) {
      const i = q.shift()!
      if (i === tr * w + tc) break
      const c = i % w, r = (i / w) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dx, nr = r + dy, j = nr * w + nc
        if (!free(nc, nr) || prev[j] !== -2) continue
        prev[j] = i
        q.push(j)
      }
    }
    if (prev[tr * w + tc] === -2) return null
    const out: { x: number; y: number }[] = []
    for (let i = tr * w + tc; i !== -1; i = prev[i]) out.push({ x: (i % w) * TS + 8, y: Math.floor(i / w) * TS + 12 })
    out.reverse()
    out.shift()
    return out
  }

  // ── main loop
  useEffect(() => {
    if (phase === "title") return
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext("2d")!
    const frame = document.createElement("canvas")
    const fctx = frame.getContext("2d")!
    const light = document.createElement("canvas")
    const lctx = light.getContext("2d")!
    let raf = 0, cw = 0, ch = 0
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cw = window.innerWidth; ch = window.innerHeight
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr)
      cv.style.width = `${cw}px`; cv.style.height = `${ch}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)
    playMusic("village")
    const S = st.current
    const heroImg = img(charSheet(CHARS.hero))
    const smoke = img(SHEETS.smoke)

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((time - S.last) / 1000, 0.05)
      S.last = time
      const now = time / 1000
      if (!S.ready) { ctx.fillStyle = "#0c0a1a"; ctx.fillRect(0, 0, cw, ch); return }
      const store = useGameStore.getState()
      const paused = store.phase !== "playing" || !!store.dialog || store.mapOpen || S.fade.dir === 1
      const rt = scenes.current[S.scene]
      const sc = rt.scene
      const H = S.hero

      // fade
      if (S.fade.dir === 1) { S.fade.a = Math.min(1, S.fade.a + dt * 3.2); if (S.fade.a >= 1) { S.fade.then?.(); S.fade.then = null; S.fade.dir = -1 } }
      else S.fade.a = Math.max(0, S.fade.a - dt * 2.4)

      // night (village only)
      runtime.night += (runtime.nightTarget - runtime.night) * Math.min(1, dt * 2)

      // fast travel
      if (runtime.teleportTo) {
        const id = runtime.teleportTo
        runtime.teleportTo = null
        const d = runtime.doors[id]
        if (d) {
          if (S.scene !== "village") goTo("village", { x: d.x, y: d.y + 4, facing: "up" })
          else { H.x = d.x; H.y = d.y + 4; H.facing = "up"; H.path = []; S.cam.init = false; playSound("magic") }
        }
      }

      // ── hero movement
      let dx = 0, dy = 0
      if (!paused) {
        const k = S.keys
        if (k["arrowleft"] || k["a"]) dx -= 1
        if (k["arrowright"] || k["d"]) dx += 1
        if (k["arrowup"] || k["w"]) dy -= 1
        if (k["arrowdown"] || k["s"]) dy += 1
        if (Math.abs(runtime.joy.x) > 0.2 || Math.abs(runtime.joy.y) > 0.2) { dx = runtime.joy.x; dy = runtime.joy.y; H.path = [] }
        if (dx === 0 && dy === 0 && H.path.length) {
          const p = H.path[0]
          const ddx = p.x - H.x, ddy = p.y - H.y
          if (Math.hypot(ddx, ddy) < 2) H.path.shift()
          else { dx = ddx; dy = ddy }
          if (!H.path.length) {
            if (H.pendingNpc) { const n = H.pendingNpc; H.pendingNpc = null; setTimeout(() => talkTo(n), 0) }
            else if (H.pending) { const hs = H.pending; H.pending = null; setTimeout(() => doAction(hs.action), 0) }
          }
        }
        if (runtime.actionPressed) {
          runtime.actionPressed = false
          if (S.nearNpc) talkTo(S.nearNpc); else if (S.near) doAction(S.near.action); else attack()
        }
      }
      H.moving = dx !== 0 || dy !== 0
      if (H.moving) {
        const len = Math.hypot(dx, dy)
        const mag = Math.min(1, len)
        if (Math.abs(dx) > Math.abs(dy) * 1.1) H.facing = dx < 0 ? "left" : "right"
        else if (Math.abs(dy) > 0.01) H.facing = dy < 0 ? "up" : "down"
        const vx = (dx / len) * SPEED * mag * dt, vy = (dy / len) * SPEED * mag * dt
        const solids = { hits: (b: Box) => b.x < 0 || b.y < 0 || b.x + b.w > sc.w * TS || b.y + b.h > sc.h * TS || rt.solids.hits(b) }
        if (!solids.hits(footBox(H.x + vx, H.y))) H.x += vx
        else if (!H.path.length) {
          // slide around corners
          if (!solids.hits(footBox(H.x + vx, H.y - 3))) { H.x += vx; H.y -= 1.5 } else if (!solids.hits(footBox(H.x + vx, H.y + 3))) { H.x += vx; H.y += 1.5 }
        }
        if (!solids.hits(footBox(H.x, H.y + vy))) H.y += vy
        else if (!H.path.length) {
          if (!solids.hits(footBox(H.x - 3, H.y + vy))) { H.y += vy; H.x -= 1.5 } else if (!solids.hits(footBox(H.x + 3, H.y + vy))) { H.y += vy; H.x += 1.5 }
        }
        H.animT += dt
        const exit = S.scene !== "village" && sc.hotspots.find((h) => h.action.type === "exit")
        if (exit && H.y > exit.box.y + 9 && H.x > exit.box.x && H.x < exit.box.x + exit.box.w) doAction(exit.action)
        if (Math.random() < dt * 6) S.particles.push({ x: H.x + (Math.random() - 0.5) * 6, y: H.y, vx: (Math.random() - 0.5) * 8, vy: -6, life: 0.35, max: 0.35, col: S.scene === "village" ? "rgba(235,220,180,0.8)" : "rgba(180,170,160,0.6)", size: 2 })
      } else H.animT = 0
      H.attackT = Math.max(0, H.attackT - dt)
      H.hurtT = Math.max(0, H.hurtT - dt)
      runtime.player.x = H.x; runtime.player.y = H.y; runtime.facing = H.facing

      // ── actors
      const pb = footBox(H.x, H.y)
      for (const a of rt.actors) {
        a.talkT = Math.max(0, a.talkT - dt)
        a.hurt = Math.max(0, a.hurt - dt)
        if (a.dead > 0) { a.dead -= dt; continue }
        const dp = Math.hypot(a.x - H.x, a.y - H.y)
        if (a.def.kind === "npc" && a.def.bark && dp < 28 && a.talkT <= 0 && !a.def.lines) { a.talkT = 3.5; a.barkI++ }
        if (paused) { a.moving = false; continue }
        const wander = a.def.wander ?? 0
        if (wander <= 0 || (a.def.kind === "npc" && dp < 22)) { a.moving = false; a.animT = 0; continue }
        // monsters lazily drift towards the hero when close
        if (a.def.kind === "monster" && dp < 60 && dp > 10) { a.tx = H.x; a.ty = H.y }
        if (a.idle > 0) { a.idle -= dt; a.moving = false; a.animT = 0; continue }
        if (a.tx === null || a.ty === null) {
          const ang = Math.random() * Math.PI * 2, r = 8 + Math.random() * wander
          a.tx = a.def.x + Math.cos(ang) * r; a.ty = a.def.y + Math.sin(ang) * r
        }
        const ddx = a.tx - a.x, ddy = (a.ty as number) - a.y, d = Math.hypot(ddx, ddy)
        if (d < 2) { a.tx = null; a.ty = null; a.idle = 1 + Math.random() * 3; a.moving = false; continue }
        const sp = (a.def.speed ?? 20) * dt
        const nx = a.x + (ddx / d) * sp, ny = a.y + (ddy / d) * sp
        const nb = footBox(nx, ny)
        if (!rt.solids.hits(nb) && (a.def.kind === "monster" || !overlaps(nb, pb))) {
          a.x = nx; a.y = ny; a.moving = true; a.animT += dt
          a.facing = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? "left" : "right") : (ddy < 0 ? "up" : "down")
        } else { a.tx = null; a.ty = null; a.idle = 0.5; a.moving = false }
        if (a.def.kind === "monster" && dp < 9 && H.hurtT <= 0) {
          H.hurtT = 1
          playSound("hit")
          const kx = (H.x - a.x) / (dp || 1), ky = (H.y - a.y) / (dp || 1)
          for (let s = 0; s < 8; s++) if (!rt.solids.hits(footBox(H.x + kx * 2, H.y + ky * 2))) { H.x += kx * 2; H.y += ky * 2 }
        }
      }

      // ── nearest interaction
      S.near = null; S.nearNpc = null
      let bestD = 30
      for (const a of rt.actors) {
        if (a.def.kind !== "npc" || (!a.def.lines && !a.def.bark)) continue
        const d = Math.hypot(a.x - H.x, a.y - H.y)
        if (d < bestD) { bestD = d; S.nearNpc = a }
      }
      if (!S.nearNpc) {
        for (const h of rt.scene.hotspots) if (overlaps(pb, h.box)) { S.near = h; break }
      }
      runtime.nearLabel = S.nearNpc ? `TALK TO ${(S.nearNpc.def.name ?? "").toUpperCase()}` : S.near?.label ?? null

      // ── camera + scale
      const fit = Math.min(cw / (sc.w * TS + 24), ch / (sc.h * TS + 72))
      const base = Math.max(2, Math.min(5, Math.round(Math.min(cw / (16 * 21), ch / (16 * 12.5)))))
      const scale = sc.scale ? Math.max(2, Math.min(sc.scale + (cw > 1700 ? 1 : 0), Math.floor(fit) || 2)) : base
      S.scale = scale
      const vw = Math.ceil(cw / scale), vh = Math.ceil(ch / scale)
      if (frame.width !== vw || frame.height !== vh) { frame.width = vw; frame.height = vh; light.width = vw; light.height = vh }
      const sw = sc.w * TS, sh = sc.h * TS
      let tx = H.x - vw / 2, ty = H.y - 8 - vh / 2
      tx = sw <= vw ? (sw - vw) / 2 : Math.max(0, Math.min(sw - vw, tx))
      ty = sh <= vh ? (sh - vh) / 2 - 6 : Math.max(0, Math.min(sh - vh, ty))
      if (!S.cam.init) { S.cam.x = tx; S.cam.y = ty; S.cam.init = true }
      S.cam.x += (tx - S.cam.x) * Math.min(1, dt * 8)
      S.cam.y += (ty - S.cam.y) * Math.min(1, dt * 8)
      const camX = Math.round(S.cam.x), camY = Math.round(S.cam.y)

      // ── draw (native resolution)
      fctx.imageSmoothingEnabled = false
      fctx.fillStyle = sc.bg ?? "#4d7a2e"
      fctx.fillRect(0, 0, vw, vh)
      fctx.drawImage(sc.ground, -camX, -camY)

      // water: drifting glints
      if (sc.water) {
        for (const w of sc.water) {
          const x = w.c * TS - camX, y = w.r * TS - camY
          if (x < -16 || y < -16 || x > vw || y > vh) continue
          for (let k = 0; k < 2; k++) {
            const ph = (now * 0.4 + hash(w.c, w.r, k)) % 1
            if (ph > 0.6) continue
            fctx.globalAlpha = Math.sin((ph / 0.6) * Math.PI) * 0.75
            fctx.fillStyle = "#f2fdff"
            fctx.fillRect(Math.round(x + 2 + hash(w.c, w.r, k + 5) * 9 + ph * 3), Math.round(y + 3 + hash(w.c, w.r, k + 9) * 10), 3, 1)
          }
        }
        fctx.globalAlpha = 1
      }

      // door / hotspot markers on the ground
      for (const h of sc.hotspots) {
        if (!h.marker) continue
        const near = S.near === h
        if (!near && h.action.type !== "door" && h.action.type !== "game") continue
        const x = h.box.x + h.box.w / 2 - camX, y = h.box.y + h.box.h / 2 - camY
        fctx.globalAlpha = near ? 0.55 + Math.sin(now * 6) * 0.2 : 0.22
        fctx.fillStyle = "#fff2b8"
        fctx.beginPath(); fctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2); fctx.fill()
        fctx.globalAlpha = 1
      }

      // y-sorted sprites + actors
      type Item = { y: number; draw: () => void }
      const items: Item[] = []
      for (const s of sc.sprites) {
        const x = s.x - camX, y = s.y - camY
        if (x > vw + 8 || y > vh + 8 || x + s.rect[2] < -8 || y + s.rect[3] < -8) continue
        items.push({ y: s.baseY, draw: () => {
          const src = typeof s.src === "function" ? s.src() : s.src
          if (!src) return
          let sx = s.rect[0]
          if (s.anim) sx += (Math.floor(now * s.anim.fps) % s.anim.frames) * s.anim.dx
          if (s.sway) {
            // canopy sways (top rows offset), trunk stays put
            const off = Math.round(Math.sin(now * 1.3 + s.x * 0.05) * s.sway)
            const split = s.rect[3] - 10
            fctx.drawImage(src, sx, s.rect[1], s.rect[2], split, Math.round(x) + off, Math.round(y), s.rect[2], split)
            fctx.drawImage(src, sx, s.rect[1] + split, s.rect[2], s.rect[3] - split, Math.round(x), Math.round(y) + split, s.rect[2], s.rect[3] - split)
          } else fctx.drawImage(src, sx, s.rect[1], s.rect[2], s.rect[3], Math.round(x), Math.round(y), s.rect[2], s.rect[3])
        } })
      }
      for (const a of rt.actors) {
        if (a.dead > 0) continue
        const x = a.x - camX, y = a.y - camY
        if (x < -20 || y < -24 || x > vw + 20 || y > vh + 24) continue
        items.push({ y: a.y, draw: () => drawActor(fctx, a, x, y, now) })
      }
      items.push({ y: H.y, draw: () => {
        if (H.hurtT > 0 && Math.floor(now * 16) % 2) return
        drawShadow(fctx, H.x - camX, H.y - camY)
        if (!ready(heroImg)) return
        const col = DIR_COL[H.facing]
        const row = H.attackT > 0 ? 4 : H.moving ? Math.floor(H.animT * 9) % 4 : 0
        const bob = H.moving ? 0 : Math.round(Math.sin(now * 2.2) * 0.5)
        fctx.drawImage(heroImg, col * 16, row * 16, 16, 16, Math.round(H.x - camX - 8), Math.round(H.y - camY - 15 + bob), 16, 16)
        if (H.attackT > 0) drawSlash(fctx, H.x - camX, H.y - camY - 7, H.facing, 1 - H.attackT / 0.28)
      } })
      items.sort((p, q) => p.y - q.y)
      for (const it of items) it.draw()

      // particles
      for (const p of S.particles) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.kind === "smoke" ? 0 : 60 * dt
        const k = Math.max(0, p.life / p.max)
        if (p.kind === "smoke") {
          if (ready(smoke)) { const f = Math.min(5, Math.floor((1 - k) * 6)); fctx.drawImage(smoke, f * 32, 0, 32, 32, Math.round(p.x - camX - 16), Math.round(p.y - camY - 16), 32, 32) }
          continue
        }
        fctx.globalAlpha = k
        fctx.fillStyle = p.col
        fctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size)
      }
      fctx.globalAlpha = 1
      S.particles = S.particles.filter((p) => p.life > 0)

      // ambient life: butterflies by day, fireflies at night / in the mine
      const nightAmt = sc.id === "village" ? runtime.night : 0
      if (sc.id === "village" || sc.id === "cave") {
        for (let i = 0; i < 46; i++) {
          const wx = hash(i, 1, sc.w) * sw + Math.sin(now * (0.4 + hash(i, 3) * 0.5) + i) * 30
          const wy = hash(i, 2, sc.h) * sh + Math.cos(now * (0.3 + hash(i, 4) * 0.4) + i * 2) * 20
          const x = Math.round(wx - camX), y = Math.round(wy - camY)
          if (x < -4 || y < -4 || x > vw + 4 || y > vh + 4) continue
          if (nightAmt > 0.3 || sc.id === "cave") {
            const gl = 0.5 + 0.5 * Math.sin(now * 3 + i * 1.7)
            fctx.globalAlpha = gl * 0.9
            fctx.fillStyle = sc.id === "cave" ? "#9fe8ff" : "#fff7a8"
            fctx.fillRect(x, y, 1, 1)
          } else if (i % 3 === 0) {
            const flap = Math.sin(now * 14 + i) > 0 ? 2 : 1
            fctx.fillStyle = ["#ffffff", "#ffd76a", "#ff9ecf", "#9ad9ff"][i % 4]
            fctx.fillRect(x - flap, y, flap, 2); fctx.fillRect(x + 1, y, flap, 2)
          }
        }
        fctx.globalAlpha = 1
      }

      // ── lighting
      const dark = sc.id === "village" ? runtime.night * 0.78 : sc.dark
      if (dark > 0.02) {
        lctx.globalCompositeOperation = "source-over"
        lctx.clearRect(0, 0, vw, vh)
        lctx.fillStyle = sc.id === "cave" ? `rgba(6,8,18,${dark})` : sc.id === "village" ? `rgba(14,18,58,${dark})` : `rgba(24,14,8,${dark})`
        lctx.fillRect(0, 0, vw, vh)
        lctx.globalCompositeOperation = "destination-out"
        const hole = (x: number, y: number, r: number, s: number) => {
          if (x < -r || y < -r || x > vw + r || y > vh + r) return
          const gr = lctx.createRadialGradient(x, y, 0, x, y, r)
          gr.addColorStop(0, `rgba(0,0,0,${s})`); gr.addColorStop(1, "rgba(0,0,0,0)")
          lctx.fillStyle = gr; lctx.fillRect(x - r, y - r, r * 2, r * 2)
        }
        hole(H.x - camX, H.y - 8 - camY, sc.id === "cave" ? 56 : 60, 0.9)
        for (const l of sc.lights) {
          const fl = l.flicker ? 1 + Math.sin(now * 9 + l.x) * 0.04 * l.flicker + Math.sin(now * 23 + l.y) * 0.03 * l.flicker : 1
          hole(l.x - camX, l.y - camY, l.r * fl * (sc.id === "village" ? 0.8 : 1), 0.9)
        }
        fctx.drawImage(light, 0, 0)
        fctx.globalCompositeOperation = "lighter"
        for (const l of sc.lights) {
          const x = l.x - camX, y = l.y - camY
          if (x < -l.r || y < -l.r || x > vw + l.r || y > vh + l.r) continue
          const fl = l.flicker ? 1 + Math.sin(now * 11 + l.x) * 0.06 * l.flicker : 1
          const r = l.r * 0.5 * fl
          const gr = fctx.createRadialGradient(x, y, 0, x, y, r)
          gr.addColorStop(0, `rgba(${l.color},${0.16 * dark})`); gr.addColorStop(1, `rgba(${l.color},0)`)
          fctx.fillStyle = gr; fctx.fillRect(x - r, y - r, r * 2, r * 2)
        }
        fctx.globalCompositeOperation = "source-over"
      } else if (sc.id === "village") {
        fctx.fillStyle = "rgba(255,214,150,0.045)"; fctx.fillRect(0, 0, vw, vh)
      }

      // ── upscale to the screen
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = "#07060d"
      ctx.fillRect(0, 0, cw, ch)
      ctx.drawImage(frame, 0, 0, vw * scale, vh * scale)

      // vignette
      const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.38, cw / 2, ch / 2, Math.max(cw, ch) * 0.78)
      vg.addColorStop(0, "rgba(0,0,0,0)")
      vg.addColorStop(1, `rgba(5,6,20,${0.32 + dark * 0.25})`)
      ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch)

      // ── crisp screen-space UI: building signs, markers, bubbles, prompt
      const toS = (x: number, y: number) => [(x - camX) * scale, (y - camY) * scale] as const
      if (sc.id === "village") {
        for (const b of BUILDINGS) {
          if (!b.label) continue
          const d = doorOf(b)
          const [sx, sy] = toS(b.c * TS + d.w / 2, b.r * TS - 2)
          if (sx < -200 || sx > cw + 200 || sy < -100 || sy > ch + 200) continue
          drawSign(ctx, b.label, b.section ?? "", b.accent ?? "#c8463b", sx, sy, S.near?.id === `door-${b.id}`)
        }
      }
      for (const h of sc.hotspots) {
        if (!h.marker || h.markerX === undefined || h.markerY === undefined) continue
        if (h.action.type === "door") continue
        const [sx, sy] = toS(h.markerX, h.markerY)
        const near = S.near === h
        drawMarker(ctx, sx, sy + Math.sin(now * 4 + h.markerX) * 4, near, scale)
      }
      for (const a of rt.actors) {
        if (a.def.kind !== "npc") continue
        const [sx, sy] = toS(a.x, a.y - 20)
        if (a.talkT > 0 && a.def.bark && !a.def.lines) {
          const k = Math.min(1, a.talkT * 2, (3.5 - a.talkT) * 6)
          drawBubble(ctx, a.def.bark[a.barkI % a.def.bark.length], sx, sy, k)
        } else if (a.def.lines) drawMarker(ctx, sx, sy - 6 + Math.sin(now * 4 + a.x) * 3, S.nearNpc === a, scale, "!")
      }
      if (runtime.nearLabel && !paused) {
        const [sx, sy] = toS(H.x, H.y - 22)
        drawPrompt(ctx, runtime.nearLabel, sx, sy - 10, now, matchMedia("(pointer: coarse)").matches)
      }

      // fade overlay (iris)
      if (S.fade.a > 0.001) {
        ctx.fillStyle = `rgba(7,6,13,${S.fade.a})`
        ctx.fillRect(0, 0, cw, ch)
      }
    }
    S.last = performance.now()
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "title"])

  return (
    <>
      <canvas ref={canvasRef} className="pixelated" style={{ display: "block", position: "absolute", inset: 0, cursor: "pointer" }} />
      {phase === "title" && <TitleScreen />}
      {phase !== "title" && <HUD />}
      {phase !== "title" && <AreaTitle />}
      {phase !== "title" && <AchievementToast />}
      {phase !== "title" && <TouchControls />}
      <DialogBox />
      <BuildingModal />
      <Arcade />
    </>
  )
}

// ── drawing helpers ─────────────────────────────────────────────
function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w = 6) {
  ctx.fillStyle = "rgba(20,30,10,0.35)"
  ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), w, 2.2, 0, 0, Math.PI * 2); ctx.fill()
}

function drawActor(ctx: CanvasRenderingContext2D, a: ActorRT, x: number, y: number, now: number) {
  const im = img(a.def.sheet)
  if (!ready(im)) return
  const kind = a.def.kind
  drawShadow(ctx, x, y, kind === "animal" ? 5 : 6)
  if (kind === "animal") {
    const f = a.moving ? Math.floor(a.animT * 6) % 2 : Math.floor(now * 1.5 + a.def.x) % 2
    const flip = a.facing === "right"
    ctx.save()
    ctx.translate(Math.round(x), 0)
    if (flip) ctx.scale(-1, 1)
    ctx.drawImage(im, f * 16, 0, 16, 16, -8, Math.round(y - 14), 16, 16)
    ctx.restore()
    return
  }
  const col = DIR_COL[a.facing]
  const row = a.moving ? Math.floor(a.animT * 8) % 4 : 0
  const bob = kind === "monster" ? Math.round(Math.sin(now * 5 + a.def.x) * 1) : 0
  if (a.hurt > 0) ctx.globalAlpha = 0.6
  ctx.drawImage(im, col * 16, row * 16, 16, 16, Math.round(x - 8), Math.round(y - 15 + bob), 16, 16)
  ctx.globalAlpha = 1
}

function drawSlash(ctx: CanvasRenderingContext2D, x: number, y: number, f: Facing, p: number) {
  const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[f]
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(ang)
  ctx.strokeStyle = `rgba(255,255,255,${1 - p})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(4, 0, 10, -1.2 + p * 0.6, 1.2 + p * 0.6)
  ctx.stroke()
  ctx.restore()
}

function drawSign(ctx: CanvasRenderingContext2D, title: string, sub: string, accent: string, cx: number, bottom: number, active: boolean) {
  const fp = fontFamily("--ff-pixel")
  ctx.font = `10px ${fp}`
  const tw = ctx.measureText(title).width
  ctx.font = `7px ${fp}`
  const sw2 = ctx.measureText(sub).width
  const w = Math.round(Math.max(tw, sw2) + 26), h = 34
  const x = Math.round(cx - w / 2), y = Math.round(bottom - h - (active ? 6 : 0))
  ctx.fillStyle = "rgba(10,6,2,0.35)"; ctx.fillRect(x + 3, y + 5, w, h)
  ctx.fillStyle = "#2a1606"; ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
  ctx.fillStyle = "#8a5a2c"; ctx.fillRect(x, y, w, h)
  ctx.fillStyle = "#a8743c"; ctx.fillRect(x, y, w, 3)
  ctx.fillStyle = accent; ctx.fillRect(x, y + h - 13, w, 10)
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x, y + h - 13, w, 1)
  ctx.textAlign = "center"
  ctx.font = `10px ${fp}`
  ctx.fillStyle = "#2a1606"; ctx.fillText(title, cx + 1, y + 16)
  ctx.fillStyle = "#fff4dc"; ctx.fillText(title, cx, y + 15)
  ctx.font = `7px ${fp}`
  ctx.fillStyle = "#fff"; ctx.fillText(sub, cx, y + h - 5)
  ctx.textAlign = "left"
  if (active) { ctx.strokeStyle = "#ffe39a"; ctx.lineWidth = 2; ctx.strokeRect(x - 4, y - 4, w + 8, h + 8) }
}

function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean, scale: number, glyph?: string) {
  const s = Math.max(8, scale * 2.5)
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  if (glyph) {
    ctx.fillStyle = "#1d1006"; ctx.fillRect(-s * 0.6 - 2, -s * 1.3 - 2, s * 1.2 + 4, s * 1.3 + 4)
    ctx.fillStyle = active ? "#ffd76a" : "#fff4dc"; ctx.fillRect(-s * 0.6, -s * 1.3, s * 1.2, s * 1.3)
    ctx.fillStyle = "#c8463b"; ctx.font = `${Math.round(s)}px ${fontFamily("--ff-pixel")}`; ctx.textAlign = "center"
    ctx.fillText(glyph, 1, -s * 0.2)
    ctx.restore()
    return
  }
  ctx.fillStyle = "#1d1006"
  ctx.beginPath(); ctx.moveTo(-s * 0.7 - 2, -s - 2); ctx.lineTo(s * 0.7 + 2, -s - 2); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill()
  ctx.fillStyle = active ? "#ffd76a" : "#fff4dc"
  ctx.beginPath(); ctx.moveTo(-s * 0.7, -s); ctx.lineTo(s * 0.7, -s); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill()
  ctx.restore()
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
  ctx.fillStyle = "#1d1006"; ctx.fillRect(x + 6, yy + 5, kw, 20)
  ctx.fillStyle = "#c8463b"; ctx.fillRect(x + 7, yy + 6, kw - 2, 16)
  ctx.fillStyle = "#e86a5c"; ctx.fillRect(x + 7, yy + 6, kw - 2, 2)
  ctx.textAlign = "center"
  ctx.fillStyle = "#fff4dc"; ctx.fillText(key, x + 6 + kw / 2, yy + 19)
  ctx.textAlign = "left"
  ctx.fillStyle = "#3a2412"; ctx.fillText(text, x + kw + 14, yy + 19)
  ctx.fillStyle = "#1d1006"; ctx.fillRect(Math.round(cx) - 5, yy + h + 2, 10, 3)
  ctx.fillStyle = "#fbf1d6"; ctx.fillRect(Math.round(cx) - 3, yy + h, 6, 3)
}

function drawBubble(ctx: CanvasRenderingContext2D, text: string, cx: number, by: number, alpha: number) {
  if (alpha <= 0) return
  ctx.globalAlpha = alpha
  ctx.font = `15px ${fontFamily("--ff-pixelify")}`
  const words = text.split(" ")
  const lines: string[] = []
  let cur = ""
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > 190 && cur) { lines.push(cur); cur = w } else cur = t }
  if (cur) lines.push(cur)
  const lw = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const w = Math.round(lw + 20), h = lines.length * 18 + 12
  const x = Math.round(cx - w / 2), y = Math.round(by - h)
  ctx.fillStyle = "#1d1006"; ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, w, h)
  ctx.fillStyle = "#1d1006"; ctx.fillRect(Math.round(cx) - 2, y + h + 2, 6, 4); ctx.fillRect(Math.round(cx), y + h + 6, 3, 3)
  ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(cx) - 1, y + h, 4, 4)
  ctx.fillStyle = "#2a1a10"
  lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 17 + i * 18))
  ctx.globalAlpha = 1
}
