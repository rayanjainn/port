"use client"
import { useEffect, useState, type ReactNode } from "react"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { X } from "lucide-react"
import { Panel, Ribbon, IconButton, Button } from "@/components/ui/kit"
import Serpent from "./Serpent"
import Runes from "./Runes"
import Quickdraw from "./Quickdraw"
import Slimes from "./Slimes"

export const GAMES: Record<string, { title: string; tagline: string; color: string; glow: string; lowerIsBetter?: boolean; unit?: string; how: string[] }> = {
  serpent: { title: "SERPENT", tagline: "Eat. Grow. Don't bite yourself.", color: "#6aa84f", glow: "106,168,79", how: ["ARROWS / WASD or swipe", "Gold fruit = +5"] },
  runes: { title: "RUNE RECALL", tagline: "Repeat the ancient sequence.", color: "#5b8fd6", glow: "91,143,214", how: ["Watch the runes glow", "Repeat with 1-4 or click"] },
  quickdraw: { title: "QUICKDRAW", tagline: "Fastest blade in the village.", color: "#c8463b", glow: "200,70,59", lowerIsBetter: true, unit: "ms", how: ["Wait for the !", "SPACE or tap. Not before!"] },
  slimes: { title: "SLIME SMASH", tagline: "Bonk slimes. Spare the skulls.", color: "#e09a3a", glow: "224,154,58", how: ["Click / tap slimes", "or keys 1-9 · 30 seconds"] },
}

export function getBest(id: string): number | null {
  try { const v = localStorage.getItem(`arcade:${id}`); return v ? Number(v) : null } catch { return null }
}
export function submitScore(id: string, score: number) {
  const g = GAMES[id]
  const best = getBest(id)
  const better = best === null || (g.lowerIsBetter ? score < best : score > best)
  try {
    if (better) localStorage.setItem(`arcade:${id}`, String(score))
    const played = new Set<string>(JSON.parse(localStorage.getItem("arcade:played") ?? "[]"))
    played.add(id)
    localStorage.setItem("arcade:played", JSON.stringify([...played]))
    if (played.size >= Object.keys(GAMES).length) useGameStore.getState().unlockAchievement("arcade_all")
  } catch {}
  return better
}

export default function Arcade() {
  const id = useGameStore((s) => s.arcade)
  const open = useGameStore((s) => s.openArcade)
  const close = () => { playSound("close"); open(null) }

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); close() } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!id || !GAMES[id]) return null
  return (
    <div className="fade-in k-backdrop arc-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <Cabinet id={id} onClose={close}>
        {id === "serpent" && <Serpent />}
        {id === "runes" && <Runes />}
        {id === "quickdraw" && <Quickdraw />}
        {id === "slimes" && <Slimes />}
      </Cabinet>
    </div>
  )
}

function Cabinet({ id, children, onClose }: { id: string; children: ReactNode; onClose: () => void }) {
  const g = GAMES[id]
  const [best, setBest] = useState<number | null>(null)
  useEffect(() => {
    const read = () => setBest(getBest(id))
    read()
    window.addEventListener("arcade-score", read)
    return () => window.removeEventListener("arcade-score", read)
  }, [id])

  return (
    <Panel v="modal" fx className="modal-in arc-cab" data-g={id} style={{ ["--gc" as string]: g.color }}>
      <div className="bm-title"><Ribbon>{g.title}</Ribbon></div>
      <IconButton title="Close arcade" danger className="bm-close" onClick={onClose}><X size={18} strokeWidth={3} /></IconButton>
      <div className="arc-grid bm-inner">
        <div className="arc-bezel">
          <div className="arc-screen">
            {children}
            <i className="arc-crt" aria-hidden />
          </div>
        </div>
        <div className="arc-side">
          <div className="arc-tag">{g.tagline}</div>
          <Info title="HIGH SCORE">
            <div className="arc-score">{best === null ? "—" : `${best}${g.unit ?? ""}`}</div>
          </Info>
          <Info title="HOW TO PLAY">
            {g.how.map((h) => <div key={h} className="arc-how">· {h}</div>)}
          </Info>
          <div className="arc-esc">ESC TO LEAVE</div>
        </div>
      </div>
    </Panel>
  )
}

function Info({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="k-card arc-info">
      <div className="arc-info__t">{title}</div>
      {children}
    </div>
  )
}

/** Shared "press start" / game-over card inside the screen. */
export function Overlay({ title, sub, cta, onStart, children }: { title: string; sub?: string; cta: string; onStart: () => void; color?: string; children?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopImmediatePropagation(); onStart() } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onStart])
  return (
    <div className="arc-over">
      <Panel v="dialog" className="dialog-pop arc-over__card">
        <div className="arc-over__t">{title}</div>
        {sub && <div className="arc-over__s">{sub}</div>}
        {children}
        <Button variant="cta" onClick={onStart} style={{ marginTop: 16 }}>{cta}</Button>
      </Panel>
    </div>
  )
}

