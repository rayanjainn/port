"use client"
import { useState, useEffect, useRef } from "react"
import { PARCH } from "@/lib/modalTheme"
import { KeyRound, Sparkles, Worm, Brain, Zap, ArrowLeft } from "lucide-react"

const GREY = "#6b5a44"

type GameId = "menu" | "snake" | "memory" | "reaction"

const btn = (red = false): React.CSSProperties => ({
  fontFamily: "var(--font-pixel)", fontSize: 11, letterSpacing: 2,
  color: "#f6e8c8", padding: "12px 28px",
  background: red
    ? "linear-gradient(180deg, #c8463b 0%, #a8382f 100%)"
    : "linear-gradient(180deg, #b06d2a 0%, #8a5320 100%)",
  border: "3px solid #5e3a18",
  boxShadow: `inset 0 0 0 2px ${red ? "#e8a59a" : "#d8a55e"}, 0 5px 0 #4a2e12`,
  cursor: "pointer",
  textShadow: red ? "0 1px 0 #6e201b" : "0 1px 0 #4a2e12",
})

export default function CaveModal() {
  const [game, setGame] = useState<GameId>("menu")

  return (
    <div style={{ padding: "32px 24px 28px", fontFamily: "var(--font-pixel)", textAlign: "center" }}>
      {/* Header */}
      <div style={{ position: "relative", marginBottom: 24, paddingBottom: 18, borderBottom: `3px solid ${PARCH.lineDk}` }}>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(180deg, #c8463b 0%, #a8382f 100%)",
          border: "3px solid #ede0bd",
          padding: "5px 16px", marginBottom: 12,
          color: "#f6e8c8", fontSize: 8, letterSpacing: 3,
          textShadow: "0 1px 0 #6e201b",
        }}>
          ◆ HIDDEN CAVE ARCADE ◆
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: PARCH.inset, border: `3px solid ${PARCH.lineDk}`,
            boxShadow: "inset 0 0 0 2px #c79a5e",
          }}>
            <KeyRound size={22} color={GREY} strokeWidth={2} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "clamp(10px, 2vw, 16px)", color: PARCH.ink, letterSpacing: 2 }}>SECRET CAVE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
              <Sparkles size={9} color={PARCH.muted} strokeWidth={1.5} />
              <span style={{ fontSize: "clamp(6px, 1vw, 8px)", color: PARCH.muted }}>Ancient arcade of mini-games</span>
            </div>
          </div>
        </div>
      </div>

      {game === "menu" && <GameMenu onPick={setGame} />}
      {game !== "menu" && (
        <button
          onClick={() => setGame("menu")}
          style={{
            ...btn(false),
            padding: "6px 14px", fontSize: 8,
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 18,
          }}
        >
          <ArrowLeft size={12} /> BACK
        </button>
      )}
      {game === "snake"    && <SnakeGame />}
      {game === "memory"   && <MemoryGame />}
      {game === "reaction" && <ReactionGame />}
    </div>
  )
}

// ── GAME MENU ─────────────────────────────────────────────────
function GameMenu({ onPick }: { onPick: (g: GameId) => void }) {
  const games: { id: GameId; title: string; desc: string; icon: React.ReactNode; col: string }[] = [
    { id: "snake",    title: "SNAKE",       desc: "Eat, grow, don't bite yourself.", icon: <Worm size={28} />,  col: "#2f7a28" },
    { id: "memory",   title: "RECALL",      desc: "Repeat the rune sequence.",        icon: <Brain size={28} />, col: "#7c5cba" },
    { id: "reaction", title: "QUICKDRAW",   desc: "Click the moment the rune lights.", icon: <Zap size={28} />,   col: "#c2531d" },
  ]
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 16, marginTop: 8,
    }}>
      {games.map((g) => (
        <button
          key={g.id}
          onClick={() => onPick(g.id)}
          style={{
            background: PARCH.cardAlt,
            border: `3px solid ${PARCH.lineDk}`,
            boxShadow: "inset 0 0 0 2px #c79a5e, 0 5px 0 #4a2e12",
            padding: "18px 12px 16px",
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            fontFamily: "var(--font-pixel)",
          }}
        >
          <div style={{
            width: 56, height: 56,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: g.col,
            border: "3px solid #1a0e04",
            boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.18)`,
            color: "#f6e8c8",
          }}>
            {g.icon}
          </div>
          <div style={{ fontSize: 11, color: PARCH.ink, letterSpacing: 2 }}>{g.title}</div>
          <div style={{ fontSize: 6.5, color: PARCH.muted, lineHeight: 1.6 }}>{g.desc}</div>
        </button>
      ))}
    </div>
  )
}

// ── SNAKE ─────────────────────────────────────────────────────
const ROWS = 12, COLS = 18
const INIT_SNAKE = [{ x: 9, y: 6 }]
type Cell = { x: number; y: number }

function SnakeGame() {
  const [snake, setSnake] = useState<Cell[]>(INIT_SNAKE)
  const [food, setFood] = useState<Cell>({ x: 4, y: 4 })
  const [dir, setDir] = useState<Cell>({ x: 1, y: 0 })
  const [alive, setAlive] = useState(true)
  const [score, setScore] = useState(0)
  const [started, setStarted] = useState(false)
  const dirRef = useRef(dir); dirRef.current = dir

  const spawnFood = (s: Cell[]): Cell => {
    let f: Cell
    do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
    while (s.some((c) => c.x === f.x && c.y === f.y))
    return f
  }

  useEffect(() => {
    if (!started || !alive) return
    const onKey = (e: KeyboardEvent) => {
      const d = dirRef.current
      if ((e.key === "ArrowUp"    || e.key === "w") && d.y !== 1)  setDir({ x: 0, y: -1 })
      if ((e.key === "ArrowDown"  || e.key === "s") && d.y !== -1) setDir({ x: 0, y:  1 })
      if ((e.key === "ArrowLeft"  || e.key === "a") && d.x !== 1)  setDir({ x: -1, y: 0 })
      if ((e.key === "ArrowRight" || e.key === "d") && d.x !== -1) setDir({ x:  1, y: 0 })
      e.stopPropagation()
    }
    window.addEventListener("keydown", onKey, true)
    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { x: (prev[0].x + dirRef.current.x + COLS) % COLS, y: (prev[0].y + dirRef.current.y + ROWS) % ROWS }
        if (prev.some((c) => c.x === head.x && c.y === head.y)) { setAlive(false); return prev }
        const ate = head.x === food.x && head.y === food.y
        const next = [head, ...prev.slice(0, ate ? prev.length : prev.length - 1)]
        if (ate) { setScore((s) => s + 10); setFood(spawnFood(next)) }
        return next
      })
    }, 150)
    return () => { clearInterval(interval); window.removeEventListener("keydown", onKey, true) }
  }, [started, alive, food])

  const reset = () => {
    setSnake(INIT_SNAKE); setDir({ x: 1, y: 0 })
    setScore(0); setAlive(true); setFood({ x: 4, y: 4 }); setStarted(true)
  }

  return (
    <div>
      <Plaque label={`SCORE  ${score}`} />
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <div style={{
          width: "min(540px, 100%)",
          aspectRatio: `${COLS / ROWS}`,
          background: PARCH.cardAlt,
          border: `4px solid ${PARCH.lineDk}`,
          boxShadow: "inset 0 0 0 2px #c79a5e, 0 4px 0 #4a2e12",
          padding: 10, boxSizing: "border-box",
        }}>
          <div style={{
            width: "100%", height: "100%",
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            background: "#241a10",
            boxShadow: "inset 0 0 14px rgba(0,0,0,0.7), inset 0 0 0 2px #1a120a",
          }}>
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const isHead = snake[0]?.x === col && snake[0]?.y === row
                const isBody = snake.slice(1).some((c) => c.x === col && c.y === row)
                const isFood = food.x === col && food.y === row
                return (
                  <div key={`${row}-${col}`} style={{
                    background: isHead ? "#7ee04a" : isBody ? "#2f7a28" : isFood ? "#c8463b" : "transparent",
                    border: "1px solid rgba(0,0,0,0.25)",
                    boxShadow: isHead ? "inset 0 0 0 2px #4a8a2a" : isFood ? "inset 0 0 0 2px #6e201b" : "none",
                  }} />
                )
              })
            )}
          </div>
        </div>
      </div>
      {!started && <>
        <div style={{ fontSize: 8, color: PARCH.muted, marginBottom: 16, letterSpacing: 1 }}>WASD / ARROWS — MOVE</div>
        <button style={btn(false)} onClick={reset}>▶ START</button>
      </>}
      {started && !alive && <>
        <div style={{ fontSize: 12, color: "#8a3026", marginBottom: 10, letterSpacing: 2 }}>✕ GAME OVER ✕</div>
        <div style={{ fontSize: 8, color: PARCH.body, marginBottom: 16 }}>Final Score: {score}</div>
        <button style={btn(true)} onClick={reset}>↺ TRY AGAIN</button>
      </>}
    </div>
  )
}

// ── MEMORY (Simon-says) ───────────────────────────────────────
const RUNES = [
  { id: 0, col: "#c8463b", lit: "#ff7a6a" },
  { id: 1, col: "#3a6ea5", lit: "#7ab4e8" },
  { id: 2, col: "#2f7a28", lit: "#7ee04a" },
  { id: 3, col: "#c79a3a", lit: "#ffd76a" },
]
function MemoryGame() {
  const [seq, setSeq] = useState<number[]>([])
  const [userIdx, setUserIdx] = useState(0)
  const [playing, setPlaying] = useState<"idle" | "show" | "input" | "fail">("idle")
  const [activeRune, setActiveRune] = useState<number | null>(null)
  const seqRef = useRef(seq); seqRef.current = seq

  const nextRound = (prev: number[]) => {
    const next = [...prev, Math.floor(Math.random() * 4)]
    setSeq(next); setUserIdx(0); setPlaying("show")
    let i = 0
    const interval = setInterval(() => {
      if (i >= next.length) {
        clearInterval(interval); setActiveRune(null); setPlaying("input"); return
      }
      setActiveRune(next[i])
      setTimeout(() => setActiveRune(null), 320)
      i++
    }, 540)
  }

  const click = (r: number) => {
    if (playing !== "input") return
    if (seq[userIdx] !== r) { setPlaying("fail"); return }
    setActiveRune(r)
    setTimeout(() => setActiveRune(null), 200)
    if (userIdx + 1 === seq.length) {
      setTimeout(() => nextRound(seq), 600)
    } else {
      setUserIdx(userIdx + 1)
    }
  }

  const start = () => { setSeq([]); setUserIdx(0); setPlaying("idle"); setTimeout(() => nextRound([]), 300) }

  return (
    <div>
      <Plaque label={`ROUND  ${seq.length}`} />
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        width: "min(360px, 90%)", margin: "0 auto 18px",
        padding: 14,
        background: PARCH.cardAlt,
        border: `4px solid ${PARCH.lineDk}`,
        boxShadow: "inset 0 0 0 2px #c79a5e, 0 4px 0 #4a2e12",
      }}>
        {RUNES.map((r) => {
          const lit = activeRune === r.id
          return (
            <button
              key={r.id}
              onClick={() => click(r.id)}
              disabled={playing !== "input"}
              style={{
                aspectRatio: "1",
                background: lit ? r.lit : r.col,
                border: "3px solid #1a0e04",
                boxShadow: lit
                  ? `0 0 24px ${r.lit}, inset 0 0 0 3px #fff8`
                  : "inset 0 0 0 2px rgba(255,255,255,0.18), inset 0 -6px 0 rgba(0,0,0,0.25)",
                cursor: playing === "input" ? "pointer" : "default",
                transition: "background 80ms",
              }}
            />
          )
        })}
      </div>
      {playing === "idle" && (
        <>
          <div style={{ fontSize: 8, color: PARCH.muted, marginBottom: 16 }}>WATCH THE SEQUENCE THEN REPEAT</div>
          <button style={btn(false)} onClick={start}>▶ START</button>
        </>
      )}
      {playing === "show" && (
        <div style={{ fontSize: 8, color: PARCH.muted }}>WATCHING...</div>
      )}
      {playing === "input" && (
        <div style={{ fontSize: 8, color: "#2f7a28" }}>YOUR TURN ({userIdx + 1}/{seq.length})</div>
      )}
      {playing === "fail" && (
        <>
          <div style={{ fontSize: 12, color: "#8a3026", marginBottom: 10, letterSpacing: 2 }}>✕ WRONG RUNE ✕</div>
          <div style={{ fontSize: 8, color: PARCH.body, marginBottom: 16 }}>Best Round: {seq.length}</div>
          <button style={btn(true)} onClick={start}>↺ TRY AGAIN</button>
        </>
      )}
    </div>
  )
}

// ── REACTION ──────────────────────────────────────────────────
function ReactionGame() {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "result" | "early">("idle")
  const [waitMs, setWaitMs] = useState(0)
  const [reactMs, setReactMs] = useState<number | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const startTime = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const arm = () => {
    setPhase("wait"); setReactMs(null)
    const w = 900 + Math.random() * 2400
    setWaitMs(w)
    timer.current = setTimeout(() => {
      setPhase("go")
      startTime.current = performance.now()
    }, w)
  }
  const hit = () => {
    if (phase === "wait") {
      if (timer.current) clearTimeout(timer.current)
      setPhase("early")
      return
    }
    if (phase === "go") {
      const ms = Math.round(performance.now() - startTime.current)
      setReactMs(ms)
      if (best === null || ms < best) setBest(ms)
      setPhase("result")
    }
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const bg =
    phase === "wait"  ? "#5a1010" :
    phase === "go"    ? "#2f7a28" :
    phase === "early" ? "#8a3026" :
    phase === "result"? "#7c5cba" :
                        "#3a2410"
  const txt =
    phase === "idle"   ? "TAP TO ARM" :
    phase === "wait"   ? "WAIT FOR GREEN..." :
    phase === "go"     ? "TAP NOW!" :
    phase === "early"  ? "TOO EARLY" :
                         `${reactMs} ms`

  return (
    <div>
      <Plaque label={best !== null ? `BEST  ${best}ms` : "NO RECORD YET"} />
      <button
        onClick={phase === "idle" || phase === "result" || phase === "early" ? arm : hit}
        style={{
          width: "min(360px, 90%)", aspectRatio: "1.6",
          margin: "0 auto 18px", display: "block",
          background: bg,
          border: "4px solid #1a0e04",
          boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.12), 0 6px 0 #1a0e04",
          color: "#f6e8c8",
          fontFamily: "var(--font-pixel)", fontSize: "clamp(11px, 2vw, 18px)", letterSpacing: 3,
          cursor: "pointer", textShadow: "0 2px 0 #000",
        }}
      >
        {txt}
      </button>
      <div style={{ fontSize: 8, color: PARCH.muted, marginBottom: 12 }}>
        WAIT FOR GREEN. CLICKING EARLY = FAIL.
      </div>
    </div>
  )
}

// ── Shared plaque ─────────────────────────────────────────────
function Plaque({ label }: { label: string }) {
  return (
    <div style={{
      display: "inline-block",
      background: PARCH.inset,
      border: `3px solid ${PARCH.lineDk}`,
      boxShadow: "inset 0 0 0 2px #c79a5e",
      padding: "6px 18px", marginBottom: 14,
      fontSize: "clamp(8px, 1.4vw, 11px)", color: "#8a3026", letterSpacing: 2,
    }}>
      {label}
    </div>
  )
}
