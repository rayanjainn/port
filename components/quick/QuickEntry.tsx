"use client"
import { useEffect } from "react"
import QuickView from "@/components/quick/QuickView"
import PreviewBadge from "@/components/ui/PreviewBadge"
import { loadPreviewDraft } from "@/lib/content"
import type { QuickStats } from "@/lib/quick/github"

export default function QuickEntry({ stats }: { stats: QuickStats }) {
  useEffect(() => { loadPreviewDraft() }, [])
  return (
    <>
      <QuickView stats={stats} />
      <PreviewBadge />
    </>
  )
}
