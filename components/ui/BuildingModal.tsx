"use client"
import { useEffect, type ComponentType } from "react"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { BUILDINGS } from "@/lib/world/village"
import { X } from "lucide-react"
import { runtime } from "@/lib/runtime"
import { Panel, Ribbon, IconButton } from "@/components/ui/kit"
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

export default function BuildingModal() {
  const { activeBuilding, closeBuilding, focus } = useGameStore()
  const worldId = useGameStore((s) => s.world)

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
  const label = runtime.landmarks.find((l) => l.id === activeBuilding)?.label ?? BUILDINGS.find((b) => b.id === activeBuilding)?.label ?? ""

  const close = () => { closeBuilding(); playSound("close") }

  return (
    <div className="fade-in modal-backdrop k-backdrop" data-sec={activeBuilding} onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <Panel v="modal" fx className="modal-in modal-panel" role="dialog" aria-modal="true" aria-label={label} data-sec={activeBuilding} data-w={worldId}>
        <div className="bm-title"><Ribbon>{label}</Ribbon></div>
        <div className="bm-body parch-scroll k-scroll">
          <div style={{ paddingTop: 10 }}>
            <Modal focus={focus} />
          </div>
        </div>
        <IconButton title="Close" danger className="bm-close" onClick={close}><X size={18} strokeWidth={3} /></IconButton>
        <div className="bm-esc">ESC TO CLOSE</div>
      </Panel>
    </div>
  )
}
