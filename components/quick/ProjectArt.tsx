"use client"
// Generative project art: every project gets a unique, deterministic, animated
// SVG derived from its id, tags and category. No images, no network.
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react"
import type { Project } from "@/lib/content"
import { hashStr, motifFor, rng, MOTIF_LABEL, type Motif } from "@/lib/quick/motif"

const A = "#ffb547"
const W = 640, H = 400
const dl = (s: number, dur?: number): CSSProperties => ({ animationDelay: `${s.toFixed(2)}s`, ...(dur ? { animationDuration: `${dur.toFixed(2)}s` } : {}) })
const f = (n: number) => Math.round(n * 10) / 10

type R = () => number
interface Ctx { r: R; uid: string; p: Project }

export default function ProjectArt({ project, className = "", label = true }: { project: Project; className?: string; label?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "")
  const host = useRef<HTMLDivElement>(null)
  const motif = motifFor(project)

  // Animate only while on screen, and not at all under prefers-reduced-motion.
  useEffect(() => {
    const el = host.current
    const svg = el?.querySelector("svg") as (SVGSVGElement & { pauseAnimations?: () => void; unpauseAnimations?: () => void }) | null
    if (!el || !svg) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) { svg.pauseAnimations?.(); return }
    const io = new IntersectionObserver(([e]) => {
      el.dataset.live = e.isIntersecting ? "1" : "0"
      if (e.isIntersecting) svg.unpauseAnimations?.(); else svg.pauseAnimations?.()
    }, { rootMargin: "80px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const ctx: Ctx = { r: rng(hashStr(project.id)), uid, p: project }
  const body = BODY[motif](ctx)
  const gx = 18 + ((hashStr(project.id) >> 3) % 64)
  return (
    <div ref={host} data-live="0" className={`qa ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${project.title}: ${MOTIF_LABEL[motif]} illustration`} className="h-full w-full">
        <defs>
          <radialGradient id={`${uid}g`} cx={`${gx}%`} cy="18%" r="90%">
            <stop offset="0" stopColor={A} stopOpacity="0.2" />
            <stop offset="0.55" stopColor={A} stopOpacity="0.04" />
            <stop offset="1" stopColor={A} stopOpacity="0" />
          </radialGradient>
          <pattern id={`${uid}p`} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" opacity="0.1" /></pattern>
          <linearGradient id={`${uid}l`} x1="0" x2="1"><stop offset="0" stopColor={A} stopOpacity="0" /><stop offset="0.5" stopColor={A} stopOpacity="0.9" /><stop offset="1" stopColor={A} stopOpacity="0" /></linearGradient>
        </defs>
        <rect width={W} height={H} fill="#0d0b13" />
        <rect width={W} height={H} fill={`url(#${uid}p)`} />
        <rect width={W} height={H} fill={`url(#${uid}g)`} />
        <g transform="translate(320 200) scale(0.9) translate(-320 -200)">
        {body}
        {label && <text x="44" y="372" className="qa-t" fontSize="11" fill="#fff" opacity="0.38" letterSpacing="2">{MOTIF_LABEL[motif].toUpperCase()}</text>}
        </g>
      </svg>
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────────── */
const T = ({ x, y, s = 11, o = 0.5, fill = "#fff", anchor, children, w }: { x: number | string; y: number | string; s?: number | string; o?: number; fill?: string; anchor?: "middle" | "end"; children: ReactNode; w?: number }) =>
  <text x={x} y={y} className="qa-t" fontSize={s} fill={fill} opacity={o} textAnchor={anchor} fontWeight={w}>{children}</text>

function Pill({ x, y, w, text, solid = false }: { x: number; y: number; w: number; text: string; solid?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="22" rx="11" fill={solid ? A : A} fillOpacity={solid ? 1 : 0.14} stroke={A} strokeOpacity={solid ? 0 : 0.5} />
      <T x={x + w / 2} y={y + 15} s={11} o={1} fill={solid ? "#1a0d06" : A} anchor="middle" w={600}>{text}</T>
    </g>
  )
}

/* ── motifs ──────────────────────────────────────────────── */
const BODY: Record<Motif, (c: Ctx) => ReactNode> = {
  // browser / agent safety: plan → shield → sandbox
  shield: ({ r }) => {
    const packets = Array.from({ length: 6 }, (_, i) => ({ y: 150 + i * 20, d: i * 0.55 + r() * 0.3, bad: i === 1 || i === 4 }))
    return (
      <g>
        <circle cx="320" cy="200" r="150" fill="none" stroke={A} strokeOpacity="0.16" strokeDasharray="3 9" className="qa-spin" />
        <circle cx="320" cy="200" r="118" fill="none" stroke={A} strokeOpacity="0.26" strokeDasharray="1 7" className="qa-spin qa-rev" />
        <circle cx="320" cy="200" r="94" fill={A} fillOpacity="0.05" className="qa-pulse" />
        {packets.map((k, i) => (
          <rect key={i} x="40" y={k.y} width="22" height="9" rx="3" fill={k.bad ? "#fff" : A} className={k.bad ? "qa-flow qa-bounce" : "qa-flow"} style={{ ...dl(k.d, 3.3), ["--dx" as string]: k.bad ? "176px" : "300px" }} />
        ))}
        <path d="M320 112 L386 137 V200 C386 246 356 276 320 294 C284 276 254 246 254 200 V137 Z" fill="#0d0b13" stroke={A} strokeWidth="2.5" />
        <path d="M320 128 L372 148 V200 C372 238 348 262 320 277 C292 262 268 238 268 200 V148 Z" fill={A} fillOpacity="0.08" />
        <path d="M292 204 L314 227 L352 180" fill="none" stroke={A} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pathLength="100" className="qa-draw" />
        <g opacity="0.9">
          <rect x="446" y="140" width="150" height="120" rx="12" fill="none" stroke={A} strokeOpacity="0.5" strokeDasharray="5 5" className="qa-dash" />
          <T x="458" y="162" s="10" o={0.55}>SANDBOX · FAKE DATA</T>
          {[0, 1, 2].map((i) => <rect key={i} x="460" y={178 + i * 22} width={96 - i * 18} height="8" rx="4" fill={A} fillOpacity={0.35 - i * 0.08} className="qa-pulse" style={dl(i * 0.4)} />)}
        </g>
        <T x="40" y="132" s="10" o={0.5}>PLAN</T>
        <T x="256" y="320" s="10" o={0.5}>CONSENT</T>
        <path d="M388 200 H440" stroke={A} strokeOpacity="0.5" strokeDasharray="4 4" className="qa-dash" />
      </g>
    )
  },

  // network graph
  network: ({ r }) => {
    const pts: [number, number][] = [[320, 196]]
    let guard = 0
    while (pts.length < 15 && guard++ < 400) {
      const q: [number, number] = [60 + r() * 520, 54 + r() * 270]
      if (pts.every(([x, y]) => Math.hypot(x - q[0], y - q[1]) > 72)) pts.push(q)
    }
    const edges = new Set<string>()
    pts.forEach(([x, y], i) => {
      pts.map(([a, b], j) => ({ j, d: Math.hypot(a - x, b - y) })).filter((o) => o.j !== i).sort((p, q) => p.d - q.d).slice(0, i === 0 ? 5 : 2)
        .forEach((o) => edges.add(i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`))
    })
    const E = [...edges].map((k) => k.split("-").map(Number) as [number, number])
    return (
      <g>
        {E.map(([a, b], i) => <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="#fff" strokeOpacity="0.14" />)}
        {E.filter((_, i) => i % 3 === 0).map(([a, b], i) => (
          <circle key={i} r="3.2" fill={A}>
            <animateMotion dur={`${2.4 + (i % 4) * 0.5}s`} begin={`${(i * 0.37).toFixed(2)}s`} repeatCount="indefinite" path={`M${f(pts[a][0])} ${f(pts[a][1])} L${f(pts[b][0])} ${f(pts[b][1])}`} />
          </circle>
        ))}
        {pts.slice(1).map(([x, y], i) => {
          const blocked = i % 6 === 2
          return blocked
            ? <g key={i} stroke={A} strokeWidth="2" strokeLinecap="round" opacity="0.8"><circle cx={x} cy={y} r="9" fill="#0d0b13" strokeOpacity="0.5" /><path d={`M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}`} /></g>
            : <circle key={i} cx={x} cy={y} r={5 + (i % 3)} fill="#0d0b13" stroke={A} strokeOpacity="0.7" strokeWidth="1.6" className="qa-pulse" style={dl(i * 0.23)} />
        })}
        <circle cx="320" cy="196" r="34" fill="none" stroke={A} strokeOpacity="0.35" className="qa-ring" />
        <circle cx="320" cy="196" r="17" fill={A} />
        <circle cx="320" cy="196" r="6" fill="#1a0d06" />
      </g>
    )
  },

  // delivery pipeline
  pipeline: ({ r }) => {
    const names = ["plan", "build", "test", "push", "apply", "ship"]
    const xs = names.map((_, i) => 50 + i * 94)
    const spark = Array.from({ length: 24 }, (_, i) => f(330 + Math.sin(i * 0.6) * 10 - i * 0.6 - r() * 10))
    return (
      <g>
        {[0, 1, 2].map((i) => <circle key={i} cx={70 + i * 34} cy="96" r="6" fill={A} fillOpacity={0.9 - i * 0.25} />)}
        <path d="M174 96 H214 C232 96 232 160 232 160" fill="none" stroke={A} strokeOpacity="0.4" strokeDasharray="4 5" className="qa-dash" />
        {xs.slice(0, -1).map((x, i) => <line key={i} x1={x + 70} y1="200" x2={xs[i + 1]} y2="200" stroke={A} strokeOpacity="0.5" strokeDasharray="4 5" className="qa-dash" />)}
        {xs.map((x, i) => (
          <g key={i}>
            <rect x={x} y="166" width="70" height="68" rx="14" fill="#13101b" stroke="#fff" strokeOpacity="0.18" />
            <rect x={x} y="166" width="70" height="68" rx="14" fill={A} stroke={A} className="qa-stage" style={dl(i * 0.7)} />
            <path d={`M${x + 24} 202 l8 8 l16 -18`} fill="none" stroke={A} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            <T x={x + 35} y="258" s="11" o={0.6} anchor="middle">{names[i]}</T>
          </g>
        ))}
        <polyline points={spark.map((y, i) => `${60 + i * 22},${y}`).join(" ")} fill="none" stroke={A} strokeOpacity="0.7" strokeWidth="2" strokeLinejoin="round" pathLength="100" className="qa-draw" />
        <T x="60" y="312" s="10" o={0.45}>MONITORING</T>
      </g>
    )
  },

  // request / response panes
  api: ({ r }) => {
    const lines = (x: number, seedBase: number) => Array.from({ length: 7 }, (_, i) => {
      const indent = i === 0 || i === 6 ? 0 : (i % 3 === 0 ? 24 : 12)
      return { x: x + 18 + indent, w: 28 + Math.floor(((seedBase * (i + 3) * 13) % 70)) + r() * 20, k: 26 + ((i * 7) % 20) }
    })
    const L = lines(40, 3), Rr = lines(340, 5)
    return (
      <g>
        <rect x="40" y="62" width="260" height="262" rx="16" fill="#13101b" stroke="#fff" strokeOpacity="0.14" />
        <rect x="340" y="62" width="260" height="262" rx="16" fill="#13101b" stroke={A} strokeOpacity="0.4" />
        <T x="58" y="90" s="10" o={0.5}>REQUEST</T><T x="358" y="90" s="10" o={0.5}>RESPONSE</T>
        <Pill x={58} y={104} w={54} text="POST" solid />
        <rect x="122" y="111" width="150" height="8" rx="4" fill="#fff" fillOpacity="0.28" />
        <Pill x={358} y={104} w={64} text="200 OK" />
        <T x="590" y="119" s="11" o={0.55} anchor="end">42ms</T>
        {[0, 1, 2].map((i) => <g key={i}><rect x="58" y={148 + i * 20} width="46" height="7" rx="3.5" fill={A} fillOpacity="0.55" /><rect x="114" y={148 + i * 20} width={90 + i * 22} height="7" rx="3.5" fill="#fff" fillOpacity="0.2" /></g>)}
        {L.map((l, i) => <rect key={i} x={l.x} y={226 + i * 13} width={l.w} height="6" rx="3" fill="#fff" fillOpacity="0.14" />)}
        {Rr.map((l, i) => (
          <g key={i}>
            <rect x={l.x} y={146 + i * 24} width={l.k} height="7" rx="3.5" fill={A} fillOpacity="0.7" className="qa-pulse" style={dl(i * 0.2)} />
            <rect x={l.x + l.k + 8} y={146 + i * 24} width={l.w} height="7" rx="3.5" fill="#fff" fillOpacity="0.28" />
          </g>
        ))}
        <path d="M304 193 H336" stroke={A} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" className="qa-dash" />
        <path d="M330 187 L338 193 L330 199" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle r="4" fill={A}><animateMotion dur="1.8s" repeatCount="indefinite" path="M300 193 H340" /></circle>
      </g>
    )
  },

  // card table
  cards: ({ r }) => {
    const ranks = ["A", "K", "Q", "J", "10"]
    const off = Math.floor(r() * 4)
    const suitPath = (s: number): ReactNode => {
      if (s === 1) return <path d="M0 14 C-24 -2 -16 -20 0 -8 C16 -20 24 -2 0 14Z" />
      if (s === 2) return <path d="M0 -17 L13 0 L0 17 L-13 0Z" />
      if (s === 3) return <g><circle cx="0" cy="-8" r="8" /><circle cx="-9" cy="6" r="8" /><circle cx="9" cy="6" r="8" /><path d="M0 4 L-5 20 H5Z" /></g>
      return <g><path d="M0 -17 C-22 2 -16 16 0 8 C16 16 22 2 0 -17Z" /><path d="M0 6 L-6 20 H6Z" /></g>
    }
    return (
      <g>
        <ellipse cx="320" cy="368" rx="250" ry="22" fill={A} fillOpacity="0.07" />
        {ranks.map((rk, i) => {
          const a = (i - 2) * 15
          const red = (i + off) % 2 === 1
          return (
            <g key={i} transform={`translate(320 372) rotate(${a}) translate(-56 -300)`}>
              <g className="qa-float" style={dl(i * 0.35)}>
                <rect width="112" height="160" rx="12" fill="#15121d" stroke={A} strokeOpacity={i === 2 ? 0.95 : 0.4} strokeWidth={i === 2 ? 2 : 1.2} />
                <T x="12" y="28" s="18" o={1} fill={red ? A : "#fff"} w={600}>{rk}</T>
                <g transform="translate(56 82)" fill={red ? A : "#fff"} fillOpacity={red ? 1 : 0.85}>{suitPath((i + off) % 4)}</g>
              </g>
            </g>
          )
        })}
        {[0, 1, 2, 3].map((i) => <ellipse key={i} cx="540" cy={340 - i * 8} rx="30" ry="9" fill="#15121d" stroke={A} strokeOpacity="0.7" />)}
        {[0, 1, 2].map((i) => <ellipse key={i} cx="96" cy={346 - i * 8} rx="26" ry="8" fill="#15121d" stroke="#fff" strokeOpacity="0.3" />)}
      </g>
    )
  },

  // audio waveform
  wave: ({ r }) => {
    const n = 54, ph = r() * 6
    return (
      <g>
        <line x1="40" y1="82" x2="600" y2="82" stroke="#fff" strokeOpacity="0.3" strokeDasharray="5 6" />
        <T x="600" y="72" s="10" o={0.5} anchor="end">CEILING · 0 dB</T>
        <line x1="40" y1="56" x2="600" y2="56" stroke={A} strokeOpacity="0.7" strokeDasharray="2 6" />
        <T x="600" y="46" s="10" o={0.85} fill={A} anchor="end">BOOSTED · 4×</T>
        {Array.from({ length: n }, (_, i) => {
          const env = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.19 + ph))
          const h = f(40 + env * 180 * (0.55 + 0.45 * Math.abs(Math.sin(i * 0.9 + ph * 2))))
          const hot = h > 150
          return <rect key={i} x={40 + i * 10.4} y={200 - h / 2} width="6" height={h} rx="3" fill={A} fillOpacity={hot ? 1 : 0.42} className="qa-bar" style={dl(-(i * 0.09 + r()), 1.3 + r() * 1.2)} />
        })}
        <line x1="40" y1="200" x2="600" y2="200" stroke="#fff" strokeOpacity="0.12" />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={40 + i * 22} y="316" width="14" height={8 + (i * 5) % 18} rx="3" fill={A} fillOpacity={0.3 + i * 0.14} transform={`translate(0 ${-(8 + (i * 5) % 18) + 18})`} />)}
        <T x="156" y="338" s="10" o={0.5}>EQ</T>
      </g>
    )
  },

  // terminal
  terminal: ({ r }) => {
    const n = 20 + Math.floor(r() * 80)
    const rows: { y: number; parts: [string, boolean][] }[] = [
      { y: 130, parts: [["$ ", false], ["tool", true], [" --fast ./src", false]] },
      { y: 160, parts: [[`src/main.rs:${n}`, false], ["  fn ", false], ["search", true], ["(pattern)", false]] },
      { y: 186, parts: [[`src/walk.rs:${n + 41}`, false], ["  // ", false], ["search", true], [" the tree", false]] },
      { y: 212, parts: [[`src/pool.rs:${n + 7}`, false], ["  let ", false], ["search", true], [" = pool.spawn()", false]] },
      { y: 238, parts: [[`src/cli.rs:${n + 90}`, false], ["  \"", false], ["search", true], ["\" => run()", false]] },
      { y: 280, parts: [["4 matches · 1,842 files · ", false], ["3ms", true]] },
    ]
    const cw = 8.6
    return (
      <g>
        <rect x="64" y="64" width="512" height="272" rx="14" fill="#100e17" stroke="#fff" strokeOpacity="0.16" />
        <line x1="64" y1="96" x2="576" y2="96" stroke="#fff" strokeOpacity="0.1" />
        {[0, 1, 2].map((i) => <circle key={i} cx={84 + i * 18} cy="80" r="5" fill={i === 0 ? A : "#fff"} fillOpacity={i === 0 ? 0.9 : 0.2} />)}
        {rows.map((row, ri) => {
          let x = 88
          return (
            <g key={ri}>
              {row.parts.map(([s, hl], i) => {
                const px = x; x += s.length * cw
                return (
                  <g key={i}>
                    {hl && <rect x={px - 2} y={row.y - 14} width={s.length * cw + 4} height="19" rx="4" fill={A} fillOpacity="0.22" />}
                    <text x={px} y={row.y} className="qa-t" fontSize="14" fill={hl ? A : "#fff"} fillOpacity={hl ? 1 : ri === 0 ? 0.85 : 0.5} xmlSpace="preserve">{s}</text>
                  </g>
                )
              })}
            </g>
          )
        })}
        <rect x="88" y="304" width="9" height="18" fill={A} className="qa-blink" />
        <T x="106" y="318" s="14" o={0.8}>$</T>
      </g>
    )
  },

  // gauge + monte carlo fan
  dial: ({ r }) => {
    const cx = 320, cy = 232, R = 132
    const val = 0.55 + r() * 0.3
    const pt = (a: number, rr: number) => `${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`
    const ticks = Array.from({ length: 33 }, (_, i) => {
      const a = Math.PI + (i / 32) * Math.PI
      return <line key={i} x1={f(cx + Math.cos(a) * (R + 10))} y1={f(cy + Math.sin(a) * (R + 10))} x2={f(cx + Math.cos(a) * (R + (i % 4 === 0 ? 24 : 17)))} y2={f(cy + Math.sin(a) * (R + (i % 4 === 0 ? 24 : 17)))} stroke="#fff" strokeOpacity={i % 4 === 0 ? 0.5 : 0.22} />
    })
    const fan = Array.from({ length: 8 }, () => {
      let y = 340, d = `M60 ${y}`
      for (let i = 1; i <= 12; i++) { y += (r() - 0.62) * 12 * (1 + i * 0.12); d += ` L${60 + i * 29} ${f(Math.min(372, Math.max(300, y)))}` }
      return d
    })
    return (
      <g>
        {ticks}
        <path d={`M${pt(Math.PI, R)} A${R} ${R} 0 0 1 ${pt(2 * Math.PI, R)}`} fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="16" strokeLinecap="round" />
        <path d={`M${pt(Math.PI, R)} A${R} ${R} 0 0 1 ${pt(2 * Math.PI, R)}`} fill="none" stroke={A} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray={`${f(val * 100)} 100`} />
        <g className="qa-needle" style={{ transformOrigin: `${cx}px ${cy}px`, ["--a0" as string]: `${f(-72 + val * 20)}deg`, ["--a1" as string]: `${f(-30 + val * 60)}deg` }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - 108} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r="12" fill="#0d0b13" stroke={A} strokeWidth="3" />
        <T x={cx - R - 6} y={cy + 22} s="10" o={0.5} anchor="middle">LOW</T>
        <T x={cx + R + 6} y={cy + 22} s="10" o={0.5} anchor="middle">HIGH</T>
        {fan.map((d, i) => <path key={i} d={d} fill="none" stroke={A} strokeOpacity={i === 3 ? 0.95 : 0.3} strokeWidth={i === 3 ? 2.2 : 1.2} pathLength="100" className="qa-draw" style={dl(i * 0.15)} />)}
        <T x="560" y="326" s="10" o={0.5} anchor="end">1,000 RUNS</T>
      </g>
    )
  },

  // model layers + attribution strip
  neural: ({ r }) => {
    const layers = [4, 6, 6, 3]
    const pos = layers.map((n, li) => Array.from({ length: n }, (_, i) => [100 + li * 147, 170 + (i - (n - 1) / 2) * 38] as [number, number]))
    const toks = Array.from({ length: 16 }, (_, i) => Math.round(Math.max(0.08, Math.abs(Math.sin(i * 0.8 + r() * 2)) * (i % 5 === 2 ? 1 : 0.55)) * 100) / 100)
    return (
      <g>
        {pos.slice(0, -1).map((L, li) => L.flatMap((a, i) => pos[li + 1].map((b, j) => <line key={`${li}-${i}-${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={A} strokeOpacity={(i + j) % 4 === 0 ? 0.3 : 0.1} />)))}
        {pos.slice(0, -1).map((L, li) => (
          <circle key={li} r="3" fill={A}>
            <animateMotion dur="2.6s" begin={`${li * 0.8}s`} repeatCount="indefinite" path={`M${L[1][0]} ${L[1][1]} L${pos[li + 1][2][0]} ${pos[li + 1][2][1]}`} />
          </circle>
        ))}
        {pos.map((L, li) => L.map(([x, y], i) => <circle key={`${li}-${i}`} cx={x} cy={y} r="8" fill="#0d0b13" stroke={A} strokeWidth="1.8" strokeOpacity="0.85" className="qa-pulse" style={dl(li * 0.45 + i * 0.12, 2.6)} />))}
        {toks.map((v, i) => <rect key={i} x={64 + i * 34} y="296" width="28" height="22" rx="6" fill={A} fillOpacity={v} />)}
        <T x="64" y="338" s="10" o={0.5}>TOKEN ATTRIBUTION</T>
        <T x="100" y="64" s="10" o={0.5}>INPUT</T><T x="541" y="64" s="10" o={0.5} anchor="middle">VERDICT</T>
      </g>
    )
  },

  // viewfinder + film strip
  scan: ({ r, uid }) => {
    const blocks = Array.from({ length: 9 }, () => ({ x: 180 + r() * 220, y: 78 + r() * 130, w: 28 + r() * 70, h: 20 + r() * 50, o: 0.05 + r() * 0.14 }))
    const corner = (x: number, y: number, sx: number, sy: number) => <path d={`M${x} ${y + sy * 26} V${y} H${x + sx * 26}`} fill="none" stroke={A} strokeWidth="3" strokeLinecap="round" />
    return (
      <g>
        <clipPath id={`${uid}c`}><rect x="160" y="60" width="320" height="200" rx="6" /></clipPath>
        <rect x="160" y="60" width="320" height="200" rx="6" fill="#13101b" />
        <g clipPath={`url(#${uid}c)`}>
          {blocks.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill="#fff" fillOpacity={b.o} />)}
          <rect x="204" y="96" width="92" height="74" rx="6" fill="none" stroke={A} strokeWidth="1.6" strokeDasharray="5 4" />
          <rect x="204" y="80" width="40" height="16" rx="4" fill={A} /><T x="224" y="92" s="10" o={1} fill="#1a0d06" anchor="middle" w={600}>0.97</T>
          <rect x="340" y="150" width="104" height="70" rx="6" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="5 4" />
          <rect x="160" y="60" width="320" height="52" fill={`url(#${uid}l)`} opacity="0.5" className="qa-scan" />
          <rect x="160" y="60" width="320" height="2" fill={A} className="qa-scan" />
        </g>
        {corner(150, 50, 1, 1)}{corner(490, 50, -1, 1)}{corner(150, 270, 1, -1)}{corner(490, 270, -1, -1)}
        {Array.from({ length: 8 }, (_, i) => {
          const best = i === 3
          return (
            <g key={i}>
              <rect x={72 + i * 62} y="302" width="52" height="34" rx="5" fill={A} fillOpacity={best ? 0.3 : 0.07} stroke={A} strokeOpacity={best ? 1 : 0.25} />
              <rect x={80 + i * 62} y="312" width={14 + (i * 7) % 18} height="6" rx="3" fill="#fff" fillOpacity="0.25" />
            </g>
          )
        })}
        <path d="M222 346 l4 -6 l4 6z" fill={A} /><T x="234" y="354" s="10" o={0.7} fill={A}>SHARPEST</T>
      </g>
    )
  },

  // fingerprint matrices + hamming distance
  hash: ({ r }) => {
    const cols = 12, rows = 8, cs = 20
    const bits = Array.from({ length: cols * rows }, () => r() > 0.52)
    const flips = new Set<number>()
    while (flips.size < 5) flips.add(Math.floor(r() * cols * rows))
    const grid = (x0: number, flip: boolean) => bits.map((b, i) => {
      const x = x0 + (i % cols) * cs, y = 92 + Math.floor(i / cols) * cs
      const on = flip && flips.has(i) ? !b : b
      const diff = flip && flips.has(i)
      return <rect key={i} x={x} y={y} width="15" height="15" rx="3.5" fill={A} fillOpacity={on ? 0.85 : 0.1} stroke={diff ? "#fff" : "none"} strokeOpacity="0.9" className={diff ? "qa-pulse" : undefined} style={diff ? dl(i * 0.05, 1.4) : undefined} />
    })
    return (
      <g>
        {grid(36, false)}{grid(364, true)}
        <path d="M290 156 H350" stroke={A} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" className="qa-dash" />
        <T x="320" y="146" s="22" o={1} fill={A} anchor="middle" w={600}>≈</T>
        <T x="320" y="186" s="11" o={0.7} anchor="middle">d = 5</T>
        <T x="36" y="76" s="10" o={0.5}>ORIGINAL</T><T x="364" y="76" s="10" o={0.5}>SUSPECT COPY</T>
        <rect x="36" y="288" width="240" height="8" rx="4" fill="#fff" fillOpacity="0.1" />
        <rect x="36" y="288" width="196" height="8" rx="4" fill={A} className="qa-grow" />
        <T x="36" y="320" s="10" o={0.5}>PRIORITY SCORE</T>
        <path d="M468 296 l12 12 l24 -26" fill="none" stroke={A} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="100" className="qa-draw" />
        <T x="364" y="320" s="10" o={0.5}>MATCH</T>
      </g>
    )
  },

  // live standings
  board: ({ r }) => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ w: 300 - i * 34 - r() * 14, s: Math.round(980 - i * 120 - r() * 40) }))
    return (
      <g>
        <T x="64" y="62" s="10" o={0.5}>RANK</T><T x="576" y="62" s="10" o={0.5} anchor="end">SCORE</T>
        <circle cx="534" cy="58" r="4" fill={A} className="qa-pulse" /><T x="520" y="62" s="10" o={0.9} fill={A} anchor="end">LIVE</T>
        {rows.map((row, i) => (
          <g key={i} transform={`translate(0 ${80 + i * 46})`}>
            <rect x="56" y="0" width="528" height="38" rx="10" fill={i === 0 ? A : "#fff"} fillOpacity={i === 0 ? 0.14 : 0.04} stroke={i === 0 ? A : "#fff"} strokeOpacity={i === 0 ? 0.6 : 0.08} />
            <T x="74" y="25" s="14" o={i === 0 ? 1 : 0.55} fill={i === 0 ? A : "#fff"} w={600}>{i + 1}</T>
            <circle cx="116" cy="19" r="9" fill={A} fillOpacity={0.9 - i * 0.12} />
            <rect x="140" y="15" width={row.w} height="8" rx="4" fill={i === 0 ? A : "#fff"} fillOpacity={i === 0 ? 0.9 : 0.22} className="qa-grow" style={dl(i * 0.2)} />
            <T x="568" y="25" s="13" o={i === 0 ? 1 : 0.6} fill={i === 0 ? A : "#fff"} anchor="end">{row.s}</T>
          </g>
        ))}
      </g>
    )
  },

  // generic fallback: seeded bento mosaic
  mosaic: ({ r, p }) => {
    const cells = [[40, 50, 250, 150], [306, 50, 140, 70], [462, 50, 138, 150], [306, 136, 140, 64], [40, 216, 160, 110], [216, 216, 230, 110], [462, 216, 138, 110]]
    const hot = Math.floor(r() * cells.length)
    return (
      <g>
        {cells.map(([x, y, w, h], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="14" fill={A} fillOpacity={i === hot ? 0.16 : 0.04 + r() * 0.05} stroke={A} strokeOpacity={i === hot ? 0.9 : 0.22} className={i === hot ? "qa-pulse" : undefined} />
            {Array.from({ length: 2 + Math.floor(r() * 3) }, (_, k) => <rect key={k} x={x + 16} y={y + 18 + k * 14} width={(w - 32) * (0.3 + r() * 0.55)} height="6" rx="3" fill="#fff" fillOpacity={0.18 - k * 0.03} />)}
          </g>
        ))}
        <text x="52" y="188" className="qa-t" fontSize="64" fontWeight="700" fill={A} opacity="0.9" letterSpacing="-3">{p.title.slice(0, 2)}</text>
      </g>
    )
  },
}
