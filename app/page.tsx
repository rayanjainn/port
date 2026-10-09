"use client"
import dynamic from "next/dynamic"
import { useEffect } from "react"
import { loadPreviewDraft } from "@/lib/content"
import PreviewBadge from "@/components/ui/PreviewBadge"

const Game = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div style={{
      position: "fixed", inset: 0, background: "#0c0a26",
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20,
    }}>
      <div style={{ fontFamily: "var(--font-pixel)", color: "#ffd76a", fontSize: 11, letterSpacing: 3 }}>LOADING WORLD</div>
      <div style={{ width: 220, height: 12, border: "3px solid #ffe7b0", padding: 2 }}>
        <div style={{ height: "100%", width: "100%", background: "repeating-linear-gradient(90deg, #ffd76a 0 10px, transparent 10px 14px)", backgroundSize: "28px 100%", animation: "shimmer 1.2s linear infinite" }} />
      </div>
    </div>
  ),
})

export default function Home() {
  useEffect(() => { loadPreviewDraft() }, [])
  return (
    <div className="game-shell">
      <Game />
      <PreviewBadge />
    </div>
  )
}
