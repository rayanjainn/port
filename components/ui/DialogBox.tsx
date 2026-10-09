"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"

/** Classic RPG dialogue: portrait, name plate, typewriter text. */
export default function DialogBox() {
  const dialog = useGameStore((s) => s.dialog)
  const say = useGameStore((s) => s.say)
  const [line, setLine] = useState(0)
  const [shown, setShown] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const text = dialog?.lines[line] ?? ""

  // reset when a new conversation starts
  const key = dialog ? `${dialog.name}|${dialog.lines.join("|")}` : ""
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) { setLastKey(key); setLine(0); setShown(0) }

  useEffect(() => {
    if (!dialog) return
    timer.current = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) { if (timer.current) clearInterval(timer.current); return n }
        if (n % 3 === 0) playSound("menu")
        return n + 1
      })
    }, 22)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [dialog, text])

  const advance = useCallback(() => {
    if (!dialog) return
    if (shown < text.length) { setShown(text.length); return }
    if (line < dialog.lines.length - 1) { setLine(line + 1); setShown(0); playSound("click"); return }
    const done = dialog.onDone
    say(null)
    playSound("close")
    if (done) setTimeout(done, 120)
  }, [dialog, shown, text, line, say])

  useEffect(() => {
    if (!dialog) return
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "e" || k === "enter" || k === " ") { e.preventDefault(); e.stopImmediatePropagation(); advance() }
      if (k === "escape") { e.stopImmediatePropagation(); say(null) }
    }
    // capture so the game loop doesn't also receive the key
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [dialog, advance, say])

  if (!dialog) return null

  return (
    <div onClick={advance} className="dialog-wrap" style={{
      position: "fixed", left: 0, right: 0, bottom: 22, zIndex: 120, display: "flex", justifyContent: "center", padding: "0 14px",
      cursor: "pointer",
    }}>
      <div className="dialog-pop" style={{
        width: "min(760px, 100%)", display: "flex", gap: 16, alignItems: "stretch", position: "relative",
        background: "linear-gradient(180deg, #fff8e4 0%, #f3e2b8 100%)",
        border: "4px solid #1d1006",
        boxShadow: "inset 0 0 0 3px #e9c98a, inset 0 0 0 5px #8a5a2c, 0 8px 0 #1d1006, 0 20px 50px rgba(0,0,0,.45)",
        padding: 14,
      }}>
        {dialog.face && (
          <div style={{
            width: 96, height: 96, flexShrink: 0, background: "radial-gradient(circle at 50% 35%, #4b3a6e, #1e1630)",
            border: "4px solid #1d1006", boxShadow: "inset 0 0 0 3px #e9c98a, 0 3px 0 #1d1006", overflow: "hidden",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dialog.face} alt="" className="pixelated" style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ alignSelf: "flex-start", marginTop: -30, marginBottom: 10, padding: "7px 12px", background: "linear-gradient(180deg, #d9574b, #a8382f)", border: "3px solid #1d1006", boxShadow: "inset 0 0 0 2px #f08a7c", fontFamily: "var(--font-pixel)", fontSize: 9, letterSpacing: 2, color: "#fff4dc" }}>
            {dialog.name.toUpperCase()}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(17px, 2vw, 21px)", lineHeight: 1.45, color: "#2a1a10", minHeight: 62 }}>
            {text.slice(0, shown)}
            <span style={{ opacity: 0 }}>{text.slice(shown)}</span>
          </div>
          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-pixel)", fontSize: 7, color: "#8f6a3a", letterSpacing: 1 }}>
            <span>{line + 1} / {dialog.lines.length}</span>
            <span className="blink" style={{ color: "#c8463b", fontSize: 10 }}>{shown >= text.length ? "▼" : ""}</span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes dialog-pop { from { transform: translateY(30px) scale(.96); opacity: 0 } to { transform: none; opacity: 1 } }
        .dialog-pop { animation: dialog-pop .28s cubic-bezier(.2,1.3,.4,1) both }
        @media (max-width: 600px) { .dialog-pop img { } .dialog-wrap { bottom: 12px !important } }
      `}</style>
    </div>
  )
}
