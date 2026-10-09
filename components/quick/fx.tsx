"use client"
// Small motion primitives for the quick view.
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react"
import { motion, useInView, useMotionValue, useSpring, useScroll, animate } from "framer-motion"
import Lenis from "lenis"

/** Buttery smooth scrolling (Lenis) + anchor links that glide. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    let raf = 0
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null
      if (!a) return
      const el = document.querySelector(a.getAttribute("href")!)
      if (el) { e.preventDefault(); lenis.scrollTo(el as HTMLElement, { offset: -70 }) }
    }
    document.addEventListener("click", onClick)
    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis
    return () => { cancelAnimationFrame(raf); lenis.destroy(); document.removeEventListener("click", onClick) }
  }, [])
  return null
}

export function scrollToAnchor(sel: string) {
  const el = document.querySelector(sel) as HTMLElement | null
  if (!el) return
  const l = (window as unknown as { __lenis?: Lenis }).__lenis
  if (l) l.scrollTo(el, { offset: -70 }); else el.scrollIntoView({ behavior: "smooth" })
}

/** Thin gradient progress bar at the top. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  return <motion.div style={{ scaleX: x, transformOrigin: "0 50%" }} className="fixed left-0 right-0 top-0 z-[60] h-[2px] bg-[#ffb547]" />
}

/** Soft spotlight that follows the cursor across the page. */
export function CursorGlow() {
  const x = useMotionValue(-500), y = useMotionValue(-500)
  const sx = useSpring(x, { stiffness: 140, damping: 22 }), sy = useSpring(y, { stiffness: 140, damping: 22 })
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return
    const m = (e: PointerEvent) => { x.set(e.clientX); y.set(e.clientY) }
    window.addEventListener("pointermove", m)
    return () => window.removeEventListener("pointermove", m)
  }, [x, y])
  return (
    <motion.div aria-hidden style={{ x: sx, y: sy }} className="pointer-events-none fixed left-0 top-0 z-[1] -ml-[300px] -mt-[300px] h-[600px] w-[600px] rounded-full opacity-[0.07] blur-3xl"
      >
      <div className="h-full w-full rounded-full" style={{ background: "radial-gradient(closest-side, #ffb547, transparent)" }} />
    </motion.div>
  )
}

/** Film grain over everything for a tactile, printed feel. */
export function Grain() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] opacity-[0.07] mix-blend-overlay"
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
  )
}

/** Words slide up from behind a mask, one after another. */
export function RevealText({ text, className = "", delay = 0, as = "span", stagger = 0.06 }: { text: string; className?: string; delay?: number; as?: "span" | "h1" | "h2" | "p"; stagger?: number }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const Tag = motion[as]
  return (
    <Tag ref={ref as never} className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
          <motion.span className="inline-block" initial={{ y: "110%" }} animate={inView ? { y: 0 } : {}} transition={{ duration: 0.9, delay: delay + i * stagger, ease: [0.16, 1, 0.3, 1] }}>
            {w}{i < text.split(" ").length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

/** Cycles through words with a glitchy scramble. */
export function Scramble({ words, className = "" }: { words: string[]; className?: string }) {
  const [txt, setTxt] = useState(words[0] ?? "")
  useEffect(() => {
    if (words.length < 2) return
    let i = 0, frame = 0, raf = 0, hold = 0
    const chars = "!<>-_\\/[]{}—=+*^?#________"
    let from = words[0], to = words[1]
    const step = () => {
      raf = requestAnimationFrame(step)
      if (hold > 0) { hold--; return }
      frame++
      const len = Math.max(from.length, to.length)
      let out = "", done = 0
      for (let k = 0; k < len; k++) {
        const settle = k * 2 + 8
        if (frame >= settle) { out += to[k] ?? ""; done++ }
        else out += frame > k ? chars[Math.floor(Math.random() * chars.length)] : (from[k] ?? "")
      }
      setTxt(out)
      if (done >= len) { i = (i + 1) % words.length; from = words[i]; to = words[(i + 1) % words.length]; frame = 0; hold = 130 }
    }
    const t = setTimeout(() => { raf = requestAnimationFrame(step) }, 1600)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [words])
  return <span className={className}>{txt}</span>
}

/** Element that leans toward the cursor. */
export function Magnetic({ children, strength = 0.35, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0), y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 15 }), sy = useSpring(y, { stiffness: 200, damping: 15 })
  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} className={`inline-block ${className}`}
      onPointerMove={(e) => { const r = ref.current!.getBoundingClientRect(); x.set((e.clientX - r.left - r.width / 2) * strength); y.set((e.clientY - r.top - r.height / 2) * strength) }}
      onPointerLeave={() => { x.set(0); y.set(0) }}>
      {children}
    </motion.div>
  )
}

/** Counts up to a number when scrolled into view. */
export function CountUp({ to, className = "", suffix = "" }: { to: number; className?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, to, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (n) => setV(Math.round(n)) })
    return () => c.stop()
  }, [inView, to])
  return <span ref={ref} className={className}>{v}{suffix}</span>
}

/** Infinite horizontal ticker. */
export function Marquee({ items, reverse = false, speed = 40 }: { items: ReactNode[]; reverse?: boolean; speed?: number }) {
  return (
    <div className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      {[0, 1].map((k) => (
        <div key={k} aria-hidden={k === 1} className="flex shrink-0 items-center gap-10 pr-10 group-hover:[animation-play-state:paused]"
          style={{ animation: `marquee ${speed}s linear infinite`, animationDirection: reverse ? "reverse" : "normal" }}>
          {items.map((it, i) => <div key={i} className="shrink-0">{it}</div>)}
        </div>
      ))}
    </div>
  )
}

/** Card with a cursor-tracking spotlight border + subtle 3D tilt. */
export function SpotlightCard({ children, className = "", color = "#ffb547", tilt = true, style }: { children: ReactNode; className?: string; color?: string; tilt?: boolean; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0), ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 150, damping: 18 }), sry = useSpring(ry, { stiffness: 150, damping: 18 })
  const [pos, setPos] = useState({ x: -999, y: -999 })
  return (
    <motion.div
      ref={ref}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900, ...style }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        const x = e.clientX - r.left, y = e.clientY - r.top
        setPos({ x, y })
        if (tilt) { ry.set(((x / r.width) - 0.5) * 7); rx.set(-((y / r.height) - 0.5) * 7) }
      }}
      onPointerLeave={() => { setPos({ x: -999, y: -999 }); rx.set(0); ry.set(0) }}
      className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-300" style={{ background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, ${color}1f, transparent 60%)` }} />
      <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{ padding: 1, background: `radial-gradient(300px circle at ${pos.x}px ${pos.y}px, ${color}aa, transparent 60%)`, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
      {children}
    </motion.div>
  )
}

/** Live clock for a timezone. */
export function LocalClock({ tz = "Asia/Kolkata" }: { tz?: string }) {
  const [now, setNow] = useState<string>("")
  useEffect(() => {
    const f = () => setNow(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz }).format(new Date()))
    f()
    const iv = setInterval(f, 1000)
    return () => clearInterval(iv)
  }, [tz])
  return <span suppressHydrationWarning>{now || "--:--:--"}</span>
}

/** Terminal that types commands and their output. */
export function Terminal({ lines }: { lines: { cmd: string; out: string }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const [shown, setShown] = useState<{ cmd: string; out: string; done: boolean }[]>([])
  useEffect(() => {
    if (!inView) return
    let cancelled = false
    const run = async () => {
      for (let idx = 0; idx < lines.length; idx++) {
        const l = lines[idx]
        for (let i = 0; i <= l.cmd.length; i++) {
          if (cancelled) return
          setShown((s) => [...s.slice(0, idx), { cmd: l.cmd.slice(0, i), out: "", done: false }])
          await new Promise((r) => setTimeout(r, 32 + Math.random() * 40))
        }
        await new Promise((r) => setTimeout(r, 250))
        if (cancelled) return
        setShown((s) => [...s.slice(0, idx), { cmd: l.cmd, out: l.out, done: true }])
        await new Promise((r) => setTimeout(r, 450))
      }
    }
    run()
    return () => { cancelled = true }
  }, [inView, lines])
  return (
    <div ref={ref} className="font-[family-name:var(--font-gmono)] text-[13px] leading-relaxed">
      {shown.map((l, i) => (
        <div key={i} className="mb-2">
          <div><span className="text-[#ffb547]">rayan@world</span><span className="text-white/40">:~$ </span><span className="text-white/90">{l.cmd}</span>{!l.done && <span className="ml-0.5 inline-block h-[1em] w-[7px] translate-y-[2px] animate-pulse bg-white/80" />}</div>
          {l.done && <div className="text-white/55">{l.out}</div>}
        </div>
      ))}
      {shown.length === lines.length && shown[shown.length - 1]?.done && (
        <div><span className="text-[#ffb547]">rayan@world</span><span className="text-white/40">:~$ </span><span className="inline-block h-[1em] w-[7px] translate-y-[2px] animate-pulse bg-white/80" /></div>
      )}
    </div>
  )
}
