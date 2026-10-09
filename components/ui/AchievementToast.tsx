"use client"
import { useEffect, useState } from "react"
import { useGameStore } from "@/lib/store"

export default function AchievementToast() {
  const { toastQueue, popToast } = useGameStore()
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (toastQueue.length === 0) return
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        setExiting(false)
        popToast()
      }, 350)
    }, 2800)
    return () => clearTimeout(timer)
  }, [toastQueue, popToast])

  if (toastQueue.length === 0) return null
  const toast = toastQueue[0]

  return (
    <div
      className={exiting ? "toast-out" : "toast-in"}
      style={{
        position: "fixed", top: 66, right: 14,
        background: "linear-gradient(180deg, #ede0bd 0%, #d8c79a 100%)",
        border: "4px solid #5e3a18",
        boxShadow: "inset 0 0 0 2px #c79a5e, 0 5px 0 #4a2e12, 0 12px 24px rgba(0,0,0,0.35)",
        padding: "14px 18px 14px 16px",
        display: "flex", alignItems: "center", gap: 14,
        zIndex: 200, minWidth: 280,
      }}
    >
      {/* red banner */}
      <div style={{
        position: "absolute", top: -14, left: 12,
        background: "linear-gradient(180deg, #c8463b 0%, #a8382f 100%)",
        border: "2px solid #ede0bd",
        padding: "3px 12px",
        fontFamily: "var(--font-pixel)", fontSize: 7,
        color: "#f6e8c8", letterSpacing: 2,
        textShadow: "0 1px 0 #6e201b",
      }}>
        ◆ UNLOCKED ◆
      </div>
      {/* metal corners */}
      <div style={{ position: "absolute", top: 4, left: 4, width: 6, height: 6, background: "#8a5a2c" }} />
      <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, background: "#8a5a2c" }} />
      <div style={{ position: "absolute", bottom: 4, left: 4, width: 6, height: 6, background: "#8a5a2c" }} />
      <div style={{ position: "absolute", bottom: 4, right: 4, width: 6, height: 6, background: "#8a5a2c" }} />
      <div style={{
        fontSize: 30, lineHeight: 1,
        filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.3))",
      }}>{toast.icon}</div>
      <div style={{ marginTop: 4 }}>
        <div style={{
          fontFamily: "var(--font-pixel)", fontSize: 7,
          color: "#8a3026", marginBottom: 6, letterSpacing: 1,
        }}>
          ACHIEVEMENT
        </div>
        <div style={{ fontFamily: "var(--font-pixel)", fontSize: 9, color: "#3a2418" }}>
          {toast.title}
        </div>
      </div>
    </div>
  )
}
