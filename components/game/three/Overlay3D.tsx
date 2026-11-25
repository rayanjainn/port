"use client"
// Screen-space UI for the 3D view: signs, markers, bubbles and the interact prompt, styled like the 2D canvas versions.
import { useEffect, useMemo, useRef } from "react"
import { engine, type SceneRT } from "@/lib/engine"
import { runtime } from "@/lib/runtime"
import { BUILDINGS, doorOf } from "@/lib/world/village"
import { TS, type SceneSign } from "@/lib/world/core"
import { overlay } from "./bus"

const base: React.CSSProperties = { position: "absolute", left: 0, top: 0, willChange: "transform", display: "none", pointerEvents: "none" }

function Sign({ b, el }: { b: SceneSign; el: (e: HTMLDivElement | null) => void }) {
  return (
    <div ref={el} style={base}>
      <div data-box className="o3-sign" style={{ ["--ac" as string]: b.accent ?? "#c8463b" } as React.CSSProperties}>
        <div className="o3-sign__t">{b.label}</div>
        <div className="o3-sign__s">{b.sub}</div>
      </div>
    </div>
  )
}

function Tri({ el }: { el: (e: HTMLDivElement | null) => void }) {
  return (
    <div ref={el} style={base}>
      <svg className="o3-tri" width="24" height="18" viewBox="-12 -14 24 18" style={{ position: "absolute", left: -12, top: -14, overflow: "visible" }}>
        <polygon className="o3-tri__edge" points="-9,-12 9,-12 0,2" />
        <polygon data-fill className="o3-tri__fill" points="-7,-10 7,-10 0,-1" />
      </svg>
    </div>
  )
}

function Bang({ el }: { el: (e: HTMLDivElement | null) => void }) {
  return (
    <div ref={el} style={base}>
      <div className="o3-bang">
        <div data-fill className="o3-bang__in">!</div>
      </div>
    </div>
  )
}

function Bubble({ el }: { el: (e: HTMLDivElement | null) => void }) {
  return (
    <div ref={el} style={{ ...base, transform: "translate(-999px,-999px)" }}>
      <div data-box className="o3-bub">
        <span data-text />
        <i className="o3-bub__tail" />
      </div>
    </div>
  )
}

export default function Overlay3D({ rt }: { rt: SceneRT }) {
  const sc = rt.scene
  // generic name boards: the scene's own, or (village only) the building list the 2D view uses
  const signs = useMemo<SceneSign[]>(() => sc.signs ?? (sc.id === "village"
    ? BUILDINGS.filter((b) => b.label).map((b) => ({ x: b.c * TS + doorOf(b).w / 2, y: b.r * TS - 2, label: b.label!, sub: b.section, accent: b.accent, hotspot: `door-${b.id}` }))
    : []), [sc])
  const marks = useMemo(() => sc.hotspots.filter((h) => h.marker && h.markerX !== undefined && h.markerY !== undefined && h.action.type !== "door"), [sc])
  const npcs = useMemo(() => rt.actors.filter((a) => a.def.kind === "npc"), [rt])
  const signEls = useRef<(HTMLDivElement | null)[]>([])
  const markEls = useRef<(HTMLDivElement | null)[]>([])
  const bangEls = useRef<(HTMLDivElement | null)[]>([])
  const bubEls = useRef<(HTMLDivElement | null)[]>([])
  const promptEl = useRef<HTMLDivElement>(null)
  const keyEl = useRef<HTMLDivElement>(null)
  const labelEl = useRef<HTMLSpanElement>(null)
  const touch = useRef(false)
  // project exhibits: their pixel nameplates are tiny in 3D, so the nearest one gets a readable board
  const arts = useMemo(() => sc.hotspots.filter((h) => h.id.startsWith("art-") && h.markerX !== undefined && h.markerY !== undefined), [sc])
  const artEl = useRef<HTMLDivElement | null>(null)
  const artT = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    touch.current = matchMedia("(pointer: coarse)").matches
    // anchor each board to the top of the tallest sprite it sits on, else to a marker-style point
    const sprites = signs.map((b) => {
      let best: (typeof sc.sprites)[number] | undefined
      for (const s of sc.sprites) {
        if (s.dynamic || s.rect[3] < 32 || b.x < s.x || b.x > s.x + s.rect[2] || Math.abs(s.y - (b.y + 2)) > 8) continue
        if (!best || s.rect[3] > best.rect[3]) best = s
      }
      return best
    })
    const shown = new WeakMap<HTMLElement, boolean>()
    const vis = (el: HTMLElement, on: boolean) => { if (shown.get(el) !== on) { shown.set(el, on); el.style.display = on ? "" : "none" } }
    const ok = (sx: number, sy: number, w: number, h: number) => sx > -260 && sx < w + 260 && sy > -120 && sy < h + 260
    overlay.update = (proj, now, w, h) => {
      const S = engine.state
      if (!S) return
      signs.forEach((b, i) => {
        const el = signEls.current[i], s = sprites[i]
        if (!el) return
        const [sx, sy] = s ? proj(b.x, s.baseY, s.rect[3]) : proj(b.x, b.y + 16, 22)
        const on = ok(sx, sy, w, h)
        vis(el, on)
        if (!on) return
        const active = !!b.hotspot && S.near?.id === b.hotspot
        el.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy) - (active ? 6 : 0)}px) translate(-50%,-100%)`
        const box = el.firstElementChild as HTMLElement
        box.style.outline = active ? "2px solid var(--cv-sign-on)" : "none"
        box.style.outlineOffset = "5px"
      })
      marks.forEach((m, i) => {
        const el = markEls.current[i]
        if (!el) return
        const [sx, sy] = proj(m.markerX!, m.markerY! + 16, 22)
        const on = ok(sx, sy, w, h)
        vis(el, on)
        if (!on) return
        el.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy + Math.sin(now * 4 + m.markerX!) * 4)}px)`
        ;(el.querySelector("[data-fill]") as SVGElement | null)?.style.setProperty("fill", S.near === m ? "var(--cv-mark-on)" : "var(--cv-mark)")
      })
      const ae = artEl.current
      if (ae) {
        let best: (typeof arts)[number] | null = null, bd = 56
        for (const h of arts) { const d = Math.hypot(S.hero.x - (h.box.x + h.box.w / 2), S.hero.y - (h.box.y + h.box.h / 2)); if (d < bd) { bd = d; best = h } }
        if (best && !engine.paused) {
          const [sx, sy] = proj(best.markerX!, best.markerY! + 16, 22)
          const on = ok(sx, sy, w, h)
          vis(ae, on)
          if (on) {
            const txt = best.label.replace(/^(VIEW|RECALL)\s+/, "")
            if (artT.current && artT.current.textContent !== txt) artT.current.textContent = txt
            ae.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy) - 18}px) translate(-50%,-100%)`
          }
        } else vis(ae, false)
      }
      for (let i = 0; i < npcs.length; i++) {
        const a = npcs[i]
        const bang = bangEls.current[i], bub = bubEls.current[i]
        if (!bang || !bub) continue
        const talking = a.talkT > 0 && a.def.bark && !a.def.lines
        if (talking) {
          const [sx, sy, vz] = proj(a.x, a.y + 1, 20)
          const k = Math.min(1, a.talkT * 2, (3.5 - a.talkT) * 6)
          const txt = a.def.bark![a.barkI % a.def.bark!.length]
          const t = bub.querySelector("[data-text]") as HTMLElement
          if (t.textContent !== txt) t.textContent = txt
          vis(bub, vz && ok(sx, sy, w, h))
          bub.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy)}px)`
          bub.style.opacity = String(Math.max(0, k))
        } else vis(bub, false)
        if (a.def.lines && !talking) {
          const [sx, sy] = proj(a.x, a.y + 1, 26)
          const on = ok(sx, sy, w, h)
          vis(bang, on)
          if (on) {
            bang.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy + Math.sin(now * 4 + a.x) * 3)}px)`
            ;(bang.querySelector("[data-fill]") as HTMLElement).style.background = S.nearNpc === a ? "var(--cv-mark-on)" : "var(--cv-mark)"
          }
        } else vis(bang, false)
      }
      const pr = promptEl.current
      if (pr) {
        const lab = runtime.nearLabel
        if (lab && !engine.paused) {
          const [sx, sy] = proj(S.hero.x, S.hero.y + 1, 32)
          vis(pr, true)
          pr.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy - 10 + Math.sin(now * 6) * 2)}px) translate(-50%,-100%)`
          if (labelEl.current && labelEl.current.textContent !== lab) labelEl.current.textContent = lab
          const key = touch.current ? "TAP" : "E"
          if (keyEl.current && keyEl.current.textContent !== key) { keyEl.current.textContent = key; keyEl.current.style.width = touch.current ? "34px" : "22px" }
        } else vis(pr, false)
      }
    }
    return () => { overlay.update = null }
  }, [rt, sc, signs, marks, npcs, arts])

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }}>
      {signs.map((b, i) => <Sign key={`${b.label}${i}`} b={b} el={(e) => { signEls.current[i] = e }} />)}
      {marks.map((m, i) => <Tri key={m.id} el={(e) => { markEls.current[i] = e }} />)}
      {npcs.map((a, i) => (
        <span key={a.def.id}>
          <Bang el={(e) => { bangEls.current[i] = e }} />
          <Bubble el={(e) => { bubEls.current[i] = e }} />
        </span>
      ))}
      <div ref={artEl} style={base}>
        <div data-box className="o3-sign" style={{ ["--ac" as string]: "#c8a050" } as React.CSSProperties}>
          <div ref={artT} className="o3-sign__t" />
          <div className="o3-sign__s">PROJECT</div>
        </div>
      </div>
      <div ref={promptEl} style={base}>
        <div className="o3-prompt">
          <div ref={keyEl} className="o3-prompt__key">E</div>
          <span ref={labelEl} className="o3-prompt__lab" />
          <i className="o3-prompt__tail" />
        </div>
      </div>
    </div>
  )
}
