// next/font exposes generated family names through CSS variables; canvas
// `ctx.font` cannot read variables, so resolve them to real family names.
const cache: Record<string, string> = {}

export function fontFamily(varName: "--ff-pixel" | "--ff-pixelify" | "--ff-vt", fallback = "monospace") {
  if (cache[varName]) return cache[varName]
  if (typeof window === "undefined") return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  if (!v) return fallback
  cache[varName] = v
  return v
}
