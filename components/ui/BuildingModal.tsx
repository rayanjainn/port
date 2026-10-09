"use client"
import { useEffect, type ComponentType } from "react"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { BUILDINGS } from "@/lib/world/village"
import { X } from "lucide-react"
import TownHallModal from "@/components/buildings/TownHallModal"
import TavernModal from "@/components/buildings/TavernModal"
import AcademyModal from "@/components/buildings/AcademyModal"
import GalleryModal from "@/components/buildings/GalleryModal"
import ForgeModal from "@/components/buildings/ForgeModal"
import WizardModal from "@/components/buildings/WizardModal"

const MODALS: Record<string, ComponentType<{ focus?: string | null }>> = {
  townhall: TownHallModal,
  tavern: TavernModal,
  academy: AcademyModal,
  gallery: GalleryModal,
  forge: ForgeModal,
  wizard: WizardModal,
}

function Rivet({ style }: { style: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute", width: 14, height: 14, zIndex: 3,
      background: "radial-gradient(circle at 35% 35%, #fff2c4 0 2px, #d8a44c 3px, #8a5a2c 6px)",
      border: "2px solid #2a1606", borderRadius: 3,
      ...style,
    }} />
  )
}

export default function BuildingModal() {
  const { activeBuilding, closeBuilding, focus } = useGameStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeBuilding(); playSound("close") }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [closeBuilding])

  if (!activeBuilding) return null
  const Modal = MODALS[activeBuilding as keyof typeof MODALS]
  if (!Modal) return null
  const label = BUILDINGS.find((b) => b.id === activeBuilding)?.label ?? ""

  const close = () => { closeBuilding(); playSound("close") }

  return (
    <div
      className="fade-in modal-backdrop"
      style={{
        position: "fixed", inset: 0, zIndex: 150,
        background: "radial-gradient(ellipse at center, rgba(30,16,6,0.55), rgba(8,4,2,0.85))",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "44px 14px 14px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        className="modal-in modal-panel"
        role="dialog" aria-modal="true" aria-label={label}
        style={{
          width: "min(920px, 100%)", maxHeight: "min(88vh, 900px)",
          display: "flex", flexDirection: "column", position: "relative",
          background: "linear-gradient(180deg, #a06a34 0%, #7a4a20 100%)",
          border: "4px solid #2a1606",
          boxShadow: "inset 0 0 0 3px #c99a5c, inset 0 0 0 6px #5a3412, 0 30px 80px rgba(0,0,0,0.6), 0 8px 0 #1a0d04",
          padding: 12,
        }}
      >
        <Rivet style={{ top: 6, left: 6 }} />
        <Rivet style={{ top: 6, right: 6 }} />
        <Rivet style={{ bottom: 6, left: 6 }} />
        <Rivet style={{ bottom: 6, right: 6 }} />

        {/* ribbon */}
        <div style={{ position: "absolute", top: -26, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 4, pointerEvents: "none" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <div style={{ width: 34, height: 30, marginRight: -6, marginTop: 14, background: "#8f2f28", border: "3px solid #2a1606", clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 30% 50%)" }} />
            <div style={{
              padding: "13px 30px", background: "linear-gradient(180deg, #d9574b 0%, #b03c32 100%)",
              border: "3px solid #2a1606", boxShadow: "inset 0 0 0 2px #f08a7c, 0 4px 0 #2a1606",
              fontFamily: "var(--font-pixel)", fontSize: "clamp(10px, 1.5vw, 13px)", letterSpacing: 3,
              color: "#fff4dc", textShadow: "0 2px 0 #5a1610", whiteSpace: "nowrap",
            }}>{label}</div>
            <div style={{ width: 34, height: 30, marginLeft: -6, marginTop: 14, background: "#8f2f28", border: "3px solid #2a1606", clipPath: "polygon(0 0, 100% 0, 70% 50%, 100% 100%, 0 100%)" }} />
          </div>
        </div>

        <div className="parch-scroll" style={{
          flex: 1, overflow: "auto", position: "relative",
          background: "radial-gradient(ellipse at 50% 0%, #fbf3dc 0%, #f1e3bd 60%, #e8d3a2 100%)",
          border: "3px solid #2a1606",
          boxShadow: "inset 0 0 0 2px #d8bd84, inset 0 0 40px rgba(140, 96, 40, 0.25)",
        }}>
          <div style={{ paddingTop: 10 }}>
            <Modal focus={focus} />
          </div>
        </div>

        <button
          onClick={close}
          aria-label="Close"
          className="parch-btn"
          style={{
            position: "absolute", top: -16, right: -12, zIndex: 5,
            width: 40, height: 40, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(180deg, #d9574b 0%, #a8382f 100%)",
            border: "3px solid #2a1606", color: "#fff4dc",
            boxShadow: "inset 0 0 0 2px #f08a7c, 0 4px 0 #2a1606",
          }}
        >
          <X size={18} strokeWidth={3} />
        </button>
        <div style={{ position: "absolute", bottom: -24, right: 4, fontFamily: "var(--font-pixel)", fontSize: 7, color: "rgba(255,240,210,.7)", letterSpacing: 1 }} className="esc-hint">
          ESC TO CLOSE
        </div>
      </div>
      <style>{`@media (max-width: 600px) { .modal-backdrop { padding: 36px 6px 8px !important; } .modal-panel { max-height: calc(100dvh - 48px) !important; padding: 8px !important; } .esc-hint { display: none; } }`}</style>
    </div>
  )
}
