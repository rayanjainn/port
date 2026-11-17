"use client"
import { useEffect, useRef, useState } from "react"
import { useGameStore, webgl2Supported } from "@/lib/store"
import { gameAchievements } from "@/lib/data"
import { playSound, setMusicEnabled } from "@/lib/audio"
import { useContent } from "@/lib/content"
import { engine } from "@/lib/engine"
import { runtime, toggleNight, requestTeleport } from "@/lib/runtime"
import { worldById, visitKey } from "@/lib/world/worlds"
import { VOCAB, useWorldTheme } from "@/lib/theme"
import { Panel, Bar, Button, IconButton, Kbd, Ribbon } from "@/components/ui/kit"
import { Trophy, Volume2, VolumeX, Moon, Sun, Map as MapIcon, LayoutList, Navigation, X, Music, Music2, DoorOpen, Globe } from "lucide-react"

export default function HUD() {
  const c = useContent()
  const view = useGameStore((s) => s.view)
  const { unlockedAchievements, sfxEnabled, toggleSfx, musicEnabled, toggleMusic, visited, mapOpen, setMapOpen, phase, sceneId, world: worldId } = useGameStore()
  const world = worldById(worldId)
  const vocab = VOCAB[worldId] ?? VOCAB.village
  const lms = runtime.landmarks
  const accentOf = (id: string) => lms.find((l) => l.id === id)?.accent ?? "#8a5a2c"
  const [night, setNight] = useState(runtime.nightTarget > 0.5)
  const arrowRef = useRef<HTMLDivElement>(null)
  const distRef = useRef<HTMLSpanElement>(null)

  const QUEST_ORDER = lms.map((l) => l.id)
  const isV = (q: string) => visited.has(visitKey(worldId, q))
  const done = QUEST_ORDER.filter(isV)
  const nextQuest = QUEST_ORDER.find((q) => !isV(q))
  const inside = sceneId !== world.scene
  const outdoor = !!engine.scenes[sceneId]?.scene.outdoor
  const here = lms.find((b) => b.id === sceneId)

  useEffect(() => {
    let raf = 0, last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 80) return
      last = t
      setNight(runtime.nightTarget > 0.5)
      const d = nextQuest ? runtime.doors[nextQuest] : null
      const entry = worldById(useGameStore.getState().world).scene
      if (d && arrowRef.current && distRef.current && runtime.scene === entry) {
        const dx = d.x - runtime.player.x, dy = d.y - runtime.player.y
        arrowRef.current.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`
        distRef.current.textContent = `${Math.round(Math.hypot(dx, dy) / 16)}m`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [nextQuest, worldId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const st = useGameStore.getState()
      if (st.worldSelect || st.travel) return
      if (k === "g" && !e.repeat && st.phase === "playing" && !st.dialog && !st.mapOpen) { st.openWorldSelect("hud"); playSound("open"); return }
      if (k === "m" && !e.repeat && !st.dialog && st.phase !== "building") { st.setMapOpen(!st.mapOpen); playSound(st.mapOpen ? "close" : "open") }
      if (k === "v" && !e.repeat && st.phase === "playing" && !st.dialog && !st.mapOpen && !(e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) && webgl2Supported()) { st.toggleView(); playSound("click") }
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
      <Panel v="hud" fx className="hud-card fade-in" style={{ position: "fixed", top: 14, left: 14, zIndex: 50, width: 310, padding: 12 }}>
        <div className="hud-top">
          <div className="hud-face">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/na/chars/Villager3/face.png" alt="" className="pixelated" />
          </div>
          <div className="hud-id">
            <div className="hud-pass">{vocab.pass}</div>
            <div className="hud-name">{c.profile.name.toUpperCase()}</div>
            <div className="hud-title">{c.profile.title}</div>
            <div className="hud-prog">
              <Bar value={done.length / QUEST_ORDER.length} />
              <span>{done.length}/{QUEST_ORDER.length}</span>
            </div>
          </div>
        </div>

        <div className="hud-quest">
          {inside && here ? (
            <>
              <div className="hud-dot" style={{ ["--c" as string]: accentOf(here.id) }}><DoorOpen size={14} /></div>
              <div className="hud-qtxt">
                <div className="hud-qkick">INSIDE · {here.label}</div>
                <div className="hud-qbody">Talk to people (E) and look for <b>▼</b> markers. The doormat leads outside.</div>
              </div>
            </>
          ) : nextQuest ? (
            <>
              <div className="hud-dot" style={{ ["--c" as string]: accentOf(nextQuest) }}>
                <div ref={arrowRef} style={{ color: "#fff", display: "flex", transition: "transform .15s linear" }}>
                  <Navigation size={14} fill="#fff" style={{ transform: "rotate(-45deg)" }} />
                </div>
              </div>
              <div className="hud-qtxt">
                <div className="hud-qkick">QUEST · <span ref={distRef} /></div>
                <div className="hud-qbody">{lms.find((l) => l.id === nextQuest)?.quest}</div>
              </div>
              <Button variant="key" title="Fast travel" onClick={() => { requestTeleport(nextQuest); playSound("magic") }} className="hud-go">GO</Button>
            </>
          ) : (
            <div className="hud-qbody hud-done">✦ {world.name} fully explored! Thanks for visiting {first}&apos;s world.</div>
          )}
        </div>
        {worldId !== "village" && (
          <div className="hud-checks" aria-label="Landmark checklist">
            {lms.map((l) => (
              <span key={l.id} title={l.label} data-on={isV(l.id) ? "" : undefined} style={{ ["--c" as string]: l.accent }}>{isV(l.id) ? "✓" : "·"}</span>
            ))}
          </div>
        )}
      </Panel>

      {/* top-right controls */}
      <div className="hud-btns fade-in" style={{ position: "fixed", top: 14, right: 14, zIndex: 50, display: "flex", gap: 8, alignItems: "center" }}>
        <Panel v="tile" title="Achievements" className="hud-trophy">
          <Trophy size={15} /> {unlockedAchievements.size}/{total}
        </Panel>
        <IconButton title="Worlds (G)" onClick={() => { useGameStore.getState().openWorldSelect(world.travel.kind); playSound("open") }}><Globe size={18} /></IconButton>
        <IconButton title="Map (M)" onClick={() => { setMapOpen(!mapOpen); playSound("open") }}><MapIcon size={18} /></IconButton>
        {outdoor && (
          <IconButton title={night ? "Day (N)" : "Night (N)"} onClick={() => { toggleNight(); playSound("click"); setNight(!night) }}>
            {night ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
        )}
        {webgl2Supported() && (
          <IconButton title={view === "3d" ? "Switch to 2D (V)" : "Switch to 3D (V)"} onClick={() => { useGameStore.getState().toggleView(); playSound("click") }}>
            <span style={{ fontFamily: "var(--font-head)", fontSize: 10 }}>{view === "3d" ? "2D" : "3D"}</span>
          </IconButton>
        )}
        <IconButton title={musicEnabled ? "Mute music" : "Play music"} active={musicEnabled} onClick={() => { toggleMusic(); setMusicEnabled(!musicEnabled) }}>
          {musicEnabled ? <Music size={18} /> : <Music2 size={18} />}
        </IconButton>
        <IconButton title={sfxEnabled ? "Mute sounds" : "Unmute sounds"} active={sfxEnabled} onClick={() => { if (sfxEnabled) playSound("click"); toggleSfx(); if (!sfxEnabled) setTimeout(() => playSound("click"), 0) }}>
          {sfxEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </IconButton>
        <IconButton title="Quick view" href="/quick"><LayoutList size={18} /></IconButton>
      </div>

      {!inside && <MiniMap onOpen={() => { setMapOpen(true); playSound("open") }} label={vocab.map} />}

      <div className="hud-hints fade-in">
        <span><Kbd>W</Kbd><Kbd>A</Kbd><Kbd>S</Kbd><Kbd>D</Kbd> MOVE</span>
        <span><Kbd wide>CLICK</Kbd> WALK HERE</span>
        <span><Kbd>E</Kbd> TALK / ENTER</span>
        <span><Kbd>M</Kbd> MAP</span>
        <span><Kbd>G</Kbd> WORLDS</span>
        {outdoor && <span><Kbd>N</Kbd> NIGHT</span>}
        {webgl2Supported() && <span><Kbd>V</Kbd> 2D/3D</span>}
        {sceneId === "cave" && <span><Kbd wide>SPACE</Kbd> SWING</span>}
      </div>

      {mapOpen && phase !== "title" && <WorldMap onClose={() => { setMapOpen(false); playSound("close") }} visited={visited} first={first} />}
    </>
  )
}

function MiniMap({ onOpen, label }: { onOpen: () => void; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const th = useWorldTheme()
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
      for (const lm of runtime.landmarks) {
        const d = lm
        const x = (d.x - x0) * Z, y = (d.y - y0) * Z
        if (x < -6 || y < -6 || x > W + 6 || y > H + 6) continue
        ctx.fillStyle = th.mark.edge; ctx.fillRect(x - 5, y - 9, 10, 10)
        ctx.fillStyle = lm.accent; ctx.fillRect(x - 3, y - 7, 6, 6)
      }
      const px = (runtime.player.x - x0) * Z, py = (runtime.player.y - y0) * Z
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(px, py, 6 + Math.sin(t / 200) * 2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = th.mark.edge; ctx.fillRect(px - 4, py - 4, 8, 8)
      ctx.fillStyle = "#ff5a4a"; ctx.fillRect(px - 3, py - 3, 6, 6)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [th])
  return (
    <button onClick={onOpen} className="hud-mini fade-in" title="Open map (M)" aria-label="Open map" style={{ position: "fixed", right: 14, bottom: 14, zIndex: 40 }}>
      <Panel v="tile" className="hud-mini__frame">
        <canvas ref={ref} width={210} height={140} className="hud-mini__cv" />
        <i className="hud-mini__fx" aria-hidden />
      </Panel>
      <span className="hud-mini__tab">{label} · M</span>
    </button>
  )
}

function WorldMap({ onClose, visited, first }: { onClose: () => void; visited: Set<string>; first: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const worldId = useGameStore((s) => s.world)
  const th = useWorldTheme()
  const inVillage = useGameStore((s) => s.sceneId) === worldById(worldId).scene
  const lms = runtime.landmarks

  useEffect(() => {
    let raf = 0
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      const cv = ref.current, map = runtime.mapCanvas
      if (!cv || !map) return
      const ctx = cv.getContext("2d")!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(map, 0, 0, cv.width, cv.height)
      ctx.fillStyle = th.mapTint; ctx.fillRect(0, 0, cv.width, cv.height)
      if (!inVillage) return
      const k = cv.width / runtime.mapSize.w
      const px = runtime.player.x * k, py = runtime.player.y * k
      ctx.strokeStyle = "#ff5a4a"; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(px, py, 10 + Math.sin(t / 180) * 3, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = th.mark.edge; ctx.fillRect(px - 6, py - 6, 12, 12)
      ctx.fillStyle = "#ff5a4a"; ctx.fillRect(px - 4, py - 4, 8, 8)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [inVillage, th])

  const travel = (id: string) => { requestTeleport(id); playSound("magic"); onClose() }
  const W = runtime.mapSize.w || 1344, H = runtime.mapSize.h || 1024
  void first
  const title = worldId === "village" ? `MAP OF ${first.toUpperCase()}'S VILLAGE` : `MAP OF ${worldById(worldId).name.toUpperCase()}`

  return (
    <div className="fade-in k-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: "fixed", inset: 0, zIndex: 140, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Panel v="map" fx className="modal-in map-panel" style={{ padding: 14, maxWidth: "min(1180px, 100%)", width: "100%", maxHeight: "94vh", overflow: "visible" }}>
        <div className="map-scroll">
          <div className="map-head">
            <Ribbon small>{title}</Ribbon>
            <IconButton title="Close map" danger onClick={onClose}><X size={16} strokeWidth={3} /></IconButton>
          </div>
          <div className="map-grid">
            <div className="map-frame">
              <canvas ref={ref} width={W} height={H} className="pixelated" style={{ width: "100%", height: "auto", display: "block" }} />
              <i className="map-fx" aria-hidden />
              {lms.map((b) => {
                const d = runtime.doors[b.id]
                if (!d) return null
                return (
                  <button key={b.id} onClick={() => travel(b.id)} onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)} className="map-pin k-btn" data-v="accent" data-hot={hover === b.id ? "" : undefined}
                    style={{ left: `${(d.x / W) * 100}%`, top: `${((d.y - 64) / H) * 100}%`, ["--c" as string]: b.accent }}>
                    {visited.has(visitKey(worldId, b.id)) ? "✓ " : ""}{b.sub}
                  </button>
                )
              })}
            </div>
            <div className="map-list">
              <div className="map-note">Click a place to fast-travel to its door.</div>
              {lms.map((b) => (
                <button key={b.id} onClick={() => travel(b.id)} onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)} className="map-row k-btn" data-hot={hover === b.id ? "" : undefined} style={{ ["--c" as string]: b.accent }}>
                  <span className="map-row__sw" />
                  <span className="map-row__txt">
                    <span className="map-row__name">{b.label}</span>
                    <span className="map-row__sub">{b.sub.charAt(0) + b.sub.slice(1).toLowerCase()}</span>
                  </span>
                  {visited.has(visitKey(worldId, b.id)) && <span className="map-row__ok">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}
