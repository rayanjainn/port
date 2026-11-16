"use client"
// Screen-space UI for the 3D view: signs, markers, bubbles and the interact prompt, styled like the 2D canvas versions.
import { useEffect, useMemo, useRef } from "react"
import { engine, type SceneRT } from "@/lib/engine"
import { runtime } from "@/lib/runtime"
import { BUILDINGS } from "@/lib/world/village"
import { overlay } from "./bus"

const PX = "var(--font-pixel)"
const base: React.CSSProperties = { position: "absolute", left: 0, top: 0, willChange: "transform", display: "none", pointerEvents: "none" }

function Sign({ b, el }: { b: (typeof BUILDINGS)[number]; el: (e: HTMLDivElement | null) => void }) {
  return (
    <div ref={el} style={base}>
      <div data-box style={{ position: "relative", height: 34, padding: "0 13px", display: "inline-grid", background: "#8a5a2c", boxShadow: "0 0 0 2px #2a1606, 3px 5px 0 rgba(10,6,2,.35)", whiteSpace: "nowrap", textAlign: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, background: "#a8743c" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 3, height: 10, background: b.accent ?? "#c8463b", boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }} />
        <div style={{ gridArea: "1/1", fontFamily: PX, fontSize: 10, lineHeight: "12px", paddingTop: 5, color: "#fff4dc", textShadow: "1px 1px 0 #2a1606", position: "relative" }}>{b.label}</div>
        <div style={{ gridArea: "1/1", fontFamily: PX, fontSize: 7, lineHeight: "8px", paddingTop: 23, color: "#fff", position: "relative" }}>{b.section}</div>
      </div>
    </div>
  )
}

function Tri({ el }: { el: (e: HTMLDivElement | null) => void }) {
  return (
    <div ref={el} style={base}>
      <svg width="24" height="18" viewBox="-12 -14 24 18" style={{ position: "absolute", left: -12, top: -14, overflow: "visible" }}>
        <polygon points="-9,-12 9,-12 0,2" fill="#1d1006" />
        <polygon data-fill points="-7,-10 7,-10 0,-1" fill="#fff4dc" />
      </svg>
    </div>
  )
}

function Bang({ el }: { el: (e: HTMLDivElement | null) => void }) {
  return (
    <div ref={el} style={base}>
      <div style={{ position: "absolute", left: -8, top: -15, width: 16, height: 17, background: "#1d1006", padding: 2, boxSizing: "border-box" }}>
        <div data-fill style={{ width: 12, height: 13, background: "#fff4dc", color: "#c8463b", fontFamily: PX, fontSize: 10, lineHeight: "12px", textAlign: "center", textIndent: 1 }}>!</div>
      </div>
    </div>
  )
}

function Bubble({ el }: { el: (e: HTMLDivElement | null) => void }) {
  return (
    <div ref={el} style={{ ...base, transform: "translate(-999px,-999px)" }}>
      <div data-box style={{ position: "absolute", left: 0, bottom: 0, transform: "translateX(-50%)", width: "max-content", maxWidth: 210, boxSizing: "border-box", padding: "6px 10px", background: "#fff", boxShadow: "0 0 0 2px #1d1006", fontFamily: "var(--ff-pixelify), sans-serif", fontSize: 15, lineHeight: "18px", color: "#2a1a10" }}>
        <span data-text />
        <i style={{ position: "absolute", left: "50%", bottom: -6, marginLeft: -1, width: 4, height: 4, background: "#fff" }} />
        <i style={{ position: "absolute", left: "50%", bottom: -8, marginLeft: -2, width: 6, height: 2, background: "#1d1006", zIndex: -1 }} />
        <i style={{ position: "absolute", left: "50%", bottom: -9, marginLeft: 0, width: 3, height: 3, background: "#1d1006" }} />
      </div>
    </div>
  )
}

export default function Overlay3D({ rt }: { rt: SceneRT }) {
  const sc = rt.scene
  const signs = useMemo(() => (sc.id === "village" ? BUILDINGS.filter((b) => b.label) : []), [sc.id])
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

  useEffect(() => {
    touch.current = matchMedia("(pointer: coarse)").matches
    const sprites = signs.map((b) => sc.sprites.find((s) => s.tag === `b:${b.id}`))
    const shown = new WeakMap<HTMLElement, boolean>()
    const vis = (el: HTMLElement, on: boolean) => { if (shown.get(el) !== on) { shown.set(el, on); el.style.display = on ? "" : "none" } }
    const ok = (sx: number, sy: number, w: number, h: number) => sx > -260 && sx < w + 260 && sy > -120 && sy < h + 260
    overlay.update = (proj, now, w, h) => {
      const S = engine.state
      if (!S) return
      signs.forEach((b, i) => {
        const el = signEls.current[i], s = sprites[i]
        if (!el || !s) return
        const [sx, sy] = proj(s.x + s.rect[2] / 2, s.baseY, s.rect[3])
        const on = ok(sx, sy, w, h)
        vis(el, on)
        if (!on) return
        const active = S.near?.id === `door-${b.id}`
        el.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy) - (active ? 6 : 0)}px) translate(-50%,-100%)`
        const box = el.firstElementChild as HTMLElement
        box.style.outline = active ? "2px solid #ffe39a" : "none"
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
        el.querySelector("[data-fill]")?.setAttribute("fill", S.near === m ? "#ffd76a" : "#fff4dc")
      })
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
            ;(bang.querySelector("[data-fill]") as HTMLElement).style.background = S.nearNpc === a ? "#ffd76a" : "#fff4dc"
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
  }, [rt, sc, signs, marks, npcs])

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }}>
      {signs.map((b, i) => <Sign key={b.id} b={b} el={(e) => { signEls.current[i] = e }} />)}
      {marks.map((m, i) => <Tri key={m.id} el={(e) => { markEls.current[i] = e }} />)}
      {npcs.map((a, i) => (
        <span key={a.def.id}>
          <Bang el={(e) => { bangEls.current[i] = e }} />
          <Bubble el={(e) => { bubEls.current[i] = e }} />
        </span>
      ))}
      <div ref={promptEl} style={base}>
        <div style={{ position: "relative", height: 30, padding: "0 12px 0 6px", display: "flex", alignItems: "center", gap: 8, boxSizing: "content-box", background: "#fbf1d6", boxShadow: "0 0 0 2px #1d1006, 3px 5px 0 rgba(10,6,2,.35), inset 0 -3px 0 #e3cf9c", whiteSpace: "nowrap" }}>
          <div ref={keyEl} style={{ width: 22, height: 20, background: "#c8463b", boxShadow: "0 0 0 1px #1d1006, inset 0 2px 0 #e86a5c", color: "#fff4dc", fontFamily: PX, fontSize: 9, lineHeight: "20px", textAlign: "center" }}>E</div>
          <span ref={labelEl} style={{ fontFamily: PX, fontSize: 9, color: "#3a2412" }} />
          <i style={{ position: "absolute", left: "50%", bottom: -5, marginLeft: -5, width: 10, height: 3, background: "#1d1006" }} />
          <i style={{ position: "absolute", left: "50%", bottom: -3, marginLeft: -3, width: 6, height: 3, background: "#fbf1d6" }} />
        </div>
      </div>
    </div>
  )
}
