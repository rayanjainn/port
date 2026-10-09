"use client"
import Link from "next/link"
import { useContentStore } from "@/lib/content"

/** Shown only when the site renders an unpublished draft from /admin. */
export default function PreviewBadge() {
  const preview = useContentStore((s) => s.preview)
  if (!preview) return null
  return (
    <Link href="/admin" style={{
      position: "fixed", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 400,
      fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 2, textDecoration: "none",
      color: "#1a0d04", background: "#ffd76a", border: "3px solid #1a0d04", padding: "9px 14px",
      boxShadow: "0 4px 0 #1a0d04",
    }}>
      ● DRAFT PREVIEW — BACK TO ADMIN
    </Link>
  )
}
