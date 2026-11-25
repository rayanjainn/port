"use client"
/* eslint-disable react-hooks/immutability -- three.js objects from R3F hooks are mutated by design */
// "3D pixel art" view of the running simulation: same scene, same actors, same interactions, different renderer.
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/lib/store"
import { engine, type SceneRT } from "@/lib/engine"
import { TS } from "@/lib/world/core"
import { World } from "./three/world"
import Overlay3D from "./three/Overlay3D"
import { overlay, rig, ui, isOutdoor } from "./three/bus"
import { fx, needsPost } from "./three/fx"
import { Post } from "./three/post"
import { runtime } from "@/lib/runtime"

const FOV = 34
const PITCH = 45 * Math.PI / 180
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
const P = 1 / TS
/** the canvas is rendered this many texels larger on every side and shifted back by the sub-texel remainder, so the camera can glide while texels stay put */
const MARGIN = 2

/** critically damped spring (frame-rate independent): moves `pos` toward `target`, returns [pos, vel] in `out` */
function spring(pos: number, vel: number, target: number, omega: number, dt: number, out: [number, number]) {
  const x = omega * dt
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const d = pos - target
  const t = (vel + omega * d) * dt
  out[1] = (vel - omega * t) * e
  out[0] = target + (d + t) * e
}
const sp = [0, 0] as [number, number]
const v3 = new THREE.Vector3()
const shift = { x: 0, y: 0 }
const frames = new Float32Array(120)
let frameN = 0


class Boundary extends Component<{ onError: () => void; children: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() { return { bad: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.bad ? null : this.props.children }
}

function clampAxis(t: number, half: number, size: number, margin: number) {
  if (size <= half * 2 - margin * 2) return size / 2
  return Math.max(half - margin, Math.min(size - half + margin, t))
}

function Stage({ rt, px }: { rt: SceneRT; px: number }) {
  const { scene, camera, size, gl } = useThree()
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") Object.assign(window, { __fx: fx, __runtime: runtime })
  const world = useRef<World | null>(null)
  const cam = useRef({ x: 0, z: 0, vx: 0, vz: 0, sky: 0, init: false, zoom: 1, intro: 1, speed: 1 })
  const post = useMemo(() => (needsPost() ? new Post() : null), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const M = MARGIN * px

  useEffect(() => {
    const w = new World(rt)
    world.current = w
    scene.add(w.group)
    scene.background = w.terrain.bg.clone()
    cam.current.init = false; cam.current.vx = 0; cam.current.vz = 0
    // short glide from slightly higher into the normal follow camera on scene entry; any input skips it
    cam.current.intro = fx.intro.on && !reduced() ? 0 : 1
    cam.current.speed = 1
    const skip = () => { cam.current.speed = 8 }
    window.addEventListener("keydown", skip); window.addEventListener("pointerdown", skip); window.addEventListener("wheel", skip)
    return () => {
      scene.remove(w.group); w.dispose(); world.current = null
      window.removeEventListener("keydown", skip); window.removeEventListener("pointerdown", skip); window.removeEventListener("wheel", skip)
    }
  }, [rt, scene])

  useEffect(() => () => post?.dispose(), [post])

  // dev-only readout behind ?stats: fps, draw calls, triangles, instance counts
  const stat = useRef({ el: null as HTMLDivElement | null, n: 0, t: 0 })
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !new URLSearchParams(window.location.search).has("stats")) return
    const el = document.createElement("div")
    el.style.cssText = "position:fixed;left:8px;bottom:56px;z-index:200;font:11px monospace;color:#9f9;background:rgba(0,0,0,.7);padding:4px 6px;pointer-events:none;white-space:pre"
    document.body.appendChild(el)
    const holder = stat.current
    holder.el = el
    gl.info.autoReset = false
    return () => { el.remove(); holder.el = null; gl.info.autoReset = true }
  }, [gl])

  useEffect(() => {
    const el = gl.domElement
    const lost = (e: Event) => { e.preventDefault(); useGameStore.getState().setView("2d", false) }
    el.addEventListener("webglcontextlost", lost)
    return () => el.removeEventListener("webglcontextlost", lost)
  }, [gl])

  // one projection closure per mount, writing into a scratch tuple: no per-frame allocation
  const out = useMemo(() => [0, 0, true] as [number, number, boolean], [])
  const proj = useMemo(() => (x: number, y: number, h: number) => {
    const w = world.current
    if (!w) { out[0] = out[1] = 0; out[2] = false; return out }
    w.anchor(x, y, h, v3).project(camera)
    out[0] = (v3.x + 1) / 2 * size.width - M + shift.x; out[1] = (1 - v3.y) / 2 * size.height - M + shift.y; out[2] = v3.z < 1
    return out
  }, [camera, size.width, size.height, M, out])

  useFrame((state, dtRaw) => {
    const w = world.current, S = engine.state
    if (!w || !S) return
    const dt = Math.min(dtRaw, 0.05)
    const sc = rt.scene, H = S.hero
    const cam3 = camera as THREE.PerspectiveCamera
    rig.camera = cam3
    rig.w = size.width; rig.h = size.height
    const C = cam.current

    // framing: ~17 internal px per tile at the focus, rooms zoom to fit. The canvas carries MARGIN texels of overscan on each side.
    const visW = size.width - 2 * M, visH = size.height - 2 * M
    const aspect = visW / visH
    const tanH = Math.tan((FOV * Math.PI / 180) / 2)
    const baseTiles = size.height / px / 14.5          // full buffer
    const baseVis = visH / px / 14.5
    let fit = 1
    if (sc.scale) fit = Math.max(0.7, Math.min(1.5, Math.min(baseVis * aspect / (sc.w + 2.5), baseVis / Math.sin(PITCH) / (sc.h + 3.5))))
    C.zoom += (rig.zoom * fit - C.zoom) * Math.min(1, dt * 8)
    // intro glide: eased, monotone, ends exactly on the normal framing (x = 0)
    C.intro = Math.min(1, C.intro + (dtRaw * C.speed) / Math.max(0.2, fx.intro.strength))
    const x = 1 - C.intro * C.intro * (3 - 2 * C.intro)
    const pitch = PITCH - (fx.horizon.on ? fx.horizon.strength * Math.PI / 180 : 0) + 0.12 * x
    const dist = (baseTiles / (2 * tanH) / C.zoom) * (1 + 0.28 * x)
    const halfH = dist * tanH * (visH / size.height)
    const halfW = halfH * aspect, halfD = halfH / Math.sin(PITCH)

    let tx = H.x * P, tz = (H.y - 8) * P
    tx = clampAxis(tx, halfW, sc.w, 2)
    tz = clampAxis(tz, halfD * 1.05, sc.h, 1)
    if (!C.init) { C.x = tx; C.z = tz; C.vx = 0; C.vz = 0; C.init = true }
    spring(C.x, C.vx, tx, 9, dt, sp); C.x = sp[0]; C.vx = sp[1]
    spring(C.z, C.vz, tz, 9, dt, sp); C.z = sp[0]; C.vz = sp[1]
    const mx = rig.mx * 0.45, mz = rig.my * 0.3
    // smooth pixel-art camera: the render snaps to whole texels along the screen axes, the canvas is shifted back by the remainder
    const unit = (2 * dist * tanH) / (size.height / px)          // world units per texel at the focus
    const sinP = Math.sin(pitch)
    const wantX = C.x + mx, wantZ = C.z + mz
    const unitZ = unit / sinP
    const snapX = Math.round(wantX / unit) * unit, snapZ = Math.round(wantZ / unitZ) * unitZ
    tmp.set(snapX, 0, snapZ)
    const dpr = window.devicePixelRatio || 1
    const q = (v: number) => Math.round(v * dpr) / dpr
    shift.x = q(-((wantX - snapX) / unit) * px); shift.y = q(-((wantZ - snapZ) * sinP / unit) * px)
    if (ui.shift) ui.shift.style.transform = `translate3d(${shift.x}px,${shift.y}px,0)`
    cam3.fov = FOV; cam3.near = 1; cam3.far = 260
    cam3.position.set(tmp.x, sinP * dist, tmp.z + Math.cos(pitch) * dist)
    cam3.lookAt(tmp)
    cam3.updateProjectionMatrix()
    cam3.updateMatrixWorld()
    // sky: a faint sky-tinted haze mid-map, more sky near the north edge or zoomed out; smoothed, subtler on narrow screens
    const topZ = C.z - halfD
    const want = Math.max(1 - Math.min(1, Math.max(0, topZ / (halfD * 0.8))), Math.min(1, Math.max(0, (1 - C.zoom) / 0.3)))
    C.sky += (want - C.sky) * Math.min(1, dt * 3)
    const narrow = size.width < 700 ? 0.55 : 1
    w.skyAmt = C.sky
    w.skyFrac = (0.06 + 0.17 * C.sky) * narrow
    // sprites that move (hero, actors, particles) snap to the same texel grid so they never wobble against the ground
    w.snap.x = snapX; w.snap.z = snapZ; w.snap.ux = unit; w.snap.uz = unitZ

    if (process.env.NODE_ENV !== "production") (window as unknown as { __w3: unknown }).__w3 = w
    w.sh.uFog.value.set(dist * (1.1 - 0.3 * C.sky), dist * (3.2 - 1.0 * C.sky), 0.75)
    w.res.set(size.width, size.height)
    w.update(engine.now || state.clock.elapsedTime, tmp)
    if (post) post.render(gl, scene, camera, fx.tiltShift.on ? fx.tiltShift.strength : 0, fx.bloom.on ? fx.bloom.strength * Math.max(0, Math.min(1, (w.dark - 0.2) / 0.5)) : 0)

    overlay.update?.(proj, engine.now, size.width - 2 * M, size.height - 2 * M)

    const st = stat.current
    if (st.el) {
      frames[frameN++ % 120] = dtRaw * 1000
      st.n++
      const now2 = performance.now()
      if (now2 - st.t > 500) {
        const c = w.counts(), info = gl.info.render
        const n = Math.min(frameN, 120), sorted = Array.from(frames.subarray(0, n)).sort((a, b) => a - b)
        const p50 = sorted[Math.floor(n * 0.5)] ?? 0, p95 = sorted[Math.floor(n * 0.95)] ?? 0
        let bars = ""
        for (let i = Math.max(0, n - 48); i < n; i++) bars += "\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588"[Math.max(0, Math.min(7, Math.floor(frames[(frameN - n + i + 120 * 2) % 120] / 6)))]
        const txt = `${rt.scene.id}  fps ${(st.n * 1000 / (now2 - st.t)).toFixed(0)}  frame p50 ${p50.toFixed(1)} p95 ${p95.toFixed(1)} ms\ncalls ${info.calls}  tris ${info.triangles}\nbatches ${c.batches}  instances ${c.instances}\n${bars}`
        st.el.textContent = txt
        ;(window as unknown as { __stats: unknown }).__stats = { scene: rt.scene.id, calls: info.calls, tris: info.triangles, p50, p95, ...c }
        st.n = 0; st.t = now2
      }
      gl.info.reset()
    }
    if (ui.fade) ui.fade.style.opacity = String(Math.min(1, S.fade.a))
    if (ui.vig) {
      const dark = isOutdoor(sc) ? (w.sh.uAmb.value.b < 0.8 ? 0.4 : 0.1) : sc.dark * 0.3
      ui.vig.style.opacity = String(0.8 + dark)
    }
  }, post ? 1 : 0)
  return null
}

export default function World3D() {
  const sceneId = useGameStore((s) => s.sceneId)
  const rt = useMemo(() => engine.scenes[sceneId], [sceneId])
  const [win, setWin] = useState({ w: 1280, h: 720 })
  const root = useRef<HTMLDivElement>(null)
  const fail = () => useGameStore.getState().setView("2d", false)

  useEffect(() => {
    const on = () => setWin({ w: window.innerWidth, h: window.innerHeight })
    on()
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])

  // device px per rendered px: small and chunky on desktop, finer on phones so the view still fits
  const px = Math.max(2, Math.min(4, Math.round(Math.min(win.w, win.h) / 215)))

  // pointer: click-to-walk / interact via the ground plane, wheel + pinch zoom, mouse parallax
  useEffect(() => {
    const el = root.current
    if (!el) return
    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2()
    const pick = (cx: number, cy: number) => {
      const cam = rig.camera
      if (!cam) return
      const r = (ui.shift ?? el).getBoundingClientRect()
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, cam)
      if (ray.ray.intersectPlane(plane, hit)) engine.click(hit.x * TS, hit.z * TS)
    }
    const ptrs = new Map<number, { x: number; y: number; x0: number; y0: number; t0: number }>()
    let pinch = 0, pinchD = 0
    const zoom = (f: number) => { rig.zoom = Math.max(0.65, Math.min(1.8, rig.zoom * f)) }
    const down = (e: PointerEvent) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() })
      if (e.pointerType !== "touch") { if (e.button === 0) pick(e.clientX, e.clientY); return }
      if (ptrs.size === 2) { pinch = 1; const [a, b] = [...ptrs.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y) }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse") { rig.mx = (e.clientX / window.innerWidth - 0.5) * 2; rig.my = (e.clientY / window.innerHeight - 0.5) * 2 }
      const p = ptrs.get(e.pointerId)
      if (!p) return
      p.x = e.clientX; p.y = e.clientY
      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchD > 0) zoom(d / pinchD)
        pinchD = d
      }
    }
    const up = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId)
      ptrs.delete(e.pointerId)
      if (e.pointerType === "touch" && p && !pinch && Math.hypot(p.x - p.x0, p.y - p.y0) < 12 && performance.now() - p.t0 < 600) pick(p.x, p.y)
      if (!ptrs.size) pinch = 0
    }
    const wheel = (e: WheelEvent) => zoom(Math.exp(-e.deltaY * 0.0012))
    el.addEventListener("pointerdown", down)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    el.addEventListener("wheel", wheel, { passive: true })
    return () => {
      el.removeEventListener("pointerdown", down)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      el.removeEventListener("wheel", wheel)
    }
  }, [])

  if (!rt) return null
  return (
    <Boundary onError={fail}>
      <div ref={root} className="w3d" style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0c0a1a", cursor: "pointer", touchAction: "none" }}>
        <div ref={(e) => { ui.shift = e }} style={{ position: "absolute", left: -MARGIN * px, top: -MARGIN * px, right: -MARGIN * px, bottom: -MARGIN * px, willChange: "transform" }}>
          <Canvas flat dpr={1 / px} frameloop="always" camera={{ fov: FOV, near: 1, far: 260 }}
            gl={{ antialias: false, stencil: true, alpha: false, powerPreference: "high-performance" }}
            onError={fail}>
            <Stage rt={rt} px={px} />
          </Canvas>
        </div>
        <Overlay3D key={sceneId} rt={rt} />
        <div ref={(e) => { ui.vig = e }} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6, background: "radial-gradient(ellipse at 50% 50%, rgba(5,6,20,0) 42%, rgba(5,6,20,.42) 100%)" }} />
        <div ref={(e) => { ui.fade = e }} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 7, background: "#07060d", opacity: 1 }} />
        <style>{`.w3d canvas { image-rendering: pixelated; image-rendering: crisp-edges; }`}</style>
      </div>
    </Boundary>
  )
}
