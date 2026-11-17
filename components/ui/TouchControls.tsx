"use client"
import { useEffect, useRef, useState } from "react"
import { runtime } from "@/lib/runtime"
import { useGameStore } from "@/lib/store"

/** Floating joystick + action button, only on touch devices. */
export default function TouchControls() {
  const [touch, setTouch] = useState(false)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const origin = useRef<{ x: number; y: number; id: number } | null>(null)
  const phase = useGameStore((s) => s.phase)

  // matchMedia is client-only; detect after hydration
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTouch(window.matchMedia("(pointer: coarse)").matches) }, [])
  if (!touch || phase !== "playing") return null

  const R = 46
  const move = (e: React.PointerEvent) => {
    if (!origin.current || e.pointerId !== origin.current.id) return
    let dx = e.clientX - origin.current.x, dy = e.clientY - origin.current.y
    const d = Math.hypot(dx, dy)
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R }
    setKnob({ x: dx, y: dy })
    runtime.joy = { x: dx / R, y: dy / R }
  }
  const end = () => { origin.current = null; setKnob({ x: 0, y: 0 }); runtime.joy = { x: 0, y: 0 } }

  return (
    <>
      <div
        className="touch-stick"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId }; move(e) }}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      >
        <i className="touch-ring" aria-hidden />
        <div className="touch-knob" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      </div>
      <button className="touch-act" aria-label="Action" onPointerDown={() => { runtime.actionPressed = true }}>
        {runtime.nearLabel ? "GO" : "A"}
      </button>
    </>
  )
}
