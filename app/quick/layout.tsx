import type { Metadata } from "next"
import content from "@/content/portfolio.json"

export const metadata: Metadata = {
  title: `${content.profile.name} — Quick View`,
  description: content.meta.description,
}

export default function QuickLayout({ children }: { children: React.ReactNode }) {
  return children
}
