// Optional 3D polish, each effect behind its own flag. On by default: relief, tiltShift, bloom, intro. Off: thickness, horizon.
// strength: relief = max hill height in tiles, thickness = depth multiplier, tiltShift / bloom = 0..1,
// intro = seconds, horizon = degrees of lower pitch.
// Dev override for A/B shots: /?fx=thickness:0.8,horizon&nofx=bloom,relief
export interface Fx { on: boolean; strength: number }
export const fx: Record<"relief" | "thickness" | "tiltShift" | "bloom" | "intro" | "horizon", Fx> = {
  relief: { on: true, strength: 3 },
  thickness: { on: false, strength: 1 },
  tiltShift: { on: true, strength: 0.7 },
  bloom: { on: true, strength: 0.5 },
  intro: { on: true, strength: 1.2 },
  horizon: { on: false, strength: 3 },
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const params = new URLSearchParams(window.location.search)
  const flags = fx as Record<string, Fx>
  for (const part of (params.get("fx") ?? "").split(",")) {
    const [k, v] = part.split(":")
    if (flags[k]) { flags[k].on = true; if (v) flags[k].strength = parseFloat(v) }
  }
  for (const k of (params.get("nofx") ?? "").split(",")) if (flags[k]) flags[k].on = false
}

/** effects that need the render-to-texture pass */
export const needsPost = () => fx.tiltShift.on || fx.bloom.on
