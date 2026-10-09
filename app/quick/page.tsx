"use client"
import { useEffect } from "react"
import QuickView from "@/components/quick/QuickView"
import PreviewBadge from "@/components/ui/PreviewBadge"
import { loadPreviewDraft } from "@/lib/content"

export default function QuickPage() {
  useEffect(() => { loadPreviewDraft() }, [])
  return (
    <>
      <QuickView />
      <PreviewBadge />
    </>
  )
}
