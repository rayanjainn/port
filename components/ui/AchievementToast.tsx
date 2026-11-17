"use client"
import { useEffect, useState } from "react"
import { useGameStore } from "@/lib/store"
import { worldById } from "@/lib/world/worlds"
import { VOCAB } from "@/lib/theme"
import { Panel } from "@/components/ui/kit"

export default function AchievementToast() {
  const { toastQueue, popToast, activeBuilding, mapOpen, world: worldId } = useGameStore()
  const hold = !!activeBuilding || mapOpen
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (toastQueue.length === 0 || hold) return
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        setExiting(false)
        popToast()
      }, 350)
    }, 2800)
    return () => clearTimeout(timer)
  }, [toastQueue, popToast, hold])

  if (toastQueue.length === 0 || hold) return null
  const toast = toastQueue[0]
  const world = worldById(worldId)
  const vocab = VOCAB[worldId] ?? VOCAB.village
  // the first-steps toast fires in whichever world the player enters first
  const description = toast.id === "a1" ? `Entered ${world.name}` : toast.description

  return (
    <Panel v="toast" fx className={`toast-pos ${exiting ? "toast-out" : "toast-in"}`} style={{ position: "fixed", top: 72, right: 14, width: 300, padding: "16px 18px 14px 16px", zIndex: 200 }}>
      <div className="toast-kick">{vocab.toast}</div>
      <div className="toast-icon" aria-hidden>{toast.icon}</div>
      <div className="toast-txt">
        <div className="toast-note">{vocab.toastNote}</div>
        <div className="toast-title">{toast.title}</div>
        <div className="toast-desc">{description}</div>
      </div>
    </Panel>
  )
}
