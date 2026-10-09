"use client"
import dynamic from "next/dynamic"

const Game = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div style={{
      position: "fixed", inset: 0, background: "#0d1117",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: "24px",
    }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", color: "#ffd700", fontSize: "12px", letterSpacing: "2px" }}>
        LOADING...
      </div>
      <div style={{ width: "200px", height: "8px", background: "#111", border: "2px solid #444" }}>
        <div style={{ width: "60%", height: "100%", background: "#ffd700", animation: "none" }} />
      </div>
    </div>
  ),
})

export default function Home() {
  return <Game />
}
