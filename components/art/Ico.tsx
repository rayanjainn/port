"use client"
export function Ico({ n, size = 3 }: { n: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/ui/icons/${n}.png`} alt="" className="ico" style={{ width: 16 * size, height: 16 * size }} />
}
