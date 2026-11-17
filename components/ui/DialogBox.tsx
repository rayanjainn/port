"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useGameStore } from "@/lib/store"
import { playSound } from "@/lib/audio"
import { Panel, Ribbon } from "@/components/ui/kit"

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
    <div onClick={advance} className="dialog-wrap">
      <Panel v="dialog" fx className="dialog-pop">
        {dialog.face && (
          <div className="dlg-face">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dialog.face} alt="" className="pixelated" />
          </div>
        )}
        <div className="dlg-body">
          <div className="dlg-name"><Ribbon small>{dialog.name.toUpperCase()}</Ribbon></div>
          <div className="dlg-text">
            {text.slice(0, shown)}
            <span style={{ opacity: 0 }}>{text.slice(shown)}</span>
          </div>
          <div className="dlg-foot">
            <span>{line + 1} / {dialog.lines.length}</span>
            <span className="blink dlg-next">{shown >= text.length ? "▼" : ""}</span>
          </div>
        </div>
      </Panel>
    </div>
  )
}
