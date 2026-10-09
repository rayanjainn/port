"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useGameStore } from "@/lib/store"
import { gameAchievements } from "@/lib/data"
import { playSound, setMusicEnabled } from "@/lib/audio"
import { useContent } from "@/lib/content"
import { runtime, toggleNight, requestTeleport } from "@/lib/runtime"
import { BUILDINGS } from "@/lib/world/village"
import { Trophy, Volume2, VolumeX, Moon, Sun, Map as MapIcon, LayoutList, Navigation, X, Music, Music2, DoorOpen } from "lucide-react"

const ACCENT: Record<string, string> = Object.fromEntries(BUILDINGS.filter((b) => b.accent).map((b) => [b.id, b.accent!]))
const QUEST_TEXT: Record<string, string> = {
  townhall: "Meet the Mayor in the Town Hall",
  gallery: "Tour the paintings in the Gallery",
  tavern: "Read the quest board at the Tavern",
  forge: "Inspect the weapon racks at the Forge",
  academy: "Read the scrolls at the Academy",
  wizard: "Send a raven from the Raven Post",
  cave: "Find the arcade hidden in the Old Mine",
}
const QUEST_ORDER = ["townhall", "gallery", "tavern", "forge", "academy", "wizard", "cave"]
const SECTIONS = BUILDINGS.filter((b) => b.section)

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
    color: active ? "#3a2412" : "#8f7246", filter: active ? undefined : "saturate(.3) brightness(.92)",
  }
  if (href) return <Link href={href} title={title} aria-label={title} style={style} className="parch-btn">{children}</Link>
  return <button onClick={onClick} title={title} aria-label={title} style={style} className="parch-btn">{children}</button>
}

export default function HUD() {
  const c = useContent()
  const { unlockedAchievements, sfxEnabled, toggleSfx, musicEnabled, toggleMusic, visited, mapOpen, setMapOpen, phase, sceneId } = useGameStore()
  const [night, setNight] = useState(runtime.nightTarget > 0.5)
  const arrowRef = useRef<HTMLDivElement>(null)
  const distRef = useRef<HTMLSpanElement>(null)

  const done = QUEST_ORDER.filter((q) => visited.has(q))
  const nextQuest = QUEST_ORDER.find((q) => !visited.has(q))
  const inside = sceneId !== "village"
  const here = BUILDINGS.find((b) => b.id === sceneId)

  useEffect(() => {
    let raf = 0, last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 80) return
      last = t
      setNight(runtime.nightTarget > 0.5)
      const d = nextQuest ? runtime.doors[nextQuest] : null
      if (d && arrowRef.current && distRef.current && runtime.scene === "village") {
        const dx = d.x - runtime.player.x, dy = d.y - runtime.player.y
        arrowRef.current.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`
        distRef.current.textContent = `${Math.round(Math.hypot(dx, dy) / 16)}m`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [nextQuest])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const st = useGameStore.getState()
      if (k === "m" && !e.repeat && !st.dialog && st.phase !== "building") { st.setMapOpen(!st.mapOpen); playSound(st.mapOpen ? "close" : "open") }
      if (k === "escape" && st.mapOpen) st.setMapOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const total = gameAchievements.length
  const first = c.profile.name.split(" ")[0]

  return (
    <>
      {/* player card + quest */}
      <div className="hud-card fade-in" style={{ position: "fixed", top: 14, left: 14, zIndex: 50, width: 310, ...panel, padding: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 52, height: 52, flexShrink: 0, border: "3px solid #1d1006", background: "radial-gradient(circle at 50% 35%, #4b3a6e, #1e1630)", overflow: "hidden", boxShadow: "0 0 0 2px #e3c98a" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/na/chars/Villager3/face.png" alt="" className="pixelated" style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
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
          {inside && here ? (
            <>
              <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", background: ACCENT[here.id] ?? "#8a5a2c", border: "3px solid #1d1006", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <DoorOpen size={14} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "#c8463b", letterSpacing: 1 }}>INSIDE · {here.label}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#3a2412", marginTop: 3, lineHeight: 1.2 }}>Talk to people (E) and look for <b>▼</b> markers. The doormat leads outside.</div>
              </div>
            </>
          ) : nextQuest ? (
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
              <button onClick={() => { requestTeleport(nextQuest); playSound("magic") }} title="Fast travel"
                style={{ fontFamily: "var(--font-pixel)", fontSize: 7, padding: "7px 8px", background: "#3a2412", color: "#ffe39a", border: "2px solid #1d1006", cursor: "pointer" }}>GO</button>
            </>
          ) : (
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#2f6b2a" }}>✦ Village fully explored! Thanks for visiting {first}&apos;s world.</div>
          )}
        </div>
      </div>

      {/* top-right controls */}
      <div className="hud-btns fade-in" style={{ position: "fixed", top: 14, right: 14, zIndex: 50, display: "flex", gap: 8, alignItems: "center" }}>
        <div title="Achievements" style={{ ...panel, height: 42, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-pixel)", fontSize: 9, color: "#3a2412" }}>
          <Trophy size={15} color="#c58a12" /> {unlockedAchievements.size}/{total}
        </div>
        <IconBtn title="Map (M)" onClick={() => { setMapOpen(!mapOpen); playSound("open") }}><MapIcon size={18} /></IconBtn>
        {!inside && (
          <IconBtn title={night ? "Day (N)" : "Night (N)"} onClick={() => { toggleNight(); playSound("click"); setNight(!night) }}>
            {night ? <Sun size={18} /> : <Moon size={18} />}
          </IconBtn>
        )}
        <IconBtn title={musicEnabled ? "Mute music" : "Play music"} active={musicEnabled} onClick={() => { toggleMusic(); setMusicEnabled(!musicEnabled) }}>
          {musicEnabled ? <Music size={18} /> : <Music2 size={18} />}
        </IconBtn>
        <IconBtn title={sfxEnabled ? "Mute sounds" : "Unmute sounds"} active={sfxEnabled} onClick={() => { if (sfxEnabled) playSound("click"); toggleSfx(); if (!sfxEnabled) setTimeout(() => playSound("click"), 0) }}>
          {sfxEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </IconBtn>
        <IconBtn title="Quick view" href="/quick"><LayoutList size={18} /></IconBtn>
      </div>

      {!inside && <MiniMap onOpen={() => { setMapOpen(true); playSound("open") }} />}

      <div className="hud-hints fade-in" style={{
        position: "fixed", bottom: 16, left: 16, zIndex: 40, display: "flex", gap: 14, flexWrap: "wrap", maxWidth: "60vw",
        fontFamily: "var(--font-pixel)", fontSize: 7, color: "#fff6dc", letterSpacing: 1, textShadow: "0 2px 0 rgba(0,0,0,.6)",
      }}>
        <span style={hint}><span className="kbd">W</span><span className="kbd">A</span><span className="kbd">S</span><span className="kbd">D</span> MOVE</span>
        <span style={hint}><span className="kbd" style={{ minWidth: 44 }}>CLICK</span> WALK HERE</span>
        <span style={hint}><span className="kbd">E</span> TALK / ENTER</span>
        <span style={hint}><span className="kbd">M</span> MAP</span>
        {!inside && <span style={hint}><span className="kbd">N</span> NIGHT</span>}
        {sceneId === "cave" && <span style={hint}><span className="kbd" style={{ minWidth: 48 }}>SPACE</span> SWING</span>}
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

const hint: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5 }

function MiniMap({ onOpen }: { onOpen: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0, last = 0
    const W = 210, H = 140, Z = 0.36   // canvas px per native px
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (t - last < 70) return
      last = t
      const cv = ref.current, map = runtime.mapCanvas
      if (!cv || !map) return
      const ctx = cv.getContext("2d")!
      ctx.imageSmoothingEnabled = true
      const vw = W / Z, vh = H / Z
      const x0 = Math.max(0, Math.min(runtime.mapSize.w - vw, runtime.player.x - vw / 2))
      const y0 = Math.max(0, Math.min(runtime.mapSize.h - vh, runtime.player.y - vh / 2))
      ctx.drawImage(map, x0, y0, vw, vh, 0, 0, W, H)
      if (runtime.night > 0.05) { ctx.fillStyle = `rgba(10,14,50,${runtime.night * 0.4})`; ctx.fillRect(0, 0, W, H) }
      for (const [id, d] of Object.entries(runtime.doors)) {
        const x = (d.x - x0) * Z, y = (d.y - y0) * Z
        if (x < -6 || y < -6 || x > W + 6 || y > H + 6) continue
        ctx.fillStyle = "#1d1006"; ctx.fillRect(x - 5, y - 9, 10, 10)
        ctx.fillStyle = ACCENT[id] ?? "#fff"; ctx.fillRect(x - 3, y - 7, 6, 6)
      }
      const px = (runtime.player.x - x0) * Z, py = (runtime.player.y - y0) * Z
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(px, py, 6 + Math.sin(t / 200) * 2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#1d1006"; ctx.fillRect(px - 4, py - 4, 8, 8)
      ctx.fillStyle = "#ff5a4a"; ctx.fillRect(px - 3, py - 3, 6, 6)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <button onClick={onOpen} className="hud-mini fade-in parch-btn" title="Open map (M)" style={{ position: "fixed", right: 14, bottom: 14, zIndex: 40, padding: 6, cursor: "pointer", ...panel }}>
      <canvas ref={ref} width={210} height={140} style={{ display: "block", width: 210, height: 140, border: "2px solid #1d1006" }} />
      <div style={{ position: "absolute", top: -12, left: 10, fontFamily: "var(--font-pixel)", fontSize: 7, letterSpacing: 1, color: "#fff4dc", background: "#c8463b", border: "2px solid #1d1006", padding: "4px 7px" }}>MAP · M</div>
    </button>
  )
}

function WorldMap({ onClose, visited, first }: { onClose: () => void; visited: Set<string>; first: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const inVillage = useGameStore((s) => s.sceneId) === "village"

  useEffect(() => {
    let raf = 0
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      const cv = ref.current, map = runtime.mapCanvas
      if (!cv || !map) return
      const ctx = cv.getContext("2d")!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(map, 0, 0, cv.width, cv.height)
      ctx.fillStyle = "rgba(160, 110, 40, 0.1)"; ctx.fillRect(0, 0, cv.width, cv.height)
      if (!inVillage) return
      const k = cv.width / runtime.mapSize.w
      const px = runtime.player.x * k, py = runtime.player.y * k
      ctx.strokeStyle = "#ff5a4a"; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(px, py, 10 + Math.sin(t / 180) * 3, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = "#1d1006"; ctx.fillRect(px - 6, py - 6, 12, 12)
      ctx.fillStyle = "#ff5a4a"; ctx.fillRect(px - 4, py - 4, 8, 8)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [inVillage])

  const travel = (id: string) => { requestTeleport(id); playSound("magic"); onClose() }
  const W = runtime.mapSize.w || 1344, H = runtime.mapSize.h || 1024

  return (
    <div className="fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{
      position: "fixed", inset: 0, zIndex: 140, background: "rgba(8,4,2,.72)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div className="modal-in" style={{ ...panel, padding: 14, maxWidth: "min(1180px, 100%)", width: "100%", maxHeight: "94vh", overflow: "auto", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: 12, color: "#3a2412", letterSpacing: 2 }}>MAP OF {first.toUpperCase()}&apos;S VILLAGE</div>
          <button onClick={onClose} aria-label="Close map" style={{ width: 34, height: 34, background: "#c8463b", color: "#fff", border: "3px solid #1d1006", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} strokeWidth={3} /></button>
        </div>
        <div className="map-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 250px", gap: 14 }}>
          <div style={{ position: "relative", border: "3px solid #1d1006", lineHeight: 0 }}>
            <canvas ref={ref} width={W} height={H} className="pixelated" style={{ width: "100%", height: "auto", display: "block" }} />
            {SECTIONS.map((b) => {
              const d = runtime.doors[b.id]
              if (!d) return null
              return (
                <button key={b.id} onClick={() => travel(b.id)} onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)}
                  style={{
                    position: "absolute", left: `${(d.x / W) * 100}%`, top: `${((d.y - 64) / H) * 100}%`, transform: `translate(-50%, -100%) scale(${hover === b.id ? 1.12 : 1})`,
                    fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 1, whiteSpace: "nowrap", lineHeight: 1,
                    background: ACCENT[b.id], color: "#fff", border: "2px solid #1d1006", padding: "6px 8px", cursor: "pointer", boxShadow: "0 3px 0 #1d1006", transition: "transform .12s",
                  }}>
                  {visited.has(b.id) ? "✓ " : ""}{b.section}
                </button>
              )
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#5c4022", marginBottom: 2 }}>Click a place to fast-travel to its door.</div>
            {SECTIONS.map((b) => (
              <button key={b.id} onClick={() => travel(b.id)} onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)} className="parch-btn" style={{
                display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer",
                background: hover === b.id ? "#fff8e2" : "#f4e6c0", border: "2px solid #1d1006", padding: "9px 10px", boxShadow: "0 3px 0 #1d1006",
              }}>
                <span style={{ width: 14, height: 14, background: ACCENT[b.id], border: "2px solid #1d1006", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-pixel)", fontSize: 8, color: "#3a2412" }}>{b.label}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 14, color: "#8f6a3a", marginTop: 3 }}>{b.section!.charAt(0) + b.section!.slice(1).toLowerCase()}</span>
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
