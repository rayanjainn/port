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
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId }; move(e) }}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        style={{
          position: "fixed", left: 22, bottom: 26, zIndex: 60, width: 132, height: 132, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,246,220,.18), rgba(29,16,6,.35))",
          border: "3px solid rgba(255,246,220,.55)", touchAction: "none",
        }}
      >
        <div style={{
          position: "absolute", left: "50%", top: "50%", width: 56, height: 56, borderRadius: "50%",
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          background: "linear-gradient(180deg, #fff1b8, #f5a623)", border: "3px solid #1d1006",
          boxShadow: "0 4px 0 #1d1006",
        }} />
      </div>
      <button
        onPointerDown={() => { runtime.actionPressed = true }}
        style={{
          position: "fixed", right: 26, bottom: 40, zIndex: 60, width: 78, height: 78, borderRadius: "50%",
          fontFamily: "var(--font-pixel)", fontSize: 11, color: "#fff4dc",
          background: "linear-gradient(180deg, #e86a5c, #b03c32)", border: "3px solid #1d1006",
          boxShadow: "inset 0 3px 0 rgba(255,255,255,.3), 0 5px 0 #1d1006", touchAction: "none",
        }}
      >
        {runtime.nearLabel ? "GO" : "A"}
      </button>
    </>
  )
}
