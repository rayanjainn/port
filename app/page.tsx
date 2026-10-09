"use client"
import dynamic from "next/dynamic"
import { useEffect } from "react"
import { loadPreviewDraft } from "@/lib/content"
import PreviewBadge from "@/components/ui/PreviewBadge"
import Loader from "@/components/ui/Loader"

const Game = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => null,
})

export default function Home() {
  useEffect(() => { loadPreviewDraft() }, [])
  return (
    <div className="game-shell">
      <Game />
      <Loader />
      <PreviewBadge />
    </div>
  )
}
