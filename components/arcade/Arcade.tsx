"use client"
import { useEffect, useState, type ReactNode } from "react"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { X } from "lucide-react"
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
    <div className="fade-in" onClick={(e) => { if (e.target === e.currentTarget) close() }} style={{
      position: "fixed", inset: 0, zIndex: 160, display: "flex", alignItems: "center", justifyContent: "center", padding: "44px 14px 14px",
      background: "radial-gradient(ellipse at center, rgba(30,16,6,0.55), rgba(8,4,2,0.88))", backdropFilter: "blur(3px)",
    }}>
      <Cabinet id={id} onClose={close}>
        {id === "serpent" && <Serpent />}
        {id === "runes" && <Runes />}
        {id === "quickdraw" && <Quickdraw />}
        {id === "slimes" && <Slimes />}
      </Cabinet>
    </div>
  )
}

function Rivet({ style }: { style: React.CSSProperties }) {
  return <div style={{ position: "absolute", width: 14, height: 14, zIndex: 3, background: "radial-gradient(circle at 35% 35%, #fff2c4 0 2px, #d8a44c 3px, #8a5a2c 6px)", border: "2px solid #2a1606", borderRadius: 3, ...style }} />
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
    <div className="modal-in" style={{
      width: "min(900px, 100%)", position: "relative", padding: 12,
      background: "linear-gradient(180deg, #a06a34 0%, #7a4a20 100%)",
      border: "4px solid #2a1606",
      boxShadow: "inset 0 0 0 3px #c99a5c, inset 0 0 0 6px #5a3412, 0 30px 80px rgba(0,0,0,0.6), 0 8px 0 #1a0d04",
    }}>
      <Rivet style={{ top: 6, left: 6 }} /><Rivet style={{ top: 6, right: 6 }} /><Rivet style={{ bottom: 6, left: 6 }} /><Rivet style={{ bottom: 6, right: 6 }} />
      {/* ribbon */}
      <div style={{ position: "absolute", top: -26, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 4, pointerEvents: "none" }}>
        <div style={{ padding: "13px 28px", background: "linear-gradient(180deg, #d9574b 0%, #b03c32 100%)", border: "3px solid #2a1606", boxShadow: "inset 0 0 0 2px #f08a7c, 0 4px 0 #2a1606", fontFamily: "var(--font-pixel)", fontSize: "clamp(10px, 1.5vw, 13px)", letterSpacing: 3, color: "#fff4dc", textShadow: "0 2px 0 #5a1610", whiteSpace: "nowrap" }}>
          {g.title}
        </div>
      </div>
      <button onClick={onClose} aria-label="Close arcade" className="parch-btn" style={{
        position: "absolute", top: -16, right: -12, zIndex: 5, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(180deg, #d9574b 0%, #a8382f 100%)", border: "3px solid #2a1606", color: "#fff4dc", boxShadow: "inset 0 0 0 2px #f08a7c, 0 4px 0 #2a1606",
      }}><X size={18} strokeWidth={3} /></button>

      <div className="arcade-grid" style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) 200px", gap: 12, padding: "22px 12px 12px",
        background: "radial-gradient(ellipse at 50% 0%, #fbf3dc 0%, #f1e3bd 60%, #e8d3a2 100%)", border: "3px solid #2a1606",
        boxShadow: "inset 0 0 0 2px #d8bd84, inset 0 0 40px rgba(140, 96, 40, 0.25)",
      }}>
        {/* screen in a dark wooden bezel */}
        <div style={{ padding: 8, background: "linear-gradient(180deg, #4a2c14, #2a1606)", border: "3px solid #1d1006", boxShadow: "0 4px 0 #a07c45" }}>
          <div style={{ position: "relative", overflow: "hidden", background: "#1a120a", border: "2px solid #1d1006" }}>
            {children}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.12) 0 1px, transparent 1px 3px)" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "#5c4022", lineHeight: 1.35, padding: "2px 2px 4px" }}>{g.tagline}</div>
          <Panel title="HIGH SCORE" color={g.color}>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 18, color: "#3a2412" }}>{best === null ? "—" : `${best}${g.unit ?? ""}`}</div>
          </Panel>
          <Panel title="HOW TO PLAY" color={g.color}>
            {g.how.map((h) => <div key={h} style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#3a2412", lineHeight: 1.4 }}>· {h}</div>)}
          </Panel>
          <div style={{ marginTop: "auto", fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: 1, color: "#8f6a3a" }}>ESC TO LEAVE</div>
        </div>
      </div>
      <style>{`@media (max-width: 720px) { .arcade-grid { grid-template-columns: 1fr !important; } .arcade-grid > div:last-child { display: none !important; } }`}</style>
    </div>
  )
}

function Panel({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <div style={{ position: "relative", padding: "12px 12px 10px", background: "#f7eccd", border: "2px solid #a07c45", boxShadow: "0 3px 0 #d1b47a" }}>
      <div style={{ position: "absolute", left: -2, right: -2, top: -2, height: 4, background: color }} />
      <div style={{ fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: 1, color: "#8f7246", marginBottom: 8 }}>{title}</div>
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
    <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,10,4,.55)", padding: 14 }}>
      <div className="dialog-pop" style={{
        textAlign: "center", padding: "20px 22px 18px", minWidth: "min(300px, 90%)",
        background: "linear-gradient(180deg, #fff8e4 0%, #f3e2b8 100%)", border: "4px solid #1d1006",
        boxShadow: "inset 0 0 0 3px #e9c98a, inset 0 0 0 5px #8a5a2c, 0 6px 0 #1d1006",
      }}>
        <div style={{ fontFamily: "var(--font-pixel)", fontSize: "clamp(12px, 2vw, 16px)", color: "#3a2412", letterSpacing: 1 }}>{title}</div>
        {sub && <div style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "#5c4022", marginTop: 10 }}>{sub}</div>}
        {children}
        <button onClick={onStart} className="parch-btn" style={{
          marginTop: 16, fontFamily: "var(--font-pixel)", fontSize: 10, letterSpacing: 2, padding: "12px 18px", cursor: "pointer", color: "#3a1d08",
          background: "linear-gradient(180deg, #fff1b8 0%, #ffd76a 45%, #f5a623 100%)", border: "3px solid #1d1006",
          boxShadow: "inset 0 -3px 0 rgba(160,80,0,.35), inset 0 2px 0 rgba(255,255,255,.6), 0 4px 0 #1d1006",
        }}>{cta}</button>
      </div>
    </div>
  )
}
