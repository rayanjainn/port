"use client"
import { useEffect, useMemo, useState } from "react"
import { useGameStore, webgl2Supported } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { useContent } from "@/lib/content"
import { charSheet, CHARS } from "@/lib/na"
import { ArrowRight, Play, Globe } from "lucide-react"
import { worldById } from "@/lib/world/worlds"
import { Github } from "@/components/icons"
import { Panel, Button, Kbd, Ribbon, IconButton } from "@/components/ui/kit"
import { VOCAB } from "@/lib/theme"

function useTypewriter(lines: string[]) {
  const [text, setText] = useState("")
  useEffect(() => {
    let li = 0, ci = 0, del = false
    let id: ReturnType<typeof setTimeout>
    const tick = () => {
      const line = lines[li % lines.length]
      if (!del) {
        ci++
        setText(line.slice(0, ci))
        if (ci >= line.length) { del = true; id = setTimeout(tick, 2200); return }
        id = setTimeout(tick, 38 + Math.random() * 40)
      } else {
        ci--
        setText(line.slice(0, ci))
        if (ci <= 0) { del = false; li++; id = setTimeout(tick, 350); return }
        id = setTimeout(tick, 16)
      }
    }
    id = setTimeout(tick, 900)
    return () => clearTimeout(id)
  }, [lines])
  return text
}

export default function TitleScreen() {
  const startGame = useGameStore((s) => s.startGame)
  const c = useContent()
  const view = useGameStore((s) => s.view)
  const setView = useGameStore((s) => s.setView)
  const gl = webgl2Supported()
  const [leaving, setLeaving] = useState(false)
  const world = worldById(useGameStore((s) => s.world))
  const selecting = useGameStore((s) => !!s.worldSelect)
  const startRequest = useGameStore((s) => s.startRequest)
  const pv = world.preview
  const pans = world.id === "village" ? [[1900, 1250], [2500, 1500], [1300, 1750]] : pv ? [[pv.pan[0][0] / 100 * pv.w * 3, pv.pan[0][1] / 100 * pv.h * 3], [pv.pan[1][0] / 100 * pv.w * 3, pv.pan[1][1] / 100 * pv.h * 3], [pv.w * 1.5, pv.h * 1.5]] : [[0, 0], [0, 0], [0, 0]]
  const lines = useMemo(() => [c.profile.title.toLowerCase(), c.profile.tagline.toLowerCase(), c.profile.motto].filter(Boolean), [c.profile.title, c.profile.tagline, c.profile.motto])
  const typed = useTypewriter(lines)

  const start = () => {
    if (leaving) return
    playSound("bong")
    setLeaving(true)
    setTimeout(startGame, 650)
  }

  useEffect(() => { if (startRequest > 0) { const id = setTimeout(start, 0); return () => clearTimeout(id) } }, [startRequest]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" && !useGameStore.getState().worldSelect) start() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const vocab = VOCAB[world.id] ?? VOCAB.village
  return (
    <div className="title-root" style={{ position: "fixed", inset: 0, zIndex: 100, overflow: "hidden" }}>
      {/* the actual world, drifting slowly underneath */}
      <div className="title-map" aria-hidden style={{
        backgroundImage: `url(${pv?.start === "night" ? pv.night : pv?.day ?? "/village-map.png"})`, width: (pv?.w ?? 1344) * 3, height: (pv?.h ?? 1024) * 3,
        ["--p0" as string]: `translate(calc(50vw - ${pans[0][0]}px), calc(50vh - ${pans[0][1]}px))`,
        ["--p1" as string]: `translate(calc(50vw - ${pans[1][0]}px), calc(50vh - ${pans[1][1]}px))`,
        ["--p2" as string]: `translate(calc(50vw - ${pans[2][0]}px), calc(50vh - ${pans[2][1]}px))`,
      }} />
      <div aria-hidden className="title-tint" />
      <div aria-hidden className="title-vig" />
      {/* drifting petals / rain / sand / motes */}
      <div aria-hidden className="petals title-fx">{Array.from({ length: 14 }).map((_, i) => <span key={i} style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${11 + (i % 5) * 2}s` }} />)}</div>

      {/* top bar */}
      <div className="fade-in title-top">
        <Panel v="tile" className="title-brand">{c.profile.name.split(" ")[0].toUpperCase()}.WORLD</Panel>
        <IconButton title="GitHub" href={c.socials.github}><Github size={17} /></IconButton>
      </div>

      {/* title card */}
      <div className="title-stage" style={{ opacity: leaving || selecting ? 0 : 1, transform: leaving ? "scale(1.05)" : "none" }}>
        <Panel v="title" fx className="title-card">
          <div className="title-ribbon-wrap"><Ribbon className="title-ribbon">◆ {world.id === "village" ? vocab.hero : world.name.toUpperCase()} ◆</Ribbon></div>
          <div className="title-hero">
            <div className="hero-walk" style={{ backgroundImage: `url(${charSheet(CHARS.hero)})` }} />
          </div>
          <h1 className="title-name">{c.profile.name.toUpperCase()}</h1>
          <div className="title-typed"><span className="title-prompt">❯ </span><span className="caret">{typed}</span></div>
          <div className="title-actions">
            <Button variant="cta" onClick={start} onMouseEnter={() => playSound("click")}><Play size={13} fill="currentColor" /> START ADVENTURE</Button>
            <Button variant="accent" accent={world.accent} aria-label="Choose a world" onClick={() => { playSound("open"); useGameStore.getState().openWorldSelect("title") }} onMouseEnter={() => playSound("click")}><Globe size={14} /> WORLDS</Button>
            <Button href="/quick" onClick={() => playSound("click")}>QUICK VIEW <ArrowRight size={13} /></Button>
          </div>
          <div className="title-entering">NOW ENTERING · <b>{world.name.toUpperCase()}</b></div>
          <div className="title-view">
            <span>VIEW:</span>
            <div className="title-seg">
              {(["2d", "3d"] as const).map((v) => {
                const on = view === v, off = v === "3d" && !gl
                return <button key={v} disabled={off} onClick={() => { setView(v); playSound("click") }} aria-pressed={on} data-on={on ? "" : undefined}>{v.toUpperCase()}</button>
              })}
            </div>
            {!gl && <span className="title-gl">3D needs WebGL2, not available here.</span>}
          </div>
        </Panel>

        <div className="kb-only fade-in title-keys">
          <span><Kbd>W</Kbd><Kbd>A</Kbd><Kbd>S</Kbd><Kbd>D</Kbd> MOVE</span>
          <span><Kbd wide>CLICK</Kbd> WALK</span>
          <span><Kbd>E</Kbd> TALK</span>
          <span><Kbd>M</Kbd> MAP</span>
          <span><Kbd>N</Kbd> NIGHT</span>
        </div>
        <div className="kb-only blink title-enter">PRESS ENTER</div>
      </div>

      <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", background: "#07060d", clipPath: leaving ? "circle(150% at 50% 50%)" : "circle(0% at 50% 50%)", transition: "clip-path .65s cubic-bezier(.7,0,.3,1)" }} />
    </div>
  )
}
