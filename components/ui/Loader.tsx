"use client"
import { useEffect, useRef, useState } from "react"
import { useLoading } from "@/lib/loading"
import { charSheet, CHARS } from "@/lib/na"

const STEPS = [
  "Planting the forest",
  "Filling the river",
  "Raising the town hall",
  "Stoking the forge",
  "Hanging the paintings",
  "Waking the villagers",
  "Opening the gates",
]

/** Boot screen: the hero walks through a scrolling forest while the world's art streams in. */
export default function Loader() {
  const target = useLoading((s) => s.progress)
  const done = useLoading((s) => s.done)
  const [shown, setShown] = useState(0)
  const [gone, setGone] = useState(false)
  const val = useRef(0)

  // ease the bar toward the real progress, and creep while the engine code is still downloading
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const goal = Math.max(target, Math.min(0.08, val.current + 0.0015))
      val.current += (goal - val.current) * 0.08
      if (Math.abs(goal - val.current) < 0.001) val.current = goal
      setShown(val.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [target])

  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setGone(true), 700)
    return () => clearTimeout(id)
  }, [done])

  if (gone) return null
  const pct = Math.round(shown * 100)
  const step = pct >= 100 ? "Ready" : STEPS[Math.min(STEPS.length - 1, Math.floor(shown * STEPS.length))]

  return (
    <div role="status" aria-live="polite" aria-label={`Loading world, ${pct}%`} className="loader-root" style={{ opacity: done ? 0 : 1, transform: done ? "scale(1.03)" : "none" }}>
      <div aria-hidden className="loader-flies">{Array.from({ length: 16 }).map((_, i) => <span key={i} style={{ left: `${(i * 13.7) % 100}%`, top: `${(i * 29.3) % 100}%`, animationDelay: `${-i * 0.9}s`, animationDuration: `${6 + (i % 5)}s` }} />)}</div>

      <div className="loader-col">
        <div className="loader-brand"><span className="loader-dot" />RAYAN.WORLD</div>

        {/* the scene window */}
        <div className="loader-window">
          <div className="loader-sky" />
          <div className="loader-stars" aria-hidden />
          <div className="loader-trees loader-trees-far" />
          <div className="loader-trees" />
          <div className="loader-ground" />
          <div className="loader-hero" style={{ backgroundImage: `url(${charSheet(CHARS.hero)})` }} />
          <div className="loader-dust" aria-hidden><span /><span /><span /></div>
          <div className="loader-glass" aria-hidden />
        </div>

        {/* progress */}
        <div className="loader-bar">
          <div className="loader-fill" style={{ width: `${shown * 100}%` }} />
          <div className="loader-ticks" aria-hidden />
        </div>
        <div className="loader-meta">
          <span>{step}{pct < 100 && <span className="loader-ellipsis" />}</span>
          <span className="loader-pct">{String(pct).padStart(2, "0")}%</span>
        </div>
      </div>
    </div>
  )
}
