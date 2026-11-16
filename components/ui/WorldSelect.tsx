"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { engine } from "@/lib/engine"
import { runtime } from "@/lib/runtime"
import { charSheet, CHARS } from "@/lib/na"
import { WORLDS, worldById, worldVisitedCount, type World } from "@/lib/world/worlds"
import { X, ChevronLeft, ChevronRight, Lock, Ship, TramFront, Tent, Ghost } from "lucide-react"

const GAP = 22
const CARD_H = 590

/** The "choose your world" screen: a hall of diorama cards, one per world. */
export default function WorldSelect() {
  const origin = useGameStore((s) => s.worldSelect)
  if (!origin) return null
  return <Screen key={origin} origin={origin} />
}

function Screen({ origin }: { origin: NonNullable<ReturnType<typeof useGameStore.getState>["worldSelect"]> }) {
  const current = useGameStore((s) => s.world)
  const visited = useGameStore((s) => s.visited)
  const load = useGameStore((s) => s.worldLoad)
  const rootRef = useRef<HTMLDivElement>(null)
  const [focus, setFocus] = useState(() => Math.max(0, WORLDS.findIndex((w) => w.id === current)))
  const focusRef = useRef(0)
  const [pending, setPending] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [vp, setVp] = useState({ w: 1280, h: 800 })
  const [closing, setClosing] = useState(false)
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)

  // where the player stands, as a snapshot for the "you are here" pin
  const here = useMemo(() => {
    const w = worldById(current)
    const m = runtime.maps[w.id]
    const inEntry = runtime.scene === w.scene
    const hero = engine.state?.hero ?? runtime.player
    const pos = inEntry ? hero : runtime.doors[runtime.scene] ?? hero
    return m ? { x: Math.max(0, Math.min(1, pos.x / m.w)), y: Math.max(0, Math.min(1, pos.y / m.h)) } : null
  }, [current])

  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    on()
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])

  const fit = vp.w >= 1120
  const cw = fit ? Math.max(250, Math.min(322, (vp.w - 96 - GAP * (WORLDS.length - 1)) / WORLDS.length)) : Math.min(340, vp.w * 0.84)
  const avail = vp.h - (vp.w < 640 ? 196 : 236)
  const k = Math.max(0.55, Math.min(1, avail / CARD_H))
  const total = WORLDS.length * cw + (WORLDS.length - 1) * GAP
  const shift = fit ? (vp.w / k - total) / 2 : vp.w / k / 2 - (focus * (cw + GAP) + cw / 2)

  useEffect(() => { focusRef.current = focus }, [focus])

  const move = useCallback((d: number) => {
    setFocus((f) => {
      const n = Math.max(0, Math.min(WORLDS.length - 1, f + d))
      if (n !== f) playSound("menu")
      return n
    })
  }, [])

  const close = useCallback(() => {
    if (closing) return
    playSound("close")
    setClosing(true)
    setTimeout(() => useGameStore.getState().closeWorldSelect(), 220)
  }, [closing])

  const confirm = useCallback((w: World) => {
    if (pending) return
    if (w.status === "soon") { playSound("error"); setShake((n) => n + 1); return }
    if (w.id === useGameStore.getState().world && origin !== "title") { close(); return }
    playSound("bong")
    if (origin === "title") {
      setPending(w.id)
      void engine.ensureWorld(w.id).then((ok) => { if (ok) engine.chooseWorld(w.id, origin); else setPending(null) })
    } else engine.chooseWorld(w.id, origin)
  }, [origin, pending, close])

  useEffect(() => {
    rootRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === "escape") { e.preventDefault(); e.stopPropagation(); close(); return }
      if (key === "arrowleft" || key === "a") { e.preventDefault(); move(-1) }
      else if (key === "arrowright" || key === "d") { e.preventDefault(); move(1) }
      else if (key === "home") { e.preventDefault(); setFocus(0) }
      else if (key === "end") { e.preventDefault(); setFocus(WORLDS.length - 1) }
      else if (key >= "1" && key <= String(WORLDS.length)) { setFocus(+key - 1); playSound("menu") }
      else if (key === "enter" || key === " ") {
        // let a focused button handle its own activation
        if (e.target instanceof HTMLButtonElement && e.target.dataset.ws !== "cta") return
        e.preventDefault(); e.stopPropagation()
        if (e.repeat) return
        confirm(WORLDS[focusRef.current])
      } else if (key === "tab") {
        const nodes = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [])
        if (!nodes.length) return
        const i = nodes.indexOf(document.activeElement as HTMLElement)
        e.preventDefault()
        nodes[(i + (e.shiftKey ? nodes.length - 1 : 1)) % nodes.length].focus()
      }
      // the game behind must not hear the keys
      if (["w", "s", "e", "m", "n", "v", "g"].includes(key)) e.stopPropagation()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [close, confirm, move])

  const fw = WORLDS[focus]
  const live = worldById(current)
  const heading = origin === "title" ? "WHERE DOES THE STORY BEGIN?" : `YOU ARE AT ${live.travel.place}`

  return (
    <div ref={rootRef} data-world-preview={fw.id} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Choose your world" className={`ws-root${closing ? " ws-out" : ""}`}
      style={{ ["--acc" as string]: fw.theme.accent, ["--acc2" as string]: fw.theme.accent2 }}
      onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId } }}
      onPointerUp={(e) => {
        const s = swipe.current
        swipe.current = null
        if (!s || s.id !== e.pointerId) return
        const dx = e.clientX - s.x, dy = e.clientY - s.y
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1)
      }}>
      <div className="ws-sky" aria-hidden>
        <div className="ws-aurora" />
        <div className="ws-stars" />
        <div className="ws-stars ws-stars-2" />
        <div className="ws-horizon" />
      </div>

      <header className="ws-head">
        <div className="ws-ribbon"><span>◆</span> CHOOSE YOUR WORLD <span>◆</span></div>
        <div className="ws-sub">{heading}</div>
        <button className="ws-close parch-btn" onClick={close} aria-label="Close world select"><X size={16} strokeWidth={3} /></button>
      </header>

      <div className="ws-stage" role="listbox" aria-label="Worlds" aria-activedescendant={`ws-card-${fw.id}`}>
        <div className="ws-track" style={{ transform: `scale(${k}) translateX(${shift}px)`, gap: GAP, transformOrigin: "50% 40%" }}>
          {WORLDS.map((w, i) => (
            <Card key={w.id} w={w} i={i} cw={cw} focused={i === focus} isHere={w.id === current} here={here}
              visited={visited} load={load[w.id]} pending={pending === w.id} origin={origin} shake={i === focus ? shake : 0}
              onFocus={() => { if (i !== focus) { setFocus(i); playSound("menu") } }}
              onConfirm={() => { if (i !== focus) { setFocus(i); playSound("menu") } else confirm(w) }}
              onCta={() => confirm(w)} />
          ))}
        </div>
      </div>

      {!fit && (
        <>
          <button className="ws-arrow ws-arrow-l parch-btn" onClick={() => move(-1)} disabled={focus === 0} aria-label="Previous world"><ChevronLeft size={20} strokeWidth={3} /></button>
          <button className="ws-arrow ws-arrow-r parch-btn" onClick={() => move(1)} disabled={focus === WORLDS.length - 1} aria-label="Next world"><ChevronRight size={20} strokeWidth={3} /></button>
        </>
      )}

      <footer className="ws-foot">
        <nav className="ws-route" aria-label="World route">
          <div className="ws-route-line" aria-hidden />
          {WORLDS.map((w, i) => (
            <button key={w.id} className="ws-node" data-on={i === focus} data-soon={w.status === "soon"} data-here={w.id === current}
              style={{ ["--c" as string]: w.accent }} onClick={() => { setFocus(i); playSound("menu") }} aria-label={`${w.name}${w.status === "soon" ? ", coming soon" : ""}`}>
              {w.id === current && <i className="ws-node-hero" style={{ backgroundImage: `url(${charSheet(CHARS.hero)})` }} aria-hidden />}
              <span className="ws-node-dot">{w.status === "soon" ? <Lock size={9} strokeWidth={3} /> : w.roman}</span>
              <span className="ws-node-name">{w.name.toUpperCase()}</span>
            </button>
          ))}
        </nav>
        <div className="ws-keys">
          <span className="kb-only"><span className="kbd"><ChevronLeft size={12} strokeWidth={3} /></span><span className="kbd"><ChevronRight size={12} strokeWidth={3} /></span> CHOOSE</span>
          <span className="kb-only"><span className="kbd" style={{ minWidth: 44 }}>ENTER</span> TRAVEL</span>
          <span className="kb-only"><span className="kbd" style={{ minWidth: 36 }}>ESC</span> BACK</span>
          <span className="ws-swipe">SWIPE TO CHOOSE · TAP TO TRAVEL</span>
        </div>
      </footer>
    </div>
  )
}

const TRAVEL_ICON = { dock: Ship, metro: TramFront, caravan: Tent, ferry: Ghost } as const

function Card({ w, i, cw, focused, isHere, here, visited, load, pending, origin, shake, onFocus, onConfirm, onCta }: {
  w: World; i: number; cw: number; focused: boolean; isHere: boolean; here: { x: number; y: number } | null
  visited: Set<string>; load?: { state: string; progress: number }; pending: boolean; origin: string; shake: number
  onFocus: () => void; onConfirm: () => void; onCta: () => void
}) {
  const soon = w.status === "soon"
  const got = worldVisitedCount(w, visited)
  const total = w.landmarks.length
  const Icon = TRAVEL_ICON[w.travel.kind]
  const loading = !soon && pending
  const pct = Math.round((load?.progress ?? 0) * 100)
  const label = soon ? "COMING SOON" : isHere && origin !== "title" ? "STAY HERE" : loading ? `CHARTING ${pct}%` : origin === "title" ? "BEGIN HERE" : w.travel.verb
  return (
    <div id={`ws-card-${w.id}`} role="option" aria-selected={focused} className="ws-card" data-focus={focused} data-soon={soon} data-here={isHere}
      data-shake={shake % 2} key={shake}
      data-material={w.theme.material}
      style={{ width: cw, ["--c" as string]: w.theme.accent, ["--c2" as string]: w.theme.accent2, ["--dark" as string]: w.theme.dark, ["--light" as string]: w.theme.light, ["--i" as string]: i }}
      onMouseMove={onFocus} onClick={onConfirm} onDoubleClick={onCta}>
      <div className="ws-card-in">
        <div className="ws-top">
          <span className="ws-num">WORLD {w.roman}</span>
          {isHere && !soon && <span className="ws-here"><i />YOU ARE HERE</span>}
          {soon && <span className="ws-locked"><Lock size={10} strokeWidth={3} /> UNCHARTED</span>}
          {!soon && !isHere && got > 0 && <span className="ws-seen">VISITED</span>}
        </div>

        <div className="ws-window">
          {soon ? <Uncharted w={w} /> : <Diorama w={w} here={isHere ? here : null} i={i} />}
          <div className="ws-win-vig" aria-hidden />
          <div className="ws-corners" aria-hidden><b /><b /><b /><b /></div>
          {soon && <div className="ws-stamp" aria-hidden>COMING<br />SOON</div>}
        </div>

        <div className="ws-banner"><span>{w.name.toUpperCase()}</span></div>
        <p className="ws-tag">{w.tagline}</p>

        <ul className="ws-facts">
          {w.facts.map((f) => <li key={f}>{f}</li>)}
        </ul>

        <div className="ws-prog" aria-label={soon ? "Not yet charted" : `${got} of ${total} landmarks visited`}>
          {soon ? (
            <div className="ws-prog-txt"><span>UNEXPLORED</span><span>—</span></div>
          ) : (
            <>
              <div className="ws-prog-txt"><span>LANDMARKS</span><span><b>{got}</b>/{total}</span></div>
              <div className="ws-pips">{w.landmarks.map((l, n) => <i key={l} data-on={n < got} />)}</div>
            </>
          )}
        </div>

        <button className="ws-cta" data-ws="cta" data-soon={soon} disabled={false} onClick={(e) => { e.stopPropagation(); onCta() }} tabIndex={focused ? 0 : -1}>
          {soon ? <Lock size={13} strokeWidth={3} /> : <Icon size={14} strokeWidth={2.5} />}
          <span>{label}</span>
          {!soon && !loading && !(isHere && origin !== "title") && <em>▶</em>}
          {loading && <i className="ws-cta-bar" style={{ width: `${pct}%` }} />}
        </button>
      </div>
      <div className="ws-sel" aria-hidden><b /><b /><b /><b /></div>
    </div>
  )
}

/** A slowly panning, pixel-crisp crop of the world's real map. Day and night cross-fade. */
function Diorama({ w, here, i }: { w: World; here: { x: number; y: number } | null; i: number }) {
  const p = w.preview
  const [fallback, setFallback] = useState<string | null>(null)
  if (!p) return null
  const zoom = 2
  const start = here ? [here.x * 100, here.y * 100] : p.pan[0]
  const end = here ? [p.pan[1][0], p.pan[1][1]] : p.pan[1]
  const a = p.start === "night" ? p.night ?? p.day : p.day
  const b = p.start === "night" ? p.day : p.night
  const mk = (src: string) => (fallback ?? src)
  return (
    <div className="ws-dio" data-world={w.id}>
      <div className="ws-pan" style={{
        width: p.w * zoom, height: p.h * zoom, animationDelay: `${-i * 7}s`,
        ["--x0" as string]: `${start[0]}%`, ["--y0" as string]: `${start[1]}%`, ["--x1" as string]: `${end[0]}%`, ["--y1" as string]: `${end[1]}%`,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ws-map pixelated" src={mk(a)} alt="" draggable={false} onError={() => { const m = runtime.maps[w.id]; if (m && !fallback) setFallback(m.canvas.toDataURL()) }} />
        {b && !fallback && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ws-map ws-map-b pixelated" src={b} alt="" draggable={false} style={{ animationDelay: `${-i * 3.5}s` }} />
        )}
        {here && <i className="ws-pin" style={{ left: `${here.x * 100}%`, top: `${here.y * 100}%` }} aria-hidden><u /></i>}
      </div>
      <Weather id={w.id} />
    </div>
  )
}

function Weather({ id }: { id: string }) {
  const bits = useMemo(() => Array.from({ length: id === "city" ? 26 : 16 }, (_, n) => ({ l: (n * 37.7) % 100, d: -((n * 0.73) % 5), s: 3 + (n % 4) * 0.9, o: 0.3 + (n % 3) * 0.2 })), [id])
  return (
    <div className={`ws-fx ws-fx-${id}`} aria-hidden>
      {bits.map((b, n) => <span key={n} style={{ left: `${b.l}%`, animationDelay: `${b.d}s`, animationDuration: `${b.s}s`, opacity: b.o }} />)}
    </div>
  )
}

/** Fogged, locked card for worlds that are not open yet. */
function Uncharted({ w }: { w: World }) {
  const pix = useMemo(() => {
    const out: React.ReactNode[] = []
    if (w.motif === "dunes") {
      for (let x = 0; x < 96; x++) {
        const far = Math.round(44 + Math.sin(x * 0.09) * 5 + Math.sin(x * 0.23 + 1) * 2)
        const mid = Math.round(54 + Math.sin(x * 0.13 + 2) * 6 + Math.sin(x * 0.31) * 2)
        const near = Math.round(65 + Math.sin(x * 0.07 + 4) * 6 + Math.sin(x * 0.19) * 2)
        out.push(<rect key={`f${x}`} x={x} y={far} width={1} height={80 - far} fill="#8a4a2a" />)
        out.push(<rect key={`m${x}`} x={x} y={mid} width={1} height={80 - mid} fill="#6a3520" />)
        out.push(<rect key={`n${x}`} x={x} y={near} width={1} height={80 - near} fill="#3e1e12" />)
      }
      out.push(<circle key="sun" cx={70} cy={30} r={9} fill="#ffb25e" />, <circle key="sun2" cx={70} cy={30} r={6} fill="#ffe0a0" />)
      // a lone caravan on the far ridge
      for (const cx of [18, 23, 28]) out.push(<rect key={`c${cx}`} x={cx} y={39} width={3} height={3} fill="#2a1208" />, <rect key={`cn${cx}`} x={cx + 2} y={37} width={1} height={3} fill="#2a1208" />)
    } else {
      out.push(<circle key="moon" cx={24} cy={20} r={8} fill="#c8f0e0" />, <circle key="moon2" cx={27} cy={18} r={7} fill="#173a3a" />)
      for (let x = 0; x < 96; x++) {
        const g = Math.round(66 + Math.sin(x * 0.2) * 2 + Math.sin(x * 0.5) * 1)
        out.push(<rect key={`g${x}`} x={x} y={g} width={1} height={80 - g} fill="#0c2a2a" />)
      }
      const cols: [number, number, number][] = [[14, 44, 5], [24, 34, 5], [38, 52, 5], [58, 30, 5], [70, 46, 5], [82, 40, 5]]
      for (const [cx, top, cwid] of cols) {
        out.push(<rect key={`p${cx}`} x={cx} y={top} width={cwid} height={70 - top} fill="#1d4a46" />)
        out.push(<rect key={`pc${cx}`} x={cx - 1} y={top} width={cwid + 2} height={2} fill="#2c6a60" />)
        for (let t = 0; t < 3; t++) out.push(<rect key={`pt${cx}${t}`} x={cx + t * 2} y={top - 2 - ((cx + t) % 3)} width={1 + (t % 2)} height={3} fill="#0c2a2a" />)
      }
      out.push(<rect key="lt" x={46} y={36} width={22} height={3} fill="#1d4a46" />, <rect key="lt2" x={58} y={36} width={3} height={34} fill="#1d4a46" />)
    }
    return out
  }, [w.motif])
  const sky = w.motif === "dunes" ? "linear-gradient(180deg, #2a1230 0%, #8a3a3a 45%, #f2a25a 100%)" : "linear-gradient(180deg, #0a1628 0%, #12343a 60%, #1f5a52 100%)"
  return (
    <div className="ws-unch" style={{ background: sky }}>
      <svg viewBox="0 0 96 80" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" className="ws-unch-art" aria-hidden>{pix}</svg>
      <div className="ws-grid" aria-hidden />
      <div className="ws-fog ws-fog-a" aria-hidden /><div className="ws-fog ws-fog-b" aria-hidden /><div className="ws-fog ws-fog-c" aria-hidden />
      <svg className="ws-padlock" viewBox="0 0 12 15" shapeRendering="crispEdges" aria-hidden>
        <rect x="3" y="0" width="6" height="2" fill="#1d1006" /><rect x="2" y="1" width="2" height="6" fill="#1d1006" /><rect x="8" y="1" width="2" height="6" fill="#1d1006" />
        <rect x="3" y="1" width="1" height="6" fill="#d9c28a" /><rect x="8" y="1" width="1" height="6" fill="#d9c28a" /><rect x="4" y="1" width="4" height="1" fill="#d9c28a" />
        <rect x="0" y="6" width="12" height="9" fill="#1d1006" /><rect x="1" y="7" width="10" height="7" fill="var(--c)" /><rect x="1" y="7" width="10" height="1" fill="#fff" opacity=".45" />
        <rect x="5" y="9" width="2" height="3" fill="#1d1006" /><rect x="5" y="9" width="2" height="1" fill="#1d1006" />
      </svg>
    </div>
  )
}
