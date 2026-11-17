// Small date helpers for the Quick View. Pure, deterministic, safe on server and client.

const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const MON_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export interface Ym { y: number; m: number } // m is 0-11

export const ymIndex = (a: Ym) => a.y * 12 + a.m
export const fromIndex = (i: number): Ym => ({ y: Math.floor(i / 12), m: i % 12 })

/** Parses "Jun 2026", "2026-06" or "2026". "Present" resolves to `now`. A bare year means Jan (start) or Dec (end). */
export function parseYm(s: string, edge: "start" | "end", now: Date): Ym | null {
  const t = s.trim()
  if (!t) return null
  if (/^present$/i.test(t)) return { y: now.getFullYear(), m: now.getMonth() }
  let m = t.match(/^([A-Za-z]{3,9})\.?\s+(\d{4})$/)
  if (m) {
    const mi = MON.indexOf(m[1].slice(0, 3).toLowerCase())
    return mi < 0 ? null : { y: Number(m[2]), m: mi }
  }
  m = t.match(/^(\d{4})-(\d{2})$/)
  if (m) return { y: Number(m[1]), m: Number(m[2]) - 1 }
  m = t.match(/^(\d{4})$/)
  if (m) return { y: Number(m[1]), m: edge === "start" ? 0 : 11 }
  return null
}

/** "Mar 2026" from "2026-03"; a bare year stays a year. */
export function monthLabel(s: string): string {
  const p = parseYm(s, "start", new Date(0))
  if (!p) return s
  return /^\d{4}$/.test(s.trim()) ? String(p.y) : `${MON_LABEL[p.m]} ${p.y}`
}

export const monthName = (m: number) => MON_LABEL[m]

/** Inclusive month count, the way LinkedIn counts: Jun to Aug is 3 months. */
export function monthsInclusive(a: Ym, b: Ym): number {
  return Math.max(1, ymIndex(b) - ymIndex(a) + 1)
}

export function durationLabel(n: number): string {
  const y = Math.floor(n / 12), m = n % 12
  const ys = y ? `${y} ${y === 1 ? "year" : "years"}` : ""
  const ms = m ? `${m} ${m === 1 ? "month" : "months"}` : ""
  return [ys, ms].filter(Boolean).join(" ")
}
