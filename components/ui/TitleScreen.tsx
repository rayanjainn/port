"use client"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { personal } from "@/lib/data"
import { PARCH } from "@/lib/modalTheme"

const CHAR_SHEET = "/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png"
const SC = 9 // character sprite scale

export default function TitleScreen() {
  const startGame = useGameStore((s) => s.startGame)

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(180deg, #6db64a 0%, #4f8a3a 70%, #3f6e30 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 26, zIndex: 100, overflow: "hidden",
    }}>
      {/* drifting decorative tiles (grass dapple) */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 6, height: 6, background: i % 2 ? "#7fc456" : "#5b9a3e",
            left: `${(i * 23.7) % 100}%`, top: `${(i * 17.3) % 100}%`,
          }} />
        ))}
      </div>

      {/* Parchment title panel with red banner */}
      <div style={{ position: "relative", marginTop: 10 }}>
        <div style={{
          background: "#ede0bd",
          border: "5px solid #8a5a2c",
          boxShadow: "inset 0 0 0 3px #c79a5e, inset 0 0 0 6px #5e3a18, 0 14px 36px rgba(0,0,0,0.45)",
          padding: "44px 56px 30px",
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "clamp(16px, 3.4vw, 32px)",
            color: "#8a3026",
            textShadow: `3px 3px 0 ${PARCH.line}`,
            letterSpacing: 4,
          }}>
            RAYAN WORLD
          </div>
          <div style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "clamp(6px, 1.1vw, 9px)",
            color: PARCH.muted, letterSpacing: 2, marginTop: 12,
          }}>
            {personal.title.toUpperCase()} — PIXEL PORTFOLIO
          </div>
        </div>
        {/* red banner */}
        <div style={{
          position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(180deg, #c8463b 0%, #a8382f 100%)",
          border: "3px solid #e8d6ad",
          padding: "8px 28px",
          fontFamily: "var(--font-pixel)", fontSize: 8, color: "#f6e8c8",
          letterSpacing: 3, textShadow: "0 2px 0 #6e201b",
        }}>
          ◆ ADVENTURE ◆
        </div>
      </div>

      {/* Character sprite from the roguelike-characters asset */}
      <div style={{
        width: 16 * SC, height: 16 * SC,
        backgroundImage: `url(${CHAR_SHEET})`,
        backgroundPosition: `${-17 * SC}px ${-6 * 17 * SC}px`,
        backgroundSize: `${918 * SC}px ${203 * SC}px`,
        imageRendering: "pixelated",
        filter: "drop-shadow(0 6px 0 rgba(0,0,0,0.3))",
      }} className="float-pixel" />

      {/* Start button — parchment */}
      <button
        onClick={() => { playSound("bong"); startGame() }}
        style={{
          fontFamily: "var(--font-pixel)", fontSize: "clamp(9px, 1.6vw, 13px)",
          color: "#f6e8c8", padding: "16px 40px",
          background: "linear-gradient(180deg, #b06d2a 0%, #8a5320 100%)",
          border: "4px solid #5e3a18",
          boxShadow: "inset 0 0 0 2px #d8a55e, 0 6px 0 #4a2e12",
          cursor: "pointer", letterSpacing: 2,
        }}
        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(4px)" }}
        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)" }}
      >
        ▶ PRESS START
      </button>

      {/* Controls */}
      <div style={{
        fontFamily: "var(--font-pixel)",
        fontSize: "clamp(6px, 1vw, 8px)",
        color: "#1f3a18", textAlign: "center", lineHeight: 2.4,
        background: "rgba(237,224,189,0.6)", border: "2px solid #8a5a2c",
        padding: "10px 22px",
      }}>
        <div>WASD / ARROWS — MOVE</div>
        <div>[E] — ENTER BUILDING&nbsp;&nbsp;·&nbsp;&nbsp;[SPACE] — ATTACK</div>
      </div>

      <div style={{
        position: "absolute", bottom: 14, right: 16,
        fontFamily: "var(--font-pixel)", fontSize: 7, color: "#2f5226",
      }}>v1.1.0</div>
    </div>
  )
}
