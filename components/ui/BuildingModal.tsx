"use client"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { BUILDINGS } from "@/lib/tilemap"
import { X } from "lucide-react"
import TownHallModal  from "@/components/buildings/TownHallModal"
import TavernModal    from "@/components/buildings/TavernModal"
import AcademyModal   from "@/components/buildings/AcademyModal"
import GalleryModal   from "@/components/buildings/GalleryModal"
import ForgeModal     from "@/components/buildings/ForgeModal"
import WizardModal    from "@/components/buildings/WizardModal"
import CaveModal      from "@/components/buildings/CaveModal"

const MODALS = {
  townhall: TownHallModal,
  tavern:   TavernModal,
  academy:  AcademyModal,
  gallery:  GalleryModal,
  forge:    ForgeModal,
  wizard:   WizardModal,
  cave:     CaveModal,
}

// Ornate metal corner bracket (matches the RPG UI asset look)
function Bracket({ style }: { style: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute", width: 22, height: 22,
      background: "#8294b0",
      border: "2px solid #2c3242",
      boxShadow: "inset 0 0 0 2px #aab8cf",
      ...style,
    }} />
  )
}

export default function BuildingModal() {
  const { activeBuilding, closeBuilding } = useGameStore()
  if (!activeBuilding) return null

  const Modal = MODALS[activeBuilding as keyof typeof MODALS]
  if (!Modal) return null
  const label = BUILDINGS.find((b) => b.id === activeBuilding)?.label ?? ""

  const close = () => { closeBuilding(); playSound("close") }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(20,12,4,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 150, padding: "48px 16px 16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      {/* Parchment RPG panel */}
      <div
        className="modal-in"
        style={{
          width: "min(900px, 95vw)",
          maxHeight: "86vh",
          display: "flex", flexDirection: "column",
          position: "relative",
          background: "#ede0bd",
          border: "5px solid #8a5a2c",
          boxShadow: `
            inset 0 0 0 3px #c79a5e,
            inset 0 0 0 6px #5e3a18,
            0 0 0 3px #5e3a18,
            0 22px 50px rgba(0,0,0,0.7)
          `,
        }}
      >
        {/* Metal corner brackets */}
        <Bracket style={{ top: -7, left: -7 }} />
        <Bracket style={{ top: -7, right: -7 }} />
        <Bracket style={{ bottom: -7, left: -7 }} />
        <Bracket style={{ bottom: -7, right: -7 }} />

        {/* Red ribbon banner */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", marginTop: -34, flexShrink: 0 }}>
          {/* ribbon side tails */}
          <div style={{
            position: "absolute", top: 8, left: "calc(50% - 200px)", width: 70, height: 26,
            background: "#8f2f28", border: "3px solid #e8d6ad",
            clipPath: "polygon(0 50%, 22% 0, 100% 0, 100% 100%, 22% 100%)",
          }} />
          <div style={{
            position: "absolute", top: 8, right: "calc(50% - 200px)", width: 70, height: 26,
            background: "#8f2f28", border: "3px solid #e8d6ad",
            clipPath: "polygon(0 0, 78% 0, 100% 50%, 78% 100%, 0 100%)",
          }} />
          {/* main banner */}
          <div style={{
            position: "relative", zIndex: 2,
            minWidth: 280, padding: "14px 40px",
            background: "linear-gradient(180deg, #c8463b 0%, #a8382f 100%)",
            border: "3px solid #e8d6ad",
            boxShadow: "0 4px 0 rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "var(--font-pixel)", fontSize: "clamp(9px, 1.6vw, 13px)",
              color: "#f6e8c8", letterSpacing: 2,
              textShadow: "0 2px 0 #6e201b",
            }}>{label}</span>
          </div>
        </div>

        {/* Content — parchment page inset into the frame */}
        <div style={{
          flex: 1, overflow: "auto", margin: "12px",
          background: "#f3e8c8",
          border: "3px solid #8a5a2c",
          boxShadow: "inset 0 0 0 2px #d8c188, inset 0 4px 14px rgba(120,86,40,0.18)",
        }}>
          <Modal />
        </div>

        {/* Close button */}
        <button
          onClick={close}
          aria-label="Close"
          style={{
            position: "absolute", top: -14, right: -14,
            width: 34, height: 34,
            background: "linear-gradient(180deg, #cc4d42 0%, #a8382f 100%)",
            border: "3px solid #e8d6ad",
            color: "#f6e8c8",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 10,
            boxShadow: "0 3px 0 rgba(0,0,0,0.4)",
          }}
        >
          <X size={16} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}
