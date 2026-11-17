// Screen-space UI drawn on the game canvas: name boards, markers, the interact prompt and speech bubbles.
// Colours come from the current world's tokens (app/themes.css); each material has its own shapes.
import { fontFamily } from "@/lib/fonts"
import { getWorldTokens } from "@/lib/theme"

type Ctx = CanvasRenderingContext2D

/** rectangle with the four corners notched by `n` px (pixel-art chamfer) */
function notched(ctx: Ctx, x: number, y: number, w: number, h: number, n: number, fill: string) {
  ctx.fillStyle = fill
  ctx.fillRect(x + n, y, w - n * 2, h)
  ctx.fillRect(x, y + n, w, h - n * 2)
}
function glow(ctx: Ctx, color: string, blur: number) { ctx.shadowColor = color; ctx.shadowBlur = blur }
function noGlow(ctx: Ctx) { ctx.shadowBlur = 0; ctx.shadowColor = "transparent" }

export function drawSign(ctx: Ctx, title: string, sub: string, accent: string, cx: number, bottom: number, active: boolean) {
  const T = getWorldTokens(), g = T.sign
  const fp = fontFamily("--ff-pixel")
  ctx.font = `10px ${fp}`
  const tw = ctx.measureText(title).width
  ctx.font = `7px ${fp}`
  const sw2 = ctx.measureText(sub).width
  const w = Math.round(Math.max(tw, sw2) + 26), h = 34
  const x = Math.round(cx - w / 2), y = Math.round(bottom - h - (active ? 6 : 0))
  ctx.textAlign = "center"

  if (T.material === "neon") {
    ctx.fillStyle = "rgba(2,1,10,.45)"; ctx.fillRect(x + 3, y + 5, w, h)
    glow(ctx, active ? g.on : g.edge, active ? 18 : 10)
    notched(ctx, x - 2, y - 2, w + 4, h + 4, 4, g.edge); noGlow(ctx)
    notched(ctx, x, y, w, h, 3, g.bg)
    ctx.fillStyle = "rgba(93,230,255,.07)"; for (let yy = y + 2; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1)
    ctx.fillStyle = g.hi; ctx.fillRect(x + 6, y + 1, w - 12, 1)
    // LED strip with the section name
    ctx.fillStyle = accent; ctx.fillRect(x + 3, y + h - 13, w - 6, 10)
    ctx.fillStyle = "rgba(5,4,15,.55)"; ctx.fillRect(x + 3, y + h - 13, w - 6, 10)
    ctx.fillStyle = accent; ctx.fillRect(x + 3, y + h - 13, w - 6, 1)
    glow(ctx, g.on, 8)
    ctx.font = `10px ${fp}`; ctx.fillStyle = g.ink; ctx.fillText(title, cx, y + 15)
    noGlow(ctx)
    ctx.font = `7px ${fp}`; ctx.fillStyle = "#fff"; ctx.fillText(sub, cx, y + h - 5)
  } else if (T.material === "sandstone") {
    ctx.fillStyle = "rgba(40,20,0,.38)"; ctx.fillRect(x + 3, y + 5, w, h)
    notched(ctx, x - 2, y - 2, w + 4, h + 4, 3, g.edge)
    notched(ctx, x, y, w, h, 2, g.bg)
    ctx.fillStyle = g.hi; ctx.fillRect(x + 2, y, w - 4, 2); ctx.fillRect(x, y + 2, 2, h - 4)
    ctx.fillStyle = "rgba(90,50,10,.35)"; ctx.fillRect(x + 2, y + h - 2, w - 2, 2); ctx.fillRect(x + w - 2, y + 2, 2, h - 4)
    // turquoise inlay strip with a gold stud at each end
    ctx.fillStyle = accent; ctx.fillRect(x + 3, y + h - 13, w - 6, 10)
    ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(x + 3, y + h - 13, w - 6, 1)
    ctx.fillStyle = "#e0a21f"; ctx.fillRect(x + 5, y + h - 10, 3, 3); ctx.fillRect(x + w - 8, y + h - 10, 3, 3)
    ctx.font = `10px ${fp}`; ctx.fillStyle = "rgba(255,246,220,.7)"; ctx.fillText(title, cx + 1, y + 16)
    ctx.fillStyle = g.ink; ctx.fillText(title, cx, y + 15)
    ctx.font = `7px ${fp}`; ctx.fillStyle = "#1a0d04"; ctx.fillText(sub, cx + 1, y + h - 4); ctx.fillStyle = "#fffbe8"; ctx.fillText(sub, cx, y + h - 5)
  } else if (T.material === "spectral") {
    ctx.fillStyle = "rgba(0,6,8,.5)"; ctx.fillRect(x + 3, y + 5, w, h)
    glow(ctx, active ? g.on : g.edge, active ? 20 : 12)
    // tombstone silhouette: stepped arch
    ctx.fillStyle = g.edge; ctx.fillRect(x - 2, y + 2, w + 4, h); ctx.fillRect(x + 2, y - 2, w - 4, 4); ctx.fillRect(x + 6, y - 4, w - 12, 3)
    noGlow(ctx)
    ctx.fillStyle = g.bg; ctx.fillRect(x, y + 2, w, h - 2); ctx.fillRect(x + 3, y, w - 6, 3); ctx.fillRect(x + 7, y - 2, w - 14, 2)
    ctx.fillStyle = "rgba(95,208,160,.12)"; ctx.fillRect(x, y + 2, w, 10)
    ctx.fillStyle = accent; ctx.fillRect(x + 3, y + h - 13, w - 6, 10)
    ctx.fillStyle = "rgba(5,12,14,.5)"; ctx.fillRect(x + 3, y + h - 13, w - 6, 10)
    ctx.fillStyle = accent; ctx.fillRect(x + 3, y + h - 13, w - 6, 1)
    ctx.fillStyle = "#3f7a5a"; ctx.fillRect(x - 2, y + h - 3, 7, 3); ctx.fillRect(x + w - 6, y + h - 3, 8, 3); ctx.fillStyle = "#2e5c46"; ctx.fillRect(x + 1, y + h, 3, 2)
    glow(ctx, g.on, 8)
    ctx.font = `10px ${fp}`; ctx.fillStyle = g.ink; ctx.fillText(title, cx, y + 15)
    noGlow(ctx)
    ctx.font = `7px ${fp}`; ctx.fillStyle = "#e8f5f0"; ctx.fillText(sub, cx, y + h - 5)
  } else {
    ctx.fillStyle = "rgba(10,6,2,0.35)"; ctx.fillRect(x + 3, y + 5, w, h)
    ctx.fillStyle = g.edge; ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
    ctx.fillStyle = g.bg; ctx.fillRect(x, y, w, h)
    ctx.fillStyle = g.hi; ctx.fillRect(x, y, w, 3)
    ctx.fillStyle = accent; ctx.fillRect(x, y + h - 13, w, 10)
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x, y + h - 13, w, 1)
    ctx.font = `10px ${fp}`
    ctx.fillStyle = g.edge; ctx.fillText(title, cx + 1, y + 16)
    ctx.fillStyle = g.ink; ctx.fillText(title, cx, y + 15)
    ctx.font = `7px ${fp}`
    ctx.fillStyle = g.sub; ctx.fillText(sub, cx, y + h - 5)
  }
  ctx.textAlign = "left"
  if (active) {
    ctx.strokeStyle = g.on; ctx.lineWidth = 2
    if (T.material === "neon" || T.material === "spectral") glow(ctx, g.on, 10)
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8)
    noGlow(ctx)
  }
}

export function drawMarker(ctx: Ctx, x: number, y: number, active: boolean, scale: number, glyph?: string) {
  const T = getWorldTokens(), m = T.mark
  const s = Math.max(8, scale * 2.5)
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  const fill = active ? m.on : m.fill
  if (glyph) {
    const bx = -s * 0.6, by = -s * 1.3, bw = s * 1.2, bh = s * 1.3
    if (T.material === "neon" || T.material === "spectral") glow(ctx, active ? m.on : m.fill, active ? 14 : 8)
    ctx.fillStyle = T.material === "parchment" || T.material === "sandstone" ? m.edge : fill
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4)
    noGlow(ctx)
    ctx.fillStyle = T.material === "neon" || T.material === "spectral" ? T.prompt.bg : fill
    ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = m.bang; ctx.font = `${Math.round(s)}px ${fontFamily("--ff-pixel")}`; ctx.textAlign = "center"
    if (T.material === "neon" || T.material === "spectral") { ctx.fillStyle = fill; glow(ctx, fill, 6) }
    ctx.fillText(glyph, 1, -s * 0.2)
    noGlow(ctx)
    ctx.restore()
    return
  }
  if (T.material === "spectral") {
    // a will-o'-wisp: round head, pointed tail
    glow(ctx, fill, active ? 16 : 10)
    ctx.fillStyle = fill
    ctx.beginPath(); ctx.arc(0, -s * 0.95, s * 0.5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.8); ctx.lineTo(s * 0.4, -s * 0.8); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill()
    noGlow(ctx)
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillRect(-s * 0.18, -s * 1.1, s * 0.2, s * 0.2)
  } else if (T.material === "neon") {
    // a stacked chevron, lit
    glow(ctx, fill, active ? 16 : 9)
    ctx.fillStyle = m.edge
    ctx.beginPath(); ctx.moveTo(-s * 0.75 - 2, -s * 1.2 - 2); ctx.lineTo(s * 0.75 + 2, -s * 1.2 - 2); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill()
    ctx.fillStyle = fill
    ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 1.2); ctx.lineTo(s * 0.7, -s * 1.2); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill()
    noGlow(ctx)
    ctx.fillStyle = "rgba(5,4,15,.7)"
    ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 1.05); ctx.lineTo(s * 0.35, -s * 1.05); ctx.lineTo(0, -s * 0.45); ctx.closePath(); ctx.fill()
  } else if (T.material === "sandstone") {
    // a gold kite with a turquoise heart
    ctx.fillStyle = m.edge
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-s * 0.75 - 2, -s * 0.8); ctx.lineTo(0, -s * 1.6 - 2); ctx.lineTo(s * 0.75 + 2, -s * 0.8); ctx.closePath(); ctx.fill()
    ctx.fillStyle = active ? "#ffd76a" : "#f2dca0"
    ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-s * 0.68, -s * 0.8); ctx.lineTo(0, -s * 1.5); ctx.lineTo(s * 0.68, -s * 0.8); ctx.closePath(); ctx.fill()
    ctx.fillStyle = active ? m.on : "#12857f"; ctx.fillRect(-s * 0.18, -s * 0.98, s * 0.36, s * 0.36)
  } else {
    ctx.fillStyle = m.edge
    ctx.beginPath(); ctx.moveTo(-s * 0.7 - 2, -s - 2); ctx.lineTo(s * 0.7 + 2, -s - 2); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill()
    ctx.fillStyle = fill
    ctx.beginPath(); ctx.moveTo(-s * 0.7, -s); ctx.lineTo(s * 0.7, -s); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

export function drawPrompt(ctx: Ctx, text: string, cx: number, y: number, now: number, touch: boolean) {
  const T = getWorldTokens(), p = T.prompt
  const bounce = Math.round(Math.sin(now * 6) * 2)
  ctx.font = `9px ${fontFamily("--ff-pixel")}`
  const tw = ctx.measureText(text).width
  const key = touch ? "TAP" : "E"
  const kw = touch ? 34 : 22
  const w = Math.round(tw + kw + 26), h = 30
  const x = Math.round(cx - w / 2), yy = Math.round(y - h + bounce)
  const mid = Math.round(cx)

  if (T.material === "neon") {
    ctx.fillStyle = "rgba(2,1,10,.45)"; ctx.fillRect(x + 3, yy + 5, w, h)
    glow(ctx, p.edge, 12); notched(ctx, x - 2, yy - 2, w + 4, h + 4, 4, p.edge); noGlow(ctx)
    notched(ctx, x, yy, w, h, 3, p.bg)
    ctx.fillStyle = "rgba(93,230,255,.07)"; for (let l = yy + 2; l < yy + h; l += 3) ctx.fillRect(x, l, w, 1)
    glow(ctx, p.key, 8); notched(ctx, x + 6, yy + 5, kw, 20, 2, p.key); noGlow(ctx)
    ctx.fillStyle = p.keyHi; ctx.fillRect(x + 8, yy + 6, kw - 4, 1)
    ctx.fillStyle = p.edge; ctx.fillRect(mid - 5, yy + h + 2, 10, 2); ctx.fillRect(mid - 3, yy + h + 4, 6, 2); ctx.fillRect(mid - 1, yy + h + 6, 2, 2)
    ctx.textAlign = "center"; ctx.fillStyle = p.keyInk; ctx.fillText(key, x + 6 + kw / 2, yy + 19)
    ctx.textAlign = "left"; glow(ctx, p.edge, 6); ctx.fillStyle = p.ink; ctx.fillText(text, x + kw + 14, yy + 19); noGlow(ctx)
  } else if (T.material === "sandstone") {
    ctx.fillStyle = "rgba(40,20,0,.38)"; ctx.fillRect(x + 3, yy + 5, w, h)
    notched(ctx, x - 2, yy - 2, w + 4, h + 4, 3, p.edge)
    notched(ctx, x, yy, w, h, 2, p.bg)
    ctx.fillStyle = "#fbefcc"; ctx.fillRect(x + 2, yy, w - 4, 2)
    ctx.fillStyle = p.low; ctx.fillRect(x + 2, yy + h - 3, w - 2, 3)
    notched(ctx, x + 5, yy + 4, kw + 2, 22, 3, p.edge)
    notched(ctx, x + 6, yy + 5, kw, 20, 2, p.key)
    ctx.fillStyle = p.keyHi; ctx.fillRect(x + 8, yy + 6, kw - 4, 2)
    ctx.fillStyle = p.edge; ctx.fillRect(mid - 5, yy + h + 2, 10, 3)
    ctx.fillStyle = p.bg; ctx.fillRect(mid - 3, yy + h, 6, 3)
    ctx.textAlign = "center"; ctx.fillStyle = p.keyInk; ctx.fillText(key, x + 6 + kw / 2, yy + 19)
    ctx.textAlign = "left"; ctx.fillStyle = p.ink; ctx.fillText(text, x + kw + 14, yy + 19)
  } else if (T.material === "spectral") {
    ctx.fillStyle = "rgba(0,6,8,.5)"; ctx.fillRect(x + 3, yy + 5, w, h)
    glow(ctx, p.edge, 14)
    ctx.fillStyle = p.edge; ctx.fillRect(x - 2, yy, w + 4, h + 2); ctx.fillRect(x + 2, yy - 2, w - 4, 2)
    noGlow(ctx)
    ctx.fillStyle = p.bg; ctx.fillRect(x, yy + 1, w, h); ctx.fillRect(x + 2, yy - 1, w - 4, 2)
    ctx.fillStyle = "rgba(154,123,224,.18)"; ctx.fillRect(x, yy + 1, w, 8)
    glow(ctx, p.key, 10); ctx.fillStyle = p.key; ctx.fillRect(x + 6, yy + 6, kw, 19); ctx.fillRect(x + 8, yy + 4, kw - 4, 2); noGlow(ctx)
    ctx.fillStyle = p.keyHi; ctx.fillRect(x + 8, yy + 7, kw - 4, 1)
    ctx.fillStyle = p.edge; ctx.fillRect(mid - 4, yy + h + 2, 8, 2); ctx.fillRect(mid - 2, yy + h + 4, 4, 2)
    ctx.textAlign = "center"; ctx.fillStyle = p.keyInk; ctx.fillText(key, x + 6 + kw / 2, yy + 19)
    ctx.textAlign = "left"; glow(ctx, p.edge, 6); ctx.fillStyle = p.ink; ctx.fillText(text, x + kw + 14, yy + 19); noGlow(ctx)
  } else {
    ctx.fillStyle = "rgba(10, 6, 2, 0.35)"; ctx.fillRect(x + 3, yy + 5, w, h)
    ctx.fillStyle = p.edge; ctx.fillRect(x - 2, yy - 2, w + 4, h + 4)
    ctx.fillStyle = p.bg; ctx.fillRect(x, yy, w, h)
    ctx.fillStyle = p.low; ctx.fillRect(x, yy + h - 3, w, 3)
    ctx.fillStyle = p.edge; ctx.fillRect(x + 6, yy + 5, kw, 20)
    ctx.fillStyle = p.key; ctx.fillRect(x + 7, yy + 6, kw - 2, 16)
    ctx.fillStyle = p.keyHi; ctx.fillRect(x + 7, yy + 6, kw - 2, 2)
    ctx.textAlign = "center"
    ctx.fillStyle = p.keyInk; ctx.fillText(key, x + 6 + kw / 2, yy + 19)
    ctx.textAlign = "left"
    ctx.fillStyle = p.ink; ctx.fillText(text, x + kw + 14, yy + 19)
    ctx.fillStyle = p.edge; ctx.fillRect(mid - 5, yy + h + 2, 10, 3)
    ctx.fillStyle = p.bg; ctx.fillRect(mid - 3, yy + h, 6, 3)
  }
}

export function drawBubble(ctx: Ctx, text: string, cx: number, by: number, alpha: number) {
  if (alpha <= 0) return
  const T = getWorldTokens(), b = T.bubble
  ctx.globalAlpha = alpha
  ctx.font = `15px ${fontFamily("--ff-pixelify")}`
  const words = text.split(" ")
  const lines: string[] = []
  let cur = ""
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > 190 && cur) { lines.push(cur); cur = w } else cur = t }
  if (cur) lines.push(cur)
  const lw = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const w = Math.round(lw + 20), h = lines.length * 18 + 12
  const x = Math.round(cx - w / 2), y = Math.round(by - h)
  const mid = Math.round(cx)
  const glowy = T.material === "neon" || T.material === "spectral"
  if (glowy) glow(ctx, b.edge, 12)
  if (T.material === "sandstone") { notched(ctx, x - 2, y - 2, w + 4, h + 4, 3, b.edge); notched(ctx, x, y, w, h, 2, b.bg) }
  else if (glowy) { notched(ctx, x - 2, y - 2, w + 4, h + 4, 3, b.edge); noGlow(ctx); notched(ctx, x, y, w, h, 2, b.bg) }
  else { ctx.fillStyle = b.edge; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = b.bg; ctx.fillRect(x, y, w, h) }
  noGlow(ctx)
  ctx.fillStyle = b.edge; ctx.fillRect(mid - 2, y + h + 2, 6, 4); ctx.fillRect(mid, y + h + 6, 3, 3)
  ctx.fillStyle = b.bg; ctx.fillRect(mid - 1, y + h, 4, 4)
  if (T.material === "neon") { ctx.fillStyle = "rgba(93,230,255,.06)"; for (let l = y + 2; l < y + h; l += 3) ctx.fillRect(x, l, w, 1) }
  ctx.fillStyle = b.ink
  lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 17 + i * 18))
  ctx.globalAlpha = 1
}
