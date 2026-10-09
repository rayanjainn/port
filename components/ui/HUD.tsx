"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useGameStore } from "@/lib/store"
import { gameAchievements } from "@/lib/data"
import { playSound } from "@/lib/audio"
import { useContent } from "@/lib/content"
import { runtime, toggleNight, requestTeleport } from "@/lib/runtime"
import { BUILDINGS, TILE_PX, WORLD_W, WORLD_H } from "@/lib/tilemap"
import { MARGIN, TS } from "@/lib/worldRender"
import { Trophy, Volume2, VolumeX, Moon, Sun, Map as MapIcon, LayoutList, Navigation, X, Swords, Heart } from "lucide-react"

const ACCENT: Record<string, string> = {
  townhall: "#5b8fd6", tavern: "#e09a3a", academy: "#3fb3a6", gallery: "#9a7be0",
  forge: "#e2683a", wizard: "#8e66e8", cave: "#9a8a72",
}
const QUEST_TEXT: Record<string, string> = {
  townhall: "Read the chronicle at the Town Hall",
  gallery: "Tour the projects in the Gallery",
  tavern: "Hear tales of past quests at the Tavern",
  forge: "Inspect the weapons at the Forge",
  academy: "Visit the Academy",
  wizard: "Send a raven from the Wizard Tower",
}
const QUEST_ORDER = ["townhall", "gallery", "tavern", "forge", "academy", "wizard"]
const SECTION: Record<string, string> = {
  townhall: "About", tavern: "Experience", academy: "Education", gallery: "Projects", forge: "Skills", wizard: "Contact", cave: "Secret",
}

const panel: React.CSSProperties = {
  background: "linear-gradient(180deg, #fbf1d6 0%, #efdeb2 100%)",
  border: "3px solid #1d1006",
  boxShadow: "inset 0 0 0 2px #fff8e2, inset 0 -3px 0 2px #d9c08a, 0 4px 0 #1d1006, 0 10px 24px rgba(0,0,0,.25)",
}

function IconBtn({ onClick, title, active = true, children, href }: {
  onClick?: () => void; title: string; active?: boolean; children: React.ReactNode; href?: string
}) {
  const style: React.CSSProperties = {
    ...panel, width: 42, height: 42, padding: 0, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    color: active ? "#3a2412" : "#8f7246",
    filter: active ? undefined : "saturate(.3) brightness(.92)",
  }
  if (href) return <Link href={href} title={title} aria-label={title} style={style} className="parch-btn">{children}</Link>
  return <button onClick={onClick} title={title} aria-label={title} style={style} className="parch-btn">{children}</button>
}

export default function HUD() {
  const c = useContent()
  const { unlockedAchievements, sfxEnabled, toggleSfx, visited, mapOpen, setMapOpen, phase } = useGameStore()
  const [night, setNight] = useState(runtime.nightTarget > 0.5)
  const [combat, setCombat] = useState(false)
  const [hp, setHp] = useState(10)
  const arrowRef = useRef<HTMLDivElement>(null)
  const distRef = useRef<HTMLSpanElement>(null)

  const done = QUEST_ORDER.filter((q) => visited.has(q))
  const nextQuest = QUEST_ORDER.find((q) => !visited.has(q))

  // poll the mutable runtime for things that change outside React
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 66) return
      last = t
      setNight(runtime.nightTarget > 0.5)
      setCombat(runtime.combat)
      setHp(runtime.hp)
      const b = BUILDINGS.find((x) => x.id === nextQuest)
      if (b && arrowRef.current && distRef.current) {
        const dx = (b.doorX + 0.5) * TILE_PX - runtime.player.x
        const dy = (b.doorY + 1) * TILE_PX - runtime.player.y
        arrowRef.current.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`
        distRef.current.textContent = `${Math.round(Math.hypot(dx, dy) / TILE_PX)}m`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [nextQuest])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "m" && !e.repeat) {
        const st = useGameStore.getState()
        if (st.phase === "building") return
        st.setMapOpen(!st.mapOpen)
        playSound(st.mapOpen ? "close" : "open")
      }
      if (k === "escape" && useGameStore.getState().mapOpen) useGameStore.getState().setMapOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const total = gameAchievements.length
  const first = c.profile.name.split(" ")[0]

  return (
    <>
      {/* ── player card + quest */}
      <div className="hud-card fade-in" style={{ position: "fixed", top: 14, left: 14, zIndex: 50, width: 300, ...panel, padding: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 52, height: 52, flexShrink: 0, border: "3px solid #1d1006", background: "#2a1a40", overflow: "hidden", boxShadow: "0 0 0 2px #e3c98a" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.profile.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 10, color: "#3a2412", letterSpacing: 1 }}>{c.profile.name.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#8f6a3a", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.profile.title}</div>
            <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 9, background: "#3a2412", border: "2px solid #1d1006", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, width: `${(done.length / QUEST_ORDER.length) * 100}%`, background: "linear-gradient(180deg, #ffe39a, #f5a623)", transition: "width .6s cubic-bezier(.2,.9,.3,1)" }} />
              </div>
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "#3a2412" }}>{done.length}/{QUEST_ORDER.length}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "2px dashed #c9a96a", display: "flex", alignItems: "center", gap: 10 }}>
          {nextQuest ? (
            <>
              <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", background: ACCENT[nextQuest], border: "3px solid #1d1006", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div ref={arrowRef} style={{ color: "#fff", display: "flex", transition: "transform .15s linear" }}>
                  <Navigation size={14} fill="#fff" style={{ transform: "rotate(-45deg)" }} />
                </div>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "#c8463b", letterSpacing: 1 }}>QUEST · <span ref={distRef} /></div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#3a2412", marginTop: 3, lineHeight: 1.2 }}>{QUEST_TEXT[nextQuest]}</div>
              </div>
              <button
                onClick={() => { if (nextQuest) requestTeleport(nextQuest) }}
                title="Fast travel"
                style={{ fontFamily: "var(--font-pixel)", fontSize: 7, padding: "7px 8px", background: "#3a2412", color: "#ffe39a", border: "2px solid #1d1006", cursor: "pointer" }}
              >GO</button>
            </>
          ) : (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#2f6b2a" }}>
              ✦ Village fully explored! Thanks for visiting. Say hi from the Wizard Tower.
            </div>
          )}
        </div>
      </div>

      {/* ── top-right controls */}
      <div className="hud-btns fade-in" style={{ position: "fixed", top: 14, right: 14, zIndex: 50, display: "flex", gap: 8, alignItems: "center" }}>
        <div title="Achievements" style={{ ...panel, height: 42, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-pixel)", fontSize: 9, color: "#3a2412" }}>
          <Trophy size={15} color="#c58a12" /> {unlockedAchievements.size}/{total}
        </div>
        <IconBtn title="Map (M)" onClick={() => { setMapOpen(!mapOpen); playSound("open") }}><MapIcon size={18} /></IconBtn>
        <IconBtn title={night ? "Day (N)" : "Night (N)"} onClick={() => { toggleNight(); playSound("click"); setNight(!night) }}>
          {night ? <Sun size={18} /> : <Moon size={18} />}
        </IconBtn>
        <IconBtn title={sfxEnabled ? "Mute" : "Unmute"} active={sfxEnabled} onClick={() => { if (sfxEnabled) playSound("click"); toggleSfx(); if (!sfxEnabled) setTimeout(() => playSound("click"), 0) }}>
          {sfxEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </IconBtn>
        <IconBtn title="Quick view" href="/quick"><LayoutList size={18} /></IconBtn>
      </div>

      {/* ── combat HUD */}
      {combat && (
        <div className="fade-in" style={{ position: "fixed", top: 74, right: 14, zIndex: 50, ...panel, padding: "10px 12px", width: 190 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-pixel)", fontSize: 7, color: "#c8463b", marginBottom: 8 }}>
            <Swords size={13} /> FIGHT MODE · {runtime.weapon}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: runtime.maxHp / 2 }).map((_, i) => (
              <Heart key={i} size={16} color="#1d1006" fill={hp >= (i + 1) * 2 ? "#e0523f" : hp >= i * 2 + 1 ? "#f29a8f" : "#d9c08a"} />
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#5c4022", marginTop: 6 }}>Kills {runtime.kills} · SPACE to swing · T to stop</div>
        </div>
      )}

      {/* ── minimap */}
      <MiniMap onOpen={() => { setMapOpen(true); playSound("open") }} />

      {/* ── hints */}
      <div className="hud-hints fade-in" style={{
        position: "fixed", bottom: 16, left: 16, zIndex: 40, display: "flex", gap: 14, flexWrap: "wrap",
        fontFamily: "var(--font-pixel)", fontSize: 7, color: "#fff6dc", letterSpacing: 1,
        textShadow: "0 2px 0 rgba(0,0,0,.6)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className="kbd">W</span><span className="kbd">A</span><span className="kbd">S</span><span className="kbd">D</span> MOVE</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className="kbd">E</span> ENTER</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className="kbd">M</span> MAP</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className="kbd">N</span> NIGHT</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className="kbd">T</span> FIGHT</span>
      </div>

      {mapOpen && phase !== "title" && <WorldMap onClose={() => { setMapOpen(false); playSound("close") }} visited={visited} first={first} />}

      <style>{`
        @media (max-width: 760px) {
          .hud-card { width: auto !important; right: 14px; top: 64px !important; padding: 9px !important; }
          .hud-hints { display: none !important; }
          .hud-mini { display: none !important; }
        }
      `}</style>
    </>
  )
}

function MiniMap({ onOpen }: { onOpen: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0, last = 0
    const W = 200, H = 140
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (t - last < 80) return
      last = t
      const cv = ref.current, base = runtime.baseCanvas
      if (!cv || !base) return
      const ctx = cv.getContext("2d")!
      ctx.imageSmoothingEnabled = false
      // show a 40×28 tile window around the player at 5px/tile
      const z = 5 / TS
      const vwT = W / 5, vhT = H / 5
      const pc = runtime.player.x / TILE_PX, pr = runtime.player.y / TILE_PX
      const c0 = Math.max(-MARGIN + 2, Math.min(WORLD_W + MARGIN - 2 - vwT, pc - vwT / 2))
      const r0 = Math.max(-MARGIN + 2, Math.min(WORLD_H + MARGIN - 2 - vhT, pr - vhT / 2))
      ctx.drawImage(base, (c0 + MARGIN) * TS, (r0 + MARGIN) * TS, vwT * TS, vhT * TS, 0, 0, W, H)
      if (runtime.night > 0.05) { ctx.fillStyle = `rgba(10,14,50,${runtime.night * 0.45})`; ctx.fillRect(0, 0, W, H) }
      for (const b of BUILDINGS) {
        if (b.id === "cave") continue
        const x = (b.x - c0) * TS * z, y = (b.y - r0) * TS * z
        ctx.fillStyle = "#1d1006"; ctx.fillRect(x - 1, y - 1, b.w * 5 + 2, b.h * 5 + 2)
        ctx.fillStyle = ACCENT[b.id]; ctx.fillRect(x, y, b.w * 5, b.h * 5)
      }
      const px = (pc - c0) * 5, py = (pr - r0) * 5
      const pulse = 3 + Math.sin(t / 200) * 1.5
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.arc(px, py, pulse + 3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#1d1006"; ctx.fillRect(px - 4, py - 4, 8, 8)
      ctx.fillStyle = "#ff5a4a"; ctx.fillRect(px - 3, py - 3, 6, 6)
      void z
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <button onClick={onOpen} className="hud-mini fade-in parch-btn" title="Open map (M)" style={{
      position: "fixed", right: 14, bottom: 14, zIndex: 40, padding: 6, cursor: "pointer",
      ...panel,
    }}>
      <canvas ref={ref} width={200} height={140} className="pixelated" style={{ display: "block", width: 200, height: 140, border: "2px solid #1d1006" }} />
      <div style={{ position: "absolute", top: -12, left: 10, fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: 1, color: "#fff4dc", background: "#c8463b", border: "2px solid #1d1006", padding: "4px 7px" }}>MAP · M</div>
    </button>
  )
}

function WorldMap({ onClose, visited, first }: { onClose: () => void; visited: Set<string>; first: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const cols = WORLD_W + 4, rows = WORLD_H + 4 // show map with a sliver of forest edge

  useEffect(() => {
    let raf = 0
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      const cv = ref.current, base = runtime.baseCanvas, props = runtime.propsCanvas
      if (!cv || !base) return
      const ctx = cv.getContext("2d")!
      ctx.imageSmoothingEnabled = false
      const sx = (MARGIN - 2) * TS, sy = (MARGIN - 2) * TS
      ctx.drawImage(base, sx, sy, cols * TS, rows * TS, 0, 0, cv.width, cv.height)
      if (props) ctx.drawImage(props, sx, sy, cols * TS, rows * TS, 0, 0, cv.width, cv.height)
      const k = cv.width / (cols * TS)
      for (const b of BUILDINGS) {
        if (b.id === "cave") continue
        const spr = runtime.buildingSprites[b.id]
        if (!spr) continue
        ctx.drawImage(spr.canvas, ((b.x + 2) * TS - 4) * k, ((b.y + 2) * TS - spr.offY) * k, spr.canvas.width * k, spr.canvas.height * k)
      }
      // sepia parchment wash
      ctx.fillStyle = "rgba(160, 110, 40, 0.12)"; ctx.fillRect(0, 0, cv.width, cv.height)
      const px = (runtime.player.x / TILE_PX + 2) * TS * k, py = (runtime.player.y / TILE_PX + 2) * TS * k
      const pulse = 6 + Math.sin(t / 180) * 3
      ctx.strokeStyle = "#ff5a4a"; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(px, py, pulse + 6, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = "#1d1006"; ctx.fillRect(px - 6, py - 6, 12, 12)
      ctx.fillStyle = "#ff5a4a"; ctx.fillRect(px - 4, py - 4, 8, 8)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [cols, rows])

  const travel = (id: string) => { requestTeleport(id); onClose() }
  const list = BUILDINGS.filter((b) => b.id !== "cave")

  return (
    <div className="fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{
      position: "fixed", inset: 0, zIndex: 140, background: "rgba(8,4,2,.72)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div className="modal-in" style={{ ...panel, padding: 14, maxWidth: "min(1100px, 100%)", width: "100%", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: 12, color: "#3a2412", letterSpacing: 2 }}>MAP OF {first.toUpperCase()}&apos;S VILLAGE</div>
          <button onClick={onClose} aria-label="Close map" style={{ width: 34, height: 34, background: "#c8463b", color: "#fff", border: "3px solid #1d1006", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} strokeWidth={3} /></button>
        </div>
        <div className="map-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 240px", gap: 14 }}>
          <div style={{ position: "relative", border: "3px solid #1d1006", lineHeight: 0 }}>
            <canvas ref={ref} width={cols * 12} height={rows * 12} className="pixelated" style={{ width: "100%", height: "auto", display: "block" }} />
            {list.map((b) => {
              const left = ((b.x + 2 + b.w / 2) / cols) * 100, top = ((b.y + 2) / rows) * 100
              return (
                <button key={b.id} onClick={() => travel(b.id)} onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)}
                  style={{
                    position: "absolute", left: `${left}%`, top: `${top}%`, transform: `translate(-50%, -100%) scale(${hover === b.id ? 1.12 : 1})`,
                    fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 1, whiteSpace: "nowrap", lineHeight: 1,
                    background: ACCENT[b.id], color: "#fff", border: "2px solid #1d1006", padding: "6px 8px", cursor: "pointer",
                    boxShadow: "0 3px 0 #1d1006", transition: "transform .12s",
                  }}>
                  {visited.has(b.id) ? "✓ " : ""}{SECTION[b.id].toUpperCase()}
                </button>
              )
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#5c4022", marginBottom: 2 }}>Click a place to fast-travel there.</div>
            {list.map((b) => (
              <button key={b.id} onClick={() => travel(b.id)} onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)} className="parch-btn" style={{
                display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer",
                background: hover === b.id ? "#fff8e2" : "#f4e6c0", border: "2px solid #1d1006", padding: "9px 10px",
                boxShadow: "0 3px 0 #1d1006",
              }}>
                <span style={{ width: 14, height: 14, background: ACCENT[b.id], border: "2px solid #1d1006", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-pixel)", fontSize: 8, color: "#3a2412" }}>{b.label}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 14, color: "#8f6a3a", marginTop: 3 }}>{SECTION[b.id]}</span>
                </span>
                {visited.has(b.id) && <span style={{ color: "#2f6b2a", fontFamily: "var(--font-pixel)", fontSize: 10 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 760px) { .map-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
