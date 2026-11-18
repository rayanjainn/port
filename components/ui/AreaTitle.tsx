"use client"
import { useEffect, useState } from "react"
import { useGameStore } from "@/lib/store"

/** Zelda-style area name that fades in when you enter a new place. */
export default function AreaTitle() {
  const area = useGameStore((s) => s.areaTitle)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!area) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2200)
    return () => clearTimeout(t)
  }, [area])

  if (!area) return null
  return (
    <div key={area.key} className="area-title" data-on={visible ? "" : undefined} data-interior={area.interior ? "" : undefined}>
      <div className="area-title__sub">
        <span className="area-title__rule area-title__rule--l" />
        <span className="area-title__kick">{area.sub}</span>
        <span className="area-title__rule" />
      </div>
      <div className="area-title__name">{area.title}</div>
    </div>
  )
}
