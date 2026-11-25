"use client"
import { useEffect, useRef, type ComponentType } from "react"
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

  const panelRef = useRef<HTMLDivElement>(null) // the backdrop, which wraps the dialog
  const open = !!activeBuilding

  // dialog behaviour: focus moves in, Tab stays inside, Escape closes, focus goes back to where it was (or the game canvas)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, [tabindex]:not([tabindex="-1"])') ?? []).filter((el) => el.offsetParent !== null)
    const first = panel?.querySelector<HTMLElement>(".bm-body")
    first?.setAttribute("tabindex", "-1")
    first?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeBuilding(); playSound("close"); return }
      if (e.key !== "Tab" || !panel) return
      const f = focusables()
      if (f.length === 0) return
      const a = document.activeElement as HTMLElement | null
      const i = a ? f.indexOf(a) : -1
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus() }
      else if (!e.shiftKey && (i === f.length - 1 || !panel.contains(a))) { e.preventDefault(); f[0].focus() }
    }
    window.addEventListener("keydown", onKey, true)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      const back = prev && document.contains(prev) && prev !== document.body ? prev : document.querySelector<HTMLElement>("canvas")
      if (back) { if (!back.hasAttribute("tabindex") && back.tagName === "CANVAS") back.setAttribute("tabindex", "0"); back.focus({ preventScroll: true }) }
    }
  }, [open, closeBuilding])

  if (!activeBuilding) return null
  const Modal = MODALS[activeBuilding as keyof typeof MODALS]
  if (!Modal) return null
  const label = runtime.landmarks.find((l) => l.id === activeBuilding)?.label ?? BUILDINGS.find((b) => b.id === activeBuilding)?.label ?? ""

  const close = () => { closeBuilding(); playSound("close") }

  return (
    <div ref={panelRef} className="fade-in modal-backdrop k-backdrop" data-sec={activeBuilding} onClick={(e) => { if (e.target === e.currentTarget) close() }}>
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
