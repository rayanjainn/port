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
  const cam = useRef({ x: 0, z: 0, init: false, zoom: 1, intro: 1, speed: 1 })
  const post = useMemo(() => (needsPost() ? new Post() : null), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const w = new World(rt)
    world.current = w
    scene.add(w.group)
    scene.background = w.terrain.bg.clone()
    cam.current.init = false
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

  useEffect(() => {
    const el = gl.domElement
    const lost = (e: Event) => { e.preventDefault(); useGameStore.getState().setView("2d", false) }
    el.addEventListener("webglcontextlost", lost)
    return () => el.removeEventListener("webglcontextlost", lost)
  }, [gl])

  useFrame((state, dtRaw) => {
    const w = world.current, S = engine.state
    if (!w || !S) return
    const dt = Math.min(dtRaw, 0.05)
    const sc = rt.scene, H = S.hero
    const cam3 = camera as THREE.PerspectiveCamera
    rig.camera = cam3
    rig.w = size.width; rig.h = size.height
    const C = cam.current

    // framing: ~17 internal px per tile at the focus, rooms zoom to fit
    const aspect = size.width / size.height
    const tanH = Math.tan((FOV * Math.PI / 180) / 2)
    const baseTiles = size.height / px / 14.5
    let fit = 1
    if (sc.scale) fit = Math.max(0.7, Math.min(1.5, Math.min(baseTiles * aspect / (sc.w + 2.5), baseTiles / Math.sin(PITCH) / (sc.h + 3.5))))
    C.zoom += (rig.zoom * fit - C.zoom) * Math.min(1, dt * 8)
    // intro glide: eased, monotone, ends exactly on the normal framing (x = 0)
    C.intro = Math.min(1, C.intro + (dtRaw * C.speed) / Math.max(0.2, fx.intro.strength))
    const x = 1 - C.intro * C.intro * (3 - 2 * C.intro)
    const pitch = PITCH - (fx.horizon.on ? fx.horizon.strength * Math.PI / 180 : 0) + 0.12 * x
    const dist = (baseTiles / (2 * tanH) / C.zoom) * (1 + 0.28 * x)
    const halfW = dist * tanH * aspect, halfD = dist * tanH / Math.sin(PITCH)

    let tx = H.x * P, tz = (H.y - 8) * P
    tx = clampAxis(tx, halfW, sc.w, 2)
    tz = clampAxis(tz, halfD * 1.05, sc.h, 1)
    if (!C.init) { C.x = tx; C.z = tz; C.init = true }
    C.x += (tx - C.x) * Math.min(1, dt * 8)
    C.z += (tz - C.z) * Math.min(1, dt * 8)
    const mx = rig.mx * 0.45, mz = rig.my * 0.3
    tmp.set(C.x + mx, 0, C.z + mz)
    cam3.fov = FOV; cam3.near = 1; cam3.far = 260
    cam3.position.set(tmp.x, Math.sin(pitch) * dist, tmp.z + Math.cos(pitch) * dist)
    cam3.lookAt(tmp)
    cam3.updateProjectionMatrix()
    cam3.updateMatrixWorld()

    w.sh.uFog.value.set(dist * 1.1, dist * 3.2, 0.75)
    w.res.set(size.width, size.height)
    w.update(engine.now || state.clock.elapsedTime, tmp)
    if (post) post.render(gl, scene, camera, fx.tiltShift.on ? fx.tiltShift.strength : 0, fx.bloom.on ? fx.bloom.strength * Math.max(0, Math.min(1, (w.dark - 0.2) / 0.5)) : 0)

    const v = new THREE.Vector3()
    overlay.update?.((x, y, h) => {
      w.anchor(x, y, h, v).project(cam3)
      return [(v.x + 1) / 2 * size.width, (1 - v.y) / 2 * size.height, v.z < 1] as const
    }, engine.now, size.width, size.height)

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
      const r = el.getBoundingClientRect()
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
      <div ref={root} className="w3d" style={{ position: "absolute", inset: 0, background: "#0c0a1a", cursor: "pointer", touchAction: "none" }}>
        <Canvas flat dpr={1 / px} frameloop="always" camera={{ fov: FOV, near: 1, far: 260 }}
          gl={{ antialias: false, stencil: true, alpha: false, powerPreference: "high-performance" }}
          onError={fail}>
          <Stage rt={rt} px={px} />
        </Canvas>
        <Overlay3D key={sceneId} rt={rt} />
        <div ref={(e) => { ui.vig = e }} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6, background: "radial-gradient(ellipse at 50% 50%, rgba(5,6,20,0) 42%, rgba(5,6,20,.42) 100%)" }} />
        <div ref={(e) => { ui.fade = e }} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 7, background: "#07060d", opacity: 1 }} />
        <style>{`.w3d canvas { image-rendering: pixelated; image-rendering: crisp-edges; }`}</style>
      </div>
    </Boundary>
  )
}
