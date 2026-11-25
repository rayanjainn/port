// Opt-in load timing: add ?perf to the URL (works in production builds too). Results land in window.__perf
// as { label: ms } and are summed per label, so repeated calls (every exhibit canvas, say) show their total.
const on = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf")

type PerfBag = Record<string, number>
function bag(): PerfBag {
  const w = window as unknown as { __perf?: PerfBag }
  return (w.__perf ??= {})
}

/** time a synchronous block under `label` */
export function timed<T>(label: string, fn: () => T): T {
  if (!on()) return fn()
  const t = performance.now()
  try { return fn() } finally { const b = bag(); b[label] = (b[label] ?? 0) + (performance.now() - t) }
}

/** start a stopwatch; call the returned function to record it */
export function stopwatch(label: string): () => void {
  if (!on()) return () => {}
  const t = performance.now()
  return () => { const b = bag(); b[label] = (b[label] ?? 0) + (performance.now() - t) }
}
