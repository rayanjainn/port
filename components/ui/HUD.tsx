"use client"
import { useGameStore } from "@/lib/store"
import { gameAchievements } from "@/lib/data"
import { playSound } from "@/lib/audio"
import { Trophy, Volume2, VolumeX } from "lucide-react"

// Parchment-styled floating icon button
const ICON_BTN: React.CSSProperties = {
  width: 38, height: 38,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(180deg, #ede0bd 0%, #d8c79a 100%)",
  border: "3px solid #5e3a18",
  boxShadow: "inset 0 0 0 2px #c79a5e, 0 4px 0 #4a2e12",
  cursor: "pointer", color: "#5e3a18",
  fontFamily: "var(--font-pixel)",
  padding: 0,
}
const ICON_BTN_OFF: React.CSSProperties = {
  ...ICON_BTN,
  background: "linear-gradient(180deg, #8a7a5a 0%, #6b5a44 100%)",
  color: "#3a2a18",
}

export default function HUD() {
  const { unlockedAchievements, sfxEnabled, toggleSfx } = useGameStore()
  const total = gameAchievements.length
  const unlocked = unlockedAchievements.size

  return (
    <>
      {/* Floating icon stack — top-right */}
      <div style={{
        position: "fixed", top: 14, right: 14,
        display: "flex", gap: 8, alignItems: "center",
        zIndex: 50,
      }}>
        {/* Trophy chip */}
        <div style={{
          ...ICON_BTN,
          width: "auto", padding: "0 12px", gap: 6, cursor: "default",
          fontSize: 8, letterSpacing: 1,
        }}>
          <Trophy size={14} strokeWidth={2} />
          {unlocked}/{total}
        </div>
        <button
          onClick={() => {
            // play click BEFORE flipping when enabled; after when re-enabling
            if (sfxEnabled) playSound("click")
            toggleSfx()
            if (!sfxEnabled) setTimeout(() => playSound("click"), 0)
          }}
          style={sfxEnabled ? ICON_BTN : ICON_BTN_OFF}
          title={sfxEnabled ? "Mute sound" : "Enable sound"}
        >
          {sfxEnabled ? <Volume2 size={18} strokeWidth={2} /> : <VolumeX size={18} strokeWidth={2} />}
        </button>
      </div>

      {/* Buildings legend — parchment, bottom-left */}
      <div style={{
        position: "fixed", bottom: 16, left: 16, zIndex: 50,
        fontFamily: "var(--font-pixel)", fontSize: "clamp(5px, 0.8vw, 7px)",
        lineHeight: 2.2, color: "#3a2418",
        background: "linear-gradient(180deg, #ede0bd 0%, #d8c79a 100%)",
        border: "3px solid #5e3a18",
        boxShadow: "inset 0 0 0 2px #c79a5e, 0 4px 0 #4a2e12",
        padding: "10px 14px 12px",
      }}>
        {/* red banner heading */}
        <div style={{
          display: "inline-block",
          background: "linear-gradient(180deg, #c8463b 0%, #a8382f 100%)",
          border: "2px solid #ede0bd",
          padding: "4px 12px", marginBottom: 8, marginLeft: -4,
          color: "#f6e8c8", letterSpacing: 2,
          textShadow: "0 1px 0 #6e201b",
        }}>
          BUILDINGS
        </div>
        {[
          { color: "#3a6ea5", label: "TOWN HALL — About" },
          { color: "#b06d1a", label: "TAVERN — Work Exp" },
          { color: "#2a8a80", label: "ACADEMY — Certs" },
          { color: "#7c5cba", label: "GALLERY — Projects" },
          { color: "#c2531d", label: "FORGE — Skills" },
          { color: "#6b46c1", label: "WIZARD — Contact" },
          { color: "#6b5a44", label: "CAVE — ???" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 8, height: 8,
              background: color,
              border: "1px solid #3a2418",
              flexShrink: 0,
            }} />
            {label}
          </div>
        ))}
      </div>
    </>
  )
}
